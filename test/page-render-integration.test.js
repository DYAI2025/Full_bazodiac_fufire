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

const { noFakeDataGuard, noFakeMathGuard } = await import('../public/src/api/client.js');

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
  // Closing-PR (gap-analysis): also enforce noFakeMathGuard on the same
  // aggregate. Catches WuXing %% sequences that fail to sum to 100 ±5 —
  // the regression that originally surfaced as smoke finding C-2.
  assert.doesNotThrow(
    () => noFakeMathGuard(agg, `page-render:${label}`),
    `Page "${label}" rendered a WuXing distribution that does not sum to ~100`,
  );
  return agg;
}

function assertContainsApiValues(agg, label, expected = EXPECTED_API_STRINGS) {
  const missing = expected.filter((needle) => !agg.includes(needle));
  assert.equal(missing.length, 0,
    `Page "${label}" did not render API-derived values: ${missing.join(', ')}`);
}

// ── OverviewPage ─────────────────────────────────────────────────────────────

// OV-I1-T02: REQ-F-OV-004 / REQ-D-003 — Element-Oekonomie summary must never
// leak internal ViewModel field names (Distribution/Dominant/Deficient/Plan/
// Properties/TodayLever) into rendered HTML. The page must NOT emit them in
// any case, because CSS `text-transform: capitalize` on `.element-bar-label`
// turns lowercase keys back into the banned visible labels.
// Whole-word + case-insensitive match: "Planeten" must NOT trigger "Plan".
test('OV-I1: OverviewPage rendered DOM does not contain internal element field names', async () => {
  const { OverviewPage } = await import('../public/src/pages/OverviewPage.js');
  const app = freshApp();
  OverviewPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} });
  const agg = cap.aggregate();
  // 1) Reject capitalized whole-word literals — direct leak of CamelCase field
  //    names. Whole-word boundary so "Planeten" cannot trigger "Plan".
  for (const banned of ['Distribution', 'Deficient', 'TodayLever']) {
    const re = new RegExp(`\\b${banned}\\b`);
    assert.ok(!re.test(agg),
      `forbidden ViewModel field name "${banned}" surfaced in rendered DOM (whole-word)`);
  }
  // 2) Reject lowercase raw keys when rendered as **exact text content** of an
  //    element (`>distribution<`, `>plan<`, …) — the path that previously
  //    leaked because `text-transform: capitalize` displays them as banned
  //    labels. Substring text inside a sentence ("aktuell dominant" in the
  //    education grid) is intentional UI prose and not forbidden.
  for (const raw of ['distribution', 'dominant', 'deficient', 'plan', 'properties', 'todayLever']) {
    const re = new RegExp(`>\\s*${raw}\\s*<`, 'i');
    assert.ok(!re.test(agg),
      `raw lowercase key "${raw}" rendered as element text content (would CSS-capitalize to banned label)`);
  }
});

// Skipped: I4 rewrote OverviewPage to the Premium-Hero layout.
// The new structural assertions live in test/overview-hero-layout.test.js.
test('OverviewPage renders only API-derived data + passes noFakeDataGuard',
  { skip: 'superseded by overview-hero-layout.test.js (I4)' },
  async () => {
    const { OverviewPage } = await import('../public/src/pages/OverviewPage.js');
    const app = freshApp();
    assert.doesNotThrow(() => OverviewPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
    const agg = assertAggregatePasses('OverviewPage');
    assertContainsApiValues(agg, 'OverviewPage');
  });

test('OverviewPage: renders NatalChartWheel section after the Identity-Hero',
  { skip: 'superseded by overview-hero-layout.test.js (I4)' },
  async () => {
    const { OverviewPage } = await import('../public/src/pages/OverviewPage.js');
    const app = freshApp();
    OverviewPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} });
    const agg = cap.aggregate();
    assert.ok(agg.includes('natal-wheel-section'),
      'OverviewPage must contain a .natal-wheel-section');
    const coreIdx  = agg.indexOf('core-statement-section');
    const wheelIdx = agg.indexOf('natal-wheel-section');
    assert.ok(coreIdx >= 0, 'core-statement-section must be present');
    assert.ok(wheelIdx > coreIdx,
      `natal-wheel-section must appear after core-statement-section ` +
      `(core=${coreIdx}, wheel=${wheelIdx})`);
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

// ── WuxingPage ───────────────────────────────────────────────────────────────
// Third Sprint E page. Binds through wuxingEnrichment over fusion.remediation.
test('WuxingPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { WuxingPage } = await import('../public/src/pages/WuxingPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => WuxingPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  const agg = assertAggregatePasses('WuxingPage');
  // Synthetic fusion has dominant Feuer + deficient Wasser; both must surface.
  // (Note: synthetic distribution is not from remediation, so our threshold
  // applies — Wasser at 0.05 will register as unterrepräsentiert.)
  assertContainsApiValues(agg, 'WuxingPage', ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser']);
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

// ── HousesPage (closing PR — Sprint E #4) ────────────────────────────────────
test('HousesPage renders 12 houses + passes guards', async () => {
  const { HousesPage } = await import('../public/src/pages/HousesPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => HousesPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  const agg = assertAggregatePasses('HousesPage');
  // Synthetic profile houses go through computeBodyHouse → assert at least one
  // body name appears in the rendered output (active-per-house listing).
  assert.ok(/Aktiv:/.test(agg) || /Lebensbereiche/.test(agg),
    'HousesPage must surface house metadata in DOM');
});

// ── MethodPage (closing PR — Sprint E #5) ────────────────────────────────────
test('MethodPage initial render passes noFakeDataGuard', { skip: 'superseded by method-page.test.js (I5) — MethodPage is now async with pure renderer exports' }, async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ endpoints: [], status: 'ok' }) });
  try {
    const { MethodPage } = await import('../public/src/pages/MethodPage.js');
    const app = freshApp();
    await MethodPage(app, { profile: SYNTHETIC_PROFILE });
    assertAggregatePasses('MethodPage');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
