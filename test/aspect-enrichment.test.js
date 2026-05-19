// Unit tests for public/src/domain/aspectEnrichment.js
// Strategy: 3-persona-fixture coverage + edge cases.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  enrichAspect,
  selectSalientAspects,
  enrichWesternAspects,
} from '../public/src/domain/aspectEnrichment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'));
}

const lina     = loadFixture('profile.real.json');
const persona2 = loadFixture('profile.persona2.json');
const persona3 = loadFixture('profile.persona3.json');

// ── enrichAspect ────────────────────────────────────────────────────────────

test('enrichAspect: Lina Moon-trine-Neptune produces full DE-labeled VM', () => {
  const raw = lina.western.aspects.find((a) => a.planet1 === 'Moon' && a.planet2 === 'Neptune');
  const out = enrichAspect(raw);
  assert.equal(out.planet1, 'Moon');
  assert.equal(out.planet1DE, 'Mond');
  assert.equal(out.planet2, 'Neptune');
  assert.equal(out.planet2DE, 'Neptun');
  assert.equal(out.type, 'trine');
  assert.equal(out.typeDE, 'Trigon');
  assert.equal(out.label, 'Mond Trigon Neptun');
  assert.equal(out.orb, 0.42);
  assert.equal(out.angle, 119.58);
  assert.equal(out.exactAngle, 120);
  // Salience flags: neither planet is Sun/Moon/Asc → involvesLuminary should be true (Moon)
  assert.equal(out.involvesLuminary, true);
});

test('enrichAspect: aspect type "semi-sextile" + "quincunx" translate correctly', () => {
  const semiSextile = enrichAspect({ planet1: 'Mercury', planet2: 'Jupiter', type: 'semi-sextile', orb: 2.7, angle: 32.7, exact_angle: 30 });
  assert.equal(semiSextile.typeDE, 'Halbsextil');
  const quincunx = enrichAspect({ planet1: 'Sun', planet2: 'Uranus', type: 'quincunx', orb: 0.89, angle: 149.11, exact_angle: 150 });
  assert.equal(quincunx.typeDE, 'Quincunx');
});

test('enrichAspect: involvesLuminary detects Sun OR Moon involvement', () => {
  const sunAspect  = enrichAspect({ planet1: 'Sun',  planet2: 'Saturn', type: 'square', orb: 2.23, angle: 92.23, exact_angle: 90 });
  const moonAspect = enrichAspect({ planet1: 'Moon', planet2: 'Pluto',  type: 'sextile', orb: 1.48, angle: 61.48, exact_angle: 60 });
  const noLumin    = enrichAspect({ planet1: 'Mars', planet2: 'Venus',  type: 'square', orb: 1.98, angle: 91.98, exact_angle: 90 });
  assert.equal(sunAspect.involvesLuminary,  true);
  assert.equal(moonAspect.involvesLuminary, true);
  assert.equal(noLumin.involvesLuminary,    false);
});

test('enrichAspect: unknown aspect type falls back to raw type, no fabricated label', () => {
  const out = enrichAspect({ planet1: 'Sun', planet2: 'Moon', type: 'novile', orb: 1.0, angle: 40, exact_angle: 40 });
  assert.equal(out.typeDE, 'novile'); // falls back to EN when DE missing
  assert.equal(out.label, 'Sonne novile Mond');
});

test('enrichAspect: unknown planet name falls back to EN key (no crash)', () => {
  const out = enrichAspect({ planet1: 'Lina', planet2: 'Moon', type: 'trine', orb: 1.0, angle: 120, exact_angle: 120 });
  assert.equal(out.planet1DE, 'Lina'); // fallback to raw key
  assert.equal(out.planet2DE, 'Mond');
});

test('enrichAspect: null/undefined input returns null', () => {
  assert.equal(enrichAspect(null), null);
  assert.equal(enrichAspect(undefined), null);
});

// ── selectSalientAspects ────────────────────────────────────────────────────

test('selectSalientAspects: returns N tightest aspects, prioritizing luminary involvement', () => {
  const top3 = selectSalientAspects(lina.western.aspects, 3);
  assert.equal(top3.length, 3);
  // All top-N must involve a luminary when at least N luminary-aspects exist (Lina has many)
  for (const a of top3) {
    assert.equal(a.involvesLuminary, true, `non-luminary aspect ${a.label} crept into top 3`);
  }
});

test('selectSalientAspects: returns ALL aspects unchanged when N >= aspects.length', () => {
  const aspects = lina.western.aspects;
  const all = selectSalientAspects(aspects, 99);
  assert.equal(all.length, aspects.length);
});

test('selectSalientAspects: respects orb tightness within the luminary group (Persona2 Sun-conj-Venus orb 0.21 must rank first)', () => {
  const top1 = selectSalientAspects(persona2.western.aspects, 1);
  const sunVenus = persona2.western.aspects.find((a) => a.planet1 === 'Sun' && a.planet2 === 'Venus');
  assert.equal(top1[0].planet1, sunVenus.planet1);
  assert.equal(top1[0].planet2, sunVenus.planet2);
});

test('selectSalientAspects: returns [] for empty / null / undefined input', () => {
  assert.deepEqual(selectSalientAspects([], 3), []);
  assert.deepEqual(selectSalientAspects(null, 3), []);
  assert.deepEqual(selectSalientAspects(undefined, 3), []);
});

test('selectSalientAspects: defaults N to 3 when omitted', () => {
  const top = selectSalientAspects(lina.western.aspects);
  assert.equal(top.length, 3);
});

// ── enrichWesternAspects ────────────────────────────────────────────────────

test('enrichWesternAspects: all three personas produce design-shape VM passing noFakeDataGuard', async () => {
  const { noFakeDataGuard } = await import('../public/src/api/client.js');
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const out = enrichWesternAspects(profile.western, 3);
    assert.equal(out.length, 3, `${name}: expected 3 salient aspects`);
    for (const a of out) {
      assert.ok(a.label,  `${name}: missing label`);
      assert.ok(a.typeDE, `${name}: missing typeDE`);
      assert.ok(typeof a.orb === 'number', `${name}: missing orb`);
    }
    assert.doesNotThrow(() => noFakeDataGuard(out, `aspect-enrichment:${name}`));
  }
});

test('enrichWesternAspects: null/empty western section returns []', () => {
  assert.deepEqual(enrichWesternAspects(null, 3), []);
  assert.deepEqual(enrichWesternAspects({ aspects: [] }, 3), []);
  assert.deepEqual(enrichWesternAspects({ aspects: null }, 3), []);
});

test('enrichWesternAspects: default N=3', () => {
  const out = enrichWesternAspects(lina.western);
  assert.equal(out.length, 3);
});
