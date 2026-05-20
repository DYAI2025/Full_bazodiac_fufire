// Sprint J — Daily data-flow state-machine tests.
//
// Verifies the explicit IDLE/LOADING/READY/EMPTY/ERROR transitions on
// /daily by inspecting `data-state` attribute on the `.daily-page` root
// after each scenario. Uses globalThis.fetch mocking + microtask flush
// to await the two async chains (getDailyExperience + transit fetches).
//
// The api/client.js request() wrapper catches all fetch failures and
// returns `{ ok: false, error: ... }` envelopes — so ERROR is reached
// via response shape, not via .catch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { DailyPage, STATE_IDLE, STATE_LOADING, STATE_READY, STATE_EMPTY, STATE_ERROR } =
  await import('../public/src/pages/DailyPage.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const lina = JSON.parse(readFileSync(
  join(__dirname, '_fixtures', 'upstream-snapshots', 'profile.real.json'), 'utf8',
));

function freshApp() {
  cap.reset();
  global.sessionStorage.setItem('azodiac_birth_input', JSON.stringify({
    date: '1987-03-14', time: '07:42', lat: 52.37, lon: 9.73, tz: 'Europe/Berlin',
  }));
  return global.document.createElement('main');
}

function flushMicrotasks() {
  return new Promise((r) => setTimeout(r, 25));
}

function makeFetchMock(routes) {
  return async (url) => {
    for (const [match, response] of Object.entries(routes)) {
      if (url.includes(match)) {
        if (response instanceof Error) throw response;
        return response;
      }
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
}

function fetchResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function pageState(app) {
  return app.querySelector('.daily-page').getAttribute('data-state');
}

// ── Test 1: STATE_* constants exported ───────────────────────────────────────
test('STATE_* constants are exported as strings', () => {
  for (const [name, val] of [
    ['STATE_IDLE',    STATE_IDLE],
    ['STATE_LOADING', STATE_LOADING],
    ['STATE_READY',   STATE_READY],
    ['STATE_EMPTY',   STATE_EMPTY],
    ['STATE_ERROR',   STATE_ERROR],
  ]) {
    assert.equal(typeof val, 'string', `${name} must be string`);
    assert.ok(val.length > 0, `${name} must be non-empty`);
  }
  // All distinct.
  const set = new Set([STATE_IDLE, STATE_LOADING, STATE_READY, STATE_EMPTY, STATE_ERROR]);
  assert.equal(set.size, 5, 'all five STATE_* values must be distinct');
});

// ── Test 2: IDLE → LOADING on mount ──────────────────────────────────────────
test('IDLE → LOADING: on mount with profile + birthInput, data-state="loading"', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetchMock({});
  try {
    const app = freshApp();
    DailyPage(app, { profile: lina });
    assert.equal(pageState(app), STATE_LOADING,
      'synchronous post-mount state must be LOADING');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 3: LOADING → READY when both fetches return content ─────────────────
test('LOADING → READY: both fetches return non-empty payloads', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetchMock({
    '/api/azodiac/daily': fetchResponse({
      western: { summary: 'Westlich aktiv.' },
      eastern: { summary: 'BaZi-Impuls.' },
      fusion:  { summary: 'Synthese.', synthesis: 'Test-Synthese.' },
    }),
    '/transit/now': fetchResponse({
      today: { sector_intensity: [0.3, 0.7, 0.1, 0.2, 0.4, 0.05, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
    }),
    '/transit/timeline': fetchResponse({ timeline: { days: [] } }),
  });
  try {
    const app = freshApp();
    DailyPage(app, { profile: lina });
    await flushMicrotasks();
    assert.equal(pageState(app), STATE_READY, 'final state must be READY');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 4: LOADING → EMPTY when payloads are empty objects ──────────────────
test('LOADING → EMPTY: fetches return ok but empty payload', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetchMock({
    '/api/azodiac/daily':    fetchResponse({}),
    '/transit/now':          fetchResponse({}),
    '/transit/timeline':     fetchResponse({}),
  });
  try {
    const app = freshApp();
    DailyPage(app, { profile: lina });
    await flushMicrotasks();
    assert.equal(pageState(app), STATE_EMPTY,
      'state must be EMPTY when payloads are structurally empty');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 5: LOADING → ERROR when daily-experience returns ok:false ───────────
test('LOADING → ERROR: getDailyExperience returns ok:false', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetchMock({
    '/api/azodiac/daily':    fetchResponse({ error: 'upstream-down' }, false, 503),
    '/transit/now':          fetchResponse({ today: { sector_intensity: [] } }),
    '/transit/timeline':     fetchResponse({}),
  });
  try {
    const app = freshApp();
    DailyPage(app, { profile: lina });
    await flushMicrotasks();
    assert.equal(pageState(app), STATE_ERROR,
      'state must be ERROR when daily-experience returns ok:false');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 6: LOADING → ERROR when daily-experience fetch itself throws ────────
test('LOADING → ERROR: daily-experience fetch throws', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetchMock({
    '/api/azodiac/daily':    new Error('network-boom'),
    '/transit/now':          fetchResponse({}),
    '/transit/timeline':     fetchResponse({}),
  });
  try {
    const app = freshApp();
    DailyPage(app, { profile: lina });
    await flushMicrotasks();
    assert.equal(pageState(app), STATE_ERROR,
      'state must be ERROR when daily-experience fetch throws');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 7: Fallback copy present per non-ready state ────────────────────────
test('EMPTY emits explicit fallback copy in DOM aggregate', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetchMock({
    '/api/azodiac/daily':    fetchResponse({}),
    '/transit/now':          fetchResponse({}),
    '/transit/timeline':     fetchResponse({}),
  });
  try {
    const app = freshApp();
    DailyPage(app, { profile: lina });
    await flushMicrotasks();
    const agg = cap.aggregate();
    assert.ok(/noch nicht verfügbar|Versuch es/i.test(agg),
      'EMPTY-state fallback copy must surface in DOM');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ERROR emits explicit fallback copy in DOM aggregate', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeFetchMock({
    '/api/azodiac/daily':    fetchResponse({ error: 'foo' }, false, 500),
    '/transit/now':          fetchResponse({}),
    '/transit/timeline':     fetchResponse({}),
  });
  try {
    const app = freshApp();
    DailyPage(app, { profile: lina });
    await flushMicrotasks();
    const agg = cap.aggregate();
    assert.ok(/konnten den Tagespuls nicht laden|Eingaben sind nicht verloren/i.test(agg),
      'ERROR-state fallback copy must surface in DOM');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
