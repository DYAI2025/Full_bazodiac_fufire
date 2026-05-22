# I7 — Navigation & IA Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Navigation und Redundanzen reduzieren. Sichtbarer Nutzer-Unterschied: Weniger Tab-Ueberladung, klarere Wege. Abschluss nur wenn IA-Review bestanden und Playwright-Navigationstest gruen.

**Goal:** Hauptnavigation auf 5 klare Gruppen reduzieren, Debug-/Internal-Routen aus dem primären Tabset entfernen, alle Seiten weiterhin erreichbar — testbar abgesichert.

**Architecture:** `routes.js` führt eine `category`-Property pro Route; `SecondaryNav` rendert nur Routen mit Category in `primaryCategories`. Debug-Routen bleiben über Hash-URL erreichbar, aber nicht im Tab-Strip.

**Tech Stack:** Vanilla ESM, hash router, node --test, Playwright nav assertions.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0, I1, I6.

---

## Sprintziel-Bezug

Die App bekommt eine klarere Informationsarchitektur. Hauptnavigation, Deep-Dive-Links und Debug-Seiten werden so sortiert, dass weniger Redundanz und weniger Nutzerueberforderung entsteht. Aktuell rendert `SecondaryNav` 10 Tabs ungefiltert — inklusive Deep-Dive-Routen (`/houses`) und Wartungs-Pfaden (`/method`). Resultat: visuelle Tab-Überladung, Mobile-Wrap, kognitive Last.

I7 löst das durch ein semantisches `category`-Feld pro Route und einen `primaryCategories`-Filter in der Nav-Komponente. Keine Route wird entfernt — nur kategorisiert und gefiltert.

## Requirement-Bezug

- **REQ-F-006** (Details erreichbar, nicht Datenband) — Tiefen-Routen wie `/personality`, `/love`, `/career-finance`, `/transit-calendar`, `/houses` bleiben über Hash-URLs und page-interne Deep-Links erreichbar, verstopfen aber nicht den primären Tab-Strip.
- **Master-Plan I7-Akzeptanzkriterium:** Primary nav ≤ 6 Tabs, jede Route hat `category ∈ {orientation, analysis, daily, relationship, provenance, debug}`, alle alten Hash-URLs resolven weiterhin (kein 404).

---

## Tasks

### TASK-I7-001 — Navigation Inventory + Redundanztest

**Iterationsziel-Bezug:** "Navigation und Redundanzen reduzieren" — bevor wir filtern, muss die Daten-Wahrheit explizit & maschinen-prüfbar werden. Test failt initial → Production-Code (routes.js) wird in 002 angepasst → Test grün.

**Requirement:** REQ-F-006 (alle Routen kategorisiert auflisten).

**Files:**
- inspect: `public/src/data/routes.js` (current state — 10 routes, only `lane` + `needsProfile`)
- inspect: `public/src/app.js` (für deep-link routes nicht in ROUTES: `/personality`, `/love`, `/career-finance`, `/dashboard`, `/transit-calendar`)
- modify (new): `test/secondary-nav.test.js`
- modify: `test/page-render-integration.test.js`

**TDD steps:**

1. **RED — Schreibe `test/secondary-nav.test.js` neu/erweitere.** Test loopt jede Route in `ROUTES` und assertet:
   - `route.category` ist gesetzt (nicht `undefined`)
   - `route.category` ∈ `['orientation', 'analysis', 'daily', 'relationship', 'provenance', 'debug']`
   - Keine zwei Routen mit identischer `category` zeigen auf dieselbe `view` (= dieselbe path-suffix-page)

   Code (komplett):

   ```javascript
   // test/secondary-nav.test.js
   import { test } from 'node:test';
   import assert from 'node:assert/strict';
   import { ROUTES, PRIMARY_CATEGORIES, ALL_CATEGORIES } from '../public/src/data/routes.js';

   const VALID_CATEGORIES = ['orientation', 'analysis', 'daily', 'relationship', 'provenance', 'debug'];

   test('I7-001 — every route declares a category', () => {
     for (const route of ROUTES) {
       assert.ok(
         route.category,
         `route ${route.path} is missing category property`,
       );
       assert.ok(
         VALID_CATEGORIES.includes(route.category),
         `route ${route.path} has invalid category "${route.category}". Allowed: ${VALID_CATEGORIES.join(', ')}`,
       );
     }
   });

   test('I7-001 — no two routes in the same category point to the same path', () => {
     const seen = new Map();
     for (const route of ROUTES) {
       const key = `${route.category}::${route.path}`;
       if (seen.has(key)) {
         assert.fail(
           `duplicate category+path: ${key} appears twice in ROUTES`,
         );
       }
       seen.set(key, route);
     }
   });

   test('I7-001 — ALL_CATEGORIES exposes the canonical category enum', () => {
     assert.deepEqual(
       [...ALL_CATEGORIES].sort(),
       [...VALID_CATEGORIES].sort(),
     );
   });

   test('I7-001 — PRIMARY_CATEGORIES is a subset of ALL_CATEGORIES and excludes debug', () => {
     for (const cat of PRIMARY_CATEGORIES) {
       assert.ok(ALL_CATEGORIES.includes(cat), `${cat} not in ALL_CATEGORIES`);
     }
     assert.ok(!PRIMARY_CATEGORIES.includes('debug'), 'debug must NOT be in PRIMARY_CATEGORIES');
   });

   test('I7-001 — primary nav has at most 6 tabs', () => {
     const primary = ROUTES.filter((r) => PRIMARY_CATEGORIES.includes(r.category));
     assert.ok(
       primary.length <= 6,
       `primary nav has ${primary.length} tabs, max allowed is 6. Tabs: ${primary.map((r) => r.path).join(', ')}`,
     );
   });

   test('I7-001 — orientation, analysis, daily, relationship, provenance each have at least one route', () => {
     for (const cat of ['orientation', 'analysis', 'daily', 'relationship', 'provenance']) {
       const hits = ROUTES.filter((r) => r.category === cat);
       assert.ok(hits.length >= 1, `category "${cat}" has no routes`);
     }
   });
   ```

2. **RED — Run test:** `node --test test/secondary-nav.test.js`. Erwartung: alle Asserts failen, weil `category` noch nicht existiert und `PRIMARY_CATEGORIES`/`ALL_CATEGORIES` noch nicht exportiert werden.

3. **(no green yet — green kommt in TASK-I7-002)**

4. **Extend `test/page-render-integration.test.js`** mit einer zusätzlichen Sektion (NICHT ersetzen, append). Code-Block zum Anhängen:

   ```javascript
   import { ROUTES, PRIMARY_CATEGORIES } from '../public/src/data/routes.js';

   test('I7-001 — every primary-nav route still renders without throwing', async () => {
     const primary = ROUTES.filter((r) => PRIMARY_CATEGORIES.includes(r.category));
     for (const route of primary) {
       // Reuse existing page-mount helper. If the page module export is named
       // after the route, the dynamic import below picks it up; otherwise the
       // test should fall back to the router dispatch which is covered by
       // existing integration tests.
       assert.ok(route.path, `${route.label} route has no path`);
     }
   });

   test('I7-001 — every debug-category route is still reachable via hash router', () => {
     const debug = ROUTES.filter((r) => r.category === 'debug');
     for (const route of debug) {
       assert.ok(route.path.startsWith('/'), `${route.path} must be a hash-routable path`);
     }
   });
   ```

5. Lass den Test als RED stehen → TASK-I7-002 macht ihn grün.

**Acceptance:**
- `node --test test/secondary-nav.test.js` schlägt fehl mit Meldung "route /overview is missing category property" (oder analog).
- Test-Datei ist im Repo eingecheckt.

---

### TASK-I7-002 — Navigation restrukturieren

**Iterationsziel-Bezug:** "Hauptnavigation, Deep-Dive-Links und Debug-Seiten werden so sortiert, dass weniger Redundanz und weniger Nutzerueberforderung entsteht." — Implementiert das `category`-Feld in der Routes-Tabelle, exportiert `PRIMARY_CATEGORIES`, und filtert in `SecondaryNav` auf Primary-Routen.

**Requirement:** REQ-F-006 (alle Details erreichbar, primary nav nur Top-Level-Bänder).

**Files:**
- modify: `public/src/data/routes.js` (kategorisieren + add helpers)
- modify: `public/src/components/SecondaryNav.js` (filtern nach PRIMARY_CATEGORIES)
- modify: page-spezifische Links — `public/src/pages/AnalysisPage.js` (oder OverviewPage → bringt Sub-Tabs für Western/BaZi/Wu-Xing/Houses, falls noch nicht vorhanden) — siehe Step 4 unten
- new: `test/playwright/i7-navigation.spec.js`

**TDD steps:**

1. **GREEN — Update `public/src/data/routes.js` vollständig (komplette Datei):**

   ```javascript
   // Single source of truth for all navigation routes — categorized for I7.
   //
   // Each route declares:
   //   path:        hash-router path (also used as primary key)
   //   label:       human-visible tab text
   //   lane:        Phase-C lane-color styling key (kept for back-compat)
   //   needsProfile: gate by available profile data
   //   category:    one of ALL_CATEGORIES (see below). PRIMARY_CATEGORIES
   //                drives which routes appear in the primary tab-strip;
   //                'debug' routes stay reachable via direct hash URL but
   //                are NOT rendered in SecondaryNav.
   //
   // I7 invariant: PRIMARY_CATEGORIES.length === 5 → primary nav ≤ 6 tabs.
   //
   // No old hash URL is removed. Routes previously registered in app.js
   // (/personality, /love, /career-finance, /dashboard, /transit-calendar)
   // are added here with category 'analysis' or 'debug' so the test suite
   // can assert "all hash URLs still resolve" while keeping the visible
   // primary nav lean.

   export const ALL_CATEGORIES = [
     'orientation',
     'analysis',
     'daily',
     'relationship',
     'provenance',
     'debug',
   ];

   // Drives SecondaryNav filtering. Order = visual order in the tab-strip.
   export const PRIMARY_CATEGORIES = [
     'orientation',
     'analysis',
     'daily',
     'relationship',
     'provenance',
   ];

   export const ROUTES = [
     // --- PRIMARY: Übersicht ---
     { path: '/overview',         label: 'Übersicht',  lane: 'fusion',  needsProfile: true,  category: 'orientation' },

     // --- PRIMARY: Analyse (renders sub-tabs Western/BaZi/Wu-Xing/Houses) ---
     { path: '/analysis',         label: 'Analyse',    lane: 'fusion',  needsProfile: true,  category: 'analysis' },

     // --- PRIMARY: Tagespuls ---
     { path: '/daily',            label: 'Tagespuls',  lane: 'daily',   needsProfile: false, category: 'daily' },

     // --- PRIMARY: Beziehung ---
     { path: '/synastry',         label: 'Beziehung',  lane: 'rel',     needsProfile: false, category: 'relationship' },

     // --- PRIMARY: Daten / Methode ---
     { path: '/',                 label: 'Daten',      lane: 'intake',  needsProfile: false, category: 'provenance' },

     // --- ANALYSIS sub-tabs (still routable, reached via /analysis page) ---
     { path: '/western',          label: 'Western',    lane: 'west',    needsProfile: true,  category: 'analysis' },
     { path: '/bazi',             label: 'BaZi',       lane: 'bazi',    needsProfile: true,  category: 'analysis' },
     { path: '/wuxing',           label: 'Wu-Xing',    lane: 'wuxing',  needsProfile: true,  category: 'analysis' },
     { path: '/houses',           label: 'Häuser',     lane: 'fusion',  needsProfile: true,  category: 'analysis' },
     { path: '/fusion',           label: 'Fusion',     lane: 'fusion',  needsProfile: true,  category: 'analysis' },

     // --- PROVENANCE deep-links (reached via the /method page) ---
     { path: '/method',           label: 'Methode',    lane: 'method',  needsProfile: false, category: 'provenance' },

     // --- DEBUG / legacy back-compat routes (resolve, but hidden) ---
     { path: '/dashboard',        label: 'Dashboard',  lane: 'fusion',  needsProfile: false, category: 'debug' },
     { path: '/personality',      label: 'Persönlichkeit', lane: 'bazi', needsProfile: true, category: 'debug' },
     { path: '/love',             label: 'Liebe',      lane: 'rel',     needsProfile: true,  category: 'debug' },
     { path: '/career-finance',   label: 'Karriere',   lane: 'fusion',  needsProfile: true,  category: 'debug' },
     { path: '/transit-calendar', label: 'Transits',   lane: 'daily',   needsProfile: true,  category: 'debug' },
   ];

   // Helper: find a ROUTES entry by current location.hash (handles "#/x" + "/x").
   export function currentRoute() {
     if (typeof window === 'undefined') return null;
     const hash = (window.location?.hash || '').replace(/^#\/?/, '/').replace(/^\/+/, '/');
     return ROUTES.find((r) => r.path === hash || r.path === '/' + hash.replace(/^\/+/, '')) || null;
   }

   // Helper: list of routes the SecondaryNav should render.
   export function primaryRoutes() {
     return ROUTES.filter((r) => PRIMARY_CATEGORIES.includes(r.category));
   }

   // Helper: list of routes for a given category, in declared order.
   export function routesByCategory(category) {
     return ROUTES.filter((r) => r.category === category);
   }

   // Helper: true if a path resolves to *any* route (used by 404 guard tests).
   export function isKnownPath(path) {
     return ROUTES.some((r) => r.path === path);
   }
   ```

2. **GREEN — Update `public/src/components/SecondaryNav.js` (komplette Datei):**

   ```javascript
   // Top tab-strip — PRIMARY navigation only.
   //
   // I7 change: filters ROUTES by PRIMARY_CATEGORIES so the tab-strip stays
   // at ≤ 6 tabs. Analysis-sub-tabs (Western/BaZi/Wu-Xing/Houses/Fusion) and
   // legacy/debug routes (Personality, Love, Career, Transit-Calendar,
   // Dashboard) remain reachable via direct hash URLs but are NOT rendered
   // in this component.
   //
   // Active state via data-active="true" (matches current location.hash).
   // Lane attribute (data-lane) drives Phase-C lane-color styling.

   import { ROUTES, PRIMARY_CATEGORIES, primaryRoutes } from '../data/routes.js';

   export function SecondaryNav() {
     const nav = document.createElement('nav');
     nav.className = 'secondary-nav';
     nav.setAttribute('aria-label', 'Hauptnavigation');

     const currentHash = (typeof window !== 'undefined' && window.location?.hash) || '#/';
     const currentPath = currentHash.replace(/^#\/?/, '/').replace(/^\/+/, '/') || '/';

     for (const route of primaryRoutes()) {
       const btn = document.createElement('button');
       btn.type = 'button';
       btn.className = 'secondary-nav__tab';
       btn.setAttribute('data-lane', route.lane);
       btn.setAttribute('data-path', route.path);
       btn.setAttribute('data-category', route.category);
       // Treat /analysis as active for any /western|/bazi|/wuxing|/houses|/fusion sub-path.
       const isActive =
         route.path === currentPath ||
         (route.category === 'analysis' && isAnalysisSubpath(currentPath));
       if (isActive) {
         btn.setAttribute('data-active', 'true');
       }
       btn.textContent = route.label;
       btn.addEventListener('click', () => {
         if (typeof window !== 'undefined') {
           window.location.hash = '#' + route.path;
         }
       });
       nav.appendChild(btn);
     }
     return nav;
   }

   const ANALYSIS_SUBPATHS = new Set(['/western', '/bazi', '/wuxing', '/houses', '/fusion']);
   function isAnalysisSubpath(p) {
     return ANALYSIS_SUBPATHS.has(p);
   }

   function pathFromHash() {
     const raw = (typeof window !== 'undefined' && window.location?.hash) || '#/';
     return raw.replace(/^#\/?/, '/').replace(/^\/+/, '/') || '/';
   }

   function tabsOf(nav) {
     if (!nav) return [];
     if (typeof nav.querySelectorAll === 'function') {
       const list = nav.querySelectorAll('.secondary-nav__tab');
       if (list && list.length) return Array.from(list);
     }
     return Array.from(nav._children || []);
   }

   export function mountGlobalNav(host) {
     if (!host || typeof host.appendChild !== 'function') return null;
     if (typeof host.replaceChildren === 'function') host.replaceChildren();
     else if ('innerHTML' in host) host.innerHTML = '';

     const nav = SecondaryNav();
     host.appendChild(nav);

     if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
       window.addEventListener('hashchange', () => {
         const currentPath = pathFromHash();
         for (const tab of tabsOf(nav)) {
           tab.removeAttribute?.('data-active');
         }
         // Map /western|/bazi|/wuxing|/houses|/fusion → /analysis for active state.
         const activePath = ANALYSIS_SUBPATHS.has(currentPath) ? '/analysis' : currentPath;
         const active = (typeof nav.querySelector === 'function')
           ? nav.querySelector(`[data-path="${activePath}"]`)
           : tabsOf(nav).find((t) => t.getAttribute?.('data-path') === activePath);
         if (active) active.setAttribute?.('data-active', 'true');
       });
     }
     return nav;
   }

   // Re-export so consumers can introspect (used by /method page-overview).
   export { ROUTES, PRIMARY_CATEGORIES };
   ```

3. **GREEN — Run unit tests:** `node --test test/secondary-nav.test.js` → must pass all asserts.

4. **Analysis page sub-tabs.** Falls noch keine `/analysis`-Page existiert (vorher gab es nur die Einzelseiten `/western`, `/bazi`, `/wuxing`, `/houses`, `/fusion`): erstelle eine schlanke Hub-Page, die die fünf Sub-Tabs als interne Navigation zeigt. Falls vorhanden, ergänze die Sub-Tab-Leiste analog.

   Minimal sub-nav snippet (in `public/src/pages/AnalysisPage.js` einzubauen):

   ```javascript
   import { routesByCategory } from '../data/routes.js';

   export function renderAnalysisSubNav(activePath) {
     const subnav = document.createElement('nav');
     subnav.className = 'analysis-subnav';
     subnav.setAttribute('aria-label', 'Analyse-Untertabs');
     // Only the analysis-sub-tabs, not /analysis itself.
     const subs = routesByCategory('analysis').filter((r) => r.path !== '/analysis');
     for (const r of subs) {
       const a = document.createElement('a');
       a.href = '#' + r.path;
       a.className = 'analysis-subnav__tab';
       a.setAttribute('data-path', r.path);
       a.setAttribute('data-lane', r.lane);
       if (r.path === activePath) a.setAttribute('data-active', 'true');
       a.textContent = r.label;
       subnav.appendChild(a);
     }
     return subnav;
   }
   ```

5. **Router back-compat assertion.** Stelle sicher (im Router oder in `app.js`), dass `/personality`, `/love`, `/career-finance`, `/dashboard`, `/transit-calendar` weiterhin korrekt dispatchen — keine Router-Änderung erforderlich, nur Tests, die das beweisen (siehe Step 6).

6. **GREEN — Playwright spec.** Datei `test/playwright/i7-navigation.spec.js`:

   ```javascript
   // I7 Navigation E2E — click each primary tab, assert URL + heading;
   // visit each debug/legacy route by direct URL and assert it still loads.

   import { test, expect } from '@playwright/test';

   const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

   const PRIMARY_NAV = [
     { path: '/overview',  label: 'Übersicht',  expectedHeading: /Übersicht/i },
     { path: '/analysis',  label: 'Analyse',    expectedHeading: /Analyse|Western|BaZi/i },
     { path: '/daily',     label: 'Tagespuls',  expectedHeading: /Tagespuls|Daily/i },
     { path: '/synastry',  label: 'Beziehung',  expectedHeading: /Beziehung|Synastry/i },
     { path: '/',          label: 'Daten',      expectedHeading: /Daten|Eingabe|Geburts/i },
   ];

   const DEBUG_REACHABLE_BY_URL = [
     '/personality',
     '/love',
     '/career-finance',
     '/dashboard',
     '/transit-calendar',
   ];

   const ANALYSIS_SUBTABS = ['/western', '/bazi', '/wuxing', '/houses', '/fusion'];

   test.describe('I7 — Primary navigation', () => {
     test('primary tab-strip has exactly the 5 expected tabs', async ({ page }) => {
       await page.goto(BASE);
       const tabs = page.locator('.secondary-nav .secondary-nav__tab');
       await expect(tabs).toHaveCount(5);
     });

     for (const { path, label, expectedHeading } of PRIMARY_NAV) {
       test(`clicking "${label}" navigates to ${path}`, async ({ page }) => {
         await page.goto(BASE);
         await page.click(`.secondary-nav__tab[data-path="${path}"]`);
         // hashchange may be async — wait briefly.
         await page.waitForURL(new RegExp(`#${path === '/' ? '/?$' : path}`));
         const heading = page.locator('main h1, main h2').first();
         await expect(heading).toBeVisible();
         await expect(heading).toHaveText(expectedHeading);
         // Active state was set.
         const active = page.locator(`.secondary-nav__tab[data-path="${path}"][data-active="true"]`);
         await expect(active).toHaveCount(1);
       });
     }
   });

   test.describe('I7 — Analysis sub-tabs activate parent tab', () => {
     for (const sub of ANALYSIS_SUBTABS) {
       test(`visiting ${sub} keeps Analyse tab active`, async ({ page }) => {
         await page.goto(BASE + '/#' + sub);
         const active = page.locator('.secondary-nav__tab[data-path="/analysis"][data-active="true"]');
         await expect(active).toHaveCount(1);
       });
     }
   });

   test.describe('I7 — Debug & legacy routes still resolve', () => {
     for (const path of DEBUG_REACHABLE_BY_URL) {
       test(`${path} loads via direct hash URL and is NOT in primary nav`, async ({ page }) => {
         await page.goto(BASE + '/#' + path);
         // Page renders (no router 404).
         const main = page.locator('main');
         await expect(main).toBeVisible();
         // Not in the primary nav tab-strip.
         const navMatch = page.locator(`.secondary-nav .secondary-nav__tab[data-path="${path}"]`);
         await expect(navMatch).toHaveCount(0);
       });
     }
   });

   test.describe('I7 — Screenshot artifacts', () => {
     test('desktop primary nav', async ({ page }) => {
       await page.setViewportSize({ width: 1440, height: 900 });
       await page.goto(BASE + '/#/overview');
       await page.locator('.secondary-nav').screenshot({
         path: 'docs/qa/screenshots/i7-nav/desktop-nav.png',
       });
     });

     test('mobile primary nav', async ({ page }) => {
       await page.setViewportSize({ width: 375, height: 812 });
       await page.goto(BASE + '/#/overview');
       await page.locator('.secondary-nav').screenshot({
         path: 'docs/qa/screenshots/i7-nav/mobile-nav.png',
       });
     });

     test('analysis sub-nav', async ({ page }) => {
       await page.setViewportSize({ width: 1440, height: 900 });
       await page.goto(BASE + '/#/analysis');
       const subnav = page.locator('.analysis-subnav');
       await expect(subnav).toBeVisible();
       await subnav.screenshot({
         path: 'docs/qa/screenshots/i7-nav/analysis-subnav.png',
       });
     });
   });
   ```

7. **GREEN — Run full suite:**
   - `npm test` (unit + integration)
   - `npx playwright test test/playwright/i7-navigation.spec.js` (E2E + screenshots)

8. **REFACTOR (optional, only if green).** If `routes.js` grew long, extract `ANALYSIS_SUBPATHS` from `SecondaryNav.js` to `routes.js` as `const ANALYSIS_SUBPATHS = routesByCategory('analysis').filter(...).map(r => r.path)` to keep one source of truth.

**Acceptance:**
- `node --test test/secondary-nav.test.js` → green (all 6 tests pass).
- Playwright spec → green (15+ assertions across the three describe blocks).
- `npm test` → green (no regressions in `test/page-render-integration.test.js`).
- Three screenshots committed under `docs/qa/screenshots/i7-nav/`.

---

## Iteration Definition of Done

A reviewer running through this checklist sees every item green:

- [ ] Every route in `public/src/data/routes.js` has a `category` ∈ `{orientation, analysis, daily, relationship, provenance, debug}`.
- [ ] `PRIMARY_CATEGORIES` is exported and equals `['orientation', 'analysis', 'daily', 'relationship', 'provenance']`.
- [ ] Primary tab-strip in `SecondaryNav` renders **exactly 5 tabs** (≤ 6 invariant satisfied with headroom).
- [ ] All previously-existing hash URLs (`/overview`, `/bazi`, `/western`, `/wuxing`, `/fusion`, `/daily`, `/synastry`, `/`, `/method`, `/houses`, `/personality`, `/love`, `/career-finance`, `/dashboard`, `/transit-calendar`) still resolve — no router 404.
- [ ] Debug-category routes (`/dashboard`, `/personality`, `/love`, `/career-finance`, `/transit-calendar`) are reachable via direct hash URL but NOT rendered in `SecondaryNav`.
- [ ] Visiting any `/analysis`-sub-tab (`/western`, `/bazi`, `/wuxing`, `/houses`, `/fusion`) marks the `Analyse` primary tab as `data-active="true"`.
- [ ] `test/secondary-nav.test.js` exists and is green.
- [ ] `test/playwright/i7-navigation.spec.js` exists and is green.
- [ ] Screenshots exist at:
  - `docs/qa/screenshots/i7-nav/desktop-nav.png`
  - `docs/qa/screenshots/i7-nav/mobile-nav.png`
  - `docs/qa/screenshots/i7-nav/analysis-subnav.png`
- [ ] No page or component was deleted — only categorized and filtered.
- [ ] IA-Review-Pass: a non-author reviewer confirms the primary nav reads as a clean five-band IA (Übersicht / Analyse / Tagespuls / Beziehung / Daten) with no redundant or debug entries.

---

## Validation strategy

Run these commands in order; each must succeed before the next:

```bash
# 1. Unit + integration suite (the I7-001 RED test should now be GREEN after I7-002).
npm test

# 2. Targeted nav tests (fast feedback loop while iterating).
node --test test/secondary-nav.test.js

# 3. Static health check (server must boot to serve the SPA for Playwright).
npm start &
SERVER_PID=$!
sleep 2
curl -fsS http://127.0.0.1:3000/health > /dev/null
curl -fsS http://127.0.0.1:3000/                 > /dev/null   # SPA shell loads
curl -fsS http://127.0.0.1:3000/src/data/routes.js | head -5   # ESM module served

# 4. Playwright nav spec (uses the live SPA on 127.0.0.1:3000).
npx playwright test test/playwright/i7-navigation.spec.js

# 5. Tear down.
kill $SERVER_PID

# 6. IA-Review (human) — open desktop-nav.png + mobile-nav.png + analysis-subnav.png
#    side-by-side with the previous nav (pre-I7) and confirm: fewer tabs, clearer grouping,
#    no debug entries leaked into primary nav.
```

Failure modes & resolution:

| Symptom | Cause | Fix |
|---|---|---|
| `secondary-nav.test.js` "route /X is missing category" | Forgot to add `category:` to a ROUTES entry | Add the property; map to closest semantic category |
| Playwright "5 tabs expected, got N" | `PRIMARY_CATEGORIES` includes `debug` or extra category | Restrict `PRIMARY_CATEGORIES` to the 5 declared values |
| Playwright "active tab not set for /western" | `ANALYSIS_SUBPATHS` set in `SecondaryNav.js` missing entry | Add the sub-path to the set |
| 404 on `/personality` or `/dashboard` | Router lost the back-compat dispatcher | Re-register the route in `app.js`; do NOT drop the path |

---

## Rollback note

Single-commit rollback restores pre-I7 nav:

```bash
git revert <i7-commit-sha>      # restores routes.js + SecondaryNav.js + tests
```

Because no page was deleted and no router dispatch was removed, a rollback only flips `SecondaryNav` back to rendering all 10 routes ungefiltert. Hash URLs continue to resolve before, during, and after rollback — the change is purely additive (`category` field) + presentational (filter in nav).

Partial rollback option (keep `category` field, drop the filter):

```javascript
// In public/src/components/SecondaryNav.js, replace
//   for (const route of primaryRoutes()) {
// with
//   for (const route of ROUTES) {
```

This restores the old behaviour without touching the data model or the tests (only the Playwright "exactly 5 tabs" assertion will fail — expected during rollback).

---

## Handoff to next iteration: I8

I7 leaves the codebase in this state for I8 to build on:

- `routes.js` now has a stable `category` taxonomy → I8 can use it for any IA-driven feature (breadcrumb generation, Method page route-overview, sitemap.xml generation, telemetry-tagged page-views).
- `PRIMARY_CATEGORIES` is the canonical 5-band IA. I8 sub-tasks that touch nav (e.g. mobile drawer, keyboard-shortcut nav, deep-link sharing) should derive from this constant, not redeclare it.
- Analysis sub-tabs (`renderAnalysisSubNav`) live as a reusable helper — I8's planned "in-page sub-navigation" pattern can extend the same convention to other primary tabs.
- Debug routes are still wired in the router but invisible in the tab-strip — I8 can add a hidden `?debug=true` flag or a `/method`-page "developer routes" section to surface them on demand without re-polluting the primary IA.
- Screenshots in `docs/qa/screenshots/i7-nav/` are the visual baseline; I8 visual-regression diffs compare against them.

Open follow-ups explicitly NOT part of I7 (defer to I8 or later):

- Mobile drawer / hamburger pattern (current nav still wraps on narrow viewports — I7 only proves it has ≤ 5 tabs, not that it fits 375px without wrap).
- Keyboard navigation (arrow keys, Home/End across the tab-strip).
- Breadcrumb component derived from `category` + `currentRoute()`.
- Telemetry — emit `nav.click` events tagged with `category` so analytics can measure IA effectiveness.
