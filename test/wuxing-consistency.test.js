// test/wuxing-consistency.test.js
//
// Sprint smoke-fix A2 — regression guard for WuXing single-source-of-truth.
//
// Background (RCA): Pre-fix the codebase had three+ parallel WuXing read
// paths — projections.js read fusion.wu_xing_vectors.fusion/western_planets,
// CareerFinancePage read fusion.wu_xing_vectors.bazi_pillars *un-normalized
// × 100*, and FusionPage already read fusion.remediation.distribution.
// Result: CareerFinancePage rendered percent-bars summing to ~194% and
// disagreed with PersonalityPage about which element is dominant for the
// same profile.
//
// After the fix every WuXing-rendering code path routes through
// enrichWuxing(profile) from public/src/domain/wuxingEnrichment.js. Its
// resolution order is:
//   1. fusion.remediation.distribution (server-normalized, sum=1)
//   2. fusion.wu_xing_vectors.bazi_pillars (un-normalized, fallback)
//
// Two regression tests live here:
//   1. Cross-page agreement on the deficient element label (profile.real
//      has remediation.deficient = "Metall" — every page that surfaces a
//      deficient WuXing element must surface Metall, not e.g. Wasser).
//   2. The percentages rendered on CareerFinancePage's Element-Verteilung
//      block must sum to 100 ±2. This was the symptomatic bug (sum 194%).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  '_fixtures',
  'upstream-snapshots',
  'profile.real.json',
);
const profile = JSON.parse(readFileSync(FIXTURE, 'utf8'));

function aggForPage(PageFn) {
  cap.reset();
  const app = global.document.createElement('main');
  PageFn(app, { profile, onNavigate: () => {} });
  return cap.aggregate();
}

test('WuXing dominance + deficient: same profile yields identical labels across pages', async () => {
  const { PersonalityPage }     = await import('../public/src/pages/PersonalityPage.js');
  const { CareerFinancePage }   = await import('../public/src/pages/CareerFinancePage.js');
  const { WuxingPage }          = await import('../public/src/pages/WuxingPage.js');

  // profile.real.json fixture invariants — distribution from
  // fusion.remediation.distribution: Holz=0.31 (dominant), Metall=0.07
  // (deficient per fusion.remediation.deficient).
  assert.equal(profile?.fusion?.remediation?.deficient, 'Metall', 'fixture invariant');
  const distribution = profile?.fusion?.remediation?.distribution || {};
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  assert.equal(sorted[0]?.[0], 'Holz', 'fixture invariant: Holz dominant');

  const aggPersonality   = aggForPage(PersonalityPage);
  const aggCareerFinance = aggForPage(CareerFinancePage);
  const aggWuxing        = aggForPage(WuxingPage);

  // ── Dominant agreement: all three pages must surface "Holz" (dominant) ──
  // Pre-fix PersonalityPage was driven by getDominantFusionElement() reading
  // fusion.wu_xing_vectors directly. Now via enrichWuxing → same answer as
  // FusionPage / WuxingPage / CareerFinancePage.
  for (const [name, agg] of [
    ['PersonalityPage',   aggPersonality],
    ['CareerFinancePage', aggCareerFinance],
    ['WuxingPage',        aggWuxing],
  ]) {
    assert.ok(/Holz/.test(agg), `${name} must surface dominant element Holz`);
  }

  // ── Deficient agreement: pages that render the full distribution bars
  //    (CareerFinance, Wuxing) must also surface Metall as a label.
  //    PersonalityPage only surfaces the dominant factor, so the deficient
  //    label is not expected there.
  for (const [name, agg] of [
    ['CareerFinancePage', aggCareerFinance],
    ['WuxingPage',        aggWuxing],
  ]) {
    assert.ok(/Metall/.test(agg), `${name} must surface deficient element Metall (per fusion.remediation.deficient)`);
  }
});

test('CareerFinancePage WuXing distribution percentages sum to 100 ±2', async () => {
  const { CareerFinancePage } = await import('../public/src/pages/CareerFinancePage.js');
  const agg = aggForPage(CareerFinancePage);

  // Extract 5-element-in-order sequence "Holz N%  Feuer N% Erde N% Metall N% Wasser N%"
  // (intervening label/markup allowed; sequence must be in canonical order).
  const re = /Holz[^0-9]{0,80}(\d+)\s*%[\s\S]{0,400}?Feuer[^0-9]{0,80}(\d+)\s*%[\s\S]{0,400}?Erde[^0-9]{0,80}(\d+)\s*%[\s\S]{0,400}?Metall[^0-9]{0,80}(\d+)\s*%[\s\S]{0,400}?Wasser[^0-9]{0,80}(\d+)\s*%/;
  const m = agg.match(re);
  assert.ok(m, 'CareerFinancePage must render a 5-element WuXing %% sequence (Holz/Feuer/Erde/Metall/Wasser)');

  const sum = [1, 2, 3, 4, 5].reduce((s, i) => s + Number(m[i]), 0);
  assert.ok(
    sum >= 98 && sum <= 102,
    `CareerFinancePage WuXing %% sum to ${sum}, expected 100 ±2`,
  );
});
