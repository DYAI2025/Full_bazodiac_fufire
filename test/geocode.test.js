import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGeoCache, geocodeRateLimiter } from '../server.js';

test('geo cache returns cached result on second call', () => {
  const cache = makeGeoCache({ maxSize: 3, ttlMs: 60_000 });
  cache.set('münchen', [{ display: 'München', lat: 48.1, lon: 11.6, tz: 'Europe/Berlin' }]);
  const result = cache.get('münchen');
  assert.ok(Array.isArray(result));
  assert.equal(result[0].display, 'München');
});

test('geo cache evicts oldest when full', () => {
  const cache = makeGeoCache({ maxSize: 2, ttlMs: 60_000 });
  cache.set('a', [{ display: 'A' }]);
  cache.set('b', [{ display: 'B' }]);
  cache.set('c', [{ display: 'C' }]); // evicts 'a'
  assert.equal(cache.get('a'), null);
  assert.ok(cache.get('c'));
});

test('geo cache respects TTL', async () => {
  const cache = makeGeoCache({ maxSize: 10, ttlMs: 1 }); // 1 ms TTL
  cache.set('x', [{ display: 'X' }]);
  await new Promise(r => setTimeout(r, 5));
  assert.equal(cache.get('x'), null);
});

test('rate limiter blocks after threshold', () => {
  const limiter = geocodeRateLimiter({ maxPerMinute: 3 });
  assert.ok(limiter.allow('1.2.3.4'));
  assert.ok(limiter.allow('1.2.3.4'));
  assert.ok(limiter.allow('1.2.3.4'));
  assert.equal(limiter.allow('1.2.3.4'), false); // 4th denied
});

test('rate limiter does not affect other IPs', () => {
  const limiter = geocodeRateLimiter({ maxPerMinute: 1 });
  assert.ok(limiter.allow('1.1.1.1'));
  assert.equal(limiter.allow('1.1.1.1'), false);
  assert.ok(limiter.allow('2.2.2.2')); // different IP → allowed
});
