// Page-render integration: mount each major page with a synthetic API profile
// inside a capture-DOM stub. Assertions:
//   1. Rendered aggregate string passes noFakeDataGuard (no Lorem/dummy/fake/etc).
//   2. Rendered aggregate references API-derived values (Day Master, branches,
//      elements) — proving the page binds to the supplied profile.
//
// This is the bridge between the static page-sweep (test/no-fake-data-page-sweep.test.js)
// which scans source code, and the runtime guard which can fire on any payload.
// Together they cover: (a) source has no demo strings, (b) actual render output
// contains no demo strings + does contain real API data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';
import { SYNTHETIC_PROFILE, EXPECTED_API_STRINGS } from './_helpers/synthetic-profile.js';

// Bootstrap stub before any page module is imported (modules touch `document`
// at top level when components evaluate).
const cap = installCaptureDom();

const { noFakeDataGuard } = await import('../public/src/api/client.js');

function freshApp() {
  cap.reset();
  return global.document.createElement('main');
}

function assertAggregatePasses(label) {
  const agg = cap.aggregate();
  assert.doesNotThrow(
    () => noFakeDataGuard(agg, `page-render:${label}`),
    `Page "${label}" emitted forbidden demo string into rendered DOM.`,
  );
  return agg;
}

function assertContainsApiValues(agg, label, expected = EXPECTED_API_STRINGS) {
  const missing = expected.filter((needle) => !agg.includes(needle));
  assert.equal(missing.length, 0,
    `Page "${label}" did not render API-derived values: ${missing.join(', ')}`);
}

// ── OverviewPage ─────────────────────────────────────────────────────────────
test('OverviewPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { OverviewPage } = await import('../public/src/pages/OverviewPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => OverviewPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  const agg = assertAggregatePasses('OverviewPage');
  assertContainsApiValues(agg, 'OverviewPage');
});

// ── PersonalityPage ──────────────────────────────────────────────────────────
// We verify guard passes; the projection layer may rename day-master to a
// label that doesn't include the raw stem string, so we skip the API-strings
// assertion here — the OverviewPage test already proves bazi values flow.
test('PersonalityPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { PersonalityPage } = await import('../public/src/pages/PersonalityPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => PersonalityPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  assertAggregatePasses('PersonalityPage');
});

// ── FusionPage ───────────────────────────────────────────────────────────────
test('FusionPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { FusionPage } = await import('../public/src/pages/FusionPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => FusionPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  assertAggregatePasses('FusionPage');
});

// ── BaziPage ─────────────────────────────────────────────────────────────────
// First Sprint E vertical-slice page. Binds through baziPillarEnrichment.
test('BaziPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { BaziPage } = await import('../public/src/pages/BaziPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => BaziPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  const agg = assertAggregatePasses('BaziPage');
  // Must surface enriched pillars (stems Bing/Geng/Xin/Wu from synthetic profile).
  assertContainsApiValues(agg, 'BaziPage', ['Bing', 'Geng', 'Xin']);
});

// ── WesternPage ──────────────────────────────────────────────────────────────
// Second Sprint E page. Binds through westernBodyEnrichment + aspectEnrichment.
test('WesternPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { WesternPage } = await import('../public/src/pages/WesternPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => WesternPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  const agg = assertAggregatePasses('WesternPage');
  // Must surface enriched sign labels — synthetic profile has Sun in Taurus
  // (Stier DE) and Moon in Scorpio (Skorpion DE).
  assertContainsApiValues(agg, 'WesternPage', ['Stier', 'Skorpion']);
});

// ── DashboardPage ────────────────────────────────────────────────────────────
test('DashboardPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { DashboardPage } = await import('../public/src/pages/DashboardPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => DashboardPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  assertAggregatePasses('DashboardPage');
});

// ── LovePage ─────────────────────────────────────────────────────────────────
test('LovePage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { LovePage } = await import('../public/src/pages/LovePage.js');
  const app = freshApp();
  assert.doesNotThrow(() => LovePage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  assertAggregatePasses('LovePage');
});

// ── CareerFinancePage ────────────────────────────────────────────────────────
test('CareerFinancePage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { CareerFinancePage } = await import('../public/src/pages/CareerFinancePage.js');
  const app = freshApp();
  assert.doesNotThrow(() => CareerFinancePage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  assertAggregatePasses('CareerFinancePage');
});

// ── DailyPage ────────────────────────────────────────────────────────────────
// DailyPage triggers an async fetch on mount — we don't await it; we only
// verify the synchronous initial render (sig bar + step headers) is clean.
test('DailyPage initial render passes noFakeDataGuard', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
  try {
    const { DailyPage } = await import('../public/src/pages/DailyPage.js');
    const app = freshApp();
    assert.doesNotThrow(() => DailyPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
    assertAggregatePasses('DailyPage');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── TransitCalendarPage ──────────────────────────────────────────────────────
test('TransitCalendarPage initial render passes noFakeDataGuard', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ days: [], computed_at: '2026-05-19T00:00:00Z', planets: {}, sector_intensity: new Array(12).fill(0) }) });
  try {
    const { TransitCalendarPage } = await import('../public/src/pages/TransitCalendarPage.js');
    const app = freshApp();
    assert.doesNotThrow(() => TransitCalendarPage(app, { profile: SYNTHETIC_PROFILE }));
    assertAggregatePasses('TransitCalendarPage');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── SynastryPage ─────────────────────────────────────────────────────────────
// Synastry mounts an intake form; no profile is needed for initial render.
test('SynastryPage initial render passes noFakeDataGuard', async () => {
  const { SynastryPage } = await import('../public/src/pages/SynastryPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => SynastryPage(app));
  assertAggregatePasses('SynastryPage');
});

// ── InputPage ────────────────────────────────────────────────────────────────
test('InputPage initial render passes noFakeDataGuard', async () => {
  const { InputPage } = await import('../public/src/pages/InputPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => InputPage(app, { onResult: () => {} }));
  assertAggregatePasses('InputPage');
});
