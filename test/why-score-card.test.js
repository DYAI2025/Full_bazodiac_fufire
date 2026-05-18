import test from 'node:test';
import assert from 'node:assert/strict';
import { whyScoreCardModel } from '../public/src/components/WhyScoreCard.js';

test('whyScoreCardModel keeps label, score, raises, lowers, caveat', () => {
  const m = whyScoreCardModel({
    label: 'Fusion-Kohärenz',
    score: 62,
    scoreLabel: 'Kohärenz-Index',
    meaning: 'mittlere Deckung…',
    raises: ['Erde/Wasser-Achse'],
    lowers: ['Metall-Unterrepräsentation'],
    action: 'Heute klar benennen.',
    caveat: 'Kein Persönlichkeitsanteil.',
  });
  assert.equal(m.score, 62);
  assert.equal(m.raises[0], 'Erde/Wasser-Achse');
  assert.equal(m.caveat, 'Kein Persönlichkeitsanteil.');
});

test('whyScoreCardModel clamps score to 0..100', () => {
  assert.equal(whyScoreCardModel({ score: 150 }).score, 100);
  assert.equal(whyScoreCardModel({ score: -10 }).score, 0);
});
