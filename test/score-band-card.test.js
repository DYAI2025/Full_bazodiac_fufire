import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreBandModel } from '../public/src/components/ScoreBandCard.js';

test('scoreBandModel maps 0..100 to four bands with non-empty meaning/strength/risk', () => {
  for (const { score, band } of [
    { score: 25, band: 'low' },
    { score: 55, band: 'medium' },
    { score: 80, band: 'high' },
    { score: 95, band: 'very-high' },
  ]) {
    const m = scoreBandModel({ score });
    assert.equal(m.band, band, `score ${score} expected band ${band}`);
    assert.ok(m.bandLabel,    `bandLabel missing for ${band}`);
    assert.ok(m.meaning.length > 10, `meaning too short for ${band}`);
    assert.ok(m.strength.length > 5, `strength missing for ${band}`);
    assert.ok(m.risk.length > 5,     `risk missing for ${band}`);
  }
});

test('scoreBandModel: null score → unknown band, no false confidence', () => {
  const m = scoreBandModel({ score: null });
  assert.equal(m.band, 'unknown');
  assert.match(m.meaning, /verfügbar|fehlt/i);
});

test('scoreBandModel: high band copy emphasises "hoch ≠ besser"', () => {
  const m = scoreBandModel({ score: 87 });
  const blob = `${m.meaning} ${m.risk}`;
  assert.ok(/blind|Echo|Selbstverstärk/i.test(blob), 'high-band must surface blindspot/echo risk');
});

test('scoreBandModel: clamps score to integer for display', () => {
  const m = scoreBandModel({ score: 62.7 });
  assert.equal(m.score, 63);
});
