# I6 Review-Findings Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 RAF-leak findings + 5 text-duplication risks + 1 DRY violation from I6 code review (commit 1eb4936).

**Architecture:** Add one `wireHeroRolling(root, fallbackText?)` helper in `RollingText.js` that reads existing `[data-page-title]` element, replaces it with a RollingText node carrying the same classes, and returns a `stopRolling` cleanup callback. Add `element.isConnected` self-cancel guard to `RollingText`'s `tick()` so detached nodes auto-stop their RAF loop (defense in depth — covers any future direct callers too). Migrate 6 subpages (BaziPage, HousesPage, WesternPage, WuxingPage, FusionPage, DailyPage) from inline ~10-line RAF wiring to single helper call.

**Tech Stack:** Vanilla ESM, `node --test` runner, Playwright on PORT=4100, JSDOM for unit tests.

---

## Task 1: RollingText self-cancel when element detaches

**Files:**
- Modify: `public/src/components/RollingText.js:97-121` (tick function in `RollingText` factory)
- Modify: `public/src/components/RollingText.js:194-217` (tick function in `decorateRollingText`)
- Test: `test/rolling-text.test.js` (existing file — append new test)

**Step 1: Read existing test to match style**

Run: `head -40 test/rolling-text.test.js`
Expected: see existing test pattern (likely uses JSDOM, imports `RollingText`)

**Step 2: Write failing test**

Append to `test/rolling-text.test.js`:

```js
test('RollingText: stops RAF loop automatically when element is detached from DOM', async () => {
  // Build, mount, start rolling — then detach. Element should stop animating
  // within a frame instead of leaking RAF callbacks forever.
  const el = RollingText({ text: 'AB', tagName: 'span' });
  document.body.appendChild(el);
  el.startRolling();
  assert.ok(el.classList.contains('rolling-text--rolling'), 'should be rolling once started');

  // Detach mid-animation
  el.remove();
  assert.equal(el.isConnected, false, 'precondition: element detached');

  // Give 2 RAFs for tick to notice the detachment and bail out
  await new Promise(r => setTimeout(r, 50));

  // After self-cancel, element is left in a settled state — no RAF still chasing it
  assert.equal(el.classList.contains('rolling-text--rolling'), false,
    'tick() must drop the rolling class when isConnected === false');
});
```

**Step 3: Run test to verify it fails**

Run: `node --test test/rolling-text.test.js 2>&1 | grep -E "(detached|fail|pass)" | head -20`
Expected: the new test fails ("expected false to equal true" or assertion on rolling class)

**Step 4: Add `isConnected` guard to both `tick` functions**

In `public/src/components/RollingText.js`, modify `tick(t)` inside `startRolling` (around line 97) — add at top of function body, BEFORE the for-loop:

```js
function tick(t) {
  if (!el.isConnected) {
    rafId = 0;
    el.classList.remove('rolling-text--rolling');
    return;
  }
  let allDone = true;
  // ... existing body unchanged
```

Apply identical guard to the `tick(t)` inside `decorateRollingText` (around line 194), referencing `node` instead of `el`:

```js
function tick(t) {
  if (!node.isConnected) {
    rafId = 0;
    node.classList.remove('rolling-text--rolling');
    return;
  }
  let allDone = true;
  // ... existing body unchanged
```

**Step 5: Run test to verify it passes**

Run: `node --test test/rolling-text.test.js 2>&1 | tail -10`
Expected: 0 fail, all pass (including the new detached test)

**Step 6: Commit**

```bash
git add public/src/components/RollingText.js test/rolling-text.test.js
git commit -m "fix(RollingText): self-cancel RAF loop when element detaches from DOM

Prevents memory leaks when pages re-mount via hash-router navigation:
old RollingText timers from previous page no longer keep ticking on
detached DOM nodes. Added isConnected guard at top of both tick()
functions (RollingText factory + decorateRollingText helper).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Extract `wireHeroRolling` helper

**Files:**
- Modify: `public/src/components/RollingText.js` (add new export at bottom of file)
- Test: `test/rolling-text-wire-hero.test.js` (NEW)

**Step 1: Write failing test**

Create `test/rolling-text-wire-hero.test.js`:

```js
// test/rolling-text-wire-hero.test.js — I6-fix: helper extraction unit tests
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.document = dom.window.document;
global.window   = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
global.cancelAnimationFrame  = (id) => clearTimeout(id);

const { wireHeroRolling } = await import('../public/src/components/RollingText.js');

function mount(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

test('wireHeroRolling: returns null when no [data-page-title] element exists', () => {
  const root = mount('<header><h1>Plain</h1></header>');
  const result = wireHeroRolling(root);
  assert.equal(result, null);
});

test('wireHeroRolling: replaces [data-page-title] with a RollingText node preserving classes', () => {
  const root = mount('<header><h1 class="page-title bz-h1" data-page-title>Mein Titel</h1></header>');
  const cleanup = wireHeroRolling(root);
  const replaced = root.querySelector('[data-page-title]');
  assert.ok(replaced, 'replacement still carries data-page-title');
  assert.ok(replaced.classList.contains('page-title'), 'class page-title preserved');
  assert.ok(replaced.classList.contains('bz-h1'), 'class bz-h1 preserved');
  assert.ok(replaced.classList.contains('rolling-text'), 'rolling-text class added by RollingText()');
  assert.equal(replaced.getAttribute('aria-label'), 'Mein Titel');
  assert.equal(typeof cleanup, 'function', 'returns stopRolling callback');
});

test('wireHeroRolling: derives hero text from element textContent (no hardcoded fallback needed)', () => {
  const root = mount('<header><h1 data-page-title>Was zirkuliert, was staut</h1></header>');
  wireHeroRolling(root);
  const replaced = root.querySelector('[data-page-title]');
  assert.equal(replaced.getAttribute('aria-label'), 'Was zirkuliert, was staut');
});

test('wireHeroRolling: uses fallbackText when element textContent is empty', () => {
  const root = mount('<header><h1 data-page-title></h1></header>');
  wireHeroRolling(root, 'Fallback');
  const replaced = root.querySelector('[data-page-title]');
  assert.equal(replaced.getAttribute('aria-label'), 'Fallback');
});

test('wireHeroRolling: returned cleanup() stops the RAF loop without crashing', () => {
  const root = mount('<header><h1 data-page-title>X</h1></header>');
  const cleanup = wireHeroRolling(root);
  assert.doesNotThrow(() => cleanup());
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/rolling-text-wire-hero.test.js 2>&1 | tail -15`
Expected: ImportError or "wireHeroRolling not exported" — all 5 tests fail

**Step 3: Add helper export to `RollingText.js`**

Append to end of `public/src/components/RollingText.js`:

```js
/**
 * Wire a page hero h1 (marked with `data-page-title`) as a RollingText.
 * Idempotent: returns null if no marker found, so callers don't need a guard.
 * Returns a `cleanup` callback that stops the RAF loop — call on page unmount.
 *
 * Replaces the marker element with a RollingText node that:
 *   - inherits all original classNames
 *   - keeps the `data-page-title` attribute (so re-wires are still findable)
 *   - sets `data-rolling-text="hero"` for Playwright/test anchors
 *   - uses the marker's textContent as hero text (fallback if empty)
 *
 * Used by every subpage to avoid duplicating the ~10-line wiring block.
 *
 * @param {Element} root — the page root element (app or main)
 * @param {string}  [fallbackText] — used if marker's textContent is empty
 * @returns {(() => void) | null}
 */
export function wireHeroRolling(root, fallbackText = '') {
  if (!root || typeof root.querySelector !== 'function') return null;
  const marker = root.querySelector('[data-page-title]');
  if (!marker) return null;

  const text = (marker.textContent || '').trim() || fallbackText;
  const className = marker.getAttribute('class') || '';
  const tagName   = (marker.tagName || 'h1').toLowerCase();

  const roll = RollingText({ text, tagName, className });
  roll.setAttribute('data-rolling-text', 'hero');
  roll.setAttribute('data-page-title', '');
  marker.replaceWith(roll);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => roll.startRolling?.());
  } else {
    roll.startRolling?.();
  }

  return () => roll.stopRolling?.();
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/rolling-text-wire-hero.test.js 2>&1 | tail -10`
Expected: 5/5 pass, 0 fail

**Step 5: Commit**

```bash
git add public/src/components/RollingText.js test/rolling-text-wire-hero.test.js
git commit -m "feat(RollingText): add wireHeroRolling helper for subpage heroes

Single-call replacement for the ~10-line RAF wiring block that I6
duplicated across 6 subpages. Reads hero text from existing
[data-page-title] element (no hardcoded text duplication), returns
stopRolling cleanup callback for future router-driven unmount.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Migrate 6 subpages to wireHeroRolling

**Files (all Modify):**
- `public/src/pages/HousesPage.js` — lines ~5 (import) + ~100-111 (wiring block)
- `public/src/pages/WuxingPage.js` — lines ~17 (import) + ~159-170 (wiring block)
- `public/src/pages/WesternPage.js` — lines ~22 (import) + ~161-173 (wiring block)
- `public/src/pages/BaziPage.js` — lines ~14 (import) + ~129-141 (wiring block)
- `public/src/pages/FusionPage.js` — line ~13 (already imports RollingText) + ~273-286 (wiring block)
- `public/src/pages/DailyPage.js` — line ~3 (already imports RollingText) + ~199-210 (wiring block)

**Step 1: Verify existing tests still pass (baseline)**

Run: `node --test test/subpages-typo-consistency.test.js 2>&1 | tail -5`
Expected: 20/20 pass (from I6 commit)

**Step 2: Update HousesPage**

In `public/src/pages/HousesPage.js`:

Change import line (line 5):
```js
// FROM:
import { RollingText } from '../components/RollingText.js';
// TO:
import { wireHeroRolling } from '../components/RollingText.js';
```

Replace the 13-line wiring block (currently starts with `// I6: wire hero title as RollingText`):
```js
// FROM (13 lines):
const houseH1 = app.querySelector('[data-page-title]');
if (houseH1) {
  const heroRoll = RollingText({ text: 'Wo deine Energien wirken', tagName: 'h1', className: 'page-title bz-h1' });
  heroRoll.setAttribute('data-rolling-text', 'hero');
  heroRoll.setAttribute('data-page-title', '');
  houseH1.replaceWith(heroRoll);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => heroRoll.startRolling?.());
  } else {
    heroRoll.startRolling?.();
  }
}
// TO (1 line):
wireHeroRolling(app);
```

**Step 3: Update WuxingPage**

In `public/src/pages/WuxingPage.js`:

Change import:
```js
import { RollingText } from '../components/RollingText.js';
// becomes:
import { wireHeroRolling } from '../components/RollingText.js';
```

Replace wiring block (starts with `// I6: wire hero title as RollingText.`):
```js
wireHeroRolling(app);
```

**Step 4: Update WesternPage**

In `public/src/pages/WesternPage.js`:

Change import:
```js
import { RollingText }                     from '../components/RollingText.js';
// becomes:
import { wireHeroRolling }                 from '../components/RollingText.js';
```

Replace wiring block:
```js
wireHeroRolling(app);
```

**Step 5: Update BaziPage**

In `public/src/pages/BaziPage.js`:

Change import:
```js
import { RollingText }        from '../components/RollingText.js';
// becomes:
import { wireHeroRolling }    from '../components/RollingText.js';
```

Replace wiring block:
```js
wireHeroRolling(app);
```

**Step 6: Update FusionPage**

In `public/src/pages/FusionPage.js`:

`RollingText` import stays (it's also used elsewhere if any). If not used elsewhere, swap to `wireHeroRolling`. Check first:

Run: `grep -n "RollingText\b" public/src/pages/FusionPage.js`
Expected: only the import + the wiring block (no other uses)

If only the wiring uses it, change import:
```js
import { RollingText } from '../components/RollingText.js';
// becomes:
import { wireHeroRolling } from '../components/RollingText.js';
```

Note: FusionPage's hero h1 currently uses class `insight-hero__title bz-h1` (not `page-title bz-h1`). The helper reads className from the marker, so the existing class will be preserved.

Replace wiring block (starts with `// I2 + I6: wire hero title as RollingText with bz-h1 design-token class.`):
```js
wireHeroRolling(app);
```

**Step 7: Update DailyPage**

In `public/src/pages/DailyPage.js`:

Check first:
Run: `grep -n "RollingText\b" public/src/pages/DailyPage.js`
Expected: only the import + the wiring block

Change import (likely line 3):
```js
import { RollingText } from '../components/RollingText.js';
// becomes:
import { wireHeroRolling } from '../components/RollingText.js';
```

Replace wiring block (starts with `// I2 + I6: wire hero title as RollingText with bz-h1 design-token class.`):
```js
wireHeroRolling(app);
```

**Step 8: Run all unit tests**

Run: `npm test 2>&1 | tail -10`
Expected: 0 fail. `subpages-typo-consistency.test.js` may still pass because:
- `data-section` strings still present in source ✓
- `bz-h1` string... will FAIL because we removed it from RollingText() callsite!

If the typo test fails on bz-h1 in any page: update `test/subpages-typo-consistency.test.js` to look for `bz-h1` anywhere in source OR change the test to query the DOM after page mount. Simplest: the `bz-h1` class IS still present on the inline-HTML `<h1 class="page-title bz-h1" data-page-title>` template string, so the source-scan regex should still match. Confirm:

Run: `grep -c "bz-h1" public/src/pages/HousesPage.js`
Expected: at least 1 (in the innerHTML template)

If still 0 anywhere: revert the inline `<h1 class="...bz-h1" data-page-title>` cannot have been touched in this task. Investigate.

**Step 9: Run Playwright spec**

Server should already be running on PORT=4100. If not:
Run: `PORT=4100 node server.js &` then `sleep 2`

Run: `APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/subpages-consistency.spec.js --config=playwright.config.mjs 2>&1 | tail -5`
Expected: 14 passed

**Step 10: Commit**

```bash
git add public/src/pages/HousesPage.js public/src/pages/WuxingPage.js public/src/pages/WesternPage.js public/src/pages/BaziPage.js public/src/pages/FusionPage.js public/src/pages/DailyPage.js
git commit -m "refactor(pages): migrate 6 subpages to wireHeroRolling helper

Replaces 6×13-line RollingText wiring blocks (78 lines) with single
helper call per page (6 lines total). Removes hardcoded hero text
duplication — helper now reads from [data-page-title] textContent.

Addresses I6 code review findings:
- 6× RAF leak (now self-cancels via isConnected check)
- 5× text duplication (helper reads from DOM marker)
- 1× DRY violation (78 lines → 6 lines)

Tests: 20/20 subpage consistency + 14/14 Playwright unchanged.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Final verification + QA doc

**Step 1: Run full test suite**

Run: `npm test 2>&1 | tail -10`
Expected: 0 fail. Total around 714 + 1 (new detached test) + 5 (new helper tests) = ~720 pass, 12 skipped.

**Step 2: Run all Playwright E2E specs**

Run: `APP_BASE_URL=http://127.0.0.1:4100 npx playwright test --config=playwright.config.mjs 2>&1 | tail -10`
Expected: all green (smoke + i3-wheel + overview-hero + subpages + method + rolling-letters)

**Step 3: Create QA doc**

Create `docs/qa/2026-05-22-i6-review-fixes.md`:

```markdown
# I6 Review-Findings Fix — QA Report

**Date:** 2026-05-22
**Iteration:** I6-fixes
**Status:** PASS

---

## Goal

Address all 12 findings from I6 code review of commit 1eb4936:
- 6× MAJOR: RAF leak on page re-mount across all 6 subpages with RollingText wiring
- 5× RISK: hardcoded hero text duplicated between innerHTML template and RollingText() call
- 1× ARCHITECTURE: 6 identical ~13-line wiring blocks (DRY violation)

## Test Commands

\`\`\`bash
npm test
# → 720+/0/12 pass/fail/skip

node --test test/rolling-text.test.js
# → all pass including new "stops RAF when detached" test

node --test test/rolling-text-wire-hero.test.js
# → 5/5 pass (new helper tests)

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test --config=playwright.config.mjs
# → all suites green
\`\`\`

## Changes

| File | Change |
|---|---|
| public/src/components/RollingText.js | + isConnected guard in both tick(); + wireHeroRolling export |
| test/rolling-text.test.js | + detached self-cancel test |
| test/rolling-text-wire-hero.test.js | NEW: 5 helper unit tests |
| public/src/pages/HousesPage.js | -13 lines wiring → wireHeroRolling(app) |
| public/src/pages/WuxingPage.js | -13 lines → wireHeroRolling(app) |
| public/src/pages/WesternPage.js | -13 lines → wireHeroRolling(app) |
| public/src/pages/BaziPage.js | -13 lines → wireHeroRolling(app) |
| public/src/pages/FusionPage.js | -14 lines (I2 block) → wireHeroRolling(app) |
| public/src/pages/DailyPage.js | -13 lines → wireHeroRolling(app) |

Net change: ~-70 lines, +1 helper, +6 tests.

## Architecture Notes

- `wireHeroRolling` is idempotent (returns null when marker absent), so call sites need no guard.
- Helper reads className + textContent from the marker, so each page keeps its own hero class (e.g. `insight-hero__title bz-h1` for Fusion, `page-title bz-h1` for others) without duplication.
- `isConnected` self-cancel is defense in depth — covers any future direct `RollingText()` caller, not just the helper.
- Helper returns `cleanup` callback; pages currently don't capture it. Router-driven cleanup is a separate scope (I7 — navigation).

## Status: PASS
```

**Step 4: Commit QA doc**

```bash
git add docs/qa/2026-05-22-i6-review-fixes.md
git commit -m "docs(qa): I6 review-fixes QA report

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Done

After all 4 tasks committed:
- All 6 RAF leaks closed (isConnected self-cancel + helper-driven cleanup return)
- All 5 text-duplication risks eliminated (helper reads from DOM)
- DRY violation resolved (78 lines → 6 lines)
- 6 new unit tests + 1 RollingText self-heal test
- Existing 14/14 Playwright untouched
- Net -70 lines of code, +1 helper, +6 tests
