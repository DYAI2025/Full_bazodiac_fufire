import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfile, geocodePlace, getTransitNow, getTransitTimeline } from '../public/src/api/client.js';

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

test('getTransitNow returns envelope with ok=true on 200', () =>
  withFetch(
    async (url) => {
      assert.ok(url.includes('/transit/now'));
      return { ok: true, status: 200, json: async () => ({ computed_at: '2026-05-16T00:00:00Z', planets: { sun: { longitude: 55.1 } }, sector_intensity: new Array(12).fill(0) }) };
    },
    async () => {
      const r = await getTransitNow();
      assert.equal(r.ok, true);
      assert.equal(r.status, 200);
      assert.ok(r.data.computed_at);
      assert.ok(r.data.planets.sun);
    },
  ));

test('getTransitTimeline returns envelope with days array', () =>
  withFetch(
    async (url) => {
      assert.ok(url.includes('/transit/timeline'));
      return { ok: true, status: 200, json: async () => ({ days: [{ date: '2026-05-16', planets: {}, sector_intensity: [] }] }) };
    },
    async () => {
      const r = await getTransitTimeline();
      assert.equal(r.ok, true);
      assert.ok(Array.isArray(r.data.days));
      assert.equal(r.data.days.length, 1);
    },
  ));
