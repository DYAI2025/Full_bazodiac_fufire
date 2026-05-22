// test/api-provenance.test.js — I5: API provenance model unit tests
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProvenance, deriveStatus, redactSensitive } from '../public/src/domain/apiProvenance.js';

const catalog = [
  { endpoint: '/api/azodiac/profile', method: 'POST' },
  { endpoint: '/api/azodiac/fusion', method: 'POST' },
  { endpoint: '/api/azodiac/synastry', method: 'POST' },
  { endpoint: '/api/azodiac/daily', method: 'POST' },
  { endpoint: '/health', method: 'GET' },
  { endpoint: '/api/config', method: 'GET' },
];

const healthOk = {
  ok: true,
  upstream_ok: true,
  fufire_base_url: 'https://bafe-production.up.railway.app/',
  endpoints: ['/api/azodiac/profile', '/api/azodiac/fusion', '/api/azodiac/synastry'],
  fallback_endpoints: [],
};

const healthFallback = {
  ok: true,
  upstream_ok: false,
  fufire_base_url: 'https://bafe-production.up.railway.app/',
  endpoints: [],
  fallback_endpoints: ['/api/azodiac/profile', '/api/azodiac/fusion'],
};

const consumerMap = {
  '/api/azodiac/profile': ['OverviewPage', 'PersonalityPage'],
  '/api/azodiac/fusion': ['LovePage'],
  '/api/azodiac/synastry': ['SynastryPage'],
  '/api/azodiac/daily': ['DailyPage'],
  '/health': ['MethodPage'],
  '/api/config': ['MethodPage'],
};

test('buildProvenance: returns entry per catalog endpoint', () => {
  const entries = buildProvenance(catalog, healthOk, consumerMap);
  assert.equal(entries.length, catalog.length);
  for (const e of entries) {
    assert.ok(e.endpoint);
    assert.ok(e.method);
    assert.ok(Array.isArray(e.consumers));
    assert.ok(['known', 'reachable', 'fallback', 'unused', 'unknown'].includes(e.status),
      `unexpected status "${e.status}" for ${e.endpoint}`);
    assert.ok(['config', 'health', 'live-check', 'frontend-use'].includes(e.source),
      `unexpected source "${e.source}" for ${e.endpoint}`);
  }
});

test('buildProvenance: reachable when upstream_ok and endpoint in health.endpoints', () => {
  const entries = buildProvenance(catalog, healthOk, consumerMap);
  const profile = entries.find(e => e.endpoint === '/api/azodiac/profile');
  assert.equal(profile.status, 'reachable');
  assert.deepEqual(profile.consumers.sort(), ['OverviewPage', 'PersonalityPage'].sort());
});

test('buildProvenance: fallback when health flags endpoint as fallback', () => {
  const entries = buildProvenance(catalog, healthFallback, consumerMap);
  const profile = entries.find(e => e.endpoint === '/api/azodiac/profile');
  assert.equal(profile.status, 'fallback');
});

test('buildProvenance: flags unused endpoint (in catalog, not in consumerMap)', () => {
  const sparseConsumer = { '/api/azodiac/profile': ['OverviewPage'] };
  const entries = buildProvenance(catalog, healthOk, sparseConsumer);
  const fusion = entries.find(e => e.endpoint === '/api/azodiac/fusion');
  assert.equal(fusion.status, 'unused');
  assert.deepEqual(fusion.consumers, []);
});

test('buildProvenance: unknown when not in catalog but referenced by consumerMap', () => {
  const extraConsumer = {
    ...consumerMap,
    '/api/azodiac/ghost': ['MysteryPage'],
  };
  const entries = buildProvenance(catalog, healthOk, extraConsumer);
  const ghost = entries.find(e => e.endpoint === '/api/azodiac/ghost');
  assert.ok(ghost, 'ghost endpoint should still be present');
  assert.equal(ghost.status, 'unknown');
  assert.equal(ghost.source, 'frontend-use');
});

test('buildProvenance: never reports "ok"/"reachable" for unknown endpoints', () => {
  const entries = buildProvenance(catalog, healthOk, { '/api/ghost': ['GhostPage'] });
  const ghost = entries.find(e => e.endpoint === '/api/ghost');
  assert.notEqual(ghost.status, 'reachable');
  assert.notEqual(ghost.status, 'known');
});

test('deriveStatus: returns "unknown" on null/empty health', () => {
  assert.equal(deriveStatus('/api/azodiac/profile', null, true), 'unknown');
  assert.equal(deriveStatus('/api/azodiac/profile', {}, true), 'unknown');
});

test('redactSensitive: strips tokens/keys/secrets from raw object', () => {
  const raw = {
    endpoint: '/api/config',
    api_key: 'sk-secret-123',
    token: 'bearer-xyz',
    Authorization: 'Bearer abc',
    fufire_base_url: 'https://bafe-production.up.railway.app/',
    nested: { secret: 'nope', safe: 'visible' },
  };
  const safe = redactSensitive(raw);
  assert.equal(safe.api_key, '[REDACTED]');
  assert.equal(safe.token, '[REDACTED]');
  assert.equal(safe.Authorization, '[REDACTED]');
  assert.equal(safe.fufire_base_url, 'https://bafe-production.up.railway.app/');
  assert.equal(safe.nested.secret, '[REDACTED]');
  assert.equal(safe.nested.safe, 'visible');
});

test('buildProvenance: deterministic order (catalog first, then unknowns alphabetical)', () => {
  const consumer = {
    ...consumerMap,
    '/api/zzz/late': ['LatePage'],
    '/api/aaa/early': ['EarlyPage'],
  };
  const entries = buildProvenance(catalog, healthOk, consumer);
  const catalogEndpoints = catalog.map(c => c.endpoint);
  const orderedEndpoints = entries.map(e => e.endpoint);
  assert.deepEqual(orderedEndpoints.slice(0, catalog.length), catalogEndpoints);
  const tail = orderedEndpoints.slice(catalog.length);
  assert.deepEqual(tail, ['/api/aaa/early', '/api/zzz/late']);
});
