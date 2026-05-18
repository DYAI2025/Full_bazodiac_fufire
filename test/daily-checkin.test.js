import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_CHECKINS_KEY,
  readAllCheckins,
  readDailyCheckin,
  writeDailyCheckin,
} from '../public/src/components/DailyCheckin.js';

function makeMemStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

test('DAILY_CHECKINS_KEY is the goal-pinned key', () => {
  assert.equal(DAILY_CHECKINS_KEY, 'fufire.dailyCheckins');
});

test('readAllCheckins returns empty object when storage is empty', () => {
  assert.deepEqual(readAllCheckins(makeMemStorage()), {});
});

test('writeDailyCheckin persists a date-keyed entry into the shared object', () => {
  const s = makeMemStorage();
  writeDailyCheckin(s, '2026-05-18', { clarity: 'mittel', energy: 'ruhig', contact: 'offen' });
  const raw = s.getItem('fufire.dailyCheckins');
  const parsed = JSON.parse(raw);
  assert.ok(parsed['2026-05-18']);
  assert.equal(parsed['2026-05-18'].clarity, 'mittel');
  assert.equal(parsed['2026-05-18'].contact, 'offen');
  assert.ok(parsed['2026-05-18'].createdAt, 'createdAt timestamp must be set');
});

test('writeDailyCheckin merges partial updates into the existing entry for that date', () => {
  const s = makeMemStorage();
  writeDailyCheckin(s, '2026-05-18', { clarity: 'mittel' });
  writeDailyCheckin(s, '2026-05-18', { energy: 'aktiv' });
  const entry = readDailyCheckin(s, '2026-05-18');
  assert.equal(entry.clarity, 'mittel');
  assert.equal(entry.energy,  'aktiv');
});

test('writeDailyCheckin does not clobber other dates', () => {
  const s = makeMemStorage();
  writeDailyCheckin(s, '2026-05-17', { clarity: 'hoch' });
  writeDailyCheckin(s, '2026-05-18', { clarity: 'niedrig' });
  assert.equal(readDailyCheckin(s, '2026-05-17').clarity, 'hoch');
  assert.equal(readDailyCheckin(s, '2026-05-18').clarity, 'niedrig');
});

test('readDailyCheckin returns null for unknown dates', () => {
  assert.equal(readDailyCheckin(makeMemStorage(), '2026-05-18'), null);
});

test('readAllCheckins is resilient to malformed JSON', () => {
  const s = makeMemStorage({ 'fufire.dailyCheckins': '{{not-json' });
  assert.deepEqual(readAllCheckins(s), {});
});
