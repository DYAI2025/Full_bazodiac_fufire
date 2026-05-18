import test from 'node:test';
import assert from 'node:assert/strict';
import { insightHeroModel } from '../public/src/components/InsightHero.js';

test('insightHeroModel composes eyebrow, title, statement, evidence, actions', () => {
  const m = insightHeroModel({
    eyebrow:   'Deine Fusion-Signatur',
    title:     'Tiefe Substanz mit beweglicher Kontaktenergie',
    statement: 'Krebs-Sonne, Wu-Erde und Waage-Aszendent…',
    evidence:  ['Sonne Krebs', 'Day Master Wu Erde', 'Fusion-Kohärenz 62'],
    primaryAction:   { label: 'Tagespuls ansehen',  path: '/daily' },
    secondaryAction: { label: 'In Beziehung sehen', path: '/love'  },
    tone: 'neutral',
  });
  assert.equal(m.eyebrow, 'Deine Fusion-Signatur');
  assert.equal(m.evidence.length, 3);
  assert.equal(m.primaryAction.path, '/daily');
  assert.equal(m.tone, 'neutral');
});

test('insightHeroModel defaults: empty evidence, no actions, neutral tone', () => {
  const m = insightHeroModel({ title: 'X', statement: 'Y' });
  assert.deepEqual(m.evidence, []);
  assert.equal(m.primaryAction, null);
  assert.equal(m.tone, 'neutral');
});
