# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A Node.js (ESM, `"type": "module"`) proxy and live dashboard that sits in front of the FuFirE astrology backend. `server.js` is the **entire backend** — no build step, no external runtime dependencies. It serves `public/` as static files and proxies/orchestrates calls to `FUFIRE_BASE_URL`.

## Commands

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
- `/api/geocode?q=…` — Nominatim + timeapi.io; IP rate-limited + LRU-cached
- `/api/fufire/:endpoint` — compatibility proxy path (allowlisted only)
- `/{endpoint}` — explicit v3 shortcut routes (also allowlisted)
- everything else — static files from `public/`

**Data flow for calculation requests:**
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

## Tests

- `test/server.test.js` — integration tests; spins a real `node:http` server on port 0, mocks the upstream by pointing `FUFIRE_BASE_URL` at a local stub server
- `test/view_model.test.js` — pure unit tests for `normalizeAzodiacResult` and pillar normalisation
- `test/geocode.test.js` — unit tests for `makeGeoCache` and `geocodeRateLimiter`
- `test/contract.test.js` — **opt-in only** (`FUFIRE_CONTRACT_TEST=true`); fires real requests at `FUFIRE_BASE_URL` to detect upstream path drift

## Deployment

Railway picks this up as a Node.js app via `package.json`. `railway.json` pins the start command and registers `/health` as the health-check path. No Docker image, no build step — Railpack runs `npm start` directly.
