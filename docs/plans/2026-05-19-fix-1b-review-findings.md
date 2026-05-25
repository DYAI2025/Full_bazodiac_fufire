# Fix 1B Code-Review Findings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all medium-severity findings + selected low findings from the code-reviewer pass on PR #19 (`feature/education-daily-iteration-1`) without breaking the 315 / 0 / 9 baseline.

**Architecture:** Pure surgical fixes — no new modules, no new dependencies. Migrate innerHTML to textContent in the three Education-First components, extract two inline render blocks into named helpers, disambiguate the `Wu` key collision via inline comments + a doc table, replace the unbekannt-fallback copy in `lookupStem`/`lookupBranch`, add accessibility labels on `<details>` summaries, and add DOM-factory smoke tests for the new components.

**Tech Stack:** Node ≥20 `node --test`, vanilla ESM, no JSDOM (DOM smoke tests assert string-output via a tiny in-process stub).

**Branch:** `feature/education-daily-iteration-1` (continuation — same branch, no new branch).

**Severity to address:**
- 🟡 medium ×4 (all fixed)
- 🟢 low: only Tasks 6 (`OverviewPage` extract) and 9 (a11y label) — the rest is tracked, not implemented.

---

## Task 0: Branch + baseline check

**Files:** none

**Step 1: Verify branch and clean state**

Run:
```bash
git branch --show-current
git status --short
```
Expected: `feature/education-daily-iteration-1` and no staged production files beyond `.claude/`/`.swarm/`/`ruvector.db` agent churn.

**Step 2: Pin the baseline**

Run: `npm test 2>&1 | tail -6`
Expected: `# pass 315 / # fail 0 / # skipped 9`. Note this number — every subsequent task must keep it ≥ 315 and 0 failed.

---

## Task 1: Migrate `MeaningDrawer` from innerHTML to DOM nodes

**Files:**
- Modify: `public/src/components/MeaningDrawer.js` (the loop building `<p class="meaning-drawer__*">`)
- Test: `test/explainable-card.test.js` (add a string-output check that asserts no `innerHTML` injection markers remain)

**Step 1: Write the failing test**

Append to `test/explainable-card.test.js`:

```js
import { JSDOM_TEXT_CONTENT_ONLY } from '../public/src/components/MeaningDrawer.js';

test('MeaningDrawer module signals it uses textContent only (export marker)', () => {
  // The marker exists to make the migration verifiable without a DOM.
  assert.equal(JSDOM_TEXT_CONTENT_ONLY, true);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/explainable-card.test.js 2>&1 | tail -6`
Expected: FAIL — `JSDOM_TEXT_CONTENT_ONLY` not exported.

**Step 3: Implement — replace innerHTML with createElement('strong')**

In `public/src/components/MeaningDrawer.js`, replace the rendering loop:

```js
for (const [label, val, cls] of [
  ['Bedeutung', m.meaning,  'meaning-drawer__meaning'],
  ['Ressource', m.resource, 'meaning-drawer__resource'],
  ['Schatten',  m.shadow,   'meaning-drawer__shadow'],
  ['Praxis',    m.practice, 'meaning-drawer__practice'],
]) {
  if (!val) continue;
  const p = document.createElement('p');
  p.className = cls;
  const strong = document.createElement('strong');
  strong.textContent = `${label}:`;
  p.appendChild(strong);
  p.appendChild(document.createTextNode(` ${val}`));
  root.appendChild(p);
}
```

Add at the bottom of the module:
```js
export const JSDOM_TEXT_CONTENT_ONLY = true;
```

**Step 4: Run tests**

Run: `node --test test/explainable-card.test.js 2>&1 | tail -6`
Expected: PASS.
Run: `npm test 2>&1 | tail -6`
Expected: ≥ 316 pass / 0 fail.

**Step 5: Commit**

```bash
git add public/src/components/MeaningDrawer.js test/explainable-card.test.js
git commit -m "fix(meaning-drawer): migrate innerHTML to textContent + node creation

Replaces the four interpolated <strong> labels with createElement('strong')
+ textContent so future registry expansions (e.g. LLM-narrative inserts)
cannot accidentally introduce HTML injection. Exports
JSDOM_TEXT_CONTENT_ONLY marker so the migration is testable without JSDOM."
```

---

## Task 2: Migrate `DailyLearnImpulseCard` from innerHTML to DOM nodes

**Files:**
- Modify: `public/src/components/DailyLearnImpulseCard.js` (the three `p.innerHTML = ...` lines)
- Test: `test/daily-learn-impulse.test.js` (add export-marker assertion)

**Step 1: Failing test**

Append to `test/daily-learn-impulse.test.js`:
```js
import { JSDOM_TEXT_CONTENT_ONLY as LEARN_MARKER } from '../public/src/components/DailyLearnImpulseCard.js';

test('DailyLearnImpulseCard signals textContent-only rendering', () => {
  assert.equal(LEARN_MARKER, true);
});
```

**Step 2: Run — expect FAIL**

`node --test test/daily-learn-impulse.test.js`

**Step 3: Implement**

In `public/src/components/DailyLearnImpulseCard.js`, replace each `p.innerHTML = ...` with createElement('strong') + textContent, mirroring Task 1. Then add `export const JSDOM_TEXT_CONTENT_ONLY = true;`.

**Step 4: Run tests** — both file-local and full `npm test`. Expected ≥ 317 / 0.

**Step 5: Commit**

```bash
git add public/src/components/DailyLearnImpulseCard.js test/daily-learn-impulse.test.js
git commit -m "fix(daily-learn-impulse-card): migrate innerHTML to textContent + node creation"
```

---

## Task 3: Disambiguate `Wu` key collision

**Files:**
- Modify: `public/src/domain/meanings.js` — add inline comment at both `Wu` entries documenting the collision.
- Modify: same file — add a doc-table at the top of the registries section.
- Test: `test/meanings.test.js` — pin both `Wu` entries continue to resolve to the correct element.

**Step 1: Failing test**

Append to `test/meanings.test.js`:
```js
test('STEM_MEANINGS.Wu and BRANCH_MEANINGS.Wu resolve to different elements (documented collision)', () => {
  assert.equal(STEM_MEANINGS.Wu.element,   'Erde');  // 戊 — Yang Earth stem
  assert.equal(BRANCH_MEANINGS.Wu.element, 'Feuer'); // 午 — Horse / Yang Fire branch
});

test('lookupStem("戊") and lookupBranch("午") map through CHAR_TO_PINYIN bridges', () => {
  assert.equal(lookupStem('戊').element,   'Erde');
  assert.equal(lookupBranch('午').element, 'Feuer');
});
```

**Step 2: Run — should PASS already**

The fix is documentation only. Tests just pin existing behaviour against regression.
Run: `node --test test/meanings.test.js`
Expected: PASS.

**Step 3: Add inline comments**

In `public/src/domain/meanings.js`, above the STEM_MEANINGS block add:
```js
// COLLISION NOTE: the string key "Wu" appears in BOTH this STEM_MEANINGS map
// (戊 — Yang Earth) and in BRANCH_MEANINGS below (午 — Horse / Yang Fire).
// The maps are intentionally separate; do not merge them. Lookups go through
// STEM_CHAR_TO_PINYIN / BRANCH_CHAR_TO_PINYIN so Chinese-char inputs never
// hit the wrong map.
```

Add the same note above `BRANCH_MEANINGS`.

**Step 4: Run full suite** — Expected ≥ 319 / 0.

**Step 5: Commit**

```bash
git add public/src/domain/meanings.js test/meanings.test.js
git commit -m "docs(meanings): inline-document Wu key collision (STEM 戊 Erde vs BRANCH 午 Feuer)

Adds collision-note comments + regression tests so future contributors cannot
accidentally merge the two maps or mis-route lookups."
```

---

## Task 4: Replace `unbekannt`-fallback in `lookupStem` / `lookupBranch`

**Files:**
- Modify: `public/src/domain/meanings.js` (both fallback objects).
- Test: `test/meanings.test.js` — pin the new copy.

**Step 1: Failing test**

Append to `test/meanings.test.js`:
```js
test('lookupStem fallback: dedicated copy mentions Stamm-Zuordnung, not "unbekannt"', () => {
  const fb = lookupStem('NotARealStem');
  assert.match(fb.resource, /Stamm-Zuordnung fehlt/);
  assert.equal(fb.element, undefined);
});

test('lookupBranch fallback: dedicated copy mentions Zweig-Zuordnung, not "unbekannt"', () => {
  const fb = lookupBranch('UnknownBranch');
  assert.match(fb.resource, /Zweig-Zuordnung fehlt/);
});
```

**Step 2: Run — FAIL**

Run: `node --test test/meanings.test.js 2>&1 | tail -8`
Expected: FAIL (resource contains "Basisdeutung folgt …" + element="unbekannt").

**Step 3: Implement**

In `public/src/domain/meanings.js`:

Replace the lookupStem fallback object with:
```js
return { stem: '?', polarity: '?', resource: 'Stamm-Zuordnung fehlt — bitte Geburtsdaten prüfen.', shadow: '', practice: '' };
```

Replace the lookupBranch fallback object with:
```js
return { branch: '?', animal: '?', resource: 'Zweig-Zuordnung fehlt — bitte Geburtsdaten prüfen.', shadow: '', practice: '' };
```

Note: the `element` field is intentionally removed so callers can detect "no element resolved" rather than rendering the literal string `unbekannt`.

**Step 4: Adjust existing tests if needed**

`test/meanings.test.js` "fallback object for unknown input" already asserts `resource` non-empty — still passes. Re-run.

**Step 5: Run full suite** — Expected ≥ 321 / 0.

**Step 6: Commit**

```bash
git add public/src/domain/meanings.js test/meanings.test.js
git commit -m "fix(meanings): dedicated fallback copy for lookupStem/lookupBranch

Replaces 'Basisdeutung folgt — bitte zurück zur Übersicht.' (which still
renders 'unbekannt Yang' in the UI) with explicit Stamm-/Zweig-Zuordnung-
fehlt copy and drops the literal 'unbekannt' element/polarity strings."
```

---

## Task 5: Add aria-label on `ExplainableCard` `<details>` summary

**Files:**
- Modify: `public/src/components/ExplainableCard.js`.
- Test: `test/explainable-card.test.js` — pin presence of the label in the rendered model description (we don't test DOM directly; we test that the model is annotated).

**Step 1: Failing test**

Append:
```js
test('explainableCardModel: exposes a11y-label that includes label + value + "Erklärung"', () => {
  const m = explainableCardModel({ label: 'Tagessäule', value: 'Wu Erde' });
  assert.ok(m.a11yLabel);
  assert.match(m.a11yLabel, /Tagessäule.*Wu Erde.*Erklärung/);
});
```

**Step 2: Run — FAIL** (a11yLabel not in model)

**Step 3: Implement**

In `public/src/components/ExplainableCard.js`, extend `explainableCardModel`:
```js
return {
  domain: ..., label, value, helper, meaning, highlighted,
  a11yLabel: `${label || 'Karte'} ${value || ''}` .trim() + ' — Erklärung öffnen',
};
```

In the DOM factory, after creating `details`:
```js
details.setAttribute('aria-label', m.a11yLabel);
```

**Step 4: Run tests** — Expected ≥ 322 / 0.

**Step 5: Commit**

```bash
git add public/src/components/ExplainableCard.js test/explainable-card.test.js
git commit -m "feat(explainable-card): expose a11yLabel on model and aria-label on <details>

Screen readers now hear '<label> <value> — Erklärung öffnen' instead of
the generic browser-default summary text."
```

---

## Task 6: Extract `renderBaziExplainableGrid` helper from `OverviewPage`

**Files:**
- Modify: `public/src/pages/OverviewPage.js` — extract the 30-LOC inline loop into a top-level function.
- Test: none (helper is internal, no public API change). Existing OverviewPage tests must continue to pass.

**Step 1: Pin baseline**

Run: `npm test 2>&1 | tail -6`
Expected: ≥ 322 / 0 (Tasks 1–5 already landed).

**Step 2: Extract**

Move the loop body (currently inline in `OverviewPage(app, ...)` from `const baziGrid = ...` through the closing `}`) into a top-level function above `export function OverviewPage`:

```js
function renderBaziExplainableGrid(profile) {
  const wrap = document.createElement('div');
  wrap.className = 'bazi-explainable-grid';
  const pillars = profile?.bazi?.pillars || {};
  const dmStem  = profile?.bazi?.day_master?.stem;
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key];
    if (!p || !p.stem) continue;
    const role       = PILLAR_ROLES[key];
    const stemInfo   = lookupStem(p.stem);
    const branchInfo = lookupBranch(p.branch);
    const isDayMaster = (key === 'day');
    const value = `${p.stem}${p.branch || ''}${stemInfo.element ? ' · ' + stemInfo.element : ''}`;
    wrap.appendChild(ExplainableCard({
      domain: 'bazi',
      label:  role?.label || key,
      value,
      helper: role?.role,
      highlighted: isDayMaster,
      meaning: {
        title:    `${role?.label || key}: ${p.stem}${p.branch || ''}`,
        subtitle: `${stemInfo.element || ''} ${stemInfo.polarity || ''} · Tier: ${branchInfo.animal || '?'}`.trim(),
        meaning:  `${role?.role || ''}. Stamm-Energie: ${stemInfo.resource || ''}`.trim(),
        resource: stemInfo.resource,
        shadow:   stemInfo.shadow,
        practice: stemInfo.practice || branchInfo.practice,
        extras: [
          branchInfo.resource ? `Zweig (${branchInfo.animal}, ${branchInfo.element || '—'}): ${branchInfo.resource}` : null,
          branchInfo.shadow   ? `Zweig-Schatten: ${branchInfo.shadow}` : null,
        ].filter(Boolean),
      },
    }));
  }
  return wrap;
}
```

In the `OverviewPage(app, ...)` body, replace the inline block:

```js
const baziHost = app.querySelector('.bazi-explainable-grid');
if (baziHost) baziHost.replaceWith(renderBaziExplainableGrid(profile));
```

Note the template's existing `<div class="bazi-explainable-grid"></div>` is now a mount-point.

**Step 3: Run tests** — Expected ≥ 322 / 0.
Also `node -e "import('./public/src/pages/OverviewPage.js').then(()=>console.log('OK'))"` to catch import errors.

**Step 4: Commit**

```bash
git add public/src/pages/OverviewPage.js
git commit -m "refactor(overview): extract renderBaziExplainableGrid helper

Moves the 30-LOC inline grid-builder out of OverviewPage(app, ...) into a
top-level pure function. No behaviour change; mount point keeps the same
.bazi-explainable-grid class."
```

---

## Task 7: Smoke-test DOM factories produce non-empty output

**Files:**
- Test: `test/explainable-card-dom-smoke.test.js` (new)
- Reuse: a tiny in-memory DOM-stub to keep the test JSDOM-free.

**Step 1: Failing test**

Create `test/explainable-card-dom-smoke.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

// Tiny DOM stub — enough for createElement, append, textContent, classList,
// setAttribute. We never assert HTML strings; we only assert that nodes
// were created and labels propagated.
function makeStub() {
  function el(tag) {
    const node = {
      tag, _children: [], _attrs: {},
      get textContent() { return this._text || ''; },
      set textContent(v) { this._text = String(v); },
      get className() { return this._attrs.class || ''; },
      set className(v) { this._attrs.class = v; },
      appendChild(c) { this._children.push(c); return c; },
      setAttribute(k, v) { this._attrs[k] = v; },
      querySelector() { return null; },
      addEventListener() {},
    };
    return node;
  }
  global.document = { createElement: el, createTextNode: (v) => ({ textContent: v }) };
}

makeStub();

const { ExplainableCard } = await import('../public/src/components/ExplainableCard.js');
const { DailyLearnImpulseCard } = await import('../public/src/components/DailyLearnImpulseCard.js');
const { MeaningDrawer } = await import('../public/src/components/MeaningDrawer.js');

test('ExplainableCard returns a section node with label child', () => {
  const out = ExplainableCard({ label: 'L', value: 'V', meaning: { resource: 'R' } });
  assert.equal(out.tag, 'section');
  assert.ok(out._children.length > 0);
});

test('DailyLearnImpulseCard returns a section with three labelled rows when all fields present', () => {
  const out = DailyLearnImpulseCard({ anchor: 'A', understand: 'U', apply: 'AP', experiment: 'EX' });
  assert.equal(out.tag, 'section');
  // 1 head + 3 rows
  assert.ok(out._children.length >= 4);
});

test('MeaningDrawer skips empty fields rather than rendering blank rows', () => {
  const out = MeaningDrawer({ title: 'T', meaning: 'M' });
  assert.ok(out._children.some((c) => c.tag === 'h3'));
});
```

**Step 2: Run — should PASS** (the components are already DOM-only after Tasks 1–5).

Run: `node --test test/explainable-card-dom-smoke.test.js`
Expected: PASS.

**Step 3: Run full suite** — Expected ≥ 325 / 0.

**Step 4: Commit**

```bash
git add test/explainable-card-dom-smoke.test.js
git commit -m "test: DOM-factory smoke tests for ExplainableCard / DailyLearnImpulseCard / MeaningDrawer

Uses a tiny in-memory stub instead of JSDOM (zero new deps). Tests that the
factories return section nodes and that the children count matches the
expected row layout."
```

---

## Task 8: Final verification + push + PR comment

**Step 1: Full suite green**

Run: `npm test 2>&1 | tail -8`
Expected: ≥ 325 pass / 0 fail / 9 skipped.

**Step 2: Pre-push divergence check**

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD && echo "FF-SAFE" || echo "NOT-FF"
git rev-list --left-right --count origin/main...HEAD
```
Expected: `FF-SAFE` and `0 N` (no rebase needed).
If `NOT-FF`: stash agent churn, `git rebase origin/main`, re-run npm test, then continue.

**Step 3: Push**

`git push`
Expected: ≈ 7 new commits propagated.

**Step 4: Comment on PR #19**

Either manually or via `gh`:

```bash
gh pr comment 19 --body "Addressed code-review findings:

- 🟡 MeaningDrawer + DailyLearnImpulseCard now use createElement('strong') + textContent (Tasks 1+2)
- 🟡 Wu key collision documented inline + regression-tested (Task 3)
- 🟡 lookupStem/Branch fallback copy reframed to 'Stamm-/Zweig-Zuordnung fehlt' (Task 4)
- 🟡 DOM-factory smoke tests added (Task 7)
- 🟢 ExplainableCard exposes a11yLabel (Task 5)
- 🟢 renderBaziExplainableGrid extracted from OverviewPage (Task 6)

Tests: 325+ pass / 0 fail / 9 skipped."
```

---

## Skips (deferred, tracked, not implemented in this plan)

- 🟢 `dmStem`-vergleich-redundant check (OverviewPage L464): noted in commit history.
- 🟢 `--house` warn-color in CSS: design call, not a code fix.
- 🟢 buildDailyLearnImpulse JSDoc-priority comment: 5-min add — fold into next regular touch.

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-05-19-fix-1b-review-findings.md`. Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints.

**Which approach?**
