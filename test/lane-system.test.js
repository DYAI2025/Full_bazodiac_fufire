// Sprint H2 — three-lane system: data-lane attribute per page + lane
// recipe tokens in tokens.css.
//
// Each Sprint-E page (BaZi / Western / WuXing / Fusion) must carry the
// correct `data-lane` attribute on its <main> so the cascading lane
// tokens (`--lane-fg`, `--lane-border`, ...) bind to the right chromatic
// identity. Verifies BOTH the page-render side (attribute present) AND
// the tokens side (lane recipes declared).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const __dirname  = dirname(fileURLToPath(import.meta.url));
const TOKENS_CSS = readFileSync(join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css'), 'utf8');
const MAIN_CSS   = readFileSync(join(__dirname, '..', 'public', 'src', 'styles', 'main.css'),   'utf8');

const lina = JSON.parse(readFileSync(
  join(__dirname, '_fixtures', 'upstream-snapshots', 'profile.real.json'), 'utf8'
));

function freshApp() { cap.reset(); return global.document.createElement('main'); }
function aggregate() { return cap.aggregate(); }

// ── data-lane attribute on each page's <main> ──────────────────────────

test('BaziPage <main> carries data-lane="bazi"', async () => {
  const { BaziPage } = await import('../public/src/pages/BaziPage.js');
  const app = freshApp();
  BaziPage(app, { profile: lina, onNavigate: () => {} });
  assert.match(aggregate(), /data-lane="bazi"/);
});

test('WesternPage <main> carries data-lane="west"', async () => {
  const { WesternPage } = await import('../public/src/pages/WesternPage.js');
  const app = freshApp();
  WesternPage(app, { profile: lina, onNavigate: () => {} });
  assert.match(aggregate(), /data-lane="west"/);
});

test('WuxingPage <main> carries data-lane="wuxing"', async () => {
  const { WuxingPage } = await import('../public/src/pages/WuxingPage.js');
  const app = freshApp();
  WuxingPage(app, { profile: lina, onNavigate: () => {} });
  assert.match(aggregate(), /data-lane="wuxing"/);
});

test('FusionPage <main> carries data-lane="fusion"', async () => {
  const { FusionPage } = await import('../public/src/pages/FusionPage.js');
  const app = freshApp();
  FusionPage(app, { profile: lina, onNavigate: () => {} });
  assert.match(aggregate(), /data-lane="fusion"/);
});

// ── tokens.css declares lane recipe selectors + the --lane-* family ──

test('tokens.css declares [data-lane="bazi|west|fusion|wuxing"] recipe blocks', () => {
  for (const lane of ['bazi', 'west', 'fusion', 'wuxing']) {
    const re = new RegExp(`\\[data-lane="${lane}"\\]\\s*\\{`);
    assert.match(TOKENS_CSS, re, `tokens.css must declare [data-lane="${lane}"] recipe block`);
  }
});

test('tokens.css declares the --lane-* token family at :root scope', () => {
  // Default lane tokens (fallback when no [data-lane] active).
  for (const token of ['--lane-fg', '--lane-fg-2', '--lane-bg', '--lane-border', '--lane-glow']) {
    assert.match(TOKENS_CSS, new RegExp(token.replace(/-/g, '\\-')),
      `tokens.css must declare ${token}`);
  }
});

// ── main.css consumes lane tokens (not hard-coded gold/saphir) ────────

test('main.css consumes --lane-* tokens for lane-scoped styling', () => {
  // Must reference at least --lane-fg AND --lane-border (the two most
  // visible lane signals: text color + chrome).
  assert.match(MAIN_CSS, /var\(--lane-fg\b/,    'main.css must use var(--lane-fg) for lane-tinted text');
  assert.match(MAIN_CSS, /var\(--lane-border/,  'main.css must use var(--lane-border) for lane chrome');
});

// ── design-tokens-coverage guard from H1 still holds after recipes ────

test('every --lane-* var consumed by main.css resolves in tokens.css', () => {
  const usedLane = new Set([...MAIN_CSS.matchAll(/var\((--lane-[a-z0-9_-]+)/gi)].map((m) => m[1]));
  const defined  = new Set([...TOKENS_CSS.matchAll(/(--lane-[a-z0-9_-]+)\s*:/gi)].map((m) => m[1]));
  const missing  = [...usedLane].filter((v) => !defined.has(v));
  assert.deepEqual(missing, [], `unmapped --lane-* vars: ${missing.join(', ')}`);
});
