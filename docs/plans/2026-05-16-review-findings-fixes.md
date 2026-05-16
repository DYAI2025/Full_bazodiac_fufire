# Review Findings Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all blocking and important findings from the code-review-excellence review of branch `2026-05-15-multipage-fixes`: XSS in SynastryPage (B1, B2), missing `tz` validation (I2), module-scope hoisting (I1), and minor cleanups (N1, N2).

**Architecture:** All fixes are in-place edits to existing files — no new files needed. B1/B2 add an `esc()` function to `SynastryPage.js` and wrap every API-derived `innerHTML` interpolation. I2 extends `validatePayload` in `server.js` and updates existing `payload.test.js` tests whose `{ valid: true }` assertions omit `tz`. I1 is a pure refactor — move constants to module scope without changing behavior. N1/N2 are dead-code removal and a DOM-construction consistency fix.

**Tech Stack:** Vanilla JS (ESM) frontend, Node.js ESM backend (`server.js`), `node:test` + `node:assert/strict`, no build step.

---

### Task 1: XSS fix — `SynastryPage.js` `renderWuXing` + `renderBazi` (B1, B2)

**Files:**
- Modify: `public/src/pages/SynastryPage.js` — add `esc()`, wrap 7 interpolation sites

**Background:**
`DailyPage.js` and `TransitCalendarPage.js` both define an `esc()` helper at the top and use it for every API-derived value inside `innerHTML`. `SynastryPage.js` was written without this guard. The upstream API controls the BaZi element names and stem characters; both are rendered raw into `innerHTML` in two render functions.

Affected interpolation sites:
- `renderWuXing` lines 189–192: `proj.wuxing.elementA`, `proj.wuxing.elementB`, `proj.wuxing.cycle`
- `renderBazi` lines 228–230: `proj.bazi.stemA`, `proj.bazi.elementA`, `proj.bazi.stemB`, `proj.bazi.elementB`

**Step 1: Add `esc()` to `SynastryPage.js`**

In `public/src/pages/SynastryPage.js`, add the following immediately after the last `import` line (line 5):

```javascript
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

**Step 2: Fix `renderWuXing`**

Find this block (around line 188):
```javascript
    header.innerHTML = `
      <span class="synastry-element element-a">${proj.wuxing.elementA}</span>
      <span class="synastry-relation-arrow">→</span>
      <span class="synastry-element element-b">${proj.wuxing.elementB}</span>
      <span class="synastry-cycle-label">${proj.wuxing.cycle}</span>
    `;
```

Replace with:
```javascript
    header.innerHTML = `
      <span class="synastry-element element-a">${esc(proj.wuxing.elementA)}</span>
      <span class="synastry-relation-arrow">→</span>
      <span class="synastry-element element-b">${esc(proj.wuxing.elementB)}</span>
      <span class="synastry-cycle-label">${esc(proj.wuxing.cycle)}</span>
    `;
```

**Step 3: Fix `renderBazi`**

Find this block (around line 227):
```javascript
    stems.innerHTML = `
      <span class="bazi-stem-a">${proj.bazi.stemA} ${proj.bazi.elementA}</span>
      <span class="bazi-stem-sep">×</span>
      <span class="bazi-stem-b">${proj.bazi.stemB} ${proj.bazi.elementB}</span>
    `;
```

Replace with:
```javascript
    stems.innerHTML = `
      <span class="bazi-stem-a">${esc(proj.bazi.stemA)} ${esc(proj.bazi.elementA)}</span>
      <span class="bazi-stem-sep">×</span>
      <span class="bazi-stem-b">${esc(proj.bazi.stemB)} ${esc(proj.bazi.elementB)}</span>
    `;
```

**Step 4: Run tests — confirm no regressions**

```bash
npm test
```
Expected: 94 pass, 9 skipped, 0 fail. `SynastryPage` has no unit tests; this is a code-level correctness fix — all existing tests must stay green.

**Step 5: Commit**

```bash
git add public/src/pages/SynastryPage.js
git commit -m "fix(synastry): escape API-derived values in renderWuXing + renderBazi innerHTML

B1/B2 from code-review-excellence: elementA/elementB/cycle/stemA/stemB are
upstream API strings interpolated unescaped into innerHTML. Adds esc() following
the same pattern as DailyPage.js and TransitCalendarPage.js.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Add `tz` validation to `validatePayload` (I2)

**Files:**
- Modify: `test/payload.test.js` — new tests + update 5 existing `{ valid: true }` assertions
- Modify: `test/server.test.js` — add 1 integration test
- Modify: `server.js:160–198` — add tz check inside `validatePayload`

**Background:**
`validatePayload` validates `date`, `lat`, `lon` but not `tz`. All three orchestrators consume the timezone (`tz || timezone || 'UTC'`). An empty timezone silently falls back to `'UTC'`, giving the user a wrong result rather than a clear error.

**Important:** 5 existing tests in `payload.test.js` use `assert.deepEqual(result, { valid: true })` with payloads that omit `tz`. They will break when validation is added. Update those payloads first (Step 1) before writing the new tests (Step 2) so the test file always stays self-consistent.

**Step 1: Update 5 existing `payload.test.js` tests — add `tz` to their valid payloads**

Find and update each of the following tests in `test/payload.test.js`:

```javascript
// Line 16: add tz: 'UTC'
test('validatePayload: ISO datetime date string accepted', () => {
  const result = validatePayload({ date: '1990-03-15T14:30:00', lat: 48.0, lon: 11.0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

// Line 69: add tz: 'UTC'
test('validatePayload: lat=0, lon=0 is valid (Gulf of Guinea)', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 0, lon: 0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

// Line 80: add tz: 'UTC'
test('validatePayload: accepts datetime alias field', () => {
  const result = validatePayload({ datetime: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

// Line 85: add tz: 'UTC'
test('validatePayload: accepts latitude/longitude aliases', () => {
  const result = validatePayload({ date: '1990-03-15', latitude: 48.0, longitude: 11.0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

// Line 90: add tz to JSON string
test('validatePayload: string body is parsed', () => {
  const result = validatePayload(JSON.stringify({ date: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'UTC' }));
  assert.deepEqual(result, { valid: true });
});
```

**Step 2: Write 2 new failing tests at the end of `test/payload.test.js`**

```javascript
test('validatePayload: missing tz returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.137, lon: 11.576 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('tz')), `expected tz error, got: ${JSON.stringify(result.errors)}`);
});

test('validatePayload: accepts timezone alias', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.137, lon: 11.576, timezone: 'Europe/Berlin' });
  assert.deepEqual(result, { valid: true });
});
```

**Step 3: Run payload tests — verify 2 new tests fail, 5 updated tests pass**

```bash
node --test test/payload.test.js
```
Expected: The 2 new tests FAIL (`validatePayload: missing tz` passes `{ valid: true }` but test expects `false`; `timezone alias` returns `{ valid: true }` but also passes — wait, confirm both fail). All 13 existing tests PASS.

**Step 4: Add integration test to `test/server.test.js`**

After the existing `'/api/azodiac/daily: returns 405 for GET'` test, add:

```javascript
test('/api/azodiac/daily: returns 400 when tz is missing', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/daily`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '1990-03-15', lat: 48.137, lon: 11.576 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.some(e => e.includes('tz')));
  });
});
```

**Step 5: Run server tests — verify new integration test fails**

```bash
node --test test/server.test.js
```
Expected: The new test FAILS (currently returns 200 or proxies upstream, not 400).

**Step 6: Implement `tz` validation in `server.js`**

In `server.js`, find the `validatePayload` function around line 196. After the lon validation block and before `if (errors.length) return { valid: false, errors };`, add:

```javascript
  // Tz: required — all orchestrators need a valid IANA timezone
  const rawTz = obj.tz ?? obj.timezone ?? '';
  if (!rawTz) {
    errors.push('tz: required — provide IANA timezone, e.g. Europe/Berlin or UTC');
  }
```

The full end of the function should look like:

```javascript
  // Lon: required, finite, [-180, 180]
  const rawLon = obj.lon ?? obj.longitude ?? obj.location?.longitude;
  const lon = rawLon !== undefined && rawLon !== null && rawLon !== '' ? Number(rawLon) : NaN;
  if (rawLon === undefined || rawLon === null || rawLon === '') {
    errors.push('lon: required — provide lon (decimal degrees, e.g. 11.576)');
  } else if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errors.push(`lon: must be a number between -180 and 180, got "${rawLon}"`);
  }

  // Tz: required — all orchestrators need a valid IANA timezone
  const rawTz = obj.tz ?? obj.timezone ?? '';
  if (!rawTz) {
    errors.push('tz: required — provide IANA timezone, e.g. Europe/Berlin or UTC');
  }

  if (errors.length) return { valid: false, errors };
  return { valid: true };
}
```

**Step 7: Run full test suite — verify all tests pass**

```bash
npm test
```
Expected: 97 pass, 9 skipped, 0 fail (94 existing + 2 new payload + 1 new server integration).

**Step 8: Commit**

```bash
git add server.js test/payload.test.js test/server.test.js
git commit -m "fix(validation): require tz in validatePayload — missing timezone was silently falling back to UTC

I2 from code-review-excellence. Adds tz/timezone required check consistent with
the lat/lon alias pattern. Updates 5 existing payload tests that omitted tz.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Hoist `DATE_RE`, `ASC_SIGNS`, `lonToSign` to module scope (I1)

**Files:**
- Modify: `server.js:171` — move `DATE_RE` constant out of `validatePayload`
- Modify: `server.js:322–326` — move `ASC_SIGNS` and `lonToSign` out of `normalizeAzodiacResult`

**Background:**
Pure constants and functions with no closure dependencies should live at module scope. `DATE_RE` is re-compiled on every POST request (`validatePayload` is the first thing every POST handler calls). `ASC_SIGNS` and `lonToSign` are recreated on every profile response. This is a pure refactor — no behavior changes, all existing tests verify correctness.

**Step 1: Move `DATE_RE` to module scope**

In `server.js`, find inside `validatePayload` (line 171):
```javascript
  const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
```

Delete that line from inside the function. Add the constant at module scope, directly above the `export function validatePayload(raw)` declaration (line 160), so it reads:

```javascript
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function validatePayload(raw) {
```

**Step 2: Move `ASC_SIGNS` and `lonToSign` to module scope**

In `server.js`, find inside `normalizeAzodiacResult` (around lines 322–327):
```javascript
  const ASC_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                     'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  function lonToSign(lon) {
    if (lon == null || typeof lon !== 'number') return null;
    return ASC_SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
  }
```

Delete those lines from inside the function. Add them at module scope directly above `export function normalizeAzodiacResult(raw)` (currently around line 272). The surrounding area should look like:

```javascript
const ASC_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                   'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

function lonToSign(lon) {
  if (lon == null || typeof lon !== 'number') return null;
  return ASC_SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
}

export function normalizeAzodiacResult(raw) {
```

**Step 3: Run full test suite — verify no regressions**

```bash
npm test
```
Expected: Same pass count as before this task (97 pass, 9 skipped, 0 fail). This is a pure refactor; any failure means a mistake in the move.

**Step 4: Commit**

```bash
git add server.js
git commit -m "refactor(server): hoist DATE_RE, ASC_SIGNS, lonToSign to module scope

I1 from code-review-excellence. Pure refactor — no behavior change.
DATE_RE was compiled on every POST request; ASC_SIGNS/lonToSign recreated
on every normalizeAzodiacResult call.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Minor cleanups — dead `onNavigate` param + `errorEl.innerHTML` (N1, N2)

**Files:**
- Modify: `public/src/pages/SynastryPage.js:7` (N1)
- Modify: `public/src/app.js` — remove second arg to `SynastryPage` call (N1 consequence)
- Modify: `public/src/pages/DailyPage.js:77` (N2)

**Step 1: Remove dead `onNavigate` destructuring in `SynastryPage.js`**

Line 7 of `public/src/pages/SynastryPage.js`:
```javascript
export function SynastryPage(app, { onNavigate }) {
```

Change to:
```javascript
export function SynastryPage(app) {
```

Navigation in `SynastryPage` is via `href="#/overview"` anchor tags. The `onNavigate` callback was never called and was dead from the start.

**Step 2: Update the call-site in `public/src/app.js`**

Find in `public/src/app.js` (around line 57):
```javascript
  .register('/synastry', (app) => {
    SynastryPage(app, { onNavigate: (path) => router.navigate(path) });
  })
```

Change to:
```javascript
  .register('/synastry', (app) => {
    SynastryPage(app);
  })
```

**Step 3: Replace `errorEl.innerHTML` with DOM construction in `DailyPage.js`**

Line 77 of `public/src/pages/DailyPage.js`:
```javascript
    errorEl.innerHTML = 'Kein Geburts-Datensatz gefunden. <a href="#/">Bitte zuerst ein Profil berechnen.</a>';
```

Replace with:
```javascript
    errorEl.textContent = 'Kein Geburts-Datensatz gefunden. ';
    const link = document.createElement('a');
    link.href = '#/';
    link.textContent = 'Bitte zuerst ein Profil berechnen.';
    errorEl.appendChild(link);
```

The `errorEl.hidden = false;` line immediately after stays unchanged.

**Step 4: Run tests**

```bash
npm test
```
Expected: Same pass count (97 pass, 9 skipped, 0 fail).

**Step 5: Commit**

```bash
git add public/src/pages/SynastryPage.js public/src/app.js public/src/pages/DailyPage.js
git commit -m "fix(cleanup): remove dead onNavigate param + DOM-construct error link in DailyPage

N1: SynastryPage(app, {onNavigate}) — callback was never called; navigation
uses anchor hrefs. Remove param and update call-site in app.js.
N2: DailyPage errorEl.innerHTML was safe (hardcoded) but inconsistent with
the DOM-construction pattern used throughout the file.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
