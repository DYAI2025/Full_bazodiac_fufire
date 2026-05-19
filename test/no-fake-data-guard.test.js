import test from 'node:test';
import assert from 'node:assert/strict';
import { noFakeDataGuard } from '../public/src/api/client.js';

test('noFakeDataGuard passes for clean payloads', () => {
  assert.doesNotThrow(() => noFakeDataGuard({ name: 'Maria', score: 73 }, 'clean'));
});

test('noFakeDataGuard throws on classic dummy signatures', () => {
  for (const dummy of ['Lorem ipsum', 'placeholder text', 'fake value', 'dummy data']) {
    assert.throws(
      () => noFakeDataGuard({ field: dummy }, 'classic'),
      /noFakeDataGuard/,
      `should throw for "${dummy}"`,
    );
  }
});

test('noFakeDataGuard throws on goal-relevant signatures (TODO, Mustermann, Keine Beschreibung)', () => {
  assert.throws(() => noFakeDataGuard({ x: 'TODO: fill in' }, 'todo'), /noFakeDataGuard/);
  assert.throws(() => noFakeDataGuard({ name: 'Mustermann' }, 'persona'), /noFakeDataGuard/);
  assert.throws(() => noFakeDataGuard({ meaning: 'Keine Beschreibung verfügbar' }, 'meaning'), /noFakeDataGuard/);
});

test('noFakeDataGuard runs in production (no NODE_ENV gate) — runs by default', () => {
  // Goal: guard MUST fire outside development, otherwise production demo data slips through.
  const prevEnv = process.env.NODE_ENV;
  const prevDisable = process.env.NOFAKE_GUARD_DISABLE;
  process.env.NODE_ENV = 'production';
  delete process.env.NOFAKE_GUARD_DISABLE;
  try {
    assert.throws(() => noFakeDataGuard({ field: 'dummy data' }, 'prod'), /noFakeDataGuard/);
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevDisable !== undefined) process.env.NOFAKE_GUARD_DISABLE = prevDisable;
  }
});

test('noFakeDataGuard can be opted out via NOFAKE_GUARD_DISABLE=1', () => {
  const prev = process.env.NOFAKE_GUARD_DISABLE;
  process.env.NOFAKE_GUARD_DISABLE = '1';
  try {
    assert.doesNotThrow(() => noFakeDataGuard({ field: 'dummy data' }, 'opt-out'));
  } finally {
    if (prev === undefined) delete process.env.NOFAKE_GUARD_DISABLE;
    else process.env.NOFAKE_GUARD_DISABLE = prev;
  }
});
