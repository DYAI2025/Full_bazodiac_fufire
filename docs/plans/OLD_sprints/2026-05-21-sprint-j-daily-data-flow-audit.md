# Sprint J — Daily Data-Flow Audit + State-Machine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/daily`'s implicit state-machine explicit (`idle → loading → ready | empty | error`), prove each transition with a TDD test, and verify via browser-smoke against the real `/api/azodiac/daily` that Lina sees a populated Tagespuls — not header+empty-cards.

**Architecture:** No new abstractions. Convert DailyPage.js's existing two-async-chain choreography (`transitsPromise` + `getDailyExperience()`) into a named state-machine via a single `STATE_*` enum + a `transition(nextState)` function that gates render. dailyCompanion.js stays pure. Tests use existing fetch-mock pattern from page-render-integration.test.js, extended to cover each transition.

**Tech Stack:** Node ≥20 ESM, vanilla-DOM, existing capture-DOM-stub, no new runtime deps.

---

## Phase 0 — Pre-flight (this commit)

- ✓ Branch `feat/sprint-j-daily-data-flow-audit` created off main `906ce54`.
- ✓ Agent-state stashed (`agent-state-pre-sprint-j`).
- ✓ Test baseline confirmed earlier this session: 571 pass / 0 fail.
- ✓ DailyPage.js (472 LOC) + dailyCompanion.js (212 LOC) read in full.
- This plan-doc serves as the Phase-0 commit artifact.

## Phase 1 — Audit findings (current implicit state-machine)

### 1.1 Discovered transitions on `main`

```text
[component-mount] → DailyPage(app, { profile }) called
        │
        ▼
[shell-render]   innerHTML = template; loading-div shown; content-div hidden; error-div hidden
        │
        ▼
[birth-input-gate] sessionStorage 'azodiac_birth_input' read
        ├── missing → "no-profile-error": loading hidden, error shown, return early
        └── present
              │
              ▼
        [parallel-fetch]
        ├── transitsPromise = Promise.allSettled([getTransitNow(), getTransitTimeline()])
        └── getDailyExperience(birthInput) — kicked off after parallel-fetch
              │
              ▼
        [transit-arrived] dailyVM built; Hero, ScoreBand, TodayNew, Learn-Impuls, vm-cards, Spannung, Handlung, Tomorrow mounted; today persisted
              │
              ▼
        [daily-experience-resolved]
        ├── !res.ok → "fallback": loading hidden, focus+experiment+checkin+threedoors mounted, errorEl shown
        └── res.ok  → "ready":    loading hidden, API drawer + meta, experiment+checkin+threedoors mounted, content shown
              ▲
              │
        [daily-experience-rejected]  same shape as !res.ok branch above
```

### 1.2 Defects this surfaces

| ID | Defect | Why it matters |
|---|---|---|
| D1 | No labeled states; transitions implicit in async-callback nesting | Cannot grep, cannot assert, cannot debug; reviewer of any future change has to reconstruct flow from `.then` chains |
| D2 | `transitsPromise` and `getDailyExperience` are independent | Partial-state UI: transits resolve, daily-experience rejects → user sees half-rendered hero + error message simultaneously |
| D3 | "empty" state not distinct from "ready" | Empty transits = empty Hero statement, no fallback copy. Spot-check on stub-fetch surfaced exactly this — Lina saw step-headers with no body |
| D4 | Error UI bleeds across states | After `loading.hidden = true; errorEl.hidden = false`, the function keeps running and mounts cards on top of error-message |
| D5 | `mountHeroFromVM(null)` removes `.insight-hero-mount` silently | No fallback copy for "transits-fetched-but-empty" case |
| D6 | `loading` div doesn't carry state | Manually toggled via `loading.hidden = true/false` from three different call sites |
| D7 | No assertion that state-transitions happen exactly once | Re-mount or re-fetch could trigger duplicate cards |

### 1.3 Target state-machine

```text
                    ┌──────────┐
                    │   IDLE   │ — DailyPage() entered, no DOM yet
                    └────┬─────┘
                         │ shell template applied
                         ▼
                    ┌──────────┐
                    │ LOADING  │ — fetches in flight, loading-div visible
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │  READY  │      │  EMPTY  │      │  ERROR  │
   └─────────┘      └─────────┘      └─────────┘
   data complete   data shape OK    fetch failed
                   but empty        or schema-invalid

Transitions:
  IDLE → LOADING        always after shell-render
  LOADING → READY       Promise.all([daily, transits]) resolve + both have content
  LOADING → EMPTY       Promise.all resolve + (daily.steps empty OR transits.today empty)
  LOADING → ERROR       any fetch rejects, or res.ok = false, or unexpected schema
  no transitions out of READY/EMPTY/ERROR (page re-mounted to retry)
```

Each non-`READY` state gets explicit fallback copy (see Phase 5 doc).

## Phase 2 — Step-0 cleanup commit

DailyPage.js has these cleanup candidates spotted during audit:

1. Line 159-161: `.daily-loading`, `.daily-content`, `.daily-error` divs are bottom-of-template — visually orphaned from step-1/2/3 sections.
2. Line 423-432: `!res.ok` branch and `.catch` branch (line 463-471) are near-identical fallback paths — duplicate code.
3. Line 199 comment: "Hero/ViewModel mount happens AFTER transit data arrives" — now load-bearing; promote to JSDoc on `mountHeroFromVM`.
4. Line 437-442: comment block "Iteration 1A: VM-Cards…" describes Sprint-A choice; either keep concise or move to architecture note in dailyCompanion.js.

Scope of Step-0 commit: **remove the duplicate fallback branch** (D4 prerequisite) into a single named helper. No behavior change. Separate commit.

## Phase 3 — RED tests per transition

`test/daily-data-flow.test.js`:

| # | Test | Asserts |
|---|---|---|
| 1 | `STATE_*` constants exported from DailyPage | named exports `STATE_IDLE`, `STATE_LOADING`, `STATE_READY`, `STATE_EMPTY`, `STATE_ERROR` exist and are strings |
| 2 | `idle → loading` on mount | After mount with profile + valid birthInput, page exposes current state == LOADING; loading-div is visible |
| 3 | `loading → ready` when both fetches resolve with content | fetch-mock returns non-empty daily + non-empty transits → state becomes READY; content-div visible; error-div hidden |
| 4 | `loading → empty` when fetches resolve with empty payloads | fetch-mock returns `{ ok:true, data:{} }` for both → state becomes EMPTY; specific fallback copy visible in DOM |
| 5 | `loading → error` when daily-experience rejects | fetch-mock throws → state becomes ERROR; error-fallback copy visible; no half-rendered hero |
| 6 | `loading → error` when daily-experience returns `ok:false` | fetch-mock returns `{ ok:false, error:'foo' }` → state becomes ERROR; same fallback shape |
| 7 | Each non-ready state has fallback copy | EMPTY emits "Tagespuls noch nicht verfügbar" or equivalent; ERROR emits "Wir konnten den Tagespuls nicht laden" or equivalent |
| 8 | State transition is single-fire | Re-mount same app does not duplicate cards (test mount, capture child count, mount again, count must equal not double) |

≥ 8 tests, ≥ 1 per transition. All start RED (state constants don't exist yet on main).

## Phase 4 — Implement state-machine

`public/src/pages/DailyPage.js` changes:

1. Top of file: export `STATE_IDLE`, `STATE_LOADING`, `STATE_READY`, `STATE_EMPTY`, `STATE_ERROR` as string constants.
2. Inside `DailyPage()`: introduce local `let currentState = STATE_IDLE` and `function transition(next) { currentState = next; renderForState(); }`.
3. `renderForState()` reads current state and toggles loading/content/error visibility + invokes the appropriate mount-set for READY (current flow), EMPTY (fallback-copy mounts), or ERROR (error-card mount).
4. Replace the two async chains with one: `Promise.allSettled([dailyPromise, transitsPromise]).then(decideState)` where `decideState` is pure-and-named.
5. Each transition: one named function (`enterLoading`, `enterReady`, `enterEmpty`, `enterError`). Each ≤ 50 LOC.
6. Existing per-step mount helpers (`mountTodayNew`, `mountSpannung`, etc.) keep their current contract — just called from `enterReady`.

## Phase 5 — Validation doc + smoke + baseline refresh

`docs/contracts/2026-05-21-daily-state-machine.md` content:

- ASCII state diagram (above).
- One row per state describing: trigger conditions, DOM mounted, copy shown, exit conditions.
- Fallback-copy catalog:
  - EMPTY: `"Tagespuls heute noch nicht verfügbar. Wir bauen ihn aus deiner Signatur. Versuch es in einigen Minuten erneut."`
  - ERROR: `"Wir konnten den Tagespuls nicht laden. Deine Eingaben sind nicht verloren — klick auf Aktualisieren, sobald das Netz wieder steht."`
- Browser-smoke checklist: server up on :3000, profile.real.json injected, `/daily` shows step-1/2/3 with content, screenshot saved to `test/_fixtures/visual-baseline/daily.png` and size > 130 KB.

## Phase 6 — PR + merge

PR title: `feat(sprint-j): daily data-flow audit + explicit state-machine`. Body lists the 4 transitions, the fallback-copy chosen per non-ready state with one-line rationale each, and references this plan-doc + the contracts doc. Merge via `/safe-merge` once tests green.

## Commit shape

1. `docs(sprint-j): audit plan + state-machine target` — this plan-doc
2. `chore(daily): step-0 cleanup — extract fallback branch into named helper` — Phase 2
3. `test: RED tests per /daily state-transition` — Phase 3
4. `feat(daily): explicit state-machine with STATE_* constants` — Phase 4
5. `docs(daily): state-machine.md + fallback-copy catalog` — Phase 5
6. `test(visual): refresh daily.png baseline (non-empty content)` — Phase 5
7. optional `fix(...)` per any review finding

Target: 4–7 commits. Goal allows 4–8.
