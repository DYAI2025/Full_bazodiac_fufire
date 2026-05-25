# Backend Hardening — ViewModel, Aggregator, CORS, Cache, Contract Tests

> **For Claude:** REQUIRED SUB-SKILL: Use `anthropic-skills:executing-plans` to implement this plan task-by-task.

**Goal:** Sechs strukturelle Schwachstellen des FuFirE-Proxys schließen: stabiles ViewModel, vollständiger Chart-Aggregator, Hidden-Stems-Ableitung, CORS-Härtung, Geocode-Stabilisierung und Contract-Tests gegen den echten FuFirE-Upstream.

**Architecture:** Alle Änderungen liegen in `server.js` (einem Single-File-ESM-Modul, kein Build-Step). Tests laufen mit dem eingebauten `node:test`-Runner, keine externen Test-Deps. Das ViewModel ist ein reines Mapping-Layer — es macht keine Upstream-Calls selbst, es normalisiert nur was `orchestrateChart` zurückgibt.

**Tech Stack:** Node.js ≥ 20, `node:test`, `node:http`, `node:crypto` (für Cache-Key-Hashing), kein npm-Dependency-Zuwachs außer wo explizit notiert.

---

## Kontext — was der Code jetzt tut

```
server.js
├── FUFIRE_ENDPOINTS[]          — Allowlist aller Proxy-Endpunkte
├── orchestrateChart()          — paralleler Aufruf von western + bazi + fusion
├── handleChartRequest()        — POST /chart → orchestrateChart
├── handleGeocodeRequest()      — GET /api/geocode → Nominatim + timeapi.io
├── proxyFuFireRequest()        — generischer Proxy für erlaubte Endpunkte
└── handleRequest()             — Router

test/server.test.js             — 5 Tests mit node:test, kein Mocking-Framework
```

Kein Bundler, kein TypeScript, kein Express. ESM (`"type": "module"`).

---

## Task 1 — ViewModel-Schicht: `normalizeAzodiacResult(raw)`

**Ziel:** Eine Funktion, die die rohen Parallel-Responses (`western`, `bazi`, `fusion`) in ein stabiles, vorhersagbares Shape überführt. Clients (das Frontend) sollen nie mehr gegen rohe API-Shapes prüfen.

**Datei:** `server.js` — neue Funktion unterhalb von `translatePayload`

**Shape des ViewModel:**
```js
{
  western: {
    bodies: {},           // planet name → { lon, sign, house, retrograde, element }
    houses: [],           // 12 Einträge
    aspects: [],          // { planet1, planet2, type, orb, applying }
    ascendant: null,      // { sign, degree }
  },
  bazi: {
    pillars: {            // year/month/day/hour
      year:  { stem, branch, element, hidden_stems: [] },
      month: { ... },
      day:   { ... },
      hour:  { ... },
    },
    day_master: null,     // { stem, element, polarity }
  },
  fusion: {
    wu_xing_vectors: {
      western_planets: {}, // { Holz, Feuer, Erde, Metall, Wasser } normiert auf 1.0
      bazi_pillars: {},
    },
    coherence_index: null,
    fusion_interpretation: '',
  },
  _meta: {
    input: {},
    upstream_status: {},
    view_model_version: '1',
  },
}
```

**Step 1: Test schreiben**

Datei anlegen: `test/view_model.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAzodiacResult } from '../server.js';

const RAW_MINIMAL = {
  western: {
    bodies: {
      Sun: { longitude: 45.0, zodiac_sign: 1, house: 2, is_retrograde: false },
    },
    houses: [{ cusp: 0 }],
    aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'trine', orb: 1.2, applying: true }],
  },
  bazi: {
    pillars: {
      day: { stamm: '甲', zweig: '子', element: 'wood' },
    },
  },
  fusion: {
    wu_xing_vectors: {
      western_planets: { holz: 0.4, feuer: 0.2, erde: 0.1, metall: 0.2, wasser: 0.1 },
    },
    coherence_index: 0.82,
    fusion_interpretation: 'Test interpretation.',
  },
  _meta: { input: { date: '2000-01-01T12:00:00', tz: 'UTC', lat: 48.0, lon: 11.0 }, upstream_status: {} },
};

test('normalizeAzodiacResult produces stable ViewModel shape', () => {
  const vm = normalizeAzodiacResult(RAW_MINIMAL);

  // Top-level keys always present
  assert.ok('western' in vm);
  assert.ok('bazi' in vm);
  assert.ok('fusion' in vm);
  assert.ok('_meta' in vm);

  // Western — bodies normalized
  assert.ok(vm.western.bodies.Sun);
  assert.equal(typeof vm.western.bodies.Sun.longitude, 'number');
  assert.equal(typeof vm.western.bodies.Sun.retrograde, 'boolean');

  // BaZi — element normalized to German
  assert.equal(vm.bazi.pillars.day.element, 'Holz');

  // Fusion — vectors normalized to German keys
  const wv = vm.fusion.wu_xing_vectors.western_planets;
  assert.ok('Holz' in wv && 'Feuer' in wv && 'Erde' in wv && 'Metall' in wv && 'Wasser' in wv);

  // Meta version stamp
  assert.equal(vm._meta.view_model_version, '1');
});

test('normalizeAzodiacResult handles missing subsections gracefully', () => {
  const vm = normalizeAzodiacResult({ western: null, bazi: null, fusion: null, _meta: {} });
  assert.deepEqual(vm.western.aspects, []);
  assert.deepEqual(vm.bazi.pillars, {});
  assert.equal(vm.fusion.coherence_index, null);
});
```

**Step 2: Test laufen lassen — sicherstellen dass er rot ist**

```bash
cd Full_bazodiac_fufire-main
node --test test/view_model.test.js
```

Erwartet: `ReferenceError: normalizeAzodiacResult is not defined` oder `SyntaxError: The requested module ... does not provide an export named 'normalizeAzodiacResult'`

**Step 3: Implementation in `server.js`**

Füge nach `translatePayload` ein:

```js
// ── Element key normalizer ────────────────────────────────────────────────
const ELEM_DE_MAP = {
  wood:'Holz', fire:'Feuer', earth:'Erde', metal:'Metall', water:'Wasser',
  holz:'Holz', feuer:'Feuer', erde:'Erde', metall:'Metall', wasser:'Wasser',
};
function toDE(key) { return ELEM_DE_MAP[(key||'').toLowerCase()] || key; }

function normalizeVector(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const result = {};
  for (const [k, v] of Object.entries(raw)) {
    const de = toDE(k);
    if (['Holz','Feuer','Erde','Metall','Wasser'].includes(de)) result[de] = Number(v) || 0;
  }
  return result;
}

function normalizePillar(raw) {
  if (!raw) return null;
  return {
    stem:         raw.stamm   ?? raw.stem   ?? raw.heavenly_stem ?? null,
    branch:       raw.zweig   ?? raw.branch ?? raw.earthly_branch ?? null,
    element:      toDE(raw.element ?? raw.element_name ?? ''),
    hidden_stems: raw.hidden_stems ?? raw.zang_gan ?? [],
  };
}

// ── ViewModel normalizer ──────────────────────────────────────────────────
export function normalizeAzodiacResult(raw) {
  const w = raw?.western || {};
  const b = raw?.bazi    || {};
  const f = raw?.fusion  || {};
  const meta = raw?._meta || {};

  // Western
  const bodies = {};
  for (const [name, body] of Object.entries(w.bodies || {})) {
    bodies[name] = {
      longitude:  Number(body.longitude ?? body.lon ?? body.degree ?? 0),
      sign:       body.sign ?? null,
      zodiac_sign: body.zodiac_sign ?? null,
      house:      body.house ?? null,
      retrograde: Boolean(body.is_retrograde ?? body.retrograde),
      degree_in_sign: body.degree_in_sign ?? null,
    };
  }

  // BaZi
  const pillars = {};
  const rawPillars = b.pillars || {};
  for (const key of ['year','month','day','hour']) {
    if (rawPillars[key]) pillars[key] = normalizePillar(rawPillars[key]);
  }
  const dm = b.day_master ?? b.dayMaster ?? null;

  // Fusion vectors
  const vecs = f.wu_xing_vectors || f.vectors || {};
  const westernVec = normalizeVector(vecs.western_planets ?? vecs.western);
  const baziVec    = normalizeVector(vecs.bazi_pillars    ?? vecs.bazi);
  const fusionVec  = normalizeVector(vecs.fusion ?? vecs.fused);

  return {
    western: {
      bodies,
      houses:    Array.isArray(w.houses)  ? w.houses  : [],
      aspects:   Array.isArray(w.aspects) ? w.aspects : [],
      ascendant: w.ascendant ?? null,
    },
    bazi: {
      pillars,
      day_master: dm ? normalizePillar(dm) : null,
    },
    fusion: {
      wu_xing_vectors: {
        western_planets: westernVec,
        bazi_pillars:    baziVec,
        ...(Object.keys(fusionVec).length ? { fusion: fusionVec } : {}),
      },
      coherence_index:        f.coherence_index ?? f.harmony ?? f.harmony_score ?? null,
      fusion_interpretation:  f.fusion_interpretation ?? f.interpretation ?? '',
    },
    _meta: {
      ...meta,
      view_model_version: '1',
    },
  };
}
```

Außerdem: `export` der Funktion sicherstellen (der `export`-Keyword ist oben schon dabei).

**Step 4: Test laufen lassen**

```bash
node --test test/view_model.test.js
```

Erwartet: `✓ normalizeAzodiacResult produces stable ViewModel shape` und `✓ normalizeAzodiacResult handles missing subsections gracefully`

**Step 5: `orchestrateChart` normalisiert das Ergebnis**

In `orchestrateChart`, die Return-Statement ersetzen:

```js
// Vorher:
return {
  httpStatus: allOk ? 200 : 502,
  body: { western: w.data, bazi: b.data, fusion: f.data, _meta: { ... } },
};

// Nachher:
const rawResult = {
  western: w.data,
  bazi:    b.data,
  fusion:  f.data,
  _meta: {
    input: payload,
    upstream_status: { western: w.status, bazi: b.status, fusion: f.status },
  },
};
return {
  httpStatus: allOk ? 200 : 502,
  body: normalizeAzodiacResult(rawResult),
};
```

**Step 6: Alle Tests laufen lassen**

```bash
node --test
```

Erwartet: Alle bestehenden Tests + 2 neue grün.

**Step 7: Commit**

```bash
git add server.js test/view_model.test.js
git commit -m "feat: ViewModel normalizer — stable AzodiacResult shape

- normalizeAzodiacResult() maps raw API response to typed shape
- Element keys normalized to DE (Holz/Feuer/Erde/Metall/Wasser)
- BaZi pillars normalized (stamm/zweig aliases resolved)
- orchestrateChart now returns normalized ViewModel
- Exported for unit testing
- 2 new tests in test/view_model.test.js"
```

---

## Task 2 — Hidden-Stems-Mapping serverseitig ableiten

**Ziel:** Wenn das API keine `hidden_stems` liefert, werden sie aus dem Erdzweig (Branch) via statischer Tabelle abgeleitet und mit `source: "derived_from_branch_table"` markiert.

**Kontext:** Jeder der 12 Erdzweige hat definierte verdeckte Stämme (藏干, Zàng Gān). Das ist astrologisch fixiertes Wissen, kein Interpret-Layer — diese Tabelle ändert sich nie.

**Datei:** `server.js` — ergänze `normalizePillar`

**Step 1: Test schreiben** — ergänze `test/view_model.test.js`

```js
test('normalizePillar derives hidden_stems from branch when API omits them', () => {
  const vm = normalizeAzodiacResult({
    western: null, fusion: null,
    bazi: {
      pillars: {
        day: { stamm: '甲', zweig: '子', element: 'wood' }, // 子 = Ratte, Wasser, HS: 癸
      },
    },
    _meta: {},
  });

  const hs = vm.bazi.pillars.day.hidden_stems;
  assert.ok(Array.isArray(hs));
  assert.ok(hs.length > 0, 'hidden_stems should be derived for 子');
  assert.equal(hs[0].source, 'derived_from_branch_table');
  assert.equal(hs[0].stem, '癸'); // Gui — Yin-Wasser, Hauptstamm der Ratte
});

test('normalizePillar keeps API-supplied hidden_stems unchanged', () => {
  const vm = normalizeAzodiacResult({
    western: null, fusion: null,
    bazi: {
      pillars: {
        day: {
          stamm: '甲', zweig: '子', element: 'wood',
          hidden_stems: [{ stem: '癸', weight: 10.0 }],
        },
      },
    },
    _meta: {},
  });

  const hs = vm.bazi.pillars.day.hidden_stems;
  assert.equal(hs.length, 1);
  assert.equal(hs[0].source, undefined); // API-Daten bleiben unverändert
});
```

**Step 2: Test laufen lassen — sicherstellen dass er rot ist**

```bash
node --test test/view_model.test.js
```

Erwartet: `AssertionError: hidden_stems should be derived for 子`

**Step 3: Hidden-Stems-Tabelle und Ableitung in `server.js` einfügen**

Füge direkt vor `normalizeVector` ein:

```js
// ── Hidden Stems Tabelle (Zàng Gān 藏干) ─────────────────────────────────
// Quelle: klassische BaZi-Literatur (unveränderlich)
// Format: branch → [ { stem, element, weight, polarity } ]
const HIDDEN_STEMS = {
  '子': [{ stem:'癸', element:'Wasser', weight:10.0, polarity:'Yin'  }],
  '丑': [{ stem:'己', element:'Erde',   weight:6.0,  polarity:'Yin'  },
         { stem:'癸', element:'Wasser', weight:3.0,  polarity:'Yin'  },
         { stem:'辛', element:'Metall', weight:1.0,  polarity:'Yin'  }],
  '寅': [{ stem:'甲', element:'Holz',   weight:7.0,  polarity:'Yang' },
         { stem:'丙', element:'Feuer',  weight:2.0,  polarity:'Yang' },
         { stem:'戊', element:'Erde',   weight:1.0,  polarity:'Yang' }],
  '卯': [{ stem:'乙', element:'Holz',   weight:10.0, polarity:'Yin'  }],
  '辰': [{ stem:'戊', element:'Erde',   weight:6.0,  polarity:'Yang' },
         { stem:'乙', element:'Holz',   weight:3.0,  polarity:'Yin'  },
         { stem:'癸', element:'Wasser', weight:1.0,  polarity:'Yin'  }],
  '巳': [{ stem:'丙', element:'Feuer',  weight:7.0,  polarity:'Yang' },
         { stem:'庚', element:'Metall', weight:2.0,  polarity:'Yang' },
         { stem:'戊', element:'Erde',   weight:1.0,  polarity:'Yang' }],
  '午': [{ stem:'丁', element:'Feuer',  weight:7.0,  polarity:'Yin'  },
         { stem:'己', element:'Erde',   weight:3.0,  polarity:'Yin'  }],
  '未': [{ stem:'己', element:'Erde',   weight:6.0,  polarity:'Yin'  },
         { stem:'丁', element:'Feuer',  weight:3.0,  polarity:'Yin'  },
         { stem:'乙', element:'Holz',   weight:1.0,  polarity:'Yin'  }],
  '申': [{ stem:'庚', element:'Metall', weight:7.0,  polarity:'Yang' },
         { stem:'壬', element:'Wasser', weight:2.0,  polarity:'Yang' },
         { stem:'戊', element:'Erde',   weight:1.0,  polarity:'Yang' }],
  '酉': [{ stem:'辛', element:'Metall', weight:10.0, polarity:'Yin'  }],
  '戌': [{ stem:'戊', element:'Erde',   weight:6.0,  polarity:'Yang' },
         { stem:'辛', element:'Metall', weight:3.0,  polarity:'Yin'  },
         { stem:'丁', element:'Feuer',  weight:1.0,  polarity:'Yin'  }],
  '亥': [{ stem:'壬', element:'Wasser', weight:7.0,  polarity:'Yang' },
         { stem:'甲', element:'Holz',   weight:3.0,  polarity:'Yang' }],
};

function deriveHiddenStems(branch) {
  const table = HIDDEN_STEMS[branch];
  if (!table) return [];
  return table.map(hs => ({ ...hs, source: 'derived_from_branch_table' }));
}
```

In `normalizePillar` ergänzen:

```js
function normalizePillar(raw) {
  if (!raw) return null;
  const branch = raw.zweig ?? raw.branch ?? raw.earthly_branch ?? null;
  const apiHiddenStems = raw.hidden_stems ?? raw.zang_gan ?? null;
  return {
    stem:         raw.stamm   ?? raw.stem   ?? raw.heavenly_stem ?? null,
    branch,
    element:      toDE(raw.element ?? raw.element_name ?? ''),
    hidden_stems: apiHiddenStems && apiHiddenStems.length > 0
                    ? apiHiddenStems
                    : deriveHiddenStems(branch),
  };
}
```

**Step 4: Tests laufen lassen**

```bash
node --test test/view_model.test.js
```

Erwartet: Alle 4 Tests grün.

**Step 5: Alle Tests laufen lassen**

```bash
node --test
```

**Step 6: Commit**

```bash
git add server.js test/view_model.test.js
git commit -m "feat: derive hidden_stems server-side from branch table

- HIDDEN_STEMS table for all 12 Earthly Branches (Zàng Gān)
- deriveHiddenStems() derives when API omits them
- Derived stems marked with source: 'derived_from_branch_table'
- API-supplied hidden_stems kept unchanged
- 2 new tests"
```

---

## Task 3 — Vollständiger Aggregator `/api/azodiac/profile`

**Ziel:** Einen neuen Endpunkt bauen, der alle relevanten Upstream-Calls macht (western, bazi, fusion, wuxing, wuxing-info), normalisiert und als einzelnes stabilisiertes Profil zurückgibt. `/chart` bleibt erhalten für Rückwärtskompatibilität.

**Hinweis zu `tst` (Ten-Star Theory):** Falls der Upstream kein `calculate/tst`-Endpunkt hat, wird er als Optional behandelt — Fehler werden absorbiert, nicht weitergegeben.

**Datei:** `server.js`

**Step 1: Test schreiben** — ergänze `test/server.test.js`

```js
test('/api/azodiac/profile orchestrates western + bazi + fusion + wuxing against mock upstream', async () => {
  const seen = [];
  const upstream = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url });
      // Minimal valid responses per endpoint
      const responses = {
        '/calculate/western': { bodies: {}, houses: [], aspects: [] },
        '/calculate/bazi':    { pillars: {} },
        '/calculate/fusion':  { wu_xing_vectors: {}, coherence_index: 0.7 },
        '/calculate/wuxing':  { vector: {} },
        '/info/wuxing':       { planet_mapping: {} },
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(responses[req.url] ?? { ok: true }));
    });
  });
  upstream.listen(0);
  await once(upstream, 'listening');
  const prev = process.env.FUFIRE_BASE_URL;
  process.env.FUFIRE_BASE_URL = `http://127.0.0.1:${upstream.address().port}/`;

  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/azodiac/profile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: '1990-01-01', time: '12:00', lat: 48.0, lon: 11.0, tz: 'Europe/Berlin' }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      // ViewModel keys present
      assert.ok('western' in json);
      assert.ok('bazi' in json);
      assert.ok('fusion' in json);
      assert.ok('_meta' in json);
      assert.equal(json._meta.view_model_version, '1');
      // wuxing endpoint was called
      assert.ok(seen.some(s => s.url === '/calculate/wuxing'));
    });
  } finally {
    if (prev === undefined) delete process.env.FUFIRE_BASE_URL;
    else process.env.FUFIRE_BASE_URL = prev;
    upstream.close();
    await once(upstream, 'close');
  }
});
```

**Step 2: Test laufen lassen — sicherstellen dass er rot ist**

```bash
node --test test/server.test.js
```

Erwartet: `AssertionError: 404` (Endpunkt existiert noch nicht)

**Step 3: Aggregator in `server.js` implementieren**

Füge nach `orchestrateChart` ein:

```js
// ── Full profile aggregator ────────────────────────────────────────────────
async function orchestrateFullProfile(rawBody) {
  const payload = translatePayload(rawBody);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // Mandatory calls (parallel)
    const [w, b, f, wx] = await Promise.all([
      callFuFire('calculate/western', payload, controller.signal),
      callFuFire('calculate/bazi',    payload, controller.signal),
      callFuFire('calculate/fusion',  payload, controller.signal),
      callFuFire('calculate/wuxing',  payload, controller.signal),
    ]);

    // Optional: wuxing reference info (GET, no body needed)
    let wuxingInfo = { data: null };
    try {
      const url = new URL('info/wuxing', getFuFireBaseUrl());
      const r = await fetch(url, { headers: getFuFireHeaders(true), signal: controller.signal });
      wuxingInfo = { data: r.ok ? await r.json() : null };
    } catch { /* absorb — info endpoint is optional */ }

    // Optional: TST (Ten-Star Theory) — absorb 404/errors
    let tst = { data: null, ok: false };
    try {
      const r = await callFuFire('calculate/tst', payload, controller.signal);
      if (r.ok) tst = r;
    } catch { /* TST endpoint may not exist */ }

    const mandatoryOk = w.ok && b.ok && f.ok && wx.ok;
    const rawResult = {
      western: w.data,
      bazi:    b.data,
      fusion:  f.data,
      wuxing:  wx.data,
      tst:     tst.data,
      wuxing_info: wuxingInfo.data,
      _meta: {
        input: payload,
        upstream_status: {
          western: w.status,
          bazi:    b.status,
          fusion:  f.status,
          wuxing:  wx.status,
          tst:     tst.ok ? 200 : 'n/a',
          wuxing_info: wuxingInfo.data ? 200 : 'n/a',
        },
      },
    };
    return {
      httpStatus: mandatoryOk ? 200 : 502,
      body: normalizeAzodiacResult(rawResult),
    };
  } finally {
    clearTimeout(timer);
  }
}
```

In `FUFIRE_ENDPOINTS` ergänzen (damit `/calculate/wuxing` + `/info/wuxing` weiterhin im Catalog stehen — sie sind bereits drin, nichts zu ändern).

Im Router (`handleRequest`) den neuen Endpunkt registrieren — **vor** dem `/api/fufire`-Block:

```js
if (url.pathname === '/api/azodiac/profile') {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed', allowed: ['POST'] });
  }
  let body = '';
  try {
    body = await readRequestBody(req);
    if (body) JSON.parse(body);
  } catch (error) {
    return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message });
  }
  try {
    const result = await orchestrateFullProfile(body || '{}');
    return sendJson(res, result.httpStatus, result.body);
  } catch (error) {
    const isAbort = error.name === 'AbortError';
    return sendJson(res, 502, {
      error: isAbort ? 'Upstream timeout' : 'Upstream unavailable',
      detail: error.message,
    });
  }
}
```

**Step 4: Tests laufen lassen**

```bash
node --test
```

**Step 5: Commit**

```bash
git add server.js test/server.test.js
git commit -m "feat: /api/azodiac/profile — full aggregator endpoint

- Orchestrates western + bazi + fusion + wuxing (mandatory)
- TST and wuxing-info: optional, errors absorbed
- Returns normalized ViewModel (view_model_version: 1)
- /chart endpoint unchanged for backwards compatibility"
```

---

## Task 4 — CORS härtung: nur erlaubte Origins in Produktion

**Ziel:** `access-control-allow-origin: *` nur in Entwicklung. In Produktion nur explizit konfigurierte Origins.

**Risiko ohne das:** Jede Website im Browser kann Requests an den Proxy senden und Antworten lesen — das ist eine CSRF-Vortür.

**Datei:** `server.js`

**Step 1: Test schreiben** — ergänze `test/server.test.js`

```js
test('CORS allows * when FUFIRE_ALLOWED_ORIGINS is unset', async () => {
  const prev = process.env.FUFIRE_ALLOWED_ORIGINS;
  delete process.env.FUFIRE_ALLOWED_ORIGINS;
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/health`, { headers: { origin: 'https://evil.example.com' } });
      assert.equal(res.headers.get('access-control-allow-origin'), '*');
    });
  } finally {
    if (prev !== undefined) process.env.FUFIRE_ALLOWED_ORIGINS = prev;
    else delete process.env.FUFIRE_ALLOWED_ORIGINS;
  }
});

test('CORS restricts to allowed origin when FUFIRE_ALLOWED_ORIGINS is set', async () => {
  const prev = process.env.FUFIRE_ALLOWED_ORIGINS;
  process.env.FUFIRE_ALLOWED_ORIGINS = 'https://bazodiac.space,https://app.bazodiac.space';
  try {
    await withServer(async (base) => {
      // Allowed origin → echo it back
      const res1 = await fetch(`${base}/health`, {
        headers: { origin: 'https://bazodiac.space' },
      });
      assert.equal(res1.headers.get('access-control-allow-origin'), 'https://bazodiac.space');

      // Unknown origin → no ACAO header
      const res2 = await fetch(`${base}/health`, {
        headers: { origin: 'https://evil.example.com' },
      });
      const acao = res2.headers.get('access-control-allow-origin');
      assert.ok(!acao || acao !== 'https://evil.example.com');
    });
  } finally {
    if (prev !== undefined) process.env.FUFIRE_ALLOWED_ORIGINS = prev;
    else delete process.env.FUFIRE_ALLOWED_ORIGINS;
  }
});
```

**Step 2: Test rot machen**

```bash
node --test test/server.test.js
```

Erwartet: 2. Test schlägt fehl (gibt immer `*` zurück)

**Step 3: Implementation in `server.js`**

Ergänze nach den Konstanten oben:

```js
const FUFIRE_ALLOWED_ORIGINS_RAW = process.env.FUFIRE_ALLOWED_ORIGINS || '';
const ALLOWED_ORIGINS = FUFIRE_ALLOWED_ORIGINS_RAW
  ? new Set(FUFIRE_ALLOWED_ORIGINS_RAW.split(',').map(o => o.trim()).filter(Boolean))
  : null; // null = Wildcard-Modus (Development)

function corsOrigin(requestOrigin) {
  if (!ALLOWED_ORIGINS) return '*';
  if (!requestOrigin) return null;
  return ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : null;
}
```

Ersetze in `sendJson`:

```js
// Vorher:
'access-control-allow-origin': '*',

// Nachher:
...(corsOrigin(res[Symbol.for('__request_origin')]
     || res.__requestOrigin) !== null
  ? { 'access-control-allow-origin': corsOrigin(res.__requestOrigin) }
  : {}),
```

Hmm — das setzt voraus, dass wir den Origin ins Response-Objekt schreiben. Eleganter: `sendJson` bekommt einen `origin`-Parameter, oder `handleRequest` setzt ihn. Bessere Lösung — `sendJson` bekommt den Request-Origin:

```js
function sendJson(res, status, payload, requestOrigin = null) {
  const hasBody = status !== 204;
  const body = hasBody ? JSON.stringify(payload, null, 2) : '';
  const origin = corsOrigin(requestOrigin);
  const corsHeaders = origin
    ? {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization,x-api-key',
        ...(origin !== '*' ? { 'vary': 'Origin' } : {}),
      }
    : {};
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...corsHeaders,
  });
  res.end(body);
}
```

Alle `sendJson`-Aufrufe müssen jetzt den Origin mitgeben. Im `handleRequest` extrahieren:

```js
export async function handleRequest(req, res) {
  const requestOrigin = req.headers.origin || null;
  // ...alle sendJson-Calls: sendJson(res, status, payload, requestOrigin)
```

Das sind ~10 Aufrufstellen. Alle mit dem 4. Parameter ergänzen.

**Step 4: Tests laufen lassen**

```bash
node --test
```

**Step 5: Umgebungsvariable in Railway setzen**

In Railway → Environment Variables:
```
FUFIRE_ALLOWED_ORIGINS=https://bazodiac.space,https://app.bazodiac.space
```

**Step 6: Commit**

```bash
git add server.js test/server.test.js
git commit -m "feat: CORS hardening — env-based origin allowlist

- FUFIRE_ALLOWED_ORIGINS=comma-separated list of trusted origins
- Unset → * (development/open mode)
- Set   → only matching origins get ACAO header + Vary: Origin
- 2 new tests covering wildcard and restricted modes"
```

---

## Task 5 — Geocode stabilisieren: LRU-Cache + Rate-Limit + Fallback

**Ziel:** Geocoding soll nicht bei jedem Keystroke Nominatim/timeapi.io anrufen. In-Memory LRU-Cache (max 200 Einträge, TTL 24h), max 10 Requests/Minute pro IP.

**Datei:** `server.js` — keine externen Deps (nur `node:crypto` für SHA-256-Cache-Key)

**Step 1: Test schreiben** — `test/geocode.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGeoCache, geocodeRateLimiter } from '../server.js';

test('geo cache returns cached result on second call', () => {
  const cache = makeGeoCache({ maxSize: 3, ttlMs: 60_000 });
  cache.set('münchen', [{ display: 'München', lat: 48.1, lon: 11.6, tz: 'Europe/Berlin' }]);
  const result = cache.get('münchen');
  assert.ok(Array.isArray(result));
  assert.equal(result[0].display, 'München');
});

test('geo cache evicts oldest when full', () => {
  const cache = makeGeoCache({ maxSize: 2, ttlMs: 60_000 });
  cache.set('a', [{ display: 'A' }]);
  cache.set('b', [{ display: 'B' }]);
  cache.set('c', [{ display: 'C' }]); // evicts 'a'
  assert.equal(cache.get('a'), null);
  assert.ok(cache.get('c'));
});

test('geo cache respects TTL', async () => {
  const cache = makeGeoCache({ maxSize: 10, ttlMs: 1 }); // 1 ms TTL
  cache.set('x', [{ display: 'X' }]);
  await new Promise(r => setTimeout(r, 5));
  assert.equal(cache.get('x'), null);
});

test('rate limiter blocks after threshold', () => {
  const limiter = geocodeRateLimiter({ maxPerMinute: 3 });
  assert.ok(limiter.allow('1.2.3.4'));
  assert.ok(limiter.allow('1.2.3.4'));
  assert.ok(limiter.allow('1.2.3.4'));
  assert.equal(limiter.allow('1.2.3.4'), false); // 4th denied
});

test('rate limiter does not affect other IPs', () => {
  const limiter = geocodeRateLimiter({ maxPerMinute: 1 });
  assert.ok(limiter.allow('1.1.1.1'));
  assert.equal(limiter.allow('1.1.1.1'), false);
  assert.ok(limiter.allow('2.2.2.2')); // different IP → allowed
});
```

**Step 2: Test rot**

```bash
node --test test/geocode.test.js
```

**Step 3: Implementation in `server.js`**

```js
// ── Geo-Cache (in-memory LRU, max 200 Einträge, TTL 24h) ─────────────────
export function makeGeoCache({ maxSize = 200, ttlMs = 86_400_000 } = {}) {
  const map = new Map(); // key → { value, expiresAt }
  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) { map.delete(key); return null; }
      // LRU: refresh position
      map.delete(key);
      map.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      if (map.size >= maxSize) {
        const firstKey = map.keys().next().value;
        map.delete(firstKey);
      }
      map.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}

// ── Geocode Rate Limiter (sliding window per IP) ──────────────────────────
export function geocodeRateLimiter({ maxPerMinute = 10 } = {}) {
  const windows = new Map(); // ip → timestamps[]
  return {
    allow(ip) {
      const now = Date.now();
      const cutoff = now - 60_000;
      const timestamps = (windows.get(ip) || []).filter(t => t > cutoff);
      if (timestamps.length >= maxPerMinute) return false;
      timestamps.push(now);
      windows.set(ip, timestamps);
      return true;
    },
  };
}

const GEO_CACHE   = makeGeoCache();
const GEO_LIMITER = geocodeRateLimiter();
```

In `handleGeocodeRequest` ergänzen:

```js
async function handleGeocodeRequest(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return sendJson(res, 400, { error: 'Missing query parameter: q' });

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!GEO_LIMITER.allow(ip)) {
    return sendJson(res, 429, { error: 'Geocode rate limit exceeded. Max 10 requests/minute per IP.' });
  }

  // Cache lookup
  const cacheKey = q.toLowerCase();
  const cached = GEO_CACHE.get(cacheKey);
  if (cached) return sendJson(res, 200, cached);

  try {
    // ... (existing Nominatim + timeapi.io logic unchanged)
    // After results is built:
    GEO_CACHE.set(cacheKey, results);
    sendJson(res, 200, results);
  } catch (error) {
    sendJson(res, 502, { error: 'Geocode upstream error', detail: error.message });
  }
}
```

**Step 4: Tests laufen lassen**

```bash
node --test
```

**Step 5: Commit**

```bash
git add server.js test/geocode.test.js
git commit -m "feat: geocode cache + rate limiter

- makeGeoCache(): in-memory LRU, max 200 entries, TTL 24h
- geocodeRateLimiter(): sliding window, max 10 req/min per IP
- 429 response when rate limit exceeded
- Cached results bypass Nominatim/timeapi.io calls
- Both utilities exported for unit testing
- 5 new tests"
```

---

## Task 6 — Contract-Test gegen FuFirE-Upstream

**Ziel:** Einen Smoke-Test bauen, der gegen den echten FuFirE-Upstream prüft, ob die erwarteten Endpoints antworten und das Response-Shape stabil ist. Verhindert stille Drifts à la „lokaler Proxy erwartet `/info/wuxing`, Upstream hat's zu `/info/wuxing-mapping` umbenannt".

**Modus:** Opt-in — läuft nur wenn `FUFIRE_CONTRACT_TEST=true` und `FUFIRE_BASE_URL` gesetzt ist.

**Datei:** `test/contract.test.js` — separates Test-File, nicht in der Standard-`node --test`-Suite

**Step 1: Test schreiben**

```js
// test/contract.test.js
// Run with: FUFIRE_CONTRACT_TEST=true node --test test/contract.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

const ENABLED = process.env.FUFIRE_CONTRACT_TEST === 'true';
const BASE_URL = (process.env.FUFIRE_BASE_URL || '').replace(/\/+$/, '');
const API_KEY  = process.env.FUFIRE_API_KEY || '';

const headers = {
  'content-type': 'application/json',
  'accept': 'application/json',
  ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
};

const MINIMAL_PAYLOAD = {
  date: '1990-06-15T12:00:00',
  tz: 'Europe/Berlin',
  lat: 48.137,
  lon: 11.576,
};

function skipIfDisabled(t) {
  if (!ENABLED || !BASE_URL) {
    t.skip('Set FUFIRE_CONTRACT_TEST=true and FUFIRE_BASE_URL to run contract tests');
  }
}

test('contract: calculate/western responds 200 with bodies array', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/western`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert.ok(json.bodies || json.planets, 'Response must contain bodies or planets field');
});

test('contract: calculate/bazi responds 200 with pillars', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/bazi`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.pillars || json.bazi, 'Response must contain pillars field');
});

test('contract: calculate/fusion responds 200 with wu_xing_vectors', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/fusion`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.wu_xing_vectors ?? json.vectors, 'Response must contain wu_xing_vectors');
});

test('contract: info/wuxing responds 200 — path drift detection', async (t) => {
  skipIfDisabled(t);
  // This test exists specifically to catch silent path renames
  const res = await fetch(`${BASE_URL}/info/wuxing`, {
    method: 'GET', headers: { accept: 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) {
    // Check alternate path
    const res2 = await fetch(`${BASE_URL}/info/wuxing-mapping`, {
      method: 'GET', headers: { accept: 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) },
      signal: AbortSignal.timeout(10_000),
    });
    assert.fail(
      `Path drift detected: /info/wuxing → 404, /info/wuxing-mapping → ${res2.status}. ` +
      `Update FUFIRE_ENDPOINTS in server.js: upstreamPath: 'info/wuxing-mapping'`
    );
  }
  assert.equal(res.status, 200, `Expected 200 from /info/wuxing, got ${res.status}`);
  const json = await res.json();
  assert.ok(
    json.planet_mapping ?? json.planets ?? json.mapping ?? json.elements,
    'Response must contain planet mapping'
  );
});

test('contract: response shape stability — Sun longitude is a number', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/western`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  const bodies = json.bodies || json.planets || {};
  const sun = bodies.Sun || bodies.sun || null;
  assert.ok(sun, 'Sun must be present in bodies');
  const lon = sun.longitude ?? sun.lon ?? sun.degree;
  assert.equal(typeof lon, 'number', `Sun longitude must be number, got ${typeof lon}`);
});
```

**Step 2: Lokal ausführen (wenn Upstream erreichbar)**

```bash
FUFIRE_CONTRACT_TEST=true \
FUFIRE_BASE_URL=https://bafe-production.up.railway.app/ \
FUFIRE_API_KEY=<dein-key> \
node --test test/contract.test.js
```

Erwartet: Alle 5 Tests grün oder gezielte Fehlermeldung bei Drift.

**Step 3: `package.json` ergänzen**

```json
"scripts": {
  "start": "node server.js",
  "test": "node --test",
  "test:contract": "FUFIRE_CONTRACT_TEST=true node --test test/contract.test.js"
}
```

**Step 4: Commit**

```bash
git add test/contract.test.js package.json
git commit -m "test: contract tests against live FuFirE upstream

- Opt-in via FUFIRE_CONTRACT_TEST=true + FUFIRE_BASE_URL + FUFIRE_API_KEY
- Tests: western, bazi, fusion, info/wuxing (path drift), Sun shape stability
- Path drift test explicitly checks alternate path if primary 404s
- npm run test:contract for easy invocation"
```

---

## Abschluss-Checkliste

Führe nach allen Tasks aus:

```bash
# Alle Unit-Tests
node --test

# Contract-Tests (mit echten Credentials)
npm run test:contract

# Manuell im Browser prüfen
# → POST /api/azodiac/profile → gibt ViewModel zurück
# → GET /health → zeigt endpoint catalog
# → Response-Headers prüfen: ACAO korrekt für Origin
```

Danach pushen und Railway-Deploy beobachten.
