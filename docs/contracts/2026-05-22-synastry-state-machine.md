# Synastry Data-Flow State-Machine

**Scope:** `public/src/pages/SynastryPage.js` — the runtime contract for what `/synastry` renders at each phase of its click-driven calculation flow.

**Origin:** Sprint L audit (`docs/plans/2026-05-22-sprint-l-synastry-e2e-audit.md`). Applies the Sprint-J state-machine pattern to a click-driven instead of fetch-on-mount page.

**Single source of state-truth:** `data-state` attribute on the `.synastry-page` root.

## §1 ASCII state diagram

```text
                  ┌──────────────────┐
                  │     STATE_IDLE   │   form rendered; calc-btn disabled
                  └────────┬─────────┘
                           │ user fills form + clicks calc-btn
                           ▼
                  ┌──────────────────┐
                  │  STATE_LOADING   │   progress widget visible; fetch in flight
                  └────────┬─────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ READY    │      │  EMPTY   │      │  ERROR   │
  └──────────┘      └──────────┘      └──────────┘
  resultEl with     EMPTY_COPY        ERROR_COPY +
  hero + deep-      via .synastry-    raw upstream
  dive sections     error             error in parens

  Re-click returns to LOADING. No terminal lock.
```

## §2 Transition table

| From | To | Trigger | Side-effects |
|---|---|---|---|
| (none) | IDLE | `SynastryPage(app)` mount after innerHTML applied | data-state="idle"; form visible; calc-btn disabled until form-A valid |
| IDLE | LOADING | `runSynastryCalculation(app, {inputA, inputB})` invocation (from click or test) | data-state="loading"; click handler appends `.synastry-progress` widget |
| LOADING | ERROR | `calculateSynastry` / `calculateProfile` returns `{ok:false}` OR fetch throws | data-state="error"; `mountFallback(app, ERROR_COPY + " (" + raw + ")")`; click handler runs finishLoading() |
| LOADING | EMPTY | `{ok:true, data}` but `hasSynastryContent(data, expectPersonB) === false` | data-state="empty"; `mountFallback(app, EMPTY_COPY)`; click handler runs finishLoading() |
| LOADING | READY | `{ok:true, data}` with content per `hasSynastryContent` | data-state="ready"; click handler runs finishLoading() + renderResult(profileA, profileB, synastrySummary) |

## §3 hasSynastryContent predicate

```js
function hasSynastryContent(data, expectPersonB) {
  if (!data || typeof data !== 'object') return false;
  if (expectPersonB) {
    const a = data.personA, b = data.personB;
    const aHas = !!(a && (a.western || a.bazi || a.fusion));
    const bHas = !!(b && (b.western || b.bazi || b.fusion));
    return aHas && bHas;
  }
  return !!(data.western || data.bazi || data.fusion);
}
```

Asymmetric by design: A+B mode requires both personA and personB to carry payload, since the synastry view is meaningless without both. Solo mode (Person-B empty) collapses to profile-completeness check on the single envelope.

## §4 Fallback-copy catalog

| State | Constant | Copy (DE) | Rationale |
|---|---|---|---|
| EMPTY | `EMPTY_COPY` | `"Profil ist unvollständig — bitte Datum, Uhrzeit und Ort prüfen und erneut berechnen."` | Names the most likely user-cause (form fields missing place lookup or invalid time). Action-oriented: prüfen und erneut berechnen, not "etwas ist schiefgelaufen". |
| ERROR | `ERROR_COPY` | `"Berechnung fehlgeschlagen. Deine Eingaben sind nicht verloren — versuche es erneut, sobald du wieder online bist."` | Acknowledges failure honestly; preserves trust by stating sessionStorage retention; gives one actionable next step. Mirrors DailyPage ERROR pattern from Sprint J. |
| ERROR + upstream | `${ERROR_COPY} (${rawError})` | (above) + parenthetical raw upstream error or HTTP status | Power users + support see real cause without burying the user-framing. |

Mounting target for both EMPTY + ERROR copy is the existing `.synastry-error` div in the SynastryPage template (line 79). No new mount points added.

## §5 Test surface

`test/synastry-data-flow.test.js` covers 9 assertions:

| # | Test | What it pins |
|---|---|---|
| 1 | STATE_* exported as 5 distinct strings | API stability |
| 2 | IDLE on mount | Initial state set before any user interaction |
| 3 | LOADING → READY full A+B | hasSynastryContent positive (both branches) |
| 4 | LOADING → READY solo | calculateProfile path, hasSynastryContent solo branch |
| 5 | LOADING → EMPTY on `{}` payload | hasSynastryContent negative (asymmetric in A+B mode) |
| 6 | LOADING → ERROR on ok:false | Envelope-level error detection |
| 7 | LOADING → ERROR on fetch throw | request() wrapper catches throw → returns ok:false |
| 8 | EMPTY fallback copy in DOM | EMPTY_COPY surfaced to user, not just internal state |
| 9 | data-state attribute matches state | Single state-truth — no parallel hidden flag |

## §6 Out of scope (deferred from Sprint L)

- Auto-recalculation on form change. Current model: explicit click required.
- Retry-button UI in EMPTY/ERROR states (re-clicking calc-btn already retries).
- localStorage cache for last successful synastry result.
- Telemetry on state-transition counts.
- Distinct state for partial-content (e.g. synastry-summary missing but personA+B present). Currently READY accepts payload where the optional `data.synastry` is null.
- Animation/skeleton during LOADING beyond the existing `.synastry-progress` widget.

## §7 Operational notes

- `runSynastryCalculation` is the deterministic surface. Tests call it directly with synthetic inputA/inputB to avoid the GeoInput async place-pick flow. Click handler also calls it, but additionally owns: `.synastry-progress` widget lifecycle (append on click, remove via `finishLoading()` after any terminal state), `renderResult` invocation on READY, and `savePersonB` for next-visit pre-fill.
- `request()` wrapper in `public/src/api/client.js` catches fetch failures and returns `{ok:false, error:e.message}` envelopes. The runSynastryCalculation `catch` block fires only if a non-fetch error bubbles (assignment errors, hasSynastryContent throwing on hostile data, etc.).
- Sprint J established the pattern; Sprint L applies it to a click-driven page. The next state-machine sprint should be able to import `setStateOn` + `mountFallback` from a shared module if a 3rd page needs them — currently both helpers are local to SynastryPage.
- Phase-0 production-smoke (2026-05-22) confirmed upstream `bafe-production.up.railway.app/health` is HTTP 200 + healthy. Browser-smoke against this upstream produces meaningful READY-state results.

---

*Sprint L — 2026-05-22. Pinned by `test/synastry-data-flow.test.js` (9 tests).*
