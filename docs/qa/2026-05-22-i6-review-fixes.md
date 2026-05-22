# I6 Review-Findings Fix — QA Report

**Date:** 2026-05-22  
**Iteration:** I6-fixes  
**Status:** PASS

---

## Goal

Address all 12 findings from I6 code review of commit 1eb4936:
- **6× MAJOR:** RAF leak on page re-mount across all 6 subpages with RollingText wiring
- **5× RISK:** hardcoded hero text duplicated between innerHTML template and RollingText() call
- **1× ARCHITECTURE:** 6 identical ~13-line wiring blocks (DRY violation)

Plus discovered while fixing: MethodPage (I5) used inconsistent `data-rolling-text="hero-headline"` instead of standard `="hero"` — broke `test/e2e/rolling-letters.spec.js`. Standardized via helper migration.

---

## Test Commands

```bash
npm test
# → 720/0/12 pass/fail/skip (was 714/0/12 before — +6 new helper tests)

node --test test/rolling-text-detached.test.js
# → 1/1 pass (new self-cancel test)

node --test test/rolling-text-wire-hero.test.js
# → 5/5 pass (new helper tests)

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test --config=playwright.config.mjs
# → 39/39 pass (was 37/39 after I5+I6 — rolling-letters spec failed due to
#   MethodPage attribute drift, fixed via wireHeroRolling migration)
```

---

## Changes

| File | Change |
|---|---|
| `public/src/components/RollingText.js` | + `isConnected` guard in both `tick()` functions; + `wireHeroRolling` export |
| `test/rolling-text-detached.test.js` | NEW: 1 self-cancel test (JSDOM) |
| `test/rolling-text-wire-hero.test.js` | NEW: 5 helper unit tests (JSDOM) |
| `public/src/pages/HousesPage.js` | −13 lines wiring → `wireHeroRolling(app)` |
| `public/src/pages/WuxingPage.js` | −13 lines → `wireHeroRolling(app)` |
| `public/src/pages/WesternPage.js` | −13 lines → `wireHeroRolling(app)` |
| `public/src/pages/BaziPage.js` | −13 lines → `wireHeroRolling(app)` |
| `public/src/pages/FusionPage.js` | −14 lines (I2 block) → `wireHeroRolling(app)` |
| `public/src/pages/DailyPage.js` | −13 lines → `wireHeroRolling(app)` |
| `public/src/pages/MethodPage.js` | −13 lines + renderHero attribute fix (hero-headline → hero + data-page-title) |

Net change: ~−92 lines (12 inserts, 85 deletes in 6 page commit + 11 lines saved in MethodPage), +1 helper export, +6 tests.

---

## Architecture Notes

- **`wireHeroRolling` is idempotent:** returns null when no `[data-page-title]` marker found — call sites need no guard.
- **Reads className + textContent from marker:** each page keeps its own hero class (e.g. `insight-hero__title bz-h1` for Fusion, `page-title bz-h1` for others) without hardcoded text duplication.
- **`isConnected` self-cancel is defense in depth:** covers any future direct `RollingText()` caller, not just the helper. Both `RollingText` factory and `decorateRollingText` got the same guard.
- **Helper returns cleanup callback:** pages currently don't capture it. Router-driven cleanup is a separate scope (I7 — navigation).
- **MethodPage standardization:** `renderHero()` now emits `data-rolling-text="hero" data-page-title` so the same Playwright selector works on every subpage.

---

## Findings (cross-cutting)

| Finding | Status | Fix |
|---|---|---|
| RAF leak: BaziPage:129, HousesPage:100, WesternPage:161, WuxingPage:159, FusionPage:273, DailyPage:199 | RESOLVED | `wireHeroRolling` returns cleanup + `RollingText.tick()` self-cancels via `isConnected` |
| Text duplication: BaziPage:132, HousesPage:103, WesternPage:164, WuxingPage:162, DailyPage:202 | RESOLVED | Helper reads `marker.textContent` |
| DRY: 6 identical wiring blocks | RESOLVED | 78 lines deleted, replaced with 6 single-line calls |
| Discovered: MethodPage attribute drift (hero-headline vs hero) | RESOLVED | Standardized via helper migration |

---

## Status: PASS
