# I0 — QA-Gate & Playwright Baseline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Eine harte Abnahmepipeline herstellen, bevor Feature-Fixes als "fertig" gelten. Danach kann keine Iteration mehr ohne echten Browser, Screenshots, Review-Log und Code Review abgeschlossen werden. QA-Gates und Playwright-Live-Browser-Basis erzwingen. Sichtbarer Nutzer-Unterschied: noch keine Produktveraenderung, aber harte Abnahmemaschine. Abschluss nur wenn Playwright laeuft lokal/live und Screenshots werden gespeichert.

**Goal:** Etabliere Playwright-Live-Browser-Gate + QA-Review-Template als harte Abnahmebasis für alle nachfolgenden Iterationen.

**Architecture:** Playwright als devDependency; e2e specs unter `test/e2e/**`; Screenshots unter `docs/qa/screenshots/i0-*/`; standardisiertes Review-Markdown-Template.

**Tech Stack:** @playwright/test, Node 20+, node --test, chromium.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`

---

## Übersicht der Tasks

| # | Task-ID | Komponente | Requirement |
|---|---|---|---|
| 1 | TASK-I0-001 | Playwright als Pflicht-Gate einführen | REQ-NF-001, REQ-S-001 |
| 2 | TASK-I0-002 | Iterations-Review-Protokoll standardisieren | REQ-NF-002, REQ-NF-003, REQ-O-001 |

---

### Task 1: Playwright als Pflicht-Gate einführen (TASK-I0-001)

**Iterationsziel-Bezug:** Ohne lauffähigen Playwright-Smoke-Test in echtem Chromium gilt keine Iteration als abgeschlossen — dieser Task baut genau diese Maschine.
**Requirement links:** REQ-NF-001 (Playwright pro Iteration), REQ-S-001 (keine Secrets in Screenshots).

**Files:**
- Modify: `package.json`
- Create: `playwright.config.mjs`
- Create: `test/e2e/smoke-main-pages.spec.js`
- Create: `docs/qa/screenshots/.gitkeep`
- Modify: `.gitignore`

---

**Step 1: Write the failing test**

Create `test/e2e/smoke-main-pages.spec.js` mit folgendem Inhalt:

```javascript
// test/e2e/smoke-main-pages.spec.js
// Smoke-Tests für alle Hauptseiten des SPA.
// Jede Seite muss <main> und ein sichtbares <h1> rendern.
// Screenshots landen unter docs/qa/screenshots/i0-smoke/<slug>.png.

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOT_DIR = 'docs/qa/screenshots/i0-smoke';

// Sicherstellen, dass der Screenshot-Ordner existiert.
test.beforeAll(() => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

/**
 * Die Routen entsprechen dem Hash-Router unter public/src/router.js
 * sowie den Hauptnavigationspunkten der App.
 *
 * Slug = stabiler Dateiname für Screenshot.
 * path = relativer Pfad inklusive Hash für SPA-Routen.
 * label = sichtbarer Name (nur dokumentarisch).
 */
const ROUTES = [
  { slug: '01-root',            path: '/',                 label: 'Root / Dashboard' },
  { slug: '02-overview',        path: '/#/overview',       label: 'Overview' },
  { slug: '03-bazi',            path: '/#/bazi',           label: 'BaZi' },
  { slug: '04-western',         path: '/#/western',        label: 'Western' },
  { slug: '05-wuxing',          path: '/#/wuxing',         label: 'Wu-Xing' },
  { slug: '06-fusion',          path: '/#/fusion',         label: 'Fusion' },
  { slug: '07-tagespuls',       path: '/#/daily',          label: 'Tagespuls' },
  { slug: '08-haeuser',         path: '/#/houses',         label: 'Haeuser' },
  { slug: '09-beziehung',       path: '/#/synastry',       label: 'Beziehung' },
  { slug: '10-daten',           path: '/#/input',          label: 'Daten' },
  { slug: '11-methode',         path: '/#/method',         label: 'Methode' },
];

for (const route of ROUTES) {
  test(`smoke: ${route.label} (${route.path}) rendert main + h1`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: 'networkidle' });

    // HTTP-Status muss erfolgreich sein (Root liefert IMMER index.html).
    expect(response, `keine HTTP-Antwort für ${route.path}`).not.toBeNull();
    expect(response.status(), `HTTP ${response.status()} für ${route.path}`).toBeLessThan(400);

    // Hauptlandmark muss existieren.
    const main = page.locator('main');
    await expect(main, '<main>-Landmark fehlt').toHaveCount(1);

    // Mindestens ein sichtbares h1.
    const h1 = page.locator('h1').first();
    await expect(h1, 'kein sichtbares <h1>').toBeVisible({ timeout: 10_000 });

    // Screenshot ablegen (full page).
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${route.slug}.png`),
      fullPage: true,
    });
  });
}
```

Erstelle zusätzlich den Platzhalter `docs/qa/screenshots/.gitkeep` (leerer Inhalt), damit der Ordner committet wird:

```text
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx playwright test --config=playwright.config.mjs
```

Expected: FAIL mit `Cannot find module '@playwright/test'` bzw. `playwright.config.mjs not found` — Playwright ist noch nicht installiert und kein Config vorhanden.

---

**Step 3: Implement minimal code**

a) `package.json` ergänzen (devDependencies + scripts):

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "node --test",
    "test:contract": "FUFIRE_CONTRACT_TEST=true node --test test/contract.test.js",
    "test:e2e": "playwright test --config=playwright.config.mjs",
    "test:e2e:update": "playwright test --config=playwright.config.mjs --update-snapshots",
    "test:e2e:headed": "playwright test --config=playwright.config.mjs --headed"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0"
  }
}
```

(Nur die Felder `scripts` und `devDependencies` so erweitern — vorhandene Felder nicht überschreiben.)

b) Tatsächlich installieren:

```bash
npm install --save-dev @playwright/test@^1.47.0
npx playwright install chromium
```

c) `playwright.config.mjs` im Repo-Root anlegen:

```javascript
// playwright.config.mjs
// Live-Browser-Gate für jede Iteration. Startet npm start automatisch.
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:3000';
const PORT = Number(new URL(BASE_URL).port || 3000);

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: /.*\.spec\.(js|mjs|ts)$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'docs/qa/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start',
    url: BASE_URL,
    port: PORT,
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

d) `.gitignore` ergänzen (Playwright-Artefakte, aber Screenshots committen):

```gitignore
# Playwright
/node_modules/@playwright
/test-results/
/playwright-report/
docs/qa/playwright-report/
.playwright/
```

(Ans Ende anhängen, vorhandene Regeln nicht ändern.)

**Step 4: Run test to verify it passes**

Run:
```bash
npm run test:e2e
```

Expected: PASS — alle 11 Smoke-Tests grün, Screenshots liegen unter `docs/qa/screenshots/i0-smoke/01-root.png` … `11-methode.png`.

Falls eine Route noch nicht existiert (kein `<h1>`), ist das ein legitimer Befund für I0 — er wird im Review-Log (Task 2) als Finding dokumentiert und in der jeweiligen Folge-Iteration adressiert. Für I0 muss MINDESTENS `01-root` grün sein, alle übrigen Failures gehören ins Review-Log.

**Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.mjs test/e2e/smoke-main-pages.spec.js docs/qa/screenshots/.gitkeep docs/qa/screenshots/i0-smoke/ .gitignore
git commit -m "feat(qa): add Playwright live-browser gate + smoke spec for main pages (I0)"
```

---

### Task 2: Iterations-Review-Protokoll standardisieren (TASK-I0-002)

**Iterationsziel-Bezug:** Eine Iteration gilt nur als fertig, wenn ein nach Template ausgefülltes Review-Markdown mit Screenshots, optischem Review, Code Review, Findings und Fix-Log existiert.
**Requirement links:** REQ-NF-002 (Code-Review-Log), REQ-NF-003 (Review-Fix-Review-Schleife), REQ-O-001 (Final Report).

**Files:**
- Create: `docs/qa/templates/iteration-review-template.md`
- Create: `docs/qa/2026-05-22-i0-playwright-baseline.md`

---

**Step 1: Write the failing test**

Da es sich um Dokumentations-Artefakte handelt, ist die "failing test"-Phase ein deterministischer Existence-Check. Lege `test/qa-artifacts.test.js` an (oder ergänze, falls schon vorhanden):

```javascript
// test/qa-artifacts.test.js
// Stellt sicher, dass das Review-Template existiert und alle Pflichtsektionen
// enthält, und dass das I0-Review nach diesem Template angelegt wurde.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const TEMPLATE = 'docs/qa/templates/iteration-review-template.md';
const I0_REVIEW = 'docs/qa/2026-05-22-i0-playwright-baseline.md';

const REQUIRED_SECTIONS = [
  '## Ziel',
  '## Testcommands',
  '## Browser / Viewport',
  '## Screenshots',
  '## Optischer Review',
  '## Code Review',
  '## Findings',
  '## Fixes',
  '## Finaler Status',
];

test('iteration-review-template existiert und enthält alle Pflichtsektionen', () => {
  assert.ok(existsSync(TEMPLATE), `${TEMPLATE} fehlt`);
  const content = readFileSync(TEMPLATE, 'utf8');
  for (const section of REQUIRED_SECTIONS) {
    assert.ok(
      content.includes(section),
      `Template fehlt Sektion: ${section}`,
    );
  }
});

test('i0-review existiert und referenziert das Template', () => {
  assert.ok(existsSync(I0_REVIEW), `${I0_REVIEW} fehlt`);
  const content = readFileSync(I0_REVIEW, 'utf8');
  for (const section of REQUIRED_SECTIONS) {
    assert.ok(
      content.includes(section),
      `I0-Review fehlt Sektion: ${section}`,
    );
  }
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
node --test test/qa-artifacts.test.js
```

Expected: FAIL mit `docs/qa/templates/iteration-review-template.md fehlt`.

---

**Step 3: Implement minimal code**

a) `docs/qa/templates/iteration-review-template.md`:

```markdown
# Iteration Review — <ITERATION-ID> (<TITEL>)

> Pflicht-Artefakt. Eine Iteration gilt erst als abgeschlossen, wenn dieses Dokument
> für die jeweilige Iteration vollständig ausgefüllt und committet ist.
> Pfad-Konvention: `docs/qa/<YYYY-MM-DD>-<iteration-id>-<slug>.md`.

**Iteration:** <ITERATION-ID>
**Datum:** <YYYY-MM-DD>
**Reviewer:** <Name / Rolle>
**Plan-Referenz:** `docs/plans/<YYYY-MM-DD>-<iteration-id>-<slug>.md`
**Master-Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`

---

## Ziel

<Iterationsziel in 2-4 Sätzen. Was soll der Nutzer am Ende sehen / können?
Welche Requirements werden geschlossen? Bezug zu REQ-IDs.>

## Testcommands

Genau die Befehle, die für die Abnahme ausgeführt wurden — copy/paste-fähig:

```bash
# Unit + Integration
npm test

# Live-Browser-Gate
APP_BASE_URL=http://127.0.0.1:3000 npm run test:e2e

# (optional) Headed-Lauf zur visuellen Verifikation
npm run test:e2e:headed
```

Tatsächliches Ergebnis (Auszug):

```
<Output / Zusammenfassung "X passed, Y failed">
```

## Browser / Viewport

| Feld | Wert |
|---|---|
| Browser | Chromium (Playwright managed) |
| Version | <z.B. 130.0.6723.31> |
| Viewport | 1440 x 900 |
| OS | <macOS 15 / Ubuntu 24 / ...> |
| Node | <z.B. 20.17.0> |

## Screenshots

Pfad: `docs/qa/screenshots/<iteration-id>-<sub>/`

| Seite | Datei | Status |
|---|---|---|
| Root / Dashboard | `01-root.png` | OK / NOK |
| Overview | `02-overview.png` | OK / NOK |
| BaZi | `03-bazi.png` | OK / NOK |
| Western | `04-western.png` | OK / NOK |
| Wu-Xing | `05-wuxing.png` | OK / NOK |
| Fusion | `06-fusion.png` | OK / NOK |
| Tagespuls | `07-tagespuls.png` | OK / NOK |
| Haeuser | `08-haeuser.png` | OK / NOK |
| Beziehung | `09-beziehung.png` | OK / NOK |
| Daten | `10-daten.png` | OK / NOK |
| Methode | `11-methode.png` | OK / NOK |

Hinweis (REQ-S-001): Screenshots dürfen KEINE Secrets, API-Keys, echten Personendaten
oder Tokens enthalten. Nur synthetische Testdaten verwenden.

## Optischer Review

<Pro Seite 1-3 Bullets: Layout, Typographie, Lesbarkeit, mobile Optik (sofern getestet),
Konsistenz mit Designsystem, sichtbare Defekte. Direkt auf Screenshot referenzieren.>

- Root: ...
- Overview: ...
- BaZi: ...
- Western: ...
- Wu-Xing: ...
- Fusion: ...
- Tagespuls: ...
- Haeuser: ...
- Beziehung: ...
- Daten: ...
- Methode: ...

## Code Review

<Diff-basiertes Review. Pro geänderter Datei: was wurde geändert, warum, welches Risiko,
welche Tests decken es ab? Mindestens 1 expliziter Reviewer-Eintrag pro Iteration.>

- `path/to/file.js`: ...
- `path/to/other.js`: ...

Checkliste:

- [ ] Lesbar und in bestehender Code-Konvention
- [ ] Keine toten Imports / dead code
- [ ] Keine Console-Errors im Browser (DevTools-Check)
- [ ] Keine Secrets / API-Keys im Diff
- [ ] Tests vorhanden und grün
- [ ] CHANGELOG / Plan-Status aktualisiert

## Findings

Nummerierte Liste konkreter Mängel aus optischem Review + Code Review.
Jeder Eintrag: Schweregrad (blocker / major / minor), Ort, Beobachtung.

1. [major] <Datei/Seite> — <Beobachtung>
2. [minor] <Datei/Seite> — <Beobachtung>

## Fixes

Für jeden Finding: Was wurde getan, in welchem Commit, Verifikation.

| Finding | Fix-Commit | Verifikation |
|---|---|---|
| 1 | `<sha>` | erneuter Playwright-Lauf grün, Screenshot aktualisiert |
| 2 | `<sha>` | … |

Review-Fix-Review-Schleife (REQ-NF-003): Nach jedem Fix muss derselbe E2E-Lauf erneut
laufen und der Screenshot der betroffenen Seite ersetzt werden.

## Finaler Status

- [ ] Alle Pflicht-Seiten gerendert (main + h1 sichtbar)
- [ ] Alle Findings adressiert oder als bewusstes "Defer to <Iteration-ID>" dokumentiert
- [ ] `npm test` grün
- [ ] `npm run test:e2e` grün
- [ ] Plan-Datei aktualisiert (Status: done)
- [ ] Final-Report-Eintrag im Master-Plan ergänzt (REQ-O-001)

**Abnahme:** <ja / nein> — <Name>, <YYYY-MM-DD>
```

b) `docs/qa/2026-05-22-i0-playwright-baseline.md` (konkrete Erst-Ausfüllung für I0):

```markdown
# Iteration Review — I0 (QA-Gate & Playwright Baseline)

**Iteration:** I0
**Datum:** 2026-05-22
**Reviewer:** Ben Poersch
**Plan-Referenz:** `docs/plans/2026-05-22-i0-qa-gate-playwright.md`
**Master-Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`

---

## Ziel

Harte Abnahmepipeline einführen: Playwright als Pflicht-Live-Browser-Gate + standardisiertes
Review-Template. Noch keine sichtbare Produktveränderung für den Nutzer, aber ab jetzt gilt:
keine Iteration ist "fertig" ohne grünen E2E-Lauf, Screenshots, optisches Review und Code
Review. Schließt REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-O-001, REQ-S-001.

## Testcommands

```bash
# Unit + Integration
npm test

# Live-Browser-Gate (startet Server automatisch via webServer-Config)
APP_BASE_URL=http://127.0.0.1:3000 npm run test:e2e

# Optional: visuelle Verifikation
npm run test:e2e:headed
```

Ergebnis:

```
<wird beim Lauf ausgefüllt — z.B. "11 passed (12.3s)">
```

## Browser / Viewport

| Feld | Wert |
|---|---|
| Browser | Chromium (Playwright managed) |
| Version | <wird beim Lauf ausgefüllt> |
| Viewport | 1440 x 900 |
| OS | <wird beim Lauf ausgefüllt> |
| Node | <wird beim Lauf ausgefüllt — `node -v`> |

## Screenshots

Pfad: `docs/qa/screenshots/i0-smoke/`

| Seite | Datei | Status |
|---|---|---|
| Root / Dashboard | `01-root.png` | <OK/NOK> |
| Overview | `02-overview.png` | <OK/NOK> |
| BaZi | `03-bazi.png` | <OK/NOK> |
| Western | `04-western.png` | <OK/NOK> |
| Wu-Xing | `05-wuxing.png` | <OK/NOK> |
| Fusion | `06-fusion.png` | <OK/NOK> |
| Tagespuls | `07-tagespuls.png` | <OK/NOK> |
| Haeuser | `08-haeuser.png` | <OK/NOK> |
| Beziehung | `09-beziehung.png` | <OK/NOK> |
| Daten | `10-daten.png` | <OK/NOK> |
| Methode | `11-methode.png` | <OK/NOK> |

Hinweis (REQ-S-001): Nur synthetische Testdaten. Keine echten Geburtsdaten / Tokens
in Screenshots.

## Optischer Review

I0 ist ein Infrastruktur-Sprint — der optische Review konzentriert sich auf:

- Lädt jede Route überhaupt ohne JS-Error?
- Ist `<main>` und ein `<h1>` sichtbar?
- Stimmt die Hash-Route mit der gemounteten Page überein?

Pro Seite konkret (wird beim Lauf ausgefüllt):

- Root: ...
- Overview: ...
- BaZi: ...
- Western: ...
- Wu-Xing: ...
- Fusion: ...
- Tagespuls: ...
- Haeuser: ...
- Beziehung: ...
- Daten: ...
- Methode: ...

## Code Review

Geänderte Dateien:

- `package.json` — devDependency `@playwright/test`, neue Scripts `test:e2e*`.
- `playwright.config.mjs` — neu, headless Chromium, baseURL via `APP_BASE_URL`, webServer startet `npm start`.
- `test/e2e/smoke-main-pages.spec.js` — neu, 11 Smoke-Tests, Screenshots in `docs/qa/screenshots/i0-smoke/`.
- `test/qa-artifacts.test.js` — neu, prüft Existenz und Pflichtsektionen des Review-Templates und des I0-Reviews.
- `docs/qa/templates/iteration-review-template.md` — neu, Master-Template.
- `docs/qa/2026-05-22-i0-playwright-baseline.md` — dieses Dokument.
- `docs/qa/screenshots/.gitkeep` — neu.
- `.gitignore` — ergänzt um Playwright-Artefakte (`test-results/`, `playwright-report/`, `docs/qa/playwright-report/`).

Checkliste:

- [ ] Lesbar und in bestehender Code-Konvention (ESM, keine TS, keine neuen Runtime-Deps)
- [ ] Keine toten Imports / dead code
- [ ] Keine Console-Errors im Browser (DevTools-Check via `test:e2e:headed`)
- [ ] Keine Secrets / API-Keys im Diff
- [ ] Tests vorhanden und grün (`npm test` + `npm run test:e2e`)
- [ ] Plan-Status in `docs/plans/2026-05-22-frontend-correction-iterations.md` auf I0 = done gesetzt

## Findings

(Werden beim Lauf befüllt. Erwartet: ggf. einzelne Routen, die noch kein `<h1>` rendern —
diese werden NICHT in I0 gefixt, sondern als "Defer to I1+" markiert.)

1. [ ] ...

## Fixes

| Finding | Fix-Commit | Verifikation |
|---|---|---|
| – | – | – |

Review-Fix-Review-Schleife (REQ-NF-003): Falls in I0 selbst ein Finding gefixt wird,
muss der gesamte E2E-Lauf erneut grün sein bevor commit-finalisiert wird.

## Finaler Status

- [ ] Playwright lokal grün
- [ ] Screenshots aller 11 Hauptseiten unter `docs/qa/screenshots/i0-smoke/` committet
- [ ] `npm test` grün
- [ ] `npm run test:e2e` grün
- [ ] Plan-Datei (`docs/plans/2026-05-22-i0-qa-gate-playwright.md`) als done markiert
- [ ] Master-Plan-Eintrag (REQ-O-001) für I0 ergänzt

**Abnahme:** <ja / nein> — Ben Poersch, 2026-05-22
```

**Step 4: Run test to verify it passes**

Run:
```bash
node --test test/qa-artifacts.test.js
```

Expected: PASS — beide Tests grün.

Zusätzlich Gesamtlauf:
```bash
npm test
npm run test:e2e
```

Expected:
- `npm test` PASS (inkl. neuer `qa-artifacts.test.js`).
- `npm run test:e2e` PASS für `01-root`; übrige Routen entweder PASS oder als Finding im Review-Log dokumentiert.

**Step 5: Commit**

```bash
git add docs/qa/templates/iteration-review-template.md docs/qa/2026-05-22-i0-playwright-baseline.md test/qa-artifacts.test.js
git commit -m "docs(qa): add iteration-review template + I0 baseline review log"
```

---

## Iteration Definition of Done

Alle Punkte müssen erfüllt sein, bevor I0 als abgeschlossen gilt:

- [ ] `@playwright/test` ist devDependency in `package.json` und `package-lock.json` ist aktualisiert.
- [ ] `npx playwright install chromium` wurde mindestens einmal lokal ausgeführt.
- [ ] `playwright.config.mjs` existiert im Repo-Root, `webServer` startet `npm start` automatisch, `baseURL` liest `APP_BASE_URL`.
- [ ] `test/e2e/smoke-main-pages.spec.js` enthält 11 Routen-Tests, jeder mit `<main>`-Check, `<h1>`-Check und Screenshot.
- [ ] `npm run test:e2e` läuft lokal und endet mit Exit-Code 0 ODER alle Failures sind im I0-Review-Log als bewusst deferred dokumentiert.
- [ ] `docs/qa/screenshots/i0-smoke/` enthält die 11 erwarteten PNGs (oder das Subset, das gerade rendern kann).
- [ ] `docs/qa/templates/iteration-review-template.md` existiert mit allen 9 Pflichtsektionen (Ziel, Testcommands, Browser/Viewport, Screenshots, Optischer Review, Code Review, Findings, Fixes, Finaler Status).
- [ ] `docs/qa/2026-05-22-i0-playwright-baseline.md` ist nach Template ausgefüllt.
- [ ] `test/qa-artifacts.test.js` ist grün und Teil von `npm test`.
- [ ] `.gitignore` ignoriert `test-results/`, `playwright-report/`, `docs/qa/playwright-report/`, aber NICHT `docs/qa/screenshots/`.
- [ ] Keine Secrets / echten Personendaten in committeten Screenshots (REQ-S-001).
- [ ] Master-Plan `docs/plans/2026-05-22-frontend-correction-iterations.md` markiert I0 als done (REQ-O-001).

## Validation strategy

Exakte Befehle, in genau dieser Reihenfolge:

```bash
# 1. Unit + Integration inklusive neuer QA-Artefakt-Tests
npm test

# 2. Live-Browser-Gate (startet Server automatisch via webServer-Config)
APP_BASE_URL=http://127.0.0.1:3000 npm run test:e2e

# 3. Visuelle Verifikation (optional, wenn Findings unklar sind)
npm run test:e2e:headed

# 4. Sicherstellen, dass Screenshots committet sind
ls -la docs/qa/screenshots/i0-smoke/
git status docs/qa/screenshots/i0-smoke/

# 5. Sicherstellen, dass das Review-Log ausgefüllt ist
node --test test/qa-artifacts.test.js

# 6. Final: Health-Check des Servers (Sanity)
curl -fsS http://127.0.0.1:3000/health
```

Alle 6 Schritte müssen Exit-Code 0 zurückgeben (Schritt 3 ist optional). Erst dann
wird der I0-Review-Log unter `## Finaler Status` mit "Abnahme: ja" abgeschlossen.

## Rollback note

I0 ist additiv und führt keine Produktveränderungen ein. Vollständiger Rollback:

```bash
git revert <commit-sha-task-1> <commit-sha-task-2>
# oder bei lokalem Zurücksetzen vor Push:
git reset --hard <sha-vor-i0>
```

Manuelle Cleanup-Schritte falls nötig:

```bash
npm uninstall @playwright/test
rm -rf playwright.config.mjs test/e2e docs/qa/templates docs/qa/screenshots docs/qa/2026-05-22-i0-playwright-baseline.md docs/qa/playwright-report test-results
```

Die produktive App (`server.js`, `public/**`) bleibt unverändert; ein Rollback hat
keine Auswirkungen auf den Nutzer, sondern entfernt nur die QA-Infrastruktur.

## Handoff to next iteration: I1

I1 baut auf I0 auf und ist OHNE I0 nicht abnahmefähig. Konkret:

- Ab I1 ist `npm run test:e2e` Pflichtbestandteil jeder PR-Definition-of-Done.
- I1 erweitert `test/e2e/smoke-main-pages.spec.js` NICHT — stattdessen werden pro
  I1-Feature neue Specs unter `test/e2e/<feature>.spec.js` ergänzt.
- I1 nutzt das Template `docs/qa/templates/iteration-review-template.md` und legt
  `docs/qa/<YYYY-MM-DD>-i1-<slug>.md` an.
- Screenshots aus I1 landen unter `docs/qa/screenshots/i1-<sub>/`.
- Jeder in I0 als "Defer to I1+" markierte Finding (z.B. Routen ohne `<h1>`) muss in
  I1 entweder behoben oder explizit auf eine spätere Iteration verschoben werden —
  Liste am Anfang des I1-Plans aufnehmen.
- Master-Plan-Eintrag (REQ-O-001) für I0 = done wird zum Startsignal für I1.
