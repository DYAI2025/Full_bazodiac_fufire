// Sprint K — breakpoint-constants pinning.
//
// Two-sided pin: the constants must match the CSS custom properties in
// public/src/styles/tokens.css so the JS classifier and the CSS @media
// queries never drift apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  MOBILE_MAX, TABLET_MAX, DESKTOP_MIN, classifyViewport,
} from '../public/src/data/breakpoints.js';

test('breakpoint values are fixed', () => {
  assert.equal(MOBILE_MAX,  480);
  assert.equal(TABLET_MAX,  1024);
  assert.equal(DESKTOP_MIN, 1025);
});

test('breakpoint ladder is non-overlapping', () => {
  // DESKTOP_MIN must equal TABLET_MAX + 1 → no width belongs to two tiers.
  assert.equal(DESKTOP_MIN, TABLET_MAX + 1, 'desktop must start one pixel above tablet-max');
  assert.ok(MOBILE_MAX < TABLET_MAX, 'mobile must be strictly below tablet');
});

test('classifyViewport: boundary widths', () => {
  assert.equal(classifyViewport(320),  'mobile');
  assert.equal(classifyViewport(480),  'mobile');   // upper boundary inclusive
  assert.equal(classifyViewport(481),  'tablet');   // one above mobile
  assert.equal(classifyViewport(768),  'tablet');
  assert.equal(classifyViewport(1024), 'tablet');   // upper boundary inclusive
  assert.equal(classifyViewport(1025), 'desktop');  // one above tablet
  assert.equal(classifyViewport(1440), 'desktop');
  assert.equal(classifyViewport(0),    null);
  assert.equal(classifyViewport(-1),   null);
  assert.equal(classifyViewport(NaN),  null);
  assert.equal(classifyViewport(null), null);
});

test('tokens.css mirrors the breakpoint constants verbatim', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const tokensPath = join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css');
  const css = readFileSync(tokensPath, 'utf8');

  // Sprint K adds CSS custom properties; pin both sides.
  const mobileMatch = css.match(/--bz-bp-mobile-max:\s*(\d+)px/);
  const tabletMatch = css.match(/--bz-bp-tablet-max:\s*(\d+)px/);
  assert.ok(mobileMatch, 'tokens.css must declare --bz-bp-mobile-max');
  assert.ok(tabletMatch, 'tokens.css must declare --bz-bp-tablet-max');
  assert.equal(Number(mobileMatch[1]), MOBILE_MAX,
    `tokens.css --bz-bp-mobile-max (${mobileMatch[1]}) must match JS MOBILE_MAX (${MOBILE_MAX})`);
  assert.equal(Number(tabletMatch[1]), TABLET_MAX,
    `tokens.css --bz-bp-tablet-max (${tabletMatch[1]}) must match JS TABLET_MAX (${TABLET_MAX})`);

  // Also assert at least one @media query uses each boundary.
  assert.ok(/@media\s*\(\s*max-width:\s*480px\s*\)/.test(css),
    'tokens.css must contain @media (max-width: 480px) — the mobile block');
  assert.ok(/@media[^{]*max-width:\s*1024px/.test(css),
    'tokens.css must contain a tablet @media block bounded by 1024px');
});
