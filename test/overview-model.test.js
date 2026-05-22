// Task 1 — profileToOverviewModel aggregator (Sprint I).
//
// Single Source-of-Truth that wraps the existing modular enrichers
// (westernBodyEnrichment, aspectEnrichment, wuxingEnrichment) into the
// shape that /overview binds to. Adds a normalized chartWheel section
// so NatalChartWheel doesn't have to know about raw API field names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture(name) {
  return JSON.parse(readFileSync(
    join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'
  ));
}
const lina = loadFixture('profile.real.json');

const { profileToOverviewModel } = await import('../public/src/domain/overviewModel.js');

test('overviewModel: produces all top-level sections', () => {
  const m = profileToOverviewModel(lina);
  for (const key of ['identity', 'topFacts', 'chartWheel', 'baziPillars',
                     'westernFactors', 'fusionSummary', 'elementEconomy',
                     'nextDoors', 'methodMeta', 'warnings']) {
    assert.ok(key in m, `missing section ${key}`);
  }
});

test('overviewModel.chartWheel: normalized bodies array carries name + longitude + signDE', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  assert.ok(Array.isArray(chartWheel.bodies), 'bodies must be array');
  assert.ok(chartWheel.bodies.length >= 7,
    `at least 7 luminaries/planets, got ${chartWheel.bodies.length}`);
  const sun = chartWheel.bodies.find((b) => b.name === 'Sun');
  assert.ok(sun, 'Sun must be present by English key');
  assert.equal(typeof sun.longitude, 'number');
  assert.equal(sun.signDE, 'Fische');
});

test('overviewModel.chartWheel: asc + mc are numeric longitudes', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  assert.equal(typeof chartWheel.asc, 'number');
  assert.equal(typeof chartWheel.mc,  'number');
  assert.ok(chartWheel.asc >= 0 && chartWheel.asc < 360, 'asc in [0,360)');
  assert.ok(chartWheel.mc  >= 0 && chartWheel.mc  < 360, 'mc in [0,360)');
});

test('overviewModel.chartWheel.houses: array of {number, cuspLongitude}', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  assert.ok(Array.isArray(chartWheel.houses));
  assert.equal(chartWheel.houses.length, 12, '12 cusps expected');
  const h1 = chartWheel.houses.find((h) => h.number === 1);
  assert.ok(h1, 'house 1 must be present');
  assert.equal(typeof h1.cuspLongitude, 'number');
});

test('overviewModel.chartWheel.aspects: normalized {source, target, type, orb}', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  assert.ok(Array.isArray(chartWheel.aspects));
  if (chartWheel.aspects.length > 0) {
    const a = chartWheel.aspects[0];
    assert.equal(typeof a.source, 'string');
    assert.equal(typeof a.target, 'string');
    assert.equal(typeof a.type,   'string');
  }
});

test('overviewModel.topFacts: dayMaster + sun + coherence', () => {
  const m = profileToOverviewModel(lina);
  const labels = m.topFacts.map((f) => f.label);
  assert.ok(labels.some((l) => /Day Master|Kern/i.test(l)));
  assert.ok(labels.some((l) => /Sonne|Sun/i.test(l)));
  assert.ok(labels.some((l) => /Kohärenz|Coherence/i.test(l)));
});

test('overviewModel.warnings: present when houses missing', () => {
  const noHouses = JSON.parse(JSON.stringify(lina));
  delete noHouses.western.houses;
  const m = profileToOverviewModel(noHouses);
  assert.ok(m.warnings.some((w) => /Häuser|Haus|house/i.test(w)),
    'must warn when houses missing');
  assert.equal(m.chartWheel.houses.length, 0,
    'chartWheel.houses must be empty when API omits houses');
});

test('overviewModel: gracefully tolerates empty profile', () => {
  const m = profileToOverviewModel({});
  assert.ok('chartWheel' in m);
  // I3: all canonical bodies are always emitted (source='missing' for absent data)
  assert.ok(m.chartWheel.bodies.length >= 0, 'bodies array must exist');
  assert.equal(m.chartWheel.houses.length, 0);
  assert.equal(m.warnings.length >= 1, true, 'must warn on empty profile');
});

// ── Pro Birthchart contract (RED tests — fail before TASK-003/005 impl) ──────

test('chartWheel.bodies: key + labelDE + planet-glyph + signGlyph', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  assert.ok(chartWheel.bodies.length > 0, 'need bodies');
  const moon = chartWheel.bodies.find((b) => b.key === 'Moon');
  assert.ok(moon, 'Moon must be findable via b.key');
  assert.equal(typeof moon.labelDE, 'string', 'labelDE must be string');
  assert.ok(moon.labelDE.length > 0 && !moon.labelDE.includes('☽'),
    'labelDE must be label only (no glyph embedded)');
  assert.equal(moon.glyph, '☽',
    `moon.glyph must be planet glyph ☽, got: ${moon.glyph}`);
  assert.ok(moon.signGlyph,
    'signGlyph must be present');
  assert.match(moon.signGlyph, /^[♈♉♊♋♌♍♎♏♐♑♒♓]$/,
    `signGlyph must be zodiac glyph, got: ${moon.signGlyph}`);
});

test('chartWheel.aspects: sourceKey + targetKey + tone', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  if (chartWheel.aspects.length === 0) return;
  const a = chartWheel.aspects[0];
  assert.equal(typeof a.sourceKey, 'string', 'sourceKey must be string');
  assert.equal(typeof a.targetKey, 'string', 'targetKey must be string');
  assert.ok(['hard', 'soft', 'neutral'].includes(a.tone),
    `tone must be hard|soft|neutral, got: ${a.tone}`);
});

test('chartWheel.angles: has asc, dsc, mc, ic — dsc = asc+180', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  assert.ok(chartWheel.angles, 'chartWheel.angles must exist');
  assert.equal(typeof chartWheel.angles.asc, 'number', 'angles.asc must be number');
  assert.equal(typeof chartWheel.angles.dsc, 'number', 'angles.dsc must be number');
  assert.equal(typeof chartWheel.angles.mc,  'number', 'angles.mc must be number');
  assert.equal(typeof chartWheel.angles.ic,  'number', 'angles.ic must be number');
  const expectedDsc = (chartWheel.angles.asc + 180) % 360;
  assert.ok(Math.abs(chartWheel.angles.dsc - expectedDsc) < 0.01,
    `dsc must be asc+180 mod 360: expected ${expectedDsc}, got ${chartWheel.angles.dsc}`);
});

// ── I3 Wheel-Datenvertrag (RED → GREEN after TASK-I3-001) ────────────────────

test('chartWheel.bodies: missing longitude → source="missing", NOT longitude=0', () => {
  const profile = {
    western: {
      bodies: {
        Sun:   { sign: 'Fische', longitude: 353.15 },
        Pluto: { sign: null, longitude: null },
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

test('chartWheel.bodies: shape contract {key,labelDE,glyph,longitude,degreeDisplay,source}', () => {
  const { chartWheel } = profileToOverviewModel(lina);
  for (const b of chartWheel.bodies) {
    assert.equal(typeof b.key, 'string', `body.key missing for ${JSON.stringify(b)}`);
    assert.ok('labelDE' in b, 'body.labelDE missing');
    assert.ok('glyph' in b,   'body.glyph missing');
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
