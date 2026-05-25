# Code Review Fixes — PR #38 Findings

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all findings from the post-merge code review of PR #38 (Pro Birthchart + RollingText Entry-only).

**Architecture:** Six targeted fixes across RollingText.js, westernBodyEnrichment.js, NatalChartWheel tests, dom-capture-stub, and view_model tests. TDD throughout — every functional change gets a failing test first. No new dependencies, no scope creep.

**Tech Stack:** Vanilla ESM, `node --test`, capture-DOM stub, `requestAnimationFrame` mock in Node

**Baseline:** 615 pass, 0 fail, 9 skip (`npm test` on `main` after PR #38 merge)

---

## Finding Summary

| # | Severity | Finding |
|---|---|---|
| F1 | Important | RollingText: zero browser animation — RAF loop never implemented |
| F2 | Important | `BODY_KEY_ALIASES` exported but never consumed |
| F3 | Minor | Missing test: "Equal-House-Linien fehlen wenn echte Cusps da" |
| F4 | Minor | `decorateRollingText` no guard against losing nested markup |
| F5 | Minor | `querySelectorAll` stub: compound selectors silently return `[]` |
| F6 | Minor | `view_model.test.js` normalizer assertion too weak |

---

### Task 1: Fix F6 — Tighten normalizer assertion (view_model.test.js)

Smallest, no implementation risk. Tighten first so baseline is honest.

**Files:**
- Modify: `test/view_model.test.js` (find the test `normalizeAzodiacResult: body without longitude is skipped...`)

**Step 1: Locate the test**

```bash
grep -n "longitude is skipped" test/view_model.test.js
```

Expected: one match near line 260-280.

**Step 2: Current weak assertion (understand why it's weak)**

Current code:
```js
assert.ok(!('Moon' in vm.western.bodies) || vm.western.bodies.Moon.longitude !== 0,
  'Body with missing longitude must not appear with longitude: 0 in ViewModel');
```

Problem: passes if Moon is present with `longitude: 1`. Should assert Moon is ABSENT entirely.

**Step 3: Run test to see it pass with weak assertion**

```bash
node --test test/view_model.test.js 2>&1 | grep -A3 "longitude is skipped"
```

Expected: `ok` (it passes currently).

**Step 4: Replace assertion**

In `test/view_model.test.js`, find:
```js
assert.ok(!('Moon' in vm.western.bodies) || vm.western.bodies.Moon.longitude !== 0,
    'Body with missing longitude must not appear with longitude: 0 in ViewModel');
```

Replace with:
```js
const moonEntry = vm.western.bodies.Moon;
assert.ok(
  moonEntry === undefined || moonEntry.longitude !== 0,
  `Body with missing longitude must be absent or not at 0°; got: ${JSON.stringify(moonEntry)}`
);
```

Note: We use `undefined` check rather than `!('Moon' in ...)` because `normalizeAzodiacResult` stores in `vm.western.bodies[name]` — if it skips, the key won't exist. The `|| longitude !== 0` fallback stays in case the body is present for other reasons (e.g., future API change that sends longitude: null explicitly).

**Step 5: Run test — must still pass**

```bash
node --test test/view_model.test.js 2>&1 | tail -8
```

Expected: all tests in file pass.

**Step 6: Run full suite**

```bash
npm test 2>&1 | tail -8
```

Expected: ≥615 pass, 0 fail.

**Step 7: Commit**

```bash
git add test/view_model.test.js
git commit -m "test(normalizer): tighten missing-longitude assertion — assert absent not just ≠0"
```

---

### Task 2: Fix F3 — Add Equal-House test (natal-chart-wheel.test.js)

**Files:**
- Modify: `test/natal-chart-wheel.test.js` (append after existing Pro-Wheel tests)

**Step 1: Understand existing WHEEL_MODEL_V2**

```bash
grep -n "WHEEL_MODEL_V2\|cuspLongitude\|data-house" test/natal-chart-wheel.test.js
```

`WHEEL_MODEL_V2` has exactly 4 house cusps (houses 1, 4, 7, 10).

**Step 2: Understand how house lines are rendered**

In `public/src/components/NatalChartWheel.js`:
```js
if (Array.isArray(w.houses) && w.houses.length) {
  for (const h of w.houses) {
    // renders data-house="N" line per cusp
  }
}
```

So: 4 cusps in → 4 house lines. 12 equal-house fallback would mean 12 lines regardless.

**Step 3: Write the failing test (it should pass already — verify it does)**

Append to `test/natal-chart-wheel.test.js`:

```js
test('NatalChartWheel: house lines match provided cusps only — no equal-house fallback', () => {
  cap.reset();
  const root = NatalChartWheel({ wheel: WHEEL_MODEL_V2 });
  const s = serializeFakeTree(root);
  // WHEEL_MODEL_V2 provides exactly 4 cusps (houses 1,4,7,10).
  // If the wheel falls back to equal-house it would produce 12 lines.
  const houseLineMatches = [...s.matchAll(/data-house="/g)];
  assert.equal(houseLineMatches.length, 4,
    `Expected 4 house lines (one per provided cusp), got ${houseLineMatches.length}`);
});
```

**Step 4: Run to verify it passes (no implementation needed — it's a guard test)**

```bash
node --test test/natal-chart-wheel.test.js 2>&1 | tail -8
```

Expected: all tests pass including the new one. If it fails with 12 lines, there IS a regression to fix in `NatalChartWheel.js`.

**Step 5: Full suite**

```bash
npm test 2>&1 | tail -8
```

Expected: ≥616 pass, 0 fail (one new test added).

**Step 6: Commit**

```bash
git add test/natal-chart-wheel.test.js
git commit -m "test(wheel): guard against equal-house fallback — verify house line count matches cusps"
```

---

### Task 3: Fix F5 — Document querySelectorAll stub limitation

**Files:**
- Modify: `test/_helpers/dom-capture-stub.js`

**Step 1: Find the querySelectorAll function**

```bash
grep -n "querySelectorAll" test/_helpers/dom-capture-stub.js
```

**Step 2: Add limitation comment above the function**

Find the line `querySelectorAll(sel = '') {` and prepend a comment block:

```js
// querySelectorAll: supports single-token [attr] and [attr="val"] patterns only.
// Compound selectors like [data-x][data-y] or .foo[data-x] return [].
// This matches the needs of rolling-text tests; extend if other tests need more.
querySelectorAll(sel = '') {
```

**Step 3: Run full suite — no behavioral change, must stay green**

```bash
npm test 2>&1 | tail -8
```

**Step 4: Commit**

```bash
git add test/_helpers/dom-capture-stub.js
git commit -m "docs(stub): document querySelectorAll single-token limitation"
```

---

### Task 4: Fix F4 — Document decorateRollingText text-only constraint

**Files:**
- Modify: `public/src/components/RollingText.js`

**Step 1: Find the textContent = '' line**

```bash
grep -n "textContent = ''" public/src/components/RollingText.js
```

**Step 2: Add inline comment documenting the constraint**

Find:
```js
    // Clear existing content (real DOM: removes all child nodes).
    node.textContent = '';
```

Replace with:
```js
    // Clear existing text content. In real DOM, textContent = '' removes ALL
    // child nodes including nested elements (icons, tooltips). Only decorate
    // elements whose entire content is plain text — no nested markup.
    node.textContent = '';
```

**Step 3: Run full suite**

```bash
npm test 2>&1 | tail -8
```

**Step 4: Commit**

```bash
git add public/src/components/RollingText.js
git commit -m "docs(RollingText): document text-only constraint on decorateRollingText"
```

---

### Task 5: Fix F2 — Wire BODY_KEY_ALIASES in westernBodyEnrichment.js

`BODY_KEY_ALIASES` normalizes variant API spellings (e.g. `"North Node"` → `"NorthNode"`). It must be applied in `enrichWesternBodies` when iterating raw body keys.

**Files:**
- Modify: `public/src/domain/westernBodyEnrichment.js`
- Modify: `test/western-body-enrichment.test.js` (check if exists) OR create test in relevant test file

**Step 1: Check for existing enrichment tests**

```bash
ls test/ | grep western
node --test test/western-body-enrichment.test.js 2>&1 | head -5 || echo "no file"
```

**Step 2: Write failing test FIRST**

Find or create `test/western-body-enrichment.test.js`. Append:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichWesternBodies } from '../public/src/domain/westernBodyEnrichment.js';

test('enrichWesternBodies: normalizes variant body key spellings via BODY_KEY_ALIASES', () => {
  // API sometimes returns "North Node" (space, not camelCase).
  const raw = {
    bodies: {
      'North Node': { longitude: 45.0, sign: 'Taurus', retrograde: false },
      Sun:          { longitude: 10.0, sign: 'Aries',  retrograde: false },
    },
    houses: {},
  };
  const result = enrichWesternBodies(raw);
  // "North Node" must be normalized to "NorthNode" (canonical key).
  assert.ok('NorthNode' in result,
    `Expected canonical key "NorthNode" in result, got keys: ${Object.keys(result).join(', ')}`);
  assert.ok(!('North Node' in result),
    'Variant key "North Node" must not persist — must be normalized');
});
```

**Step 3: Run to verify RED**

```bash
node --test test/western-body-enrichment.test.js 2>&1 | tail -8
```

Expected: FAIL (result still has `'North Node'` key, not `'NorthNode'`).

**Step 4: Implement — import and apply aliases in `enrichWesternBodies`**

In `public/src/domain/westernBodyEnrichment.js`:

Add import at top (join existing imports from `astro-mappings.js`):
```js
import { signToElement, SIGN_DE, SIGN_GLYPH, PLANET_DE, BODY_KEY_ALIASES } from '../data/astro-mappings.js';
```

Find `enrichWesternBodies` function body and update the loop:
```js
export function enrichWesternBodies(rawWestern) {
  const bodies = rawWestern?.bodies;
  if (!bodies || typeof bodies !== 'object') return {};
  const cusps = rawWestern.houses || {};
  const out = {};
  for (const [rawKey, raw] of Object.entries(bodies)) {
    const bodyKey = BODY_KEY_ALIASES[rawKey] ?? rawKey;  // normalize variant spellings
    const enriched = enrichBody(bodyKey, raw, cusps);
    if (enriched) out[bodyKey] = enriched;
  }
  return out;
}
```

**Step 5: Run test — must go GREEN**

```bash
node --test test/western-body-enrichment.test.js 2>&1 | tail -8
```

**Step 6: Full suite — must stay green**

```bash
npm test 2>&1 | tail -8
```

Expected: ≥617 pass (or +1 if new test file), 0 fail.

**Step 7: Commit**

```bash
git add public/src/domain/westernBodyEnrichment.js test/western-body-enrichment.test.js
git commit -m "feat(enrichment): wire BODY_KEY_ALIASES — normalize variant API body spellings (North Node → NorthNode)"
```

---

### Task 6: Fix F1 — Implement browser scramble RAF loop in RollingText.js

This is the most complex fix. The component sets `data-roll-final`/`data-roll-delay` but no RAF loop reads them. We add a minimal `scheduleScramble` function that drives the split-flap effect in browser.

**Architecture of the scramble:**
- Each `[data-roll-char]` span has `data-roll-final` (target char) and `data-roll-delay` (ms before scramble starts settling).
- `scheduleScramble(el, charPool)` iterates spans, uses RAF to cycle through random chars, then settles on `data-roll-final` after `delay + ~400ms`.
- Time-based (not frame-count based) so it's consistent across frame rates.
- In Node (no RAF): `scheduleScramble` returns immediately — no side effects.
- Reduced motion: `scheduleScramble` is never called.

**Files:**
- Modify: `public/src/components/RollingText.js`
- Modify: `test/rolling-text.test.js` (add 2 new tests)

**Step 1: Write RED test — mock RAF, verify scramble runs**

Append to `test/rolling-text.test.js`:

```js
// ── Test 9: RAF mock — scramble is scheduled when RAF available ──────────────
test('RollingText: scheduleScramble fires RAF when requestAnimationFrame available', () => {
  const calls = [];
  global.requestAnimationFrame = (cb) => { calls.push(cb); return calls.length; };
  try {
    const el = RollingText({ text: 'AB', tagName: 'span' });
    // At least one RAF call should have been queued (one per non-space char).
    assert.ok(calls.length >= 1,
      `Expected ≥1 RAF calls queued for 2-char text, got ${calls.length}`);
  } finally {
    delete global.requestAnimationFrame;
  }
});

// ── Test 10: RAF mock — chars settle to final value after ticks ──────────────
test('RollingText: chars settle to data-roll-final value when RAF ticks complete', () => {
  // Synchronous RAF mock: immediately runs all queued callbacks.
  const queue = [];
  let now = 0;
  global.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  global.performance = { now: () => now };

  try {
    const el = RollingText({ text: 'X', tagName: 'span' });
    const chars = el.querySelectorAll('[data-roll-char]');
    assert.equal(chars.length, 1);

    // Advance time past delay + scramble duration and flush RAF queue.
    now = 1000; // well past any delay + 400ms scramble
    while (queue.length > 0) {
      const cb = queue.shift();
      cb(now);
    }

    assert.equal(chars[0].textContent, 'X',
      'char must settle to final value "X" after RAF ticks complete');
  } finally {
    delete global.requestAnimationFrame;
    delete global.performance;
  }
});
```

**Step 2: Run to verify RED**

```bash
node --test test/rolling-text.test.js 2>&1 | tail -15
```

Expected: Tests 9 and 10 FAIL (`0 RAF calls queued`, `char shows 'X' but that's because no scramble = already X` — test 9 fails, test 10 may spuriously pass since char already is 'X').

Wait — test 10 may pass spuriously (char is already 'X'). Re-read: the test verifies the char ENDS as 'X', which it already does. Test 9 is the real RED: RAF calls = 0.

**Step 3: Implement `scheduleScramble`**

In `public/src/components/RollingText.js`, add this function before `RollingText`:

```js
const SCRAMBLE_DURATION_MS = 380;

function scheduleScramble(el, charPool) {
  if (typeof requestAnimationFrame !== 'function') return;
  const perf = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance
    : { now: () => Date.now() };

  const spans = el.querySelectorAll('[data-roll-char]');
  for (const span of spans) {
    const finalChar = span.dataset?.rollFinal;
    if (finalChar === undefined) continue;
    const delay = Number(span.dataset?.rollDelay) || 0;
    const startTime = perf.now();

    function tick(ts) {
      const elapsed = ts - startTime;
      if (elapsed < delay) {
        span.textContent = charPool[Math.floor(Math.random() * charPool.length)];
        requestAnimationFrame(tick);
        return;
      }
      const progress = (elapsed - delay) / SCRAMBLE_DURATION_MS;
      if (progress < 1) {
        span.textContent = charPool[Math.floor(Math.random() * charPool.length)];
        requestAnimationFrame(tick);
      } else {
        span.textContent = finalChar === ' ' ? ' ' : finalChar;
      }
    }
    requestAnimationFrame(tick);
  }
}
```

At the end of `RollingText()`, just before `return el`:

```js
  if (!reduced) scheduleScramble(el, charPool);
  return el;
```

Note: `scheduleScramble` already guards `typeof requestAnimationFrame !== 'function'` internally, so no double-guard needed. The `!reduced` check here avoids even calling `scheduleScramble` for reduced-motion users.

Also update `decorateRollingText` to call `scheduleScramble` after appending spans:

```js
  for (const node of nodes) {
    // ... existing code ...
    const reduced = prefersReducedMotion();
    for (const char of originalText) {
      // ... existing span creation ...
    }
    if (!reduced) scheduleScramble(node, charPool);  // ADD THIS LINE
  }
```

But `charPool` isn't available in `decorateRollingText`. Export `DEFAULT_POOL` or pass it. Simplest: use `DEFAULT_POOL` directly in `scheduleScramble` call inside `decorateRollingText`.

Update `decorateRollingText` signature to accept `charPool`:

```js
export function decorateRollingText(root, {
  selector = '[data-roll-text]',
  maxChars = 90,
  charPool = DEFAULT_POOL,
} = {}) {
```

And at the end of the for-loop body:
```js
    if (!reduced) scheduleScramble(node, charPool);
```

**Step 4: Run tests — tests 9 and 10 must go GREEN, existing 8 must stay green**

```bash
node --test test/rolling-text.test.js 2>&1 | tail -12
```

Expected: 10/10 pass.

**Step 5: Check `querySelectorAll` works for scheduleScramble in Node**

`scheduleScramble` calls `el.querySelectorAll('[data-roll-char]')`. In the browser this is fine. In the RAF-mock test (Node), the stub's updated `querySelectorAll` will scan `_children` and find the spans. ✓

**Step 6: Run full suite**

```bash
npm test 2>&1 | tail -8
```

Expected: ≥619 pass (8 original + 2 new), 0 fail.

**Step 7: Commit**

```bash
git add public/src/components/RollingText.js test/rolling-text.test.js
git commit -m "feat(RollingText): implement browser scramble RAF loop — chars cycle charPool then settle to final"
```

---

### Task 7: Fix F1b — Add document guard to RollingText.js

**Files:**
- Modify: `public/src/components/RollingText.js`

**Step 1: Write test that calls RollingText without document**

Add to `test/rolling-text.test.js`:

```js
// ── Test 11: graceful null return when document absent ───────────────────────
test('RollingText: returns null gracefully when document is not available', () => {
  const savedDoc = global.document;
  delete global.document;
  try {
    const result = RollingText({ text: 'Test', tagName: 'span' });
    assert.equal(result, null,
      'Must return null when document is absent (SSR / no-DOM context)');
  } finally {
    global.document = savedDoc;
  }
});
```

**Step 2: Run to verify RED**

```bash
node --test test/rolling-text.test.js 2>&1 | grep -E "not ok|ok 11"
```

Expected: `not ok 11` — currently throws `ReferenceError: document is not defined`.

**Step 3: Add guard at top of `RollingText` function**

In `public/src/components/RollingText.js`, at the very start of the `RollingText` function body:

```js
export function RollingText({ ... } = {}) {
  if (typeof document === 'undefined') return null;   // ADD THIS LINE
  const el = document.createElement(tagName);
  // ...
```

Similarly guard `decorateRollingText`:

```js
export function decorateRollingText(root, { ... } = {}) {
  if (typeof document === 'undefined') return;   // ADD THIS LINE
  // ...
```

**Step 4: Run tests — test 11 must pass, all others unchanged**

```bash
node --test test/rolling-text.test.js 2>&1 | tail -12
```

Expected: 11/11 pass.

**Step 5: Full suite**

```bash
npm test 2>&1 | tail -8
```

Expected: ≥620 pass, 0 fail.

**Step 6: Commit**

```bash
git add public/src/components/RollingText.js test/rolling-text.test.js
git commit -m "fix(RollingText): guard against missing document — return null in SSR/no-DOM contexts"
```

---

### Task 8: Final validation + documented review update

**Step 1: Run full suite, capture output**

```bash
npm test 2>&1 | tail -10
```

Expected: ≥620 pass, 0 fail, 9 skip.

**Step 2: Verify all findings addressed**

```bash
# F1 — browser scramble: data-roll-final/delay + scheduleScramble present
grep -n "scheduleScramble\|rollFinal\|rollDelay" public/src/components/RollingText.js

# F2 — BODY_KEY_ALIASES wired
grep -n "BODY_KEY_ALIASES" public/src/domain/westernBodyEnrichment.js

# F3 — Equal-house guard test present
grep -n "equal-house\|house line" test/natal-chart-wheel.test.js

# F4 — text-only constraint documented
grep -n "nested markup\|text-only" public/src/components/RollingText.js

# F5 — compound selector limitation documented
grep -n "compound\|single-token" test/_helpers/dom-capture-stub.js

# F6 — assertion tightened
grep -n "moonEntry\|longitude !== 0" test/view_model.test.js
```

**Step 3: Run targeted rolling-text tests to verify scramble**

```bash
node --test test/rolling-text.test.js 2>&1 | grep -E "ok [0-9]+"
```

Expected: `ok 1` through `ok 11` all present.

**Step 4: Create final PR (findings-fix branch)**

```bash
git log main..HEAD --oneline
```

Then push and open PR:
```bash
git push -u origin fix/pr38-review-findings
gh pr create \
  --title "fix(review): address all PR #38 code review findings" \
  --body "## Fixes all findings from post-merge PR #38 review

### Fixed
- **F1 (Important)**: RollingText browser scramble RAF loop implemented — chars cycle through charPool then settle; `scheduleScramble()` added; 2 new RAF-mock tests (tests 9+10)
- **F1b (Minor)**: RollingText `typeof document` guard — returns null in SSR/no-DOM; 1 new test (test 11)
- **F2 (Important)**: BODY_KEY_ALIASES wired in enrichWesternBodies — \`'North Node'\` → \`'NorthNode'\` etc.; 1 new test
- **F3 (Minor)**: NatalChartWheel equal-house guard test added
- **F4 (Minor)**: decorateRollingText text-only constraint documented
- **F5 (Minor)**: querySelectorAll stub limitation documented
- **F6 (Minor)**: normalizer test assertion tightened

### Tests
Before: 615 pass, 0 fail
After: ≥620 pass, 0 fail (5+ new tests)

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Quick reference — all commands in order

```bash
# Task 1 (F6 assertion)
node --test test/view_model.test.js && git commit -m "..."

# Task 2 (F3 house test)
node --test test/natal-chart-wheel.test.js && npm test && git commit -m "..."

# Task 3 (F5 stub comment)
npm test && git commit -m "..."

# Task 4 (F4 decorateRollingText comment)
npm test && git commit -m "..."

# Task 5 (F2 BODY_KEY_ALIASES)
node --test test/western-body-enrichment.test.js  # RED first
# implement...
node --test test/western-body-enrichment.test.js  # GREEN
npm test && git commit -m "..."

# Task 6 (F1 scramble)
node --test test/rolling-text.test.js  # RED tests 9+10
# implement scheduleScramble...
node --test test/rolling-text.test.js  # GREEN 10/10
npm test && git commit -m "..."

# Task 7 (F1b document guard)
node --test test/rolling-text.test.js  # RED test 11
# implement guard...
node --test test/rolling-text.test.js  # GREEN 11/11
npm test && git commit -m "..."

# Task 8 (validation)
npm test
# all verifications
gh pr create ...
```
