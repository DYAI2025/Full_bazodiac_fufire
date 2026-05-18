import test from 'node:test';
import assert from 'node:assert/strict';
import { meaningDrawerModel } from '../public/src/components/MeaningDrawer.js';
import { explainableCardModel } from '../public/src/components/ExplainableCard.js';

test('meaningDrawerModel: empty meaning becomes Basisdeutung fallback, not "Keine Beschreibung"', () => {
  const m = meaningDrawerModel({ title: 'Test' });
  assert.ok(m.meaning && m.meaning.length > 8);
  assert.ok(!/Keine Beschreibung verfügbar/i.test(m.meaning));
});

test('meaningDrawerModel: passes through resource/shadow/practice/extras', () => {
  const m = meaningDrawerModel({
    title: 'X', meaning: 'M', resource: 'R', shadow: 'S', practice: 'P',
    extras: ['a', 'b'],
  });
  assert.equal(m.resource, 'R');
  assert.equal(m.shadow,   'S');
  assert.equal(m.practice, 'P');
  assert.equal(m.extras.length, 2);
});

test('explainableCardModel: clamps domain to known values', () => {
  assert.equal(explainableCardModel({ domain: 'something-else' }).domain, 'bazi');
  for (const d of ['bazi','west','fusion','house']) {
    assert.equal(explainableCardModel({ domain: d }).domain, d);
  }
});

test('explainableCardModel: highlighted flag preserved', () => {
  assert.equal(explainableCardModel({ highlighted: true }).highlighted, true);
  assert.equal(explainableCardModel({}).highlighted, false);
});

test('explainableCardModel: empty input still returns shape', () => {
  const m = explainableCardModel({});
  assert.equal(typeof m.label, 'string');
  assert.equal(typeof m.value, 'string');
  assert.equal(typeof m.meaning, 'object');
});
