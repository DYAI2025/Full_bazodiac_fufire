// Contract tests against the live FuFirE upstream.
// Run with: FUFIRE_CONTRACT_TEST=true node --test test/contract.test.js
// Or:       npm run test:contract
//
// These tests are opt-in only — they make real network calls.
// They detect silent path drift between this proxy and the upstream API.
import test from 'node:test';
import assert from 'node:assert/strict';

const ENABLED  = process.env.FUFIRE_CONTRACT_TEST === 'true';
const BASE_URL = (process.env.FUFIRE_BASE_URL || '').replace(/\/+$/, '');
const API_KEY  = process.env.FUFIRE_API_KEY || '';

const headers = {
  'content-type': 'application/json',
  'accept': 'application/json',
  ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
};

const getHeaders = {
  'accept': 'application/json',
  ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
};

const MINIMAL_PAYLOAD = {
  date: '1990-06-15T12:00:00',
  tz: 'Europe/Berlin',
  lat: 48.137,
  lon: 11.576,
};

function skipIfDisabled(t) {
  if (!ENABLED || !BASE_URL) {
    t.skip('Set FUFIRE_CONTRACT_TEST=true and FUFIRE_BASE_URL to run contract tests');
  }
}

test('contract: calculate/western responds 200 with bodies field', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/western`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert.ok(json.bodies || json.planets, 'Response must contain bodies or planets field');
});

test('contract: calculate/bazi responds 200 with pillars field', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/bazi`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.pillars || json.bazi, 'Response must contain pillars field');
});

test('contract: calculate/fusion responds 200 with wu_xing_vectors', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/fusion`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.wu_xing_vectors ?? json.vectors, 'Response must contain wu_xing_vectors');
});

test('contract: info/wuxing-mapping responds 200 — path drift detection', async (t) => {
  skipIfDisabled(t);
  // Upstream renamed /info/wuxing → /info/wuxing-mapping. server.js upstreamPath already updated.
  const res = await fetch(`${BASE_URL}/info/wuxing-mapping`, {
    method: 'GET', headers: getHeaders,
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) {
    // Check if the old path came back
    const res2 = await fetch(`${BASE_URL}/info/wuxing`, {
      method: 'GET', headers: getHeaders,
      signal: AbortSignal.timeout(10_000),
    });
    assert.fail(
      `Path drift: /info/wuxing-mapping → 404, /info/wuxing → ${res2.status}. ` +
      `Revert upstreamPath in server.js to 'info/wuxing' if old path is back`,
    );
  }
  assert.equal(res.status, 200, `Expected 200 from /info/wuxing-mapping, got ${res.status}`);
  const json = await res.json();
  assert.ok(
    json.planet_mapping ?? json.planets ?? json.mapping ?? json.elements,
    'Response must contain a planet mapping field',
  );
});

test('contract: response shape stability — Sun longitude is a number', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/calculate/western`, {
    method: 'POST', headers, body: JSON.stringify(MINIMAL_PAYLOAD),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  const bodies = json.bodies || json.planets || {};
  const sun = bodies.Sun || bodies.sun || null;
  assert.ok(sun, 'Sun must be present in bodies');
  const lon = sun.longitude ?? sun.lon ?? sun.degree;
  assert.equal(typeof lon, 'number', `Sun longitude must be number, got ${typeof lon}`);
});

test('contract: transit/now responds 200 with planets and sector_intensity', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/transit/now`, {
    method: 'GET', headers: getHeaders,
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert.ok(json.planets, 'Response must contain planets field');
  const sun = json.planets?.sun ?? json.planets?.Sun;
  assert.ok(sun, 'planets.sun must exist');
  const sunLon = sun?.longitude ?? sun?.lon ?? sun?.degree;
  assert.equal(typeof sunLon, 'number', 'sun.longitude must be a number');
  assert.ok(Array.isArray(json.sector_intensity), 'sector_intensity must be an array');
  assert.equal(json.sector_intensity.length, 12, 'sector_intensity must have 12 entries');
  assert.ok(json.computed_at, 'computed_at must be present');
});

test('contract: transit/timeline responds 200 with 7-day days array', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/transit/timeline`, {
    method: 'GET', headers: getHeaders,
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert.ok(Array.isArray(json.days), 'Response must contain days array');
  assert.ok(
    json.days.length >= 7,
    `days must have >= 7 entries (days array must not be empty), got ${json.days.length}`
  );
  const day = json.days[0];
  assert.ok(day && typeof day === 'object', 'days[0] must be an object');
  assert.ok(day.date, 'Each day must have a date field');
  assert.ok(day.planets ?? day.planet_positions, 'Each day must have a planets field');
  const sectorIntensity = day.sector_intensity ?? day.soulprint_sectors;
  assert.ok(Array.isArray(sectorIntensity), 'Each day must have sector_intensity array');
  assert.equal(sectorIntensity.length, 12, 'Each day sector_intensity must have 12 entries');
});

// Experience endpoints require split date+time (not ISO datetime string like MINIMAL_PAYLOAD)
const BIRTH_PAYLOAD = {
  date: '1990-03-15',
  time: '14:30:00',
  lat: 48.137,
  lon: 11.576,
  tz: 'Europe/Berlin',
};

test('contract: experience/bootstrap responds 200 with soulprint_sectors', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/experience/bootstrap`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ birth: BIRTH_PAYLOAD }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert.ok(Array.isArray(json.soulprint_sectors), 'soulprint_sectors must be an array');
  assert.equal(json.soulprint_sectors.length, 12, 'soulprint_sectors must have 12 entries');
  assert.ok(json.profile, 'profile field must exist');
});

test('contract: experience/daily responds 200 with western + eastern + fusion', async (t) => {
  skipIfDisabled(t);
  const bootstrapRes = await fetch(`${BASE_URL}/experience/bootstrap`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ birth: BIRTH_PAYLOAD }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(bootstrapRes.status, 200, `Expected 200, got ${bootstrapRes.status}`);
  const bootstrap = await bootstrapRes.json();
  assert.equal(bootstrap.soulprint_sectors?.length, 12, 'bootstrap soulprint_sectors must have 12 entries before daily call');

  const today = new Date().toISOString().split('T')[0];
  const dailyRes = await fetch(`${BASE_URL}/experience/daily`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      birth: BIRTH_PAYLOAD,
      soulprint_sectors: bootstrap.soulprint_sectors,
      quiz_sectors: new Array(12).fill(0),
      target_date: today,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(dailyRes.status, 200, `Expected 200, got ${dailyRes.status}`);
  const json = await dailyRes.json();
  assert.equal(typeof json.date, 'string', 'date must be a string');
  assert.ok(json.western, 'western field must exist');
  assert.ok(json.eastern, 'eastern field must exist');
  assert.ok(json.fusion, 'fusion field must exist');
  assert.ok(Array.isArray(json.western.themes), 'western.themes must be an array');
  assert.equal(typeof json.fusion.pushworthy, 'boolean', 'fusion.pushworthy must be boolean');
});
