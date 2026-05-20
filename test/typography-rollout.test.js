// Sprint H6 — typography rollout: serif headings + sans body + CJK
// + monospace data. Tests verify the CSS file binds the right
// font-family token to each selector.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_CSS   = readFileSync(join(__dirname, '..', 'public', 'src', 'styles', 'main.css'),   'utf8');
const TOKENS_CSS = readFileSync(join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css'), 'utf8');

test('tokens.css declares all 5 font-family tokens (--bz-font-{serif,sans,ui,mono,cjk})', () => {
  for (const f of ['--bz-font-serif', '--bz-font-sans', '--bz-font-ui', '--bz-font-mono', '--bz-font-cjk']) {
    assert.match(TOKENS_CSS, new RegExp(f.replace(/-/g, '\\-')), `tokens.css missing ${f}`);
  }
});

test('tokens.css @imports Cormorant Garamond + Manrope + Inter + JetBrains Mono + Noto Sans SC from Google Fonts', () => {
  // Per user-decision 5 + target spec, all 5 families load via Google Fonts.
  // Escape '+' (URL-encoded space in Google Fonts family= queries) for regex.
  for (const fam of ['Cormorant\\+Garamond', 'Manrope', 'Inter', 'JetBrains\\+Mono', 'Noto\\+Sans\\+SC']) {
    assert.match(TOKENS_CSS, new RegExp(fam), `tokens.css must @import ${fam.replace(/\\\+/g, '+')}`);
  }
});

test('main.css binds serif (Cormorant) to page titles + headings', () => {
  // The block defining .page-title / .layer-title must use --bz-font-serif.
  const blockMatch = MAIN_CSS.match(/\.page-title,\s*\.layer-title[\s\S]{0,400}?font-family:\s*var\(--bz-font-serif/);
  assert.ok(blockMatch, 'main.css must bind --bz-font-serif to .page-title + .layer-title');
});

test('main.css binds CJK (Noto Sans SC) to bazi stem-chars', () => {
  const block = MAIN_CSS.match(/\.bazi-dm-stemchar,\s*\.bazi-pillar-stem-char[\s\S]{0,200}?font-family:\s*var\(--bz-font-cjk/);
  assert.ok(block, 'main.css must bind --bz-font-cjk to .bazi-dm-stemchar + .bazi-pillar-stem-char');
});

test('main.css binds UI (Inter) to eyebrows + secondary-nav tabs', () => {
  const block = MAIN_CSS.match(/\.page-eyebrow,\s*\.layer-eyebrow[\s\S]{0,300}?font-family:\s*var\(--bz-font-ui/);
  assert.ok(block, 'main.css must bind --bz-font-ui to .page-eyebrow + .layer-eyebrow');
});

test('main.css uses tabular-nums for data displays (percentages, orbs)', () => {
  assert.match(MAIN_CSS, /font-variant-numeric:\s*tabular-nums/);
});
