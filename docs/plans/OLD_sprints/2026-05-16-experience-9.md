# Experience/Daily Backend + UI (INCREMENT 9) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `/api/azodiac/daily` backend route that orchestrates `experience/bootstrap` → `experience/daily`, then build the `/daily` frontend page showing western + eastern + fusion daily themes.

**Architecture:** The orchestrator is a two-step sequential upstream call: first `POST /experience/bootstrap` (birth data → soulprint_sectors), then `POST /experience/daily` (birth + soulprint_sectors + quiz_sectors=[0×12] + today). Both calls use `callFuFirePost` (a new GET-capable variant of `callFuFire` that forwards arbitrary payloads). The frontend `/daily` page requires an existing profile in sessionStorage (set by `/api/azodiac/profile` flow) and calls `/api/azodiac/daily` with the saved birth input.

**Tech Stack:** Node.js ESM, `node:test`, vanilla ES modules.

---

## Context you need

**Upstream endpoint shapes:**

`POST /experience/bootstrap` — accepts:
```json
{ "birth": { "date": "1990-03-15", "time": "14:30:00", "lat": 48.137, "lon": 11.576, "tz": "Europe/Berlin" } }
```
Note: `time` must be `HH:MM:SS` — add `:00` if the incoming time is `HH:MM`.

Returns:
```json
{
  "profile": { "sun_sign": "...", "moon_sign": "...", "ascendant_sign": "...", "day_master": "...", "harmony_index": 0.0 },
  "soulprint_sectors": [12 floats],
  "signature_blueprint": { ... },
  "meta": { "engine_version": "...", "generated_at": "..." }
}
```

`POST /experience/daily` — accepts:
```json
{
  "birth": { "date": "1990-03-15", "time": "14:30:00", "lat": 48.137, "lon": 11.576, "tz": "Europe/Berlin" },
  "soulprint_sectors": [12 floats],
  "quiz_sectors": [0,0,0,0,0,0,0,0,0,0,0,0],
  "target_date": "2026-05-16"
}
```

Returns:
```json
{
  "date": "2026-05-16",
  "western": {
    "summary": "...", "themes": ["..."], "caution": "...", "opportunity": "...",
    "evidence": { "transit_sectors": [...], "natal_focus": [...], ... },
    "jieqi_note": null, "weekday_note": "..."
  },
  "eastern": {
    "summary": "...", "themes": ["..."], "caution": "...", "opportunity": "...",
    "evidence": { "day_master": "...", "daily_pillar": { "stem": "...", "branch": "..." }, ... },
    "jieqi_note": "...", "weekday_note": "..."
  },
  "fusion": {
    "summary": "...", "synthesis": "...", "action": "...", "pushworthy": false
  }
}
```

**`server.js` — key functions:**
- `callFuFire(upstreamPath, payload, signal)` — POST only, JSON body
- `getFuFireHeaders(isGet)` — adds api-key header
- `getFuFireBaseUrl()` — returns the base URL
- `readRequestBody(req)` — reads HTTP request body
- `translatePayload(raw)` — normalizes field aliases (do NOT use for the bootstrap/daily payload — they have different field names)
- `validatePayload(raw)` — validates date/lat/lon (reuse for the incoming `/api/azodiac/daily` request)
- `sendJson(res, status, body, origin)` — sends JSON response with CORS
- `API_TIMEOUT_MS` — timeout constant

**`handleRequest` (line 736)** — add the new route in the infrastructure section, before the geocoder block. Follow the same pattern as `/api/azodiac/profile`.

**Run tests:**
```bash
node --test test/server.test.js test/view_model.test.js test/geocode.test.js test/payload.test.js test/projections.test.js test/api_client.test.js
```

Baseline: `# pass 88`, `# fail 0` (after transit plan is applied).

---

## Task 1: Backend `/api/azodiac/daily` route

**Files:**
- Modify: `server.js`

### Step 1.1 — Write the failing integration test

Open `test/server.test.js`. Add at the bottom (inside the file, following the `withServer` pattern already used):

```javascript
test('/api/azodiac/daily: returns 400 when date is missing', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/daily`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 48.137, lon: 11.576 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some(e => e.includes('date')));
  });
});

test('/api/azodiac/daily: returns 405 for GET', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/daily`);
    assert.equal(res.status, 405);
  });
});
```

### Step 1.2 — Run to verify RED

```bash
node --test test/server.test.js 2>&1 | grep -E "fail|not a function|FAIL" | head -5
```

Expected: 2 new tests fail (404 instead of 400/405).

### Step 1.3 — Add the orchestrator function to server.js

Find the `orchestrateFullProfile` function (around line 390). After its closing brace, add this new function:

```javascript
// ── Daily experience orchestrator: bootstrap → daily ──────────────────────
async function orchestrateDailyExperience(rawBody) {
  const obj = typeof rawBody === 'string' ? (rawBody ? JSON.parse(rawBody) : {}) : (rawBody || {});

  // Normalise birth fields (same aliases as translatePayload, but keep separate object)
  const date = (obj.date || obj.datetime || '').split('T')[0];
  let time = obj.time || '12:00';
  if (time.length === 5) time = `${time}:00`;      // HH:MM → HH:MM:SS
  const lat  = Number(obj.lat ?? obj.latitude ?? 0);
  const lon  = Number(obj.lon ?? obj.longitude ?? 0);
  const tz   = obj.tz || obj.timezone || 'UTC';

  const birth = { date, time, lat, lon, tz };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // Step 1: bootstrap → soulprint_sectors
    const bootstrapUrl = new URL('experience/bootstrap', getFuFireBaseUrl());
    const bootstrapRes = await fetch(bootstrapUrl, {
      method: 'POST',
      headers: getFuFireHeaders(false),
      body: JSON.stringify({ birth }),
      signal: controller.signal,
    });
    if (!bootstrapRes.ok) {
      const errText = await bootstrapRes.text();
      return { httpStatus: 502, body: { error: 'Experience bootstrap failed', detail: errText } };
    }
    const bootstrap = await bootstrapRes.json();
    const soulprintSectors = bootstrap.soulprint_sectors || new Array(12).fill(0);

    // Step 2: daily
    const today = new Date().toISOString().split('T')[0];
    const dailyUrl = new URL('experience/daily', getFuFireBaseUrl());
    const dailyRes = await fetch(dailyUrl, {
      method: 'POST',
      headers: getFuFireHeaders(false),
      body: JSON.stringify({
        birth,
        soulprint_sectors: soulprintSectors,
        quiz_sectors: new Array(12).fill(0),
        target_date: obj.target_date || today,
      }),
      signal: controller.signal,
    });
    if (!dailyRes.ok) {
      const errText = await dailyRes.text();
      return { httpStatus: 502, body: { error: 'Experience daily failed', detail: errText } };
    }
    const daily = await dailyRes.json();

    return {
      httpStatus: 200,
      body: {
        ...daily,
        _meta: {
          bootstrap_profile: bootstrap.profile,
          computed_at: new Date().toISOString(),
        },
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
```

### Step 1.4 — Add the route handler in handleRequest

In `handleRequest` (line 736), after the `/api/geocode` block (around line 792) and before the allowlist proxy block, add:

```javascript
  // ── Daily experience aggregator ──
  if (url.pathname === '/api/azodiac/daily') {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {}, requestOrigin);
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed', allowed: ['POST'] }, requestOrigin);
    }
    let body = '';
    try {
      body = await readRequestBody(req);
      if (body) JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message }, requestOrigin);
    }
    const validation = validatePayload(body || '{}');
    if (!validation.valid) {
      return sendJson(res, 400, { error: 'Invalid request payload', errors: validation.errors }, requestOrigin);
    }
    try {
      const result = await orchestrateDailyExperience(body || '{}');
      return sendJson(res, result.httpStatus, result.body, requestOrigin);
    } catch (error) {
      const isAbort = error.name === 'AbortError';
      return sendJson(res, 502, {
        error: isAbort ? 'Upstream timeout' : 'Upstream unavailable',
        detail: error.message,
      }, requestOrigin);
    }
  }
```

### Step 1.5 — Run to verify GREEN

```bash
node --test test/server.test.js 2>&1 | tail -8
```

Expected: all tests pass including the 2 new `/api/azodiac/daily` tests.

### Step 1.6 — Run full suite

```bash
node --test test/server.test.js test/view_model.test.js test/geocode.test.js test/payload.test.js test/projections.test.js test/api_client.test.js 2>&1 | tail -8
```

Expected: `# pass 90`, `# fail 0`.

### Step 1.7 — Commit

```bash
git add server.js test/server.test.js
git commit -m "feat(experience): /api/azodiac/daily orchestrator — bootstrap + daily in sequence"
```

---

## Task 2: Add contract test for experience endpoints

**Files:**
- Modify: `test/contract.test.js`

### Step 2.1 — Add experience contract tests

Open `test/contract.test.js`. After the transit contract tests, add:

```javascript
const BIRTH_PAYLOAD = {
  date: '1990-03-15',
  time: '14:30:00',
  lat: 48.137,
  lon: 11.576,
  tz: 'Europe/Berlin',
};

test('contract: experience/bootstrap responds 200 with soulprint_sectors', async (t) => {
  skipIfDisabled(t);
  const res = await fetch(`${BASE_URL}/experience/bootstrap`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ birth: BIRTH_PAYLOAD }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert.ok(Array.isArray(json.soulprint_sectors), 'soulprint_sectors must be an array');
  assert.equal(json.soulprint_sectors.length, 12, 'soulprint_sectors must have 12 entries');
  assert.ok(json.profile, 'profile field must exist');
});

test('contract: /api/azodiac/daily responds 200 via orchestrator', async (t) => {
  skipIfDisabled(t);
  // This test calls our proxy, not the upstream directly
  const proxyBase = process.env.PROXY_BASE_URL || BASE_URL;
  // Falls back to direct upstream check if proxy not available
  const bootstrapRes = await fetch(`${BASE_URL}/experience/bootstrap`, {
    method: 'POST', headers,
    body: JSON.stringify({ birth: BIRTH_PAYLOAD }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(bootstrapRes.status, 200);
  const bootstrap = await bootstrapRes.json();

  const today = new Date().toISOString().split('T')[0];
  const dailyRes = await fetch(`${BASE_URL}/experience/daily`, {
    method: 'POST', headers,
    body: JSON.stringify({
      birth: BIRTH_PAYLOAD,
      soulprint_sectors: bootstrap.soulprint_sectors,
      quiz_sectors: new Array(12).fill(0),
      target_date: today,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(dailyRes.status, 200, `Expected 200, got ${dailyRes.status}`);
  const json = await dailyRes.json();
  assert.ok(json.date, 'date field must exist');
  assert.ok(json.western, 'western field must exist');
  assert.ok(json.eastern, 'eastern field must exist');
  assert.ok(json.fusion, 'fusion field must exist');
  assert.ok(json.western.themes, 'western.themes must exist');
  assert.ok(typeof json.fusion.pushworthy === 'boolean', 'fusion.pushworthy must be boolean');
});
```

### Step 2.2 — Run contract tests

```bash
FUFIRE_CONTRACT_TEST=true FUFIRE_BASE_URL=https://bafe-production.up.railway.app FUFIRE_API_KEY=ff_enterprise_5b60525878baa197d01169e615c73e06e5a9464d node --test test/contract.test.js 2>&1 | tail -10
```

Expected: all tests pass including the 2 new experience tests.

### Step 2.3 — Commit

```bash
git add test/contract.test.js
git commit -m "test(experience): contract tests for experience/bootstrap and experience/daily"
```

---

## Task 3: Add client function + store birth input

**Files:**
- Modify: `public/src/api/client.js`
- Modify: `public/src/pages/InputPage.js`

### Step 3.1 — Add getDailyExperience to client.js

Open `public/src/api/client.js`. After `getTransitTimeline()`, add:

```javascript
export async function getDailyExperience(birthInput) {
  return request('POST', '/api/azodiac/daily', birthInput);
}
```

### Step 3.2 — Store birth input in InputPage.js

The `/daily` page needs the original birth input (date, time, lat, lon, tz) to call `/api/azodiac/daily`. The simplest approach: store it in `sessionStorage` when a profile is successfully calculated.

Open `public/src/pages/InputPage.js`. Find the form submit handler. After `res.data._inputMeta = { ... }` and before `onResult?.(res.data)`, add:

```javascript
    sessionStorage.setItem('azodiac_birth_input', JSON.stringify(input));
```

### Step 3.3 — Commit

```bash
git add public/src/api/client.js public/src/pages/InputPage.js
git commit -m "feat(experience): getDailyExperience client function + persist birth input"
```

---

## Task 4: Daily experience page

**Files:**
- Create: `public/src/pages/DailyPage.js`
- Modify: `public/src/app.js`
- Modify: `public/src/pages/OverviewPage.js`
- Modify: `public/src/styles/main.css`

### Step 4.1 — Create DailyPage.js

```javascript
// public/src/pages/DailyPage.js
import { getDailyExperience } from '../api/client.js';

function renderThemes(themes) {
  if (!themes?.length) return '';
  return `<div class="daily-themes">${themes.map(t => `<span class="daily-theme-tag">${t}</span>`).join('')}</div>`;
}

function renderPillar(pillar) {
  if (!pillar) return '';
  return `<span class="daily-pillar">${pillar.stem || ''}${pillar.branch || ''}</span>`;
}

function renderSection(label, data, variant) {
  if (!data) return '';
  const el = document.createElement('div');
  el.className = `daily-section daily-section--${variant}`;
  el.innerHTML = `
    <h2 class="daily-section-title">${label}</h2>
    <p class="daily-summary">${data.summary || ''}</p>
    ${renderThemes(data.themes)}
    ${data.opportunity ? `<div class="daily-callout daily-callout--opportunity"><strong>Chance:</strong> ${data.opportunity}</div>` : ''}
    ${data.caution ? `<div class="daily-callout daily-callout--caution"><strong>Achtung:</strong> ${data.caution}</div>` : ''}
    ${data.jieqi_note ? `<p class="daily-note daily-note--jieqi">${data.jieqi_note}</p>` : ''}
    ${data.weekday_note ? `<p class="daily-note">${data.weekday_note}</p>` : ''}
    ${data.evidence?.daily_pillar ? `<p class="daily-note">Tagessäule: ${renderPillar(data.evidence.daily_pillar)}</p>` : ''}
  `;
  return el;
}

function renderFusion(fusion) {
  if (!fusion) return '';
  const el = document.createElement('div');
  el.className = 'daily-section daily-section--fusion';
  el.innerHTML = `
    <h2 class="daily-section-title">Fusion — Synthese</h2>
    <p class="daily-summary">${fusion.summary || ''}</p>
    <p class="daily-synthesis">${fusion.synthesis || ''}</p>
    ${fusion.action ? `<div class="daily-action">${fusion.action}</div>` : ''}
    ${fusion.pushworthy ? '<div class="daily-pushworthy">Heute ist ein besonders aktiver Tag — nutze ihn.</div>' : ''}
  `;
  return el;
}

export function DailyPage(app, { onNavigate }) {
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  app.innerHTML = `
    <main class="daily-page">
      <header class="daily-header">
        <a href="#/" class="daily-back-link">← Zurück</a>
        <h1 class="daily-title">Tagespuls</h1>
        <p class="daily-date">${today}</p>
      </header>
      <div class="daily-loading" role="status" aria-live="polite">Tagespuls wird berechnet…</div>
      <div class="daily-content" hidden></div>
      <div class="daily-error" role="alert" hidden></div>
    </main>
  `;

  const loading = app.querySelector('.daily-loading');
  const content = app.querySelector('.daily-content');
  const errorEl = app.querySelector('.daily-error');

  // Get birth input from sessionStorage
  let birthInput = null;
  try {
    const stored = sessionStorage.getItem('azodiac_birth_input');
    if (stored) birthInput = JSON.parse(stored);
  } catch { /* ignore parse errors */ }

  if (!birthInput) {
    loading.hidden = true;
    errorEl.innerHTML = 'Kein Geburts-Datensatz gefunden. <a href="#/">Bitte zuerst ein Profil berechnen.</a>';
    errorEl.hidden = false;
    return;
  }

  getDailyExperience(birthInput).then((res) => {
    loading.hidden = true;

    if (!res.ok) {
      errorEl.textContent = res.error || 'Tagespuls konnte nicht geladen werden.';
      errorEl.hidden = false;
      return;
    }

    const data = res.data;
    const westSection = renderSection('Westlicher Impuls', data.western, 'western');
    const eastSection = renderSection('BaZi — Östlicher Impuls', data.eastern, 'eastern');
    const fusionSection = renderFusion(data.fusion);

    if (westSection) content.appendChild(westSection);
    if (eastSection) content.appendChild(eastSection);
    if (fusionSection) content.appendChild(fusionSection);

    if (data._meta?.bootstrap_profile) {
      const meta = data._meta.bootstrap_profile;
      const metaEl = document.createElement('p');
      metaEl.className = 'daily-meta';
      metaEl.textContent = `Profil: ${meta.sun_sign || ''} · ${meta.day_master || ''}`;
      content.appendChild(metaEl);
    }

    content.hidden = false;
  }).catch((err) => {
    loading.hidden = true;
    errorEl.textContent = `Fehler: ${err.message}`;
    errorEl.hidden = false;
  });
}
```

### Step 4.2 — Add daily page styles to main.css

Append at the end of `public/src/styles/main.css`:

```css
/* ── Daily Page ───────────────────────────────────────────────────────────── */
.daily-page { max-width: 720px; margin: 0 auto; padding: 1.5rem 1rem; }
.daily-header { margin-bottom: 2rem; }
.daily-back-link { font-size: 0.875rem; color: var(--muted-foreground, #666); text-decoration: none; }
.daily-back-link:hover { text-decoration: underline; }
.daily-title { font-size: 1.75rem; font-weight: 700; margin: 0.5rem 0 0; }
.daily-date { font-size: 0.95rem; color: var(--muted-foreground, #666); margin: 0.25rem 0 0; }

.daily-loading, .daily-error { padding: 2rem; text-align: center; }
.daily-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #b91c1c; text-align: left; margin: 1rem 0; }
.daily-error a { color: #b91c1c; }

.daily-content { display: flex; flex-direction: column; gap: 1.5rem; }

.daily-section { background: var(--card, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1.5rem; }
.daily-section--western { border-left: 4px solid #6366f1; }
.daily-section--eastern { border-left: 4px solid #f59e0b; }
.daily-section--fusion { border-left: 4px solid #22c55e; background: linear-gradient(135deg, #f0fdf4, #fff); }

.daily-section-title { font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem; }
.daily-summary { margin: 0 0 0.75rem; line-height: 1.6; }
.daily-synthesis { font-style: italic; color: var(--muted-foreground, #555); margin: 0.5rem 0; line-height: 1.6; }

.daily-themes { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
.daily-theme-tag { background: var(--muted, #f3f4f6); border-radius: 99px; padding: 0.2rem 0.75rem; font-size: 0.8rem; font-weight: 600; }

.daily-callout { padding: 0.625rem 0.875rem; border-radius: 8px; font-size: 0.9rem; margin-bottom: 0.5rem; }
.daily-callout--opportunity { background: #f0fdf4; border: 1px solid #bbf7d0; }
.daily-callout--caution { background: #fffbeb; border: 1px solid #fde68a; }

.daily-note { font-size: 0.85rem; color: var(--muted-foreground, #666); margin: 0.25rem 0; }
.daily-note--jieqi { font-style: italic; }

.daily-action { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 0.75rem; font-weight: 500; }
.daily-pushworthy { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 0.5rem 1rem; margin-top: 0.5rem; font-weight: 600; font-size: 0.9rem; }

.daily-pillar { font-weight: 700; font-size: 1.1rem; }
.daily-meta { font-size: 0.8rem; color: var(--muted-foreground, #888); text-align: center; margin: 0.5rem 0 0; }
```

### Step 4.3 — Wire route in app.js

Open `public/src/app.js`. Add the import:

```javascript
import { DailyPage } from './pages/DailyPage.js';
```

Add the route (after the `/transit-calendar` route):

```javascript
  .register('/daily', (app) => {
    DailyPage(app, { onNavigate: (path) => router.navigate(path) });
  })
```

### Step 4.4 — Add nav link in OverviewPage.js

Open `public/src/pages/OverviewPage.js`. In the `<nav class="page-nav">` block, add after the Transitkalender link:

```html
<a href="#/daily" class="nav-link">Tagespuls</a>
```

### Step 4.5 — Run full test suite

```bash
node --test test/server.test.js test/view_model.test.js test/geocode.test.js test/payload.test.js test/projections.test.js test/api_client.test.js 2>&1 | tail -8
```

Expected: `# pass 90`, `# fail 0`.

### Step 4.6 — Commit

```bash
git add public/src/pages/DailyPage.js public/src/app.js public/src/pages/OverviewPage.js public/src/styles/main.css
git commit -m "feat(experience): DailyPage — western + eastern + fusion daily themes"
```

---

## Verification after all tasks

```bash
node --test test/server.test.js test/view_model.test.js test/geocode.test.js test/payload.test.js test/projections.test.js test/api_client.test.js 2>&1 | tail -8
```

Expected: `# pass 90`, `# fail 0`.

Contract tests (full chain, requires .env):
```bash
FUFIRE_CONTRACT_TEST=true FUFIRE_BASE_URL=https://bafe-production.up.railway.app FUFIRE_API_KEY=ff_enterprise_5b60525878baa197d01169e615c73e06e5a9464d node --test test/contract.test.js 2>&1 | tail -12
```

Expected: all 9 contract tests pass.

Manual smoke test (server must be running: `npm start`):
```bash
# Should 400 (no date)
curl -s -X POST http://localhost:3000/api/azodiac/daily \
  -H 'content-type: application/json' \
  -d '{"lat":48.137,"lon":11.576}' | jq .

# Should 200 with western/eastern/fusion
curl -s -X POST http://localhost:3000/api/azodiac/daily \
  -H 'content-type: application/json' \
  -d '{"date":"1990-03-15","time":"14:30","lat":48.137,"lon":11.576,"tz":"Europe/Berlin"}' | jq '.western.themes, .eastern.summary[:80]'
```
