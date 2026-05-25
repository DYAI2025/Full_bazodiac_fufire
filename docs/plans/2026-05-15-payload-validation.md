# Payload Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `validatePayload` function that rejects malformed inputs with a 400 before firing any upstream FuFirE call, giving the frontend a useful error instead of a cryptic 502.

**Architecture:** Export a pure `validatePayload(raw)` from `server.js` that returns `{ valid: true }` or `{ valid: false, errors: string[] }`. Both request handlers (`/chart` and `/api/azodiac/profile`) call it immediately after parsing the body and return 400 early on failure. `translatePayload` is not changed — it remains a pure normalizer.

**Tech Stack:** Node.js ESM, `node:test`, `node:assert/strict`. No new dependencies.

---

## Context you need

**`server.js`** is the entire backend. Two functions call `translatePayload`:
- `orchestrateChart` (line ~297) called from `handleChartRequest` (line ~449)
- `orchestrateFullProfile` (line ~330) called from the `/api/azodiac/profile` handler (line ~692)

**`translatePayload` (line 116–130)** normalises field aliases (`date`/`datetime`, `lat`/`latitude`, etc.) but does zero validation. Missing `date` becomes `''`; missing `lat`/`lon` become `0` via `Number(undefined) → NaN → 0` with `?? 0`.

**Test pattern:** integration tests spin up a real HTTP server on port 0, make real `fetch` calls. See `test/server.test.js` for the `withServer(fn)` helper. Unit tests import named exports directly: `import { normalizeAzodiacResult } from '../server.js'`.

**Run a single test file:**
```bash
node --test test/payload.test.js
```

**Run full suite:**
```bash
node --test test/*.test.js
```

Expected output when all pass: `# pass 44` (or 44 + new tests), `# fail 0`.

---

## Task 1: Export `validatePayload` and write unit tests

**Files:**
- Modify: `server.js` — add `validatePayload` function + `export`
- Create: `test/payload.test.js`

### Step 1.1 — Write the failing unit tests

Create `test/payload.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePayload } from '../server.js';

test('validatePayload: valid full payload returns { valid: true }', () => {
  const result = validatePayload({
    date: '1990-03-15',
    time: '14:30',
    lat: 48.137,
    lon: 11.576,
    tz: 'Europe/Berlin',
  });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: ISO datetime date string accepted', () => {
  const result = validatePayload({ date: '1990-03-15T14:30:00', lat: 48.0, lon: 11.0 });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: missing date returns error', () => {
  const result = validatePayload({ lat: 48.0, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('date')));
});

test('validatePayload: empty date string returns error', () => {
  const result = validatePayload({ date: '', lat: 48.0, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('date')));
});

test('validatePayload: garbage date string returns error', () => {
  const result = validatePayload({ date: 'not-a-date', lat: 48.0, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('date')));
});

test('validatePayload: missing lat returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lat')));
});

test('validatePayload: missing lon returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lon')));
});

test('validatePayload: lat out of range (-91) returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: -91, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lat')));
});

test('validatePayload: lon out of range (181) returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0, lon: 181 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lon')));
});

test('validatePayload: non-numeric lat returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 'north', lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lat')));
});

test('validatePayload: lat=0, lon=0 is valid (Gulf of Guinea)', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 0, lon: 0 });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: multiple errors collected at once', () => {
  const result = validatePayload({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3); // date, lat, lon all missing
});

test('validatePayload: accepts datetime alias field', () => {
  const result = validatePayload({ datetime: '1990-03-15', lat: 48.0, lon: 11.0 });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: accepts latitude/longitude aliases', () => {
  const result = validatePayload({ date: '1990-03-15', latitude: 48.0, longitude: 11.0 });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: string body is parsed', () => {
  const result = validatePayload(JSON.stringify({ date: '1990-03-15', lat: 48.0, lon: 11.0 }));
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: invalid JSON string returns error', () => {
  const result = validatePayload('{not json}');
  assert.equal(result.valid, false);
});
```

### Step 1.2 — Run to verify RED

```bash
node --test test/payload.test.js
```

Expected: all tests fail with `SyntaxError: The requested module '../server.js' does not provide an export named 'validatePayload'`.

### Step 1.3 — Add `validatePayload` to `server.js`

Find the line after `translatePayload` closes (currently around line 130). Insert immediately after:

```javascript
export function validatePayload(raw) {
  const errors = [];
  let obj;
  try {
    obj = typeof raw === 'string' ? (raw ? JSON.parse(raw) : {}) : (raw || {});
  } catch {
    return { valid: false, errors: ['Request body is not valid JSON'] };
  }

  // Date: required, must match YYYY-MM-DD or YYYY-MM-DDTHH:MM[:SS]
  const dateStr = obj.date || obj.datetime || '';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
  if (!dateStr) {
    errors.push('date: required — provide date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:MM)');
  } else if (!DATE_RE.test(dateStr)) {
    errors.push(`date: invalid format "${dateStr}" — expected YYYY-MM-DD or YYYY-MM-DDTHH:MM`);
  }

  // Lat: required, finite, [-90, 90]
  const rawLat = obj.lat ?? obj.latitude ?? obj.location?.latitude;
  const lat = rawLat !== undefined && rawLat !== '' ? Number(rawLat) : NaN;
  if (rawLat === undefined || rawLat === '') {
    errors.push('lat: required — provide lat (decimal degrees, e.g. 48.137)');
  } else if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push(`lat: must be a number between -90 and 90, got "${rawLat}"`);
  }

  // Lon: required, finite, [-180, 180]
  const rawLon = obj.lon ?? obj.longitude ?? obj.location?.longitude;
  const lon = rawLon !== undefined && rawLon !== '' ? Number(rawLon) : NaN;
  if (rawLon === undefined || rawLon === '') {
    errors.push('lon: required — provide lon (decimal degrees, e.g. 11.576)');
  } else if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errors.push(`lon: must be a number between -180 and 180, got "${rawLon}"`);
  }

  if (errors.length) return { valid: false, errors };
  return { valid: true };
}
```

### Step 1.4 — Run to verify GREEN

```bash
node --test test/payload.test.js
```

Expected: all 16 tests pass, `# fail 0`.

### Step 1.5 — Commit

```bash
git add server.js test/payload.test.js
git commit -m "feat(validation): export validatePayload — date/lat/lon guards before upstream calls"
```

---

## Task 2: Wire validation into both request handlers

**Files:**
- Modify: `server.js` — add early-return 400 in `handleChartRequest` and the `/api/azodiac/profile` block
- Modify: `test/server.test.js` — add 400 integration tests for both endpoints

### Step 2.1 — Write the failing integration tests

Open `test/server.test.js`. Add these tests inside the `withServer` callback pattern already used in that file (follow the existing `test(...)` structure at the top level):

```javascript
test('/chart: returns 400 when date is missing', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/chart`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 48.137, lon: 11.576, tz: 'Europe/Berlin' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some(e => e.includes('date')));
  });
});

test('/chart: returns 400 when lat is out of range', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/chart`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '1990-03-15', lat: 999, lon: 11.576 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.some(e => e.includes('lat')));
  });
});

test('/api/azodiac/profile: returns 400 when lon is missing', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '1990-03-15', lat: 48.0 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.some(e => e.includes('lon')));
  });
});

test('/api/azodiac/profile: returns 400 when body is empty', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.length >= 3);
  });
});
```

### Step 2.2 — Run to verify RED

```bash
node --test test/server.test.js
```

Expected: the 4 new tests fail (currently they get 502 from the upstream mock, not 400).

### Step 2.3 — Wire validation in `handleChartRequest`

Find `handleChartRequest` in `server.js` (around line 449). The current body-read block ends with a try/catch for JSON parse. Add the validation call immediately after that block, before the `orchestrateChart` try:

```javascript
// existing JSON body parse block ends here...
const validation = validatePayload(body || '{}');
if (!validation.valid) {
  return sendJson(res, 400, {
    error: 'Invalid request payload',
    errors: validation.errors,
  }, requestOrigin);
}
// existing try { const result = await orchestrateChart(...) starts here
```

### Step 2.4 — Wire validation in the `/api/azodiac/profile` handler

Find the `/api/azodiac/profile` block in `handleRequest` (around line 692). Same placement: after the body JSON parse block, before the `orchestrateFullProfile` try:

```javascript
// existing JSON body parse block ends here...
const validation = validatePayload(body || '{}');
if (!validation.valid) {
  return sendJson(res, 400, {
    error: 'Invalid request payload',
    errors: validation.errors,
  }, requestOrigin);
}
// existing try { const result = await orchestrateFullProfile(...) starts here
```

### Step 2.5 — Run to verify GREEN

```bash
node --test test/*.test.js
```

Expected: all tests pass including the 4 new integration tests. Total pass count increases by 4.

### Step 2.6 — Commit

```bash
git add server.js test/server.test.js
git commit -m "feat(validation): 400 early-return in /chart and /api/azodiac/profile on bad payload"
```

---

## Verification after both tasks

```bash
node --test test/*.test.js
```

Expected:
```
# pass 64   (44 existing + 16 unit + 4 integration)
# fail 0
# skipped 5
```

Manual smoke-test with curl (server must be running: `npm start`):

```bash
# Missing date → 400
curl -s -X POST http://localhost:3000/api/azodiac/profile \
  -H 'content-type: application/json' \
  -d '{"lat":48.137,"lon":11.576}' | jq .

# Expected:
# { "error": "Invalid request payload", "errors": ["date: required — ..."] }

# Valid payload → 200 (or 502 if upstream is down, which is fine)
curl -s -X POST http://localhost:3000/api/azodiac/profile \
  -H 'content-type: application/json' \
  -d '{"date":"1990-03-15","time":"14:30","lat":48.137,"lon":11.576,"tz":"Europe/Berlin"}' | jq ._meta
```
