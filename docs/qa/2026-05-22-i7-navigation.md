# I7: Navigation & Redundanzen — QA Report

**Date:** 2026-05-22  
**Iteration:** I7  
**Status:** PASS

---

## Iterationsziel

Navigation und Redundanzen reduzieren. SecondaryNav-Überladung abbauen, Tab-Hierarchie explizit machen, Router-Cleanup-Chain (Carry-over aus I6) schließen, Komponenten-Verträge dokumentieren.

---

## Sichtbarer Nutzer-Unterschied

- SecondaryNav: **10 → 6 top-level Tabs** (5 Chart-Lanes unter „Karten▾" Dropdown)
- Routing: deterministisches Cleanup beim Page-Wechsel (kein RAF-Leak mehr)
- Aktiver Route-State propagiert auf Dropdown-Summary (Lane-Color)

---

## Testcommands

```bash
npm test
# → 728/0/12 pass/fail/skip

node --test test/secondary-nav.test.js test/secondary-nav-grouped.test.js test/router-cleanup-chain.test.js
# → 13/13 pass (5 + 6 + 2)

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test --config=playwright.config.mjs
# → 51/51 pass (12 navigation + 39 existing)
```

---

## Browser / Viewport

- Chromium (Playwright default, 1280×720)
- Server: PORT=4100 node server.js

---

## Screenshots

| Test | Screenshot |
|---|---|
| SecondaryNav baseline (6 top-level entries) | docs/qa/screenshots/i7-navigation/nav-baseline.png |
| Karten-Dropdown geöffnet (5 nested) | docs/qa/screenshots/i7-navigation/karten-open.png |

---

## User-Entscheidungen (Cuts aus IA-Audit)

| Cut | Entscheidung | Status |
|---|---|---|
| A — Karten-Dropdown | Implementieren | **DONE** |
| B/C — /transit-calendar + /dashboard löschen | Beide behalten | übersprungen |
| D — Hidden Deep-Dive-Cluster | „In Overview integrieren" | **DEFERRED** (Scope ≥10 Files, eigenes Sprint-Päckchen) |
| E — Self-Links entfernen | Entfernen | **N/A** (Re-Audit ergab 0 Self-Links) |

Audit-Doc: `docs/qa/2026-05-22-i7-ia-audit.md`.

---

## Carry-overs aus I6-Review

| Finding | Status | Implementation |
|---|---|---|
| RAF-Leak: pages müssen Cleanup returnen | **RESOLVED** | 6 Subpages returnen `wireHeroRolling` cleanup; mountWithProfile propagiert; router stört nicht |
| Integration-Test: real router mount/unmount-Zyklus | **RESOLVED** | `test/router-cleanup-chain.test.js` mit 2 JSDOM-Tests |
| `data-page-title` Contract undokumentiert | **RESOLVED** | `docs/components-contract.md` (RollingText, router, SecondaryNav contracts) |
| Detached-Test war Proxy | **RESOLVED** | Router-cleanup-chain test verifiziert end-to-end |

---

## Implementierte Änderungen

| Datei | Art |
|---|---|
| `public/src/data/routes.js` | + `group: 'cards'` auf 5 Chart-Lanes; + `ROUTE_GROUPS` Konstante |
| `public/src/components/SecondaryNav.js` | Render-Refactor: top-level + grouped → buckets per group key, `<details>` dropdown |
| `public/src/router.js` | + Type-Guard: nur callable cleanups; cleanup-throws nicht navigations-blockierend |
| `public/src/app.js` | `mountWithProfile` capturet + returnt page cleanup |
| `public/src/pages/BaziPage.js` | `const heroCleanup = wireHeroRolling(app); … return heroCleanup;` |
| `public/src/pages/WuxingPage.js` | dito |
| `public/src/pages/WesternPage.js` | dito |
| `public/src/pages/HousesPage.js` | dito |
| `public/src/pages/FusionPage.js` | `return wireHeroRolling(app);` |
| `public/src/pages/DailyPage.js` | dito |
| `public/src/pages/MethodPage.js` | unverändert (async — isConnected-Fallback ausreichend) |
| `public/src/styles/main.css` | + Karten-Dropdown CSS (`.secondary-nav__group[open]`, summary chevron) |
| `test/secondary-nav.test.js` | Update: walk route tree statt flat-count |
| `test/secondary-nav-grouped.test.js` | NEU: 6 Tests für Gruppierung + Dropdown-Struktur |
| `test/router-cleanup-chain.test.js` | NEU: 2 Integration-Tests (JSDOM + hashchange) |
| `test/e2e/navigation.spec.js` | NEU: 12 Playwright-Tests (top-level + dropdown + Karten-Routen) |
| `docs/components-contract.md` | NEU: RollingText + router + SecondaryNav contracts |
| `docs/qa/2026-05-22-i7-ia-audit.md` | NEU: IA-Audit mit User-Entscheidungen |
| `docs/qa/screenshots/i7-navigation/` | 2 Screenshots |

---

## Architektur-Highlights

- **`ROUTES.group` field**: Single source of truth bleibt `routes.js` — kein paralleler Nav-Config-File. Hinzufügen einer neuen Gruppe = 1 Eintrag in `ROUTE_GROUPS` + Tag der Route-Einträge.
- **Router-Cleanup Chain**: 3-stufig (page → mountWithProfile → router). Type-Guards an jedem Knoten — kein Crash bei Promise/null/non-function returns.
- **`<details>` Dropdown**: nativ, kein JS-State-Machine. CSS rotiert Chevron via `[open]` Selektor. Mobile-friendly out-of-the-box.
- **Active-state on Group**: `data-active="true"` auf Summary wenn current route grouped — Lane-Color zeigt auf Gruppen-Ebene.

---

## Code Review

- Keine Fake-Daten, keine hardcoded astrologischen Werte
- Backend-Architektur unberührt (server.js, FuFire-Proxy nicht angefasst)
- `FUFIRE_ENDPOINTS` Reihenfolge unverändert
- REQ-F-006 (Ist-Details erreichbar): alle 15 Routes reachable (10 via Nav, 5 via Deep-Link); navigation E2E spec beweist es
- REQ-A-002 (Router-Cleanup): page mount → cleanup return chain dokumentiert + getestet

Constraint-Check:
```
grep -l "FUFIRE\|callFuFire\|orchestrate" public/src/components/SecondaryNav.js public/src/router.js public/src/app.js
# → keine Treffer für SecondaryNav.js / router.js (Backend-Logik nicht berührt)
```

---

## Findings

Keine Critical/Major Findings.

**Minor (gelöst):**
- Router-Latent-Bug: `currentCleanup = mount() || null` akzeptierte truthy non-function (z.B. Promise von async MethodPage). Type-Guard hinzugefügt.
- mountWithProfile swallowte return — pages-cleanup ging verloren. Fixed.
- Existing secondary-nav.test.js iterierte positional über `nav._children` — brach mit Dropdown-Struktur. Auf data-path-Lookup umgestellt.

**Minor (deferred):**
- Cut D (Deep-Dive-Cluster /love + /career-finance + /personality in Overview integrieren) — ≥10 Files Scope, separates Sprint-Päckchen.
- MethodPage async — kein expliziter Cleanup return; verlässt sich auf `isConnected` Self-Cancel. OK weil bestätigt funktional, aber irregulär gegenüber 6 anderen Pages.

---

## Finaler Status: PASS
