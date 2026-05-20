// Sprint H1 — design-tokens coverage guard.
//
// Asserts every CSS custom property (`var(--x)`) referenced inside
// public/src/styles/main.css is defined somewhere in
// public/src/styles/tokens.css — either as a canonical --bz-* token
// or via the legacy-alias bridge appended at the end of tokens.css.
//
// Catches drift the moment main.css starts referencing a var that
// tokens.css doesn't declare. Without this guard, a typo or new
// unprefixed var sneaks in and renders as the CSS engine's "initial"
// value (= broken styling, no error surfaced).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAIN_CSS   = readFileSync(join(__dirname, '..', 'public', 'src', 'styles', 'main.css'),   'utf8');
const TOKENS_CSS = readFileSync(join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css'), 'utf8');

function usedVars(css) {
  // Match `var(--name` ignoring optional fallback comma.
  const re = /var\((--[a-z0-9_-]+)/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(css)) !== null) out.add(m[1]);
  return out;
}

function definedVars(css) {
  // Match `--name:` at any indent level.
  const re = /(--[a-z0-9_-]+)\s*:/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(css)) !== null) out.add(m[1]);
  return out;
}

const used    = usedVars(MAIN_CSS);
const defined = definedVars(TOKENS_CSS);

test('tokens.css defines every CSS variable that main.css consumes', () => {
  const missing = [...used].filter((v) => !defined.has(v));
  assert.deepEqual(missing, [],
    `main.css uses CSS variables not defined in tokens.css: ${missing.join(', ')}.\n` +
    `Add them to tokens.css — either as canonical --bz-* tokens or to the legacy-alias bridge.`);
});

test('tokens.css declares the canonical Bazodiac palette (--bz-obsidian, --bz-gold, --bz-fg-1)', () => {
  for (const expected of ['--bz-obsidian', '--bz-gold', '--bz-gold-light', '--bz-ash', '--bz-fg-1', '--bz-fg-2']) {
    assert.ok(defined.has(expected), `canonical token ${expected} missing from tokens.css`);
  }
});

test('tokens.css declares all 5 Wu-Xing element colors', () => {
  for (const el of ['wood', 'fire', 'earth', 'metal', 'water']) {
    assert.ok(defined.has(`--bz-${el}`),       `WuXing color --bz-${el} missing`);
    assert.ok(defined.has(`--bz-${el}-glow`),  `WuXing glow --bz-${el}-glow missing`);
  }
});

test('tokens.css declares typography stack (font-serif, font-sans, font-ui, font-cjk)', () => {
  for (const f of ['--bz-font-serif', '--bz-font-sans', '--bz-font-ui', '--bz-font-cjk']) {
    assert.ok(defined.has(f), `typography token ${f} missing`);
  }
});

test('legacy-alias bridge resolves every pre-Sprint-H var still consumed by main.css', () => {
  // The 16 generic var-names that pre-Sprint-H main.css references. Each must
  // resolve via tokens.css legacy-alias section (or by being a token itself).
  const legacy = ['--bg','--fg','--text','--muted','--panel','--panel2','--card',
                  '--border','--accent','--accent2','--gold','--gold-light',
                  '--ok','--warn','--bad','--radius'];
  for (const name of legacy) {
    assert.ok(defined.has(name), `legacy alias ${name} must be defined in tokens.css`);
  }
});
