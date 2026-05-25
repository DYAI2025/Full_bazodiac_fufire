# westernBodyEnrichment Review-Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Address the 2 Important findings from the code review of commit `11270fa`. Produce a focused follow-up PR with one commit per finding and RED→GREEN test evidence in each commit message.

**Architecture:** Pure follow-up to the just-merged `westernBodyEnrichment.js` module. Two tiny defensive patches, each guarded by a regression test. No behavior change for existing callers.

**Tech Stack:** Node ≥20 ESM, `node --test`, vanilla DOM. Same fixture-driven test approach as the parent commit.

---

## Findings in scope

| ID  | Severity  | Finding                                                                                                  | Location                                              |
|-----|-----------|----------------------------------------------------------------------------------------------------------|-------------------------------------------------------|
| I-1 | Important | `formatDegMinutes(Infinity)` produces `"Infinity°NaN'"` instead of `null`                                | `public/src/domain/westernBodyEnrichment.js:26-34`    |
| I-2 | Important | Module reads `rawBody.retrograde` only — silently drops standalone `/calculate/western`'s `is_retrograde` | `public/src/domain/westernBodyEnrichment.js:100`      |

## Findings explicitly dropped (Minor — out of scope per /review-fix-cycle)

| ID  | Why deferred                                                                                            |
|-----|---------------------------------------------------------------------------------------------------------|
| M-1 | Theoretical `minutes=60` float-precision edge case — never triggered in practice for legitimate inputs |
| M-2 | `Math.floor(min)` vs `Math.round(min)` — convention choice matching design demo                         |
| M-3 | `new Array(13)` sparse-array style — works fine, no functional issue                                   |
| M-4 | `WESTERN_SIGN_MEANINGS` keyed on EN only — upstream contract is stable                                  |
| M-5 | Persona3-Sun-Longitude test description drift — test still passes                                       |
| M-6 | `enrichWesternBodies(array)` defensive guard — acceptable looseness                                     |
| M-7 | `PLANET_DE` mixes name + glyph — refactor when pages need them separate (Sprint E)                     |
| M-8 | `noFakeDataGuard` import in unit test — stylistic, defer to test-suite reorganization                  |

These will be referenced in the PR body for traceability but receive no fix in this cycle.

---

## Task 1: Fix `formatDegMinutes` Infinity-input handling (I-1)

**Files:**
- Modify: `public/src/domain/westernBodyEnrichment.js:26-34`
- Test:   `test/western-body-enrichment.test.js` (append after the existing `formatDegMinutes` block, after line 56)

### Step 1.1: Write the failing test

Append to `test/western-body-enrichment.test.js`, after the `null/undefined/NaN returns null` test (currently line 52-56):

```js
test('formatDegMinutes: Infinity / -Infinity returns null (no garbage string)', () => {
  // Defensive — upstream `degree_in_sign` is 0..30 by API contract, but if
  // upstream ever returns Infinity (e.g. division-by-zero bug) the result
  // must NOT be the string "Infinity°NaN'" which would leak into rendered DOM.
  assert.equal(formatDegMinutes(Infinity), null);
  assert.equal(formatDegMinutes(-Infinity), null);
});
```

### Step 1.2: Run RED test — confirm it fails

```bash
node --test test/western-body-enrichment.test.js 2>&1 | grep -E "Infinity|not ok|^# fail"
```

**Expected fail output (proves test is reaching the buggy code path):**
```
not ok N - formatDegMinutes: Infinity / -Infinity returns null (no garbage string)
  error: 'Expected values to be strictly equal:\n  + actual - expected\n  + \'Infinity°NaN\\'\'\n  - null'
```

**Halt-on-defect check:** If the test PASSES on first run, the test isn't reaching the actual code path under test (or the bug isn't present as described). STOP and report — do NOT proceed.

### Step 1.3: Apply the fix

In `public/src/domain/westernBodyEnrichment.js:26-34`, replace:

```js
export function formatDegMinutes(decimalDeg) {
  if (decimalDeg === null || decimalDeg === undefined) return null;
  const n = Number(decimalDeg);
  if (Number.isNaN(n)) return null;
  const deg = Math.floor(n);
  const minDec = (n - deg) * 60;
  const min = Math.floor(minDec);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}
```

with:

```js
export function formatDegMinutes(decimalDeg) {
  if (decimalDeg === null || decimalDeg === undefined) return null;
  const n = Number(decimalDeg);
  // Number.isFinite excludes NaN AND ±Infinity — single guard for both.
  if (!Number.isFinite(n)) return null;
  const deg = Math.floor(n);
  const minDec = (n - deg) * 60;
  const min = Math.floor(minDec);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}
```

**Net change:** one line — `Number.isNaN(n)` → `!Number.isFinite(n)`.

### Step 1.4: Run GREEN test — confirm fix works

```bash
node --test test/western-body-enrichment.test.js 2>&1 | tail -5
```

**Expected:** all enrichment tests pass (20 total after the addition).

### Step 1.5: Run full suite — confirm no regression

```bash
npm test 2>&1 | tail -10
```

**Expected:** `pass 396, fail 0, skipped 9` (one more than pre-fix baseline 404/395).

### Step 1.6: Commit (one commit per finding)

```bash
git add public/src/domain/westernBodyEnrichment.js test/western-body-enrichment.test.js
git commit -m "$(cat <<'EOF'
fix(enrichment): formatDegMinutes guards Infinity input (review I-1)

Number.isNaN(n) catches only NaN. For Infinity/-Infinity the function
fell through, producing a garbage string "Infinity°NaN'" that would
leak into rendered DOM and bypass noFakeDataGuard (which has no
"Infinity" entry in its blocklist).

RED test added asserts formatDegMinutes(Infinity) === null and
formatDegMinutes(-Infinity) === null. Reproduced before fix —
test failed with "Infinity°NaN'" returned.

Fix: switch the guard from Number.isNaN(n) to !Number.isFinite(n)
(catches NaN AND ±Infinity in one expression).

Addresses code-review finding I-1 from commit 11270fa.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Accept `is_retrograde` field-name from standalone calculate/western (I-2)

**Files:**
- Modify: `public/src/domain/westernBodyEnrichment.js:100`
- Test:   `test/western-body-enrichment.test.js` (append after the existing `enrichBody` block)

### Step 2.1: Write the failing test

Append to `test/western-body-enrichment.test.js`, after the existing `retrograde flag survives` test (around current line 127):

```js
test('enrichBody: accepts is_retrograde field-name (standalone /calculate/western shape)', () => {
  // The orchestrator endpoint /api/azodiac/profile returns `retrograde: bool`
  // but the standalone endpoint /api/fufire/calculate/western returns the
  // verbose form `is_retrograde: bool`. Both are real upstream shapes
  // (verified in test/_fixtures/upstream-snapshots/profile.real.json vs
  // western.real.json). The enrichment layer must accept both — otherwise
  // a future MethodPage refresh-button via calculateWestern() would silently
  // lose the retrograde flag.
  const out = enrichBody(
    'Pluto',
    { sign: 'Scorpio', is_retrograde: true, degree_in_sign: 9.7, longitude: 219.7 },
    {},
  );
  assert.equal(out.retrograde, true, 'is_retrograde must be honored');
});

test('enrichBody: prefers `retrograde` over `is_retrograde` when both are present', () => {
  // Orchestrator field wins if both happen to appear. Defensive.
  const out = enrichBody(
    'Mars',
    { sign: 'Leo', retrograde: false, is_retrograde: true, degree_in_sign: 5, longitude: 125 },
    {},
  );
  assert.equal(out.retrograde, false, 'orchestrator field must take precedence');
});
```

### Step 2.2: Run RED test — confirm it fails

```bash
node --test test/western-body-enrichment.test.js 2>&1 | grep -E "is_retrograde|not ok|^# fail"
```

**Expected:** the first new test fails — `out.retrograde` is `false` (the fallback default), not `true`. The second new test passes already (orchestrator-field-precedence behavior is incidentally correct because the current code only reads `rawBody.retrograde`).

**Halt-on-defect check:** If the first test passes on first run, STOP — the module already supports `is_retrograde` and the finding was wrong.

### Step 2.3: Apply the fix

In `public/src/domain/westernBodyEnrichment.js:100`, replace:

```js
retrograde: rawBody.retrograde ?? false,
```

with:

```js
// Orchestrator (/api/azodiac/profile) returns `retrograde`;
// standalone (/api/fufire/calculate/western) returns `is_retrograde`.
// Accept both — orchestrator field wins when both present.
retrograde: rawBody.retrograde ?? rawBody.is_retrograde ?? false,
```

### Step 2.4: Run GREEN test — confirm fix works

```bash
node --test test/western-body-enrichment.test.js 2>&1 | tail -5
```

**Expected:** all enrichment tests pass (22 total after the additions).

### Step 2.5: Run full suite — confirm no regression

```bash
npm test 2>&1 | tail -10
```

**Expected:** `pass 398, fail 0, skipped 9`.

### Step 2.6: Commit (separate commit per finding)

```bash
git add public/src/domain/westernBodyEnrichment.js test/western-body-enrichment.test.js
git commit -m "$(cat <<'EOF'
fix(enrichment): accept is_retrograde field-name (review I-2)

The orchestrator endpoint /api/azodiac/profile returns retrograde as
`retrograde: bool`. The standalone /api/fufire/calculate/western
returns it as `is_retrograde: bool`. Both shapes verified in
test/_fixtures/upstream-snapshots/profile.real.json vs western.real.json.

enrichBody() previously read only `rawBody.retrograde`, so any future
MethodPage refresh button calling calculateWestern() would silently
default retrograde to false even for retrograde bodies — bug that
would surface as "Pluto direct" rendering when Pluto is actually R.

RED test added asserts a body record with `is_retrograde: true` is
honored. Reproduced before fix — out.retrograde returned false.

Fix: chain the null-coalescing — `rawBody.retrograde ?? rawBody.is_retrograde ?? false`.
Orchestrator field takes precedence when both are present (second
test guards that contract).

Addresses code-review finding I-2 from commit 11270fa.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Open follow-up PR

### Step 3.1: Push branch

```bash
git push -u origin fix/2026-05-19-western-body-enrichment-fixes
```

### Step 3.2: Create PR with finding-IDs in body

```bash
gh pr create \
  --base main \
  --head fix/2026-05-19-western-body-enrichment-fixes \
  --title "fix(enrichment): westernBodyEnrichment review follow-up (11270fa)" \
  --body "$(cat <<'EOF'
## Summary

Follow-up to commit `11270fa` (westernBodyEnrichment.js + 19 tests). Code review surfaced 2 Important findings + 8 Minor. This PR addresses both Important findings with TDD-style RED→GREEN evidence in each commit message.

## Findings addressed

- **I-1** — `formatDegMinutes(Infinity)` produced `"Infinity°NaN'"` instead of `null`. Switched guard from `Number.isNaN(n)` to `!Number.isFinite(n)`. Regression test added.
- **I-2** — Module ignored `is_retrograde` field-name returned by standalone `/calculate/western`. Now accepts both `retrograde` and `is_retrograde`. Regression test added.

## Findings deferred (Minor — out of scope)

These were flagged but not actioned, per `/review-fix-cycle` guardrails:

| ID  | Topic                                                                           |
|-----|---------------------------------------------------------------------------------|
| M-1 | Theoretical `minutes=60` float-precision edge case                              |
| M-2 | `Math.floor(min)` vs `Math.round(min)` convention                               |
| M-3 | `new Array(13)` sparse-array style                                              |
| M-4 | `WESTERN_SIGN_MEANINGS` keyed on EN only                                        |
| M-5 | Persona3-Sun-Longitude test description drift                                   |
| M-6 | `enrichWesternBodies(array)` defensive guard                                    |
| M-7 | `PLANET_DE` mixes name + glyph in single string                                 |
| M-8 | `noFakeDataGuard` import in unit test                                           |

## Test plan

- [x] RED test for I-1 fails before fix, passes after
- [x] RED test for I-2 fails before fix, passes after
- [x] `npm test` baseline: 404 → 398 pass (+3 new tests), 0 fail, 9 skip
- [x] No behavior change for the 19 existing enrichment tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 3.3: Report URL

After `gh pr create` completes, report the PR URL to the user.

---

## Done-Definition

- [ ] Two commits land on `fix/2026-05-19-western-body-enrichment-fixes`, one per finding, each with RED→GREEN evidence in commit message
- [ ] `npm test` shows 407 tests / 398 pass / 9 skip / 0 fail at branch tip (404 + 3 new)
- [ ] PR open against `main` with body referencing finding IDs and dropped Minor IDs
- [ ] No new runtime dependencies
- [ ] No behavior change for the existing 19 enrichment tests
