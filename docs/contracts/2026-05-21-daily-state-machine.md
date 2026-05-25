# Daily Data-Flow State-Machine

**Scope:** `public/src/pages/DailyPage.js` — the runtime contract for what `/daily` renders in each phase of its load.

**Origin:** Sprint J audit. Closes N3 from `docs/contracts/2026-05-20-external-gap-validation.md` §4 (the "spot-check empty step-1/2/3 cards under stub fetch" finding).

**Single source of state-truth:** `data-state` attribute on the `.daily-page` root. Tests + CSS read from there.

## §1 ASCII state diagram

```text
                  ┌──────────────────┐
                  │     STATE_IDLE   │   (transient: pre-shell-template)
                  └────────┬─────────┘
                           │ setState(STATE_LOADING) after innerHTML applied
                           ▼
                  ┌──────────────────┐
                  │  STATE_LOADING   │   loading-div visible
                  └────────┬─────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ READY    │      │  EMPTY   │      │  ERROR   │
  └──────────┘      └──────────┘      └──────────┘
  Hero, ScoreBand,  EMPTY_COPY        ERROR_COPY +
  TodayNew,         note; checkin     fallback focus +
  Western/BaZi/     + threedoors      experiment + checkin +
  Fusion cards,     still mounted     threedoors still mounted
  Spannung,
  Handlung,
  Experiment,
  Checkin,
  Tomorrow

  (Terminal states. Re-mount required to retry.)
```

## §2 Transition table

| From | To | Trigger | Side-effects |
|---|---|---|---|
| IDLE | LOADING | `setState(STATE_LOADING)` after `app.innerHTML = template` | data-state="loading"; loading-div visible |
| LOADING | ERROR | birth-input absent in sessionStorage | data-state="error"; errorEl shows "Kein Geburts-Datensatz gefunden" + link to `/`; early return |
| LOADING | ERROR | `getDailyExperience(birthInput)` returns `{ ok: false, error }` | data-state="error"; loading hidden; mountFallbackWithError(error); fallback-focus + experiment + checkin + threedoors mounted |
| LOADING | EMPTY | `getDailyExperience` returns `{ ok: true, data }` and `hasDailyContent(data) === false` | data-state="empty"; loading hidden; EMPTY_COPY note appended to content-div; checkin + threedoors mounted |
| LOADING | READY | `getDailyExperience` returns `{ ok: true, data }` and `data` has at least one of `{ western, eastern, fusion }` | data-state="ready"; full hero + cards mount path runs; transit-promise auxiliary mounts (TodayNew, vm-cards, Spannung, Handlung, Tomorrow) attach as transits resolve |

## §3 hasDailyContent predicate

```js
function hasDailyContent(data) {
  if (!data || typeof data !== 'object') return false;
  return !!(data.western || data.eastern || data.fusion);
}
```

Single-line decision rule. Used by Sprint J to distinguish EMPTY from READY without surveying every sub-key. Extending the predicate is allowed only when a new section becomes a load-bearing render input (e.g. if future bootstrap_profile starts to drive the hero alone).

## §4 Fallback copy catalog

| State | Constant | Copy (DE) | Rationale |
|---|---|---|---|
| EMPTY | `EMPTY_COPY` | `"Tagespuls heute noch nicht verfügbar. Versuch es in einigen Minuten erneut."` | Acknowledges the loop didn't fail — the data just isn't computed yet. Sets expectation of retry-in-minutes, not error. |
| ERROR | `ERROR_COPY` | `"Wir konnten den Tagespuls nicht laden. Deine Eingaben sind nicht verloren — versuche es erneut, sobald du wieder online bist."` | Names the failure honestly; preserves trust by stating sessionStorage retention; gives one actionable next step (retry when online). |
| ERROR + upstream message | `${ERROR_COPY} (${message})` | (above) + parenthetical raw upstream error | Lets power-users + support see the real cause without burying the framing. |
| Birth-input absent | (hardcoded, not a constant) | `"Kein Geburts-Datensatz gefunden. Bitte zuerst ein Profil berechnen."` | Pre-Sprint-J copy retained — it's a different category (user flow error, not server failure). |

Why not animate / skeleton / shimmer the EMPTY state? Out-of-scope per Sprint J goal. EMPTY is a contract message, not a loading optimization.

## §5 Test surface

`test/daily-data-flow.test.js` covers:

| # | Test | What it pins |
|---|---|---|
| 1 | STATE_* exported as 5 distinct strings | API stability — tests + CSS can import the literals |
| 2 | IDLE → LOADING sync after mount | Initial state is set BEFORE the fetch microtask runs |
| 3 | LOADING → READY on content-bearing fetch | hasDailyContent positive path |
| 4 | LOADING → EMPTY on `{}` fetch payload | hasDailyContent negative path |
| 5 | LOADING → ERROR on `ok:false` | Envelope-level error detection |
| 6 | LOADING → ERROR on fetch-throw | request() wrapper catches throws, returns `ok:false` |
| 7 | EMPTY-state fallback copy in DOM | EMPTY_COPY visible to users, not just internal state |
| 8 | ERROR-state fallback copy in DOM | ERROR_COPY visible to users |
| 9 | data-state attribute matches currentState | The single state-truth contract — no parallel hidden flags |

## §6 Out of scope (deferred from Sprint J)

- Animations / skeleton-shimmer during LOADING.
- Retry-button UI in EMPTY / ERROR. (Page re-mount via hash-navigation already works as retry.)
- localStorage-cache fallback (use previous-day's data when API empty).
- Distinct state for "partial-content" (e.g. daily.fusion missing but western+eastern present).
- Telemetry / analytics on state-transition counts.

## §7 Operational notes

- `request()` in `public/src/api/client.js` catches every fetch failure and returns `{ ok: false, error: e.message }`. The `.catch` on the `getDailyExperience(...)` promise chain is therefore dead-code for fetch failures and only fires if a mount-helper inside the `.then` body throws — those throws are surfaced via `mountFallbackWithError("Fehler: ...")` for diagnostic visibility.
- Auxiliary transit fetches (`getTransitNow`, `getTransitTimeline`) run in parallel and decorate the READY path. Their failure does NOT downgrade to ERROR — the page still reaches READY on daily-experience content alone, with transit-derived cards (`TodayNew`, `Spannung`, `Tomorrow`) absent. This is intentional progressive enhancement.
- Sprint J does NOT change the upstream API surface. Server contract unchanged.

---

*Sprint J — 2026-05-21. Pinned by `test/daily-data-flow.test.js` (9 tests).*
