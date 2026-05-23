# Da-Yun / Glückssäule Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **Per-iteration gate:** every iteration ends with focused tests green, full `npm test` green, server up on `PORT=4100`, live Playwright run against `APP_BASE_URL=http://127.0.0.1:4100`, screenshots persisted under `docs/qa/screenshots/dayun/<iter>/`, and three parallel subagents (tester + reviewer + `superpowers:code-reviewer`). Fix every Critical/Major. Never push before the gate is green. See `CLAUDE.md` → "Multi-iteration TDD gate pattern".
>
> **Per-iteration sprint goal:** before starting any iteration, run `/goal-forge` with the iteration's Sprintziel (verbatim from this plan), then start the iteration with `/goal <sprintziel>`.

**Goal:** Replace the BaZi page Luck-Pillar placeholder with a real Da-Yun (10-year cycle) integration — direction, start age, full decade list, current decade, relation to Day Master, provenance — surfaced in UI as non-fatalistic time-quality ("Strasse", not "Glück").

**Architecture:** Two repos are involved. (1) **FuFire backend** (separate repo, deployed at `FUFIRE_BASE_URL`) adds `POST /calculate/bazi/dayun` returning a stable contract (direction, anchor solar term, start age, ≥8 cycles, current cycle, provenance, precision). (2) **Bazodiac** (this repo) — `server.js` extends `FUFIRE_ENDPOINTS` and `orchestrateFullProfile` to call the new upstream endpoint in parallel (optional, soft-fail like `tst`/`wuxing_info`), `normalizeAzodiacResult` surfaces `bazi.dayun`, a new `BaziDayunPanel` component renders the current decade on `BaziPage`, `apiProvenance.js` registers the new endpoint, and tests + Playwright + screenshots gate every iteration.

**Tech Stack:** Node ≥20 ESM, `node:test` runner, jsdom (test helpers), Playwright `@playwright/test`, vanilla ESM frontend (no bundler). Backend uses built-in `fetch` + `AbortController`. UI tokens in `public/src/styles/`.

**Repository boundary:** Iterations DY-1 and DY-2 are **FuFire-side** (separate repo). All other iterations (DY-3, DY-4, DY-5) and Bazodiac-side contract tests in DY-1 happen in **this repo**. If the FuFire repo is not accessible to the engineer executing this plan, run DY-3 through DY-5 against a documented contract and a local stub of `/calculate/bazi/dayun` in `test/`; replace the stub with the real endpoint once FuFire ships.

**Reference doc:** this file, `docs/plans/2026-05-22-bazi-dayun-luck-pillar.md`.

---

## 1. Source-doc faithfulness (must-read before coding)

The product brief (verbatim user goal block) is the source of truth for terminology, copy rules, and acceptance. Three points must not drift during execution:

1. **"Dekaden-Säule" replaces "Glückssäule"** in user-visible copy. Internal selectors/data-attributes may still use `lucky` / `luck-pillar` for backward compatibility during transition, but new selectors use `dayun`.
2. **Direction must be explicit input** — either `direction_method = "year_stem_yinyang_and_sex"` with `sex_at_birth`, or `direction_method = "explicit"` with `flow_direction`. No silent default. Missing inputs ⇒ Missing-State (no fake decade).
3. **Copy is time-quality / road metaphor, never fate.** See section 8 of the user goal block for allowed/forbidden phrases; tests enforce both ends.

---

## 2. Requirements traceability

| ID | Type | Statement | Verification |
|---|---|---|---|
| REQ-F-001 | backend (FuFire) | Da-Yun direction, start age, decade sequence, current decade computed. | FuFire unit tests (DY-2). |
| REQ-F-002 | backend (FuFire) | API rejects request without direction basis. | Negative test (DY-1, DY-2). |
| REQ-F-003 | backend (FuFire) | Response carries provenance, ruleset, precision, missing-state. | Schema test (DY-1, DY-2). |
| REQ-F-004 | frontend (Bazodiac) | BaZi page shows current Dekaden-Säule instead of placeholder. | Playwright (DY-4). |
| REQ-F-005 | frontend (Bazodiac) | UI explains Da Yun as time-quality / road, not luck. | Banned-word test + Playwright DOM text (DY-4). |
| REQ-F-006 | frontend (Bazodiac) | User sees connection: four pillars + current decade + Day Master. | DOM test + screenshot (DY-4). |
| REQ-D-001 | data | No Da-Yun values without month pillar + jieqi anchor + direction. | Unit test (DY-1 contract, DY-3 aggregator fallback). |
| REQ-D-002 | data | Local interpretations marked as Leseschluessel. | Text presence test (DY-4). |
| REQ-A-001 | architecture | Existing BaZi pillars unchanged. | Regression: `test/server.test.js`, `test/view_model.test.js`, `test/bazi-page.test.js` pass without modification of pillar shape (DY-3, DY-4). |
| REQ-NF-001 | QA | Every iteration: `/goal`, Playwright (where UI touched), screenshots, code review. | QA report under `docs/qa/`. |

---

## 3. API contract (frozen by DY-1)

### Endpoint
`POST /calculate/bazi/dayun` (preferred over `/calculate/bazi/luck-pillars`).

### Request
```json
{
  "date": "1987-07-04T21:30:00",
  "tz": "Europe/Berlin",
  "lat": 52.52,
  "lon": 13.405,
  "as_of_date": "2026-05-22",
  "boundary": "midnight",
  "standard": "CIVIL",
  "direction_method": "explicit",
  "flow_direction": "forward",
  "sex_at_birth": null,
  "start_age_method": "three_days_one_year",
  "cycles": 8,
  "strict": true
}
```

Validation rules:
- `direction_method ∈ {"year_stem_yinyang_and_sex", "explicit"}`.
- If `explicit` then `flow_direction ∈ {"forward","backward"}` required.
- If `year_stem_yinyang_and_sex` then `sex_at_birth ∈ {"male","female"}` required.
- If neither resolvable → HTTP 422 with `error.code = "direction_basis_missing"` and `precision.direction_basis = null`.
- `cycles` defaults to 8, min 1, max 12.

### Response
Exact shape per user goal block §5 ("API-Kontrakt → Response"). Reproduced here for test pinning:

```json
{
  "dayun": {
    "label": "Da Yun",
    "display_label_de": "Dekaden-Säule",
    "direction": "forward",
    "direction_method": "explicit",
    "start": {
      "anchor_term":   { "name": "Xiao Shu", "direction": "next", "local_dt": "1987-07-07T04:00:00+02:00" },
      "delta":         { "days": 8, "hours": 14, "minutes": 0 },
      "start_age":     { "years": 2, "months": 10, "days": 10, "decimal_years": 2.86 },
      "method": "three_days_one_year"
    },
    "cycles": [
      {
        "sequence": 1,
        "age_start": 2.86,
        "age_end": 12.86,
        "date_start": "1990-05-14",
        "date_end":   "2000-05-14",
        "pillar": {
          "stem": "Jia", "branch": "Chen",
          "stem_cn": "甲", "branch_cn": "辰",
          "element": "wood", "polarity": "yang", "index60": 41
        },
        "relation_to_day_master": {
          "day_master": "Wu",
          "ten_god": "Qi Sha",
          "element_relation": "controls_day_master",
          "label_de": "Druck / Struktur"
        },
        "is_current": false
      }
    ],
    "current": {
      "sequence": 4,
      "age_start": 32.86, "age_end": 42.86,
      "pillar": { },
      "semantic_summary": {
        "road_metaphor": "Diese Dekade beschreibt die Strasse, auf der dein Wu-Erde-Kern gerade wirkt.",
        "supports":  [ ],
        "frictions": [ ],
        "practice":  [ ]
      }
    }
  },
  "provenance": {
    "source": "FuFirE",
    "ruleset_id": "dayun_v1",
    "solar_terms_source": "existing_bazi_jieqi_engine",
    "computed_at": "2026-05-22T22:00:00Z"
  },
  "precision": {
    "birth_time_known": true,
    "direction_basis": "explicit",
    "provisional_fields": []
  },
  "warnings": []
}
```

Missing-state response (direction unresolvable) — HTTP 422:
```json
{
  "error": { "code": "direction_basis_missing", "message_de": "..." },
  "precision": { "birth_time_known": true, "direction_basis": null }
}
```

---

# Iteration DY-1 · Domain contract and tests

> **Sprintziel:** Da-Yun als fachlichen API-Kontrakt definieren und gegen Fehlannahmen absichern.

**Repo:** FuFire (DY-1A) + Bazodiac (DY-1B).

**DoD:**
- JSON schema for `/calculate/bazi/dayun` exists and is shared between repos (or copied verbatim).
- FuFire unit tests for direction forward/backward, missing direction basis, start age "three days = one year".
- Bazodiac contract test exists (skipped/opt-in if FuFire endpoint not yet shipped, runs against `FUFIRE_CONTRACT_TEST=true`).
- No UI placeholder claims to be a "berechneter Wert" anywhere.
- `/goal` block under 4000 chars.
- Playwright not required (no UI change).

## TASK-DY-001 — Define JSON schema for `/calculate/bazi/dayun`

**Files:**
- Create (FuFire repo): `schemas/calculate/bazi/dayun.request.schema.json`
- Create (FuFire repo): `schemas/calculate/bazi/dayun.response.schema.json`
- Create (Bazodiac):   `docs/contracts/dayun.schema.json` — copy of the response schema for test pinning.

**Step 1: Author request schema (FuFire)**
Encode all rules from §3 (oneOf for direction_method, conditional `required` for flow_direction/sex_at_birth, defaults for `cycles`, `boundary`, `standard`, `strict`).

**Step 2: Author response schema (FuFire)**
Encode the exact response shape (see §3). Mark `provenance.ruleset_id` const = `"dayun_v1"`. `cycles[].pillar.index60` integer 0–59. `direction` enum `["forward","backward"]`.

**Step 3: Copy response schema into Bazodiac**
```bash
cp schemas/calculate/bazi/dayun.response.schema.json \
   /path/to/bazodiac/docs/contracts/dayun.schema.json
```

**Step 4: Commit**
FuFire: `feat(schema): dayun request + response contract`.
Bazodiac: `docs(contracts): mirror dayun response schema for contract tests`.

## TASK-DY-002 — Unit tests for direction forward/backward (FuFire)

**Files:**
- Test: `test/dayun/direction.test.<ext>` (use FuFire's test runner; pattern below uses node:test).

**Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDirection } from '../../src/dayun/direction.js';

// Mode A: traditional (year stem yin/yang + sex_at_birth)
test('forward when yang year + male', () => {
  assert.equal(
    resolveDirection({ direction_method: 'year_stem_yinyang_and_sex',
                       year_stem_polarity: 'yang', sex_at_birth: 'male' }),
    'forward'
  );
});
test('backward when yang year + female', () => {
  assert.equal(
    resolveDirection({ direction_method: 'year_stem_yinyang_and_sex',
                       year_stem_polarity: 'yang', sex_at_birth: 'female' }),
    'backward'
  );
});
test('backward when yin year + male', () => {
  assert.equal(
    resolveDirection({ direction_method: 'year_stem_yinyang_and_sex',
                       year_stem_polarity: 'yin', sex_at_birth: 'male' }),
    'backward'
  );
});
test('forward when yin year + female', () => {
  assert.equal(
    resolveDirection({ direction_method: 'year_stem_yinyang_and_sex',
                       year_stem_polarity: 'yin', sex_at_birth: 'female' }),
    'forward'
  );
});

// Mode B: explicit
test('explicit forward passes through', () => {
  assert.equal(
    resolveDirection({ direction_method: 'explicit', flow_direction: 'forward' }),
    'forward'
  );
});
test('explicit backward passes through', () => {
  assert.equal(
    resolveDirection({ direction_method: 'explicit', flow_direction: 'backward' }),
    'backward'
  );
});
```

**Step 2: Run — expect FAIL** (`resolveDirection` not implemented yet).

**Step 3: Stub `resolveDirection` to satisfy these tests only.** No business logic outside what tests assert.

**Step 4: Run — expect PASS.**

**Step 5: Commit** — `test(dayun): direction forward/backward across both modes`.

## TASK-DY-003 — Unit tests for missing direction basis (FuFire)

**File:** `test/dayun/direction-missing.test.<ext>`

**Step 1: Failing tests**

```js
test('throws when explicit without flow_direction', () => {
  assert.throws(
    () => resolveDirection({ direction_method: 'explicit' }),
    /direction_basis_missing/
  );
});
test('throws when traditional without sex_at_birth', () => {
  assert.throws(
    () => resolveDirection({ direction_method: 'year_stem_yinyang_and_sex',
                             year_stem_polarity: 'yang' }),
    /direction_basis_missing/
  );
});
test('throws when traditional without year_stem_polarity', () => {
  assert.throws(
    () => resolveDirection({ direction_method: 'year_stem_yinyang_and_sex',
                             sex_at_birth: 'male' }),
    /direction_basis_missing/
  );
});
test('throws when direction_method missing entirely', () => {
  assert.throws(() => resolveDirection({}), /direction_basis_missing/);
});
```

**Step 2–4:** run-fail → implement → run-pass.

**Step 5: Commit** — `test(dayun): direction_basis_missing on insufficient input`.

## TASK-DY-004 — Unit tests for start age (3-days-= -1-year rule)

**File:** `test/dayun/start-age.test.<ext>`

**Step 1: Failing tests**

```js
import { computeStartAge } from '../../src/dayun/startAge.js';

// 3 Tage = 1 Jahr. 1 Tag = 4 Monate. 2 Stunden = 10 Tage. 12 Minuten = 1 Tag.
// Reference vector (article-derived):
//   delta = 8 days 14 hours 0 minutes  →  2 years, 10 months, 10 days  → 2.86 decimal_years
test('8d14h → ~2.86 decimal_years', () => {
  const out = computeStartAge({ days: 8, hours: 14, minutes: 0 });
  assert.equal(out.years, 2);
  assert.equal(out.months, 10);
  assert.equal(out.days, 10);
  assert.ok(Math.abs(out.decimal_years - 2.86) < 0.01);
});

// 3 days exactly = 1 year
test('3d → exactly 1 year', () => {
  const out = computeStartAge({ days: 3, hours: 0, minutes: 0 });
  assert.equal(out.years, 1);
  assert.equal(out.months, 0);
  assert.equal(out.days, 0);
});

// 2 hours = 10 days. 12 minutes = 1 day.
test('2h12min → 11 days → 1 month 11/30 day fraction', () => {
  const out = computeStartAge({ days: 0, hours: 2, minutes: 12 });
  // 10 days + 1 day = 11 days. 1 day = 4 months / 30 = 0.133 months… leave as days for sanity.
  // Pin only the integer days bucket; rely on decimal_years for precision.
  assert.equal(out.days, 11);
  assert.equal(out.years, 0);
});
```

**Step 2–4:** run-fail → implement (factors: 3d→1y, 1d→4mo, 2h→10d, 12min→1d) → run-pass.

**Step 5: Commit** — `test(dayun): start-age three-days-one-year converter`.

## TASK-DY-001B — Bazodiac contract test (skipped until endpoint live)

**File:** `test/contract.test.js` — extend.

**Step 1: Read** `test/contract.test.js` (lines 1–80) to mirror existing style.

**Step 2: Append a contract test guarded by `FUFIRE_CONTRACT_TEST=true`** that POSTs the example request from §3 against `FUFIRE_BASE_URL/calculate/bazi/dayun` and asserts the response validates against `docs/contracts/dayun.schema.json` (use a tiny JSON-schema validator already in dev deps, or a minimal hand-rolled shape check if none — match style of existing tests).

**Step 3: Run** — `npm run test:contract` (skips without `FUFIRE_CONTRACT_TEST=true`); confirm no regression in default `npm test`.

**Step 4: Commit** — `test(contract): dayun response shape (opt-in)`.

## DY-1 close-out
- Update `docs/qa/2026-05-22-dayun-DY-1-review.md` with what shipped, what is still mocked, screenshot of failing→passing test runs.
- No push until subagent review (reviewer + code-reviewer) returns 0 Critical/Major.

---

# Iteration DY-2 · FuFire endpoint implementation

> **Sprintziel:** FuFirE liefert echte Da-Yun-Zyklen mit Provenienz.

**Repo:** FuFire (separate). **No Bazodiac changes in this iteration.**

**DoD:**
- All DY-1A tests pass.
- New tests for 60-cycle helper, jieqi anchor resolver, current-cycle selector, response provenance/precision pass.
- `npm run test:contract` (Bazodiac side) passes against the live endpoint.
- No new global dependency without review.
- Code review 0 Critical/Major.

## TASK-DY-005 — 60-cycle helper for next/previous pillar

**Files (FuFire):**
- Create: `src/dayun/jiazi.js`
- Test:   `test/dayun/jiazi.test.<ext>`

**Step 1: Failing tests**
```js
import { jiaziNext, jiaziPrev, jiaziAt } from '../../src/dayun/jiazi.js';
// Index 0 = 甲子 (Jia Zi), index 1 = 乙丑 (Yi Chou), … index 59 = 癸亥 (Gui Hai)
test('jiaziAt(0) = Jia Zi', () => {
  assert.deepEqual(jiaziAt(0), { stem: 'Jia', branch: 'Zi', index60: 0 });
});
test('jiaziNext(0) = Yi Chou', () => {
  assert.equal(jiaziNext(0).index60, 1);
});
test('jiaziPrev(0) wraps to Gui Hai', () => {
  assert.equal(jiaziPrev(0).index60, 59);
});
test('jiaziNext(59) wraps to Jia Zi', () => {
  assert.equal(jiaziNext(59).index60, 0);
});
```

**Step 2–4:** fail → implement (10-stem × 12-branch table, modulo wrap) → pass.

**Step 5: Commit** — `feat(dayun): jiazi 60-cycle helper`.

## TASK-DY-006 — Direction resolver wired to schema input

**File:** `src/dayun/direction.js` — already stubbed by DY-1.

**Step 1:** Replace DY-1 stub with full implementation matching DY-002 + DY-003 tests AND validated against the request schema (`oneOf`).

**Step 2: Run** — all `test/dayun/direction*.test.<ext>` PASS.

**Step 3: Commit** — `feat(dayun): direction resolver wired to schema`.

## TASK-DY-007 — Jieqi anchor resolver

**Files:**
- Create: `src/dayun/jieqi.js` — thin adapter over existing FuFire solar-terms engine (`solar_terms_source = "existing_bazi_jieqi_engine"`).
- Test:   `test/dayun/jieqi.test.<ext>` — pick known birth datetimes and assert anchor name + local_dt + delta (use the article's worked example: birth 1987-07-04 21:30 Europe/Berlin → next term Xiao Shu 1987-07-07 04:00 local → delta 8d 14h).

**Step 1–4:** TDD as above.

**Step 5: Commit** — `feat(dayun): jieqi anchor resolver`.

## TASK-DY-008 — Start-age converter

**File:** `src/dayun/startAge.js` — already stubbed in DY-004.

**Step 1:** Promote stub to full implementation; ensure DY-004 tests still pass and add cross-checks for boundary cases (0 delta → start_age 0; delta exceeding 360 days → cap at 120 years with warning).

**Step 2: Commit** — `feat(dayun): start-age converter complete`.

## TASK-DY-009 — Current-cycle selector

**File:** `src/dayun/currentCycle.js` (+ test).

**Step 1: Failing test**
```js
import { selectCurrent } from '../../src/dayun/currentCycle.js';
const cycles = [
  { sequence: 1, age_start: 2.86, age_end: 12.86 },
  { sequence: 2, age_start: 12.86, age_end: 22.86 },
  { sequence: 3, age_start: 22.86, age_end: 32.86 },
  { sequence: 4, age_start: 32.86, age_end: 42.86 },
];
test('returns cycle covering current age', () => {
  // birth 1987-07-04, as_of 2026-05-22 → age 38.88 → cycle 4
  const out = selectCurrent(cycles, { birth: '1987-07-04', as_of: '2026-05-22' });
  assert.equal(out.sequence, 4);
});
test('returns null when as_of is before first cycle start_age', () => {
  const out = selectCurrent(cycles, { birth: '2024-01-01', as_of: '2025-01-01' });
  assert.equal(out, null);
});
```

**Step 2–4:** fail → implement (binary search or linear scan + age computation in decimal years) → pass.

**Step 5: Commit** — `feat(dayun): current-cycle selector`.

## TASK-DY-010 — Endpoint handler + provenance/precision

**Files:**
- Create: `src/routes/calculate/bazi/dayun.<ext>` — wires `direction → jiazi sequence (length=cycles, walked forward/backward from month pillar index60) → jieqi delta → start_age → cycle date windows → relation_to_day_master → current`.
- Create: `src/dayun/relation.js` — element relation between decade stem and Day Master (same/output/wealth/officer/resource) + Ten-Gods labeling.
- Test:   `test/calculate/bazi/dayun.handler.test.<ext>` — end-to-end happy path (article example), schema validation, 422 on missing direction, provenance/ruleset shape.

**Step 1: Failing test** asserting:
- Status 200.
- Response validates against `dayun.response.schema.json`.
- `dayun.cycles.length === 8`.
- `dayun.current.sequence === 4` for the article example.
- `provenance.ruleset_id === "dayun_v1"`.
- `precision.direction_basis === "explicit"`.

**Step 2–4:** fail → implement → pass.

**Step 5: Commit** — `feat(dayun): endpoint /calculate/bazi/dayun`.

## DY-2 close-out
- Deploy FuFire to staging.
- From Bazodiac, run `FUFIRE_CONTRACT_TEST=true npm run test:contract` — must pass.
- Subagent review (reviewer + code-reviewer) on the FuFire diff. Push when clean.

---

# Iteration DY-3 · Bazodiac aggregator integration

> **Sprintziel:** Profilantwort enthält aktuelle Da-Yun-Summary, ohne bestehende BaZi-Daten zu brechen.

**Repo:** Bazodiac.

**DoD:**
- `npm test` green (all existing tests pass — `FUFIRE_ENDPOINTS` order test must still pass; new entry appended, never inserted mid-array).
- New test pins `bazi.dayun` shape on the normalized profile.
- New test pins fallback/missing-state (`bazi.dayun = null` when upstream fails or returns 422).
- MethodPage / `apiProvenance.js` lists `/calculate/bazi/dayun` as server-used by BaziPage.
- Playwright screenshots: BaZi + Method (placeholder still acceptable here; UI replacement is DY-4).
- Code review 0 Critical/Major.

## TASK-DY-011 — Append dayun endpoint to `FUFIRE_ENDPOINTS`

**File:** `server.js` (read `server.js:42-114` first to confirm current order).

**Step 1: Read** `test/server.test.js:20-60` to confirm exactly what the endpoint catalog test asserts (order, count, fields).

**Step 2: Write failing test** in `test/server.test.js` (append a new test, do not modify the existing order assertion):
```js
test('FUFIRE_ENDPOINTS catalog includes dayun as last entry', () => {
  const last = FUFIRE_ENDPOINTS[FUFIRE_ENDPOINTS.length - 1];
  assert.equal(last.path, '/calculate/bazi/dayun');
  assert.equal(last.upstreamPath, 'calculate/bazi/dayun');
  assert.equal(last.method, 'POST');
  assert.equal(last.category, 'calculation');
});
```

**Step 3: Run** — `node --test test/server.test.js` — expect FAIL on new test, PASS on existing order test.

**Step 4: Append entry** to `FUFIRE_ENDPOINTS` array in `server.js` at the bottom (after the existing `experience/daily` entry on line ~112):
```js
{
  method: 'POST',
  path: '/calculate/bazi/dayun',
  upstreamPath: 'calculate/bazi/dayun',
  category: 'calculation',
  description: 'BaZi Da-Yun: 10-Jahres-Zyklen (Dekaden-Säule) mit Richtung, Startalter, aktueller Dekade und Beziehung zum Day Master.',
},
```

**Step 5: Run** — `node --test test/server.test.js` — both PASS.

**Step 6: Commit** — `feat(server): register /calculate/bazi/dayun in endpoint catalog`.

## TASK-DY-012 — Wire dayun into `orchestrateFullProfile` (soft-fail)

**File:** `server.js` (read `server.js:554-622` first).

**Step 1: Write failing test** in `test/server.test.js`:
```js
test('orchestrateFullProfile includes dayun in normalized response when upstream returns ok', async (t) => {
  // existing pattern: spin local stub server and point FUFIRE_BASE_URL at it
  const stub = await startStubServer({
    'calculate/western': WESTERN_FIXTURE,
    'calculate/bazi':    BAZI_FIXTURE,
    'calculate/fusion':  FUSION_FIXTURE,
    'calculate/bazi/dayun': DAYUN_FIXTURE,   // new
  });
  t.after(() => stub.close());
  process.env.FUFIRE_BASE_URL = stub.url;
  const res = await postProfile(LINA_PAYLOAD_WITH_DIRECTION);
  assert.equal(res.status, 200);
  assert.ok(res.body.bazi.dayun, 'normalized profile must carry bazi.dayun');
  assert.equal(res.body.bazi.dayun.current.sequence, DAYUN_FIXTURE.dayun.current.sequence);
});

test('orchestrateFullProfile sets bazi.dayun = null and warns when upstream returns 422', async (t) => {
  const stub = await startStubServer({
    'calculate/western': WESTERN_FIXTURE,
    'calculate/bazi':    BAZI_FIXTURE,
    'calculate/fusion':  FUSION_FIXTURE,
    'calculate/bazi/dayun': { status: 422, body: DAYUN_MISSING_DIRECTION_FIXTURE },
  });
  t.after(() => stub.close());
  process.env.FUFIRE_BASE_URL = stub.url;
  const res = await postProfile(LINA_PAYLOAD_WITHOUT_DIRECTION);
  assert.equal(res.status, 200);
  assert.equal(res.body.bazi.dayun, null);
  assert.equal(res.body._meta.upstream_status.dayun, 422);
});
```
Add `DAYUN_FIXTURE` and `DAYUN_MISSING_DIRECTION_FIXTURE` to the existing test fixtures file (or inline if fixtures are inline).

**Step 2: Run** — both new tests FAIL.

**Step 3: Patch `orchestrateFullProfile`** (after the existing `tst` optional block, around `server.js:587`):
```js
// Optional: Da-Yun (10-year cycles) — absorbs 422 (missing direction) and other errors
let dy = { data: null, ok: false, status: 'n/a' };
try {
  const r = await callFuFire('calculate/bazi/dayun', payload, controller.signal);
  dy = { data: r.ok ? r.data : null, ok: r.ok, status: r.status };
} catch { /* dayun is optional — never fail the profile on it */ }
```
Add `dayun: dy.data` to `rawResult`, add `dayun: dy.status` to `_meta.upstream_status` (mirroring `tst`/`wuxing_info` pattern).

**Step 4: Patch `normalizeAzodiacResult`** (`server.js:369-503`) — surface dayun on the BaZi sub-tree:
```js
// inside normalizeAzodiacResult, after pillars / day_master block:
const dayun = raw?.dayun?.dayun ?? null;  // upstream wraps in { dayun: { ... }, provenance, ... }
```
Then attach in the returned object: `bazi: { pillars, day_master, dayun }`.

**Step 5: Run** — both tests PASS. Run full `npm test` — all green.

**Step 6: Commit** — `feat(server): orchestrate /calculate/bazi/dayun as optional, normalize bazi.dayun`.

## TASK-DY-013 — `payload.js` carries direction inputs

**Files:**
- `server.js` — `translatePayload` (`server.js:144-159`).
- `test/payload.test.js` — extend.

**Step 1: Failing test**
```js
test('translatePayload passes direction_method + flow_direction + sex_at_birth through unchanged', () => {
  const out = translatePayload({
    date: '1987-07-04T21:30:00', tz: 'Europe/Berlin', lat: 52.52, lon: 13.405,
    direction_method: 'explicit', flow_direction: 'forward', sex_at_birth: null,
    as_of_date: '2026-05-22',
  });
  assert.equal(out.direction_method, 'explicit');
  assert.equal(out.flow_direction, 'forward');
  assert.equal(out.sex_at_birth, null);
  assert.equal(out.as_of_date, '2026-05-22');
});
```

**Step 2: Run** — FAIL.

**Step 3: Patch `translatePayload`** — copy `direction_method`, `flow_direction`, `sex_at_birth`, `as_of_date`, `boundary`, `standard`, `start_age_method`, `cycles`, `strict` into the returned object when present. Leave existing field mapping untouched.

**Step 4: Run** — PASS. Run full `npm test` — green.

**Step 5: Commit** — `feat(payload): forward dayun-specific inputs to upstream`.

## TASK-DY-014 — `apiProvenance` consumer map

**Files:**
- `public/src/domain/apiProvenance.js` (read lines 1–60 + the consumer map block — search for `BaziPage`).
- `test/api-provenance.test.js` (if exists; otherwise add to `test/method-page.test.js` style file).

**Step 1: Failing test**
```js
test('BaziPage is registered as consumer of /calculate/bazi/dayun', () => {
  const provenance = buildProvenance(CATALOG, null, CONSUMER_MAP);
  const entry = provenance.find(e => e.endpoint === '/calculate/bazi/dayun');
  assert.ok(entry, 'dayun endpoint must appear in provenance');
  assert.ok(entry.consumers.includes('BaziPage'));
});
```

**Step 2: Run** — FAIL.

**Step 3: Add `/calculate/bazi/dayun` to the consumer map** with `['BaziPage']`.

**Step 4: Run** — PASS.

**Step 5: Commit** — `feat(provenance): register BaziPage as dayun consumer`.

## DY-3 gate
- Spin server: `PORT=4100 npm start` (background).
- Playwright: `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e:desktop -- --grep "bazi|method"`.
- Screenshots (manual or via spec):
  - `docs/qa/screenshots/dayun/DY-3/bazi-current-state.png` (placeholder still visible — expected).
  - `docs/qa/screenshots/dayun/DY-3/method-with-dayun.png` (Method table shows new endpoint as `unused` or `reachable` depending on stub).
- QA report: `docs/qa/2026-05-22-dayun-DY-3-review.md`.
- Three parallel subagents (tester, reviewer, `superpowers:code-reviewer`). Fix Critical/Major. Push.

---

# Iteration DY-4 · BaZi UI + user semantics

> **Sprintziel:** BaZi-Seite zeigt Da Yun als aktuelle Dekaden-Strasse, nicht als Platzhalter.

**Repo:** Bazodiac.

**DoD:**
- Old placeholder section at `public/src/pages/BaziPage.js:220-223` removed.
- New `BaziDayunPanel` component renders current decade (sequence, age window, stem/branch, relation to Day Master, road-metaphor copy, supports/frictions/practice lists).
- Missing-state component renders when `bazi.dayun = null` with copy from §6 of source goal block ("Dekaden-Säule noch nicht berechenbar.").
- Banned-word test: page content must NOT contain `/Glückssäule/` as a primary heading; allowed: `/Da Yun · 10-Jahres-Zyklus/` and `/Dekaden-Säule/`.
- Updated unit + e2e tests reflect new copy.
- Playwright dark+light desktop+mobile pass.
- Screenshots persisted (see gate).
- Code review + PO review 0 Critical/Major.

## TASK-DY-015 — Build `BaziDayunPanel` component

**Files:**
- Create: `public/src/components/BaziDayunPanel.js`
- Test:   `test/bazi-dayun-panel.test.js`

**Step 1: Failing test**
```js
import { BaziDayunPanel } from '../public/src/components/BaziDayunPanel.js';

test('renders current decade headline + age window + stem/branch', () => {
  const el = BaziDayunPanel({
    dayun: {
      display_label_de: 'Dekaden-Säule',
      current: {
        sequence: 4, age_start: 32.86, age_end: 42.86,
        pillar: { stem: 'Jia', branch: 'Chen', stem_cn: '甲', branch_cn: '辰', element: 'wood', polarity: 'yang' },
        semantic_summary: {
          road_metaphor: 'Diese Dekade ...',
          supports: ['…'], frictions: ['…'], practice: ['…'],
        },
      },
      direction: 'forward',
    },
    dayMaster: 'Wu',
  });
  const html = el.outerHTML;
  assert.match(html, /Dekaden-Säule/);
  assert.match(html, /Da Yun · 10-Jahres-Zyklus/);
  assert.match(html, /32\.9.*42\.9|32,9.*42,9/);  // age window, locale-tolerant
  assert.match(html, /Jia/);
  assert.match(html, /Chen|甲|辰/);
  assert.match(html, /Strasse|Zeitqualität|zeitliche Achse/);
  assert.doesNotMatch(html, /Glück/);   // forbidden
});

test('renders missing-state when dayun is null', () => {
  const el = BaziDayunPanel({ dayun: null, dayMaster: 'Wu' });
  const html = el.outerHTML;
  assert.match(html, /noch nicht berechenbar/);
  assert.match(html, /Laufrichtung|flow_direction|sex_at_birth/);
});

test('uses data-section="dayun" + data-bazi-dayun anchor', () => {
  const el = BaziDayunPanel({ dayun: null, dayMaster: 'Wu' });
  assert.equal(el.getAttribute('data-section'), 'dayun');
  assert.equal(el.hasAttribute('data-bazi-dayun'), true);
});
```

**Step 2: Run** — FAIL.

**Step 3: Implement `BaziDayunPanel`** — pure DOM builder, returns `<section>`. Copy verbatim from §6 of the user goal block ("Aktuelle Dekaden-Saeule / Da Yun · 10-Jahres-Zyklus / Die vier Säulen zeigen deinen Geburtsraum. / Diese Dekade zeigt die Strasse, auf der dein Muster gerade unterwegs ist."). Pull supports/frictions/practice from `semantic_summary`. Use `UnavailableCard`-style markup for missing-state.

**Step 4: Run** — PASS.

**Step 5: Commit** — `feat(components): BaziDayunPanel with missing-state`.

## TASK-DY-016 — Mount panel on `BaziPage`, remove placeholder

**Files:**
- `public/src/pages/BaziPage.js` — read lines 1–60 (imports) and 200–230 (target region).
- `test/bazi-page.test.js` — update.

**Step 1: Update unit test** `test/bazi-page.test.js`:
- Remove or rewrite the assertion at line 58 (`assert.match(agg, /Glückssäule/);`) → replace with `assert.match(agg, /Dekaden-Säule/);`.
- Add: `assert.doesNotMatch(agg, /Glückssäule/);` to enforce removal of old label as a primary section title.
- Add: when `profile.bazi.dayun` is null, page must render the missing-state.

**Step 2: Run** — FAIL.

**Step 3: Edit `BaziPage.js`**:
- Import `BaziDayunPanel` at top of file.
- Replace lines 220–223 entirely with: `<section class="bazi-dayun" data-section="dayun"><div class="bazi-dayun-mount"></div></section>` in the template.
- After the pillar loop (around line 302), mount: `app.querySelector('.bazi-dayun-mount').appendChild(BaziDayunPanel({ dayun: profile.bazi.dayun, dayMaster: dm?.stem }));`

**Step 4: Run** `node --test test/bazi-page.test.js` — PASS. Then `npm test` — full suite green.

**Step 5: Commit** — `feat(bazi): replace luck-pillar placeholder with BaziDayunPanel`.

## TASK-DY-017 — Update e2e spec for new section

**File:** `test/e2e/b2-bazi-restructure.spec.js` — read lines 84–91 first.

**Step 1: Rewrite the placeholder test** (current lines 84–91):
```js
test('B2 superseded by DY: Dekaden-Säule renders or shows missing-state', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  const dayun = page.locator('[data-bazi-dayun]');
  await expect(dayun).toBeVisible();
  await expect(dayun).toContainText(/Dekaden-Säule|Da Yun/);
  await expect(dayun).not.toContainText(/Glückssäule/);
});
```
Remove the legacy `[data-bazi-lucky-pillar]` locator entirely from this file.

**Step 2: Add a new spec** `test/e2e/dy-bazi-dayun.spec.js` covering:
- Desktop dark: section visible, headline + age window present, no "Glück" word in section.
- Desktop light: same.
- Mobile: section visible, no horizontal overflow.
- Missing-state: when profile is loaded without `direction_method`, panel shows "noch nicht berechenbar".

**Step 3: Run** `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e:desktop -- --grep "dayun|bazi"` — PASS.

**Step 4: Commit** — `test(e2e): cover Dekaden-Säule replacement and missing-state`.

## TASK-DY-018 — Banned-word regression test

**File:** `test/dayun-copy.test.js` (new) — see CLAUDE.md "Common Errors to Avoid" → banned-UI-string traps must check raw DOM, not just visible text. Mirror that lesson.

**Step 1: Failing test**
```js
import { BaziDayunPanel } from '../public/src/components/BaziDayunPanel.js';

const FORBIDDEN = [
  /Diese Dekade bringt dir Glück/i,
  /entscheidet deine Zukunft/i,
  /du wirst (scheitern|erfolgreich)/i,
];

test('panel copy never claims fate', () => {
  const fixtures = [
    { dayun: null, dayMaster: 'Wu' },
    { dayun: { /* full fixture */ }, dayMaster: 'Wu' },
  ];
  for (const f of fixtures) {
    const html = BaziDayunPanel(f).outerHTML;
    const text = BaziDayunPanel(f).textContent;
    for (const rx of FORBIDDEN) {
      assert.doesNotMatch(html, rx);
      assert.doesNotMatch(text, rx);
    }
  }
});

test('panel copy uses road-metaphor vocabulary', () => {
  const el = BaziDayunPanel({ /* full fixture with semantic_summary.road_metaphor */ }, …);
  assert.match(el.textContent, /Strasse|Zeitqualität|Zeitachse/);
});
```

**Step 2–4:** FAIL → ensure component copy matches → PASS.

**Step 5: Commit** — `test(dayun): banned-fate-copy regression`.

## TASK-DY-019 — CTA links + visual connection to four pillars

**Files:**
- `public/src/pages/BaziPage.js` — add a soft visual hint in the four-pillar block (small icon or footnote) pointing down to the Da-Yun section, with copy: "Diese vier Säulen sind dein Bezugsraum. Die Dekaden-Säule unten zeigt, welche Strasse dein Muster gerade befährt."
- `public/src/components/BaziDayunPanel.js` — add CTAs: `<button class="cta-btn">Alle Zyklen anzeigen</button>` (opens an inline disclosure rendering the full `cycles[]` list) and `<button class="cta-btn cta-btn--ghost">Dekaden verstehen</button>` (anchors to a method/explainer fragment).

**Step 1: Test the disclosure interaction** (Playwright):
```js
test('Alle Zyklen anzeigen reveals 8 decade rows', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  const btn = page.getByRole('button', { name: /Alle Zyklen anzeigen/ });
  await btn.click();
  const rows = page.locator('[data-bazi-dayun] [data-dayun-cycle-row]');
  await expect(rows).toHaveCount(8);
});
```

**Step 2:** Implement the disclosure in `BaziDayunPanel.js` (hidden `<ul>` populated from `dayun.cycles`).

**Step 3:** Run e2e — PASS.

**Step 4: Commit** — `feat(bazi): connection footnote + cycle disclosure CTAs`.

## DY-4 gate
- Spin server: `PORT=4100 npm start`.
- Playwright: `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e:desktop && npm run test:e2e:mobile` (both grep `bazi|method|dayun`).
- Screenshots persisted (see §9 of source goal block):
  - `docs/qa/screenshots/dayun/DY-4/bazi-dayun-dark-desktop.png`
  - `docs/qa/screenshots/dayun/DY-4/bazi-dayun-light-desktop.png`
  - `docs/qa/screenshots/dayun/DY-4/bazi-dayun-mobile.png`
  - `docs/qa/screenshots/dayun/DY-4/bazi-dayun-missing-direction.png`
  - `docs/qa/screenshots/dayun/DY-4/method-provenance-dayun.png`
- Three parallel subagents (single message):
  - **tester** — Playwright integrity, screenshot file+size+mtime verification, silent-skip detection.
  - **reviewer** — line-level diff review.
  - **superpowers:code-reviewer** — acceptance vs §4 REQ table + PO checklist using the screenshots; explicit check that no banned copy appears in the rendered DOM.
- Fix every Critical/Major and re-run from gate. Push only when clean.
- QA report: `docs/qa/2026-05-22-dayun-DY-4-review.md`.

---

# Iteration DY-5 · Fusion semantics preparation

> **Sprintziel:** Da Yun wird als langfristiger Zeitmodulator für Fusion vorbereitet, ohne Tagespuls zu vermischen.

**Repo:** Bazodiac.

**DoD:**
- ViewModel surfaces `time_modulators.dayun` (a thin, read-only projection of `bazi.dayun.current`).
- Fusion copy clearly distinguishes "langfristige Strasse" (Da Yun) from "Tageswetter" (daily pulse).
- **No coherence-formula change without an explicit `docs/formula/` decision doc** — this iteration must not alter any score.
- QA doc captures the integration points for later Liu-Nian extension.
- Playwright + code review 0 Critical/Major.

## TASK-DY-020 — Add `time_modulators.dayun` to ViewModel

**Files:**
- `server.js` — `normalizeAzodiacResult` (line ~369).
- `test/view_model.test.js` — extend.

**Step 1: Failing test**
```js
test('normalizeAzodiacResult exposes time_modulators.dayun from bazi.dayun.current', () => {
  const vm = normalizeAzodiacResult({
    western: {}, bazi: { pillars: {…}, day_master: {…} }, fusion: {},
    dayun: { dayun: { current: { sequence: 4, age_start: 32.86, age_end: 42.86,
                                  pillar: { stem: 'Jia', element: 'wood' },
                                  semantic_summary: { road_metaphor: '…' } } } },
  });
  assert.ok(vm.time_modulators);
  assert.equal(vm.time_modulators.dayun.sequence, 4);
  assert.equal(vm.time_modulators.dayun.element, 'wood');
});

test('time_modulators.dayun is null when bazi.dayun is null', () => {
  const vm = normalizeAzodiacResult({ western: {}, bazi: {}, fusion: {}, dayun: null });
  assert.equal(vm.time_modulators?.dayun ?? null, null);
});
```

**Step 2–4:** FAIL → add `time_modulators` block to the normalized return (purely additive, no field removal) → PASS.

**Step 5: Commit** — `feat(view-model): expose time_modulators.dayun (read-only projection)`.

## TASK-DY-021 — Fusion copy distinguishes Da Yun from daily pulse

**Files:**
- `public/src/pages/FusionPage.js` — append a small "Zeitkontext" footer block that reads from `profile.time_modulators.dayun`. Copy: "Langfristige Strasse: <stem/branch>. Diese Dekade legt eine Zeitqualität über dein Grundmuster — sie ändert nicht, wer du bist." Do NOT touch any score, chart, or coherence visual.
- `public/src/pages/DailyPage.js` — verify (test only) that daily copy says "Tageswetter" / "Tagesimpuls" and never conflates with Da Yun.

**Step 1: Test fusion footer**
```js
test('FusionPage renders time-modulator footer when dayun present', () => {
  const app = freshApp();
  FusionPage(app, { profile: { …, time_modulators: { dayun: { sequence: 4, stem: 'Jia', element: 'wood' } } } });
  const html = aggregate();
  assert.match(html, /Langfristige Strasse/);
  assert.match(html, /Jia/);
  assert.doesNotMatch(html, /Tagespuls|Tageswetter/);
});

test('DailyPage does not say "Strasse" / "Dekaden-Säule"', () => {
  const app = freshApp();
  DailyPage(app, { profile: FULL_FIXTURE });
  const html = aggregate();
  assert.doesNotMatch(html, /Dekaden-Säule|Da Yun/);
});
```

**Step 2–4:** FAIL → implement footer / verify daily copy → PASS.

**Step 5: Commit** — `feat(fusion): time-modulator footer for Da Yun; lock daily copy from conflation`.

## TASK-DY-022 — Score-lock decision doc

**File:** Create `docs/formula/dayun-time-modulator.md`.

Contents: explicitly state that as of this iteration, Da Yun is **surfaced as context only** and does NOT modify `coherence_index`, harmony, or any synastry score. Document the open question (should a future iteration weight long-term cycles into the score?) and the requirement that any such change ships with a separate plan + formula doc + before/after parity tests.

**Step 1:** Write the doc.

**Step 2: Add an assertion test** `test/dayun-score-lock.test.js`:
```js
test('introducing dayun must not change coherence_index for a fixed fixture', () => {
  const without = normalizeAzodiacResult({ ...FIXTURE_NO_DAYUN });
  const with_   = normalizeAzodiacResult({ ...FIXTURE_NO_DAYUN, dayun: DAYUN_FIXTURE });
  assert.equal(with_.fusion.coherence_index, without.fusion.coherence_index);
});
```

**Step 3:** Run — PASS (must pass without any code change; this is a regression lock).

**Step 4: Commit** — `docs(formula): lock dayun as context-only; add coherence parity test`.

## TASK-DY-023 — QA doc for Liu-Nian extension

**File:** `docs/qa/2026-05-22-dayun-followups.md`.

Contents:
- Where Liu-Nian (annual pillars) would slot into the existing aggregator (next to `dayun` as another `time_modulators.liu_nian`).
- The schema delta (mirror dayun, but with `year_start`/`year_end` instead of `age_*`).
- Risks (overload of UI; user confusion between Strasse / Wetter / Tag).
- Recommended next sprint scope (or explicit "park").

## DY-5 gate
- `npm test` green.
- Playwright `--grep "fusion|daily|bazi"` PASS.
- Screenshots: `docs/qa/screenshots/dayun/DY-5/fusion-time-modulator-footer.png`.
- Subagent review (tester + reviewer + code-reviewer). Push when clean.

---

## 4. Validation summary (per iteration)

| Iteration | Required commands |
|---|---|
| DY-1 | (FuFire) `node --test test/dayun/`; (Bazodiac) `npm test`; opt-in `FUFIRE_CONTRACT_TEST=true npm run test:contract` |
| DY-2 | (FuFire) full test suite; (Bazodiac) `FUFIRE_CONTRACT_TEST=true npm run test:contract` against staging |
| DY-3 | `npm test`; `PORT=4100 npm start` background; `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e:desktop -- --grep "bazi\|method"` |
| DY-4 | `npm test`; `npm run test:e2e:desktop && npm run test:e2e:mobile -- --grep "bazi\|method\|dayun"`; all 5 screenshots present |
| DY-5 | `npm test`; `npm run test:e2e:desktop -- --grep "fusion\|daily\|bazi"`; coherence parity test passes |

Screenshot output convention (mirrors `docs/qa/screenshots/overview-signature/`):
```
docs/qa/screenshots/dayun/
  DY-3/
    bazi-current-state.png
    method-with-dayun.png
  DY-4/
    bazi-dayun-dark-desktop.png
    bazi-dayun-light-desktop.png
    bazi-dayun-mobile.png
    bazi-dayun-missing-direction.png
    method-provenance-dayun.png
  DY-5/
    fusion-time-modulator-footer.png
```

---

## 5. Out-of-scope (verbatim from goal block)

- Keine komplette Neuinterpretation aller BaZi-Texte.
- Keine Liu-Nian-Jahresanalyse als Pflichtbestandteil dieses Sprints.
- Keine Shen-Sha-Vollanalyse, wenn keine stabile Tabelle/API vorhanden ist.
- Keine medizinischen oder deterministischen Aussagen.
- Keine DB-Migration, sofern Profilantwort inline erweitert werden kann (this repo has no DB; spec satisfied by extending `normalizeAzodiacResult` only).

---

## 6. Risk register

| Risk | Mitigation |
|---|---|
| FuFire endpoint slips past Bazodiac DY-3. | DY-3 stub server in `test/server.test.js` keeps Bazodiac unblocked; production user sees missing-state until endpoint ships. |
| Test in `test/bazi-page.test.js:58` pins old "Glückssäule" string — refactor breaks it. | DY-4 TASK-DY-016 explicitly rewrites that assertion as the first step (red → green). |
| `FUFIRE_ENDPOINTS` order test (`test/server.test.js:20+`) breaks if dayun inserted mid-array. | TASK-DY-011 appends as last entry only; explicit test pins last position. |
| Banned-fate copy reintroduced during a later refactor. | TASK-DY-018 regression test stays in suite permanently. |
| Da Yun silently changes a score because someone wires `time_modulators.dayun` into a formula later. | TASK-DY-022 coherence parity test catches it; DY-022 doc records the rule. |
| Selector trap: `[data-bazi-dayun]` accidentally matches an SVG `<metadata>` element first (per CLAUDE.md DOM gotcha). | Scope all interaction selectors to the concrete tag: `section[data-bazi-dayun]`. |

---

## 7. Definition of Done (whole plan)

Plan is complete when, on `main`:
1. FuFire `/calculate/bazi/dayun` returns the §3 schema in production.
2. Bazodiac `npm test` green, including: contract, view-model, bazi-page, dayun-copy, dayun-score-lock.
3. Playwright desktop + mobile green for `bazi|method|dayun|fusion`.
4. All five DY-4 screenshots present and reviewed.
5. `docs/qa/2026-05-22-dayun-DY-{1,3,4,5}-review.md` exist with subagent sign-off.
6. `docs/formula/dayun-time-modulator.md` exists and is referenced by the parity test.
7. No banned copy (`/Glückssäule/` as primary heading, fate-claims) in the rendered BaZi DOM.
8. No coherence-index drift from before-DY baseline.
