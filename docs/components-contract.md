# Frontend Component Contracts

Vanilla-ESM contracts for shared UI primitives. Pages must follow these patterns or animations, cleanup, and navigation will silently break.

---

## RollingText — Animated Hero Heading

**Module:** `public/src/components/RollingText.js`

### `RollingText({ text, tagName, className })`
Returns an element with `startRolling()` and `stopRolling()` methods. Tick loop self-cancels when element is detached from the DOM (I6 — `isConnected === false` guard in `tick()`).

### `wireHeroRolling(root, fallbackText?)`
Helper for the page-hero pattern. Reads a marker element, replaces it with a RollingText, returns a cleanup callback. Idempotent — returns `null` when no marker is present.

**Contract — every subpage that wants an animated hero MUST:**

1. **Emit a `[data-page-title]` marker** in its `innerHTML` template:
   ```html
   <header class="page-head" data-section="hero">
     <p class="page-eyebrow">Lane · Eyebrow</p>
     <h1 class="page-title bz-h1" data-page-title>Hero text</h1>
   </header>
   ```
   - `data-page-title` is the wire-marker — `wireHeroRolling` finds it by this attribute
   - `bz-h1` applies the design-token typography
   - The element's `textContent` becomes the rolling hero text (`wireHeroRolling` extracts it)
   - The element's `class` is preserved on the replacement

2. **Call `wireHeroRolling(app)` after `app.innerHTML = …`** and capture the cleanup:
   ```js
   import { wireHeroRolling } from '../components/RollingText.js';

   export function MyPage(app, { onNavigate } = {}) {
     app.innerHTML = `…<h1 class="bz-h1" data-page-title>Mein Titel</h1>…`;
     const heroCleanup = wireHeroRolling(app);
     // … rest of page setup …
     return heroCleanup;
   }
   ```

3. **Return the cleanup** from the page-mount function. The hash-router stores it as `currentCleanup` and invokes it on the next navigation, cancelling the RAF loop deterministically (not just relying on the `isConnected` self-cancel fallback).

### What happens when contract is violated

| Mistake | Symptom |
|---|---|
| No `[data-page-title]` marker | `wireHeroRolling` returns `null`; no hero animation; no crash |
| Marker present but `wireHeroRolling()` not called | Static heading shows; no animation |
| Page doesn't return cleanup | `isConnected` guard catches the leak on next RAF tick (degraded but safe) |
| Page returns non-function | Router type-guards and ignores |

---

## Router cleanup chain

**Module:** `public/src/router.js` + `public/src/app.js`

### How cleanup propagates

```
hashchange → router.start() handler →
  1. invoke previous page's currentCleanup (if function)
  2. clear app.innerHTML
  3. call mount(app) for new route
  4. store mount's return value as currentCleanup (if function)
```

### What pages must return

- **Cleanup function** — invoked synchronously before next page mounts. Use for: stopping RAF loops, removing window listeners, aborting in-flight fetches.
- **`null` / `undefined`** — fine; router stores `null`.
- **Promise** (async pages like `MethodPage`) — router type-guards and ignores. Cleanup-on-unmount falls back to the RollingText `isConnected` guard.

### `mountWithProfile` wrapper

When using the profile-gated wrapper in `app.js`, the inner page's return value bubbles up:

```js
.register('/houses', (app) => mountWithProfile(HousesPage, app, 'deine 12 Häuser'))
```

`mountWithProfile` returns `pageFn(...)`'s return value (capped to function or null). The arrow function then implicitly returns that, and router stores it. **This is the chain that must not be broken** — any page using `mountWithProfile` automatically participates if it `return`s its cleanup.

---

## SecondaryNav — Grouped Tabs

**Module:** `public/src/components/SecondaryNav.js` + `public/src/data/routes.js`

### `ROUTES` manifest

Each route entry:
```js
{ path, label, lane, needsProfile, group? }
```

- `group: 'cards'` (optional) — routes sharing a group are collapsed into a single `<details>` dropdown
- `ROUTE_GROUPS[groupKey]` defines the dropdown's label + lane (e.g., `cards: { label: 'Karten', lane: 'fusion' }`)

### Active-state propagation

When the current route is grouped, the dropdown's `<summary>` gets `data-active="true"` in addition to the nested button. CSS targets both selectors for the lane-color highlight.

### Adding a new group

1. Add `group: 'mygroup'` to relevant ROUTES entries
2. Add `mygroup: { label: 'Label', lane: 'fusion' }` to ROUTE_GROUPS
3. CSS in `main.css` (`.secondary-nav__group[open]` rules) is group-agnostic — works automatically

---

## Why these contracts exist

- **`data-page-title`**: decouples the wire-up from page-specific class names. Pages can use `page-title` / `insight-hero__title` / `daily-title` freely; the marker is the stable contract.
- **Cleanup return**: prevents RAF leaks when users navigate between 5+ pages per session. `isConnected` is the safety net; explicit cleanup is the optimization.
- **`group` field**: keeps `ROUTES` as the single source of truth — no parallel "nav config" file to drift from the routing table.
