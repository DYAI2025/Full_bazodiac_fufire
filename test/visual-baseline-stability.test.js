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
import { statSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
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

// Re-pinned in Sprint L Phase-5 after the visual-regression sweep gained
// explicit desktop viewport-emulation (1440×900 @ 2× DPR via CDP). Prior
// captures relied on Chrome's natural window-size which varied across
// sweep sessions — those byte values are no longer reproducible. The
// new pins are deterministic: re-running the sweep on any machine with
// browser-harness reproduces these sizes ±compression noise.
const PINNED_DESKTOP_SIZES = {
  bazi:               234876,
  daily:              215544,
  fusion:             225638,
  houses:             226001,
  method:             250765,
  overview:           236705,
  root:               227888,
  synastry:           139888,
  'transit-calendar': 243323,
  western:            251093,
  wuxing:             228958,
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

// Read PNG IHDR width+height directly from bytes 16-23. PNG spec: after
// the 8-byte signature comes a chunk with 4-byte length, 4-byte type
// ("IHDR"), then width+height as big-endian uint32.
function pngDimensions(path) {
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(24);
  readSync(fd, buf, 0, 24, 0);
  closeSync(fd);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('visual-baseline: mobile PNGs render at 375×667 @ 2× DPR', () => {
  // Sprint-K mobile @media must actually take effect — assert mobile
  // captures landed at the emulated 750px width (375 logical × DPR=2)
  // rather than picking up Chrome's natural viewport. This is the
  // structural successor of the old byte-delta heuristic (I3): byte
  // counts can converge by coincidence; PNG dimensions cannot.
  const EXPECTED_MOBILE_W = 750; // 375 × 2 DPR
  for (const r of ROUTES) {
    const { width } = pngDimensions(join(ROOT, 'mobile', `${r}.png`));
    assert.equal(width, EXPECTED_MOBILE_W,
      `mobile/${r}.png width=${width}, expected ${EXPECTED_MOBILE_W} (emulation may not have applied)`);
  }
});

test('visual-baseline: desktop PNGs render at a different width than mobile', () => {
  // Sharpens the "@media took effect" check: desktop captures must use
  // a width that is NOT the mobile-emulation width.
  const MOBILE_W = 750;
  for (const r of ROUTES) {
    const { width } = pngDimensions(join(ROOT, 'desktop', `${r}.png`));
    assert.notEqual(width, MOBILE_W,
      `desktop/${r}.png width=${width} matches mobile — desktop sweep may have run with viewport-emulation still active`);
  }
});
