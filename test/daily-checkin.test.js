import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyCheckinKey, readCheckin, writeCheckin } from '../public/src/components/DailyCheckin.js';

function makeMemStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

test('dailyCheckinKey is date-scoped', () => {
  assert.equal(dailyCheckinKey('2026-05-18'), 'azodiac_daily_checkin_2026-05-18');
});

test('write then read returns the same payload', () => {
  const s = makeMemStorage();
  writeCheckin(s, '2026-05-18', { clarity: 'mittel', energy: 'ruhig', contact: 'offen' });
  assert.deepEqual(readCheckin(s, '2026-05-18'), { clarity: 'mittel', energy: 'ruhig', contact: 'offen' });
});

test('read on empty storage returns null', () => {
  assert.equal(readCheckin(makeMemStorage(), '2026-05-18'), null);
});

test('read swallows JSON parse errors', () => {
  const s = { getItem: () => 'not-json{{{', setItem: () => undefined };
  assert.equal(readCheckin(s, '2026-05-18'), null);
});
