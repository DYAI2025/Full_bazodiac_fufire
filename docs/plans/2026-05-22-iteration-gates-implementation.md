# Iteration-Gates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Operationalize the binding QA-gate rules from `bazodiac-goal-iteration-gates.md` + `bazodiac-dev-brief-iteration-gates.md` so every future Bazodiac frontend iteration ships with `/goal` block, TDD-first proof, Playwright live test in 4 variants (desktop/mobile × dark/light), visual + code review, and BLOCKED/PASS verdict — and close the three concrete iterations the brief names (global light-mode contrast, BaZi restructure, font consolidation).

**Architecture:** Two phases. **Phase A** extends existing scaffolding once (playwright config gets a mobile project + theme helper, QA template gets `/goal` block and 4-variant matrix, screenshot helper enforces dark+light × desktop+mobile). **Phase B** runs three QA-gated frontend iterations on top of that scaffolding. No backend changes. No new runtime deps. Theme switching uses the existing `<html data-theme="planetarium|morning">` attribute + `localStorage['bz-theme']` mechanism in `public/src/components/ThemeToggle.js`.

**Tech Stack:** Node ≥20, vanilla ESM frontend (no bundler), Playwright 1.60+ (already installed), `node --test` for unit/integration, hash router (`public/src/router.js`), existing ThemeToggle component.

---

## Phase A — Gate Infrastructure (one-time)

Outcome: any future iteration can call one helper for 4-variant Playwright capture, write the `/goal` block from a template snippet, and produce a QA report that already encodes the Critical/Major/PASS rule.

### Task A1: Pin contract test for playwright.config 4-variant matrix

**Files:**
- Test: `test/playwright_config.test.js` (create)

**Step 1: Write failing unit test**

```js
// test/playwright_config.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG = readFileSync(resolve(HERE, '..', 'playwright.config.mjs'), 'utf8');

test('playwright.config declares chromium-desktop and chromium-mobile projects', () => {
  assert.match(CONFIG, /name:\s*['"]chromium-desktop['"]/, 'missing chromium-desktop project');
  assert.match(CONFIG, /name:\s*['"]chromium-mobile['"]/, 'missing chromium-mobile project');
});

test('playwright.config exposes Pixel 7 (or comparable) mobile device', () => {
  assert.match(CONFIG, /devices\[['"]Pixel 7['"]\]/, 'mobile project must use Pixel 7 device');
});

test('playwright.config keeps webServer reuseExistingServer=true', () => {
  assert.match(CONFIG, /reuseExistingServer:\s*true/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/playwright_config.test.js`
Expected: FAIL — `missing chromium-desktop project` (current config only has `chromium`).

**Step 3: Update playwright.config.mjs**

Replace the `projects` array in `playwright.config.mjs` (lines 32–37):

```js
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
```

**Step 4: Run test to verify it passes**

Run: `node --test test/playwright_config.test.js`
Expected: PASS — 3/3.

**Step 5: Commit**

```bash
git add test/playwright_config.test.js playwright.config.mjs
git commit -m "test(e2e): pin playwright.config 4-variant matrix (desktop + mobile projects)"
```

---

### Task A2: Add `setTheme()` Playwright helper

**Files:**
- Create: `test/e2e/_helpers/theme.js`
- Test: `test/e2e/_helpers/theme.spec.js`

**Step 1: Write failing e2e helper test**

```js
// test/e2e/_helpers/theme.spec.js
import { test, expect } from '@playwright/test';
import { setTheme } from './theme.js';

test('setTheme("morning") writes data-theme=morning before first render', async ({ page }) => {
  await setTheme(page, 'morning');
  await page.goto('/');
  const attr = await page.locator('html').getAttribute('data-theme');
  expect(attr).toBe('morning');
});

test('setTheme("planetarium") writes data-theme=planetarium', async ({ page }) => {
  await setTheme(page, 'planetarium');
  await page.goto('/');
  const attr = await page.locator('html').getAttribute('data-theme');
  expect(attr).toBe('planetarium');
});
```

**Step 2: Run test to verify it fails**

Run: `PORT=4100 npm run test:e2e -- test/e2e/_helpers/theme.spec.js`
Expected: FAIL — `Cannot find module './theme.js'`.

**Step 3: Implement helper**

```js
// test/e2e/_helpers/theme.js
// Force ThemeToggle state BEFORE the SPA boots, so the very first render
// already uses the requested theme (no flash, no post-load mutation).
// Storage key + values mirror public/src/components/ThemeToggle.js.

const VALID = new Set(['planetarium', 'morning', 'system']);

export async function setTheme(page, value) {
  if (!VALID.has(value)) throw new Error(`unknown theme: ${value}`);
  await page.addInitScript((v) => {
    try { localStorage.setItem('bz-theme', v); } catch {}
    // Pre-set data-theme so first paint is correct even before ThemeToggle mounts.
    if (v !== 'system') {
      document.documentElement.setAttribute('data-theme', v);
    }
  }, value);
}
```

**Step 4: Run test to verify it passes**

Run: `PORT=4100 npm run test:e2e -- test/e2e/_helpers/theme.spec.js`
Expected: PASS — 2/2.

**Step 5: Commit**

```bash
git add test/e2e/_helpers/theme.js test/e2e/_helpers/theme.spec.js
git commit -m "test(e2e): add setTheme() helper for dark/light gate runs"
```

---

### Task A3: Add `captureMatrix()` screenshot helper

**Files:**
- Create: `test/e2e/_helpers/capture.js`
- Test: `test/e2e/_helpers/capture.spec.js`

**Step 1: Write failing test**

```js
// test/e2e/_helpers/capture.spec.js
import { test, expect } from '@playwright/test';
import { existsSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { captureMatrix } from './capture.js';

const OUT = 'docs/qa/screenshots/_helper-smoke';

test.beforeAll(() => { try { rmSync(OUT, { recursive: true }); } catch {} });

test('captureMatrix writes 4 non-empty PNGs (desktop+mobile × dark+light)', async ({ browser }) => {
  await captureMatrix({ browser, page: 'overview', path: '/#/overview', dir: OUT });
  for (const name of [
    'overview-desktop-dark.png',
    'overview-desktop-light.png',
    'overview-mobile-dark.png',
    'overview-mobile-light.png',
  ]) {
    const p = join(OUT, name);
    expect(existsSync(p), `missing ${name}`).toBe(true);
    expect(statSync(p).size, `${name} is empty`).toBeGreaterThan(5_000);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `PORT=4100 npm run test:e2e -- test/e2e/_helpers/capture.spec.js`
Expected: FAIL — `Cannot find module './capture.js'`.

**Step 3: Implement helper**

```js
// test/e2e/_helpers/capture.js
// 4-variant screenshot capture (REQ from dev-brief §2.4):
//   <page>-desktop-dark.png
//   <page>-desktop-light.png
//   <page>-mobile-dark.png
//   <page>-mobile-light.png
import { devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTheme } from './theme.js';

const VIEWPORTS = {
  desktop: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
  mobile:  { ...devices['Pixel 7'] },
};
const THEMES = { dark: 'planetarium', light: 'morning' };

export async function captureMatrix({ browser, page: pageSlug, path, dir, beforeShot }) {
  mkdirSync(dir, { recursive: true });
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    for (const [themeName, themeVal] of Object.entries(THEMES)) {
      const ctx = await browser.newContext({ ...vp });
      const p = await ctx.newPage();
      await setTheme(p, themeVal);
      await p.goto(path, { waitUntil: 'load' });
      await p.locator('#app > *').first().waitFor({ state: 'attached', timeout: 10_000 });
      if (typeof beforeShot === 'function') await beforeShot(p);
      await p.screenshot({
        path: join(dir, `${pageSlug}-${vpName}-${themeName}.png`),
        fullPage: true,
      });
      await ctx.close();
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `PORT=4100 npm run test:e2e -- test/e2e/_helpers/capture.spec.js`
Expected: PASS — 1/1, 4 PNGs each >5 kB.

**Step 5: Commit**

```bash
git add test/e2e/_helpers/capture.js test/e2e/_helpers/capture.spec.js
git commit -m "test(e2e): captureMatrix() helper — 4-variant screenshot capture per page"
```

---

### Task A4: Update QA report template per new dev brief

**Files:**
- Modify: `docs/qa/templates/iteration-review-template.md` (full rewrite)

**Step 1: Write contract test that pins template structure**

Create `test/qa_template.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TPL = readFileSync('docs/qa/templates/iteration-review-template.md', 'utf8');

const REQUIRED_HEADINGS = [
  '## /goal',
  '## Implementierte Aenderungen',
  '## Testbefehle',
  '## Playwright-Live-Test',
  '## Screenshots',
  '## Optischer Review',
  '## Code Review',
  '## Fix-Runden',
  '## Abschlussstatus',
  '## Offene Minor Findings',
];

for (const h of REQUIRED_HEADINGS) {
  test(`template contains "${h}"`, () => {
    assert.ok(TPL.includes(h), `missing heading: ${h}`);
  });
}

test('template encodes BLOCKED rule', () => {
  assert.match(TPL, /BLOCKED/);
});

test('template lists 4-variant screenshot filenames', () => {
  assert.match(TPL, /desktop-dark\.png/);
  assert.match(TPL, /desktop-light\.png/);
  assert.match(TPL, /mobile-dark\.png/);
  assert.match(TPL, /mobile-light\.png/);
});

test('template encodes Critical/Major zero-finding rule', () => {
  assert.match(TPL, /0\s+offene\s+Critical/i);
  assert.match(TPL, /0\s+offene\s+Major/i);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/qa_template.test.js`
Expected: FAIL — `missing heading: ## /goal`, mobile-dark.png missing, etc.

**Step 3: Rewrite `docs/qa/templates/iteration-review-template.md`**

Full new contents:

```markdown
# QA Report: <ITERATION-ID> — <Titel>

> Pflicht-Artefakt. Gilt für jede Frontend-/Content-Iteration nach
> `docs/plans/2026-05-22-iteration-gates-implementation.md` und
> `bazodiac-dev-brief-iteration-gates.md`.
> Pfad-Konvention: `docs/qa/<YYYY-MM-DD>-<iteration-slug>.md`.

**Iteration:** <ITERATION-ID>
**Datum:** <YYYY-MM-DD>
**Reviewer:** <Name / Rolle>
**Plan-Referenz:** `docs/plans/<YYYY-MM-DD>-<iteration-slug>.md`

---

## /goal

```
/goal
Goal: <max. 80 Zeichen>

Ziel. <2-4 Saetze, Nutzerwert + Grund>

Scope. <Dateien / Seiten / Komponenten>

Bedingungen (hart).
- TDD-first: Vor Implementierung muss ein fehlschlagender Test existieren.
- Kein Sprintabschluss ohne Playwright-Live-Test, Screenshots und Code Review.
- Review-Fix-Review wird wiederholt, bis keine Critical/Major Findings offen sind.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte, keine Backend-Architekturverletzung.

Akzeptanzkriterien.
- <messbar>
- <messbar>
- <messbar>

Explizit out-of-scope.
- <Ausschluss>

Done-Definition. Iteration nur abgeschlossen wenn Tests, Playwright-Live-Test,
Screenshot-Matrix, optischer Review und Code Review bestanden sind.
```

Zeichenzahl: <unter 4000>

## Implementierte Aenderungen

- <bullet pro file/concern>

## Testbefehle

```bash
npm test
PORT=4100 npm run test:e2e
```

Ergebnis:

```
<X passed, Y failed>
```

## Playwright-Live-Test

| Feld | Wert |
|---|---|
| URL | http://127.0.0.1:4100 |
| Projects | chromium-desktop, chromium-mobile |
| Themes | planetarium (dark), morning (light) |
| Ergebnis | <X passed / Y failed> |

## Screenshots

Pfad: `docs/qa/screenshots/<iteration-slug>/`

Pflicht-Matrix pro betroffener Seite:

| Seite | desktop-dark | desktop-light | mobile-dark | mobile-light |
|---|---|---|---|---|
| <page> | `<page>-desktop-dark.png` | `<page>-desktop-light.png` | `<page>-mobile-dark.png` | `<page>-mobile-light.png` |

Bei Interaktionen zusaetzlich `<page>-interaction-before.png`, `<page>-interaction-after.png`, `<page>-expanded-state.png`, `<page>-fallback-state.png`.

Hinweis: Keine Secrets, Tokens, echten Personendaten. Nur synthetische Profile.

## Optischer Review

Pruefpunkte (pro Seite kommentieren):

- Geplante Nutzerveraenderung sichtbar?
- Layout / Form / Farbe / Font-Balance konsistent?
- Light und Dark Mode lesbar (Kontrast)?
- Mobile-Regression vorhanden?
- Inhalte verstaendlich, nicht ueberladen?
- Interne Feldnamen / Debug-Artefakte sichtbar?

Findings:

- [Critical] <Ort> — <Beobachtung>
- [Major]    <Ort> — <Beobachtung>
- [Minor]    <Ort> — <Beobachtung>

## Code Review

Pruefliste:

- [ ] keine Backend-Architekturverletzung
- [ ] keine neuen Runtime-Dependencies ohne Entscheidung
- [ ] keine hardcodierten astrologischen Werte
- [ ] keine Fake-Fallbacks / 0-Grad-Longitudes
- [ ] keine sichtbaren internen Feldnamen auf Nutzerseiten
- [ ] keine CSS-Token-Konflikte zwischen Light/Dark
- [ ] keine toten Komponenten / duplizierte Mappings
- [ ] keine Secrets / privaten Daten
- [ ] Tests pruefen Anforderung, nicht nur DOM-Existenz

Findings:

- [Critical] `path/file.js:NN` — <Beobachtung>
- [Major]    `path/file.js:NN` — <Beobachtung>
- [Minor]    `path/file.js:NN` — <Beobachtung>

## Fix-Runden

| Runde | Finding-ID | Fix-Commit | Re-Run Ergebnis |
|---|---|---|---|
| 1 | <ID> | `<sha>` | PASS / FAIL |
| 2 | <ID> | `<sha>` | PASS / FAIL |

Regel: Review-Fix-Review wird wiederholt bis

```
0 offene Critical Findings
0 offene Major Findings
```

## Abschlussstatus

- [ ] `/goal` vorhanden und unter 4000 Zeichen
- [ ] TDD-Nachweis vorhanden (Test war zuerst rot)
- [ ] `npm test` gruen
- [ ] `PORT=4100 npm run test:e2e` gruen (desktop + mobile)
- [ ] Screenshot-Matrix vollstaendig
- [ ] Optischer Review bestanden, 0 Critical, 0 Major
- [ ] Code Review bestanden, 0 Critical, 0 Major
- [ ] QA-Bericht aktualisiert

Status: **PASS** oder **BLOCKED**

Bei BLOCKED: konkrete Begruendung pro fehlender Bedingung.

## Offene Minor Findings

- <Minor mit Owner + Ziel-Iteration>
```

**Step 4: Run test to verify it passes**

Run: `node --test test/qa_template.test.js`
Expected: PASS — all headings + filenames + BLOCKED + Critical/Major rules present.

**Step 5: Run full suite to confirm nothing broke**

Run: `npm test`
Expected: PASS across all unit/integration files.

**Step 6: Commit**

```bash
git add docs/qa/templates/iteration-review-template.md test/qa_template.test.js
git commit -m "docs(qa): align iteration-review template with new gate brief (/goal, 4-variant matrix, Critical/Major rule)"
```

---

### Task A5: Add `/goal` snippet template

**Files:**
- Create: `docs/qa/templates/goal-block.md`

**Step 1: Write failing length-contract test**

```js
// test/goal_block.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TPL = readFileSync('docs/qa/templates/goal-block.md', 'utf8');

test('goal-block template fits under 4000 Unicode chars', () => {
  assert.ok([...TPL].length < 4000, `template is ${[...TPL].length} chars`);
});

test('goal-block template forbids vague words', () => {
  for (const w of ['vielleicht', 'eventuell', 'sollte', 'koennte']) {
    assert.ok(!TPL.toLowerCase().includes(w), `template contains forbidden word: ${w}`);
  }
});

test('goal-block template carries required section markers', () => {
  for (const m of ['Goal:', 'Ziel.', 'Scope.', 'Bedingungen (hart).',
                    'Akzeptanzkriterien.', 'Explizit out-of-scope.', 'Done-Definition.']) {
    assert.ok(TPL.includes(m), `missing marker: ${m}`);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/goal_block.test.js`
Expected: FAIL — `ENOENT: docs/qa/templates/goal-block.md`.

**Step 3: Create snippet**

```markdown
/goal
Goal: <max. 80 Zeichen, Imperativ>

Ziel. <Was sieht der Nutzer am Ende? Welcher Nutzerwert wird geliefert?
2-4 Saetze, ohne vage Worte.>

Scope. <Konkrete Dateien, Seiten, Komponenten, Grenzen.>

Bedingungen (hart).
- TDD-first: Vor jeder fachlichen Aenderung existiert ein fehlschlagender Test.
- Kein Abschluss ohne Playwright-Live-Test gegen laufende App.
- Screenshot-Matrix (desktop-dark, desktop-light, mobile-dark, mobile-light) pro betroffener Seite.
- Optischer Review nach Screenshots.
- Code Review nach optischem Review.
- Review-Fix-Review wird wiederholt bis 0 Critical / 0 Major Findings offen sind.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte.
- Keine 0-Grad-Fallbacks fuer fehlende Longitudes.
- Keine Backend-Architekturverletzung, keine neue DB-Migration, keine neue Runtime-Dependency ohne Entscheidung.

Akzeptanzkriterien.
- <messbares Kriterium 1>
- <messbares Kriterium 2>
- <messbares Kriterium 3>

Explizit out-of-scope.
- Kein Backend-Refactor.
- Keine neue astrologische Berechnung im Frontend.
- Keine neue externe UI-Framework-Migration.
- Kein Polish ohne Daten- und Review-Nachweis.

Done-Definition. Iteration nur abgeschlossen wenn:
`/goal` vorhanden + unter 4000 Zeichen, TDD-Nachweis vorhanden, `npm test` gruen,
Playwright-Live-Test gruen (desktop + mobile, dark + light), Screenshot-Matrix komplett,
optischer Review bestanden, Code Review bestanden, 0 offene Critical/Major Findings,
QA-Bericht aktualisiert.

Reference-Doc: docs/qa/<YYYY-MM-DD>-<iteration-slug>.md
```

**Step 4: Run test to verify it passes**

Run: `node --test test/goal_block.test.js`
Expected: PASS — 3/3.

**Step 5: Commit**

```bash
git add docs/qa/templates/goal-block.md test/goal_block.test.js
git commit -m "docs(qa): add /goal block snippet (under 4000 chars, vague-word filter)"
```

---

### Task A6: Pin `test:e2e` to run both projects

**Files:**
- Modify: `package.json` — extend `test:e2e` script
- Test: `test/package_scripts.test.js`

**Step 1: Write failing contract test**

```js
// test/package_scripts.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PKG = JSON.parse(readFileSync('package.json', 'utf8'));

test('test:e2e runs without --project filter so both projects execute', () => {
  assert.match(PKG.scripts['test:e2e'], /^playwright test/);
  assert.ok(!PKG.scripts['test:e2e'].includes('--project'),
    'test:e2e must NOT pin --project — must run desktop + mobile together');
});

test('test:e2e:desktop convenience script exists', () => {
  assert.match(PKG.scripts['test:e2e:desktop'] || '', /--project=chromium-desktop/);
});

test('test:e2e:mobile convenience script exists', () => {
  assert.match(PKG.scripts['test:e2e:mobile'] || '', /--project=chromium-mobile/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/package_scripts.test.js`
Expected: FAIL — `test:e2e:desktop` / `test:e2e:mobile` missing.

**Step 3: Edit `package.json` scripts**

Add to the scripts block (keep existing `test:e2e`, add two more):

```json
    "test:e2e": "playwright test --config=playwright.config.mjs",
    "test:e2e:desktop": "playwright test --config=playwright.config.mjs --project=chromium-desktop",
    "test:e2e:mobile": "playwright test --config=playwright.config.mjs --project=chromium-mobile",
```

**Step 4: Run test to verify it passes**

Run: `node --test test/package_scripts.test.js`
Expected: PASS — 3/3.

**Step 5: Run full suite + e2e smoke**

```bash
npm test
PORT=4100 npm run test:e2e -- test/e2e/_helpers/capture.spec.js
```
Expected: both green.

**Step 6: Commit**

```bash
git add package.json test/package_scripts.test.js
git commit -m "chore(scripts): add test:e2e:desktop and test:e2e:mobile convenience scripts"
```

---

## Phase B — Iteration Backlog

Each iteration below is a self-contained QA-gated unit. Each starts with a `/goal` block, runs TDD-first, finishes with `PASS` only when every gate is green. Use the helpers + templates from Phase A.

> **Per iteration, before any code:** copy `docs/qa/templates/goal-block.md` → fill it → save as the first section of `docs/qa/<YYYY-MM-DD>-<iteration-slug>.md` → commit before writing the failing test.

---

### Iteration B1: Global Light-Mode Contrast Fix

**Slug:** `b1-light-mode-contrast`
**Trigger:** dev brief §7 — light mode currently produces unreadable text on dark cards because dark-card components inherit global text tokens that flip to dark in `data-theme="morning"`.

**Pages in scope (8):** Übersicht, Karten/BaZi, Western, Wu-Xing, Tagespuls, Beziehung, Daten, Methode.

**Files (initial estimate — verify in step 1):**
- Search: `public/src/components/*Card*.js`, `public/index.html` `<style>` block, any `--card-bg-dark` token usage
- Modify: token definitions (likely `public/main.css` or `public/src/styles/*.css`) to introduce `--card-text-on-dark` that does NOT flip between themes
- Modify: each affected dark-card component to use `--card-text-on-dark` instead of the global `--text` token

**Step 1: Write `/goal` block + commit**

Fill `docs/qa/templates/goal-block.md` → `docs/qa/2026-05-22-b1-light-mode-contrast.md`. Acceptance criteria must include:

- All 8 pages render readable text on every dark card in `data-theme="morning"`.
- No text node on dark cards has computed `color` luminance ≥ 0.5 against its background.
- Token `--card-text-on-dark` exists and is theme-invariant.

```bash
git add docs/qa/2026-05-22-b1-light-mode-contrast.md
git commit -m "docs(qa): /goal block B1 light-mode contrast"
```

**Step 2: Write failing e2e contrast test**

Create `test/e2e/b1-light-mode-contrast.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { setTheme } from './_helpers/theme.js';
import { captureMatrix } from './_helpers/capture.js';

const PAGES = [
  { slug: 'overview', path: '/#/overview', label: 'Uebersicht' },
  { slug: 'bazi',     path: '/#/bazi',     label: 'Karten/BaZi' },
  { slug: 'western',  path: '/#/western',  label: 'Western' },
  { slug: 'wuxing',   path: '/#/wuxing',   label: 'Wu-Xing' },
  { slug: 'daily',    path: '/#/daily',    label: 'Tagespuls' },
  { slug: 'synastry', path: '/#/synastry', label: 'Beziehung' },
  { slug: 'input',    path: '/',           label: 'Daten' },
  { slug: 'method',   path: '/#/method',   label: 'Methode' },
];

const DIR = 'docs/qa/screenshots/b1-light-mode-contrast';

// Luminance helper — sRGB → relative luminance per WCAG.
function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

for (const page of PAGES) {
  test(`B1 ${page.label} — dark cards stay readable in light mode`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await setTheme(p, 'morning');
    await p.goto(page.path, { waitUntil: 'load' });
    await p.locator('#app > *').first().waitFor({ state: 'attached', timeout: 10_000 });

    // Find every element that has a dark background in light mode.
    const offenders = await p.evaluate(() => {
      const out = [];
      const all = document.querySelectorAll('#app *');
      for (const el of all) {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        if (!bg.startsWith('rgb')) continue;
        const [r, g, b] = bg.match(/\d+/g).slice(0, 3).map(Number);
        const bgLum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        if (bgLum > 0.35) continue; // not a dark card
        const text = el.innerText?.trim();
        if (!text || text.length < 2) continue;
        const fg = cs.color;
        const [fr, fg2, fb] = fg.match(/\d+/g).slice(0, 3).map(Number);
        const fgLum = (fr * 0.299 + fg2 * 0.587 + fb * 0.114) / 255;
        // Both background dark AND foreground dark → unreadable.
        if (fgLum < 0.5) {
          out.push({
            tag: el.tagName,
            cls: el.className?.toString().slice(0, 60),
            bg, fg,
            sample: text.slice(0, 40),
          });
        }
      }
      return out;
    });

    await captureMatrix({ browser, page: page.slug, path: page.path, dir: DIR });
    await ctx.close();

    expect(offenders, `${page.label} has unreadable text on dark cards:\n${JSON.stringify(offenders, null, 2)}`).toEqual([]);
  });
}
```

**Step 3: Run test to verify it fails**

Run: `PORT=4100 npm run test:e2e -- test/e2e/b1-light-mode-contrast.spec.js`
Expected: FAIL on most/all pages — offenders list populated, screenshots captured under `docs/qa/screenshots/b1-light-mode-contrast/`.

**Step 4: Inspect screenshots to confirm the visual defect**

Open `docs/qa/screenshots/b1-light-mode-contrast/<page>-desktop-light.png` for each page. Confirm the dark card with dark text matches one of the test offenders.

**Step 5: Introduce theme-invariant token**

Edit the central token file (find via `grep -rn "\-\-text:" public/`):

```css
:root,
:root[data-theme="planetarium"],
:root[data-theme="morning"] {
  --card-text-on-dark: oklch(0.96 0 0);      /* near-white, theme-invariant */
  --card-text-on-dark-muted: oklch(0.78 0 0);
}
```

**Step 6: Switch every dark-card component to the invariant token**

For each component file under `public/src/components/*Card*.js` (and any CSS rule that targets `.card--dark`, `.impulse-card`, etc.), replace `color: var(--text)` with `color: var(--card-text-on-dark)` and `color: var(--text-muted)` with `color: var(--card-text-on-dark-muted)`.

> **Cite specific files in the QA report with line numbers** so the code review can verify each replacement.

**Step 7: Re-run focused e2e**

Run: `PORT=4100 npm run test:e2e -- test/e2e/b1-light-mode-contrast.spec.js`
Expected: PASS for all 8 pages.

**Step 8: Run full suite**

Run: `npm test && PORT=4100 npm run test:e2e`
Expected: all green.

**Step 9: Visual review**

Open each `<page>-desktop-light.png` and `<page>-mobile-light.png`. Confirm:
- Card text is readable
- No layout shift introduced
- Dark-mode screenshots unchanged vs. previous iteration

Record findings in the QA report under `## Optischer Review`. Critical/Major → fix → re-run from step 7.

**Step 10: Code review**

Walk the diff (`git diff main...HEAD`). Verify the Code-Review checklist in the QA template. Record findings under `## Code Review`. Critical/Major → fix → re-run from step 7.

**Step 11: Finalise QA report + commit**

Fill all sections of `docs/qa/2026-05-22-b1-light-mode-contrast.md`. Set status `PASS`. Commit screenshots + tests + code + report:

```bash
git add public/ test/e2e/b1-light-mode-contrast.spec.js \
        docs/qa/2026-05-22-b1-light-mode-contrast.md \
        docs/qa/screenshots/b1-light-mode-contrast/
git commit -m "fix(theme): invariant card-text-on-dark token — B1 contrast PASS"
```

---

### Iteration B2: BaZi Page Restructure

**Slug:** `b2-bazi-restructure`
**Trigger:** dev brief §8 — BaZi page is currently overloaded and lacks the "less info, more order" structure (Day Master core → 4 pillars line → shared detail panel → patterns → provenance → fusion linkage).

**Files:**
- Modify: `public/src/pages/BaziPage.js`
- Possibly modify: `public/src/components/BaziImpulseCard.js`, related Day-Master / pillar renderers
- New: e2e `test/e2e/b2-bazi-restructure.spec.js`
- New: QA report `docs/qa/2026-05-22-b2-bazi-restructure.md`

**Step 1: Write `/goal` block**

Acceptance criteria (translate the dev-brief §8 DoD into testable bullets):

- Page has exactly one Day-Master block marked as "Kern".
- Page has exactly 4 pillar cards (Jahr/Monat/Tag/Stunde), equal height, single horizontal row at ≥ 1024 px viewport.
- A single shared detail panel sits under the pillar row (no per-card dropdowns).
- Narrative texts carry an explicit "Leseschluessel" marker, not absolute-truth phrasing.
- Each pillar shows its data source.
- Hidden Stems are labeled `API` or `aus Branch-Tabelle abgeleitet`.
- Glueckssaeule is removed OR marked `nicht von API geliefert`.
- Light + Dark Mode are both readable.
- Collapsed + expanded states are captured in screenshots.

Commit the goal block.

**Step 2: Write failing e2e structure test**

```js
// test/e2e/b2-bazi-restructure.spec.js
import { test, expect } from '@playwright/test';
import { setTheme } from './_helpers/theme.js';
import { captureMatrix } from './_helpers/capture.js';

const DIR = 'docs/qa/screenshots/b2-bazi-restructure';

test.beforeEach(async ({ page }) => {
  await setTheme(page, 'planetarium');
  // Seed a synthetic profile — no real personal data.
  await page.addInitScript(() => {
    sessionStorage.setItem('bazodiac:profile', JSON.stringify({
      bazi: {
        day_master: { stem: 'Yang Holz', element: 'Holz', source: 'api' },
        pillars: {
          year:  { stem: 'Yin Wasser', branch: 'Hase',   hidden_stems: { source: 'api' } },
          month: { stem: 'Yang Erde',  branch: 'Tiger',  hidden_stems: { source: 'derived' } },
          day:   { stem: 'Yang Holz',  branch: 'Affe',   hidden_stems: { source: 'api' } },
          hour:  { stem: 'Yin Metall', branch: 'Schwein',hidden_stems: { source: 'derived' } },
        },
      },
    }));
  });
});

test('B2 BaZi — Day Master is marked as Kern', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  const kern = page.locator('[data-bazi-role="day-master-kern"]');
  await expect(kern).toHaveCount(1);
  await expect(kern).toBeVisible();
});

test('B2 BaZi — exactly 4 pillar cards in a single row', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  const pillars = page.locator('[data-bazi-pillar]');
  await expect(pillars).toHaveCount(4);
  const boxes = await pillars.evaluateAll(els =>
    els.map(el => ({ y: el.getBoundingClientRect().top, h: el.getBoundingClientRect().height }))
  );
  const ys = boxes.map(b => b.y);
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(2); // same row
  const hs = boxes.map(b => b.h);
  expect(Math.max(...hs) - Math.min(...hs)).toBeLessThan(2); // equal height
});

test('B2 BaZi — single shared detail panel under pillars (not per-card dropdowns)', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await expect(page.locator('[data-bazi-shared-detail]')).toHaveCount(1);
  await expect(page.locator('[data-bazi-pillar] [data-bazi-pillar-dropdown]')).toHaveCount(0);
});

test('B2 BaZi — hidden stems carry source label', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  const labels = await page.locator('[data-bazi-hidden-stems-source]').allTextContents();
  expect(labels.length).toBe(4);
  for (const l of labels) {
    expect(l).toMatch(/API|aus Branch-Tabelle abgeleitet/);
  }
});

test('B2 BaZi — Glueckssaeule removed or marked nicht von API geliefert', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  const lucky = page.locator('[data-bazi-lucky-pillar]');
  const count = await lucky.count();
  if (count > 0) {
    await expect(lucky.first()).toContainText('nicht von API geliefert');
  }
});

test('B2 BaZi — narrative text marked as Leseschluessel', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await expect(page.locator('[data-bazi-narrative-marker]').first()).toBeVisible();
  await expect(page.locator('[data-bazi-narrative-marker]').first()).toContainText(/Leseschluessel/i);
});

test('B2 BaZi — captures collapsed + expanded screenshot matrix', async ({ browser }) => {
  await captureMatrix({
    browser, page: 'bazi-collapsed', path: '/#/bazi', dir: DIR,
  });
  await captureMatrix({
    browser, page: 'bazi-expanded', path: '/#/bazi', dir: DIR,
    beforeShot: async (p) => {
      await p.locator('[data-bazi-pillar]').first().click();
      await p.locator('[data-bazi-shared-detail][data-expanded="true"]').waitFor();
    },
  });
});
```

**Step 3: Run test to verify it fails**

Run: `PORT=4100 npm run test:e2e -- test/e2e/b2-bazi-restructure.spec.js`
Expected: FAIL on all assertions — none of the `data-bazi-*` markers exist yet.

**Step 4: Refactor `public/src/pages/BaziPage.js`**

Build the structure named in dev brief §8 Strukturziel. Add the missing `data-bazi-*` hooks. Keep narrative text but tag it with `data-bazi-narrative-marker="Leseschluessel"`. Wire pillar click → shared detail panel toggle (`[data-expanded="true"]`).

**Step 5: Re-run focused e2e**

Run: `PORT=4100 npm run test:e2e -- test/e2e/b2-bazi-restructure.spec.js`
Expected: PASS for all 7 tests.

**Step 6: Run full suite**

Run: `npm test && PORT=4100 npm run test:e2e`

**Step 7: Visual review + code review + fix loop**

Same pattern as B1 — record under `## Optischer Review` + `## Code Review` in the QA report, re-run until 0 Critical / 0 Major.

**Step 8: Finalise + commit**

```bash
git add public/src/pages/BaziPage.js public/src/components/ \
        test/e2e/b2-bazi-restructure.spec.js \
        docs/qa/2026-05-22-b2-bazi-restructure.md \
        docs/qa/screenshots/b2-bazi-restructure/
git commit -m "feat(bazi): restructure page — Day Master kern, 4-pillar line, shared detail panel — B2 PASS"
```

---

### Iteration B3: Font Consolidation

**Slug:** `b3-font-consolidation`
**Trigger:** dev brief §9 — only two brand fonts (serif headlines + plain sans body), CJK fallback is technical glyph fallback only. PO must pick the pair before this iteration starts.

**Blocking precondition:** PO decision on font pair. Candidates listed in dev brief §9:
1. Cormorant Garamond + Sora
2. Cormorant Garamond + Manrope
3. Playfair Display + Sora
4. DM Serif Display + Inter
5. Fraunces + Manrope

> **Do not start this iteration until the PO records the chosen pair in the iteration's `/goal` block.** If the agent ships without the decision, status is `BLOCKED — PO decision missing`.

**Files (estimate, confirm in step 1):**
- Modify: font imports in `public/index.html`
- Modify: `--font-serif` / `--font-sans` tokens wherever defined
- Audit: any component still using a third font family
- New: e2e `test/e2e/b3-font-consolidation.spec.js`
- New: QA report `docs/qa/2026-05-22-b3-font-consolidation.md`

**Step 1: Capture PO decision in `/goal` block**

Fill goal-block.md. The Goal line must name the chosen pair, e.g. `Goal: Brand-Fonts auf Cormorant Garamond + Sora konsolidieren`.

Acceptance criteria:

- HTML loads exactly 2 brand font families (plus optional CJK-fallback family).
- `--font-serif` and `--font-sans` resolve to the chosen pair across all themes.
- No component references a third brand family.
- Headings (`h1, h2, h3, h4`) use `--font-serif`.
- Body / UI uses `--font-sans`.

Commit the goal block.

**Step 2: Write failing e2e font-contract test**

```js
// test/e2e/b3-font-consolidation.spec.js
import { test, expect } from '@playwright/test';
import { setTheme } from './_helpers/theme.js';
import { captureMatrix } from './_helpers/capture.js';

const CHOSEN_SERIF = 'Cormorant Garamond'; // <-- set per PO decision
const CHOSEN_SANS  = 'Sora';                // <-- set per PO decision
const ALLOWED_FAMILIES = new Set([CHOSEN_SERIF, CHOSEN_SANS, 'system-ui', '-apple-system',
  'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif', 'serif',
  // CJK glyph fallback only:
  'Noto Sans CJK SC', 'Noto Serif CJK SC',
]);

const DIR = 'docs/qa/screenshots/b3-font-consolidation';

const PAGES = [
  { slug: 'overview', path: '/#/overview' },
  { slug: 'bazi',     path: '/#/bazi' },
  { slug: 'western',  path: '/#/western' },
  { slug: 'wuxing',   path: '/#/wuxing' },
  { slug: 'daily',    path: '/#/daily' },
  { slug: 'synastry', path: '/#/synastry' },
  { slug: 'input',    path: '/' },
  { slug: 'method',   path: '/#/method' },
];

for (const pg of PAGES) {
  test(`B3 ${pg.slug} — only PO-approved font families render`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await setTheme(p, 'planetarium');
    await p.goto(pg.path, { waitUntil: 'load' });
    await p.locator('#app > *').first().waitFor({ state: 'attached' });

    const families = await p.evaluate(() => {
      const used = new Set();
      for (const el of document.querySelectorAll('#app *')) {
        const f = getComputedStyle(el).fontFamily;
        for (const part of f.split(',')) used.add(part.trim().replace(/['"]/g, ''));
      }
      return [...used];
    });

    const offenders = families.filter((f) => !ALLOWED_FAMILIES.has(f));
    expect(offenders, `${pg.slug} uses non-allowlisted families: ${offenders.join(', ')}`).toEqual([]);

    await captureMatrix({ browser, page: pg.slug, path: pg.path, dir: DIR });
    await ctx.close();
  });
}

test('B3 headings use serif, body uses sans', async ({ page }) => {
  await setTheme(page, 'planetarium');
  await page.goto('/#/overview', { waitUntil: 'load' });
  const h = await page.locator('#app h1, #app h2').first().evaluate(el =>
    getComputedStyle(el).fontFamily);
  expect(h).toContain(CHOSEN_SERIF);
  const b = await page.locator('#app p, #app li').first().evaluate(el =>
    getComputedStyle(el).fontFamily);
  expect(b).toContain(CHOSEN_SANS);
});
```

**Step 3: Run test to verify it fails**

Run: `PORT=4100 npm run test:e2e -- test/e2e/b3-font-consolidation.spec.js`
Expected: FAIL — offenders list shows whatever third-family creep exists today.

**Step 4: Consolidate font imports + tokens**

Edit `public/index.html` `<head>` to import only the two chosen families (preconnect + Google Fonts CSS, or self-hosted if already used). Edit the token file to set `--font-serif: 'Cormorant Garamond', serif;` and `--font-sans: 'Sora', system-ui, sans-serif;`. Grep + remove every other `font-family:` literal in components — replace with the tokens.

**Step 5: Re-run focused e2e**

Run: `PORT=4100 npm run test:e2e -- test/e2e/b3-font-consolidation.spec.js`
Expected: PASS for all 8 pages + heading/body assertion.

**Step 6: Full suite**

Run: `npm test && PORT=4100 npm run test:e2e`

**Step 7: Visual review + code review + fix loop**

Pay special attention to: headline rhythm, x-height balance between serif and sans, CJK glyph rendering (Day-Master stem characters etc.). Critical/Major → fix → re-run.

**Step 8: Finalise + commit**

```bash
git add public/index.html public/src/ \
        test/e2e/b3-font-consolidation.spec.js \
        docs/qa/2026-05-22-b3-font-consolidation.md \
        docs/qa/screenshots/b3-font-consolidation/
git commit -m "refactor(typography): consolidate to <serif> + <sans> — B3 PASS"
```

---

## After all three iterations

**Final cross-iteration check:**

```bash
npm test
PORT=4100 npm run test:e2e
```

Both must be green. Then push the branch and open the PR. The PR description must link all three QA reports.

```bash
git push -u origin HEAD
gh pr create --title "QA-gates: scaffolding + B1 light-mode + B2 BaZi + B3 fonts" \
  --body "$(cat <<'EOF'
## Summary
- Phase A: playwright matrix (desktop+mobile × dark+light), captureMatrix() helper, QA template aligned with dev-brief §2-§6, /goal snippet.
- Phase B1: global light-mode contrast PASS (8 pages).
- Phase B2: BaZi restructure PASS (Day Master kern, 4 pillars line, shared detail panel).
- Phase B3: font consolidation PASS (2 brand families).

## QA Reports
- docs/qa/2026-05-22-b1-light-mode-contrast.md — PASS
- docs/qa/2026-05-22-b2-bazi-restructure.md — PASS
- docs/qa/2026-05-22-b3-font-consolidation.md — PASS

## Test plan
- [ ] npm test green
- [ ] PORT=4100 npm run test:e2e green (desktop + mobile)
- [ ] All screenshot matrices present under docs/qa/screenshots/b{1,2,3}-*
- [ ] 0 Critical / 0 Major findings open in any QA report

EOF
)"
```

---

## Open questions

1. **Token file location.** Phase B1/B3 reference "the central token file" — exact path TBD by the executing agent via `grep -rn "\-\-text:" public/`. If tokens live in `public/index.html` `<style>` vs. a dedicated CSS file, the diff target differs. Resolve in step 1 of each iteration, not in advance.
2. **Font choice.** B3 is blocked until PO picks one of the five candidates in dev brief §9.
3. **Lucky pillar fate.** B2 step asserts "removed OR labeled". The renderer must commit to one. Decide in B2 step 1 — recommendation: keep + label, because removing a section without provenance migration risks data confusion.
