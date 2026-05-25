# Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `anthropic-skills:executing-plans` to implement this plan task-by-task.

**Goal:** Fix 2 correctness bugs + 3 improvements found in the Batch-1 code review before continuing with Batch 2.

**Architecture:** Minimal surgical edits to 2 existing files. No new files. TDD: failing tests first that expose the bugs, then fix, then verify full suite still green.

**Tech Stack:** Vanilla JS ESM, `node:test`

---

### Task 1 — Fix `airComplement` underflow + `signHarmony` null-element guard

**Files:**
- Modify: `public/src/synastry/domain-score.js`
- Modify: `test/domain-score.test.js` — add 2 targeted failing tests first

**Step 1: Add failing tests for the two bugs**

Append to `test/domain-score.test.js`:

```javascript
test('communication harmony never goes negative (airComplement underflow)', () => {
  const highAir = {
    western: { bodies: {}, houses: [], aspects: [] },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: { Holz:0, Feuer:0, Erde:0, Metall:0, Luft:0.6, Wasser:0 } },
  };
  const zeroAir = {
    western: { bodies: {}, houses: [], aspects: [] },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: null },
  };
  const scores = computeDomainScores(highAir, zeroAir);
  assert.ok(scores.communication.harmony >= 0, 'communication harmony went negative');
  assert.ok(scores.communication.tension >= 0, 'communication tension went negative');
});

test('signHarmony returns 0.5 for unknown sign (null element guard)', () => {
  const weirdSign = {
    western: {
      bodies: { Mercury: { sign: 'UNKNOWNSIGN', house: 3 } },
      houses: [],
      aspects: [],
    },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: null },
  };
  assert.doesNotThrow(() => computeDomainScores(weirdSign, weirdSign));
  const scores = computeDomainScores(weirdSign, weirdSign);
  assert.ok(typeof scores.communication.harmony === 'number');
  assert.ok(scores.communication.harmony >= 0 && scores.communication.harmony <= 100);
});
```

**Step 2: Run tests — verify FAIL**
```bash
node --test test/domain-score.test.js
```

**Step 3: Apply fixes in `domain-score.js`**

Fix 1 — `signHarmony` null-element guard:
```javascript
function signHarmony(signA, signB) {
  if (!signA || !signB) return 0.5;
  const elA = signToElement(signA);
  const elB = signToElement(signB);
  if (!elA || !elB) return 0.5;
  return elementPairTone(elA, elB).score;
}
```

Fix 2 — `airComplement` underflow:
```javascript
const airComplement = Math.max(0, 1 - Math.abs(airDeltaA - airDeltaB) * 2);
```

**Step 4: Run targeted tests — verify PASS**
```bash
node --test test/domain-score.test.js
```
Expected: all 6 tests pass.

**Step 5: Full suite**
```bash
node --test
```
Expected: 144 pass, 0 fail.

**Step 6: Commit**
```bash
git add public/src/synastry/domain-score.js test/domain-score.test.js
git commit -m "fix: airComplement underflow + signHarmony null-element guard in domain-score"
```

---

### Task 2 — Three improvements (non-blocking, one commit)

**Files:**
- Modify: `public/src/data/astro-mappings.js` — add `Metall` color
- Modify: `public/src/synastry/domain-score.js` — deduplicate `cohAlignment`
- Modify: `public/src/synastry/house-comparison.js` — non-empty fallback text

**Step 1: Add `Metall` to ELEMENT_COLORS in `astro-mappings.js`**
```javascript
export const ELEMENT_COLORS = {
  Feuer:  '#EF4444',
  Erde:   '#CA8A04',
  Luft:   '#60A5FA',
  Wasser: '#3B82F6',
  Holz:   '#10B981',
  Metall: '#A1A1AA',
};
```

**Step 2: Deduplicate cohAlignment in `domain-score.js`**

Replace separate `cohComplement` and `cohDivergence` with one shared constant:
```javascript
const cohAlignment = Math.max(0, 1 - Math.abs(cohA - cohB));
// use cohAlignment in both career avg() and growth avg()
```

**Step 3: Non-empty fallback text in `house-comparison.js`**
```javascript
if (!tmpl) return { house: houseIndex, label:`Haus ${houseIndex}`, signA, signB, elemA, elemB, tone, text:`${signA} (${elemA}) trifft ${signB} (${elemB}).`, score };
```

**Step 4: Full suite**
```bash
node --test
```
Expected: 144 pass, 0 fail.

**Step 5: Commit**
```bash
git add public/src/data/astro-mappings.js public/src/synastry/domain-score.js public/src/synastry/house-comparison.js
git commit -m "fix: Metall color, cohAlignment dedup, non-empty house fallback text"
```
