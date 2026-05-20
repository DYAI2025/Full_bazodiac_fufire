// Sprint I — Task 4: ephemeris fixture-drift tripwire.
//
// Reference values are taken from the canonical fixtures themselves —
// the point of this suite is NOT to test the upstream ephemeris engine
// (the FuFire contract test does that against the live API), but to
// catch fixture-drift, axis-flip bugs, sign-boundary errors, or unit
// confusion (radians vs degrees) before they reach the UI.
//
// Tolerance: ±1° per body, ±2° per chart-angle. Tight enough that any
// unit/sign mistake fails immediately; loose enough that legitimate
// ephemeris-engine version bumps don't break us on rounding noise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function loadFixture(name) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return JSON.parse(readFileSync(
    join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'
  ));
}

// Wrap-aware degree-distance: 359° and 1° are 2° apart, not 358°.
function approxLongitude(actual, expected, tol, label) {
  const raw = Math.abs(actual - expected);
  const delta = Math.min(raw, 360 - raw);
  assert.ok(delta <= tol,
    `${label}: expected ${expected}° ±${tol}°, got ${actual}° (Δ=${delta.toFixed(2)}°)`);
}

// ── Lina (14.03.1987 07:42 Hannover) ────────────────────────────────────────
test('ephemeris-smoke: lina — Sun Pisces ~23.15°', () => {
  const lina = loadFixture('profile.real.json');
  approxLongitude(lina.western.bodies.Sun.longitude, 353.15, 1.0, 'lina Sun');
  assert.equal(lina.western.bodies.Sun.sign, 'Pisces', 'lina Sun must report Pisces');
});

test('ephemeris-smoke: lina — Moon Virgo ~8.23°', () => {
  const lina = loadFixture('profile.real.json');
  approxLongitude(lina.western.bodies.Moon.longitude, 158.23, 1.0, 'lina Moon');
  assert.equal(lina.western.bodies.Moon.sign, 'Virgo', 'lina Moon must report Virgo');
});

test('ephemeris-smoke: lina — ASC Aries ~27.71°', () => {
  const lina = loadFixture('profile.real.json');
  approxLongitude(lina.western.angles.Ascendant, 27.71, 2.0, 'lina ASC');
});

test('ephemeris-smoke: lina — MC Capricorn ~10.66°', () => {
  const lina = loadFixture('profile.real.json');
  approxLongitude(lina.western.angles.MC, 280.66, 2.0, 'lina MC');
});

test('ephemeris-smoke: lina — BaZi Day Master stem present', () => {
  const lina = loadFixture('profile.real.json');
  assert.ok(lina.bazi?.day_master?.stem, 'BaZi day master stem must be filled');
  assert.ok(['Wasser','Erde','Holz','Feuer','Metall'].includes(lina.bazi.day_master.element),
    `unexpected day-master element ${lina.bazi.day_master.element}`);
});

// ── Persona2 (yin Yi-Holz, Tokyo) ──────────────────────────────────────────
test('ephemeris-smoke: persona2 — fixture structurally complete', () => {
  const p = loadFixture('profile.persona2.json');
  assert.ok(p.western?.bodies?.Sun?.longitude != null,
    'persona2 Sun longitude must be present');
  assert.ok(p.western?.angles?.Ascendant != null,
    'persona2 Ascendant must be present');
  assert.ok(p.bazi?.day_master?.stem, 'persona2 BaZi day master stem must be present');
});

test('ephemeris-smoke: persona2 — Sun longitude within zodiac range', () => {
  const p = loadFixture('profile.persona2.json');
  const lon = p.western.bodies.Sun.longitude;
  assert.ok(typeof lon === 'number' && lon >= 0 && lon < 360,
    `persona2 Sun longitude out of range: ${lon}`);
});

// ── Persona3 (yin Gui-Wasser, NYC) ──────────────────────────────────────────
test('ephemeris-smoke: persona3 — fixture structurally complete', () => {
  const p = loadFixture('profile.persona3.json');
  assert.ok(p.western?.bodies?.Sun?.longitude != null);
  assert.ok(p.western?.angles?.Ascendant != null);
  assert.ok(p.bazi?.day_master?.stem);
});

test('ephemeris-smoke: persona3 — angles + body longitudes within [0,360)', () => {
  const p = loadFixture('profile.persona3.json');
  for (const name of ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn']) {
    const b = p.western.bodies?.[name];
    if (!b) continue;
    assert.ok(b.longitude >= 0 && b.longitude < 360,
      `persona3 ${name} longitude out of range: ${b.longitude}`);
  }
  assert.ok(p.western.angles.Ascendant >= 0 && p.western.angles.Ascendant < 360);
  assert.ok(p.western.angles.MC >= 0 && p.western.angles.MC < 360);
});
