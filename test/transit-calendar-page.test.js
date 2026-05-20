// Smoke C-1 — verify that TransitCalendarPage renders the "7-Tage-Strip mit
// Tagesthemen" exactly once.
//
// Background: the 2026-05-20 browser-smoke captured a screenshot of the
// /transit-calendar route in which the strip section (heading + week strip)
// appeared twice in immediate succession with identical content. Root cause
// suspected in the page's mount + data-promise flow.
//
// This test mounts the page under the capture-DOM stub, mocks the upstream
// fetch so getTransitNow() and getTransitTimeline() resolve with a
// deterministic payload, waits for microtasks to flush, and then asserts
// that the captured aggregate contains the strip heading exactly once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { TransitCalendarPage } = await import('../public/src/pages/TransitCalendarPage.js');

test('TransitCalendarPage: 7-Tage-Strip rendert genau einmal (kein Duplicate)', () => {
  cap.reset();
  const app = global.document.createElement('main');

  // Mock fetch so the two upstream calls inside the page resolve with a
  // deterministic timeline payload. Both /transit/now and /transit/timeline
  // share the same stub — the page only reads days from the timeline call.
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({
      planets: {},
      sector_intensity: new Array(12).fill(0),
      days: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-05-${20 + i}`,
        themes: [],
        planets: {},
        sector_intensity: new Array(12).fill(0),
      })),
    }),
  });

  assert.doesNotThrow(() =>
    TransitCalendarPage(app, { profile: { western: {}, bazi: {}, fusion: {} } })
  );

  // Wait for microtask + macrotask flush — Promise.all in the page resolves
  // through several .then() chains before strip is appended.
  return new Promise((resolve) => setImmediate(() => setImmediate(() => {
    const agg = cap.aggregate();
    const matches = agg.match(/7-Tage-Strip mit Tagesthemen/g) || [];
    assert.equal(
      matches.length,
      1,
      `Expected exactly 1 strip render, got ${matches.length}`,
    );
    resolve();
  })));
});
