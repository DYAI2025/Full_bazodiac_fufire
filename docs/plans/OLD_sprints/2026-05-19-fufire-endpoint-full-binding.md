# FuFire Endpoint Full-Binding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

> **⚠ READ FIRST:** This plan was written before real upstream responses were inspected. After Pre-Flight curls against the live FuFire backend, several assumptions were corrected. **Always consult `docs/contracts/2026-05-19-design-vs-real-gap.md` for the empirically-verified gap matrix.** The §4 of that doc supersedes Sprint sequencing here: Sprint A (audit) is done, Sprint C (server allowlist) was fixed in commit `332ffc3`, Sprint D (server-side VM extension) is **dropped** in favor of a frontend enrichment layer (new Sprint D′). Sprint B is **reduced to one new client function** (`getWuxingInfo`) because the compat-proxy at `/api/fufire/<path>` already exposes calculate/{western,bazi,wuxing} cleanly.

**Goal:** Bind every FuFire upstream endpoint to a frontend code path, drive every design-mockup page (`/tmp/fufire-spec`) from real API data, eliminate the gap between current 9-page vanilla-ESM SPA and the 10-page Bazodiac design.

**Architecture:** Vanilla-ESM SPA (no bundler) calls `public/src/api/client.js` → Node http proxy `server.js` → FuFire upstream. Add **5 new client functions** for the unused upstream endpoints, **5 new pages** (Western/BaZi/WuXing/Houses/Method), and **extend `normalizeAzodiacResult`** to produce the design-shape ViewModel (signature.title/line, fusion.evidence.{west,bazi,wuxing}, fusion.synthesis.{befund,staerke,risiko,handlung}, wuxing.distribution[], etc.). No new runtime deps.

**Tech Stack:** Node ≥ 20, `node --test`, ESM, vanilla DOM, hash router. Capture-DOM stub for page-render tests already established in P4 (`test/_helpers/dom-capture-stub.js`).

**Reference inputs:**
- Design mockup: `/tmp/fufire-spec/src/{app,chart,components,pages-1,pages-2,data}.jsx|.js`
- Server endpoint catalog: `server.js:42` `FUFIRE_ENDPOINTS` (10 upstream entries)
- Goal-acceptance QA matrix: `docs/qa/2026-05-19-implementation-frontend-qa-matrix.md`

---

## 0. Endpoint Inventory Matrix

### 0.1 Upstream FuFire endpoints (`server.js:42` `FUFIRE_ENDPOINTS`)

| # | Method | Upstream path             | Category   | Description                                                                 |
|---|--------|---------------------------|------------|-----------------------------------------------------------------------------|
| 1 | POST   | `chart`                   | calculation| Combined: western + BaZi + WuXing-Fusion in one call.                       |
| 2 | POST   | `calculate/western`       | calculation| Western: planets, houses, aspects + provenance.                             |
| 3 | POST   | `calculate/bazi`          | calculation| BaZi 4-pillars: Day Master, stems, branches, trace.                         |
| 4 | POST   | `calculate/fusion`        | calculation| WuXing fusion from western + BaZi (vectors + harmony).                      |
| 5 | POST   | `calculate/wuxing`        | calculation| WuXing vector from planet positions only.                                   |
| 6 | GET    | `info/wuxing-mapping`     | reference  | Static planet-to-element mapping (no birth-data needed).                    |
| 7 | GET    | `transit/now`             | transit    | Current transit planets + 12-sector intensities.                            |
| 8 | GET    | `transit/timeline`        | transit    | 7-day transit calendar.                                                     |
| 9 | POST   | `experience/bootstrap`    | experience | Soulprint sector intensities from birth data.                               |
|10 | POST   | `experience/daily`        | experience | Western + BaZi + Fusion impulse for a given date.                           |

### 0.2 Server proxy routes (`server.js:1129` `handleRequest`)

| Internal route                | Calls upstream                                              | Orchestration                                  |
|-------------------------------|-------------------------------------------------------------|------------------------------------------------|
| `GET /health`                 | none                                                        | Introspection                                  |
| `GET /api/config`             | none                                                        | Lists endpoint catalog                         |
| `GET /api/geocode?q=`         | Nominatim + timeapi.io                                      | IP rate-limited + LRU cached                   |
| `POST /chart`                 | `chart`                                                     | Pass-through with translatePayload             |
| `POST /api/azodiac/profile`   | parallel: `calculate/western` + `calculate/bazi` + `calculate/fusion` + `calculate/wuxing` (+ optional `transit/now` + `info/wuxing-mapping`) | `orchestrateFullProfile` |
| `POST /api/azodiac/fusion`    | `calculate/fusion`                                          | `orchestrateFusion` → single-person Fusion VM  |
| `POST /api/azodiac/synastry`  | parallel: 2× `chart` (one per person) + optional fusion     | `orchestrateSynastry` (+ `includeFusion=false` query) |
| `POST /api/azodiac/daily`     | sequential: `experience/bootstrap` → `experience/daily`     | `orchestrateDailyExperience`                   |
| `POST /api/fufire/:endpoint`  | allowlisted upstream path                                   | Generic compat proxy                           |
| `GET/POST /{shortcut}`        | v3 shortcuts: `/chart`, `/transit/now`, `/transit/timeline`, etc. | Direct upstream call                     |

### 0.3 Current `public/src/api/client.js` (post-Goal `36390ab`)

| Function                       | Internal route                  | Used by                                                  |
|--------------------------------|---------------------------------|----------------------------------------------------------|
| `calculateProfile(input)`      | `POST /api/azodiac/profile`     | InputPage, SynastryPage (Person-A solo), LovePage Partner-B, CareerFinancePage Partner-B |
| `geocodePlace(q)`              | `GET /api/geocode`              | GeoInput component                                       |
| `getConfig()`                  | `GET /api/config`               | not yet consumed                                         |
| `getHealth()`                  | `GET /health`                   | not yet consumed                                         |
| `getTransitNow()`              | `GET /transit/now`              | DailyPage, TransitCalendarPage                           |
| `getTransitTimeline()`         | `GET /transit/timeline`         | DailyPage, TransitCalendarPage                           |
| `getDailyExperience(input)`    | `POST /api/azodiac/daily`       | DailyPage                                                |
| `calculateFusion(input)`       | `POST /api/azodiac/fusion`      | **not consumed** (orphaned export)                       |
| `calculateSynastry(a, b)`      | `POST /api/azodiac/synastry`    | SynastryPage                                             |

### 0.4 Gap matrix — endpoints with no client.js function

| Upstream                       | Server route                                | Client.js status              | Plan reference |
|--------------------------------|---------------------------------------------|-------------------------------|----------------|
| `calculate/western` (standalone)| `POST /api/fufire/calculate/western`        | **missing** — add `calculateWestern` | Sprint B, B1   |
| `calculate/bazi` (standalone)  | `POST /api/fufire/calculate/bazi`           | **missing** — add `calculateBazi`    | Sprint B, B2   |
| `calculate/wuxing` (standalone)| `POST /api/fufire/calculate/wuxing`         | **missing** — add `calculateWuxing`  | Sprint B, B3   |
| `info/wuxing-mapping`          | `GET /api/fufire/info/wuxing` *(verify path)* | **missing** — add `getWuxingInfo`   | Sprint B, B4   |
| `experience/bootstrap`         | only via `orchestrateDailyExperience`       | not exposed standalone        | Sprint B, B5 (optional) |

### 0.5 Page gap matrix — design mockup vs current pages

| Design page         | Current page              | Status                                              | Plan reference |
|---------------------|---------------------------|-----------------------------------------------------|----------------|
| OverviewPage        | OverviewPage              | ✓ exists, aligns with design                         | —              |
| IntakePage          | InputPage                 | ✓ exists (P1 expanded), aligns                       | —              |
| BaziPage            | (embedded in Overview)    | **missing dedicated page**                           | Sprint E, E1   |
| WesternPage         | (embedded in Overview)    | **missing dedicated page**                           | Sprint E, E2   |
| WuxingPage          | (embedded in Fusion)      | **missing dedicated page**                           | Sprint E, E3   |
| HousesPage          | (mixed in Overview/Love)  | **missing dedicated page**                           | Sprint E, E4   |
| FusionPage          | FusionPage                | ✓ exists, needs evidence.{west,bazi,wuxing} alignment| Sprint D, D1   |
| DailyPage           | DailyPage                 | ✓ exists, aligns with design                         | —              |
| RelationshipPage    | SynastryPage              | ✓ exists                                             | —              |
| MethodPage          | (none)                    | **missing** — Raw/Debug/Provenance view              | Sprint E, E5   |
| —                   | DashboardPage             | extra; evaluate retention or deprecate               | Sprint F, F4   |
| —                   | PersonalityPage           | extra; merge into Overview or keep as "Tiefe"        | Sprint F, F4   |
| —                   | LovePage                  | extra; can become RelationshipPage sub-view          | Sprint F, F4   |
| —                   | CareerFinancePage         | extra; can become Houses sub-view                    | Sprint F, F4   |
| —                   | TransitCalendarPage       | extra; can become Daily sub-view                     | Sprint F, F4   |

---

## 1. Sprint Plan

The 7 sprints below are sized so each can ship its own PR with green tests. Branch convention: `feat/endpoint-binding-sprint-<x>`.

### Sprint A — Audit & ViewModel Contract Specification

Goal: lock the **ViewModel shape** the design expects. Produces a TypeScript-style spec doc + contract tests against a recorded upstream response. **No production code change.**

| Task | File(s) to create/touch                                              | Deliverable                                                                            |
|------|----------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| A1   | `docs/contracts/2026-05-19-viewmodel-shape.md` (new)                 | JSDoc-style type spec for every VM section (signature, western, bazi, wuxing, houses, fusion, daily, relationship). |
| A2   | `test/_fixtures/upstream-snapshots/profile.full.json` (new)          | Recorded `/api/azodiac/profile` response (sanitized — no personal birth data; use Lina/14.03.1987 demo from `/tmp/fufire-spec/src/data.js`). |
| A3   | `test/viewmodel-contract.test.js` (new)                              | Assert `normalizeAzodiacResult(snapshot)` emits every field listed in §A1.            |
| A4   | `docs/plans/2026-05-19-fufire-endpoint-full-binding.md`              | (this doc; no change)                                                                  |

**Checkpoint:** A1 PR merges before Sprint B starts.

---

### Sprint B — Client.js Expansion

Goal: expose all 5 missing upstream endpoints as typed client functions with the same envelope contract.

#### Task B1: `calculateWestern(input)`

**Files:**
- Modify: `public/src/api/client.js`
- Create: `test/api_client_western.test.js`

**Step 1: Write the failing test**

```js
// test/api_client_western.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWestern } from '../public/src/api/client.js';

test('calculateWestern POSTs to /api/fufire/calculate/western with translated payload', async () => {
  globalThis.fetch = async (url, opts) => {
    assert.ok(url.includes('/api/fufire/calculate/western'));
    assert.equal(opts.method, 'POST');
    const body = JSON.parse(opts.body);
    assert.equal(body.date, '1987-03-14T07:42:00');
    return { ok: true, status: 200, json: async () => ({ bodies: {}, houses: {} }) };
  };
  const r = await calculateWestern({ date: '1987-03-14', time: '07:42', lat: 52.37, lon: 9.74, tz: 'Europe/Berlin' });
  assert.equal(r.ok, true);
});
```

**Step 2: Run the test — should fail with `calculateWestern is not a function`.**

```bash
node --test test/api_client_western.test.js
```

**Step 3: Add the export**

```js
// public/src/api/client.js (append below calculateFusion)
export async function calculateWestern(input) {
  return request('POST', '/api/fufire/calculate/western', input);
}
```

**Step 4: Re-run the test — should pass.**

**Step 5: Commit**

```bash
git add public/src/api/client.js test/api_client_western.test.js
git commit -m "feat(client): add calculateWestern for standalone Western re-fetch"
```

#### Task B2: `calculateBazi(input)` — identical pattern, route `/api/fufire/calculate/bazi`.

#### Task B3: `calculateWuxing(input)` — identical pattern, route `/api/fufire/calculate/wuxing`.

#### Task B4: `getWuxingInfo()` — GET (no body), route `/api/fufire/info/wuxing` (verify exact path in `server.js:ENDPOINTS_BY_UPSTREAM_PATH` map — design uses `info/wuxing-mapping`, server `upstreamPath` says `info/wuxing-mapping` while `path` says `/info/wuxing`).

**Server-side note:** Compat proxy route `/api/fufire/:endpoint` only allowlists by `ENDPOINTS_BY_UPSTREAM_PATH`. Confirm the slug `info/wuxing` resolves. If not, add a server.js direct shortcut in handleRequest.

#### Task B5: `experienceBootstrap(input)` (optional)

Standalone exposure of `experience/bootstrap` for MethodPage to show the soulprint sector intensities without firing the full `experience/daily` chain. **Defer** unless MethodPage demands it.

**Sprint B exit criteria:**
- Baseline test count: 376 → ~388 (+12: 4 happy-path + 4 error-envelope + 4 payload-shape).
- All new exports have `request('METHOD', '/api/fufire/...', body)` envelope shape — no custom error handling.

---

### Sprint C — Server.js Endpoint Exposure Verification

Goal: ensure every Sprint B client call has a working server-side route. Existing `/api/fufire/:endpoint` allowlist already covers `calculate/western`, `calculate/bazi`, `calculate/wuxing`. Verify `info/wuxing`.

| Task | File                          | Description                                                                          |
|------|-------------------------------|--------------------------------------------------------------------------------------|
| C1   | `server.js`                   | Confirm `ENDPOINTS_BY_UPSTREAM_PATH` resolves slug `info/wuxing` (or add explicit alias). |
| C2   | `test/server.test.js`         | Add integration test: stub upstream, POST `/api/fufire/calculate/wuxing`, assert response.|
| C3   | `test/server.test.js`         | Add integration test for `GET /api/fufire/info/wuxing`.                              |

**No code change anticipated** if allowlist already covers the upstreams. C1 is read-only verification.

---

### Sprint D — ViewModel Alignment

Goal: extend `normalizeAzodiacResult` (server.js) to produce the design-shape VM. Current shape is partial — needs `signature.title`/`line`/`coreLabel`/`sunLabel`/`coherenceBand`, `fusion.evidence.{west,bazi,wuxing}`, `fusion.synthesis.{befund,staerke,risiko,handlung}`, `wuxing.distribution[]` (5 elements with `glyph`, `intensity`, `role`, `token`, `desc`), `wuxing.plan.{heute,woche,monat}`, `wuxing.properties.{wood,fire,earth,metal,water}`.

#### Task D1: Extend `normalizeAzodiacResult` — signature section

**Files:**
- Modify: `server.js` (function around line ~510)
- Modify: `test/view_model.test.js`

**Approach:**
1. Derive `signature.title` from dominant element + Day Master polarity (e.g., "Weite mit Präzisionskern" if Holz dominant + Metall Day Master). Use a small mapping table colocated with `normalizeAzodiacResult`.
2. Derive `signature.line` from Sun-sign + Day-Master combination.
3. `signature.coreLabel` = `${dayMaster.label} · Day Master` if present.
4. `signature.sunLabel` = `${sunSign} · ${sunLongitudeDeg}°` if Sun present.
5. `signature.coherence` = `Math.round(fusion.coherence_index * 100)`.
6. `signature.coherenceBand` derived from coherence value:
   - 0–40: `"disjunkt"`
   - 41–60: `"reibungsvoll"`
   - 61–80: `"resonant"`
   - 81–100: `"sehr resonant"`

**Tests:**
- Snapshot test: feed `test/_fixtures/upstream-snapshots/profile.full.json` (from Sprint A2) → assert signature.* fields populated.

#### Task D2: Extend `normalizeAzodiacResult` — fusion.evidence

Build `fusion.evidence.west[]` (3 items max), `fusion.evidence.bazi[]` (3 items max), `fusion.evidence.wuxing[]` (3 items max). Each item: `{ f, w }` where `f` = factor text (e.g., "Sonne in Fische · 10. Haus"), `w` = wirkung text (one-sentence interpretation).

**Derivation:**
- `evidence.west`: top 3 Western bodies by salience (Sun, Moon, Asc default; or aspect-heavy bodies if available).
- `evidence.bazi`: Day Master pillar + dominant pillar + supporting pillar.
- `evidence.wuxing`: dominant element + deficient element + structuring element.

#### Task D3: Extend `normalizeAzodiacResult` — fusion.synthesis

`fusion.synthesis = { befund, staerke, risiko, handlung }`. Four short paragraphs (one sentence each) computed from coherence band + dominant/deficient element + Day Master.

**Tests:** assert each of 4 keys is non-empty string and refers to detected dominant/deficient element.

#### Task D4: Extend `normalizeAzodiacResult` — wuxing.distribution

Transform `fusion.wu_xing_vectors.bazi_pillars` (e.g., `{ Holz: 0.34, Feuer: 0.22, ... }`) into design-shape:

```js
wuxing.distribution = [
  { key: 'wood',  glyph: '木', label: 'Holz',   intensity: 34, role: classifyRole(0.34, allValues), token: '--bz-wood' },
  // ... 5 entries
];
```

`classifyRole()`: `'dominant'` if max, `'unterrepräsentiert'` if <0.12, `'strukturierend'` if Metall, `'erlebbar'` if Feuer, `'flüssig'` if Wasser (or similar deterministic rule).

#### Task D5: Extend `normalizeAzodiacResult` — wuxing.plan

`wuxing.plan = { heute, woche, monat }`. Already exists in `meanings.js WUXING_MEANINGS.balance.{today,week,habit}` keyed by element. Re-export as `plan.heute/woche/monat` for the **dominant** element.

#### Task D6: Daily VM mapping

`getDailyExperience` returns `{ western, eastern, fusion, experiment, tomorrow }` (current shape). Design expects `{ date, focus, west, bazi, fusion, experiment, morgen }`. Add a **frontend-side mapper** `domain/dailyViewModel.js` that transforms the API shape to the design shape — keep server response untouched (forward compatibility).

**Tests:** snapshot mapping with synthetic API response.

**Sprint D exit criteria:**
- `normalizeAzodiacResult` returns design-shape VM.
- Baseline tests still green (existing VM-shape tests may need updates).
- `view_model_version` bumped to `'viewmodel.v2.4'` (matches design).

---

### Sprint E — New Pages

Goal: 5 dedicated pages mounted via router. All bind to `currentProfile` from `app.js` session storage (no new endpoint calls except optional refresh buttons).

#### Task E1: WesternPage

**Files:**
- Create: `public/src/pages/WesternPage.js`
- Modify: `public/src/app.js` (register `/western` route, use `mountWithProfile`)
- Create: `test/page-render-integration.test.js` — add WesternPage mount test
- Modify: `public/src/styles/main.css` (lane: `system-layer--western`, glyph `✦` already in P3)

**Layout** (mirrors `/tmp/fufire-spec/src/pages-1.jsx:514`):
- Header: "Western · Hellenistische Karte" eyebrow + h1
- Section: HoroskopChart placeholder (defer chart impl — use placeholder div with note "Chart-Render folgt Sprint G")
- Section: Sun/Moon/Asc/MC cores (4-card grid) bound to `profile.western.bodies.{Sun,Moon}.{sign,longitude,house}` + `profile.western.ascendant`
- Section: Planet table (Mercury–Pluto) — each row: sign + house + glyph
- Section: Activations (= aspects) bound to `profile.western.aspects[]`
- CTA: navigate to `/houses`

**Mock data fallback:** none. Page errors inline ("Western-Daten unvollständig") if `profile.western.bodies.Sun` missing.

#### Task E2: BaziPage

**Files:**
- Create: `public/src/pages/BaziPage.js`
- Modify: `public/src/app.js` (register `/bazi`)
- Test: add to `page-render-integration.test.js`

**Layout** (mirrors `/tmp/fufire-spec/src/pages-1.jsx:437`):
- Header
- Day Master tile: stem character + label + essence + archetype
- 4-pillar grid (year/month/day/hour): `pl.stem + pl.branch · pl.animal`, chips: stemLabel/branchElem/hidden[]
- Luck Pillar section
- Drawer-on-click: full 7-slot meaning (uses `meanings.js STEM_MEANINGS` + `BRANCH_MEANINGS`)

**Binding:** `profile.bazi.pillars.{year,month,day,hour}` + `profile.bazi.day_master`. Drawer content from `meanings.js` keyed by stem/branch.

#### Task E3: WuxingPage

**Files:**
- Create: `public/src/pages/WuxingPage.js`
- Test: add to integration

**Layout** (mirrors `/tmp/fufire-spec/src/pages-1.jsx:632`):
- Header
- Large element wheel (use existing `WuxingBar.js` or extend with circular variant)
- 5 element cards bound to `profile.wuxing.distribution[]` (from Sprint D4)
- Plan section: `profile.wuxing.plan.{heute,woche,monat}` (from D5)
- Properties grid: 5 cards bound to `profile.wuxing.properties.{wood..water}` (from `meanings.js WUXING_MEANINGS`)

**Reuse:** `WuXingEducationGrid.js` already exists for the 5-card pattern. Adapt it.

#### Task E4: HousesPage

**Files:**
- Create: `public/src/pages/HousesPage.js`

**Layout** (mirrors `/tmp/fufire-spec/src/pages-2.jsx:10`):
- 12-house grid: `{n, sign, glyph, elem, active[], bedeutung, praxis}`
- Bind to `profile.western.houses` for cusps + signs
- Bind to `profile.western.bodies[*].house` to compute `active[]` per house
- Use `meanings.js HOUSE_MEANINGS` for `bedeutung` + `praxis` text

#### Task E5: MethodPage

**Files:**
- Create: `public/src/pages/MethodPage.js`

**Layout** (mirrors `/tmp/fufire-spec/src/pages-2.jsx:342`):
- Section: "Endpoint-Katalog" — call `getConfig()` on mount, render the endpoint list with method/path/description
- Section: "Letzte Abfragen" — read `_meta.endpoint` + `_meta.fetchedAt` from cached profile
- Section: "Rohdaten" — collapsible JSON viewer for `currentProfile`
- Section: "Health" — call `getHealth()`, show upstream `FUFIRE_BASE_URL` + allowedEndpoints
- Section: "Provenance" — each VM section badged with its source endpoint (uses existing `SourceBadge.js`)

**Critical:** This page is the **only** place raw payloads / fetch timestamps / endpoint paths are user-visible (Goal-Bedingung "Debug, Rohdaten, Fetch-Zeitpunkte und technische Provenienz erscheinen nur auf Method/Raw-Data-Ansichten").

#### Task E6: Page integration tests

For each new page, extend `test/page-render-integration.test.js`:

```js
test('WesternPage renders only API-derived data + passes noFakeDataGuard', async () => {
  const { WesternPage } = await import('../public/src/pages/WesternPage.js');
  const app = freshApp();
  assert.doesNotThrow(() => WesternPage(app, { profile: SYNTHETIC_PROFILE, onNavigate: () => {} }));
  const agg = assertAggregatePasses('WesternPage');
  assertContainsApiValues(agg, 'WesternPage', ['Taurus', 'Scorpio']);  // Sun + Moon from fixture
});
// + BaziPage, WuxingPage, HousesPage, MethodPage
```

**Sprint E exit criteria:**
- 5 new pages mount + render with synthetic profile.
- `test/page-render-integration.test.js` count goes from 9 → 14.
- Total tests: ~388 → ~398.

---

### Sprint F — Router & Navigation Consolidation

#### Task F1: New routes in `app.js`

```js
.register('/western',  (app) => mountWithProfile(WesternPage,  app, 'die westliche Karte'))
.register('/bazi',     (app) => mountWithProfile(BaziPage,     app, 'deine vier Säulen'))
.register('/wuxing',   (app) => mountWithProfile(WuxingPage,   app, 'deine Element-Ökonomie'))
.register('/houses',   (app) => mountWithProfile(HousesPage,   app, 'deine 12 Häuser'))
.register('/method',   (app) => MethodPage(app, { profile: currentProfile }))
```

**Note:** `/method` works without a profile (it should still render the endpoint catalog from `getConfig()` even when no profile exists). Do **not** use `mountWithProfile`.

#### Task F2: Nav update

Three-mode entry on OverviewPage already covers Lernen/Anwenden/Beziehung. Add a secondary tab strip for the 10 design routes (Overview/BaZi/Western/WuXing/Fusion/Houses/Daily/Relationship/Intake/Method).

**File:** new `public/src/components/SecondaryNav.js` mirroring `/tmp/fufire-spec/src/app.jsx:95` tabs.

#### Task F3: Existing extras

| Existing page          | Decision                                                                                         |
|------------------------|--------------------------------------------------------------------------------------------------|
| `PersonalityPage`      | Keep as `/personality` deep-link from Overview Drawer. No change.                                |
| `DashboardPage`        | Mark as legacy; remove from primary nav; keep route for back-compat.                             |
| `LovePage`             | Keep; subordinate under Beziehung mode. No URL change.                                           |
| `CareerFinancePage`    | Keep; subordinate under Lernen mode. No URL change.                                              |
| `TransitCalendarPage`  | Keep; link from DailyPage Tomorrow-Teaser.                                                       |
| `FusionPage`           | Migrate to use D2/D3 evidence + synthesis from VM.                                               |

#### Task F4: ThreeDoors model update

Already overrides default doors on OverviewPage. Add a fourth optional door "Methode" gated by feature flag for MVP launch.

**Sprint F exit criteria:**
- All design routes navigable.
- Existing pages still load (no breaking redirects).
- Tests pass.

---

### Sprint G — Chart Rendering & Final QA

#### Task G1: HoroskopChart component

**File:** `public/src/components/HoroskopChart.js`

Port `/tmp/fufire-spec/src/chart.jsx:29` to vanilla DOM + SVG. ~360 LOC. Renders circular zodiac wheel with planet glyphs at API-supplied longitudes.

**Bindings:**
- 12 sign sectors (static SVG)
- Planet positions: `profile.western.bodies[*].longitude` → polar coordinates
- Aspects: `profile.western.aspects[*]` → connecting lines inside the wheel

**Tests:** render with synthetic profile, assert SVG contains 7 `<g class="planet">` nodes (Sun–Saturn). Inner-planet vs outer-planet ring separation.

#### Task G2: Mini-chart variants

Port `MiniWestern`, `MiniSteles`, `ElementRow`, `CoherenceBand` from `/tmp/fufire-spec/src/components.jsx`. These are used by OverviewPage for compact previews.

#### Task G3: Documentation refresh

- Update `README.md` endpoint section
- Update `docs/qa/...-qa-matrix.md` (already current)
- New: `docs/contracts/2026-05-19-viewmodel-shape.md` (from Sprint A1)

#### Task G4: Smoke test on Railway

After merge: `curl https://<railway-url>/health`, navigate every route in browser, verify no console errors.

**Sprint G exit criteria:**
- Full chart visible on OverviewPage + WesternPage.
- All 10 design routes render with real API data.
- Tests: ~398 → ~410 (chart + mini-chart smoke).
- README aligned with delivered endpoint surface.

---

## 2. Test Strategy Summary

| Test class                       | Where                                  | Coverage                                                                      |
|----------------------------------|----------------------------------------|-------------------------------------------------------------------------------|
| Client envelope contract         | `test/api_client*.test.js`             | Each `request()` returns `{ok, status, data, error, fetchedAt, endpoint}`.   |
| Per-endpoint mock-fetch          | `test/api_client_<endpoint>.test.js`   | POST body shape + happy path + error envelope.                                |
| VM contract snapshot             | `test/viewmodel-contract.test.js`      | `normalizeAzodiacResult(snapshot)` emits every design-shape field.           |
| Server orchestration             | `test/server.test.js`                  | parallel + sequential orchestration paths.                                    |
| Page-render integration          | `test/page-render-integration.test.js` | 10 pages mount with synthetic profile, no demo strings in DOM.                |
| Source-level demo-string sweep   | `test/no-fake-data-page-sweep.test.js` | 0 offenders in `pages/` and `components/`.                                    |
| Contract (live network, opt-in)  | `test/contract.test.js`                | `FUFIRE_CONTRACT_TEST=true` — guards against upstream path drift.            |

**No new test framework**: continue with `node --test`. No new runtime deps. Capture-DOM stub already established in P4.

---

## 3. Hard Constraints (carried from prior Goal)

- **Berechnungskern unverändert** — no edits to `server.js` orchestration logic that mutates astrology output; only additive VM-shape extensions in `normalizeAzodiacResult`.
- **Keine neuen Runtime-Deps** — pure vanilla, `node --test` only.
- **Kein Force-Push, kein History-Rewrite** — every sprint = forward commits.
- **Kein Direkt-Push auf main** außerhalb explizit autorisierter Konsolidierungs-Goals — Sprints A–G shall use feature branches `feat/endpoint-binding-sprint-<x>` + PR.
- **Recoverable Errors bleiben inline** — pages render `ProfileMissingBanner` (P0) or per-section `UnavailableCard` instead of redirecting.

---

## 4. Risk Register

| Risk                                                              | Mitigation                                                                                                  |
|-------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Sprint D VM-shape change breaks existing pages                    | Land Sprint D behind feature flag `window.__FUFIRE_FLAGS.viewmodelV24 = true`. Old pages keep reading legacy shape. |
| `/api/fufire/info/wuxing` slug doesn't resolve                    | Sprint B4 verifies upstream path; if blocked, add explicit handler in `server.js` (Sprint C).               |
| Chart SVG rendering across themes is heavy                        | Sprint G ships chart in two variants — `data-theme="planetarium"` (dark) + `data-theme="morning"` (light).  |
| `experience/bootstrap` data not exposed standalone breaks MethodPage | Sprint B5 (optional): add `experienceBootstrap()` client + a thin `/api/azodiac/bootstrap` server route.  |
| Removing `PersonalityPage`/`DashboardPage` causes back-compat URL breakage | Sprint F3 keeps routes registered even if removed from primary nav; users following old links still land on rendered content. |

---

## 5. Execution Order

**Recommended path:** A → B → C → D → E → F → G (linear).

**Parallel options:**
- A2 (fixture record) + B1 (calculateWestern) can run in parallel.
- E1–E5 (new pages) can run in parallel across multiple subagents once Sprint D lands.
- G1 (chart) is independent of E and can start after Sprint D.

**MVP cut:** Sprints A + B + D + E (no F nav consolidation, no G chart) — yields all endpoints wired + 5 new pages working with simple text layouts. Ship in week 1.

**Full design parity:** Sprints A–G — ~3 weeks at one-sprint-per-3-days cadence.

---

## 6. Done-Definition

| Element                                                       | Verification                                                            |
|---------------------------------------------------------------|-------------------------------------------------------------------------|
| All 10 FuFire upstream endpoints reachable via client.js      | `grep -c "^export async function" public/src/api/client.js` ≥ 14         |
| All 10 design pages render from real API                      | `test/page-render-integration.test.js` mounts all 10 with synthetic profile |
| ViewModel matches design shape                                | `test/viewmodel-contract.test.js` green                                  |
| No demo strings in rendered DOM                               | `test/no-fake-data-page-sweep.test.js` + integration `noFakeDataGuard` 0 hits |
| MethodPage shows endpoint catalog + raw data + provenance     | Manual verification + smoke test                                         |
| Existing tests green                                          | `npm test` 0 failures, baseline ≥ 376 + Sprint adds                      |
| Documentation up to date                                      | `docs/contracts/...` and `docs/qa/...` refreshed                         |

---

## 7. Open Questions for User

These must be answered before implementation starts:

1. **`PersonalityPage` / `DashboardPage` / `LovePage` / `CareerFinancePage` retention.** Keep as deep-links, deprecate, or merge into new pages? (See Sprint F3 table.)
2. **MethodPage feature gate.** MVP visible to all users, or gated behind `?debug=1` query param / feature flag?
3. **Chart rendering priority.** Sprint G can be deferred; MVP works with placeholder. Should Sprint G land in same PR as Sprint E, or after?
4. **VM-shape backwards compatibility.** Should Sprint D bump `view_model_version` (breaking) or land behind feature flag (additive)?
5. **Branch strategy.** One PR per sprint (recommended) or one mega-PR `feat/full-endpoint-binding`?

---

*Plan author: Claude Opus 4.7 — 2026-05-19 — based on `/tmp/fufire-spec/src/data.js` design ViewModel + `server.js` `FUFIRE_ENDPOINTS` catalog + post-`36390ab` codebase audit.*
