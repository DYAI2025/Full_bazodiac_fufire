import test from 'node:test';
import assert from 'node:assert/strict';
import { getRelationshipScoreBand, RELATIONSHIP_BANDS } from '../public/src/domain/relationshipScoreBands.js';

test('getRelationshipScoreBand: maps 0..100 to four bands per plan §17', () => {
  const cases = [
    { score: 0,   band: 'low' },
    { score: 39,  band: 'low' },
    { score: 40,  band: 'mixed' },
    { score: 59,  band: 'mixed' },
    { score: 60,  band: 'strong' },
    { score: 68,  band: 'strong' },
    { score: 79,  band: 'strong' },
    { score: 80,  band: 'high' },
    { score: 100, band: 'high' },
  ];
  for (const { score, band } of cases) {
    assert.equal(getRelationshipScoreBand(score).band, band, `score ${score} expected band ${band}`);
  }
});

test('getRelationshipScoreBand: unknown for null/undefined/NaN', () => {
  assert.equal(getRelationshipScoreBand(null).band,       'unknown');
  assert.equal(getRelationshipScoreBand(undefined).band,  'unknown');
  assert.equal(getRelationshipScoreBand(Number.NaN).band, 'unknown');
});

test('getRelationshipScoreBand: each band has label, meaning, strength, risk, caveat', () => {
  for (const band of ['low', 'mixed', 'strong', 'high', 'unknown']) {
    const cfg = RELATIONSHIP_BANDS[band];
    assert.ok(cfg.label,    `${band} missing label`);
    assert.ok(cfg.meaning,  `${band} missing meaning`);
    assert.ok(cfg.strength, `${band} missing strength`);
    assert.ok(cfg.risk,     `${band} missing risk`);
  }
});

test('getRelationshipScoreBand: score 68 → strong band with "Lernfeld" label', () => {
  const b = getRelationshipScoreBand(68);
  assert.equal(b.band, 'strong');
  assert.match(b.label, /starke Resonanz mit Lernfeld/);
});

test('getRelationshipScoreBand: includes a generic caveat that is not a match guarantee', () => {
  const b = getRelationshipScoreBand(85);
  assert.match(b.caveat, /Index|kein.*Urteil|kein.*Garantie|kein.*Match/i);
});

test('getRelationshipScoreBand: clamps score to integer for display', () => {
  assert.equal(getRelationshipScoreBand(62.7).score, 63);
});
