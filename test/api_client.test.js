import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfile, geocodePlace } from '../public/src/api/client.js';

// Helpers to mock and restore globalThis.fetch
function withFetch(mockFn, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mockFn;
  return fn().finally(() => { globalThis.fetch = original; });
}

// ── ok-flag consistency ──────────────────────────────────────────────────────

test('envelope: ok is true and error is null on 200 with valid JSON', () =>
  withFetch(
    async () => ({ ok: true, status: 200, json: async () => ({ result: 'x' }) }),
    async () => {
      const r = await calculateProfile({ date: '2000-01-01T12:00:00', tz: 'UTC', lat: 0, lon: 0 });
      assert.equal(r.ok, true);
      assert.equal(r.error, null);
      assert.deepEqual(r.data, { result: 'x' });
    },
  ));

test('envelope: ok is false when HTTP 200 but body is not JSON', () =>
  withFetch(
    async () => ({ ok: true, status: 200, json: async () => { throw new Error('not JSON'); } }),
    async () => {
      const r = await calculateProfile({ date: '2000-01-01T12:00:00', tz: 'UTC', lat: 0, lon: 0 });
      assert.equal(r.ok, false, 'ok must be false when JSON parse fails, even on HTTP 200');
      assert.ok(r.error, 'error must be set');
      assert.equal(r.data, null);
    },
  ));

test('envelope: ok is false on network error', () =>
  withFetch(
    async () => { throw new Error('network failure'); },
    async () => {
      const r = await geocodePlace('München');
      assert.equal(r.ok, false);
      assert.equal(r.status, 0);
      assert.ok(r.error.includes('network failure'));
    },
  ));

test('envelope: ok is false on HTTP 4xx with JSON error body', () =>
  withFetch(
    async () => ({ ok: false, status: 400, json: async () => ({ error: 'Bad request' }) }),
    async () => {
      const r = await calculateProfile({ date: '2000-01-01T12:00:00', tz: 'UTC', lat: 0, lon: 0 });
      assert.equal(r.ok, false);
      assert.equal(r.error, 'Bad request');
    },
  ));
