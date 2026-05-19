// Unit tests for public/src/domain/westernBodyEnrichment.js
//
// Coverage strategy: every assertion runs against the 3 captured personas
// (Lina, Persona2, Persona3) to catch persona-specific shape assumptions.
// Edge cases (degree formatting at boundaries, Placidus inverse-lookup
// across the 0°/360° wrap, retrograde-flag carry-through, missing fields)
// are explicit tests below.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  formatDegMinutes,
  computeBodyHouse,
  enrichBody,
  enrichWesternBodies,
} from '../public/src/domain/westernBodyEnrichment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'));
}

const lina     = loadFixture('profile.real.json');
const persona2 = loadFixture('profile.persona2.json');
const persona3 = loadFixture('profile.persona3.json');

// ── formatDegMinutes ────────────────────────────────────────────────────────

test('formatDegMinutes: integer degree renders as "X°00\'"', () => {
  assert.equal(formatDegMinutes(5), "5°00'");
  assert.equal(formatDegMinutes(0), "0°00'");
});

test('formatDegMinutes: 23.152453... renders as "23°09\'" (Lina Sun degree-in-sign)', () => {
  // .152 * 60 = 9.12 -> floor = 9
  assert.equal(formatDegMinutes(23.152453874192247), "23°09'");
});

test('formatDegMinutes: 29.99 renders as "29°59\'" (boundary just below 30°)', () => {
  assert.equal(formatDegMinutes(29.99), "29°59'");
});

test('formatDegMinutes: 28.220 renders as "28°13\'" (Persona2 Sun)', () => {
  // 0.220 * 60 = 13.2 -> floor 13
  assert.equal(formatDegMinutes(28.220094880922943), "28°13'");
});

test('formatDegMinutes: null/undefined/NaN returns null (no fake-data)', () => {
  assert.equal(formatDegMinutes(null), null);
  assert.equal(formatDegMinutes(undefined), null);
  assert.equal(formatDegMinutes(NaN), null);
});

test('formatDegMinutes: Infinity / -Infinity returns null (no garbage string)', () => {
  // Defensive — upstream `degree_in_sign` is 0..30 by API contract, but if
  // upstream ever returns Infinity (e.g. division-by-zero bug) the result
  // must NOT be the string "Infinity°NaN'" which would leak into rendered DOM.
  assert.equal(formatDegMinutes(Infinity), null);
  assert.equal(formatDegMinutes(-Infinity), null);
});

// ── computeBodyHouse ────────────────────────────────────────────────────────

test('computeBodyHouse: Lina Sun longitude 353.15 falls in house 12 (cusp12=328.93, cusp1=27.71)', () => {
  const cusps = lina.western.houses;
  assert.equal(computeBodyHouse(lina.western.bodies.Sun.longitude, cusps), 12);
});

test('computeBodyHouse: Persona2 Sun longitude 148.22 falls in house 2 (cusp2=146.91, cusp3=173.09)', () => {
  const cusps = persona2.western.houses;
  assert.equal(computeBodyHouse(persona2.western.bodies.Sun.longitude, cusps), 2);
});

test('computeBodyHouse: Persona3 Sun longitude 224.30 falls in proper house (not null)', () => {
  const cusps = persona3.western.houses;
  const sun = persona3.western.bodies.Sun.longitude;
  const result = computeBodyHouse(sun, cusps);
  assert.ok(result >= 1 && result <= 12, `house must be 1..12, got ${result}`);
});

test('computeBodyHouse: body exactly on cusp belongs to that house (lower-bound inclusive)', () => {
  const cusps = lina.western.houses;
  const cusp7 = cusps[7].longitude;
  assert.equal(computeBodyHouse(cusp7, cusps), 7);
});

test('computeBodyHouse: 0°/360° wrap-around — longitude 5° with cusp12=350 and cusp1=10 lands in house 12', () => {
  const cusps = { 1: { longitude: 10 }, 2: { longitude: 40 }, 3: { longitude: 70 }, 4: { longitude: 100 },
                  5: { longitude: 130 }, 6: { longitude: 160 }, 7: { longitude: 190 }, 8: { longitude: 220 },
                  9: { longitude: 250 }, 10: { longitude: 280 }, 11: { longitude: 310 }, 12: { longitude: 340 } };
  assert.equal(computeBodyHouse(5, cusps), 12);
  assert.equal(computeBodyHouse(350, cusps), 12);
  assert.equal(computeBodyHouse(9.999, cusps), 12);
  assert.equal(computeBodyHouse(10, cusps), 1);
});

test('computeBodyHouse: missing or malformed cusps returns null instead of throwing', () => {
  assert.equal(computeBodyHouse(120, null), null);
  assert.equal(computeBodyHouse(120, {}), null);
  assert.equal(computeBodyHouse(120, { 1: {} }), null);
  assert.equal(computeBodyHouse(null, lina.western.houses), null);
});

// ── enrichBody ──────────────────────────────────────────────────────────────

test('enrichBody: Lina Sun produces full design-shape VM with API-derived facts only', () => {
  const raw = lina.western.bodies.Sun;
  const enriched = enrichBody('Sun', raw, lina.western.houses);

  assert.equal(enriched.key, 'Sun');
  assert.equal(enriched.name, 'Sonne ☉');
  assert.equal(enriched.sign, 'Pisces');
  assert.equal(enriched.signDE, 'Fische');
  assert.equal(enriched.glyph, '♓');
  assert.equal(enriched.element, 'Wasser');
  assert.equal(enriched.degDecimal, 23.152453874192247);
  assert.equal(enriched.degDisplay, "23°09'");
  assert.equal(enriched.house, 12);
  assert.equal(enriched.retrograde, false);
  // Narrative slots populated from WESTERN_SIGN_MEANINGS[Pisces]
  assert.ok(enriched.mode);
  assert.ok(enriched.resource);
  assert.ok(enriched.shadow);
  assert.ok(enriched.practice);
});

test('enrichBody: retrograde flag survives through enrichment (Persona3 has retrograde bodies)', () => {
  const pluto = persona3.western.bodies.Pluto;
  const enriched = enrichBody('Pluto', pluto, persona3.western.houses);
  assert.equal(enriched.retrograde, pluto.retrograde);
});

test('enrichBody: missing sign yields null narrative without crashing', () => {
  const enriched = enrichBody('Mystery', { longitude: 100, sign: 'NotARealSign', degree_in_sign: 10 }, {});
  assert.equal(enriched.sign, 'NotARealSign');
  assert.equal(enriched.signDE, 'NotARealSign'); // fallback to EN when no DE mapping
  assert.equal(enriched.glyph, null);
  assert.equal(enriched.element, null);
  assert.equal(enriched.mode, null);
});

test('enrichBody: null raw input returns null', () => {
  assert.equal(enrichBody('Sun', null, {}), null);
  assert.equal(enrichBody('Sun', undefined, {}), null);
});

// ── enrichWesternBodies ─────────────────────────────────────────────────────

test('enrichWesternBodies: Lina profile produces enriched VM for all 14 bodies', () => {
  const out = enrichWesternBodies(lina.western);
  const expected = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','Lilith','NorthNode','TrueNorthNode'];
  for (const k of expected) {
    assert.ok(out[k], `missing body ${k}`);
    assert.ok(out[k].house >= 1 && out[k].house <= 12, `body ${k}.house must be 1..12, got ${out[k].house}`);
  }
});

test('enrichWesternBodies: all three personas produce only API-derived signs (no demo strings)', () => {
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const out = enrichWesternBodies(profile.western);
    for (const [body, vm] of Object.entries(out)) {
      assert.ok(vm.sign, `${name}/${body} missing sign`);
      assert.ok(vm.signDE, `${name}/${body} missing signDE`);
      assert.ok(typeof vm.degDecimal === 'number', `${name}/${body} missing degDecimal`);
    }
  }
});

test('enrichWesternBodies: null/empty western section returns empty object', () => {
  assert.deepEqual(enrichWesternBodies(null), {});
  assert.deepEqual(enrichWesternBodies({ bodies: {} }), {});
});

test('enrichWesternBodies: passes noFakeDataGuard on rendered aggregate strings (all 3 personas)', async () => {
  const { noFakeDataGuard } = await import('../public/src/api/client.js');
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const out = enrichWesternBodies(profile.western);
    assert.doesNotThrow(
      () => noFakeDataGuard(out, `western-enrichment:${name}`),
      `noFakeDataGuard tripped for ${name}`,
    );
  }
});
