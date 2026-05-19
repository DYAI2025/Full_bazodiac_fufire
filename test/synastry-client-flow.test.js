import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSynastry, calculateProfile, geocodePlace } from '../public/src/api/client.js';

function withFetch(mockFn, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mockFn;
  return fn().finally(() => { globalThis.fetch = original; });
}

test('calculateSynastry POSTs personA+personB body and returns envelope', () =>
  withFetch(
    async (url, opts) => {
      assert.ok(url.includes('/api/azodiac/synastry'));
      assert.equal(opts.method, 'POST');
      const body = JSON.parse(opts.body);
      assert.ok(body.personA);
      assert.ok(body.personB);
      assert.equal(body.personA.date, '1990-05-15');
      assert.equal(body.personB.date, '1992-08-20');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          personA: { fusion: { coherence_index: 73 }, bazi: {}, western: {} },
          personB: { fusion: { coherence_index: 64 }, bazi: {}, western: {} },
          synastry: { resonance_index: 78, primary_connection: 'X', primary_tension: 'Y' },
        }),
      };
    },
    async () => {
      const inputA = { date: '1990-05-15', time: '14:30', lat: 52.52, lon: 13.40, tz: 'Europe/Berlin' };
      const inputB = { date: '1992-08-20', time: '09:00', lat: 48.13, lon: 11.58, tz: 'Europe/Berlin' };
      const r = await calculateSynastry(inputA, inputB);
      assert.equal(r.ok, true);
      assert.equal(r.data.personA.fusion.coherence_index, 73);
      assert.equal(r.data.personB.fusion.coherence_index, 64);
      assert.equal(r.data.synastry.resonance_index, 78);
    },
  ));

test('calculateSynastry envelope captures upstream error without throwing', () =>
  withFetch(
    async () => ({ ok: false, status: 502, json: async () => ({ error: 'upstream down' }) }),
    async () => {
      const r = await calculateSynastry({}, {});
      assert.equal(r.ok, false);
      assert.equal(r.status, 502);
      assert.equal(r.error, 'upstream down');
      assert.equal(r.data?.error, 'upstream down');
    },
  ));

test('geocodePlace + calculateProfile chain: typical InputPage submit path', () =>
  withFetch(
    async (url) => {
      if (url.includes('/api/geocode')) {
        return { ok: true, status: 200, json: async () => [{ display: 'Berlin, DE', lat: 52.52, lon: 13.40, tz: 'Europe/Berlin' }] };
      }
      if (url.includes('/api/azodiac/profile')) {
        return { ok: true, status: 200, json: async () => ({ fusion: { coherence_index: 71 }, bazi: { pillars: {} }, western: { bodies: {} } }) };
      }
      throw new Error(`unexpected url: ${url}`);
    },
    async () => {
      const geo = await geocodePlace('Berlin');
      assert.equal(geo.ok, true);
      const place = geo.data[0];
      assert.equal(place.tz, 'Europe/Berlin');

      const profile = await calculateProfile({ date: '1990-05-15', time: '14:30', lat: place.lat, lon: place.lon, tz: place.tz });
      assert.equal(profile.ok, true);
      assert.equal(profile.data.fusion.coherence_index, 71);
    },
  ));

test('geocodePlace surfaces rate-limit status to UI layer', () =>
  withFetch(
    async () => ({ ok: false, status: 429, json: async () => ({ error: 'rate limited' }) }),
    async () => {
      const r = await geocodePlace('Berlin');
      assert.equal(r.ok, false);
      assert.equal(r.status, 429);
    },
  ));
