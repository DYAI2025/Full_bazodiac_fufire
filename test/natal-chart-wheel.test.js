// Task 2 — NatalChartWheel pure-SVG component (Sprint I).
//
// Renders an additive Wheel-Hero section on /overview. Consumes the
// normalized chartWheel shape produced by profileToOverviewModel —
// no raw API field names leak into this component.
//
// In the capture-DOM stub environment, NatalChartWheel falls back to
// plain object nodes (since createElementNS is absent). We walk the
// resulting tree with serializeFakeTree() to assert on attributes —
// the stub's cap.aggregate() only records textContent/innerHTML, not
// setAttribute, so a custom walker is the appropriate test surface
// for SVG attribute-driven assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { NatalChartWheel } = await import('../public/src/components/NatalChartWheel.js');

const WHEEL_MODEL = {
  bodies: [
    { name: 'Sun',     longitude: 353.15, signDE: 'Fische'   },
    { name: 'Moon',    longitude: 158.23, signDE: 'Jungfrau' },
    { name: 'Mercury', longitude: 340.0,  signDE: 'Fische'   },
    { name: 'Neptune', longitude: 278.6,  signDE: 'Steinbock'},
  ],
  asc: 27.71,
  mc:  280.66,
  houses: [
    { number: 1,  cuspLongitude: 27.71  },
    { number: 4,  cuspLongitude: 100.0  },
    { number: 7,  cuspLongitude: 207.71 },
    { number: 10, cuspLongitude: 280.66 },
  ],
  aspects: [
    { source: 'Sun',  target: 'Moon',    type: 'square', orb: 4.92 },
    { source: 'Moon', target: 'Neptune', type: 'trine',  orb: 0.42 },
  ],
};

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

test('NatalChartWheel: renders svg with data-lane="west"', () => {
  cap.reset();
  const el = NatalChartWheel({ wheel: WHEEL_MODEL });
  assert.equal(el.tag, 'svg');
  assert.equal(el._attrs['data-lane'], 'west');
  assert.match(el._attrs.viewBox ?? '', /^-?\d+\s+-?\d+\s+\d+\s+\d+$/);
});

test('NatalChartWheel: bodies rendered with data-body=<English name>', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-body="Sun"'),  'Sun marker missing');
  assert.ok(s.includes('data-body="Moon"'), 'Moon marker missing');
});

test('NatalChartWheel: ASC + MC markers present', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-marker="asc"'), 'ASC marker missing');
  assert.ok(s.includes('data-marker="mc"'),  'MC marker missing');
});

test('NatalChartWheel: graceful fallback when houses missing', () => {
  cap.reset();
  const noHouses = { ...WHEEL_MODEL, houses: [] };
  let root;
  assert.doesNotThrow(() => { root = NatalChartWheel({ wheel: noHouses }); });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-body="Sun"'),
    'sign-ring + bodies still render when houses absent');
});

test('NatalChartWheel: passes noFakeDataGuard', async () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL });
  const s = serializeFakeTree(root);
  const { noFakeDataGuard } = await import('../public/src/api/client.js');
  assert.doesNotThrow(() => noFakeDataGuard(s, 'NatalChartWheel'));
});

test('NatalChartWheel: aspect-line emitted with data-aspect=type for major aspects', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-aspect="square"') || s.includes('data-aspect="trine"'),
    'at least one major aspect must render as a line');
});

test('NatalChartWheel: renders sign labels for all 12 zodiac signs', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL });
  const s = serializeFakeTree(root);
  for (const sign of ['Widder','Stier','Zwillinge','Krebs','Löwe','Jungfrau',
                      'Waage','Skorpion','Schütze','Steinbock','Wassermann','Fische']) {
    assert.ok(s.includes(sign), `sign label "${sign}" missing`);
  }
});

test('NatalChartWheel: tolerates entirely empty wheel-model (post-empty-profile flow)', () => {
  cap.reset();
  let root;
  assert.doesNotThrow(() => {
    root = NatalChartWheel({ wheel: { bodies: [], asc: null, mc: null, houses: [], aspects: [] } });
  });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('Widder'), 'sign ring is the static fallback');
});

// ── Pro-Wheel RED tests (fail before TASK-006 impl) ──────────────────────────

const WHEEL_MODEL_V2 = {
  bodies: [
    { key: 'Sun',     name: 'Sun',     longitude: 353.15, glyph: '☉', signGlyph: '♓', signDE: 'Fische',    labelDE: 'Sonne' },
    { key: 'Moon',    name: 'Moon',    longitude: 158.23, glyph: '☽', signGlyph: '♍', signDE: 'Jungfrau',  labelDE: 'Mond',    degreeDisplay: "8°14'" },
    { key: 'Neptune', name: 'Neptune', longitude: 278.60, glyph: '♆', signGlyph: '♑', signDE: 'Steinbock', labelDE: 'Neptun' },
  ],
  asc: 27.71, mc: 280.66,
  angles: { asc: 27.71, dsc: 207.71, mc: 280.66, ic: 100.66 },
  houses: [
    { number: 1, cuspLongitude: 27.71 },
    { number: 4, cuspLongitude: 100.0 },
    { number: 7, cuspLongitude: 207.71 },
    { number: 10, cuspLongitude: 280.66 },
  ],
  aspects: [
    { sourceKey: 'Sun',  targetKey: 'Moon',    source: 'Sun',  target: 'Moon',    type: 'square', tone: 'hard', orb: 4.92 },
    { sourceKey: 'Moon', targetKey: 'Neptune', source: 'Moon', target: 'Neptune', type: 'trine',  tone: 'soft', orb: 0.42 },
  ],
};

test('NatalChartWheel Pro: body emits data-body-glyph attribute', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL_V2 });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-body-glyph="☽"'),
    'Moon must render with data-body-glyph="☽"');
});

test('NatalChartWheel Pro: aspect line carries tone class natal-aspect--hard/soft', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL_V2 });
  const s = serializeFakeTree(root);
  assert.ok(
    s.includes('natal-aspect--hard') || s.includes('natal-aspect--soft'),
    'at least one aspect must carry a tone class'
  );
});

test('NatalChartWheel Pro: DSC and IC markers when angles.dsc/ic provided', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL_V2 });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-marker="dsc"'), 'DSC marker must be present');
  assert.ok(s.includes('data-marker="ic"'),  'IC marker must be present');
});

// ── I3 RED tests — ASC-left, ticks, glyphs, collision ───────────────────────

test('longitudeToChartAngle: ASC longitude maps to 180° (9 o\'clock / left)', async () => {
  const { longitudeToChartAngle } = await import('../public/src/components/NatalChartWheel.js');
  assert.equal(Math.round(longitudeToChartAngle(27.71, 27.71)), 180);
  assert.equal(Math.round(longitudeToChartAngle(207.71, 27.71)) % 360, 0);
  assert.equal(Math.round(longitudeToChartAngle(117.71, 27.71)) % 360, 270);
});

test('NatalChartWheel: ASC marker carries data-angle="ASC" and data-angle-position="left"', () => {
  cap.reset();
  const wheel = {
    bodies: [], asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  assert.ok(s.includes('data-angle="ASC"'), 'ASC marker must carry data-angle="ASC"');
  assert.ok(s.includes('data-angle-position="left"'), 'ASC must be tagged as left-positioned');
});

test('NatalChartWheel: emits 360 minor ticks, 72 medium ticks, 36 major ticks', () => {
  cap.reset();
  const wheel = {
    bodies: [], asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  const minorCount  = (s.match(/data-tick="minor"/g)  || []).length;
  const mediumCount = (s.match(/data-tick="medium"/g) || []).length;
  const majorCount  = (s.match(/data-tick="major"/g)  || []).length;
  assert.equal(minorCount,  360, `expected 360 minor ticks, got ${minorCount}`);
  assert.equal(mediumCount,  72, `expected 72 medium ticks, got ${mediumCount}`);
  assert.equal(majorCount,   36, `expected 36 major ticks, got ${majorCount}`);
});

test('NatalChartWheel: body with source="missing" emits no dot but present in audit', () => {
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
  assert.ok(!s.includes('data-body="Pluto"'), 'Pluto must NOT render — longitude missing');
});

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

test('NatalChartWheel: collision — bodies within 6° get different lane offsets', () => {
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
    'offset body must emit a leader-line to its true position');
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
  assert.ok(s.includes('data-lane-offset="0"'), 'lone body must be on lane 0');
  assert.ok(!s.includes('data-leader-line="true"'), 'lone body must NOT emit a leader-line');
});

// ── OV-I3-T06 RED tests — wheel geometry + provenance ───────────────────────

test('OV-I3: missing longitude is never rendered as 0deg', () => {
  cap.reset();
  const wheel = {
    bodies: [
      { key: 'Sun',  name: 'Sun',  longitude: null,    glyph: '☉', source: 'missing' },
      { key: 'Moon', name: 'Moon', longitude: 158.23,  glyph: '☽', source: 'api'     },
    ],
    asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  // The Sun must NOT appear as a positioned body marker.
  assert.ok(!/data-body-key="Sun"[^>\n]*data-pos=/.test(s),
    'Sun (source=missing) must NOT emit a positioned body marker');
  // Moon must still render.
  assert.ok(s.includes('data-body-key="Moon"'),
    'Moon (source=api) must emit a positioned body marker');
});

test('OV-I3: every body in audit list carries source pill', () => {
  cap.reset();
  const wheel = {
    bodies: [
      { key: 'Sun',  name: 'Sun',  longitude: 12.0,  glyph: '☉', source: 'api'     },
      { key: 'Moon', name: 'Moon', longitude: null,  glyph: '☽', source: 'missing' },
    ],
    asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  // Audit list inside the wheel SVG carries data-audit-source per row.
  assert.ok(/data-audit-source="(api|derived|missing)"/.test(s),
    'audit rows must carry data-audit-source');
});

test('OV-I3: rotation root emits data-asc-rotation="-{asc}" with asc=27.71', () => {
  cap.reset();
  const wheel = {
    bodies: [], asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  assert.match(s, /data-asc-rotation="-27\.71"/,
    'rotation root must carry data-asc-rotation as the negative ASC offset');
});

test('OV-I3: DSC and IC derived consistently from ASC and MC (asc=27.71, mc=280.66)', () => {
  cap.reset();
  const wheel = {
    bodies: [], asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  assert.match(s, /data-angle-dsc="207\.71"/, 'DSC = (asc+180) mod 360 = 207.71');
  assert.match(s, /data-angle-ic="100\.66"/,  'IC  = (mc +180) mod 360 = 100.66');
});

// ── OV-I3-T08 RED tests — color semantics ───────────────────────────────────

test('OV-I3: zodiac sectors carry element classes (fire/earth/air/water)', () => {
  cap.reset();
  const wheel = {
    bodies: [], asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  for (const klass of ['bz-sector--fire', 'bz-sector--earth', 'bz-sector--air', 'bz-sector--water']) {
    assert.match(s, new RegExp(klass), `missing sector element class ${klass}`);
  }
});

test('OV-I3: aspect tones carry hard/soft/neutral classes', () => {
  cap.reset();
  const wheel = {
    bodies: [
      { key: 'A', name: 'A', longitude:   0, glyph: '○', source: 'api' },
      { key: 'B', name: 'B', longitude:  60, glyph: '○', source: 'api' },
      { key: 'C', name: 'C', longitude: 120, glyph: '○', source: 'api' },
      { key: 'D', name: 'D', longitude: 180, glyph: '○', source: 'api' },
    ],
    asc: 0, mc: 90,
    angles: { asc: 0, mc: 90, source: 'api' },
    houses: [],
    aspects: [
      { sourceKey: 'A', targetKey: 'B', source: 'A', target: 'B', type: 'square',      tone: 'hard'    },
      { sourceKey: 'A', targetKey: 'C', source: 'A', target: 'C', type: 'trine',       tone: 'soft'    },
      { sourceKey: 'A', targetKey: 'D', source: 'A', target: 'D', type: 'conjunction', tone: 'neutral' },
    ],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  for (const t of ['hard', 'soft', 'neutral']) {
    assert.match(s, new RegExp(`bz-aspect--${t}`), `missing aspect tone class bz-aspect--${t}`);
  }
});

// ── OV-I3-T07 RED tests — three SVG layers ──────────────────────────────────

test('OV-I3: wheel has four named SVG layers in order', () => {
  cap.reset();
  const wheel = {
    bodies: [{ key: 'Sun', name: 'Sun', longitude: 12.0, glyph: '☉', source: 'api' }],
    asc: 27.71, mc: 280.66,
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [], aspects: [],
  };
  const root = NatalChartWheel({ wheel });
  const s = serializeFakeTree(root);
  for (const layer of ['zodiac-ring', 'houses-axes', 'bodies-aspects', 'labels']) {
    assert.match(s, new RegExp(`data-layer="${layer}"`), `layer ${layer} missing`);
  }
  // Order check: zodiac-ring before houses-axes before bodies-aspects before labels.
  const idxZodiac = s.indexOf('data-layer="zodiac-ring"');
  const idxHouses = s.indexOf('data-layer="houses-axes"');
  const idxBodies = s.indexOf('data-layer="bodies-aspects"');
  const idxLabels = s.indexOf('data-layer="labels"');
  assert.ok(idxZodiac < idxHouses, 'zodiac-ring must precede houses-axes');
  assert.ok(idxHouses < idxBodies, 'houses-axes must precede bodies-aspects');
  assert.ok(idxBodies < idxLabels, 'bodies-aspects must precede labels');
});
