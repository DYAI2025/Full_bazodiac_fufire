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

`feat/overview-signature-experience` → pushed (`362b4ab..6b2130a`).

---

## Iteration OV-I3 — Wheel geometry + layers + colors + interaction

**Sprintziel.** Das Wheel wird als lebendiges, plastisches Signaturbild erfahrbar und bleibt gleichzeitig auditierbar.

### Commits

| SHA | Task | Title |
|---|---|---|
| `fcb4bee` | OV-I3-T06 | fix(wheel): geometry + provenance — no 0deg fallback, ASC-left, audit source pill |
| `a9e4bf8` | OV-I3-T07 | feat(wheel): three SVG layers + defs (zodiac/houses/bodies/labels) |
| `9b849ad` | OV-I3-T08 | feat(wheel): element + aspect color semantics with token palette |
| `f209da3` | OV-I3-T09 | feat(wheel): hover/click + keyboard linking to audit list |
| `227424b` | fix       | fix(overview): scope audit-row activation to <li>, skip SVG metadata |

### Tests

| Metric | Before OV-I3 | After OV-I3 + fix | Delta |
|---|---|---|---|
| tests | 757 | 764 | +7 |
| pass | 745 | 752 | +7 |
| fail | 0 | 0 | — |
| skipped | 12 | 12 | — |

Playwright `test/e2e/overview-wheel-interaction.spec.js`: 3/3 pass.
Playwright `test/e2e/overview-hero.spec.js`: 4/4 pass.

### Screenshots (`docs/qa/screenshots/overview-signature/ov-i3/`)

- `wheel-hover-sun.png` — Sun hover highlights Sun audit row.
- `wheel-hover-ac.png` — ASC focus + Enter highlights ASC audit row.
- `wheel-closeup.png` — desktop wheel close-up.

### Parallel subagent gate

- **Tester:** GREEN. 7/7 Playwright pass (3 wheel-interaction + 4 hero), no silent skip, all screenshots in window. DOM probe confirms all 4 layers, ASC rotation, derived DSC/IC, audit rows + sources, all 4 element classes.
- **Reviewer (1st pass):** **RED:1 Critical** — querySelector picked SVG `<metadata>` before the visible `<li>`, so data-active landed on an invisible node.
- **Acceptance reviewer:** GREEN. All 6 REQs (REQ-F-WH-001/002/003/004, REQ-D-001/002) PASS. Minor visual notes (plasticity, ASC label glyph rendering) — non-blocking.
- **Reviewer (2nd pass after fix 227424b):** **GREEN.** Critical resolved by scoping listener + e2e locator to non-metadata. Minor findings (DSC vs DC label, assignLanes bucket edge case, `-0` cosmetic) tracked, non-blocking.

### Findings & fixes

| # | Sev | Finding | Fix |
|---|---|---|---|
| 1 | Critical | `installWheelAuditLink` queried `[data-audit-row=X]` first match → SVG `<metadata>` (invisible); audit `<li>` never highlighted | `227424b` — filter `n.tagName.toLowerCase() !== 'metadata'` in both clear-pass and set-pass; e2e locators scoped to `li[data-audit-row=...]` |
| 2 | Minor | `data-axis-key="DSC"` differs from plan label list "DC" | kept DSC — matches existing tests + AuditTabs convention |
| 3 | Minor | `assignLanes` bucketStart edge case (5° chain) | tracked for follow-up |
| 4 | Nit | `data-asc-rotation="-0"` cosmetic when asc=0 | tracked |
| 5 | Visual | Wheel plasticity thin; ASC label glyph render artifact | non-blocking PO question |

### Verdict

**GREEN.** All 6 REQs PASS, all 7 e2e tests pass, full suite 752/764 pass / 0 fail.

### Push

`feat/overview-signature-experience` → pushed (`6b2130a..20d3e2c`).

---

## Iteration OV-I4 — TopMovements + AuditTabs + GuidedDeepDive + final gate

**Sprintziel.** Die Overview wird leichter konsumierbar. Detaildaten bleiben vorhanden, aber in Top-3, Tabs und Accordions organisiert.

### Commits

| SHA | Task | Title |
|---|---|---|
| `bd5eaa3` | OV-I4-T10 | feat(overview): TopMovements with default top-3 and details accordion |
| `3f17fe0` | OV-I4-T11 | feat(overview): NatalChartAuditTabs full Top3/Planets/Houses/Aspects |
| `2cfa7dc` | OV-I4-T12 | feat(overview): GuidedDeepDive 4 intent-driven CTAs |
| `d05475e` | e2e+model | test(overview): OV-I4 e2e specs + viewmodel topMovements pass-through |
| `c242e4e` | screenshots | docs(qa): final 7 OV gate screenshots |
| `8988a59` | final-fix | fix(e2e): i3-wheel selector — li[data-audit-row], attached not visible |

### Tests

| Metric | Before OV-I4 | After OV-I4 + fix | Delta |
|---|---|---|---|
| tests | 764 | 781 | +17 |
| pass | 752 | 769 | +17 |
| fail | 0 | 0 | — |
| skipped | 12 | 12 | — |

Playwright full suite: **56/56 pass**.

### Final 7 Pflicht-Screenshots (`docs/qa/screenshots/overview-signature/`)

- `overview-desktop.png` (285 KB)
- `overview-mobile.png` (254 KB)
- `wheel-closeup.png` (35 KB)
- `wheel-hover-sun.png` (309 KB)
- `wheel-hover-ac.png` (310 KB)
- `aspects-collapsed.png` (360 KB)
- `aspects-expanded.png` (376 KB)

### Parallel subagent gate

- **Tester:** GREEN. 9/9 new e2e pass (top-movements + guided-deep-dive + wheel-interaction + hero), no silent skip, all 7 Pflicht-Files in window. DOM probe: top-movements section, max 3 visible movements, details progressive, 4 audit tabs labeled "Top 3 / Planeten / Häuser / Aspekte", default active "top3", guided-deep-dive with 4 intent anchors.
- **Reviewer:** GREEN. 5 Minor/Nit (Top3 panel cross-link suggestion, wheel-hover landing on hidden Planets row, wireTabSwitching re-mount safety, comment claim about "salient" selector, waitForTimeout flakiness). Banned-strings invariant clean. Scope clean. CSS allow-list reasonable.
- **Acceptance reviewer (1st pass):** **RED.** 1 blocker: `test/e2e/i3-wheel.spec.js:93` used stale `[data-audit-row]` (resolves to SVG metadata since OV-I3 fix 227424b). Plus visibility assertion incompatible with OV-I4 tab panels.
- **Acceptance reviewer (2nd pass after fix 8988a59):** **SHIPPABLE.** All REQs + PO checklist PASS. REQ-D-002 coverage intact via natal-chart-audit-tabs.test.js + overview-wheel-interaction.spec.js.

### Findings & fixes

| # | Sev | Finding | Fix |
|---|---|---|---|
| 1 | Critical | `test/e2e/i3-wheel.spec.js:93` selector `[data-audit-row]` resolved to SVG `<metadata>` (aria-hidden), assertion `toBeVisible()` failed | `8988a59` — selector `li[data-audit-row]`, assertion `toBeAttached()` |
| 2 | Minor | Wheel hover targets Sun row in hidden Planets tab — data-active set but invisible until user switches tab | tracked, non-blocking |
| 3 | Minor | `wireTabSwitching` could double-bind if same node re-wired (caller-side) | tracked |
| 4 | Minor | Top3 tab in AuditTabs duplicates TopMovements section content | tracked, PO question |
| 5 | Nit | "salient" claim in overviewModel comment without selectSalientAspects call | tracked |

### Per-REQ verdict

| REQ | Verdict | Justification |
|---|---|---|
| REQ-F-OV-001 | PASS | SignatureHero → MeaningBridge → TopMovements → AuditTabs → GuidedDeepDive flow visible top-to-bottom in overview-desktop.png |
| REQ-F-OV-005 | PASS | aspects-collapsed.png shows exactly 3 Bewegungen grouped Spannung/Harmonie/Neutral |
| REQ-F-OV-006 | PASS | aspects-expanded.png shows full grouped list after `<details>` click |
| REQ-D-002 | PASS | AuditTabs Planets panel renders glyph + labelDE + signGlyph + degreeDisplay + house + source; missing rows marked "Daten fehlen" |

### PO checklist

1. Signature on first screen — PASS.
2. Wheel = identity object — PASS.
3. Data/meaning separated but linked — PASS.
4. Engaging without overload — PASS.
5. No internal field names — PASS.
6. Audit on demand — PASS.
7. Desktop + mobile — PASS.

### Verdict

**OV-I4: GREEN.** **Whole plan OV-I1..OV-I4: SHIPPABLE.**

---

## Final summary

| Iteration | Commits | Pass delta | Verdict |
|---|---|---|---|
| OV-I1 | 4 (incl. 1 fix) | +9 | GREEN |
| OV-I2 | 4 (incl. 1 fix) | +8 | GREEN |
| OV-I3 | 5 (incl. 1 fix) | +7 | GREEN |
| OV-I4 | 6 (incl. 1 fix) | +17 | SHIPPABLE |
| **Total** | **19 (+ plan + 4 QA-doc commits)** | **+41 pass / 0 fail** | **SHIPPABLE** |

Final unit tests: 781 total / 769 pass / 0 fail / 12 skipped.
Final Playwright: 56/56 pass.

Branch ready for PR against `main`.

### Push

`git push origin feat/overview-signature-experience` — pending execution.
