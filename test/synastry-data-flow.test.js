// Sprint L — Synastry data-flow state-machine tests.
//
// SynastryPage differs from DailyPage: click-driven instead of fetch-on-
// mount. We expose the inner async path as `runSynastryCalculation(app,
// {inputA, inputB?})` so tests can drive transitions deterministically
// without simulating GeoInput's async place-pick flow.
//
// data-state attribute on `.synastry-page` root is the single state-truth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const {
  SynastryPage,
  runSynastryCalculation,
  STATE_IDLE, STATE_LOADING, STATE_READY, STATE_EMPTY, STATE_ERROR,
} = await import('../public/src/pages/SynastryPage.js');

const INPUT_A = { date: '1987-03-14', time: '07:42', lat: 52.37,  lon:   9.73, tz: 'Europe/Berlin' };
const INPUT_B = { date: '1990-03-04', time: '20:01', lat: 35.69,  lon: 139.69, tz: 'Asia/Tokyo'    };

function freshApp() {
  cap.reset();
  return global.document.createElement('main');
}

function pageState(app) {
  return app.querySelector('.synastry-page').getAttribute('data-state');
}

function mockFetch(routes) {
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

// ── Test 1: STATE_* exports ──────────────────────────────────────────────────
test('SynastryPage exports STATE_* as 5 distinct strings', () => {
  const set = new Set([STATE_IDLE, STATE_LOADING, STATE_READY, STATE_EMPTY, STATE_ERROR]);
  assert.equal(set.size, 5, 'five distinct STATE_* values');
  for (const v of set) {
    assert.equal(typeof v, 'string');
    assert.ok(v.length > 0);
  }
});

// ── Test 2: IDLE on mount ────────────────────────────────────────────────────
test('SynastryPage on mount: data-state="idle"', () => {
  const app = freshApp();
  SynastryPage(app);
  assert.equal(pageState(app), STATE_IDLE,
    'initial mount state must be IDLE (form rendered, not yet calculated)');
});

// ── Test 3: LOADING → READY on full A+B success ──────────────────────────────
test('runSynastryCalculation: LOADING → READY with full A+B payload', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/synastry': fetchResponse({
      personA:  { western: { bodies: { Sun: { sign: 'Pisces' } } }, bazi: { day_master: { stem: 'Ren' } } },
      personB:  { western: { bodies: { Sun: { sign: 'Pisces' } } }, bazi: { day_master: { stem: 'Yi'  } } },
      synastry: { coherence_index: 75 },
    }),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: INPUT_B });
    assert.equal(pageState(app), STATE_READY, 'final state must be READY');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 4: LOADING → READY solo (Person B empty) ────────────────────────────
test('runSynastryCalculation: solo mode (no inputB) reaches READY via calculateProfile', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/profile': fetchResponse({
      western: { bodies: { Sun: { sign: 'Pisces' } } },
      bazi:    { day_master: { stem: 'Ren' } },
    }),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: null });
    assert.equal(pageState(app), STATE_READY, 'solo-mode must reach READY');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 5: LOADING → EMPTY on ok-but-empty payload ──────────────────────────
test('runSynastryCalculation: LOADING → EMPTY when synastry payload is structurally empty', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/synastry': fetchResponse({}),
    '/api/azodiac/profile':  fetchResponse({}),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: INPUT_B });
    assert.equal(pageState(app), STATE_EMPTY,
      'EMPTY when neither personA nor personB content surfaced');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 6: LOADING → ERROR on ok:false ──────────────────────────────────────
test('runSynastryCalculation: LOADING → ERROR when upstream returns ok:false', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/synastry': fetchResponse({ error: 'upstream-down' }, false, 503),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: INPUT_B });
    assert.equal(pageState(app), STATE_ERROR);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 7: LOADING → ERROR on fetch throw ───────────────────────────────────
test('runSynastryCalculation: LOADING → ERROR when fetch throws', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/synastry': new Error('network-boom'),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: INPUT_B });
    assert.equal(pageState(app), STATE_ERROR);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 8: EMPTY fallback copy ──────────────────────────────────────────────
test('EMPTY state emits explicit fallback copy in DOM aggregate', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/synastry': fetchResponse({}),
    '/api/azodiac/profile':  fetchResponse({}),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: INPUT_B });
    const agg = cap.aggregate();
    assert.ok(/unvollständig|Daten prüfen/i.test(agg),
      'EMPTY-state fallback copy must surface in DOM');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 9b (Sprint-L-followup I1): LOADING is observed mid-flight ──────────
// Original tests only assert terminal state after `await ...` returns. By
// then LOADING has already been overwritten. Spy on setAttribute so the
// transition sequence is captured and asserted in order.
test('runSynastryCalculation: LOADING is written before the terminal state', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/synastry': fetchResponse({
      personA: { western: { bodies: { Sun: { sign: 'Pisces' } } } },
      personB: { western: { bodies: { Sun: { sign: 'Aries'  } } } },
    }),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    const root = app.querySelector('.synastry-page');
    const observed = [];
    const origSetAttribute = root.setAttribute.bind(root);
    root.setAttribute = (k, v) => {
      if (k === 'data-state') observed.push(v);
      origSetAttribute(k, v);
    };
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: INPUT_B });
    assert.deepEqual(observed, [STATE_LOADING, STATE_READY],
      `expected LOADING then READY, got ${JSON.stringify(observed)}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Test 9: data-state attribute is the single state-truth ───────────────────
test('data-state attribute matches currentState after each transition', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({
    '/api/azodiac/synastry': fetchResponse({
      personA: { western: { bodies: { Sun: { sign: 'Pisces' } } } },
      personB: { western: { bodies: { Sun: { sign: 'Aries'  } } } },
    }),
  });
  try {
    const app = freshApp();
    SynastryPage(app);
    assert.equal(pageState(app), STATE_IDLE, 'after mount = IDLE');
    await runSynastryCalculation(app, { inputA: INPUT_A, inputB: INPUT_B });
    assert.equal(pageState(app), STATE_READY, 'after success = READY');
    // Attribute must equal currentState string — no parallel hidden flag.
    const root = app.querySelector('.synastry-page');
    assert.equal(root.getAttribute('data-state'), STATE_READY);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
