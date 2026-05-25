# Sprint L — Synastry E2E Audit + State-Machine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the Sprint-J state-machine pattern to `SynastryPage`. Make the implicit click-driven async flow explicit via `STATE_IDLE → LOADING → READY | EMPTY | ERROR` transitions, cover each transition with TDD tests, and verify via browser-smoke against real `/api/azodiac/synastry` that two-person calculation renders cleanly.

**Architecture:** Synastry is **click-driven** (form-on-mount, fetch-on-button-click) — unlike DailyPage which is fetch-on-mount. State-machine wraps the click handler. `setState(next)` writes `data-state` on the `.synastry-page` root. fetch-mock pattern from `test/daily-data-flow.test.js` extended with a synthetic click-dispatch helper.

**Tech Stack:** Node ≥20 ESM, `node --test`, capture-DOM-stub (already supports event listeners + dataset), no new runtime deps.

---

## Phase 0 — Pre-flight (DONE in initial commit)

- Branch `feat/sprint-l-synastry-e2e-audit` created off `main` (commit `d732b29`).
- Agent-state stashed.
- Baseline confirmed 590/0 fail/9 skip.
- **Production-smoke PASS:** `curl -sf https://bafe-production.up.railway.app/health` → HTTP 200 + `status:"healthy"`. Sprint L proceeds; no pivot to A6. Smoke-log committed at `docs/contracts/2026-05-22-sprint-l-phase-0-smoke.md`.

## Phase 1 — Audit findings

### 1.1 Implicit state-machine on main

```text
[component-mount]    SynastryPage(app) called
        │
        ▼
[shell-render]       innerHTML = form template + hidden result panel
        │
        ▼
[ready-to-input]     form visible; calc-btn disabled until Person A complete
        │
        ▼ user clicks calc-btn
[calculation-progress] progress widget appended; btn disabled
        │
        ├── Person B filled  → await calculateSynastry(A, B)
        └── Person B empty   → await calculateProfile(A) (solo mode)
                │
                ▼
        ┌───────┴───────┐
        ▼               ▼
   [success]      [error / catch]
   resultEl shown errorEl text + visible
   renderResult() btn re-enabled
   btn re-enabled
```

### 1.2 Defects this surfaces

| ID | Defect | Why it matters |
|---|---|---|
| D1 | No named states; implicit in click-handler closure | Cannot grep, cannot assert, no `data-state` attribute |
| D2 | "loading" UI is the `.synastry-progress` div appended on click — not a state, just an artifact | Hard to test; progress can leak if exception thrown between `appendChild` and `.stop()` |
| D3 | Empty-state not distinguishable from ready — if API returns `ok:true` but `data` is missing required fields, `renderResult` may crash or render half-cards | No fallback copy for "ok-but-empty" path |
| D4 | Error message is raw upstream text (no user-framing copy) | Inconsistent with Sprint-J ERROR-copy pattern |
| D5 | `calcBtn.disabled = false` repeated 4 times across the handler — re-enable on every exit path | Easy to forget on a new path → button stuck disabled |
| D6 | Solo mode (Person B empty) silently switches API endpoint | User sees "Berechnen" → returns Solo result → no signal that synastry was skipped |

### 1.3 Target state-machine

```text
                    ┌──────────┐
                    │   IDLE   │ — shell rendered, form empty
                    └────┬─────┘
                         │ form filled enough → calc-btn enabled
                         ▼
                    ┌──────────┐
                    │  READY-TO-CALC │ — sub-idle: form valid, click pending
                    └────┬─────┘
                         │ click
                         ▼
                    ┌──────────┐
                    │ LOADING  │ — fetch in flight; progress visible
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │  READY  │      │  EMPTY  │      │  ERROR  │
   └─────────┘      └─────────┘      └─────────┘
   resultEl with    fallback copy:   error-copy +
   hero + deep-     "Profil unvoll-  raw upstream
   dive sections    ständig — bitte   error in
                    Daten prüfen"     parentheses

  Re-click returns to LOADING. No terminal lock.
```

For simplicity, Sprint L collapses `IDLE` and `READY-TO-CALC` into one state (`IDLE`). `data-state="idle"` covers both before-input and ready-to-click — the click-button's disabled-state already gates the transition.

## Phase 2 — Step-0 cleanup

Candidates in `SynastryPage.js` (875 LOC):

1. The four `calcBtn.disabled = false` repeats (lines ~174, 196, 211, 214 region) → consolidate into one `function setBusy(busy)` helper called from each exit path.
2. The four `progress.remove(); pg.stop()` repeats → same helper.
3. Duplicate `errorEl.textContent = ...; errorEl.hidden = false` shape across `!res.ok` (A+B), `!res.ok` (solo), and `.catch` → extract `function showError(message)` helper.

Step-0 commit: `chore(synastry): extract setBusy + showError helpers from click handler`. Pure refactor, no behavior change.

## Phase 3 — RED tests

`test/synastry-data-flow.test.js` covers:

| # | Test | Asserts |
|---|---|---|
| 1 | `STATE_*` exports | `STATE_IDLE`, `STATE_LOADING`, `STATE_READY`, `STATE_EMPTY`, `STATE_ERROR` exist as distinct strings |
| 2 | IDLE on mount | `data-state="idle"` after `SynastryPage(app)` runs synchronously |
| 3 | IDLE → LOADING on click | Filling form-A + form-B, dispatching click → `data-state="loading"` synchronously before microtask |
| 4 | LOADING → READY with full A+B success | fetch-mock returns synastry payload → state becomes `ready`, result panel visible |
| 5 | LOADING → READY solo (A only, B empty) | fetch-mock returns profile-only → state `ready`, hero shows Solo-Mode framing |
| 6 | LOADING → EMPTY on `{ok:true, data:{}}` | both endpoints return empty objects → state `empty`, fallback-copy visible |
| 7 | LOADING → ERROR on `ok:false` | Upstream error → state `error`, user-framing copy + raw error |
| 8 | LOADING → ERROR on fetch throw | fetch throws → state `error` |
| 9 | data-state attribute matches state | post-LOADING, attribute on `.synastry-page` root reflects currentState string |

≥ 8 tests per goal. Tests use a `dispatchClick(selector)` helper that calls `el.click()` or builds a CustomEvent.

## Phase 4 — STATE_* implementation

Edits to `public/src/pages/SynastryPage.js`:

1. Top: export `STATE_IDLE`, `STATE_LOADING`, `STATE_READY`, `STATE_EMPTY`, `STATE_ERROR` constants.
2. Inside `SynastryPage()`: `let currentState = STATE_IDLE; function setState(next) { currentState = next; const root = app.querySelector('.synastry-page'); if (root?.setAttribute) root.setAttribute('data-state', next); }`. Call `setState(STATE_IDLE)` after shell-template applied.
3. Click-handler:
   - On entry: `setState(STATE_LOADING)`.
   - After `await calculateSynastry(...)` resolves with `ok:true` + non-empty: `setState(STATE_READY); renderResult(...)`.
   - After resolve with `ok:false`: `mountError(res.error)` which calls `setState(STATE_ERROR)`.
   - After resolve with `ok:true, data:{}`: `mountEmpty()` → `setState(STATE_EMPTY)`.
   - In `.catch`: same `mountError` path.
4. `hasSynastryContent(data)` predicate: `data?.personA?.western || data?.personA?.bazi` (for solo) OR `data?.personA && data?.personB` (for full).
5. Constants for fallback copy:
   - `EMPTY_COPY = 'Profil ist unvollständig — bitte Datum, Uhrzeit und Ort prüfen und erneut berechnen.'`
   - `ERROR_COPY = 'Berechnung fehlgeschlagen. Deine Eingaben sind nicht verloren — versuche es erneut, sobald du wieder online bist.'`

## Phase 5 — Validation doc + browser-smoke + viewport sweep

### 5.1 docs/contracts/2026-05-22-synastry-state-machine.md

- ASCII state-diagram (from §1.3)
- Transition table: trigger condition + side effects per row
- Fallback-copy catalog with rationale
- Predicate spec: `hasSynastryContent(data)`
- Test surface table mapping 9 tests to assertions
- §6 out-of-scope (no retry-button UI, no telemetry, no auto-recalc-on-change)
- §7 operational notes (`calculateSynastry` envelope wraps fetch failures via api/client `request()`)

### 5.2 Browser-smoke

```bash
browser-harness <<'PY'
import json, time
cdp("Network.clearBrowserCache")
# Person A: Lina
A = {"date":"1987-03-14","time":"07:42","lat":52.37,"lon":9.73,"tz":"Europe/Berlin"}
# Person B: persona2 (Yin Yi-Holz, Tokyo 04.03.1990)
B = {"date":"1990-03-04","time":"20:01","lat":35.69,"lon":139.69,"tz":"Asia/Tokyo"}
js(f"location.hash = '#/synastry'; location.reload();")
time.sleep(2)
# Set form via DOM
js(f"document.querySelector('#date-a').value = '{A['date']}';")
js(f"document.querySelector('#time-a').value = '{A['time']}';")
js(f"document.querySelector('#date-b').value = '{B['date']}';")
js(f"document.querySelector('#time-b').value = '{B['time']}';")
# Geo inputs may need programmatic placeA/placeB injection — record current state and trust manual fill
state = js("document.querySelector('.synastry-page')?.getAttribute('data-state')")
print('Initial state:', state)
print(screenshot())
PY
```

For full ready-state verification: requires GeoInput auto-complete; manual via real `/api/geocode` calls. Document in PR body if browser-smoke READY-state could only be reached via partial-emulation. The unit tests cover the deterministic flow.

### 5.3 Three-viewport sweep

```bash
BU_VIEWPORT=desktop ./scripts/visual-regression.sh /synastry
BU_VIEWPORT=tablet  ./scripts/visual-regression.sh /synastry
BU_VIEWPORT=mobile  ./scripts/visual-regression.sh /synastry
```

→ 3 refreshed synastry.png files. Each must show the form (since IDLE is the default state without click). Stability test must stay green.

## Phase 6 — PR + merge

PR title: `feat(sprint-l): synastry e2e audit + explicit state-machine`. Body lists the 4 transitions, fallback-copy per non-ready state with rationale, and references the phase-0 smoke result.

`/safe-merge` once review passes.

## Commit shape

1. `docs(sprint-l): phase-0 smoke pass + audit plan + state-machine target`
2. `chore(synastry): extract setBusy + showError helpers from click handler`
3. `test: RED tests per /synastry state-transition`
4. `feat(synastry): explicit state-machine with STATE_* constants`
5. `docs(synastry): state-machine.md + fallback-copy catalog`
6. `test(visual): refresh synastry.png baselines across 3 viewports`

Target 6 commits (within 4–8 goal-band).

## Risks + mitigations

- **R1: GeoInput injection requires real `/api/geocode` calls.** Browser-smoke READY-state verification may need a fixture or manual fill. Mitigation: unit tests (Phase 3) cover the deterministic state-transition logic with mocked `calculateSynastry` — they do not depend on geo flow. PR body documents the smoke limitation.
- **R2: Click-driven state-machine adds a synthetic-click helper to tests.** Capture-DOM stub supports `addEventListener` (verified in DailyCheckin tests). Mitigation: small `dispatchClick(selector)` helper, ~10 lines.
- **R3: `data-state` attribute on `.synastry-page` could collide with future CSS that doesn't expect it.** Mitigation: search main.css for any existing `[data-state]` selectors before commit; none expected since only DailyPage uses the pattern today.
- **R4: 875-LOC SynastryPage hides additional defects beyond D1–D6.** Mitigation: Step-0 is scoped to the click-handler region (extract helpers, no behavior change). Deeper refactor stays out-of-scope per goal.
