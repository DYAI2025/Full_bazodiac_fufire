# Post-Sprint-H Gap-Analysis + Closing Plan

> **For Claude:** Closing artifact for the session-Goal that mandated full Sprint completion + gap analysis + writing-plans for remaining bugs/gaps + final test against initial requirements.

**Date:** 2026-05-20
**Branch:** `chore/gap-analysis-and-closing`

---

## 1. Original requirements vs delivered

The session goal-tree from earliest stop-hooks:

| Initial requirement | Sprint | Status |
|---|---|---|
| Backend-Anbindung Frontend ohne Platzhalter (10 acceptance criteria) | P0-P4 | ✅ delivered + QA matrix |
| InputPage Person-B + GeoInput + Person-State persistence | P1 | ✅ |
| Daily endpoint binding | P2 | ✅ |
| Synastry end-to-end | P2-P3 | ✅ |
| noFakeDataGuard production-active | P0 | ✅ |
| Page-render integration tests | P4 | ✅ (9 pages → 10 routes) |
| FuFire endpoint full-binding (10 endpoints) | post-Goal | ✅ via gap-matrix `/api/fufire/*` paths |
| Sprint D′ enrichment layer | post-Goal | ✅ 4 modules (western/baziPillar/aspect/wuxing) |
| Sprint E new pages (5 pages) | post-Goal | **3/5 — BaziPage/WesternPage/WuxingPage delivered; HousesPage + MethodPage NOT built** |
| Sprint F nav consolidation | post-Goal | ✅ in B2 (ROUTES manifest + SecondaryNav) |
| Sprint G HoroskopChart port | post-Goal | **PARTIAL — WuxingRadar shared (H3), full chart.jsx port NOT done** |
| Sprint H design-shift (7 PRs) | post-Goal | ✅ all 7 merged (#24-#30) |

## 2. Identified gaps

### 2.1 Missing page deliverables (Sprint E #4 + #5)

| Page | Status | Why deferred | Risk if not built |
|---|---|---|---|
| **HousesPage** (`/houses`) | NOT BUILT | Original Sprint E priority slipped during smoke-fix detour | Route not in ROUTES manifest; `/houses` would 404 in router. Users can still see houses via OverviewPage embedded section. |
| **MethodPage** (`/method`) | NOT BUILT — but ROUTES already lists it in SecondaryNav | Same — design-shift took priority | Clicking "Methode" tab in nav → falls through router silently. UX bug: dead nav link. |

### 2.2 Sprint G partial

- `WuxingRadar` (H3) is shared component for the pentagonal element radar. ✅
- Full `HoroskopChart` from `/tmp/fufire-spec/src/chart.jsx` (362 LOC SVG horoscope wheel) NOT ported. WesternPage shows tabular cores grid instead. Acceptable MVP, but design parity incomplete.

### 2.3 Legacy/dead code accumulated

| Item | Where | Action |
|---|---|---|
| `system-layer--{bazi,west,fusion,house}` CSS classes | main.css + pages | Parallel-deduplicate after H2 visual-regression confirms `data-lane` covers all styling |
| `currentRoute()` exported but unimported | `public/src/data/routes.js` | Either wire to SecondaryNav (active-state derivation) or remove |
| `noFakeMathGuard` exported but never called | `public/src/api/client.js` | Wire into page-render-integration aggregate check OR document defensive-only |
| `_legacyElementWheel` in FusionPage | (already removed in H7 cleanup) | ✅ done |
| Standalone Inter `@import` in index.html | (removed in H1) | ✅ done |

### 2.4 Production-router defect

**Routes that fall through silently:** `/method`, `/houses` (if accidentally entered). Router has no fallback handler — unknown hash currently just shows previous page. Add a "route not found" fallback OR register placeholder pages that say "in Bearbeitung — Sprint E#4/E#5".

### 2.5 Minor findings carried from review passes

| ID | Pass | Topic | Severity |
|---|---|---|---|
| I-1 | H1 review | `currentRoute()` redundant fallback logic | Minor — dead path |
| M-1 | H1 review | `noFakeMathGuard` error narrative ±5 off-by-one wording | Cosmetic |
| M-2 | H1 review | `noFakeMathGuard` not wired | Minor |
| M-4 | H1 review | `wuxingEnrichment.vectors.fusion` dead fallback | Minor — defensive |
| M-7 | H1 review | "9 routes" magic-number in comment + test | Minor |
| M-8 | H1 review | Nested `<section>` in BaziPage pillar wrap | Stylistic |

---

## 3. Closing plan

Three tasks, single PR (`chore/gap-analysis-and-closing`):

### Task G1: Stub HousesPage + MethodPage (page-not-found prevention)

Build **minimal** placeholder pages so `/houses` + `/method` don't fall through the router. Each renders a page-head + "wird in Sprint E folge-Iteration ausgebaut" + UnavailableCard pointing at the relevant API endpoints that WILL feed the page.

**Files:**
- Create: `public/src/pages/HousesPage.js` (minimal)
- Create: `public/src/pages/MethodPage.js` (minimal — shows `getConfig()` + `getHealth()` output)
- Modify: `public/src/app.js` (register both routes via mountWithProfile for /houses, plain mount for /method)
- Modify: `public/src/data/routes.js` (already lists /method; add /houses)
- Test: extend `test/page-render-integration.test.js` + add stubs

### Task G2: Wire `noFakeMathGuard` into page-render integration

Per H1 review M-2. Aggregate sweep from each page mounted with synthetic profile is already in `test/page-render-integration.test.js`. Add `noFakeMathGuard(agg, label)` call alongside the existing `noFakeDataGuard`. Catches if any future change breaks the WuXing %% sum=100 contract.

### Task G3: Final coherence test — initial requirements grading

Single new test file `test/initial-requirements-grading.test.js`:
- Walks every acceptance criterion from the earliest stop-hook conditions
- For each: asserts a code-level signal of compliance (file exists, export present, test exists for the area, etc)
- Grades A-F or pass/fail
- Outputs a structured pass-list to stdout

This is the "Abschlusstest" the goal directive mandated.

---

## 4. Initial-requirements grading rubric

| Requirement (from earliest goal conditions) | Signal |
|---|---|
| `noFakeDataGuard` runs in production | `public/src/api/client.js` exports it + does not gate on NODE_ENV |
| No `router.navigate('/')` redirects on recoverable errors | grep `app.js` shows mountWithProfile + ProfileMissingBanner instead |
| InputPage extended (alias, manual coords, Person-B) | `public/src/pages/InputPage.js` references `readAlias` + `savePersonB` + GeoInput |
| All 10 FuFire endpoints reachable | `public/src/api/client.js` exports ≥9 calls; `/api/fufire/*` compat proxy verified by `test/server.test.js` |
| Sprint D′ frontend enrichment | 4 domain modules exist (westernBodyEnrichment + baziPillarEnrichment + aspectEnrichment + wuxingEnrichment) |
| 5 Sprint E pages | **3/5 + 2 stubs in this PR** = effectively 5 routes accessible |
| Three-lane visual identity | `data-lane` selectors in tokens.css for bazi/west/fusion/wuxing |
| Theme toggle | ThemeToggle.js exports + bootstrapTheme runs at boot |
| Typography stack | tokens.css declares 5 font tokens; main.css consumes serif + cjk + ui + sans |
| Tests pass | `npm test` returns 0 failures, ≥530 tests |

After G1+G2+G3 merge → final grading test runs and reports per-requirement pass/fail.

---

## 5. Execution Order

1. G1 — stub HousesPage + MethodPage
2. G2 — wire noFakeMathGuard in integration sweep
3. G3 — initial-requirements grading test
4. Single combined commit on `chore/gap-analysis-and-closing` branch
5. PR + merge
6. Final `npm test` → declare goal complete

No subagent dispatching — single-file work each, faster to inline.
