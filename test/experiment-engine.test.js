import test from 'node:test';
import assert from 'node:assert/strict';
import { pickDailyExperiment, EXPERIMENT_RULES } from '../public/src/domain/experimentEngine.js';

function ah(house, intensity = 0.5) {
  return [{ house, label: `Haus ${house}`, intensity }];
}

test('EXPERIMENT_RULES exposes at least 8 distinct rule paths', () => {
  const reasons = new Set(EXPERIMENT_RULES.map((r) => r.sourceReason));
  assert.ok(reasons.size >= 8, `expected >=8 distinct sourceReasons, got ${reasons.size}`);
});

test('every rule carries instruction, reflectionQuestion, sourceReason and tags', () => {
  for (const rule of EXPERIMENT_RULES) {
    assert.ok(rule.match,         `rule missing match: ${rule.sourceReason}`);
    assert.ok(rule.sourceReason,  'rule missing sourceReason');
    const sample = rule.build({ activeHouses: ah(3), exp: { fusion: { dominantElement: 'Erde', deficientElement: 'Metall', coherence: 50 } } });
    assert.ok(sample.title);
    assert.ok(sample.instruction);
    assert.ok(sample.reflectionQuestion);
    assert.ok(Array.isArray(sample.tags));
    assert.ok(sample.sourceReason);
  }
});

test('priority: active house wins over deficient element', () => {
  const x = pickDailyExperiment({
    activeHouses: ah(3),
    exp: { fusion: { deficientElement: 'Metall', coherence: 50 } },
  });
  assert.match(x.sourceReason, /3\. Haus/);
});

test('active house 3 triggers Kommunikation', () => {
  const x = pickDailyExperiment({ activeHouses: ah(3), exp: {} });
  assert.match(x.sourceReason, /3\. Haus/);
  assert.match(x.instruction, /Aussage|schreib/i);
});

test('active house 4 triggers Familie/Innenraum', () => {
  const x = pickDailyExperiment({ activeHouses: ah(4), exp: {} });
  assert.match(x.sourceReason, /4\. Haus/);
});

test('active house 10 triggers Sichtbarkeit/Arbeit', () => {
  const x = pickDailyExperiment({ activeHouses: ah(10), exp: {} });
  assert.match(x.sourceReason, /10\. Haus/);
});

test('active house 7 triggers Partnerschaft', () => {
  const x = pickDailyExperiment({ activeHouses: ah(7), exp: {} });
  assert.match(x.sourceReason, /7\. Haus/);
});

test('deficient Metall triggers Entscheidung', () => {
  const x = pickDailyExperiment({
    activeHouses: [],
    exp: { fusion: { deficientElement: 'Metall', coherence: 50 } },
  });
  assert.match(x.sourceReason, /Metall/);
});

test('deficient Wasser triggers Reflexion', () => {
  const x = pickDailyExperiment({
    activeHouses: [],
    exp: { fusion: { deficientElement: 'Wasser', coherence: 50 } },
  });
  assert.match(x.sourceReason, /Wasser/);
});

test('high coherence (band high/very-high) triggers Blindspot-Pfad', () => {
  const x = pickDailyExperiment({
    activeHouses: [],
    exp: { fusion: { coherence: 85 } },
  });
  assert.match(x.sourceReason, /Kohärenz hoch|Echo/i);
});

test('low coherence triggers Spannung-Pfad', () => {
  const x = pickDailyExperiment({
    activeHouses: [],
    exp: { fusion: { coherence: 25 } },
  });
  assert.match(x.sourceReason, /Kohärenz niedrig|Spannung/i);
});

test('medium coherence triggers Brücke-Pfad when no other rule matches', () => {
  const x = pickDailyExperiment({
    activeHouses: [],
    exp: { fusion: { coherence: 55 } },
  });
  assert.match(x.sourceReason, /mittel|Brücke/i);
});

test('default rule fires only when no other rule matches', () => {
  const x = pickDailyExperiment({ activeHouses: [], exp: {} });
  assert.match(x.sourceReason, /Default/i);
});
