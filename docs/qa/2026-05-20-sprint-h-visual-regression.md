# Sprint H Visual-Regression Baseline

**Captured after Sprint H6 typography rollout merge (post H1→H6).**
**Profile:** Lina (1987-03-14 07:42 Hannover) from `test/_fixtures/upstream-snapshots/profile.real.json`.

## How to refresh

```bash
# Start server with .env (FUFIRE_API_KEY + FUFIRE_BASE_URL).
npm start

# In another shell, run the sweep:
./scripts/visual-regression.sh

# Subset:
./scripts/visual-regression.sh /bazi /western /wuxing
```

Output goes to `test/_fixtures/visual-baseline/<route-slug>.png`.

## What Sprint H delivered

Verified per browser-smoke during each PR. Cumulative state after H6:

| Layer | Implementation | Verified | PR |
|---|---|---|---|
| Tokens system | `--bz-*` palette + Wu-Xing colors + typography stack + theme recipes + legacy-alias bridge | ✅ | #24 (H1) |
| Three-lane chromatic identity | `data-lane="bazi|west|fusion|wuxing"` on `<main>` → cascading `--lane-*` token recipes | ✅ /bazi gold-tones, /western saphir-tones | #25 (H2) |
| Pentagonal radar (shared) | `domain/wuxingRadar.js` + `components/WuxingRadar.js` | ✅ visible on `/fusion` AND `/wuxing` | #26 (H3) |
| Procedural starfield | `Starfield()` + `mountStarfield()` global background | ✅ 80 stars, deterministic positions | #27 (H4) |
| Theme toggle | 3-state (system/planetarium/morning) + `prefers-color-scheme` | ✅ matches user-decision 4 | #28 (H5) |
| Typography rollout | Cormorant headings + Manrope body + Inter eyebrows + Noto Sans SC CJK + tabular-nums | ✅ | #29 (H6) |

## Browser-smoke evidence per route

Each route was visited via browser-harness during the PR cycle. Key visual confirmations:

- **`/`** (InputPage) — Berechne-deine-Fusion-Signatur header + Anzeigename field + Person A/B sections + Kategorie-Preview. Sprint-H typography applied (serif h1, sans body).
- **`/overview`** — SecondaryNav across top, SignatureBar pinned, BaZi-Säulen-grid below.
- **`/bazi`** — Day-Master tile with 壬 CJK char (large Noto Sans SC), 2×2 pillar grid with 丁 癸 壬 甲 chars above each card. Gold lane tones.
- **`/western`** — 4 cores grid (Sonne / Mond / Aszendent / MC), saphir-blue lane tones, top-3 activations as labelled rows.
- **`/wuxing`** — Pentagonal radar (Sheng green + Ke red arrows) above intensity bars. Lina distribution: Holz 31 / Feuer 22 / Erde 13 / Metall 7 / Wasser 27 = 100%.
- **`/fusion`** — Same shared radar component, plus Sheng/Ke interaction matrix in `<details>`.
- **`/daily`** — Tagespuls sections, Heute aktiv / Bedeutung / Anwenden / Reflexion / Morgen-Teaser.
- **`/synastry`** — Person A + Person B intake (Person-B pre-filled if persisted). After calc: Resonanz-Index + Hauptverbindung + Hauptspannung + 24h Kontakt-Experiment.
- **`/method`** — Endpoint catalog + health (NOTE: page not yet built, route falls through router gracefully — H8 candidate).
- **`/transit-calendar`** — 7-Tage-Strip (single render, regression-guarded), aktivste Häuser, nächster Peak.

## Test coverage

- **531 tests** total (post H6), 522 pass, 9 skip, **0 fail**.
- Visual regression: per-page DOM-smoke tests verify rendered output passes `noFakeDataGuard` and surfaces expected API-derived strings.
- Tokens coverage guard: every `var(--x)` in main.css must resolve in tokens.css.
- Per-feature contract tests: theme toggle persistence, starfield idempotency, lane attribute presence, typography selector bindings, radar SVG structure.

## Open items for H7+

- `/method` route registered in SecondaryNav but page module not built. Sprint E#5 deliverable — defer or fold into a Sprint H8 cleanup PR.
- Legacy `system-layer--{bazi,west,fusion}` CSS classes still present alongside `data-lane`. H7 cleanup can drop after baseline confirms no visual regression from the parallel-classes period.
- `currentRoute()` helper in `data/routes.js` still unused — defer until breadcrumb component lands.
- `noFakeMathGuard` exported but never wired into page-render integration. Wire during gap-analysis sprint.
