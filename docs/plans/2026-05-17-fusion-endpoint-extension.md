# Fusion Endpoint Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `anthropic-skills:executing-plans` to implement this plan task-by-task.

**Goal:** Drei Lücken schließen: (1) Fusion-Rohdaten vollständig durchreichen, (2) dedizierten `/api/azodiac/fusion`-Endpunkt und Client-Funktion ergänzen, (3) serverseitigen Synastrie-Endpunkt mit kombinierter Fusion-Bewertung implementieren.

**Architecture:** `server.js` bleibt Single-File-Node-HTTP-Server ohne Framework. Neue Endpunkte folgen dem bestehenden Muster: Body lesen → validieren → orchestrieren → `sendJson`. `normalizeAzodiacResult` wird um ein transparentes Fusion-Passthrough erweitert, sodass alle FuFirE-Felder (aspects, house_overlay, dominant_patterns) ins ViewModel gelangen. Die Synastrie-Fusion berechnet keinen neuen Chart — sie leitet einen `harmonyScore` aus den zwei vorhandenen Profilen ab (ViewModel-Ebene, nicht Upstream-Aufruf).

**Tech Stack:** Node.js ES-Module, vanilla fetch, bestehende Test-Suite (node:test + node:assert), kein neues Framework.

---

## Kontext: Was existiert, was fehlt

### Vorhanden
- `server.js` L289: `normalizeAzodiacResult` — extrahiert aus Fusion NUR: `coherence_index`, `fusion_interpretation`, `wu_xing_vectors`
- `server.js` L466: `orchestrateFullProfile` — ruft parallel `calculate/western`, `calculate/bazi`, `calculate/fusion` auf
- `client.js` L32: `calculateProfile(input)` → POST `/api/azodiac/profile`
- `projections.js` L144, L532: nutzt `fusion.wu_xing_vectors` und `fusion.coherence_index`
- `SynastryPage.js`: berechnet Synastrie client-seitig aus zwei `calculateProfile()`-Calls + `createSynastryProjection()`

### Fehlt (Priorität 1–3 dieses Plans)
1. `normalizeAzodiacResult` reicht nicht alle Fusion-Felder durch — `aspects`, `house_overlay`, `dominant_patterns` gehen verloren
2. Kein `/api/azodiac/fusion` Standalone-Endpunkt
3. Kein serverseitiger `/api/azodiac/synastry` Endpunkt für kombinierte Fusion-Bewertung
4. `client.js` hat kein `calculateFusion()` und kein `calculateSynastry()`

---

## Task 1: Fusion-Passthrough in `normalizeAzodiacResult` erweitern

**Files:**
- Modify: `server.js` L399–414 (fusion return block in `normalizeAzodiacResult`)
- Test: `test/server.test.js`

**Step 1: Lies die aktuelle fusion-Rückgabe in `normalizeAzodiacResult`**

```bash
grep -n "fusion:" server.js | head -20
```

Erwartet: Zeile ~399 zeigt `fusion: { wu_xing_vectors:..., coherence_index:..., fusion_interpretation:... }`

**Step 2: Schreibe einen Test der zeigt dass `fusion.aspects` aktuell fehlt**

Öffne `test/server.test.js`. Füge am Ende (vor dem letzten `}`) ein:

```js
test('normalizeAzodiacResult passiert fusion.aspects durch', () => {
  const raw = {
    western: { bodies: {}, houses: {}, aspects: [], angles: {} },
    bazi: { pillars: {} },
    fusion: {
      harmony_index: { harmony_index: 0.6, interpretation: 'ausgewogen' },
      wu_xing_vectors: {},
      aspects: [{ planet_a: 'Sun', planet_b: 'Moon', angle: 120, type: 'Trine' }],
      house_overlay: { '1': 'Feuer', '7': 'Wasser' },
      dominant_patterns: ['Holz-Dominanz', 'Metall-Unterstützung'],
    },
    _meta: {},
  };
  const vm = normalizeAzodiacResult(raw);
  assert.deepStrictEqual(vm.fusion.aspects, raw.fusion.aspects);
  assert.deepStrictEqual(vm.fusion.house_overlay, raw.fusion.house_overlay);
  assert.deepStrictEqual(vm.fusion.dominant_patterns, raw.fusion.dominant_patterns);
});
```

**Step 3: Lauf den Test um sicherzustellen dass er FEHLSCHLÄGT**

```bash
node --test test/server.test.js 2>&1 | tail -20
```

Erwartet: `AssertionError` auf `vm.fusion.aspects` — das Feld ist `undefined`.

**Step 4: Erweiterung in `server.js` — fusion return block**

Finde den Block (ca. L399–414):
```js
    fusion: {
      wu_xing_vectors: {
        western_planets: westernVec,
        bazi_pillars:    baziVec,
        ...(Object.keys(fusionVec).length ? { fusion: fusionVec } : {}),
      },
      coherence_index:       typeof coherenceIndex === 'number' ? coherenceIndex : null,
      fusion_interpretation: [harmonyInterpretation, f.fusion_interpretation ?? f.interpretation ?? ''].filter(Boolean).join('\n\n'),
    },
```

Ersetze es durch:
```js
    fusion: {
      wu_xing_vectors: {
        western_planets: westernVec,
        bazi_pillars:    baziVec,
        ...(Object.keys(fusionVec).length ? { fusion: fusionVec } : {}),
      },
      coherence_index:       typeof coherenceIndex === 'number' ? coherenceIndex : null,
      fusion_interpretation: [harmonyInterpretation, f.fusion_interpretation ?? f.interpretation ?? ''].filter(Boolean).join('\n\n'),
      // Passthrough: alle optionalen FuFirE-Felder — vorhanden nur wenn upstream sie liefert
      aspects:           Array.isArray(f.aspects) ? f.aspects : [],
      house_overlay:     (f.house_overlay && typeof f.house_overlay === 'object') ? f.house_overlay : null,
      dominant_patterns: Array.isArray(f.dominant_patterns) ? f.dominant_patterns : [],
      synthesis_notes:   f.synthesis_notes ?? f.notes ?? null,
    },
```

**Step 5: Test erneut laufen — muss GRÜN sein**

```bash
node --test test/server.test.js 2>&1 | tail -20
```

Erwartet: alle Tests PASS.

**Step 6: Commit**

```bash
git add server.js test/server.test.js
git commit -m "feat(server): fusion passthrough — aspects, house_overlay, dominant_patterns, synthesis_notes"
```

---

## Task 2: Standalone `/api/azodiac/fusion` Endpunkt

**Files:**
- Modify: `server.js` (neue orchestrateFunction + Handler in handleRequest)
- Modify: `public/src/api/client.js` (neue export-Funktion)
- Test: `test/server.test.js`

**Step 1: Test schreiben — Endpunkt antwortet mit fusion-Daten**

In `test/server.test.js`, füge hinzu:

```js
test('POST /api/azodiac/fusion gibt fusion-Daten zurück', async (t) => {
  // Mock: kein echter FuFirE-Upstream nötig — wir testen HTTP-Routing
  const req = new MockRequest('POST', '/api/azodiac/fusion', JSON.stringify({
    date: '1990-06-15', time: '12:00', lat: 48.137, lon: 11.576, tz: 'Europe/Berlin',
  }));
  const res = new MockResponse();
  // Setze Mock-URL auf localhost damit handleRequest den Body parsen kann
  process.env.FUFIRE_BASE_URL = 'http://localhost:9999/'; // nicht erreichbar → 502
  await handleRequest(req, res);
  // 502 ist ok (kein echter Upstream) — wichtig: der Endpunkt EXISTIERT (kein 404)
  assert.notStrictEqual(res.statusCode, 404, 'Endpunkt muss existieren');
});
```

*Hinweis: falls `MockRequest` / `MockResponse` nicht in `server.test.js` existieren, schau in die Datei und nutze das vorhandene Test-Pattern.*

**Step 2: Test laufen — muss 404 zeigen (Endpunkt fehlt noch)**

```bash
node --test test/server.test.js -t "fusion gibt" 2>&1 | tail -10
```

Erwartet: Test schlägt fehl weil `res.statusCode === 404`.

**Step 3: Orchestrator-Funktion in `server.js` hinzufügen**

Füge NACH `orchestrateFullProfile` (ca. L534) und VOR `orchestrateDailyExperience` ein:

```js
// ── Standalone fusion calculator ──────────────────────────────────────────
async function orchestrateFusion(rawBody) {
  const payload = translatePayload(rawBody);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const [w, b, f] = await Promise.all([
      callFuFire('calculate/western', payload, controller.signal),
      callFuFire('calculate/bazi',    payload, controller.signal),
      callFuFire('calculate/fusion',  payload, controller.signal),
    ]);
    const allOk = w.ok && b.ok && f.ok;
    const rawResult = {
      western: w.data,
      bazi:    b.data,
      fusion:  f.data,
      _meta: {
        input: payload,
        upstream_status: { western: w.status, bazi: b.status, fusion: f.status },
      },
    };
    const vm = normalizeAzodiacResult(rawResult);
    // Gibt nur den fusion-Teil zurück (plus _meta)
    return {
      httpStatus: allOk ? 200 : 502,
      body: {
        fusion: vm.fusion,
        _meta:  { ...vm._meta, endpoint: '/api/azodiac/fusion' },
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
```

**Step 4: Handler in `handleRequest` eintragen**

In `handleRequest` (ca. L904), NACH dem `/api/azodiac/profile` Block, füge ein:

```js
  // ── Standalone fusion calculator ──
  if (url.pathname === '/api/azodiac/fusion') {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {}, requestOrigin);
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed', allowed: ['POST'] }, requestOrigin);
    }
    let body = '';
    try {
      body = await readRequestBody(req);
      if (body) JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message }, requestOrigin);
    }
    const validation = validatePayload(body || '{}');
    if (!validation.valid) {
      return sendJson(res, 400, { error: 'Invalid request payload', errors: validation.errors }, requestOrigin);
    }
    try {
      const result = await orchestrateFusion(body || '{}');
      return sendJson(res, result.httpStatus, result.body, requestOrigin);
    } catch (error) {
      const isAbort = error.name === 'AbortError';
      return sendJson(res, 502, {
        error: isAbort ? 'Upstream timeout' : 'Upstream unavailable',
        detail: error.message,
      }, requestOrigin);
    }
  }
```

**Step 5: Client-Funktion ergänzen**

In `public/src/api/client.js`, füge nach `getDailyExperience` ein:

```js
export async function calculateFusion(input) {
  return request('POST', '/api/azodiac/fusion', input);
}
```

**Step 6: Test laufen — muss GRÜN sein**

```bash
node --test test/server.test.js 2>&1 | tail -20
```

**Step 7: Commit**

```bash
git add server.js public/src/api/client.js test/server.test.js
git commit -m "feat(server): POST /api/azodiac/fusion — standalone fusion endpoint + client fn"
```

---

## Task 3: Serverseitiger Synastrie-Endpunkt mit kombinierter Fusion-Bewertung

**Files:**
- Modify: `server.js` (neue `orchestrateSynastry` + Handler)
- Modify: `public/src/api/client.js` (neue `calculateSynastry`)
- Modify: `public/src/pages/SynastryPage.js` (nutzt neuen Endpunkt)
- Test: `test/server.test.js`

**Hintergrund:** Aktuell ruft `SynastryPage.js` zweimal `calculateProfile()` auf und berechnet Synastrie client-seitig. Der neue serverseitige Endpunkt empfängt zwei Geburts-Datensätze, berechnet beide Profile parallel (4 parallele FuFirE-Calls: western_A, bazi_A, western_B, bazi_B — Fusion-Calls für beide optional), und gibt ein kombiniertes ViewModel zurück inkl. `harmonyScore`.

**Step 1: Test für den neuen Endpunkt schreiben**

In `test/server.test.js`:

```js
test('POST /api/azodiac/synastry erfordert personA und personB', async () => {
  const req = new MockRequest('POST', '/api/azodiac/synastry', JSON.stringify({
    personA: { date: '1990-01-15', time: '12:00', lat: 48.137, lon: 11.576, tz: 'Europe/Berlin' },
    // personB fehlt absichtlich
  }));
  const res = new MockResponse();
  await handleRequest(req, res);
  assert.strictEqual(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.ok(body.errors?.some(e => e.includes('personB')), 'Fehlermeldung muss personB erwähnen');
});

test('POST /api/azodiac/synastry mit beiden Personen → kein 404', async () => {
  const req = new MockRequest('POST', '/api/azodiac/synastry', JSON.stringify({
    personA: { date: '1990-01-15', time: '12:00', lat: 48.137, lon: 11.576, tz: 'Europe/Berlin' },
    personB: { date: '1985-07-22', time: '08:30', lat: 52.520, lon: 13.405, tz: 'Europe/Berlin' },
  }));
  const res = new MockResponse();
  process.env.FUFIRE_BASE_URL = 'http://localhost:9999/';
  await handleRequest(req, res);
  assert.notStrictEqual(res.statusCode, 404, 'Endpunkt muss existieren');
  assert.notStrictEqual(res.statusCode, 405, 'POST muss erlaubt sein');
});
```

**Step 2: Tests laufen — müssen FEHLSCHLAGEN (404)**

```bash
node --test test/server.test.js -t "synastry" 2>&1 | tail -15
```

**Step 3: Payload-Validator für Synastrie**

In `server.js`, nach `validatePayload` (ca. L208), füge ein:

```js
function validateSynastryPayload(raw) {
  const errors = [];
  let obj;
  try {
    obj = typeof raw === 'string' ? (raw ? JSON.parse(raw) : {}) : (raw || {});
  } catch {
    return { valid: false, errors: ['Request body is not valid JSON'] };
  }
  if (!obj.personA || typeof obj.personA !== 'object') {
    errors.push('personA: required — provide birth data object {date, time, lat, lon, tz}');
  } else {
    const va = validatePayload(obj.personA);
    if (!va.valid) errors.push(...va.errors.map(e => `personA.${e}`));
  }
  if (!obj.personB || typeof obj.personB !== 'object') {
    errors.push('personB: required — provide birth data object {date, time, lat, lon, tz}');
  } else {
    const vb = validatePayload(obj.personB);
    if (!vb.valid) errors.push(...vb.errors.map(e => `personB.${e}`));
  }
  return errors.length ? { valid: false, errors } : { valid: true };
}
```

**Step 4: Orchestrator `orchestrateSynastry` in `server.js` hinzufügen**

Füge nach `orchestrateFusion` ein:

```js
// ── Synastry orchestrator: parallel profiles for two persons ──────────────
async function orchestrateSynastry(rawBody) {
  const obj = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  const payloadA = translatePayload(obj.personA);
  const payloadB = translatePayload(obj.personB);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // 4 parallel upstream calls: western+bazi for each person
    const [wA, bA, wB, bB] = await Promise.all([
      callFuFire('calculate/western', payloadA, controller.signal),
      callFuFire('calculate/bazi',    payloadA, controller.signal),
      callFuFire('calculate/western', payloadB, controller.signal),
      callFuFire('calculate/bazi',    payloadB, controller.signal),
    ]);

    // Optional: fusion for each person (absorb failures)
    let fA = { data: null, ok: false, status: 'n/a' };
    let fB = { data: null, ok: false, status: 'n/a' };
    try {
      const [ra, rb] = await Promise.all([
        callFuFire('calculate/fusion', payloadA, controller.signal),
        callFuFire('calculate/fusion', payloadB, controller.signal),
      ]);
      if (ra.ok) fA = ra;
      if (rb.ok) fB = rb;
    } catch { /* absorb */ }

    const mandatoryOk = wA.ok && bA.ok && wB.ok && bB.ok;

    const profileA = normalizeAzodiacResult({
      western: wA.data, bazi: bA.data, fusion: fA.data || {}, _meta: { input: payloadA },
    });
    const profileB = normalizeAzodiacResult({
      western: wB.data, bazi: bB.data, fusion: fB.data || {}, _meta: { input: payloadB },
    });

    // Combined harmony: average of both coherence indexes + element vector similarity
    const ciA = profileA.fusion?.coherence_index ?? null;
    const ciB = profileB.fusion?.coherence_index ?? null;
    const combinedCoherence = (ciA !== null && ciB !== null)
      ? Math.round(((ciA + ciB) / 2) * 100) / 100
      : (ciA ?? ciB ?? null);

    return {
      httpStatus: mandatoryOk ? 200 : 502,
      body: {
        personA: profileA,
        personB: profileB,
        synastry: {
          combined_coherence: combinedCoherence,
          element_tension: elementTension(profileA, profileB),
        },
        _meta: {
          upstream_status: {
            western_a: wA.status, bazi_a: bA.status,
            western_b: wB.status, bazi_b: bB.status,
            fusion_a: fA.ok ? fA.status : 'n/a',
            fusion_b: fB.ok ? fB.status : 'n/a',
          },
          computed_at: new Date().toISOString(),
        },
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

// Helper: dominante Elementspannung zwischen zwei Profilen (0–1, 0=keine Spannung)
function elementTension(profileA, profileB) {
  const vecsA = profileA.fusion?.wu_xing_vectors?.fusion
              || profileA.fusion?.wu_xing_vectors?.western_planets || {};
  const vecsB = profileB.fusion?.wu_xing_vectors?.fusion
              || profileB.fusion?.wu_xing_vectors?.western_planets || {};
  const elements = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];
  const domA = elements.reduce((max, el) => (vecsA[el] ?? 0) > (vecsA[max] ?? 0) ? el : max, elements[0]);
  const domB = elements.reduce((max, el) => (vecsB[el] ?? 0) > (vecsB[max] ?? 0) ? el : max, elements[0]);
  // Zerstörungszyklus: Holz→Erde, Erde→Wasser, Wasser→Feuer, Feuer→Metall, Metall→Holz
  const CONFLICT = { Holz: 'Erde', Erde: 'Wasser', Wasser: 'Feuer', Feuer: 'Metall', Metall: 'Holz' };
  const inConflict = CONFLICT[domA] === domB || CONFLICT[domB] === domA;
  const same = domA === domB;
  return {
    dominant_a: domA,
    dominant_b: domB,
    cycle_relation: inConflict ? 'Zerstörung' : same ? 'Gleich' : 'Neutral',
    tension_score: inConflict ? 0.8 : same ? 0.1 : 0.4,
  };
}
```

**Step 5: Handler in `handleRequest` eintragen**

In `handleRequest`, nach dem `/api/azodiac/fusion` Block:

```js
  // ── Synastry endpoint ──
  if (url.pathname === '/api/azodiac/synastry') {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {}, requestOrigin);
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed', allowed: ['POST'] }, requestOrigin);
    }
    let body = '';
    try {
      body = await readRequestBody(req);
      if (body) JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message }, requestOrigin);
    }
    const validation = validateSynastryPayload(body || '{}');
    if (!validation.valid) {
      return sendJson(res, 400, { error: 'Invalid request payload', errors: validation.errors }, requestOrigin);
    }
    try {
      const result = await orchestrateSynastry(body || '{}');
      return sendJson(res, result.httpStatus, result.body, requestOrigin);
    } catch (error) {
      const isAbort = error.name === 'AbortError';
      return sendJson(res, 502, {
        error: isAbort ? 'Upstream timeout' : 'Upstream unavailable',
        detail: error.message,
      }, requestOrigin);
    }
  }
```

**Step 6: Client-Funktion ergänzen**

In `public/src/api/client.js`:

```js
export async function calculateSynastry(inputA, inputB) {
  return request('POST', '/api/azodiac/synastry', { personA: inputA, personB: inputB });
}
```

**Step 7: Tests laufen**

```bash
node --test test/server.test.js 2>&1 | tail -30
```

Erwartet: Alle Tests PASS. `synastry` Tests grün (400 bei fehlendem personB, nicht-404 bei beiden).

**Step 8: Commit**

```bash
git add server.js public/src/api/client.js test/server.test.js
git commit -m "feat(server): POST /api/azodiac/synastry — combined fusion + element tension + client fn"
```

---

## Task 4: SynastryPage auf neuen Endpunkt umstellen

**Files:**
- Modify: `public/src/pages/SynastryPage.js`
- Keine Backend-Änderungen

**Step 1: Lies den aktuellen Berechnungs-Teil von SynastryPage.js**

```bash
grep -n "calculateProfile\|projection\|calcBtn\|personA\|personB" \
  public/src/pages/SynastryPage.js | head -30
```

**Step 2: Import ergänzen**

Oben in `SynastryPage.js`, importiere `calculateSynastry`:

```js
import { calculateProfile, calculateSynastry } from '../api/client.js';
```

**Step 3: Berechnungslogik umstellen**

Finde den Block wo `calcBtn` klick zwei `calculateProfile()` Calls auslöst (ca. L100–160).
Ersetze die beiden parallelen `calculateProfile()`-Calls durch `calculateSynastry()`:

```js
calcBtn.addEventListener('click', async () => {
  // ... (validation bleibt wie bisher) ...

  // NEU: ein einziger Call statt zwei
  const result = await calculateSynastry(inputA, inputB);
  if (!result.ok) {
    errorEl.textContent = result.error || 'Berechnung fehlgeschlagen';
    errorEl.hidden = false;
    return;
  }

  const profileA = result.data.personA;
  const profileB = result.data.personB;
  const synastry  = result.data.synastry;

  // synastry.combined_coherence und synastry.element_tension für Gauge nutzen
  // (vorhandene renderWuXing/renderBazi/renderAspects-Calls bleiben unverändert)
});
```

**Step 4: `combined_coherence` und `element_tension` in der UI anzeigen**

Finde `renderExtensionPlaceholder` in SynastryPage.js. Ergänze am Ende des Elements ein neues Section-Element:

```js
function renderSynastryFusionSummary(synastry) {
  if (!synastry) return null;
  const el = document.createElement('div');
  el.className = 'synastry-fusion-summary';
  const pct = synastry.combined_coherence != null
    ? Math.round(synastry.combined_coherence * 100)
    : null;
  const tension = synastry.element_tension;
  el.innerHTML = `
    <h3 class="sfus-title">Fusions-Kompatibilität</h3>
    ${pct != null ? `<p class="sfus-coherence">Kombinierter Kohärenzindex: <strong>${pct}%</strong></p>` : ''}
    ${tension ? `<p class="sfus-tension">
      Dominantes Element A: <strong>${tension.dominant_a}</strong> ·
      Dominantes Element B: <strong>${tension.dominant_b}</strong> ·
      Zyklusbeziehung: <strong>${tension.cycle_relation}</strong>
    </p>` : ''}
  `;
  return el;
}
```

Rufe es in der Darstellung nach `renderExtensionPlaceholder` auf.

**Step 5: Manuell testen (Browser)**

Starte: `node server.js`
Öffne `http://localhost:3000/#/synastry`
Fülle beide Personen aus → Berechnen → prüfe: kein JS-Fehler in Console, Fusions-Kompatibilität erscheint.

**Step 6: Commit**

```bash
git add public/src/pages/SynastryPage.js
git commit -m "feat(synastry): nutzt /api/azodiac/synastry — kombinierte Fusion-Bewertung in UI"
```

---

## Task 5: Gesamtintegration verifizieren

**Step 1: Alle Tests laufen**

```bash
node --test test/ 2>&1 | tail -40
```

Erwartet: alle Tests PASS, kein `failed`.

**Step 2: Typecheck (JSDoc-Konsistenz)**

```bash
node --check server.js public/src/api/client.js public/src/pages/SynastryPage.js
```

Erwartet: Kein Output (= kein Syntax-Fehler).

**Step 3: Server starten und Endpunkte smoke-testen**

```bash
node server.js &
sleep 2

# Fusion standalone
curl -s -X POST http://localhost:3000/api/azodiac/fusion \
  -H 'content-type: application/json' \
  -d '{"date":"1990-06-15","time":"12:00","lat":48.137,"lon":11.576,"tz":"Europe/Berlin"}' \
  | node -e "const d=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(d); console.log('fusion.coherence_index:', j.fusion?.coherence_index, 'endpoint:', j._meta?.endpoint)"

# Synastry
curl -s -X POST http://localhost:3000/api/azodiac/synastry \
  -H 'content-type: application/json' \
  -d '{"personA":{"date":"1990-06-15","time":"12:00","lat":48.137,"lon":11.576,"tz":"Europe/Berlin"},"personB":{"date":"1985-07-22","time":"08:30","lat":52.52,"lon":13.405,"tz":"Europe/Berlin"}}' \
  | node -e "const d=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(d); console.log('synastry.combined_coherence:', j.synastry?.combined_coherence, 'tension:', j.synastry?.element_tension?.cycle_relation)"

kill %1
```

Erwartet: Beide geben strukturierte JSON-Antworten zurück (502 wenn kein FuFirE-Upstream — aber kein 404/400/405).

**Step 4: Finaler Commit + Push**

```bash
git push origin main
```

---

## Nicht in diesem Plan (Low Priority / Separater Sprint)

- `/api/azodiac/fusion/interpret` — LLM-Layer, nach Phase T Tagespuls
- `/api/azodiac/fusion/transit` — Transit-Impact auf Fusion-Kohärenz
- Detailed fusion source attribution im UI (welches Subsystem trug % bei)
- `projections.js` Erweiterung um `fusion.aspects` und `fusion.house_overlay` — erst wenn FuFirE upstream diese Felder tatsächlich liefert (empirisch prüfen nach Deploy)
