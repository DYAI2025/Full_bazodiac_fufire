import test from 'node:test';
import assert from 'node:assert/strict';
import { persistentSignatureBarModel } from '../public/src/components/PersistentSignatureBar.js';

test('persistentSignatureBarModel returns labelled items in stable order', () => {
  const m = persistentSignatureBarModel({
    dayMaster:   'Wu Erde',
    sun:         'Krebs',
    coherence:   62,
    todayActive: '1. + 3. Haus aktiv',
  });
  assert.ok(Array.isArray(m.items));
  assert.deepEqual(m.items.map(i => i.label), ['Kern', 'Sonne', 'Kohärenz', 'Heute aktiv']);
  assert.equal(m.items[0].value, 'Wu Erde');
  assert.equal(m.items[2].value, '62');
});

test('persistentSignatureBarModel skips items with empty values', () => {
  const m = persistentSignatureBarModel({ dayMaster: 'Wu Erde' });
  assert.equal(m.items.length, 1);
  assert.equal(m.items[0].label, 'Kern');
});

test('persistentSignatureBarModel: missing input returns empty items', () => {
  assert.deepEqual(persistentSignatureBarModel().items, []);
});
