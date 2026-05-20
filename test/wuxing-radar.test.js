// Sprint H3 — pentagonal radar pure-function tests + component smoke.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();

const {
  buildRadarSVG,
  cycleRelation,
  normalizeDistribution,
  SHENG_PARENT,
  KE_PARENT,
  ELEMENT_ORDER,
} = await import('../public/src/domain/wuxingRadar.js');

const { WuxingRadar } = await import('../public/src/components/WuxingRadar.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const lina = JSON.parse(readFileSync(
  join(__dirname, '_fixtures', 'upstream-snapshots', 'profile.real.json'), 'utf8'
));

// ── buildRadarSVG ─────────────────────────────────────────────────────────

test('buildRadarSVG: returns SVG with 5 wheel-node groups', () => {
  const dist = { Holz: 0.31, Feuer: 0.22, Erde: 0.13, Metall: 0.07, Wasser: 0.27 };
  const svg = buildRadarSVG(dist);
  for (const el of ELEMENT_ORDER) {
    assert.match(svg, new RegExp(`data-element="${el}"`), `missing node for ${el}`);
  }
  const nodeCount = (svg.match(/data-element=/g) || []).length;
  assert.equal(nodeCount, 5);
});

test('buildRadarSVG: declares Sheng + Ke arrow markers', () => {
  const svg = buildRadarSVG({ Holz: 0.2, Feuer: 0.2, Erde: 0.2, Metall: 0.2, Wasser: 0.2 });
  assert.match(svg, /marker id="arrow-sheng"/);
  assert.match(svg, /marker id="arrow-ke"/);
  // 5 sheng arrows around pentagon + 5 ke arrows across star = 10 paths.
  const arrowCount = (svg.match(/class="wheel-arrow/g) || []).length;
  assert.equal(arrowCount, 10);
});

test('buildRadarSVG: percentage labels reflect distribution values', () => {
  const svg = buildRadarSVG({ Holz: 0.31, Feuer: 0.22, Erde: 0.13, Metall: 0.07, Wasser: 0.27 });
  // Each node renders its intensity as Math.round(value * 100)
  for (const pct of [31, 22, 13, 7, 27]) {
    assert.match(svg, new RegExp(`>${pct}</text>`), `missing label ${pct}`);
  }
});

test('buildRadarSVG: empty / null distribution renders all 5 nodes at minimum radius (no crash)', () => {
  const svg = buildRadarSVG(null);
  for (const el of ELEMENT_ORDER) {
    assert.match(svg, new RegExp(`data-element="${el}"`));
  }
  // All percentages should be 0
  const zeros = (svg.match(/>0</g) || []).length;
  assert.ok(zeros >= 5, `expected ≥5 "0" labels when distribution is null, got ${zeros}`);
});

test('buildRadarSVG: respects size option (viewBox + nodeR scale)', () => {
  const small = buildRadarSVG({ Holz: 0.5 }, { size: 200 });
  const large = buildRadarSVG({ Holz: 0.5 }, { size: 600 });
  assert.match(small, /viewBox="0 0 200 200"/);
  assert.match(large, /viewBox="0 0 600 600"/);
});

// ── normalizeDistribution ────────────────────────────────────────────────

test('normalizeDistribution: accepts object form {Holz: 0.31, ...}', () => {
  const out = normalizeDistribution({ Holz: 0.31, Feuer: 0.22, Erde: 0.13, Metall: 0.07, Wasser: 0.27 });
  assert.equal(out.Holz, 0.31);
  assert.equal(out.Wasser, 0.27);
});

test('normalizeDistribution: accepts enrichWuxing array form [{label, intensity}, ...]', () => {
  const out = normalizeDistribution([
    { label: 'Holz',  intensity: 31 },
    { label: 'Feuer', intensity: 22 },
    { label: 'Erde',  intensity: 13 },
    { label: 'Metall', intensity: 7 },
    { label: 'Wasser', intensity: 27 },
  ]);
  assert.equal(out.Holz, 0.31, 'intensity 31 → 0.31');
  assert.equal(out.Metall, 0.07);
});

test('normalizeDistribution: null / undefined / empty returns 0 for every element', () => {
  for (const input of [null, undefined, {}, [], 'garbage']) {
    const out = normalizeDistribution(input);
    for (const el of ELEMENT_ORDER) {
      assert.equal(out[el], 0, `${el} must be 0 for input ${JSON.stringify(input)}`);
    }
  }
});

// ── cycleRelation ────────────────────────────────────────────────────────

test('cycleRelation: identity for same element', () => {
  for (const el of ELEMENT_ORDER) {
    assert.equal(cycleRelation(el, el).kind, 'identity');
  }
});

test('cycleRelation: SHENG parent chain produces sheng-gives / sheng-takes', () => {
  // Holz nährt Feuer
  const r = cycleRelation('Holz', 'Feuer');
  assert.equal(r.tone, 'sheng');
});

test('cycleRelation: KE chain produces ke-gives / ke-takes', () => {
  // Holz kontrolliert Erde
  const r = cycleRelation('Holz', 'Erde');
  assert.equal(r.tone, 'ke');
});

test('SHENG_PARENT + KE_PARENT cover all 5 elements with classical cycles', () => {
  for (const el of ELEMENT_ORDER) {
    assert.ok(SHENG_PARENT[el], `SHENG_PARENT missing ${el}`);
    assert.ok(KE_PARENT[el],    `KE_PARENT missing ${el}`);
  }
});

// ── WuxingRadar component ────────────────────────────────────────────────

test('WuxingRadar component returns a <section> wrapper with SVG + legend', () => {
  cap.reset();
  const dist = { Holz: 0.31, Feuer: 0.22, Erde: 0.13, Metall: 0.07, Wasser: 0.27 };
  const el = WuxingRadar(dist);
  assert.equal(el.tag, 'section');
  // _children: [svgHost, legendEl]
  assert.equal(el._children.length, 2);
  assert.ok(el._children[0]._html?.includes('wuxing-radar'), 'first child must contain the SVG');
  assert.ok(el._children[1]._html?.includes('Sheng'),         'second child must contain the legend');
});

test('WuxingRadar respects legend=false option', () => {
  cap.reset();
  const el = WuxingRadar({ Holz: 0.5 }, { legend: false });
  assert.equal(el._children.length, 1, 'legend off → only SVG host');
});

test('WuxingRadar consumes enrichWuxing array shape from Lina fixture', async () => {
  const { enrichWuxing } = await import('../public/src/domain/wuxingEnrichment.js');
  const wx = enrichWuxing(lina);
  cap.reset();
  const el = WuxingRadar(wx.distribution);
  assert.equal(el.tag, 'section');
  // SVG host innerHTML must include all 5 element labels.
  const html = el._children[0]._html;
  for (const elName of ELEMENT_ORDER) {
    assert.match(html, new RegExp(`data-element="${elName}"`));
  }
});
