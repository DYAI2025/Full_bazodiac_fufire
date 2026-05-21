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

test('NatalChartWheel: house lines match provided cusps only — no equal-house fallback', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL });
  const s = serializeFakeTree(root);
  // WHEEL_MODEL provides exactly 4 cusps (houses 1,4,7,10).
  // If the wheel falls back to equal-house it would produce 12 lines.
  const houseLineMatches = [...s.matchAll(/data-house="/g)];
  assert.equal(houseLineMatches.length, 4,
    `Expected 4 house lines (one per provided cusp), got ${houseLineMatches.length}`);
});
