// I1 — Token-integrity guard.
//
// Pins the design-system contract that I1 establishes:
//   - --accent must NOT remain the legacy blue/lila (#7c8cff / #a78bfa).
//   - Body must render with the new UI sans (Inter / Plus Jakarta Sans).
//   - Heading utility classes must use the serif/display stack.
//   - Legacy direct color literals must not dominate main.css selectors
//     that drive global appearance (body, .cta-btn, .app-title, headings).
//
// Parses CSS as a string (no jsdom, no live browser). Keeps the test
// environment purely node --test compatible (REQ-A-003).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLES_DIR = join(__dirname, '..', 'public', 'src', 'styles');
const TOKENS_CSS = readFileSync(join(STYLES_DIR, 'tokens.css'), 'utf8');
const MAIN_CSS   = readFileSync(join(STYLES_DIR, 'main.css'),   'utf8');

// ── Helper: find the *effective* value of a custom property in a CSS
//    string. Walks every `--name: <value>;` declaration in source order
//    and returns the LAST one found (cascade approximation for :root).
function lastDeclaration(css, name) {
  const re = new RegExp(`${name}\\s*:\\s*([^;]+);`, 'g');
  let m, last = null;
  while ((m = re.exec(css)) !== null) last = m[1].trim();
  return last;
}

// ── Helper: lowercase hex extraction (handles #abc and #aabbcc forms).
function hexesIn(value) {
  if (!value) return [];
  return (value.match(/#[0-9a-f]{3,8}/gi) || []).map((h) => h.toLowerCase());
}

// ── Forbidden legacy literals: pre-I1 blue/lila accent palette.
const LEGACY_ACCENTS = new Set([
  '#7c8cff', // legacy --accent
  '#a78bfa', // legacy --accent2
  '#6366f1', // indigo-500 (prototype CTA)
  '#8b5cf6', // violet-500
]);

test('--accent does not resolve to legacy blue/lila literal', () => {
  const accentDecl = lastDeclaration(TOKENS_CSS, '--accent');
  assert.ok(accentDecl, '--accent must be declared in tokens.css');
  for (const hex of hexesIn(accentDecl)) {
    assert.ok(!LEGACY_ACCENTS.has(hex),
      `--accent still contains legacy literal ${hex}; expected --bz-gold / --bz-ember reference`);
  }
});

test('main.css does not redeclare --accent with a legacy literal', () => {
  const accentDecl = lastDeclaration(MAIN_CSS, '--accent');
  if (accentDecl) {
    for (const hex of hexesIn(accentDecl)) {
      assert.ok(!LEGACY_ACCENTS.has(hex),
        `main.css still redefines --accent with legacy literal ${hex}`);
    }
  }
});

test('body rule uses the UI sans font token (--bz-font-ui or --bz-font-sans)', () => {
  const bodyRule = MAIN_CSS.match(/body\s*\{[^}]+\}/);
  assert.ok(bodyRule, 'main.css must declare a body { } block');
  const block = bodyRule[0];
  const usesToken = /var\(--bz-font-(ui|sans)\)/.test(block);
  assert.ok(usesToken,
    `body { } must reference var(--bz-font-ui) or var(--bz-font-sans); got: ${block}`);
});

test('heading utility classes (.bz-h1, .bz-h2, .bz-display) use the serif token', () => {
  for (const cls of ['.bz-display', '.bz-h1', '.bz-h2', '.bz-h3']) {
    const re = new RegExp(`${cls.replace('.', '\\.')}\\s*\\{[^}]+\\}`);
    const block = TOKENS_CSS.match(re);
    assert.ok(block, `${cls} utility class must be declared in tokens.css`);
    assert.ok(/var\(--bz-font-serif\)/.test(block[0]),
      `${cls} must reference var(--bz-font-serif); got: ${block[0]}`);
  }
});

test('main.css uses tokens for global body styling — no raw #7c8cff/#a78bfa anywhere', () => {
  const offenders = hexesIn(MAIN_CSS).filter((h) => LEGACY_ACCENTS.has(h));
  assert.deepEqual(offenders, [],
    `main.css still contains legacy accent literals: ${offenders.join(', ')}. ` +
    `Replace with var(--bz-gold) / var(--bz-accent) or remove.`);
});

test('tokens.css declares the new premium accent token (--bz-accent → gold family)', () => {
  const accentChain = lastDeclaration(TOKENS_CSS, '--bz-accent');
  assert.ok(accentChain, '--bz-accent must be declared');
  const referencesGold = /var\(--bz-(gold|ember|amber)/.test(accentChain);
  assert.ok(referencesGold,
    `--bz-accent must reference the premium gold/ember family; got: ${accentChain}`);
});
