# I2 — RollingText Animation Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Rolling Letters wirklich animieren. Sichtbarer Nutzer-Unterschied: Titel/Brand-Elemente haben sichtbaren, kontrollierten Letter-Roll. Abschluss nur mit Browservideo/Screenshots + RAF/Reduced-Motion Tests bestanden.

**Goal:** Aus dem statischen Span-Splitter eine echte, im Browser sichtbare, accessible Scramble-Animation machen — mit Reduced-Motion-Guard und ohne neue Dependencies.

**Architecture:** Vanilla-ESM Komponente; `requestAnimationFrame`-getriebener Scramble-Loop pro Span; per-char delay & duration cap; aria-label trägt finalen Klartext für Screenreader; matchMedia-Guard für Reduced Motion.

**Tech Stack:** Plain DOM APIs (requestAnimationFrame, performance.now, matchMedia), node --test mit RAF-Mock, Playwright für Live-Browser-Beweis.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0 (Playwright), I1 (SectionHeader Komponente).

---

## Status snapshot — what we have today

`public/src/components/RollingText.js`:
- Splits text into `<span data-roll-char aria-hidden="true">` children.
- Sets `data-roll-final` and `data-roll-delay` on each char span when RAF is available and reduced motion is OFF.
- **Never schedules a single `requestAnimationFrame` call.** The user sees the final text immediately, no scramble.
- Has no cleanup hook, no teardown on disconnect, no public `start()` API.

`test/rolling-text.test.js` exercises DOM shape but never asserts RAF activity, never asserts a span ever showed a non-final character, never asserts reduced-motion stops scheduling.

Iteration I2 closes that gap end-to-end: failing unit test → engine → integration in real pages → Playwright proof.

---

## TASK-I2-001 — Failing RAF + reduced-motion unit tests

**Iterationsziel-Bezug:** Beweist im Headless-Test, dass die Animation tatsächlich Frames anfordert UND dass Reduced Motion sie deterministisch abschaltet.

**Requirement links:** REQ-F-001 (sichtbar animiert), REQ-F-002 (reduced motion deaktiviert), REQ-A-003 (vanilla ESM).

**Files:**
- modify `test/rolling-text.test.js`
- new helper inside the test file: inline RAF + matchMedia stubs (no new files, no new deps)

**Steps:**

1. Open `test/rolling-text.test.js`. Append the new test block (do not touch the existing tests — they still assert DOM shape).

2. Append this block at the end of the file (after the last existing test):

```javascript
// ── Test 9+: RAF engine actually drives animation ────────────────────────────
// These tests exercise the scramble engine added in I2.
// We install a synchronous RAF stub that runs queued callbacks up to a step
// limit, and a matchMedia stub we can flip between motion / no-motion.

function installRafStub({ maxSteps = 240 } = {}) {
  let queue = [];
  let now = 0;
  let calls = 0;

  global.requestAnimationFrame = (cb) => {
    calls++;
    queue.push(cb);
    return calls;
  };
  global.cancelAnimationFrame = () => { /* no-op for tests */ };
  global.performance = { now: () => now };

  function drain() {
    let steps = 0;
    while (queue.length && steps < maxSteps) {
      const cb = queue.shift();
      now += 16; // ~60fps
      cb(now);
      steps++;
    }
  }

  return {
    drain,
    callCount: () => calls,
    reset() {
      queue = [];
      now = 0;
      calls = 0;
    },
  };
}

function installMatchMedia(reduce) {
  global.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    addEventListener() {}, removeEventListener() {},
  });
}

test('RollingText (I2): schedules RAF when motion is enabled', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  // Re-import fresh (component reads matchMedia at construction time).
  const mod = await import('../public/src/components/RollingText.js?i2-raf-on');
  const el = mod.RollingText({ text: 'Hi', tagName: 'span' });

  // Component must expose a start() that begins the scramble. Mount mimics DOM.
  assert.equal(typeof el.startRolling, 'function',
    'I2: RollingText element must expose startRolling()');
  el.startRolling();

  raf.drain();
  assert.ok(raf.callCount() >= 1,
    'I2: at least one requestAnimationFrame call must be scheduled');
});

test('RollingText (I2): a span textContent changes at least once before settling', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-raf-change');
  const el = mod.RollingText({
    text: 'Az',
    tagName: 'span',
    baseDelay: 0,
    perChar: 0,
    charPool: 'XYZ',
  });
  const span = el.querySelectorAll('[data-roll-char]')[0];
  const seen = new Set();

  // Patch textContent setter to capture history.
  const origDesc = Object.getOwnPropertyDescriptor(span, 'textContent')
    || { configurable: true };
  let stored = span.textContent;
  Object.defineProperty(span, 'textContent', {
    configurable: true,
    get() { return stored; },
    set(v) { stored = v; seen.add(v); },
  });

  el.startRolling();
  raf.drain();

  // Seen must contain at least one non-final char AND end at final.
  assert.ok(seen.size >= 2, 'I2: span must show >= 2 distinct chars (scramble + final)');
  assert.equal(stored, 'A', 'I2: span must settle on its final character');

  if (origDesc) Object.defineProperty(span, 'textContent', origDesc);
});

test('RollingText (I2): aria-label stays as final cleartext during animation', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-aria');
  const el = mod.RollingText({ text: 'Bazodiac', tagName: 'h1' });
  assert.equal(el.getAttribute('aria-label'), 'Bazodiac');

  el.startRolling();
  raf.drain();
  assert.equal(el.getAttribute('aria-label'), 'Bazodiac',
    'I2: aria-label must not be scrambled — accessibility invariant');
});

test('RollingText (I2): reduced motion = NO RAF scheduled, spans show final immediately', async () => {
  cap.reset();
  installMatchMedia(true);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-reduced');
  const el = mod.RollingText({ text: 'Hi', tagName: 'span' });
  el.startRolling();
  raf.drain();

  assert.equal(raf.callCount(), 0,
    'I2: prefers-reduced-motion must skip RAF scheduling entirely');
  const chars = el.querySelectorAll('[data-roll-char]');
  assert.equal(chars[0].textContent, 'H');
  assert.equal(chars[1].textContent, 'i');
});

test('RollingText (I2): startRolling is idempotent and cleans up on completion', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-idempotent');
  const el = mod.RollingText({ text: 'X', tagName: 'span', baseDelay: 0, perChar: 0 });
  el.startRolling();
  el.startRolling(); // second call must NOT schedule another loop
  raf.drain();

  const chars = el.querySelectorAll('[data-roll-char]');
  assert.equal(chars[0].textContent, 'X', 'final char settled');
  // After completion, calling startRolling again must be a no-op (already settled).
  const before = raf.callCount();
  el.startRolling();
  raf.drain();
  assert.equal(raf.callCount(), before,
    'I2: startRolling after completion must not re-schedule');
});
```

3. Run the tests — they must FAIL because `startRolling` does not exist yet:

```bash
node --test test/rolling-text.test.js
```

   Expected: existing 8 tests pass, the 5 new I2 tests fail with `typeof el.startRolling === 'function'` violated.

4. Commit the failing tests:

```bash
git add test/rolling-text.test.js
git commit -m "test(rolling-text): add failing I2 RAF + reduced-motion engine tests"
```

---

## TASK-I2-002 — Implement the scramble engine

**Iterationsziel-Bezug:** Macht die Animation echt — RAF-getrieben, per-char Delay, snap-to-final, Reduced-Motion-Guard.

**Requirement links:** REQ-F-001, REQ-F-002, REQ-A-003.

**Files:**
- modify `public/src/components/RollingText.js`
- modify `public/src/styles/main.css` (animation class hooks)

**Steps:**

1. Replace the contents of `public/src/components/RollingText.js` with the full implementation below. Keep the existing exports (`RollingText`, `decorateRollingText`) — `decorateRollingText` now also wires `startRolling()` per decorated node.

```javascript
// public/src/components/RollingText.js
// I2: Real scramble engine on top of TASK-008 entry-only split-flap.
// Vanilla ESM — no React, no innerHTML, no new runtime deps.
// Works statically in Node (capture-DOM stub) — RAF/cancelAnimationFrame optional.

const DEFAULT_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ·0123456789';
const PER_CHAR_DURATION_CAP_MS = 600; // hard ceiling per char before snap

function prefersReducedMotion() {
  if (typeof matchMedia !== 'function') return false;
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function hasRaf() {
  return typeof requestAnimationFrame === 'function';
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function pickPoolChar(pool, finalChar) {
  if (!pool || pool.length === 0) return finalChar;
  // Deterministic-ish: bias away from finalChar so the diff is visible.
  const i = Math.floor(Math.random() * pool.length);
  const c = pool[i];
  return c === finalChar && pool.length > 1 ? pool[(i + 1) % pool.length] : c;
}

/**
 * Build the rolling-text element.
 * Returns the element augmented with `startRolling()` and `stopRolling()`.
 */
export function RollingText({
  text = '',
  tagName = 'span',
  className = '',
  variant = 'inherit',          // reserved for visual variants
  mode = 'entry',               // reserved — only 'entry' is supported in I2
  baseDelay = 120,              // ms before the first char starts
  perChar = 34,                 // stagger between chars
  charPool = DEFAULT_POOL,
} = {}) {
  const el = document.createElement(tagName);
  el.classList.add('rolling-text');
  if (className) {
    for (const c of className.split(/\s+/)) if (c) el.classList.add(c);
  }
  el.setAttribute('aria-label', text);

  const reduced = prefersReducedMotion();
  const animatable = !reduced && hasRaf();

  // Build char spans up front. In reduced/no-RAF: each span holds its final
  // char. In animatable mode: each span starts on its final char too (so SSR
  // / pre-startRolling state is readable), and the engine flips it to scramble
  // chars on first tick.
  const charSpans = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const span = document.createElement('span');
    span.setAttribute('data-roll-char', '');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = char === ' ' ? ' ' : char;

    if (animatable) {
      span.dataset.rollFinal = char === ' ' ? ' ' : char;
      span.dataset.rollDelay = String(baseDelay + i * perChar);
    }

    el.appendChild(span);
    charSpans.push({ span, finalChar: char, delay: baseDelay + i * perChar });
  }

  // Engine state.
  let rafId = 0;
  let started = false;
  let completed = false;

  function settleAll() {
    for (const { span, finalChar } of charSpans) {
      span.textContent = finalChar === ' ' ? ' ' : finalChar;
    }
    completed = true;
    el.classList.add('rolling-text--settled');
  }

  function startRolling() {
    if (started || completed) return;
    if (!animatable) { settleAll(); started = true; return; }
    if (charSpans.length === 0) { completed = true; return; }

    started = true;
    el.classList.add('rolling-text--rolling');

    const startedAt = now();

    function tick(t) {
      let allDone = true;
      for (const entry of charSpans) {
        if (entry.done) continue;
        const elapsed = t - startedAt;
        if (elapsed < entry.delay) {
          allDone = false;
          continue;
        }
        const localElapsed = elapsed - entry.delay;
        if (localElapsed >= PER_CHAR_DURATION_CAP_MS) {
          entry.span.textContent = entry.finalChar === ' ' ? ' ' : entry.finalChar;
          entry.done = true;
          continue;
        }
        // Scramble: pick a non-final char from the pool each frame.
        entry.span.textContent = pickPoolChar(charPool, entry.finalChar);
        allDone = false;
      }

      if (allDone) {
        rafId = 0;
        completed = true;
        el.classList.remove('rolling-text--rolling');
        el.classList.add('rolling-text--settled');
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  }

  function stopRolling() {
    if (rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
    }
    rafId = 0;
    settleAll();
  }

  el.startRolling = startRolling;
  el.stopRolling = stopRolling;

  return el;
}

/**
 * Decorate existing nodes matching `selector`. Adds `startRolling()` to each
 * decorated node and returns the list so callers can mount/start in bulk.
 */
export function decorateRollingText(root, {
  selector = '[data-roll-text]',
  maxChars = 90,
  autoStart = true,
} = {}) {
  const decorated = [];
  const nodes = root.querySelectorAll(selector);
  for (const node of nodes) {
    const originalText = (node.textContent || '').trim();
    if (originalText.length > maxChars) continue;

    node.classList.add('rolling-text');
    node.setAttribute('aria-label', originalText);
    node.textContent = '';

    const reduced = prefersReducedMotion();
    const animatable = !reduced && hasRaf();
    const charSpans = [];

    for (let i = 0; i < originalText.length; i++) {
      const char = originalText[i];
      const span = document.createElement('span');
      span.setAttribute('data-roll-char', '');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = char === ' ' ? ' ' : char;
      if (animatable) {
        span.dataset.rollFinal = char === ' ' ? ' ' : char;
      }
      node.appendChild(span);
      charSpans.push({ span, finalChar: char, delay: 120 + i * 34 });
    }

    let rafId = 0;
    let started = false;
    let completed = false;

    node.startRolling = function startRolling() {
      if (started || completed) return;
      if (!animatable || charSpans.length === 0) {
        for (const { span, finalChar } of charSpans) {
          span.textContent = finalChar === ' ' ? ' ' : finalChar;
        }
        completed = true;
        started = true;
        return;
      }
      started = true;
      node.classList.add('rolling-text--rolling');
      const startedAt = now();

      function tick(t) {
        let allDone = true;
        for (const entry of charSpans) {
          if (entry.done) continue;
          const elapsed = t - startedAt;
          if (elapsed < entry.delay) { allDone = false; continue; }
          const localElapsed = elapsed - entry.delay;
          if (localElapsed >= PER_CHAR_DURATION_CAP_MS) {
            entry.span.textContent = entry.finalChar === ' ' ? ' ' : entry.finalChar;
            entry.done = true;
            continue;
          }
          entry.span.textContent = pickPoolChar(DEFAULT_POOL, entry.finalChar);
          allDone = false;
        }
        if (allDone) {
          rafId = 0;
          completed = true;
          node.classList.remove('rolling-text--rolling');
          node.classList.add('rolling-text--settled');
          return;
        }
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    };

    decorated.push(node);
    if (autoStart) node.startRolling();
  }
  return decorated;
}
```

2. Append the animation hook classes to `public/src/styles/main.css`. Add at the end:

```css
/* I2: RollingText scramble engine hooks. Visual is intentionally minimal —
   the typographic motion comes from per-char textContent swaps. */
.rolling-text { display: inline-block; }
.rolling-text [data-roll-char] {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  /* Tabular width prevents layout shimmer while chars swap. */
}
.rolling-text--rolling [data-roll-char] {
  opacity: 0.92;
}
.rolling-text--settled [data-roll-char] {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .rolling-text--rolling [data-roll-char],
  .rolling-text--settled [data-roll-char] {
    opacity: 1;
  }
}
```

3. Run the unit tests — all should now pass:

```bash
node --test test/rolling-text.test.js
```

4. Commit the engine:

```bash
git add public/src/components/RollingText.js public/src/styles/main.css
git commit -m "feat(rolling-text): real RAF scramble engine with reduced-motion guard (I2)"
```

---

## TASK-I2-003 — Wire RollingText into visible page surfaces + Playwright proof

**Iterationsziel-Bezug:** Beweist im echten Browser, dass die Animation läuft — und im reduced-motion Mode eben nicht.

**Requirement links:** REQ-F-001, REQ-F-002, REQ-F-004 (Overview Hero), REQ-A-003.

**Files:**
- modify `public/src/pages/OverviewPage.js`
- modify `public/src/pages/FusionPage.js`
- modify `public/src/pages/DailyPage.js`
- modify `public/src/pages/MethodPage.js`
- optional: modify `public/src/components/SectionHeader.js` (from I1) to render its title through `RollingText({ text })` and call `startRolling()` on mount
- new: `tests/e2e/rolling-letters.spec.js` (Playwright)
- new: `docs/qa/screenshots/i2-rolling/.gitkeep`

**Steps:**

1. In each listed page, locate the brand/hero title (the `<h1>` at the top of the page) and the primary section header. Replace the static text node with a RollingText element. Example for `OverviewPage.js`:

```javascript
import { RollingText } from '../components/RollingText.js';

// inside the page render function, where the hero title is created:
const heroTitle = RollingText({
  text: 'Bazodiac Overview',
  tagName: 'h1',
  className: 'page-hero__title',
});
heroTitle.setAttribute('data-rolling-text', 'hero');
hero.appendChild(heroTitle);

// Start the animation only after the node is connected to the document.
// The router mounts the page synchronously, so we kick the loop on next frame.
if (typeof requestAnimationFrame === 'function') {
  requestAnimationFrame(() => heroTitle.startRolling());
} else {
  heroTitle.startRolling();
}
```

   Apply the same pattern in:
   - `FusionPage.js` — hero title `"Fusion"` or current literal.
   - `DailyPage.js` — hero title `"Tageskompass"` or current literal.
   - `MethodPage.js` — hero title (current literal).
   - Optionally update `SectionHeader.js` to wrap its `title` prop in RollingText and call `startRolling()` after `appendChild`.

   **Do NOT** wrap body copy, paragraphs, list items, or any block longer than ~90 chars. Brand titles and one primary section header per page only.

2. Add a fast DOM-shape sanity test inside `test/rolling-text.test.js` (or a new `test/rolling-text-integration.test.js`) that imports each page module behind a capture-DOM stub and asserts at least one `[data-rolling-text="hero"]` exists. Use the same `installCaptureDom` helper the existing tests use. Skip pages that need live API data — only the static DOM scaffolding is asserted.

3. Create the Playwright spec `tests/e2e/rolling-letters.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = 'docs/qa/screenshots/i2-rolling';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

test.describe('I2: Rolling Letters — visible scramble animation', () => {
  test('motion enabled: scramble visible at t=0, settled at t=900ms', async ({ page }) => {
    // Default Playwright = motion enabled.
    await page.goto(`${BASE_URL}/#/overview`);
    const target = page.locator('[data-rolling-text="hero"]').first();
    await target.waitFor({ state: 'attached', timeout: 5000 });

    // Snapshot at t=0 — should show scramble (non-final) chars in spans.
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'motion-on-t0.png'),
      fullPage: false,
    });

    // The aria-label is the contract: must be the final clear text from
    // frame 0 onwards.
    const ariaLabel = await target.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel.length).toBeGreaterThan(0);

    // Wait past the duration cap and stagger of every char.
    await page.waitForTimeout(900);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'motion-on-t900.png'),
      fullPage: false,
    });

    // textContent of the visible element must equal the aria-label.
    const visibleText = (await target.innerText()).trim();
    expect(visibleText).toBe(ariaLabel.trim());

    // The settled class must be on the element after completion.
    await expect(target).toHaveClass(/rolling-text--settled/);
  });

  test('reduced motion: NO scramble, final text immediately, no animation classes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/#/overview`);
    const target = page.locator('[data-rolling-text="hero"]').first();
    await target.waitFor({ state: 'attached', timeout: 5000 });

    const ariaLabel = await target.getAttribute('aria-label');
    const visibleText = (await target.innerText()).trim();
    expect(visibleText).toBe(ariaLabel.trim());

    // No --rolling class should ever be present in reduced motion.
    await expect(target).not.toHaveClass(/rolling-text--rolling/);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'reduced-motion.png'),
      fullPage: false,
    });
  });
});
```

4. Add an `.gitkeep` so the screenshot dir is committed:

```bash
mkdir -p docs/qa/screenshots/i2-rolling
touch docs/qa/screenshots/i2-rolling/.gitkeep
```

5. Run the full test pyramid:

```bash
node --test test/rolling-text.test.js
npm test
# Start the server, then run Playwright in another shell:
npm start &
SERVER_PID=$!
sleep 2
npx playwright test tests/e2e/rolling-letters.spec.js
kill $SERVER_PID
```

   Inspect the generated screenshots under `docs/qa/screenshots/i2-rolling/` — `motion-on-t0.png` should show at least one char visibly different from the final string; `motion-on-t900.png` and `reduced-motion.png` should show the clean final text.

6. Commit:

```bash
git add public/src/pages/OverviewPage.js public/src/pages/FusionPage.js \
        public/src/pages/DailyPage.js public/src/pages/MethodPage.js \
        public/src/components/SectionHeader.js \
        tests/e2e/rolling-letters.spec.js \
        docs/qa/screenshots/i2-rolling/.gitkeep
git commit -m "feat(pages): mount RollingText on hero titles + Playwright proof (I2)"
```

---

## Iteration Definition of Done

I2 is done only when ALL of the following hold:

1. `node --test test/rolling-text.test.js` passes — including the 5 new I2 tests (RAF scheduling, span text mutation, aria-label invariant, reduced-motion zero-RAF, idempotent start).
2. `npm test` is green (no regressions in any other test file).
3. The Playwright spec `tests/e2e/rolling-letters.spec.js` passes in both motion-on and reduced-motion modes against a live `npm start` server.
4. The three screenshots under `docs/qa/screenshots/i2-rolling/` are checked in and visually distinct:
   - `motion-on-t0.png` shows scramble characters in the hero title.
   - `motion-on-t900.png` shows the clean final hero title.
   - `reduced-motion.png` shows the clean final hero title with no `--rolling` class artifacts.
5. On at least 4 pages (Overview, Fusion, Daily, Method) the hero title carries `data-rolling-text="hero"` and animates on first mount.
6. No new runtime dependencies were added to `package.json`.
7. `aria-label` on every rolling element equals the final clear text at all times (verified by both unit and e2e tests).
8. No RAF loop survives past completion — `cancelAnimationFrame` is called or the tick function returns without re-scheduling.

---

## Validation strategy

Run exactly these commands, in order, from the repo root:

```bash
# 1. Unit + integration test pyramid
node --test test/rolling-text.test.js
npm test

# 2. Live server + Playwright
npm start &
SERVER_PID=$!
sleep 3
curl -fsS http://127.0.0.1:3000/health > /dev/null
npx playwright test tests/e2e/rolling-letters.spec.js --reporter=list
kill $SERVER_PID

# 3. Visual confirmation
ls -lah docs/qa/screenshots/i2-rolling/
open docs/qa/screenshots/i2-rolling/motion-on-t0.png    # macOS
open docs/qa/screenshots/i2-rolling/motion-on-t900.png
open docs/qa/screenshots/i2-rolling/reduced-motion.png
```

All three groups must succeed. If `motion-on-t0.png` looks identical to `motion-on-t900.png`, the animation is not running — go back to TASK-I2-002 and check `startRolling()` is actually invoked after `appendChild`.

---

## Rollback note

This iteration touches one component, one stylesheet, four page files, one new e2e spec, and one screenshot directory. If a regression is found in production:

```bash
git revert <i2-task-003-commit> <i2-task-002-commit> <i2-task-001-commit>
```

The pre-I2 state of `RollingText.js` already renders the final clear text statically (no broken UI), so reverting only restores the missing animation — it does not break readability. No data migration, no env-var changes, no infra touch.

---

## Handoff to next iteration: I3

With I2 done, `RollingText` is a reusable, accessible primitive with a public `startRolling()` API and confirmed visual proof. I3 builds on this:

- I3 will use `RollingText` (and `SectionHeader` from I1) to drive the Overview Hero composition: hero KPIs, top-3 element badges, and dynasty resonance label all share the same scramble timing curve so the hero feels coherent rather than per-element jittery.
- I3 also introduces a shared `mountWithRolling(container, { titles })` helper in `public/src/components/` that consolidates the `requestAnimationFrame(() => el.startRolling())` boilerplate currently sprinkled across the four page files in TASK-I2-003 — refactor opportunity, not a blocker for I2.
- The Playwright spec from I2 stays in place; I3 adds composition-level screenshots in `docs/qa/screenshots/i3-hero/`.

Open I3 only after the I2 DoD checklist above is fully green.
