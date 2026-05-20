// Sprint K — Visual baseline stability.
//
// Two assertions:
//   1. Desktop PNGs after Sprint-K are size-stable vs. the pinned pre-K
//      snapshot (±5%). If any desktop baseline drifts, Sprint-K's CSS
//      additions leaked outside their @media-scoped boundaries.
//   2. All 33 viewport baselines exist + each PNG > 30KB (not blank).
//
// Sizes are pinned to the captures committed in Phase 1 (chore: migrate
// baseline PNGs to desktop/ subfolder, commit 6c?? in this PR). If a
// future deliberate desktop redesign lands, update PINNED_DESKTOP_SIZES
// in the same PR that touches the page CSS — make the drift intentional.

import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '_fixtures', 'visual-baseline');

const ROUTES = [
  'bazi', 'daily', 'fusion', 'houses', 'method',
  'overview', 'root', 'synastry', 'transit-calendar',
  'western', 'wuxing',
];

const VIEWPORTS = ['desktop', 'tablet', 'mobile'];

// Pinned at Phase-1 migration (= pre-Sprint-K capture). These are the
// authoritative desktop sizes the Sprint-K @media work MUST NOT change.
const PINNED_DESKTOP_SIZES = {
  bazi:               151937,
  daily:              218528,
  fusion:             251924,
  houses:             200600,
  method:             200540,
  overview:           232583,
  root:               159874,
  synastry:           84780,
  'transit-calendar': 212798,
  western:            199087,
  wuxing:             187692,
};

const TOLERANCE_PCT = 5;

test('visual-baseline: each of 33 PNGs exists across 3 viewports', () => {
  for (const vp of VIEWPORTS) {
    for (const r of ROUTES) {
      const p = join(ROOT, vp, `${r}.png`);
      assert.ok(existsSync(p), `missing baseline: ${vp}/${r}.png`);
    }
  }
});

test('visual-baseline: each PNG > 30 KB (not blank)', () => {
  for (const vp of VIEWPORTS) {
    for (const r of ROUTES) {
      const p = join(ROOT, vp, `${r}.png`);
      const size = statSync(p).size;
      assert.ok(size > 30_000,
        `${vp}/${r}.png suspiciously small (${size} bytes) — likely blank render`);
    }
  }
});

test('visual-baseline: desktop PNGs within ±5% of pinned size', () => {
  for (const r of ROUTES) {
    const p = join(ROOT, 'desktop', `${r}.png`);
    const actual = statSync(p).size;
    const expected = PINNED_DESKTOP_SIZES[r];
    assert.ok(expected, `no pinned size for ${r}`);
    const deltaPct = Math.abs(actual - expected) / expected * 100;
    assert.ok(deltaPct <= TOLERANCE_PCT,
      `desktop/${r}.png drifted: ${actual} vs pinned ${expected} (${deltaPct.toFixed(1)}%)`);
  }
});

test('visual-baseline: mobile PNGs differ measurably from desktop', () => {
  // Sprint-K mobile @media must actually take effect — assert that mobile
  // PNGs are NOT identical to desktop captures (they should be visually
  // distinct because of stacked grids + smaller fonts).
  for (const r of ROUTES) {
    const desktopSize = statSync(join(ROOT, 'desktop', `${r}.png`)).size;
    const mobileSize  = statSync(join(ROOT, 'mobile',  `${r}.png`)).size;
    const deltaPct = Math.abs(desktopSize - mobileSize) / desktopSize * 100;
    assert.ok(deltaPct >= 5,
      `mobile/${r}.png is suspiciously similar to desktop (${deltaPct.toFixed(1)}% diff) — @media may not have applied`);
  }
});
