// test/subpages-typo-consistency.test.js — I6: typography + section contract
// Source-text scan: each subpage must declare bz-h1 (design-token heading class)
// and at least one data-section attribute for visual/test contract consistency.
// RollingText wiring required for all subpages except SynastryPage (deferred —
// 983-line state machine, separate scope).

import { test } from 'node:test';
import assert  from 'node:assert/strict';
import fs      from 'node:fs';
import path    from 'node:path';

const PAGES_DIR = path.resolve('public/src/pages');

const ALL_SUBPAGES = [
  'DailyPage.js',
  'HousesPage.js',
  'FusionPage.js',
  'WuxingPage.js',
  'WesternPage.js',
  'BaziPage.js',
  'SynastryPage.js',
];

const ROLLING_TEXT_REQUIRED = ALL_SUBPAGES.filter(p => p !== 'SynastryPage.js');

function readPage(name) {
  return fs.readFileSync(path.join(PAGES_DIR, name), 'utf8');
}

for (const page of ALL_SUBPAGES) {
  test(`${page}: applies bz-h1 to a heading element`, () => {
    const src = readPage(page);
    assert.match(src, /bz-h1/, `${page} must use bz-h1 design-token class on its hero heading`);
  });

  test(`${page}: declares at least one data-section attribute`, () => {
    const src = readPage(page);
    assert.match(src, /data-section/, `${page} must mark major content sections with data-section`);
  });
}

for (const page of ROLLING_TEXT_REQUIRED) {
  test(`${page}: imports RollingText`, () => {
    const src = readPage(page);
    assert.match(src, /from\s+['"]\.\.\/components\/RollingText\.js['"]/,
      `${page} must import RollingText to animate its hero title`);
  });
}
