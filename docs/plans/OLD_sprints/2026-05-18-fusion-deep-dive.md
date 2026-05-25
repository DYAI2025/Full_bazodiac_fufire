# Plan: WuXing Fusion Deep-Dive Page

**Date:** 2026-05-18
**Scope:** Add dedicated `/fusion` route showing element wheel, self-interaction matrix, per-element narrative, and remediation recommendations.

## Intent

Existing `/api/azodiac/fusion` returns `wu_xing_vectors`, `coherence_index`, and a single interpretation string. No frontend page exposes this directly — fusion data only surfaces as a derived `dominantElement` in Personality/Overview/CareerFinance. Goal: a single page that visualises the full element signature and tells the user *what to do about it*.

## Stack decision

Vanilla ESM, matching the other 9 pages. Vite/React rejected to preserve the "no build step" invariant in CLAUDE.md.

## Backend extension (server.js)

Add a pure function `computeFusionRemediation(vector)` that runs inside `normalizeAzodiacResult` and attaches `fusion.remediation` to the ViewModel.

### Rules

1. Normalise vector to percentages (sum = 1.0). If vector is empty/null, attach `remediation: null`.
2. `expected = 0.20` per element (balanced reference).
3. Classify each element:
   - `deviation > 0.15` → `dominant`
   - `deviation < -0.10` → `deficient`
   - else → `balanced`
4. Pick at most one `dominant` (max deviation) and one `deficient` (min deviation).
5. Generate actions using sheng/ke cycle tables (also embedded as constants):
   - Generators (sheng parent): `{Holz:'Wasser', Feuer:'Holz', Erde:'Feuer', Metall:'Erde', Wasser:'Metall'}`
   - Controllers (ke parent): `{Holz:'Metall', Feuer:'Wasser', Erde:'Holz', Metall:'Feuer', Wasser:'Erde'}`
   - `strengthen` action for deficient: cultivate the generator + the element itself
   - `temper` action for dominant: lean into its controller
6. German narrative tables (deterministic, embedded): `ELEMENT_STRENGTHEN_ACTIVITIES`, `ELEMENT_TEMPER_ACTIVITIES`.

### Output shape

```js
fusion.remediation = {
  distribution: { Holz: 0.18, Feuer: 0.32, Erde: 0.22, Metall: 0.20, Wasser: 0.08 },
  dominant:  'Feuer'  | null,
  deficient: 'Wasser' | null,
  actions: [
    { type:'strengthen', element:'Wasser', via_generator:'Metall', activities:[...], rationale:'...' },
    { type:'temper',     element:'Feuer',  via_controller:'Wasser', activities:[...], rationale:'...' }
  ],
  summary: 'Deine Signatur betont Feuer (32 %) und zeigt Wasser-Mangel (8 %) — kultiviere Stille und Reflexion.'
} | null
```

### Version bump

`view_model_version: '1'` → `'2'`. Update **all** pins, not just one:
- `test/view_model.test.js:50`
- `test/server.test.js:174`
- `README.md:87` and `README.md:166` (example responses) — note `test/documentation.test.js` enforces README↔implementation sync, so missing this will fail CI.

## Frontend (public/src/)

### New files

- `public/src/pages/FusionPage.js` — page module, matches existing page export pattern
- `public/src/components/fusion/ElementWheel.js` — SVG, 5 nodes on a circle, node radius ∝ vector value, sheng arrows green, ke arrows red, hover tooltip
- `public/src/components/fusion/InteractionMatrix.js` — 5×5 grid, cell symbol from sheng/ke/identity, click → expanded narrative drawer
- `public/src/components/fusion/ElementNarrative.js` — 5 cards (one per element) with %, traits, imbalance signals, sourced from extended `ELEMENT_PERSONALITY` tables
- `public/src/components/fusion/RemediationPanel.js` — renders `fusion.remediation.actions[]` + summary
- `public/src/styles/fusion.css` — page-local styles

### Edits

- `public/src/app.js` — register `/fusion` route
- `public/src/pages/DashboardPage.js` and/or `OverviewPage.js` — add nav link
- `public/src/domain/projections.js` — **do NOT mutate `ELEMENT_PERSONALITY`** (6 existing readers at lines 215, 276, 361, 377, 520, 569 expect string-shape and would render `[object Object]` if changed). Instead, add a NEW exported constant `FUSION_ELEMENT_PROFILE = { Holz: { traits, strengths, imbalance, ... }, ... }` used only by the fusion page.

### Layout

```
┌──────────────────────────────────────────┐
│ Header: WuXing Fusion  •  Kohärenz: 0.74 │
├──────────────────────────────────────────┤
│ ElementWheel (SVG)    │ InteractionMatrix│
├──────────────────────────────────────────┤
│ ElementNarrative — 5 cards               │
├──────────────────────────────────────────┤
│ RemediationPanel                         │
└──────────────────────────────────────────┘
```

## Tests

- `test/view_model.test.js` — extend with cases: dominant/deficient detection, balanced vector → no actions, empty vector → `remediation: null`, version bump assertion.
- `test/projections.test.js` — assert extended `ELEMENT_PERSONALITY` keys exist and pages don't break on legacy string shape (back-compat helper).
- `test/documentation.test.js` — verify endpoint catalog unchanged.
- No E2E framework currently in repo; skip browser smoke for now (manual `npm start` + click-through).

## Deploy

No Railway changes required. Static files served as-is. Confirm `/health` unchanged after backend version bump.

## Out of scope

- Vite/React migration (defer to separate plan)
- E2E test framework setup
- Translation to non-German locales
