# External Gap Analysis — Validation & Corrected Diagnosis

**Source:** AstroAPP LiveAgent analysis dated 2026-05-20 15:22 (Ist/Ziel comparison + 10 gaps + 6-phase plan + 10 backlog items).

**Validator:** Cross-checked vs. current `main` (commit `7b564da`) using visual-regression sweep `test/_fixtures/visual-baseline/*.png` and live `profile.real.json` snapshot data.

## §1 Data-correctness cross-check

AstroAPP plausibility-rechnung for 14.03.1987 07:42 Hannover claimed the Zielscreen mockup values are wrong. Computed reference values were given. Result of comparing those against `profile.real.json` (the fixture our pages currently render from):

| Body | AstroAPP reference | `profile.real.json` raw | Rendered on `/western` | Verdict |
|---|---|---|---|---|
| Sonne | Fische ~23° | longitude 353.15 → Pisces 23.15° | `Fische 23°09' · 12. Haus` | ✓ matches |
| Mond | Jungfrau ~8° | longitude 158.23 → Virgo 8.23° | `Jungfrau 8°13' · 6. Haus` | ✓ matches |
| ASC | Widder ~27° | 27.71° → Aries 27.71° | sichtbar im screenshot | ✓ matches |
| MC | Steinbock ~10° | 280.66° → Capricorn 10.66° | sichtbar | ✓ matches |

**Conclusion:** The Ist-Zustand on `main` already binds to real backend data. The Zielscreen mockup that AstroAPP analyzed contained demo values (Mond Waage 17°, ASC Widder 4°). The warning "don't use mockup values as fixture" is **structurally pre-satisfied** — our app reads from `/api/azodiac/profile` exclusively (no hardcoded planets / pillars / scores anywhere in `public/src/**`).

## §2 Gap-by-gap status

| ID | AstroAPP Claim | Validated Status | Evidence |
|---|---|---|---|
| G1 | Zodiac Wheel fehlt im Ist-Zustand | **VALID — open gap** | No `NatalChartWheel.js` in `public/src/components/`. `/overview` shows Hero + 7 deep-link cards, no wheel. |
| G2 | Overview überladen | **INVALID for `main`** | Current `/overview` is intentionally minimal (sig-bar + Fusion-Hero + 7 nav-cards). External analyst saw an older Ist-screenshot. |
| G3 | Mockup values dürfen nicht hardcoded | **PRE-ADDRESSED** | All page modules render from `sessionStorage.azodiac_profile` or live API; `noFakeDataGuard` enforces no demo strings; §1 above proves real-data binding. |
| G4 | ViewModel-Adapter `profileToOverviewModel()` fehlt | **PARTIAL — modular adapters exist, no single Overview aggregator** | `westernBodyEnrichment.js`, `baziPillarEnrichment.js`, `aspectEnrichment.js`, `wuxingEnrichment.js`, `wuxingRadar.js` exist. No `overviewModel.js`. |
| G5 | Fusion-Semantik unklar | **ADDRESSED** | `/fusion` shows Dominant/Unterrepräsentiert/Hebel-Trio + Kohärenz-Score + WuxingRadar. Copy reviewed in Sprint H. |
| G6 | Element-Prozente als "Persönlichkeitsanteil" missverstanden | **ADDRESSED** | `/wuxing` explicitly states "Die Prozente sind Intensitäten im System, keine Persönlichkeitsanteile". |
| G7 | V3-Signatur nicht integriert | **OPEN — scope-decision pending** | No V3-Signatur visualization built or planned. Not currently in any roadmap. |
| G8 | Aspekte dominieren ohne Priorisierung | **ADDRESSED** | `aspectEnrichment.js` exports `selectSalientAspects` with luminary-first scoring (Sun/Moon involvement + orb tightness). `/western` only shows top-3 activations. |
| G9 | Responsive/Lesbarkeit nicht validiert | **OPEN** | Visual-regression sweep only at desktop viewport. No mobile/tablet baselines captured. |
| G10 | E2E/Visual-Regression-Tests fehlen | **PARTIAL** | `scripts/visual-regression.sh` exists + 10-route baseline in place. No Playwright/Puppeteer state-flow tests. |

## §3 Backlog-by-backlog status

| ID | AstroAPP Item | Status on `main` |
|---|---|---|
| B1 | Golden Profile Fixture | **DONE** — `test/_fixtures/upstream-snapshots/profile.{real,persona2,persona3}.json` |
| B2 | OverviewModel Adapter | **PARTIAL** — modular enrichers exist, no aggregating `overviewModel.js` |
| B3 | NatalChartWheel SVG | **OPEN** — no component exists |
| B4 | Ziel-Overview Layout (Wheel-Hero) | **MISMATCH** — current `/overview` is text-Hero + tile-grid; AstroAPP-Zielscreen has Wheel-Hero |
| B5 | Ist-Details als Drilldowns migrieren | **DONE** — Sprint E created `/bazi`, `/western`, `/wuxing`, `/fusion`, `/houses`, `/method` as vertical slices |
| B6 | Data Accuracy Tests | **PARTIAL** — contract tests opt-in only; no Sun/Moon/ASC/MC smoke against known charts; no Li-Chun boundary; no DST transition |
| B7 | Copy-/Semantik Review | **MOSTLY DONE** — Sprint H6 typography + WuXing-copy fix already applied |
| B8 | V3-Entscheidung | **OPEN** |
| B9 | Responsive Polish | **OPEN** |
| B10 | Visual/E2E Tests | **PARTIAL** — baseline captured 2026-05-20, no automated diff yet |

## §4 New gaps surfaced by spot-check (not in AstroAPP list)

| ID | Gap | Severity |
|---|---|---|
| N1 | `scripts/visual-regression.sh:ALL_ROUTES` lacks `/houses` (10. ROUTES manifest entry). Sweep misses one route. | Minor |
| N2 | `/` (root) and `/overview` route-semantic confusion: `/` shows InputPage (Daten-Eingabe), `/overview` is the real Übersicht. Nav-label "DATEN" → `/` is plausible but breaks user expectation that "first nav tab" = main view. | Minor (UX) |
| N3 | `/daily` step-1 "Heute aktiv" card renders empty when `/api/azodiac/daily` fetch stub returns `{}`. Real call probably hydrates; visual baseline shows missing content. | Important — verify real-API state |

## §5 Diagnosis (corrected)

The external analyst was working from an older Ist-screenshot **before Sprint E + Sprint H landed**. They correctly flagged real architectural concerns (Wheel-Hero, ViewModel-aggregator, data-accuracy testing, V3 scope-decision, responsive validation), but several of their gaps were already closed by work done 2026-05-17 through 2026-05-20.

**Remaining substantive open gaps (intersection of valid AstroAPP findings + spot-check findings):**

1. **G1/B3 — NatalChartWheel SVG component missing.** Largest design gap. Pure-SVG component for 12-sign ring + houses + ASC/MC markers + planet positions, optionally aspect-lines.
2. **G4/B2 — `profileToOverviewModel()` aggregator missing.** Modular enrichers exist but no single entry point that produces the OverviewModel shape (identity / topFacts / chartWheel / baziPillars / westernFactors / fusionSummary / elementEconomy / nextDoors / methodMeta / warnings).
3. **B4 — `/overview` Hero-layout doesn't match Ziel-IA.** Current text-Hero + tile-grid is functionally fine but loses the Wheel-as-orientation-anchor. Decision: integrate Wheel as second Hero-section under current Fusion-Statement, not destructive replacement.
4. **B6 — Data-accuracy ephemeris smoke-tests missing.** Need 2-3 known charts (e.g. 14.03.1987 Hannover, 04.03.1990 Tokyo, 21.06.2000 NYC) where Sun/Moon/ASC/MC must match reference values within tolerance.
5. **G9/B9 — Responsive validation pending.** Visual-regression sweep currently desktop-only. Add 375×667 (mobile) + 768×1024 (tablet) viewports.
6. **G7/B8 — V3-Signatur scope-decision pending.** Either out-of-scope-and-documented or in-scope-as-separate-tab. Not in this Sprint.
7. **N1 — visual-regression.sh missing `/houses`.** Minor script bug.

## §6 What NOT to do based on this analysis

- **Don't replace current `/overview` Hero with Wheel.** The Fusion-Statement-Hero ("Wachstumsdrang mit Widder-Kontaktstil") is high-value identity copy. Wheel goes **below** it as second-stop visual anchor.
- **Don't use the Zielscreen mockup numbers as test fixtures.** They are demo values for layout demonstration, not ephemeris-correct. Fixtures stay anchored to real backend output captured 2026-05-19.
- **Don't bundle V3-Signatur into this Sprint.** Separate scope-decision required first; V3 has its own visualization-logic (12 poles / 6 axes / 12 trails, not a wheel).
- **Don't break Sprint-H token system.** All new components must respect `--bz-*` palette + `data-lane="west"` for Wheel.

---

*Generated 2026-05-20 by cross-referencing `main` (commit `7b564da`) against external AstroAPP LiveAgent analysis dated 2026-05-20 15:22.*
