# Overview Signature Experience — QA Review

Plan: `docs/plans/2026-05-22-overview-signature-experience.md`
Branch: `feat/overview-signature-experience`
Started: 2026-05-22

## Iteration OV-I1 — ViewModel narrative + element summary

**Sprintziel.** Die Overview bekommt eine klare Storyline und ein sauberes UI-Modell: Identitaet, Signatur, Hauptspannung, Belege, Handlung, Vertiefung.

### Commits

| SHA | Message |
|---|---|
| `51ac8fe` | docs(plan): Overview Signature Experience implementation plan |
| `2de6c92` | feat(overview): add signatureHero/meaningBridge/topMovements/guidedDeepDives to ViewModel (OV-I1-T01) |
| `3b545af` | feat(overview): user-readable element summary, drop internal field labels (OV-I1-T02) |

### Tests

| Metric | Baseline | After OV-I1 | Delta |
|---|---|---|---|
| tests | 740 | 749 | +9 |
| pass | 728 | 737 | +9 |
| fail | 0 | 0 | — |
| skipped | 12 | 12 | — |

### Playwright

Spec: `test/e2e/overview-hero.spec.js` (existing I4 spec — pinned no-regression test).
Run: `APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/overview-hero.spec.js`
Result: 4/4 pass, 5.5s.

### Screenshots

- `docs/qa/screenshots/i4-overview/overview-desktop.png` — desktop layout
- `docs/qa/screenshots/i4-overview/overview-mobile.png` — mobile layout
- `docs/qa/screenshots/i4-overview/hero-closeup.png` — hero crop
- `docs/qa/screenshots/i4-overview/deep-dive-expanded.png` — deep-dive open
- `docs/qa/screenshots/overview-signature/ov-i1/overview-default.png` — OV-I1 evidence snapshot

### Parallel subagent gate

- **Tester (Playwright/screenshot integrity):** **GREEN.** 4/4 Playwright pass, no silent skip (fallback screenshots `overview-no-hero.png` absent), screenshots in window. 749 tests / 737 pass / 0 fail / 12 skipped.
- **Reviewer (code review):** **GREEN.** No Critical/Major. 3 nits documented (todayLever placeholder, carries fallback degraded-state, signatureHero hyphen on multi-word stems) — tracked for OV-I2/OV-I3.
- **Acceptance reviewer (1st pass):** **RED.** Critical: lowercase raw `vm.elementEconomy` keys leaked via CSS `text-transform: capitalize`; original regression test was a false negative; `elementSummary` built but never wired.
- **Acceptance reviewer (2nd pass after fix b6eaa0e):** **GREEN.** REQ-F-OV-001, REQ-F-OV-003, REQ-F-OV-004, REQ-D-003 all PASS.

### Findings & fixes

| # | Sev | Finding | Fix commit |
|---|---|---|---|
| 1 | Critical | `OverviewPage.renderElementEconomy` iterated `vm.elementEconomy` and emitted lowercase keys → CSS capitalized them to banned labels (Distribution / Dominant / Deficient / Plan / Properties / TodayLever) | `b6eaa0e` — replaced with `vm.elementSummary` (sentence + dt/dd + lever + /wuxing CTA, all German UI strings) |
| 2 | Critical | Regression test in `page-render-integration.test.js` was a false negative (whole-word capitalized only) | `b6eaa0e` — added `>\s*key\s*<` exact-text-content rejection for all six lowercase raw keys; whole-word capitalized check kept for `Distribution / Deficient / TodayLever` |
| 3 | Critical | `elementSummary` built but never wired into the page | `b6eaa0e` — wired |
| 4 | Nit | `meaningBridge.todayLever.body` is a hardcoded constant identical per profile | tracked for OV-I2 |
| 5 | Nit | `meaningBridge.carries` fallback ignores partial Sun-or-DM availability | tracked for OV-I2 |
| 6 | Nit | `signatureHero.essence` hyphen on multi-word stems ("Yang Holz-Kern") | tracked for OV-I2 |

### Verdict

**GREEN.** No Critical/Major outstanding. Nits scheduled for OV-I2.

### Push

`feat/overview-signature-experience` → pushed (origin tracking).

---

## Iteration OV-I2 — SignatureHero + MeaningBridge

**Sprintziel.** Die erste Bildschirmhoehe der Overview beantwortet: Wer bin ich im Modell? Was ist die zentrale Fusion-Signatur? Was kann ich als naechstes tun?

### Commits

| SHA | Message |
|---|---|
| `36d3350` | test(overview): lock target hero DOM structure (OV-I2-T03) |
| `4b0e66c` | feat(overview): SignatureHero with wheel-left / fusion-signature-right (OV-I2-T04) |
| `196d215` | feat(overview): MeaningBridge cards (carries/friction/today-lever) (OV-I2-T05) |
| `6d7ed7f` | fix(overview): wheel-anchor owns wheel only, contrast tokens, dedup essence (OV-I2 fix) |

### Tests

| Metric | Before OV-I2 | After OV-I2 + fix | Delta |
|---|---|---|---|
| tests | 749 | 757 | +8 |
| pass | 737 | 745 | +8 |
| fail | 0 | 0 | — |
| skipped | 12 | 12 | — |

Playwright `test/e2e/overview-hero.spec.js`: 4/4 pass.

### Screenshots (`docs/qa/screenshots/overview-signature/ov-i2/`)

- `overview-desktop-i2.png` — wheel left, signature panel right with 3 evidence cards + 2 CTAs.
- `overview-mobile-i2.png` — stacked wheel-over-panel, no horizontal overflow.
- `hero-closeup-i2.png` — hero close crop.

### Parallel subagent gate

- **Tester:** GREEN. 4/4 Playwright pass, no silent skip, screenshots in window, DOM probe confirms signature-hero + legacy hero + meaning-bridge + wheel-anchor + fusion-signature-panel + 3 evidence + 3 meaning cards.
- **Reviewer (1st pass):** GREEN with Major flag: legacy hero nested inside wheel-anchor (line 183).
- **Acceptance reviewer (1st pass):** **RED.** 3 Critical (evidence cards unreadable, wheel not dominant, MeaningBridge body invisible) + 2 Major (duplicated essence, nested legacy hero).
- **Acceptance reviewer (2nd pass after fix 6d7ed7f):** **GREEN.** All four REQs PASS, no remaining blockers. Suggestion: BaZi card text wraps aggressively — non-blocking.

### Findings & fixes

| # | Sev | Finding | Fix |
|---|---|---|---|
| 1 | Critical | Evidence cards on desktop unreadable (no text color set) | `6d7ed7f` — hardcoded `rgba(255,255,255,0.95)` on `.bz-evidence-card` text |
| 2 | Critical | Wheel shrunk because legacy hero filled `[data-hero-slot="wheel-anchor"]` | `6d7ed7f` — wheel-anchor now mounts `NatalChartWheel` directly; legacy hero dismantled, key-facts + birthchart-wheel kept as siblings, fusion-narrative removed |
| 3 | Critical | MeaningBridge body + source invisible (contrast) | `6d7ed7f` — same contrast token applied to `.bz-meaning-card` |
| 4 | Major | Essence headline duplicated (SignatureHero + legacy fusion-narrative) | `6d7ed7f` — fusion-narrative block removed |
| 5 | Major | Legacy hero nested inside wheel-anchor (`OverviewPage.js:183`) | `6d7ed7f` — refactor per finding #2 |
| 6 | Minor | Empty `href="#"` for empty cta.route | `6d7ed7f` — filter empty routes in FusionSignaturePanel |
| 7 | Minor | Empty `<p data-card-source>` when source blank | `6d7ed7f` — skip when blank in MeaningBridge |
| 8 | Suggestion | BaZi card text wraps aggressively | tracked, non-blocking |

### Verdict

**GREEN.** All four REQs (REQ-F-OV-001/002/003, REQ-NF-002) PASS.

### Push

`git push origin feat/overview-signature-experience` — pending execution.
