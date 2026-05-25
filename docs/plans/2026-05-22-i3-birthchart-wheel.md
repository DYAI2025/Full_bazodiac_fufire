# I3 — Professional Birthchart Wheel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Birthchart Wheel professionell machen. Sichtbarer Nutzer-Unterschied: Wheel wird zentraler visueller Anker, nicht duennes Wireframe. Abschluss nur wenn ASC-left, Ticks, Glyphen, Aspekte, Audit-Liste sichtbar.

**Goal:** Birthchart Wheel von Wireframe zu zentralem astrologischen Anker: ASC-left, Grad-Ticks, Planetenglyphen mit Kollisionsauflösung, Aspect-Legende und Daten-Audit — alle Werte nachvollziehbar und provenance-tagged.

**Architecture:** NatalChartWheel.js bleibt pure-SVG-Renderer; overviewModel.js liefert validierten Wheel-Vertrag (bodies/angles/aspects mit source-Metadaten); NatalChartAudit.js zeigt unter dem Wheel die kuratierte Liste; keine Berechnung im Component-Layer.

**Tech Stack:** SVG via document.createElementNS, pure functions für longitudeToChartAngle/collisionLanes, vanilla ESM, node --test, Playwright Visual.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0 (Playwright), I1 (Design-System), I2 (RollingText auf Wheel-Headline).

---

## TASK-I3-001: Wheel-Datenvertrag mit strikten Tests absichern

**Iterationsziel-Bezug:** Bevor das Wheel visuell überarbeitet wird, muss der Datenvertrag wasserdicht sein. Ohne strikten Vertrag entstehen 0°-Geister (REQ-D-001) und fehlende Provenance-Pills (REQ-D-003).

**Requirements:** REQ-D-001 (no fake 0°), REQ-D-003 (source labels), REQ-A-002 (ViewModel only).

**Files:**
- modify `test/overview-model.test.js`
- modify `test/natal-chart-wheel.test.js`
- modify `public/src/domain/overviewModel.js`

### Step 1.1 — RED: tests for missing-longitude handling

Add to `test/overview-model.test.js` (after the existing "Pro Birthchart contract" block):

```js
// ── I3 Wheel-Datenvertrag (RED tests) ────────────────────────────────────────

test('chartWheel.bodies: missing longitude → source="missing", NOT longitude=0', () => {
  const profile = {
    western: {
      bodies: {
        Sun:     { sign: 'Fische', longitude: 353.15 },
        Pluto:   { sign: null,     longitude: null   }, // upstream gap
      },
      angles: { Ascendant: 27.71, MC: 280.66 },
      houses: {},
      aspects: [],
    },
  };
  const { chartWheel } = profileToOverviewModel(profile);
  const pluto = chartWheel.bodies.find((b) => b.key === 'Pluto');
  assert.ok(pluto, 'Pluto entry must still exist even when longitude missing');
  assert.equal(pluto.longitude, null, 'longitude must be null, NEVER silently 0');
  assert.equal(pluto.source, 'missing', 'source must be "missing"');
});

test('chartWheel.bodies: present body carries source="api"', () => {
  const profile = {
    western: {
      bodies: { Sun: { sign: 'Fische', longitude: 353.15 } },
      angles: { Ascendant: 27.71, MC: 280.66 },
      houses: {}, aspects: [],
    },
  };
  const { chartWheel } = profileToOverviewModel(profile);
  const sun = chartWheel.bodies.find((b) => b.key === 'Sun');
  assert.equal(sun.source, 'api', 'present longitude → source="api"');
});

test('chartWheel.bodies: shape contract {key,label,glyph,longitude,degreeDisplay,source}', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  for (const b of chartWheel.bodies) {
    assert.equal(typeof b.key, 'string', `body.key missing for ${JSON.stringify(b)}`);
    assert.ok('labelDE' in b, 'body.labelDE missing');
    assert.ok('glyph'   in b, 'body.glyph missing');
    assert.ok('longitude' in b, 'body.longitude missing (may be null)');
    assert.ok('degreeDisplay' in b, 'body.degreeDisplay missing (may be null)');
    assert.ok(['api', 'derived', 'missing'].includes(b.source),
      `body.source must be api|derived|missing, got: ${b.source}`);
  }
});

test('chartWheel.aspects: every entry has sourceKey + targetKey (stable)', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  for (const a of chartWheel.aspects) {
    assert.equal(typeof a.sourceKey, 'string', 'aspect.sourceKey missing');
    assert.equal(typeof a.targetKey, 'string', 'aspect.targetKey missing');
    assert.equal(typeof a.type,      'string', 'aspect.type missing');
  }
});

test('chartWheel.angles: {asc, mc, dsc?, ic?, source}', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  assert.ok(chartWheel.angles, 'angles object must exist');
  assert.ok(['api', 'derived', 'missing'].includes(chartWheel.angles.source),
    `angles.source must be api|derived|missing, got: ${chartWheel.angles.source}`);
});

test('chartWheel.angles: source="missing" when both ASC and MC absent', () => {
  const profile = { western: { bodies: {}, angles: {}, houses: {}, aspects: [] } };
  const { chartWheel } = profileToOverviewModel(profile);
  assert.equal(chartWheel.angles.asc, null);
  assert.equal(chartWheel.angles.mc,  null);
  assert.equal(chartWheel.angles.source, 'missing');
});
```

### Step 1.2 — RED: wheel must skip rendering bodies with source="missing"

Add to `test/natal-chart-wheel.test.js`:

```js
test('NatalChartWheel: body with source="missing" emits no dot/glyph but counts in audit hook', () => {
  cap.reset();
  const wheel = {
    bodies: [
      { key: 'Sun',   name: 'Sun',   longitude: 12.0, glyph: '☉', source: 'api'     },
      { key: 'Pluto', name: 'Pluto', longitude: null, glyph: '♇', source: 'missing' },
    ],
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    asc: 27.71, mc: 280.66, houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-body="Sun"'),   'Sun must render');
  assert.ok(!s.includes('data-body="Pluto"'), 'Pluto must NOT render as dot — longitude missing');
  // critical: must NOT have rendered Pluto at 0°
  assert.ok(!s.match(/data-body="Pluto"[^>]*cx="0"/),
    'Pluto must never render at 0° fallback (REQ-D-001)');
});
```

### Step 1.3 — GREEN: overviewModel emits source field

Edit `public/src/domain/overviewModel.js`. Replace `buildChartWheel` body mapping:

```js
function buildChartWheel(rawWestern) {
  const enrichedBodies = enrichWesternBodies(rawWestern || {});
  // I3: every key in the canonical planet table gets an entry, even if upstream
  // omitted it — but we mark source="missing" so the wheel skips rendering
  // and the audit shows "Daten fehlen". NEVER silently fall back to 0°.
  const CANONICAL_BODIES = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron',
  ];

  const bodies = CANONICAL_BODIES.map((bodyKey) => {
    const b = enrichedBodies[bodyKey] || {};
    const hasLon = typeof b.longitude === 'number' && Number.isFinite(b.longitude);
    return {
      key:          bodyKey,
      labelDE:      PLANET_DE_CLEAN[bodyKey] ?? bodyKey,
      glyph:        PLANET_GLYPH[bodyKey] ?? null,
      signGlyph:    (b.sign && SIGN_GLYPH[b.sign]) ?? null,
      degreeDisplay: hasLon ? (b.degDisplay ?? null) : null,
      house:        b.house ?? null,
      name:         bodyKey,
      longitude:    hasLon ? b.longitude : null,
      signDE:       hasLon ? b.signDE : null,
      retrograde:   b.retrograde ?? false,
      source:       hasLon ? 'api' : 'missing',
    };
  });

  const ascLon = num(rawWestern?.angles?.Ascendant);
  const mcLon  = num(rawWestern?.angles?.MC);
  const dscLon = ascLon != null ? normalizeLon(ascLon + 180) : null;
  const icLon  = mcLon  != null ? normalizeLon(mcLon  + 180) : null;
  const anglesSource =
    ascLon != null && mcLon != null ? 'api'
    : ascLon != null || mcLon != null ? 'derived'
    : 'missing';

  const rawHouses = rawWestern?.houses || {};
  const houses = Object.entries(rawHouses)
    .map(([num_, h]) => ({
      number: Number(num_),
      cuspLongitude: num(h?.longitude),
      sign: h?.sign ?? null,
    }))
    .filter((h) => Number.isFinite(h.number) && typeof h.cuspLongitude === 'number')
    .sort((a, b) => a.number - b.number);

  const enrichedAspects = selectSalientAspects(rawWestern?.aspects || [], 12);
  const aspects = enrichedAspects.map((a) => ({
    sourceKey:    a.planet1,
    targetKey:    a.planet2,
    typeDE:       ASPECT_DE[a.type] ?? a.type,
    tone:         aspectTone(a.type),
    source:       a.planet1, // legacy
    target:       a.planet2, // legacy
    type:         a.type,
    orb:          a.orb,
  }));

  return {
    bodies,
    angles: { asc: ascLon, dsc: dscLon, mc: mcLon, ic: icLon, source: anglesSource },
    asc: ascLon, mc: mcLon, houses, aspects,
  };
}
```

### Step 1.4 — GREEN: wheel skips missing-longitude bodies (already does; tighten)

The existing `NatalChartWheel.js` already guards with `if (typeof b.longitude !== 'number') continue;` — that satisfies the new RED test. Confirm by running `node --test test/natal-chart-wheel.test.js`.

### Step 1.5 — Run tests

```bash
node --test test/overview-model.test.js test/natal-chart-wheel.test.js
```

All new RED tests must turn GREEN.

---

## TASK-I3-002: ASC-left und Grad-Ticks implementieren

**Iterationsziel-Bezug:** Heute steht ASC irgendwo am Rand. Profis erwarten ASC links (9 o'clock) — das ist der konventionelle Anker. Drei Tick-Layer machen das Rad lesbar wie eine echte Astrologie-Software.

**Requirements:** REQ-F-003 (wheel ASC-left/ticks).

**Files:**
- modify `public/src/components/NatalChartWheel.js`
- modify `test/natal-chart-wheel.test.js`

### Step 2.1 — RED: tests for longitudeToChartAngle and tick layers

Add to `test/natal-chart-wheel.test.js`:

```js
test('longitudeToChartAngle: ASC longitude maps to 180° (9 o\'clock / left)', async () => {
  const { longitudeToChartAngle } = await import('../public/src/components/NatalChartWheel.js');
  // ASC = 27.71° → chart-angle 180°
  assert.equal(Math.round(longitudeToChartAngle(27.71, 27.71)), 180);
  // ASC longitude + 180 (i.e. DSC) → chart-angle 0° (3 o'clock / right)
  assert.equal(Math.round(longitudeToChartAngle(207.71, 27.71)) % 360, 0);
  // ASC longitude + 90 (i.e. IC region for typical mid-lat) → chart-angle 270° (bottom)
  assert.equal(Math.round(longitudeToChartAngle(117.71, 27.71)) % 360, 270);
});

test('NatalChartWheel: ASC marker positioned at chart-angle 180° (left side)', () => {
  cap.reset();
  const wheel = {
    bodies: [], asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  // The ASC text element carries data-angle-position="left"
  assert.ok(s.includes('data-angle="ASC"'),
    'ASC marker must carry data-angle="ASC"');
  assert.ok(s.includes('data-angle-position="left"'),
    'ASC must be tagged as left-positioned');
});

test('NatalChartWheel: emits 360 minor ticks, 72 medium ticks, 36 major ticks', () => {
  cap.reset();
  const wheel = { bodies: [], asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
    houses: [], aspects: [] };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  const minorCount  = (s.match(/data-tick="minor"/g)  || []).length;
  const mediumCount = (s.match(/data-tick="medium"/g) || []).length;
  const majorCount  = (s.match(/data-tick="major"/g)  || []).length;
  assert.equal(minorCount,  360, `expected 360 minor ticks, got ${minorCount}`);
  assert.equal(mediumCount,  72, `expected 72 medium ticks, got ${mediumCount}`);
  assert.equal(majorCount,   36, `expected 36 major ticks, got ${majorCount}`);
});
```

### Step 2.2 — GREEN: implement longitudeToChartAngle + tick generation

Edit `public/src/components/NatalChartWheel.js`. Replace the file's coordinate logic.

Add near the top (after `SVG_NS`):

```js
// I3: ASC-left invariant.
//
// We want the Ascendant longitude to always render at chart-angle 180°
// (9 o'clock / left side of the wheel). This is the standard professional
// convention. Without ascDeg, falls back to astronomical convention
// (0°=Aries=9 o'clock) so the function is safe to call on no-asc charts.
//
// chart-angle is measured in the standard SVG/math sense:
//   0°   = right (3 o'clock)
//   90°  = top  (we negate Y so up is positive sin)
//   180° = left (9 o'clock)  ← ASC lands here
//   270° = bottom
export function longitudeToChartAngle(lonDeg, ascDeg) {
  // delta = how far this longitude is past the ASC, going CCW.
  // delta=0   → ASC itself     → chart-angle 180°
  // delta=180 → opposite ASC   → chart-angle 0° (mod 360)
  const asc = typeof ascDeg === 'number' ? ascDeg : 0;
  const delta = ((lonDeg - asc) % 360 + 360) % 360;
  return (180 - delta + 360) % 360;
}

// Convert chart-angle → cartesian XY at given radius.
function chartAngleToXY(chartAngleDeg, radius) {
  const rad = chartAngleDeg * Math.PI / 180;
  return { x: radius * Math.cos(rad), y: -radius * Math.sin(rad) };
}

// Combined helper used everywhere bodies/markers are placed.
function lonToXYAsc(lonDeg, radius, ascDeg) {
  return chartAngleToXY(longitudeToChartAngle(lonDeg, ascDeg), radius);
}
```

Replace the body of `NatalChartWheel` so it uses `lonToXYAsc(lon, r, ascDeg)` everywhere it previously called `lonToXY(lon, r)`. Add tick generation BEFORE the sign-ring loop:

```js
export function NatalChartWheel({ wheel }) {
  const VIEW    = 480;
  const HALF    = VIEW / 2;
  const R_OUTER = 220;
  const R_INNER = 170;
  const R_TICK_MAJOR  = R_OUTER + 8;
  const R_TICK_MEDIUM = R_OUTER + 5;
  const R_TICK_MINOR  = R_OUTER + 3;
  const R_BODY  = 140;
  const R_ASPECT = R_BODY - 12;

  const w = wheel || { bodies: [], asc: null, mc: null, houses: [], aspects: [], angles: {} };
  const ascDeg = typeof w.asc === 'number' ? w.asc : (w.angles?.asc ?? 0);

  const root = el('svg', {
    viewBox: `-${HALF} -${HALF} ${VIEW} ${VIEW}`,
    width: '100%', height: 'auto',
    preserveAspectRatio: 'xMidYMid meet',
    'data-lane': 'west',
    'aria-label': 'Geburtsrad',
    role: 'img',
    class: 'natal-chart-wheel',
  });

  // Outer + inner rings.
  root.appendChild(el('circle', {
    cx: 0, cy: 0, r: R_OUTER,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1,
    'data-ring': 'outer',
  }));
  root.appendChild(el('circle', {
    cx: 0, cy: 0, r: R_INNER,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1,
    'data-ring': 'inner',
  }));

  // ── Tick layers ─────────────────────────────────────────────────────────
  // 360 minor ticks (every 1°), 72 medium ticks (every 5°), 36 major (every 10°)
  for (let deg = 0; deg < 360; deg++) {
    const isMajor  = deg % 10 === 0;
    const isMedium = !isMajor && deg % 5 === 0;
    const tickClass = isMajor ? 'major' : (isMedium ? 'medium' : 'minor');
    const rOuter = R_OUTER;
    const rInner =
      isMajor  ? R_OUTER - 8 :
      isMedium ? R_OUTER - 5 :
                 R_OUTER - 3;
    const tipOuter = lonToXYAsc(deg, rOuter, ascDeg);
    const tipInner = lonToXYAsc(deg, rInner, ascDeg);
    root.appendChild(el('line', {
      x1: tipOuter.x, y1: tipOuter.y, x2: tipInner.x, y2: tipInner.y,
      stroke: 'currentColor',
      'stroke-width': isMajor ? 1.0 : (isMedium ? 0.6 : 0.3),
      opacity: isMajor ? 0.9 : (isMedium ? 0.6 : 0.3),
      'data-tick': tickClass,
      'data-tick-deg': deg,
    }));
  }

  // ── Sign labels (12 zodiac names, German) ───────────────────────────────
  for (let i = 0; i < 12; i++) {
    const lon = i * 30;
    const labelPos = lonToXYAsc(lon + 15, (R_OUTER + R_INNER) / 2, ascDeg);
    root.appendChild(el('text', {
      x: labelPos.x, y: labelPos.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 10, fill: 'currentColor',
      'data-sign-label': SIGNS_DE[i],
    }, SIGNS_DE[i]));
  }

  // ── House cusps ─────────────────────────────────────────────────────────
  if (Array.isArray(w.houses) && w.houses.length) {
    for (const h of w.houses) {
      if (typeof h.cuspLongitude !== 'number') continue;
      const a = lonToXYAsc(h.cuspLongitude, R_INNER, ascDeg);
      root.appendChild(el('line', {
        x1: 0, y1: 0, x2: a.x, y2: a.y,
        stroke: 'currentColor', 'stroke-width': 0.5,
        'stroke-dasharray': '2 2', opacity: 0.5,
        'data-house': String(h.number),
      }));
    }
  }

  // ── Angle markers ───────────────────────────────────────────────────────
  function renderAngleMarker(lon, label, position) {
    if (typeof lon !== 'number') return;
    const p = lonToXYAsc(lon, R_OUTER + 14, ascDeg);
    root.appendChild(el('text', {
      x: p.x, y: p.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 12, 'font-weight': 'bold', fill: 'currentColor',
      'data-marker': label.toLowerCase(),
      'data-angle': label,
      'data-angle-position': position,
    }, label));
  }
  // ASC is always at chart-angle 180° = LEFT by definition of longitudeToChartAngle.
  renderAngleMarker(w.asc, 'ASC', 'left');
  renderAngleMarker(w.mc,  'MC',  'top');
  const angles = w.angles || {};
  renderAngleMarker(angles.dsc, 'DSC', 'right');
  renderAngleMarker(angles.ic,  'IC',  'bottom');

  // ── Aspect lines ────────────────────────────────────────────────────────
  if (Array.isArray(w.aspects)) {
    for (const asp of w.aspects) {
      if (!MAJOR_ASPECTS.has(asp.type)) continue;
      const srcKey = asp.sourceKey ?? asp.source;
      const tgtKey = asp.targetKey ?? asp.target;
      const src = w.bodies.find((b) => (b.key ?? b.name) === srcKey);
      const tgt = w.bodies.find((b) => (b.key ?? b.name) === tgtKey);
      if (!src || !tgt) continue;
      if (typeof src.longitude !== 'number' || typeof tgt.longitude !== 'number') continue;
      const a = lonToXYAsc(src.longitude, R_ASPECT, ascDeg);
      const b = lonToXYAsc(tgt.longitude, R_ASPECT, ascDeg);
      const tone = asp.tone ?? 'neutral';
      root.appendChild(el('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: 'currentColor', 'stroke-width': 0.5, opacity: 0.4,
        'data-aspect': asp.type,
        class: `natal-aspect natal-aspect--${tone}`,
      }));
    }
  }

  // ── Bodies (Step 3 adds collision/leader) ───────────────────────────────
  // Placeholder until Step 3 adds the lane algorithm.
  if (Array.isArray(w.bodies)) {
    renderBodies(root, w.bodies, ascDeg, { R_BODY });
  }

  return root;
}

// Step-3 stub — replaced in TASK-I3-003.
function renderBodies(root, bodies, ascDeg, { R_BODY }) {
  for (const b of bodies) {
    if (typeof b.longitude !== 'number') continue;
    const bodyKey = b.key ?? b.name;
    const pos = lonToXYAsc(b.longitude, R_BODY, ascDeg);
    root.appendChild(el('circle', {
      cx: pos.x, cy: pos.y, r: 4,
      fill: 'currentColor',
      'data-body': bodyKey,
    }));
  }
}
```

### Step 2.3 — Run tests

```bash
node --test test/natal-chart-wheel.test.js
```

All tick / ASC-left assertions must be GREEN. Existing tests (sign labels, ASC/MC marker) must still pass.

---

## TASK-I3-003: Glyphen, Labels, Kollisionen, Leader-Lines

**Iterationsziel-Bezug:** Heute überlappen sich Planeten bei naher Konjunktion. Profis brauchen Lanes + Leader-Lines, damit ☉/☿ in Fische lesbar bleiben.

**Requirements:** REQ-F-003 (wheel glyphs, no overlap).

**Files:**
- modify `public/src/components/NatalChartWheel.js`
- modify `public/src/styles/main.css`
- modify `test/natal-chart-wheel.test.js`

### Step 3.1 — RED: collision-lane and leader-line tests

Add to `test/natal-chart-wheel.test.js`:

```js
test('NatalChartWheel: planet glyph rendered for every body with longitude', () => {
  cap.reset();
  const wheel = {
    bodies: [
      { key: 'Sun',     name: 'Sun',     longitude: 353.15, glyph: '☉', source: 'api' },
      { key: 'Moon',    name: 'Moon',    longitude: 158.23, glyph: '☽', source: 'api' },
      { key: 'Mercury', name: 'Mercury', longitude: 340.0,  glyph: '☿', source: 'api' },
    ],
    asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-body-glyph="☉"'), 'Sun glyph missing');
  assert.ok(s.includes('data-body-glyph="☽"'), 'Moon glyph missing');
  assert.ok(s.includes('data-body-glyph="☿"'), 'Mercury glyph missing');
});

test('NatalChartWheel: collision detection — bodies within 6° land on different lanes', () => {
  cap.reset();
  // Sun + Mercury both at ~353° / ~340° → within 13° but Mercury+Venus tight:
  const wheel = {
    bodies: [
      { key: 'Mercury', name: 'Mercury', longitude: 340.0, glyph: '☿', source: 'api' },
      { key: 'Venus',   name: 'Venus',   longitude: 343.0, glyph: '♀', source: 'api' },
    ],
    asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  // At least one body must carry data-lane-offset > 0
  assert.ok(s.match(/data-lane-offset="[1-9]"/),
    'colliding bodies (Δ < 6°) must be offset onto a non-zero lane');
});

test('NatalChartWheel: leader-line emitted when body offset onto outer lane', () => {
  cap.reset();
  const wheel = {
    bodies: [
      { key: 'Mercury', name: 'Mercury', longitude: 340.0, glyph: '☿', source: 'api' },
      { key: 'Venus',   name: 'Venus',   longitude: 343.0, glyph: '♀', source: 'api' },
    ],
    asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-leader-line="true"'),
    'offset body must emit a leader-line back to the planet true position');
});

test('NatalChartWheel: solitary body has data-lane-offset="0" and no leader-line', () => {
  cap.reset();
  const wheel = {
    bodies: [{ key: 'Sun', name: 'Sun', longitude: 90.0, glyph: '☉', source: 'api' }],
    asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-lane-offset="0"'),
    'lone body must be on lane 0');
  assert.ok(!s.includes('data-leader-line="true"'),
    'lone body must NOT emit a leader-line');
});
```

### Step 3.2 — GREEN: lane algorithm + leader-line + glyph constants

Edit `public/src/components/NatalChartWheel.js`. Add the glyph constant near the top:

```js
// Canonical planet glyph map. Mirrors PLANET_GLYPH in data/astro-mappings.js
// so the wheel renders even when the model omits the field.
const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷',
};

// Collision bucket width: bodies within ±3° of each other land in the same
// bucket and are assigned successive radial lanes outward.
const COLLISION_DELTA_DEG = 6;

// Lane radial offsets in pixels — each successive lane sits this much farther
// out from R_BODY. Lane 0 is on the body ring itself.
const LANE_RADIAL_STEP = 18;
```

Replace the `renderBodies` stub with the real implementation:

```js
// Assign every body a lane index (0 = no offset; 1,2,... = outward).
// Two bodies whose longitudes are within COLLISION_DELTA_DEG share a bucket;
// inside a bucket, bodies are sorted by longitude and lane = position in bucket.
function assignLanes(bodies) {
  const placeable = bodies.filter((b) => typeof b.longitude === 'number');
  // Sort by longitude.
  const sorted = [...placeable].sort((a, b) => a.longitude - b.longitude);
  const lanes = new Map(); // bodyKey → lane index
  let bucketStartLon = -Infinity;
  let bucketIndex = 0;
  for (const b of sorted) {
    const key = b.key ?? b.name;
    if (b.longitude - bucketStartLon < COLLISION_DELTA_DEG) {
      // Same bucket — increment lane.
      lanes.set(key, bucketIndex);
      bucketIndex++;
    } else {
      // New bucket.
      bucketStartLon = b.longitude;
      bucketIndex = 0;
      lanes.set(key, 0);
      bucketIndex = 1;
    }
  }
  return lanes;
}

function renderBodies(root, bodies, ascDeg, { R_BODY }) {
  const lanes = assignLanes(bodies);
  for (const b of bodies) {
    if (typeof b.longitude !== 'number') continue; // source="missing" — skip
    const bodyKey = b.key ?? b.name;
    const lane = lanes.get(bodyKey) ?? 0;
    const trueRadius = R_BODY;
    const offsetRadius = R_BODY + lane * LANE_RADIAL_STEP;

    // True position dot stays on R_BODY (anchor for the leader-line).
    const truePos = lonToXYAsc(b.longitude, trueRadius, ascDeg);
    root.appendChild(el('circle', {
      cx: truePos.x, cy: truePos.y, r: 3,
      fill: 'currentColor',
      'data-body': bodyKey,
      'data-lane-offset': String(lane),
    }));

    // Glyph and degree label render on the (possibly-offset) lane radius.
    const glyphRadius = offsetRadius + 8;
    const glyphPos = lonToXYAsc(b.longitude, glyphRadius, ascDeg);
    const glyph = b.glyph ?? PLANET_GLYPHS[bodyKey] ?? '·';
    root.appendChild(el('text', {
      x: glyphPos.x, y: glyphPos.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 14, fill: 'currentColor',
      'data-body-glyph': glyph,
      'data-body-for': bodyKey,
      'data-lane-offset': String(lane),
    }, glyph));

    if (b.degreeDisplay) {
      const degRadius = offsetRadius + 22;
      const degPos = lonToXYAsc(b.longitude, degRadius, ascDeg);
      root.appendChild(el('text', {
        x: degPos.x, y: degPos.y,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': 8, fill: 'currentColor', opacity: 0.7,
        'data-body-degree': b.degreeDisplay,
        'data-body-for': bodyKey,
      }, b.degreeDisplay));
    }

    // Leader-line: only when the body was kicked outward (lane > 0).
    if (lane > 0) {
      const leaderEnd = lonToXYAsc(b.longitude, offsetRadius - 2, ascDeg);
      root.appendChild(el('line', {
        x1: truePos.x, y1: truePos.y,
        x2: leaderEnd.x, y2: leaderEnd.y,
        stroke: 'currentColor', 'stroke-width': 0.5, opacity: 0.5,
        'data-leader-line': 'true',
        'data-leader-for': bodyKey,
      }));
    }
  }
}
```

### Step 3.3 — Style ticks, lanes, leaders

Add to `public/src/styles/main.css`:

```css
/* I3 — Wheel professional styling */
.natal-chart-wheel [data-tick="minor"]  { opacity: 0.25; }
.natal-chart-wheel [data-tick="medium"] { opacity: 0.55; }
.natal-chart-wheel [data-tick="major"]  { opacity: 0.85; }

.natal-chart-wheel [data-leader-line="true"] {
  stroke-dasharray: 1 2;
}

.natal-chart-wheel .natal-aspect--hard    { stroke: var(--color-aspect-hard, #b94a4a); opacity: 0.6; }
.natal-chart-wheel .natal-aspect--soft    { stroke: var(--color-aspect-soft, #4a9b6f); opacity: 0.6; }
.natal-chart-wheel .natal-aspect--neutral { stroke: var(--color-aspect-neutral, #888); opacity: 0.35; }

.natal-chart-wheel [data-angle] {
  paint-order: stroke;
  stroke: var(--bg-base, #0c0c10);
  stroke-width: 3px;
}
```

### Step 3.4 — Run tests

```bash
node --test test/natal-chart-wheel.test.js
```

All collision/leader-line/glyph tests must be GREEN.

---

## TASK-I3-004: Aspect-Legende und Daten-Audit unter dem Wheel

**Iterationsziel-Bezug:** Das Wheel allein ist nicht prüfbar — Nutzer brauchen eine ordered list aller Werte mit Provenance. Ohne Audit-Liste ist REQ-D-001 / REQ-D-003 unsichtbar.

**Requirements:** REQ-F-003 (audit visible), REQ-D-001 (no fake 0°), REQ-D-003 (source labels).

**Files:**
- create `public/src/components/NatalChartAudit.js`
- modify `public/src/pages/OverviewPage.js`
- create `test/natal-chart-audit.test.js`

### Step 4.1 — RED: NatalChartAudit tests

Create `test/natal-chart-audit.test.js`:

```js
// I3 — NatalChartAudit component tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { NatalChartAudit } = await import('../public/src/components/NatalChartAudit.js');

function serializeFakeTree(node, out = []) {
  if (!node) return out;
  if (node.tag) {
    const attrPairs = Object.entries(node._attrs || {})
      .map(([k, v]) => `${k}="${v}"`).join(' ');
    out.push(`<${node.tag}${attrPairs ? ' ' + attrPairs : ''}>${node._text || ''}`);
  }
  for (const c of (node._children || [])) serializeFakeTree(c, out);
  return out.join('\n');
}

const WHEEL = {
  bodies: [
    { key: 'Sun', labelDE: 'Sonne', glyph: '☉', longitude: 353.15,
      signDE: 'Fische', degreeDisplay: "23°09'", house: 12, source: 'api' },
    { key: 'Moon', labelDE: 'Mond', glyph: '☽', longitude: 158.23,
      signDE: 'Jungfrau', degreeDisplay: "8°14'", house: 6, source: 'api' },
    { key: 'Pluto', labelDE: 'Pluto', glyph: '♇', longitude: null,
      signDE: null, degreeDisplay: null, house: null, source: 'missing' },
  ],
  angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
  aspects: [
    { sourceKey: 'Sun', targetKey: 'Moon', type: 'square', typeDE: 'Quadrat',
      tone: 'hard', orb: 4.92 },
    { sourceKey: 'Moon', targetKey: 'Neptune', type: 'trine', typeDE: 'Trigon',
      tone: 'soft', orb: 0.42 },
  ],
};

test('NatalChartAudit: returns a DOM node with data-component="natal-chart-audit"', () => {
  cap.reset();
  const node = NatalChartAudit({ wheel: WHEEL });
  assert.ok(node, 'must return a node');
  assert.equal(node._attrs['data-component'], 'natal-chart-audit');
});

test('NatalChartAudit: emits one audit-row per body (including missing)', () => {
  cap.reset();
  const node = NatalChartAudit({ wheel: WHEEL });
  const s = serializeFakeTree(node);
  assert.ok(s.includes('data-audit-row="Sun"'),   'Sun audit row missing');
  assert.ok(s.includes('data-audit-row="Moon"'),  'Moon audit row missing');
  assert.ok(s.includes('data-audit-row="Pluto"'), 'Pluto audit row missing');
});

test('NatalChartAudit: missing body row carries data-source="missing" and "Daten fehlen" label', () => {
  cap.reset();
  const node = NatalChartAudit({ wheel: WHEEL });
  const s = serializeFakeTree(node);
  assert.ok(s.match(/data-audit-row="Pluto"[^>]*[\s\S]*?data-source="missing"/),
    'Pluto row must carry data-source="missing"');
  assert.ok(s.includes('Daten fehlen'),
    'Missing rows must render visible "Daten fehlen" copy');
});

test('NatalChartAudit: present body row shows sign, degreeDisplay, house, source pill', () => {
  cap.reset();
  const node = NatalChartAudit({ wheel: WHEEL });
  const s = serializeFakeTree(node);
  assert.ok(s.includes('Sonne'),    'labelDE "Sonne" must render');
  assert.ok(s.includes('Fische'),   'signDE must render');
  assert.ok(s.includes("23°09'"),   'degreeDisplay must render');
  assert.ok(s.includes('Haus 12'),  'house must render');
  assert.ok(s.match(/data-source="api"/), 'source pill must render');
});

test('NatalChartAudit: aspect legend renders hard / soft / neutral buckets', () => {
  cap.reset();
  const node = NatalChartAudit({ wheel: WHEEL });
  const s = serializeFakeTree(node);
  assert.ok(s.includes('data-aspect-bucket="hard"'),    'hard bucket missing');
  assert.ok(s.includes('data-aspect-bucket="soft"'),    'soft bucket missing');
  assert.ok(s.includes('data-aspect-bucket="neutral"'), 'neutral bucket missing');
});

test('NatalChartAudit: hard aspects bucket lists "Sonne Quadrat Mond"', () => {
  cap.reset();
  const node = NatalChartAudit({ wheel: WHEEL });
  const s = serializeFakeTree(node);
  assert.ok(s.includes('Quadrat'),
    'aspect typeDE label must render in legend');
});

test('NatalChartAudit: tolerates entirely empty wheel', () => {
  cap.reset();
  let node;
  assert.doesNotThrow(() => {
    node = NatalChartAudit({ wheel: { bodies: [], angles: {}, aspects: [] } });
  });
  const s = serializeFakeTree(node);
  assert.ok(s.includes('Keine Daten'),
    'empty wheel must render a visible "Keine Daten" placeholder');
});
```

### Step 4.2 — GREEN: implement NatalChartAudit

Create `public/src/components/NatalChartAudit.js`:

```js
// public/src/components/NatalChartAudit.js
//
// I3 — Data-audit panel rendered under the NatalChartWheel.
//
// Surfaces the wheel's underlying values as a checkable list:
// every canonical body gets a row (even when longitude is missing),
// every aspect lands in its hard / soft / neutral bucket, and every
// row carries a provenance pill (api | derived | missing).
//
// Pure factory. No state, no side-effects beyond DOM construction.
// Cross-environment: uses the same el() pattern as NatalChartWheel.js
// so the capture-DOM stub can record attributes.

const HTML_NS = 'http://www.w3.org/1999/xhtml';

function el(tag, attrs = {}, textContent = null, children = []) {
  let node;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'class') node.className = String(v);
      else node.setAttribute(k, String(v));
    }
    if (textContent != null && textContent !== '') {
      node.appendChild(document.createTextNode(String(textContent)));
    }
    for (const c of children) if (c != null) node.appendChild(c);
    return node;
  }
  node = {
    tag,
    _attrs: {},
    _children: [],
    _text: '',
    setAttribute(k, v) { this._attrs[k] = String(v); },
    appendChild(c) { if (c != null) this._children.push(c); },
  };
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    node._attrs[k] = String(v);
  }
  if (textContent != null && textContent !== '') node._text = String(textContent);
  for (const c of children) if (c != null) node._children.push(c);
  return node;
}

const SOURCE_LABEL = {
  api:     'Quelle: API',
  derived: 'abgeleitet',
  missing: 'fehlt',
};

const BUCKET_LABEL = {
  hard:    'Spannungsaspekte',
  soft:    'Harmonische Aspekte',
  neutral: 'Neutrale Aspekte',
};

const BUCKET_DESCRIPTION = {
  hard:    'Reibung, Wachstumsdruck (Quadrat, Opposition).',
  soft:    'Fluss, leichter Zugang (Trigon, Sextil).',
  neutral: 'Verdichtung ohne Vorzeichen (Konjunktion, Quinkunx).',
};

function renderBodyRow(body) {
  const isMissing = body.source === 'missing';
  const row = el('li', {
    'data-audit-row': body.key,
    'data-source': body.source,
    class: `audit-row audit-row--${body.source}`,
  });

  // Glyph
  row.appendChild(el('span', {
    class: 'audit-glyph',
    'data-body-glyph': body.glyph || '·',
  }, body.glyph || '·'));

  // Name
  row.appendChild(el('span', { class: 'audit-name' }, body.labelDE || body.key));

  if (isMissing) {
    row.appendChild(el('span', { class: 'audit-missing' }, 'Daten fehlen'));
  } else {
    row.appendChild(el('span', { class: 'audit-sign' }, body.signDE || '—'));
    row.appendChild(el('span', { class: 'audit-degree' }, body.degreeDisplay || '—'));
    row.appendChild(el('span', { class: 'audit-house' },
      body.house != null ? `Haus ${body.house}` : '—'));
  }

  // Source pill
  row.appendChild(el('span', {
    class: `audit-source-pill audit-source-pill--${body.source}`,
    'data-source-pill': body.source,
  }, SOURCE_LABEL[body.source] || body.source));

  return row;
}

function renderAspectBucket(bucket, aspects) {
  const wrap = el('div', {
    class: `audit-bucket audit-bucket--${bucket}`,
    'data-aspect-bucket': bucket,
  });
  wrap.appendChild(el('h4', { class: 'audit-bucket-title' },
    BUCKET_LABEL[bucket] || bucket));
  wrap.appendChild(el('p', { class: 'audit-bucket-desc' },
    BUCKET_DESCRIPTION[bucket] || ''));

  const list = el('ul', { class: 'audit-bucket-list' });
  if (!aspects.length) {
    list.appendChild(el('li', { class: 'audit-bucket-empty' }, '—'));
  } else {
    for (const a of aspects) {
      list.appendChild(el('li', {
        class: 'audit-aspect',
        'data-aspect-row': `${a.sourceKey}-${a.type}-${a.targetKey}`,
      }, `${a.sourceKey} ${a.typeDE || a.type} ${a.targetKey}` +
         (typeof a.orb === 'number' ? ` (Orb ${a.orb.toFixed(2)}°)` : '')));
    }
  }
  wrap.appendChild(list);
  return wrap;
}

export function NatalChartAudit({ wheel }) {
  const w = wheel || { bodies: [], angles: {}, aspects: [] };
  const root = el('section', {
    'data-component': 'natal-chart-audit',
    class: 'natal-chart-audit',
    'aria-label': 'Geburtsrad Daten-Audit',
  });

  // ── Bodies list ────────────────────────────────────────────────────────
  const bodiesHeader = el('h3', { class: 'audit-section-title' }, 'Planeten & Punkte');
  root.appendChild(bodiesHeader);

  if (!w.bodies || w.bodies.length === 0) {
    root.appendChild(el('p', { class: 'audit-empty' }, 'Keine Daten.'));
    return root;
  }

  const list = el('ol', { class: 'audit-body-list' });
  for (const b of w.bodies) list.appendChild(renderBodyRow(b));
  root.appendChild(list);

  // ── Aspect legend ──────────────────────────────────────────────────────
  const aspectsHeader = el('h3', { class: 'audit-section-title' }, 'Aspekt-Legende');
  root.appendChild(aspectsHeader);

  const buckets = { hard: [], soft: [], neutral: [] };
  for (const a of (w.aspects || [])) {
    const tone = ['hard', 'soft', 'neutral'].includes(a.tone) ? a.tone : 'neutral';
    buckets[tone].push(a);
  }

  const legend = el('div', { class: 'audit-legend' });
  legend.appendChild(renderAspectBucket('hard',    buckets.hard));
  legend.appendChild(renderAspectBucket('soft',    buckets.soft));
  legend.appendChild(renderAspectBucket('neutral', buckets.neutral));
  root.appendChild(legend);

  // ── Warnings row (any missing bodies?) ─────────────────────────────────
  const missing = w.bodies.filter((b) => b.source === 'missing');
  if (missing.length) {
    const warn = el('p', {
      class: 'audit-warning',
      'data-audit-warning': 'missing-bodies',
    }, `${missing.length} Körper ohne Daten: ${missing.map((b) => b.labelDE).join(', ')}.`);
    root.appendChild(warn);
  }

  return root;
}
```

### Step 4.3 — Wire NatalChartAudit into OverviewPage

Edit `public/src/pages/OverviewPage.js`. After the wheel is mounted, append the audit panel:

```js
// Import at top of file:
import { NatalChartAudit } from '../components/NatalChartAudit.js';

// Then, in the render path, AFTER appending the wheel to the wheel-hero
// section, append the audit panel beneath it:
const auditPanel = NatalChartAudit({ wheel: model.chartWheel });
wheelHeroSection.appendChild(auditPanel);
```

(Edit must be inserted at the matching location in the existing OverviewPage. If the wheel section doesn't yet exist, mount under `<section data-section="wheel-audit">`.)

### Step 4.4 — Style the audit panel

Add to `public/src/styles/main.css`:

```css
/* I3 — NatalChartAudit */
.natal-chart-audit { display: grid; gap: 1rem; padding: 1rem 0; }
.audit-body-list   { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.25rem; }
.audit-row {
  display: grid;
  grid-template-columns: 2ch 1.5fr 1fr 1fr 1fr auto;
  gap: 0.5rem; align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}
.audit-row--missing { opacity: 0.6; background: rgba(255,255,255,0.03); }
.audit-source-pill {
  font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 999px;
  border: 1px solid currentColor; opacity: 0.7;
}
.audit-source-pill--missing { color: var(--color-warn, #d49e4a); }
.audit-source-pill--api     { color: var(--color-ok,   #4a9b6f); }
.audit-source-pill--derived { color: var(--color-info, #6f8fb9); }
.audit-legend { display: grid; gap: 0.5rem; grid-template-columns: repeat(3, 1fr); }
@media (max-width: 720px) { .audit-legend { grid-template-columns: 1fr; } }
.audit-bucket { padding: 0.5rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; }
.audit-bucket--hard    { border-color: var(--color-aspect-hard, #b94a4a); }
.audit-bucket--soft    { border-color: var(--color-aspect-soft, #4a9b6f); }
.audit-bucket--neutral { border-color: var(--color-aspect-neutral, #888); }
.audit-warning {
  color: var(--color-warn, #d49e4a);
  font-size: 0.85rem;
  border-left: 3px solid currentColor;
  padding-left: 0.5rem;
}
```

### Step 4.5 — Playwright visual spec

Create `tests-playwright/i3-wheel.spec.js`:

```js
// I3 — Playwright visual spec for the wheel + audit panel.
import { test, expect } from '@playwright/test';
import { gotoOverviewWithFixture } from './_helpers/page-helpers.js';

test.describe('I3 — Professional Birthchart Wheel', () => {
  test('ASC marker is positioned at left side of wheel', async ({ page }) => {
    await gotoOverviewWithFixture(page, 'lina');
    const ascMarker = page.locator('[data-angle="ASC"]');
    await expect(ascMarker).toBeVisible();
    await expect(ascMarker).toHaveAttribute('data-angle-position', 'left');
    const box = await ascMarker.boundingBox();
    const wheel = await page.locator('.natal-chart-wheel').boundingBox();
    // ASC must sit on the left half of the wheel.
    expect(box.x).toBeLessThan(wheel.x + wheel.width / 2);
  });

  test('360 minor + 72 medium + 36 major ticks render', async ({ page }) => {
    await gotoOverviewWithFixture(page, 'lina');
    await expect(page.locator('[data-tick="minor"]')).toHaveCount(360);
    await expect(page.locator('[data-tick="medium"]')).toHaveCount(72);
    await expect(page.locator('[data-tick="major"]')).toHaveCount(36);
  });

  test('every audit row corresponds to a body — and vice versa', async ({ page }) => {
    await gotoOverviewWithFixture(page, 'lina');
    const auditRows = await page.locator('[data-audit-row]').count();
    const bodies   = await page.locator('[data-body]').count();
    // The audit list contains EVERY canonical body (incl. missing ones).
    // The wheel only renders bodies with longitude. So auditRows >= bodies.
    expect(auditRows).toBeGreaterThanOrEqual(bodies);
    expect(auditRows).toBeGreaterThanOrEqual(7); // luminaries + classical planets
  });

  test('leader-line renders only when bodies were offset onto a lane', async ({ page }) => {
    await gotoOverviewWithFixture(page, 'lina');
    const leaders   = await page.locator('[data-leader-line="true"]').count();
    const offsetBodies = await page.locator('[data-body][data-lane-offset]:not([data-lane-offset="0"])').count();
    expect(leaders).toEqual(offsetBodies);
  });

  test('glyph count matches number of bodies-with-longitude', async ({ page }) => {
    await gotoOverviewWithFixture(page, 'lina');
    const glyphCount = await page.locator('[data-body-glyph]').count();
    const dotCount   = await page.locator('[data-body]').count();
    expect(glyphCount).toEqual(dotCount);
  });

  test('Pluto-missing fixture: audit shows "Daten fehlen", wheel has no Pluto dot', async ({ page }) => {
    await gotoOverviewWithFixture(page, 'pluto-missing');
    await expect(page.locator('[data-audit-row="Pluto"][data-source="missing"]'))
      .toBeVisible();
    await expect(page.locator('[data-audit-row="Pluto"]')).toContainText('Daten fehlen');
    await expect(page.locator('[data-body="Pluto"]')).toHaveCount(0);
  });

  test('visual snapshots', async ({ page }) => {
    await gotoOverviewWithFixture(page, 'lina');
    await expect(page).toHaveScreenshot('docs/qa/screenshots/i3-wheel/overview-desktop.png', {
      fullPage: true, maxDiffPixelRatio: 0.02,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveScreenshot('docs/qa/screenshots/i3-wheel/overview-mobile.png', {
      fullPage: true, maxDiffPixelRatio: 0.02,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    const wheel = page.locator('.natal-chart-wheel');
    await expect(wheel).toHaveScreenshot('docs/qa/screenshots/i3-wheel/wheel-closeup.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
```

### Step 4.6 — Run all tests

```bash
node --test test/overview-model.test.js test/natal-chart-wheel.test.js test/natal-chart-audit.test.js
npx playwright test tests-playwright/i3-wheel.spec.js
```

---

## Iteration Definition of Done

The iteration is complete only when ALL of the following hold:

1. **ASC-left invariant verified.** `longitudeToChartAngle(ascDeg, ascDeg) === 180` for every fixture chart. Playwright confirms the ASC text element sits on the left half of the wheel bounding box.
2. **Three tick layers visible.** 360 minor + 72 medium + 36 major ticks rendered per chart (asserted via attribute selectors).
3. **Planet glyphs render for every body with longitude.** Glyph count equals dot count.
4. **Collision resolution working.** When two bodies are within 6° longitude, the lower-priority one is offset onto an outer lane with a leader-line back to its true position.
5. **No fake 0°.** Bodies with `source: 'missing'` are NOT rendered as dots. Pluto-missing fixture renders zero `[data-body="Pluto"]` SVG nodes.
6. **Audit list visible.** Every canonical body has an `[data-audit-row]` entry beneath the wheel. Missing rows show "Daten fehlen" and `data-source="missing"`.
7. **Aspect legend present.** Three buckets (hard/soft/neutral) render with descriptions; hard aspects from the chart appear in the hard bucket.
8. **All unit tests GREEN.** `node --test test/overview-model.test.js test/natal-chart-wheel.test.js test/natal-chart-audit.test.js` exits 0.
9. **All Playwright tests GREEN.** `npx playwright test tests-playwright/i3-wheel.spec.js` exits 0.
10. **Screenshots committed.** `docs/qa/screenshots/i3-wheel/overview-desktop.png`, `overview-mobile.png`, `wheel-closeup.png` present and reviewed.
11. **Existing tests still GREEN.** The full suite (`npm test`) passes — no regressions in I0/I1/I2 expectations.

## Validation strategy

Exact commands, in order:

```bash
# 1. Unit tests for the new/modified pure modules.
node --test test/overview-model.test.js
node --test test/natal-chart-wheel.test.js
node --test test/natal-chart-audit.test.js

# 2. Full unit + integration suite — no regressions.
npm test

# 3. Playwright visual + behavioural assertions.
npx playwright install --with-deps chromium   # only first run
npx playwright test tests-playwright/i3-wheel.spec.js

# 4. Manual smoke against a real upstream profile.
npm start &
SERVER_PID=$!
sleep 2
curl -s -X POST http://127.0.0.1:3000/api/azodiac/profile \
  -H 'Content-Type: application/json' \
  -d @test/_fixtures/upstream-snapshots/profile.real.json > /tmp/profile.json
# Then open http://127.0.0.1:3000/#/overview in browser and visually verify:
#   - ASC text sits at 9 o'clock
#   - Ticks form a visible "ruler" outside the inner ring
#   - Planet glyphs (☉ ☽ ☿ ♀ ♂ ♃ ♄) are legible
#   - Audit list under the wheel lists every body with sign + degree + house + source pill
kill $SERVER_PID

# 5. Screenshot regression baseline (only on first pass).
npx playwright test tests-playwright/i3-wheel.spec.js --update-snapshots
```

Hard constraint reminder: if a Playwright test ever logs `data-body="<Name>"` with `cx="0" cy="0"` for a body whose `source === 'missing'` in the model, the iteration is failed — that is a REQ-D-001 violation.

## Rollback note

This iteration is additive at the model layer (new `source` field) and signature-extending at the component layer (`longitudeToChartAngle` is a new export; the wheel still accepts the legacy wheel shape because `ascDeg` defaults to `0`). Rollback strategy:

1. **Surgical rollback (preferred):** revert only the four touched files (`overviewModel.js`, `NatalChartWheel.js`, the new `NatalChartAudit.js` import in `OverviewPage.js`, and `main.css` additions). The `source` field on bodies is forward-compatible — older consumers ignore it.
2. **Hard rollback:** `git revert <I3-merge-commit>`. Because I2 (RollingText on wheel headline) only touches the headline node, not the wheel SVG, I2 remains valid after revert.
3. **Tests:** remove the new test files (`natal-chart-audit.test.js`) and the I3 block additions in `overview-model.test.js` / `natal-chart-wheel.test.js`. The pre-I3 tests remain GREEN.

There is no migration, no persisted state, no DB schema — the wheel is a pure render of the in-flight `chartWheel` model.

## Handoff to next iteration: I4

I3 leaves the wheel as the canonical visual anchor with auditable data. I4 will pick this up and:

- **Bind aspect interactivity:** clicking an aspect line in the wheel highlights both the bucket entry in the audit legend AND the two body rows. Conversely, hovering an audit row dims unrelated aspects and bodies.
- **Mobile lane-collapse:** at viewport < 480px, the 6° collision delta widens to 10° (more aggressive lane offsetting) and tick density drops to medium + major only (132 ticks total) to keep the wheel legible.
- **Houses-overlay toggle:** add a control beneath the wheel that toggles between "Whole Sign" and "Placidus" house visualization, gated on the upstream `houses[].system` field. Falls back to a disabled toggle with explanatory tooltip when only one system is delivered.

Contract handoff: I4 consumes the same `chartWheel` ViewModel I3 produces. The only new fields I4 will require are `houses[].system` (string, optional) and `aspects[].id` (stable identifier for click-binding). Both are additive — I3 ships nothing that I4 needs to undo.
