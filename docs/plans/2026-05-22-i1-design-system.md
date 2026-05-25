# I1 — Design-System & Legacy-CSS Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Design-System entkoppeln und Legacy-CSS brechen. Sichtbarer Nutzer-Unterschied: App sieht nicht mehr wie alter Prototyp aus. Abschluss nur wenn Fonts, Farben, Spacing, Cards, Header global sichtbar geaendert sind.

**Goal:** Konsolidiere tokens.css als einzige Design-Quelle, eliminiere Legacy-Accent-Werte, führe PageShell/SectionHeader/LuxuryCard als geteilte Bausteine ein.

**Architecture:** Tokens-first CSS; legacy fallback rules removed or token-mapped; component layer is vanilla-ESM factories that return DOM nodes (no JSX, no framework).

**Tech Stack:** CSS custom properties, Google Fonts (preconnect link), vanilla ESM components, node --test.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0 (Playwright-Gate) abgeschlossen.

---

## TASK-I1-001 — Legacy-CSS-Konflikte testbar machen

**Iterationsziel-Bezug:** Bevor wir Tokens umschreiben, brauchen wir Failing-Tests, die das alte Blau/Lila als Vertragsverletzung markieren. Ohne Failing-Test besteht das Risiko, dass eine spätere Iteration unbemerkt das Legacy-Layer wieder einschleppt.

**Requirements:** REQ-A-003 (vanilla ESM bleibt — Tests sind reine Node-`fs`-Reads, kein JSDOM/Browser).

**Files:**
- modify `test/design-tokens-coverage.test.js`
- create `test/css-token-integrity.test.js`

### Step 1 — Write failing test: css-token-integrity (2 min)

Create `test/css-token-integrity.test.js` with the following content. The test parses tokens.css + main.css as raw strings (`fs.readFileSync`), pins the *new* premium accent and font stack, and fails *before* TASK-I1-002 runs.

```javascript
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
  // The legacy bridge in tokens.css declares --accent. After I1 it must
  // resolve to a premium gold/ember token, never to #7c8cff/#a78bfa.
  const accentDecl = lastDeclaration(TOKENS_CSS, '--accent');
  assert.ok(accentDecl, '--accent must be declared in tokens.css');
  for (const hex of hexesIn(accentDecl)) {
    assert.ok(!LEGACY_ACCENTS.has(hex),
      `--accent still contains legacy literal ${hex}; expected --bz-gold / --bz-ember reference`);
  }
});

test('main.css does not redeclare --accent with a legacy literal', () => {
  // main.css used to ship its own :root override with --accent: #7c8cff.
  // After I1 that block is either removed or maps to --bz-* tokens.
  const accentDecl = lastDeclaration(MAIN_CSS, '--accent');
  if (accentDecl) {
    for (const hex of hexesIn(accentDecl)) {
      assert.ok(!LEGACY_ACCENTS.has(hex),
        `main.css still redefines --accent with legacy literal ${hex}`);
    }
  }
});

test('body rule uses the UI sans font token (--bz-font-ui or --bz-font-sans)', () => {
  // Match the body rule block in main.css and assert it references a
  // token rather than hard-coding "Inter".
  const bodyRule = MAIN_CSS.match(/body\s*\{[^}]+\}/);
  assert.ok(bodyRule, 'main.css must declare a body { } block');
  const block = bodyRule[0];
  const usesToken = /var\(--bz-font-(ui|sans)\)/.test(block);
  assert.ok(usesToken,
    `body { } must reference var(--bz-font-ui) or var(--bz-font-sans); got: ${block}`);
});

test('heading utility classes (.bz-h1, .bz-h2, .bz-display) use the serif token', () => {
  // Pin that no later refactor swaps the headline stack back to a sans.
  for (const cls of ['.bz-display', '.bz-h1', '.bz-h2', '.bz-h3']) {
    const re = new RegExp(`${cls.replace('.', '\\.')}\\s*\\{[^}]+\\}`);
    const block = TOKENS_CSS.match(re);
    assert.ok(block, `${cls} utility class must be declared in tokens.css`);
    assert.ok(/var\(--bz-font-serif\)/.test(block[0]),
      `${cls} must reference var(--bz-font-serif); got: ${block[0]}`);
  }
});

test('main.css uses tokens for global body styling — no raw #7c8cff/#a78bfa anywhere', () => {
  // Catch any straggling literal.
  const offenders = hexesIn(MAIN_CSS).filter((h) => LEGACY_ACCENTS.has(h));
  assert.deepEqual(offenders, [],
    `main.css still contains legacy accent literals: ${offenders.join(', ')}. ` +
    `Replace with var(--bz-gold) / var(--bz-accent) or remove.`);
});

test('tokens.css declares the new premium accent token (--bz-accent → gold family)', () => {
  // --bz-accent must resolve via the chain to one of the gold tokens.
  const accentChain = lastDeclaration(TOKENS_CSS, '--bz-accent');
  assert.ok(accentChain, '--bz-accent must be declared');
  const referencesGold = /var\(--bz-(gold|ember|amber)/.test(accentChain);
  assert.ok(referencesGold,
    `--bz-accent must reference the premium gold/ember family; got: ${accentChain}`);
});
```

### Step 2 — Extend design-tokens-coverage.test.js (1 min)

Append the following test block to the existing file. This pins that the *legacy alias* bridge keeps `--accent` defined (we still resolve it for old selectors during the migration) but routes it through a `--bz-*` token, not a literal.

```javascript
test('legacy --accent alias must route through a --bz-* token, not a literal', () => {
  const m = TOKENS_CSS.match(/--accent\s*:\s*([^;]+);/g);
  assert.ok(m && m.length > 0, '--accent must be declared at least once');
  const lastDecl = m[m.length - 1];
  assert.ok(/var\(--bz-/.test(lastDecl),
    `final --accent declaration must reference a --bz-* token; got: ${lastDecl}`);
});
```

### Step 3 — Run the new test, confirm failure (1 min)

```bash
node --test test/css-token-integrity.test.js
```

Expected: at least the first, fourth, and last `test(...)` cases fail because (a) `--accent` still resolves to `--bz-gold` only by accident in tokens.css but main.css overrides it with `#7c8cff`, (b) `body { font: 14px/1.6 'Inter', ... }` hard-codes the family literally, (c) `--bz-accent` is not declared at all.

### Step 4 — Commit failing tests (1 min)

```bash
git add test/css-token-integrity.test.js test/design-tokens-coverage.test.js
git commit -m "test(i1): pin premium accent + serif heading contract (failing)"
```

---

## TASK-I1-002 — Design-Tokens konsolidieren

**Iterationsziel-Bezug:** Sichtbare Veränderung kommt aus drei Hebeln: (1) Accent wechselt von Blau/Lila auf Gold/Ember, (2) UI-Font wechselt auf Inter/Plus Jakarta Sans, (3) Headings wechseln auf Playfair Display / DM Serif Display. Diese Iteration setzt alle drei sichtbar — testpinned aus TASK-I1-001.

**Requirements:** REQ-F-004 (Hero auf Overview erkennbar), REQ-A-003 (vanilla CSS, kein Build-Step).

**Files:**
- modify `public/src/styles/tokens.css`
- modify `public/src/styles/main.css`

### Step 1 — Add premium accent + new font tokens (3 min)

Edit `public/src/styles/tokens.css`. Inside the existing `:root { … }` block (right after the Gold palette comment, around line 22), add the new accent family and replace the Google Fonts import URL on line 7 with the new stack.

Replace the existing `@import url("https://fonts.googleapis.com/css2?...")` line with:

```css
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@300;400;500&display=swap");
```

Inside `:root`, after `--bz-gold-glow: rgba(212, 175, 55, 0.4);`, add the premium-ember accent family:

```css
  /* I1 — Premium Accent (warm gold/ember replaces legacy blue/lila) */
  --bz-ember:         #E8893D;
  --bz-ember-light:   #FFB070;
  --bz-ember-deep:    #8B4513;
  --bz-amber:         #F0B860;
```

Replace the existing typography token block (the one starting `--bz-font-serif: "Cormorant Garamond"` around line 65) with:

```css
  /* ── TYPOGRAPHY (I1: serif → Playfair / DM Serif Display, UI → Inter / Plus Jakarta) */
  --bz-font-serif:    "Playfair Display", "DM Serif Display", ui-serif, Georgia, "Times New Roman", serif;
  --bz-font-display:  "DM Serif Display", "Playfair Display", ui-serif, Georgia, serif;
  --bz-font-sans:     "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --bz-font-ui:       "Inter", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --bz-font-mono:     "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --bz-font-cjk:      "Noto Sans SC", ui-sans-serif, system-ui, sans-serif;
```

Update the `--bz-accent` declaration so the integrity test passes — locate the line:

```css
  --bz-accent:        var(--bz-gold);
```

…and replace with:

```css
  --bz-accent:        var(--bz-gold);              /* ember + gold blend, see lane-bridge */
  --bz-accent-warm:   var(--bz-ember);
  --bz-accent-soft:   var(--bz-amber);
```

In the legacy-alias bridge (around line 200), replace:

```css
  --accent:       var(--bz-gold);
  --accent2:      var(--bz-saphir);
```

…with:

```css
  --accent:       var(--bz-gold);
  --accent2:      var(--bz-ember);
```

(`--accent2` was the legacy violet — now ember.)

### Step 2 — Strip legacy :root override from main.css (2 min)

`public/src/styles/main.css` currently opens with its own `:root { … }` block (lines 1–15) that hard-codes `--bg: #08090d; --accent: #7c8cff;` etc. and **wins the cascade** against tokens.css because main.css loads second.

Replace lines 1–15 (the entire opening `:root { … }` block) with a token-routed redeclaration so legacy selectors keep working but every value resolves through `--bz-*`:

```css
/* I1: main.css no longer ships its own palette literals. Every legacy
   var falls back through tokens.css. Kept here as comments so future
   greps land on the right file. */
:root {
  color-scheme: dark;
  /* --bg, --panel, --text, --accent, --radius are inherited from
     tokens.css legacy-alias bridge. Do not redeclare with literals. */
}
```

### Step 3 — Update body + headings + CTA in main.css to use tokens (3 min)

Replace the existing `body { … }` block:

```css
body {
  background: var(--bg);
  color: var(--text);
  font: 14px/1.6 'Inter', ui-sans-serif, system-ui, sans-serif;
  min-height: 100vh;
}
```

…with:

```css
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--bz-font-ui);
  font-size: var(--bz-body);
  line-height: var(--bz-lh-body);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

Replace `.app-title`:

```css
.app-title { font-size: 2rem; font-weight: 800; letter-spacing: -.03em; color: var(--accent); }
```

…with:

```css
.app-title {
  font-family: var(--bz-font-display);
  font-size: var(--bz-h1);
  font-weight: 600;
  letter-spacing: var(--bz-ls-display);
  color: var(--bz-gold-light);
  line-height: var(--bz-lh-display);
}
```

Replace `.cta-btn` block so the button uses gold instead of blue:

```css
.cta-btn {
  background: linear-gradient(135deg, var(--bz-gold) 0%, var(--bz-ember) 100%);
  color: var(--bz-obsidian);
  border: 1px solid var(--bz-gold-antique);
  border-radius: var(--bz-radius-full);
  padding: 12px 28px;
  font-family: var(--bz-font-ui);
  font-size: var(--bz-body);
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform var(--bz-dur-fast) var(--bz-ease-out),
              box-shadow var(--bz-dur-fast) var(--bz-ease-out);
  box-shadow: var(--bz-shadow-tile);
}
.cta-btn:disabled { opacity: .4; cursor: not-allowed; }
.cta-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: var(--bz-glow-hover); }
```

### Step 4 — Run integrity test + coverage test, confirm pass (1 min)

```bash
node --test test/css-token-integrity.test.js
node --test test/design-tokens-coverage.test.js
```

Expected: both files now pass. If `design-tokens-coverage.test.js` flags `--bz-accent-warm` / `--bz-ember` as undefined in main.css usage (unlikely, main.css doesn't reference them yet), revisit step 1 and ensure declarations sit inside the `:root` block.

### Step 5 — Run full test suite to catch downstream breakage (2 min)

```bash
npm test
```

Expected: green. If `breakpoints.test.js`, `lane-system.test.js`, or another CSS guard fails because we touched neighbouring lines, fix the regression before continuing.

### Step 6 — Commit (1 min)

```bash
git add public/src/styles/tokens.css public/src/styles/main.css
git commit -m "feat(i1): premium gold/ember accent + Playfair/Inter typography"
```

---

## TASK-I1-003 — Gemeinsame Layout-/Typografie-Komponenten einführen

**Iterationsziel-Bezug:** Tokens allein machen nicht "App sieht anders aus". Wir brauchen *strukturelle* Bausteine, die jede Page-Module benutzt, damit Header, Spacing, Card-Look identisch erscheinen. Pilot auf Overview + Method, damit das visuelle Delta sofort erkennbar ist.

**Requirements:** REQ-F-004 (Overview Ziel-Hero), REQ-F-006 (Details erreichbar — SectionHeader trägt Anchor + Subline), REQ-A-003 (vanilla ESM, factory + createElement, kein Framework).

**Files:**
- create `public/src/components/PageShell.js`
- create `public/src/components/SectionHeader.js`
- create `public/src/components/LuxuryCard.js`
- create `test/page-shell.test.js`
- create `test/section-header.test.js`
- create `test/luxury-card.test.js`
- modify `public/src/pages/OverviewPage.js` (pilot only — wrap top of render in PageShell, swap one section to SectionHeader, swap one card cluster to LuxuryCard)
- modify `public/src/pages/MethodPage.js` (pilot — same shell + one SectionHeader + one LuxuryCard)

### Step 1 — Write failing test: PageShell (3 min)

Create `test/page-shell.test.js`:

```javascript
// I1 — PageShell vanilla-ESM factory test.
//
// PageShell is the outer wrapper every page uses. It owns:
//   - the .page-shell root with role="main"
//   - an optional eyebrow (small UPPERCASE label)
//   - a serif headline (h1)
//   - an optional subline (UI sans, muted)
//   - a body slot (the page's actual content goes here)
//
// Component is vanilla ESM, returns DOM nodes via document.createElement,
// works in the capture-DOM stub environment (no real browser).

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { PageShell } = await import('../public/src/components/PageShell.js');

test('PageShell: returns a DOM node with .page-shell class', () => {
  cap.reset();
  const node = PageShell({ headline: 'Übersicht' });
  assert.ok(node, 'PageShell must return a node');
  assert.ok(node.classList.contains('page-shell'),
    'root must carry .page-shell class');
});

test('PageShell: root has role="main" for landmark a11y', () => {
  const node = PageShell({ headline: 'X' });
  assert.equal(node.getAttribute('role'), 'main');
});

test('PageShell: headline rendered as h1 inside .page-shell__title', () => {
  const node = PageShell({ headline: 'Dein Sternfeld' });
  const titles = node.querySelectorAll('[data-page-title]');
  assert.equal(titles.length, 1, 'exactly one [data-page-title]');
  assert.equal(titles[0].tag, 'h1');
  assert.equal(titles[0].textContent, 'Dein Sternfeld');
});

test('PageShell: eyebrow rendered when provided', () => {
  const node = PageShell({ eyebrow: 'KAPITEL 1', headline: 'X' });
  const ey = node.querySelectorAll('[data-page-eyebrow]');
  assert.equal(ey.length, 1);
  assert.equal(ey[0].textContent, 'KAPITEL 1');
});

test('PageShell: subline rendered when provided', () => {
  const node = PageShell({ headline: 'X', subline: 'Was du heute weißt.' });
  const subs = node.querySelectorAll('[data-page-subline]');
  assert.equal(subs.length, 1);
  assert.equal(subs[0].textContent, 'Was du heute weißt.');
});

test('PageShell: returns body slot via .body property for append', () => {
  const node = PageShell({ headline: 'X' });
  assert.ok(node.body, 'PageShell must expose a .body slot');
  const child = global.document.createElement('section');
  child.textContent = 'content';
  node.body.appendChild(child);
  assert.equal(node.body._children.length, 1);
  assert.equal(node.body._children[0].textContent, 'content');
});

test('PageShell: no eyebrow / no subline → no empty placeholder nodes', () => {
  const node = PageShell({ headline: 'X' });
  assert.equal(node.querySelectorAll('[data-page-eyebrow]').length, 0);
  assert.equal(node.querySelectorAll('[data-page-subline]').length, 0);
});
```

### Step 2 — Run, confirm failure (1 min)

```bash
node --test test/page-shell.test.js
```

Expected: `Cannot find module '../public/src/components/PageShell.js'`.

### Step 3 — Implement PageShell (3 min)

Create `public/src/components/PageShell.js`:

```javascript
// public/src/components/PageShell.js
// I1 — Outer page wrapper used by every route. Owns the eyebrow + serif
// headline + subline + body slot. Vanilla ESM, no innerHTML, works in
// the capture-DOM stub used by node --test.
//
// Usage:
//   const shell = PageShell({
//     eyebrow: 'KAPITEL 1',
//     headline: 'Dein Sternfeld',
//     subline: 'Was deine Geburt über deinen Weg verrät.',
//   });
//   shell.body.appendChild(myContentNode);
//   mountTarget.appendChild(shell);

export function PageShell({
  eyebrow = '',
  headline = '',
  subline = '',
  variant = 'default',  // 'default' | 'hero'
} = {}) {
  const root = document.createElement('section');
  root.classList.add('page-shell');
  if (variant === 'hero') root.classList.add('page-shell--hero');
  root.setAttribute('role', 'main');

  const header = document.createElement('header');
  header.classList.add('page-shell__header');

  if (eyebrow) {
    const ey = document.createElement('p');
    ey.classList.add('page-shell__eyebrow');
    ey.classList.add('bz-overline');
    ey.setAttribute('data-page-eyebrow', '');
    ey.textContent = eyebrow;
    header.appendChild(ey);
  }

  const title = document.createElement('h1');
  title.classList.add('page-shell__title');
  title.classList.add('bz-h1');
  title.setAttribute('data-page-title', '');
  title.textContent = headline;
  header.appendChild(title);

  if (subline) {
    const sub = document.createElement('p');
    sub.classList.add('page-shell__subline');
    sub.classList.add('bz-body');
    sub.setAttribute('data-page-subline', '');
    sub.textContent = subline;
    header.appendChild(sub);
  }

  root.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('page-shell__body');
  root.appendChild(body);

  // Expose the body slot for direct appendChild from callers.
  root.body = body;

  return root;
}
```

### Step 4 — Run, confirm pass (1 min)

```bash
node --test test/page-shell.test.js
```

Expected: all 7 tests pass.

### Step 5 — Write failing test: SectionHeader (2 min)

Create `test/section-header.test.js`:

```javascript
// I1 — SectionHeader vanilla-ESM factory test.
//
// SectionHeader is the in-page section divider: eyebrow + serif h2 +
// optional subline + optional anchor id (REQ-F-006 — Details erreichbar
// via deep-link anchors).

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { SectionHeader } = await import('../public/src/components/SectionHeader.js');

test('SectionHeader: returns .section-header DOM node', () => {
  cap.reset();
  const node = SectionHeader({ headline: 'Persönlichkeit' });
  assert.ok(node.classList.contains('section-header'));
});

test('SectionHeader: headline is h2 with serif token class .bz-h2', () => {
  const node = SectionHeader({ headline: 'Karriere & Finanzen' });
  const titles = node.querySelectorAll('[data-section-title]');
  assert.equal(titles.length, 1);
  assert.equal(titles[0].tag, 'h2');
  assert.ok(titles[0].classList.contains('bz-h2'));
  assert.equal(titles[0].textContent, 'Karriere & Finanzen');
});

test('SectionHeader: anchor id set on root when provided (REQ-F-006)', () => {
  const node = SectionHeader({ headline: 'X', anchor: 'persoenlichkeit' });
  assert.equal(node.getAttribute('id'), 'persoenlichkeit');
});

test('SectionHeader: lane attribute forwarded to root (data-lane)', () => {
  const node = SectionHeader({ headline: 'X', lane: 'bazi' });
  assert.equal(node.getAttribute('data-lane'), 'bazi');
});

test('SectionHeader: eyebrow + subline rendered when provided', () => {
  const node = SectionHeader({
    eyebrow: 'OST · BaZi',
    headline: 'Säulenanalyse',
    subline: 'Vier Säulen, vier Lebensphasen.',
  });
  const ey = node.querySelectorAll('[data-section-eyebrow]');
  const sub = node.querySelectorAll('[data-section-subline]');
  assert.equal(ey.length, 1);
  assert.equal(sub.length, 1);
  assert.equal(ey[0].textContent, 'OST · BaZi');
  assert.equal(sub[0].textContent, 'Vier Säulen, vier Lebensphasen.');
});

test('SectionHeader: no eyebrow / no subline → no empty nodes', () => {
  const node = SectionHeader({ headline: 'Nur Titel' });
  assert.equal(node.querySelectorAll('[data-section-eyebrow]').length, 0);
  assert.equal(node.querySelectorAll('[data-section-subline]').length, 0);
});
```

### Step 6 — Run, confirm failure (1 min)

```bash
node --test test/section-header.test.js
```

Expected: module-not-found.

### Step 7 — Implement SectionHeader (3 min)

Create `public/src/components/SectionHeader.js`:

```javascript
// public/src/components/SectionHeader.js
// I1 — In-page section divider. Eyebrow + serif h2 + subline + anchor.
// Vanilla ESM, no innerHTML.

export function SectionHeader({
  eyebrow = '',
  headline = '',
  subline = '',
  anchor = '',        // sets root id — used by REQ-F-006 deep-links
  lane = '',          // 'bazi' | 'west' | 'fusion' | 'wuxing' | ''
} = {}) {
  const root = document.createElement('header');
  root.classList.add('section-header');
  if (anchor) root.setAttribute('id', anchor);
  if (lane)   root.setAttribute('data-lane', lane);

  if (eyebrow) {
    const ey = document.createElement('p');
    ey.classList.add('section-header__eyebrow');
    ey.classList.add('bz-overline');
    ey.setAttribute('data-section-eyebrow', '');
    ey.textContent = eyebrow;
    root.appendChild(ey);
  }

  const title = document.createElement('h2');
  title.classList.add('section-header__title');
  title.classList.add('bz-h2');
  title.setAttribute('data-section-title', '');
  title.textContent = headline;
  root.appendChild(title);

  if (subline) {
    const sub = document.createElement('p');
    sub.classList.add('section-header__subline');
    sub.classList.add('bz-body');
    sub.setAttribute('data-section-subline', '');
    sub.textContent = subline;
    root.appendChild(sub);
  }

  return root;
}
```

### Step 8 — Run, confirm pass (1 min)

```bash
node --test test/section-header.test.js
```

### Step 9 — Write failing test: LuxuryCard (2 min)

Create `test/luxury-card.test.js`:

```javascript
// I1 — LuxuryCard vanilla-ESM factory test.
//
// LuxuryCard is the premium card wrapper: gold-antique border, glass
// background, optional title + footer + lane attribute. Replaces the
// ad-hoc <div class="card"> pattern littering Overview/Method.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { LuxuryCard } = await import('../public/src/components/LuxuryCard.js');

test('LuxuryCard: returns .luxury-card DOM node', () => {
  cap.reset();
  const node = LuxuryCard({ title: 'Kern' });
  assert.ok(node.classList.contains('luxury-card'));
});

test('LuxuryCard: title rendered as h3 inside [data-card-title]', () => {
  const node = LuxuryCard({ title: 'Dein dominantes Element' });
  const t = node.querySelectorAll('[data-card-title]');
  assert.equal(t.length, 1);
  assert.equal(t[0].tag, 'h3');
  assert.equal(t[0].textContent, 'Dein dominantes Element');
});

test('LuxuryCard: lane attribute forwarded to root (data-lane)', () => {
  const node = LuxuryCard({ title: 'X', lane: 'fusion' });
  assert.equal(node.getAttribute('data-lane'), 'fusion');
});

test('LuxuryCard: exposes .body slot, callers append into it', () => {
  const node = LuxuryCard({ title: 'X' });
  assert.ok(node.body, 'must expose .body');
  const child = global.document.createElement('p');
  child.textContent = 'wert';
  node.body.appendChild(child);
  assert.equal(node.body._children.length, 1);
  assert.equal(node.body._children[0].textContent, 'wert');
});

test('LuxuryCard: variant=hero adds .luxury-card--hero modifier', () => {
  const node = LuxuryCard({ title: 'X', variant: 'hero' });
  assert.ok(node.classList.contains('luxury-card--hero'));
});

test('LuxuryCard: no title supplied → no [data-card-title] node', () => {
  const node = LuxuryCard({});
  assert.equal(node.querySelectorAll('[data-card-title]').length, 0);
});

test('LuxuryCard: footer slot rendered + exposed as .footer when requested', () => {
  const node = LuxuryCard({ title: 'X', withFooter: true });
  assert.ok(node.footer, 'must expose .footer when withFooter=true');
  const cta = global.document.createElement('button');
  cta.textContent = 'Mehr';
  node.footer.appendChild(cta);
  assert.equal(node.footer._children.length, 1);
});
```

### Step 10 — Run, confirm failure (1 min)

```bash
node --test test/luxury-card.test.js
```

### Step 11 — Implement LuxuryCard (3 min)

Create `public/src/components/LuxuryCard.js`:

```javascript
// public/src/components/LuxuryCard.js
// I1 — Premium card wrapper. Glass background, gold-antique border,
// optional title + footer. Vanilla ESM. No innerHTML.

export function LuxuryCard({
  title = '',
  variant = 'default',     // 'default' | 'hero' | 'subtle'
  lane = '',
  withFooter = false,
} = {}) {
  const root = document.createElement('article');
  root.classList.add('luxury-card');
  if (variant && variant !== 'default') {
    root.classList.add(`luxury-card--${variant}`);
  }
  if (lane) root.setAttribute('data-lane', lane);

  if (title) {
    const t = document.createElement('h3');
    t.classList.add('luxury-card__title');
    t.classList.add('bz-h4');
    t.setAttribute('data-card-title', '');
    t.textContent = title;
    root.appendChild(t);
  }

  const body = document.createElement('div');
  body.classList.add('luxury-card__body');
  root.appendChild(body);
  root.body = body;

  if (withFooter) {
    const footer = document.createElement('footer');
    footer.classList.add('luxury-card__footer');
    root.appendChild(footer);
    root.footer = footer;
  }

  return root;
}
```

### Step 12 — Add component CSS to main.css (3 min)

Append the following block to `public/src/styles/main.css` (so all three components have visible premium styling):

```css
/* ════════════════════════════════════════════════════════════════════
   I1 — PageShell / SectionHeader / LuxuryCard
   ════════════════════════════════════════════════════════════════════ */

.page-shell {
  display: flex;
  flex-direction: column;
  gap: var(--bz-space-7);
  padding: var(--bz-space-7) var(--bz-space-5) var(--bz-space-8);
  max-width: 960px;
  margin: 0 auto;
}
.page-shell--hero { padding-top: var(--bz-space-8); }

.page-shell__header { display: flex; flex-direction: column; gap: var(--bz-space-3); }

.page-shell__eyebrow {
  color: var(--bz-gold-light);
  margin: 0;
}
.page-shell__title {
  margin: 0;
  color: var(--bz-fg-1);
}
.page-shell__subline {
  margin: 0;
  color: var(--bz-fg-2);
  max-width: 60ch;
}

.page-shell__body { display: flex; flex-direction: column; gap: var(--bz-space-6); }

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--bz-space-2);
  padding-bottom: var(--bz-space-3);
  border-bottom: 1px solid var(--bz-border-1);
  scroll-margin-top: var(--bz-space-7);  /* REQ-F-006: deep-link anchors */
}
.section-header__eyebrow { color: var(--bz-gold-light); margin: 0; }
.section-header__title   { color: var(--bz-fg-1); margin: 0; }
.section-header__subline { color: var(--bz-fg-2); margin: 0; max-width: 60ch; }

.luxury-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--bz-space-3);
  padding: var(--bz-space-5);
  background: var(--bz-bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--bz-border-2);
  border-radius: var(--bz-radius-lg);
  box-shadow: var(--bz-shadow-tile);
}
.luxury-card--hero {
  padding: var(--bz-space-6);
  border-radius: var(--bz-radius-2xl);
  box-shadow: var(--bz-shadow-hero);
}
.luxury-card--subtle {
  background: transparent;
  border-color: var(--bz-border-1);
  box-shadow: none;
}
.luxury-card__title {
  color: var(--bz-gold-light);
  margin: 0;
}
.luxury-card__body { display: flex; flex-direction: column; gap: var(--bz-space-3); color: var(--bz-fg-2); }
.luxury-card__footer { margin-top: var(--bz-space-4); display: flex; gap: var(--bz-space-3); }
```

### Step 13 — Pilot wire-up: OverviewPage (3 min)

Open `public/src/pages/OverviewPage.js`. Add at the top of the import block (after the existing imports):

```javascript
import { PageShell }     from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard }    from '../components/LuxuryCard.js';
```

Find the page's `render` (or `mount` / default export) entry. Wrap the *outermost* node it currently returns with PageShell, and replace ONE existing section's ad-hoc header with `SectionHeader` and ONE card cluster with `LuxuryCard`. Concrete example for the "Coherence" cluster:

Before:
```javascript
const root = document.createElement('div');
root.className = 'overview-page';
// ... existing children appended directly to root
return root;
```

After:
```javascript
const shell = PageShell({
  eyebrow: 'KAPITEL 1',
  headline: 'Dein Sternfeld',
  subline: 'Was Geburtsmoment, Element und Lebensthema heute über dich erzählen.',
  variant: 'hero',
});

const coherenceSection = SectionHeader({
  eyebrow: 'KOHÄRENZ',
  headline: 'Wie stimmig dein Feld ist',
  anchor: 'coherence',
  lane: 'fusion',
});
shell.body.appendChild(coherenceSection);

const coherenceCard = LuxuryCard({ title: 'Kohärenz', lane: 'fusion', variant: 'hero' });
// migrate the existing coherence content into coherenceCard.body
coherenceCard.body.appendChild(existingCoherenceContentNode);
shell.body.appendChild(coherenceCard);

// (rest of overview content keeps appending into shell.body for now)
return shell;
```

Only migrate ONE section in this iteration — leave the rest of OverviewPage untouched. The pilot proves the pattern; the broader rollout happens in I2+.

### Step 14 — Pilot wire-up: MethodPage (2 min)

Open `public/src/pages/MethodPage.js`. Apply the same minimal wrap: outermost `PageShell({ eyebrow: 'METHODE', headline: 'So funktioniert FuFirE', variant: 'default' })`, swap the top header for SectionHeader, swap the explanatory block into LuxuryCard. Keep the rest of the page logic intact.

### Step 15 — Run targeted tests + full suite (2 min)

```bash
node --test test/page-shell.test.js
node --test test/section-header.test.js
node --test test/luxury-card.test.js
node --test test/css-token-integrity.test.js
node --test test/design-tokens-coverage.test.js
npm test
```

Expected: all green. If `page-render-integration.test.js` breaks because OverviewPage's root tag changed, update the integration test's expected root class from `.overview-page` to `.page-shell` (the page-shell wraps the previous root).

### Step 16 — Playwright smoke + screenshots (3 min)

Run the I0 Playwright smoke spec — it lives at `tests/e2e/smoke.spec.js`. Extend it (or rely on the existing screenshot hook from I0) so Overview / Method / Fusion routes are captured into `docs/qa/screenshots/i1-design/`:

```bash
mkdir -p docs/qa/screenshots/i1-design
node server.js &
SERVER_PID=$!
sleep 2
APP_BASE_URL=http://127.0.0.1:3000 \
  SCREENSHOT_DIR=docs/qa/screenshots/i1-design \
  npm run test:e2e
kill $SERVER_PID
```

Eyeball the three PNGs: Overview must show the gold/ember accent + serif Playfair headline + glass LuxuryCard. Method must show the new PageShell layout. Fusion must already inherit the body font + button styling (even without component wire-up).

### Step 17 — Commit (1 min)

```bash
git add public/src/components/PageShell.js \
        public/src/components/SectionHeader.js \
        public/src/components/LuxuryCard.js \
        test/page-shell.test.js \
        test/section-header.test.js \
        test/luxury-card.test.js \
        public/src/pages/OverviewPage.js \
        public/src/pages/MethodPage.js \
        public/src/styles/main.css \
        docs/qa/screenshots/i1-design/
git commit -m "feat(i1): PageShell + SectionHeader + LuxuryCard, piloted on Overview + Method"
```

---

## Iteration Definition of Done

I1 is **done** only when every item is true:

- [ ] `node --test test/css-token-integrity.test.js` is green and pins `--accent` away from legacy `#7c8cff` / `#a78bfa`.
- [ ] `node --test test/design-tokens-coverage.test.js` is green (existing guard + new legacy-bridge assertion).
- [ ] `node --test test/page-shell.test.js`, `…/section-header.test.js`, `…/luxury-card.test.js` are all green.
- [ ] `npm test` is fully green — no other test in the suite regressed.
- [ ] `public/src/styles/main.css` no longer redeclares `--accent`, `--text`, `--bg` with raw legacy hex literals.
- [ ] `tokens.css` declares `--bz-ember`, `--bz-amber`, `--bz-font-display`; the `@import url(…)` line loads Playfair Display, DM Serif Display, Inter, Plus Jakarta Sans.
- [ ] OverviewPage and MethodPage render through `PageShell` (visible: serif headline, gold eyebrow, premium card border).
- [ ] Three screenshots exist under `docs/qa/screenshots/i1-design/`: `overview.png`, `method.png`, `fusion.png`. Each shows the premium gold accent — none shows the legacy blue/lila.
- [ ] No API shape was touched (no edits inside `server.js`, no edits inside `public/src/api/client.js`, no edits inside `public/src/domain/*.js` other than to import the new components for the pilot pages).
- [ ] No fake astrological data was added — the new components carry copy strings only ("KAPITEL 1", "KOHÄRENZ", "Dein Sternfeld") and structural slots, never numeric placeholders.

## Validation strategy

Run in this order. Each command must exit 0 before the next runs.

```bash
# 1. Token integrity (new contract)
node --test test/css-token-integrity.test.js

# 2. Token coverage (existing guard, extended)
node --test test/design-tokens-coverage.test.js

# 3. New components — isolated
node --test test/page-shell.test.js
node --test test/section-header.test.js
node --test test/luxury-card.test.js

# 4. Full suite — catches downstream regressions
npm test

# 5. End-to-end smoke + screenshots (requires server running on :3000)
node server.js &
sleep 2
APP_BASE_URL=http://127.0.0.1:3000 \
  SCREENSHOT_DIR=docs/qa/screenshots/i1-design \
  npm run test:e2e
kill %1

# 6. Manual eyeball
ls -la docs/qa/screenshots/i1-design/
# Open each PNG. Confirm: gold/ember accent, Playfair headline, glass card.
```

If step 5 fails because `npm run test:e2e` doesn't exist yet in this branch, that means I0 was not actually merged — STOP and finish I0 before reopening I1.

## Rollback note

I1 is fully revertible. If a downstream iteration discovers a visual regression that traces back to the new tokens:

```bash
git revert <i1-task-001-sha> <i1-task-002-sha> <i1-task-003-sha>
```

The legacy-alias bridge in `tokens.css` is the only public contract other modules consume; reverting puts `--accent` back to `var(--bz-gold)` (acceptable interim) and restores the Cormorant Garamond + Manrope font stack. PageShell / SectionHeader / LuxuryCard are additive — removing their imports from OverviewPage / MethodPage and deleting the three component files completely undoes the pilot wire-up.

Do **not** rollback by manually re-introducing `#7c8cff` into main.css — `test/css-token-integrity.test.js` will reject it.

## Handoff to next iteration: I2

I2 picks up the broader page rollout:

- Migrate the remaining pages (`PersonalityPage`, `LovePage`, `CareerFinancePage`, `BaziPage`, `WesternPage`, `WuxingPage`, `FusionPage`, `SynastryPage`, `TransitCalendarPage`, `DailyPage`, `HousesPage`, `DashboardPage`) to use `PageShell` + `SectionHeader` + `LuxuryCard`.
- Remove the legacy `.app-title` selector once no page references it.
- Delete the legacy `--accent2`, `--accent`, `--gold`, `--gold-light` aliases from the bridge once all pages reference `--bz-*` directly.
- Replace ad-hoc `<div class="card">` patterns inside components (`ExplainableCard`, `ScoreBandCard`, `CoherenceLensCard` …) with `LuxuryCard` composition where the visual shape matches.

Hand off the three new component files, the integrity test, the screenshot folder, and the master plan delta to I2's executing-plans skill invocation.
