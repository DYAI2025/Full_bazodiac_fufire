# Minor Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four minor findings from the PR #7 code review that were intentionally deferred: a missing test for longitude alias validation, a confusing DOM mutation ordering in InputPage, an unguarded `days[0]` access in the contract test, and an undocumented timeout budget split.

**Architecture:** All changes are isolated — one file per task, one commit per task. No new abstractions. Tests use `node:test` / `node:assert/strict`, run with `npm test`. Working branch: `2026-05-16-minor-cleanup`.

**Tech Stack:** Node.js ESM, `node:test`, `node:assert/strict`, vanilla JS frontend (no framework)

---

### Task 1: Add missing `location.longitude` out-of-range test in `validatePayload`

**Finding:** `test/payload.test.js` has a test for `location.latitude` out of range, but no symmetric test for `location.longitude`. The code path `obj.location?.longitude` is exercised in validation — the test gap means a regression in longitude validation would go unnoticed.

**Files:**
- Modify: `test/payload.test.js` (append one test)

**Step 1: Read current end of test/payload.test.js to confirm no duplicate**

```bash
tail -20 test/payload.test.js
```

**Step 2: Add the failing test**

Append to `test/payload.test.js`:

```js
test('validatePayload: location.longitude out of range returns error', () => {
  const result = validatePayload({
    date: '1990-03-15',
    location: { latitude: 48.137, longitude: 181 },
    tz: 'UTC',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lon')));
});
```

**Step 3: Run test to confirm RED**

```bash
node --test test/payload.test.js 2>&1 | tail -10
```

Expected: FAIL — if it passes immediately, the validation path is not being hit and the test is broken. STOP and report.

**Step 4: Confirm GREEN (the validation already exists — test should pass after confirming the code path)**

Read `server.js` around the `validatePayload` lon check (`rawLon`). The validation for `location?.longitude` should already be present. If the test was RED, it means the alias was missing — add it. If the test is immediately GREEN, the code path exists and the test is correct coverage.

```bash
node --test test/payload.test.js 2>&1 | tail -10
```

Expected: PASS (all payload tests pass).

**Step 5: Run full suite**

```bash
npm test
```

Expected: 0 fail.

**Step 6: Commit**

```bash
git add test/payload.test.js
git commit -m "test(payload): add missing location.longitude out-of-range coverage"
```

---

### Task 2: Fix DOM mutation ordering in `InputPage.js`

**Finding:** In `public/src/pages/InputPage.js`, on the error path the code does:
```js
errorEl.hidden = false;     // mutates detached subtree
progress.replaceWith(form); // re-inserts form (with errorEl inside)
```
The mutation happens on a detached DOM node (`form` was previously replaced by `progress`). It works because the mutation is applied before re-insertion, but the correct and self-documenting order is to re-insert first, then mutate.

**Files:**
- Modify: `public/src/pages/InputPage.js` (~lines 79-87)

**Step 1: Read the error handling block**

```bash
grep -n "errorEl\|replaceWith\|hidden" public/src/pages/InputPage.js | head -20
```

Find the block that looks like:
```js
if (!res.ok || !res.data) {
  errorEl.textContent = ...;
  errorEl.hidden = false;
  progress.replaceWith(form);
  return;
}
```

**Step 2: Reorder — re-insert first, then show error**

Change to:
```js
if (!res.ok || !res.data) {
  errorEl.textContent = res.error || 'Berechnung fehlgeschlagen. Bitte versuche es erneut.';
  progress.replaceWith(form);
  errorEl.hidden = false;
  return;
}
```

The `textContent` assignment can stay before `replaceWith` (it's just a string property, safe on detached node). Only the `hidden = false` that makes the element visible should come after re-insertion.

**Step 3: Run full suite**

```bash
npm test
```

Expected: 0 fail (this is a frontend change; tests cover server logic).

**Step 4: Commit**

```bash
git add public/src/pages/InputPage.js
git commit -m "fix(frontend): re-insert form before showing error — avoid mutating detached DOM node"
```

---

### Task 3: Guard `json.days[0]` access in transit/timeline contract test

**Finding:** `test/contract.test.js` in the `transit/timeline` test accesses `json.days[0]` without checking if `days` is non-empty. If the upstream returns an empty array (e.g. during degraded state), all subsequent property accesses throw opaque `TypeError` instead of a useful assertion failure.

**Files:**
- Modify: `test/contract.test.js` (~lines 129-145)

**Step 1: Read the timeline test**

Read `test/contract.test.js` lines 129-145.

**Step 2: Add the guard**

After `assert.ok(json.days.length >= 7, ...)`, add:

```js
assert.ok(json.days.length > 0, 'days array must not be empty');
const day = json.days[0];
assert.ok(day, 'days[0] must exist');
```

Replace the existing `const day = json.days[0];` line with this guarded version. The resulting block should look like:

```js
assert.ok(Array.isArray(json.days), 'Response must contain days array');
assert.ok(json.days.length >= 7, `days must have >= 7 entries, got ${json.days.length}`);
assert.ok(json.days.length > 0, 'days array must not be empty');
const day = json.days[0];
assert.ok(day, 'days[0] must exist');
assert.ok(day.date, 'Each day must have a date field');
// ... rest of day checks unchanged
```

**Step 3: Run contract tests (skip check)**

```bash
node --test test/contract.test.js 2>&1 | tail -5
```

Expected: 9 skipped, 0 fail (contract tests require `FUFIRE_CONTRACT_TEST=true`).

**Step 4: Run full suite**

```bash
npm test
```

Expected: 0 fail.

**Step 5: Commit**

```bash
git add test/contract.test.js
git commit -m "test(contract): guard days[0] access — fail with useful message if upstream returns empty days array"
```

---

### Task 4: Document timeout budget split in `orchestrateDailyExperience`

**Finding:** `server.js` lines 501-502 use `API_TIMEOUT_MS * 0.6` and `API_TIMEOUT_MS * 0.35` with no comment explaining the intentional 5% buffer or the rationale for the split. A future developer editing the split may inadvertently close the gap or go over 100%.

**Files:**
- Modify: `server.js` (~lines 499-504)

**Step 1: Read current lines**

Read `server.js` lines 497-507.

**Step 2: Add comment above the split**

Before the `bootstrapMs` line, add:

```js
// Bootstrap gets 60%, daily gets 35%; the remaining 5% absorbs scheduling jitter
// and ensures the outer request handler can still write a 504 before the client times out.
```

The full block should look like:
```js
// Bootstrap gets 60%, daily gets 35%; the remaining 5% absorbs scheduling jitter
// and ensures the outer request handler can still write a 504 before the client times out.
const bootstrapMs = Math.round(API_TIMEOUT_MS * 0.6);
const dailyMs = Math.round(API_TIMEOUT_MS * 0.35);
```

**Step 3: Run full suite**

```bash
npm test
```

Expected: 0 fail.

**Step 4: Commit**

```bash
git add server.js
git commit -m "docs(server): document 60/35/5% timeout budget split rationale in orchestrateDailyExperience"
```

---

## Final verification

```bash
npm test
```

Expected: `# fail 0`

Then push and open PR:

```bash
git push -u origin 2026-05-16-minor-cleanup
gh pr create --title "chore: minor cleanup — longitude test, DOM ordering, contract guard, timeout comment" \
  --body "..."
```
