# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A Node.js (ESM, `"type": "module"`) proxy and live dashboard that sits in front of the FuFirE astrology backend. `server.js` is the **entire backend** — no build step, no external runtime dependencies. It serves `public/` as static files and proxies/orchestrates calls to `FUFIRE_BASE_URL`.

## Commands

Requires Node `>=20` (uses built-in `node --test` runner and global `fetch`/`AbortController`).

```bash
npm start                                 # run on PORT (default 3000)
npm test                                  # unit + integration tests (node --test)
npm run test:contract                     # live network contract tests (opt-in, needs FUFIRE_BASE_URL)
curl http://127.0.0.1:3000/health         # smoke-check upstream config + endpoint catalog
```

Run a single test file:
```bash
node --test test/view_model.test.js
```

## Architecture

All logic lives in `server.js` — there are no modules, no routes directory, no framework.

**Request routing** (`handleRequest`):
- `/health`, `/api/config` — introspection (no upstream call)
- `/chart` — POST only; calls `orchestrateChart` (parallel western + bazi + fusion)
- `/api/azodiac/profile` — POST only; calls `orchestrateFullProfile` (parallel western + bazi + fusion + wuxing, plus optional TST and wuxing-info)
- `/api/azodiac/fusion` — POST only; calls `orchestrateFusion` (single-person WuXing fusion ViewModel)
- `/api/azodiac/synastry` — POST only; calls `orchestrateSynastry` for two charts. Query param `includeFusion=false` skips per-person fusion for faster response
- `/api/azodiac/daily` — POST only; calls `orchestrateDailyExperience` (sequential: experience/bootstrap → experience/daily)
- `/api/geocode?q=…` — Nominatim + timeapi.io; IP rate-limited + LRU-cached
- `/api/fufire/:endpoint` — compatibility proxy path (allowlisted only)
- `/{endpoint}` — explicit v3 shortcut routes (also allowlisted)
- everything else — static files from `public/`

**Data flow for calculation requests:**
0. `validatePayload(raw)` (exported) validates date/lat/lon before orchestration; returns `{ valid, errors }`
1. `translatePayload` normalises browser field names (`date`/`datetime`, `tz`/`timezone`, `lat`/`latitude`, etc.) into the FuFirE wire format
2. `callFuFire` fires a single upstream fetch with `AbortController` timeout
3. `normalizeAzodiacResult` (exported) reshapes the raw multi-subsystem response into a stable ViewModel with German element names (`Holz/Feuer/Erde/Metall/Wasser`) and a `view_model_version` stamp

**Key invariant — `FUFIRE_ENDPOINTS` order is test-pinned.** `test/server.test.js` asserts the exact array order. Do not reorder entries without updating that test.

**Hidden stems (`HIDDEN_STEMS` table):** When the upstream BaZi response omits `hidden_stems`, `normalizePillar` derives them from the classical Zàng Gān table embedded in `server.js`. API-supplied stems are passed through unchanged.

**Geo cache / rate limiter** (`makeGeoCache`, `geocodeRateLimiter`) are exported pure factory functions, testable without a running server. Cache: in-memory LRU, max 200 entries, 24 h TTL. Rate limiter: sliding window, 10 req/min per IP.

## Environment variables

| Variable | Required | Default |
|---|---|---|
| `FUFIRE_BASE_URL` | yes (Railway) | `https://bafe-production.up.railway.app/` |
| `FUFIRE_API_KEY` | no | — |
| `FUFIRE_ALLOWED_ORIGINS` | no | `*` (wildcard) |
| `PORT` | injected by Railway | `3000` |
| `API_TIMEOUT_MS` | no | `20000` |
| `MAX_BODY_BYTES` | no | `1000000` |

`FUFIRE_ALLOWED_ORIGINS` is a comma-separated list of allowed CORS origins. If unset, all origins are allowed.

## Frontend (`public/`)

`public/index.html` boots a vanilla-ESM SPA under `public/src/`:

- `src/router.js` — hash router that mounts page modules into the main shell
- `src/api/client.js` — wraps fetch calls to local `/api/azodiac/*` endpoints
- `src/pages/*` — top-level routes (`DashboardPage`, `InputPage`, `OverviewPage`, `PersonalityPage`, `LovePage`, `CareerFinancePage`, `SynastryPage`, `TransitCalendarPage`, `DailyPage`)
- `src/domain/*` — pure transforms from server ViewModel into page-specific projections (`projections.js`, `baziRenderer.js`, `coreStatement.js`)
- `src/components/*` — reusable widgets (`GeoInput`, `ConfidenceBar`, `SourceBadge`, etc.)

No bundler. Browsers load modules directly. `public/reference.html` is the static FuFirE API reference (not part of the SPA).

## Tests

- `test/server.test.js` — integration tests; spins a real `node:http` server on port 0, mocks the upstream by pointing `FUFIRE_BASE_URL` at a local stub server
- `test/view_model.test.js` — pure unit tests for `normalizeAzodiacResult` and pillar normalisation
- `test/geocode.test.js` — unit tests for `makeGeoCache` and `geocodeRateLimiter`
- `test/payload.test.js` — `validatePayload` and `translatePayload` field-name normalisation
- `test/projections.test.js` — frontend domain projections (`public/src/domain/projections.js`)
- `test/api_client.test.js` — frontend `src/api/client.js` against a stub server
- `test/element-tension.test.js` — synastry element-tension scoring
- `test/domain-score.test.js` — synastry domain-level (love/career/etc.) scoring
- `test/dynasty-resonance.test.js` — dynasty/pillar resonance scoring
- `test/house-comparison.test.js` — synastry 12-house comparison logic
- `test/astro-mappings.test.js` — western/bazi/element mapping tables
- `test/synastry-logging.test.js` — observability of synastry orchestration
- `test/documentation.test.js` — README ↔ implementation sync check (endpoint catalog, examples)
- `test/contract.test.js` — **opt-in only** (`FUFIRE_CONTRACT_TEST=true`); fires real requests at `FUFIRE_BASE_URL` to detect upstream path drift

## Planning docs

`docs/plans/YYYY-MM-DD-*.md` capture historical and in-flight feature plans (backend hardening, synastry, transit, fusion endpoint, UI improvements). Read the matching plan before extending an area — it explains the intent the tests are pinned to.

## Deployment

Railway picks this up as a Node.js app via `package.json`. `railway.json` pins the start command and registers `/health` as the health-check path. No Docker image, no build step — Railpack runs `npm start` directly.

## Multi-iteration TDD gate pattern

Per-iteration gate that has shipped multiple sprints cleanly in this repo (Overview Signature Experience, 2026-05-22):
1. Forge sprint goal (`/goal-forge` with verbatim Sprintziel).
2. Failing test committed first.
3. Minimal implementation.
4. Focused tests green (`node --test <focused file>`).
5. Full suite green (`npm test`).
6. Server up on `PORT=4100`; live Playwright run with `APP_BASE_URL=http://127.0.0.1:4100`.
7. Screenshots persisted under `docs/qa/screenshots/<feature>/<iter>/`.
8. **Three parallel subagents in a single message**: `tester` (Playwright integrity + screenshot file+size+mtime + silent-skip detection), `reviewer` (line-level diff), `superpowers:code-reviewer` (acceptance vs REQ table + PO checklist using screenshots).
9. Fix every Critical/Major; re-run from step 4 until clean.
10. Update `docs/qa/<date>-<feature>-review.md`, commit, push.

Never push before the gate is green.

## DOM gotchas in this codebase

- **`querySelector('[data-X]')` may pick an inline SVG `<metadata>` element** before the visible `<li>` because metadata DOM-order precedes the audit list. Scope to the concrete tag (`li[data-X]`) when wiring interaction listeners. Same trap caught us twice — once in `installWheelAuditLink`, once in `test/e2e/i3-wheel.spec.js`.
- `NatalChartAuditTabs` renders planet rows inside a hidden tab panel by default. Tests asserting visibility (`toBeVisible()`) on those rows will fail; use `toBeAttached()` unless the test simulates the tab click.
