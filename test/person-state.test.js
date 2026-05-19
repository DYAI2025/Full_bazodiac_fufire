import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory localStorage stub — module reads `localStorage` from globalThis.
const store = new Map();
global.localStorage = {
  getItem(k) { return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
  clear() { store.clear(); },
};

const {
  readAlias, saveAlias,
  readPersonB, savePersonB,
  readRelationshipContext, saveRelationshipContext,
  clearAllPersonState,
  validateCoordinates,
} = await import('../public/src/domain/personState.js');

test('alias: save and read', () => {
  clearAllPersonState();
  assert.equal(readAlias(), '');
  saveAlias('Maria');
  assert.equal(readAlias(), 'Maria');
});

test('alias: empty value clears storage', () => {
  saveAlias('Maria');
  saveAlias('');
  assert.equal(readAlias(), '');
});

test('alias: truncates to 80 chars', () => {
  const long = 'X'.repeat(120);
  saveAlias(long);
  assert.equal(readAlias().length, 80);
});

test('personB: rejects incomplete shape silently', () => {
  clearAllPersonState();
  assert.equal(savePersonB({}), false);
  assert.equal(savePersonB({ date: '1990-01-01' }), false);
  assert.equal(savePersonB({ date: '1990-01-01', place: {} }), false);
  assert.equal(readPersonB(), null);
});

test('personB: round-trip valid record', () => {
  clearAllPersonState();
  const ok = savePersonB({
    alias: 'Sam',
    date: '1990-05-15',
    time: '14:30',
    certainty: 'exact',
    place: { display: 'Berlin', lat: 52.52, lon: 13.405, tz: 'Europe/Berlin' },
  });
  assert.equal(ok, true);
  const b = readPersonB();
  assert.equal(b.alias, 'Sam');
  assert.equal(b.date, '1990-05-15');
  assert.equal(b.place.lat, 52.52);
  assert.equal(b.place.tz, 'Europe/Berlin');
});

test('personB: null argument clears storage', () => {
  savePersonB({
    date: '1990-05-15', time: '14:30', certainty: 'exact',
    place: { display: 'X', lat: 1, lon: 2, tz: 'UTC' },
  });
  savePersonB(null);
  assert.equal(readPersonB(), null);
});

test('relationship context: only allows whitelisted values', () => {
  clearAllPersonState();
  assert.equal(saveRelationshipContext('romantic'), true);
  assert.equal(readRelationshipContext(), 'romantic');
  assert.equal(saveRelationshipContext('bogus'), false);
  assert.equal(readRelationshipContext(), 'romantic');  // unchanged
  saveRelationshipContext('');
  assert.equal(readRelationshipContext(), '');
});

test('validateCoordinates: accepts valid WGS84 pair', () => {
  const v = validateCoordinates(52.5200066, 13.4049540);
  assert.equal(v.ok, true);
  assert.equal(v.lat, 52.5200066);
});

test('validateCoordinates: rejects out-of-range', () => {
  assert.equal(validateCoordinates(91, 0).ok, false);
  assert.equal(validateCoordinates(-91, 0).ok, false);
  assert.equal(validateCoordinates(0, 181).ok, false);
  assert.equal(validateCoordinates(0, -181).ok, false);
});

test('validateCoordinates: rejects non-numeric input', () => {
  const v = validateCoordinates('abc', 0);
  assert.equal(v.ok, false);
  assert.match(v.error, /Zahlen/);
});

test('validateCoordinates: accepts string numbers (form-input shape)', () => {
  const v = validateCoordinates('52.52', '13.405');
  assert.equal(v.ok, true);
  assert.equal(v.lat, 52.52);
});

test('clearAllPersonState wipes alias + personB + relationship context', () => {
  saveAlias('A');
  savePersonB({
    date: '1990-05-15', time: '14:30', certainty: 'exact',
    place: { display: 'X', lat: 1, lon: 2, tz: 'UTC' },
  });
  saveRelationshipContext('friend');
  clearAllPersonState();
  assert.equal(readAlias(), '');
  assert.equal(readPersonB(), null);
  assert.equal(readRelationshipContext(), '');
});
