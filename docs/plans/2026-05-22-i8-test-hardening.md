# I8 — Test Hardening & Visual Regression Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Visuelle Regression und Code-Review-Haertung. Sichtbarer Nutzer-Unterschied: Gruene Tests beweisen Produktanforderungen, nicht nur DOM-Marker. Abschluss nur wenn Playwright-Snapshot, strikte Assertions, kein offener Major.

**Goal:** Tests beweisen tatsächlich das Produktverhalten — strikte semantische Assertions, Playwright Visual Baselines mit Toleranz, automatisiertes QA-Gate-Script verhindert unvollständige Sprintabschlüsse.

**Architecture:** Unit-Assertions semantisch (source-tag statt Existenz). Visual baselines via @playwright/test toHaveScreenshot, baselines im Repo (docs/qa/visual-baselines/). QA-Gate als Node-Script, blockt Iteration-Close ohne Artefakte.

**Tech Stack:** node --test, @playwright/test screenshot assertions, Node fs/path scripting.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0–I7 abgeschlossen.

---

## Übersicht der Tasks

| # | Task-ID | Komponente | Requirement |
|---|---|---|---|
| 1 | TASK-I8-001 | Schwache Unit-Assertions ersetzen | REQ-D-001, REQ-NF-002 |
| 2 | TASK-I8-002 | Playwright Visual Baselines | REQ-NF-001, REQ-NF-003 |
| 3 | TASK-I8-003 | QA-Gate-Script | REQ-NF-001, REQ-NF-002, REQ-NF-003 |

---

### Task 1: Schwache Unit-Assertions ersetzen (TASK-I8-001)

**Iterationsziel-Bezug:** Tests die nur "DOM existiert" prüfen, lassen Bugs durch. Diese Iteration ersetzt sie durch semantische Assertions, die die tatsächliche Produktanforderung (richtiger Glyph, richtige Quelle, richtige Tick-Anzahl) beweisen.

**Requirement links:** REQ-D-001 (keine fake 0°-Längen — Quelle muss als `'missing'` markiert sein), REQ-NF-002 (Code Review fordert semantische Tests).

**Files:**
- Modify: `test/view_model.test.js`
- Modify: `test/natal-chart-wheel.test.js`
- Modify: `test/rolling-text.test.js`
- Modify: `test/visual-baseline-stability.test.js`

---

**Step 1: Inventar der schwachen Assertions**

Vor jedem Edit grep nach typischen Schwach-Patterns dokumentieren — als Audit-Spur im Plan. Lege `docs/qa/screenshots/i8-hardening/audit-weak-assertions.md` an mit folgendem Inhalt-Skeleton (echte Werte beim Run einfüllen):

```markdown
# Audit: schwache Unit-Assertions (I8-001)

## Suchmuster
- `assert.ok(*.includes(*))`        // bloße Substring-Anwesenheit
- `assert.notStrictEqual(*, 0)`     // negation gegen fake-0°
- `assert.ok(*.querySelector(*))`   // bloße DOM-Existenz
- `assert.ok(typeof * === 'string')`// bloßer Typcheck

## Treffer pro Datei
| Datei | Zeile | Pattern | Ersatz-Strategie |
|---|---|---|---|
| test/view_model.test.js | … | … | … |
| test/natal-chart-wheel.test.js | … | … | … |
| test/rolling-text.test.js | … | … | … |
| test/visual-baseline-stability.test.js | … | … | … |
```

Befehl zum Befüllen:

```bash
rg -n "assert\.ok\(.*\.includes\(|assert\.notStrictEqual\(.*,\s*0\)|assert\.ok\(.*querySelector|assert\.ok\(typeof " test/view_model.test.js test/natal-chart-wheel.test.js test/rolling-text.test.js test/visual-baseline-stability.test.js
```

---

**Step 2: Beispiel — view_model.test.js (Quelle statt Existenz)**

REQ-D-001 verlangt: fehlende Längengrade dürfen NICHT als `0` zurückkommen, sondern müssen `source === 'missing'` (oder `null`) tragen. Aktueller Test prüft nur Ungleichheit zu 0, was Bugs durchlässt, wenn die Quelle korrekt markiert wäre, der Wert aber zufällig 0 ist (Aries 0° ist ein legaler Wert).

Before (weak):

```javascript
// test/view_model.test.js — schwacher Test, der echte Bugs durchlässt
test('normalizeAzodiacResult sets non-zero longitude for sun', () => {
  const vm = normalizeAzodiacResult(fixtureWithMissingSun);
  assert.notStrictEqual(vm.western.planets.sun.longitude, 0);  // ❌ Aries 0° ist legal!
  assert.ok(vm.western.planets.sun);                            // ❌ DOM/Objektexistenz beweist nichts
});
```

After (strict):

```javascript
// test/view_model.test.js — semantischer Test gegen Fake-0°-Bug
test('normalizeAzodiacResult tags missing sun longitude with source="missing"', () => {
  const vm = normalizeAzodiacResult(fixtureWithMissingSun);
  const sun = vm.western.planets.sun;

  // 1. Quelle muss explizit als fehlend markiert sein (REQ-D-001)
  assert.strictEqual(sun.source, 'missing',
    'sun.source must be "missing" when upstream omits longitude');

  // 2. longitude muss null sein, NICHT 0
  assert.strictEqual(sun.longitude, null,
    'sun.longitude must be null (not fake 0°) when source is "missing"');

  // 3. UI-Hint muss vorhanden sein
  assert.strictEqual(sun.displayHint, 'unavailable',
    'sun.displayHint must drive UI to render an unavailable badge');
});

test('normalizeAzodiacResult preserves legal Aries 0° as source="api"', () => {
  // Genau der Fall, den der alte Test fälschlich als "fehlend" gemeldet hätte:
  // ein echtes API-Ergebnis mit longitude=0 (Frühlingspunkt).
  const vm = normalizeAzodiacResult(fixtureWithSunAtAries0);
  const sun = vm.western.planets.sun;

  assert.strictEqual(sun.source, 'api', 'real 0° must be tagged as api-sourced');
  assert.strictEqual(sun.longitude, 0, 'legal 0° must round-trip exactly');
  assert.notStrictEqual(sun.displayHint, 'unavailable', '0° must render normally');
});
```

---

**Step 3: Beispiel — natal-chart-wheel.test.js (Geometrie statt Existenz)**

Das Wheel muss 12 House-Ticks, 12 Sign-Sektoren und Glyphen pro Planet zeigen. Aktuelle Tests prüfen nur, dass *irgendwelche* SVG-Children existieren.

Before:

```javascript
// test/natal-chart-wheel.test.js
test('wheel renders ticks', () => {
  const svg = renderNatalWheel(fixtureChart);
  assert.ok(svg.querySelector('.tick'));                  // ❌ ein Tick reicht? Nein.
  assert.ok(svg.querySelectorAll('.planet').length > 0);  // ❌ "größer als 0" ist nicht 10
});
```

After:

```javascript
// test/natal-chart-wheel.test.js — Geometrie-strikt
test('wheel renders exactly 12 house ticks at 30° intervals', () => {
  const svg = renderNatalWheel(fixtureChart);
  const ticks = svg.querySelectorAll('[data-role="house-tick"]');

  assert.strictEqual(ticks.length, 12, 'must have exactly 12 house ticks');

  const angles = Array.from(ticks).map(t => Number(t.getAttribute('data-angle-deg')));
  angles.sort((a, b) => a - b);
  // 0, 30, 60, ..., 330
  const expected = Array.from({ length: 12 }, (_, i) => i * 30);
  assert.deepStrictEqual(angles, expected,
    'house ticks must be exactly at 0°, 30°, ..., 330°');
});

test('wheel renders one glyph per classical planet with correct unicode', () => {
  const svg = renderNatalWheel(fixtureChart);
  const expectedGlyphs = {
    sun:     '☉',  // ☉
    moon:    '☽',  // ☽
    mercury: '☿',  // ☿
    venus:   '♀',  // ♀
    mars:    '♂',  // ♂
    jupiter: '♃',  // ♃
    saturn:  '♄',  // ♄
  };
  for (const [planet, glyph] of Object.entries(expectedGlyphs)) {
    const node = svg.querySelector(`[data-planet="${planet}"] .glyph`);
    assert.ok(node, `glyph node for ${planet} must exist`);
    assert.strictEqual(node.textContent.trim(), glyph,
      `${planet} must render glyph ${glyph}, got "${node.textContent}"`);
    assert.strictEqual(node.getAttribute('aria-label'), planet,
      `${planet} glyph must have aria-label="${planet}" for SR users`);
  }
});

test('planet missing longitude is hidden, not placed at 0°', () => {
  // REQ-D-001: kein Fake-0°
  const svg = renderNatalWheel(fixtureChartWithMissingMars);
  const mars = svg.querySelector('[data-planet="mars"]');
  assert.strictEqual(mars, null,
    'mars node must NOT exist when longitude is missing (no fake 0° placement)');

  // Stattdessen muss ein Status-Hinweis im SR-only-Bereich landen
  const note = svg.querySelector('[data-role="missing-planets"]');
  assert.ok(note, 'missing-planets note must be present');
  assert.ok(note.textContent.includes('Mars'),
    'missing-planets note must list Mars by name');
});
```

---

**Step 4: Beispiel — rolling-text.test.js (Settled-State statt Existenz)**

Before:

```javascript
test('rolling text exists', () => {
  const el = renderRollingText('Sonne');
  assert.ok(el.textContent.length > 0); // ❌ während Animation ist textContent random
});
```

After:

```javascript
test('rolling text settles to the target word and exposes aria-live', async () => {
  const el = renderRollingText('Sonne', { animationMs: 50 });
  // Settling abwarten
  await new Promise(r => setTimeout(r, 80));

  assert.strictEqual(el.textContent, 'Sonne',
    'settled rolling text must equal the target string exactly');
  assert.strictEqual(el.getAttribute('aria-live'), 'polite',
    'rolling text must announce changes to screen readers (REQ-A-001)');
  assert.strictEqual(el.getAttribute('data-state'), 'settled',
    'after animation, data-state must be "settled"');
});

test('rolling text falls back to target string in SSR / no-DOM context', () => {
  // Direkter Aufruf der reinen Funktion, ohne window/document
  const html = renderRollingTextStatic('Sonne');
  assert.strictEqual(html, 'Sonne',
    'SSR fallback must be the literal target string, not animation artifacts');
});
```

---

**Step 5: Beispiel — visual-baseline-stability.test.js (gemessene Pixelgrenzen)**

Before:

```javascript
test('hero renders', () => {
  assert.ok(document.querySelector('.hero'));
});
```

After:

```javascript
test('overview hero respects layout invariants', () => {
  mountOverviewHero(fixtureChart);
  const hero = document.querySelector('[data-region="overview-hero"]');
  assert.ok(hero, 'hero region must exist');

  const rect = hero.getBoundingClientRect();
  // Layout-Invariante: Hero mindestens 320px hoch, max 720px (Desktop-Baseline)
  assert.ok(rect.height >= 320 && rect.height <= 720,
    `hero height must be between 320 and 720px, got ${rect.height}`);

  // Pflicht-Kinder, die Playwright-Snapshot stabil halten
  for (const role of ['hero-headline', 'hero-subline', 'method-badge', 'cta']) {
    const node = hero.querySelector(`[data-role="${role}"]`);
    assert.ok(node, `hero must contain [data-role="${role}"]`);
  }
});
```

---

**Step 6: Run, fix, iterate**

```bash
npm test
```

Erwartung: vorher grün, nachher zunächst rot (weil die Implementierungen noch fake-0° liefern). Erst danach in der Produktion (`server.js`, `public/src/domain/projections.js`, `public/src/components/RollingText.js`, Wheel-Renderer) auf `source: 'missing'` umstellen — bis Tests grün sind.

**Erfolg, wenn:** `npm test` grün UND `rg "assert.notStrictEqual\(.*,\s*0\)" test/` leer UND `rg "assert.ok\(.*querySelector" test/` leer.

---

### Task 2: Playwright Visual Baselines (TASK-I8-002)

**Iterationsziel-Bezug:** Sichtbares Produktverhalten (Hero-Layout, Wheel-Geometrie, Rolling-Letter-End-Frame) ist nur durch Pixel-Vergleich beweisbar — ein DOM-Test alleine erkennt z.B. ein zerschossenes Z-Index nicht.

**Requirement links:** REQ-NF-001 (Playwright pro Iteration), REQ-NF-003 (Review-Fix-Review-Schleife).

**Files:**
- Create: `test/e2e/visual-regression.spec.js`
- Create: `docs/qa/visual-baselines/README.md`
- Create: `docs/qa/visual-baselines/.gitkeep`
- Create: `docs/qa/screenshots/i8-hardening/.gitkeep`
- Modify: `playwright.config.mjs` (snapshotPathTemplate + ci-guard)
- Modify: `package.json` (`qa:visual`, `qa:visual:update` scripts)

---

**Step 1: Playwright-Config erweitern — Baselines an festen Ort, CI-Update verbieten**

```javascript
// playwright.config.mjs (Auszug — restliche Felder aus I0 unverändert lassen)
import { defineConfig, devices } from '@playwright/test';

// Harte Regel: in CI niemals --update-snapshots zulassen. Baselines werden
// nur manuell nach PO-Abnahme aktualisiert.
if (process.env.CI === 'true' && process.argv.includes('--update-snapshots')) {
  throw new Error(
    '[playwright] --update-snapshots is forbidden in CI. ' +
    'Baselines must be approved by PO and committed manually.'
  );
}

export default defineConfig({
  testDir: 'test/e2e',
  // Baselines unter docs/qa/visual-baselines/<spec>/<name>-<platform>.png
  snapshotPathTemplate:
    'docs/qa/visual-baselines/{testFileName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-iphone-13',  use: { ...devices['iPhone 13'] } },
  ],
});
```

---

**Step 2: Visual-Regression-Spec (alle 8 Targets)**

```javascript
// test/e2e/visual-regression.spec.js
// Visuelle Regressionsbasis für I8.
// Jeder Snapshot landet unter docs/qa/visual-baselines/visual-regression.spec.js/<name>.png
// Toleranz: 2% Pixel-Differenz (maxDiffPixelRatio: 0.02) — gesetzt in playwright.config.mjs.
// WICHTIG: Baselines werden NUR nach PO-Abnahme via `npm run qa:visual:update` erzeugt.

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const RUN_SCREENSHOT_DIR = 'docs/qa/screenshots/i8-hardening';

test.beforeAll(() => {
  mkdirSync(RUN_SCREENSHOT_DIR, { recursive: true });
});

// Fixtures-Personen, deren Daten determinitisch sind (gleiches Datum/Ort).
// Ohne fixe Eingabe wäre der Snapshot nicht reproduzierbar.
const FIXTURE_PERSON = {
  name: 'Anna Beispiel',
  date: '1990-05-15',
  time: '12:00',
  lat: 52.52,
  lon: 13.405,
  tz: 'Europe/Berlin',
};

async function loadProfile(page, person = FIXTURE_PERSON) {
  await page.goto('/#/input');
  await page.waitForLoadState('networkidle');
  await page.fill('[data-field="name"]',    person.name);
  await page.fill('[data-field="date"]',    person.date);
  await page.fill('[data-field="time"]',    person.time);
  await page.fill('[data-field="lat"]',     String(person.lat));
  await page.fill('[data-field="lon"]',     String(person.lon));
  await page.fill('[data-field="tz"]',      person.tz);
  await page.click('[data-action="submit-profile"]');
  await page.waitForLoadState('networkidle');
}

async function disableMotion(page) {
  // Rolling-Letter & andere Animationen für stabilen Pixelvergleich pausieren.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

test.describe('I8 visual baselines @visual', () => {
  test.beforeEach(async ({ page }) => {
    await loadProfile(page);
  });

  // 1. Overview Hero — Desktop
  test('overview hero desktop', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'desktop-only');
    await page.goto('/#/overview');
    await disableMotion(page);
    await page.waitForSelector('[data-region="overview-hero"]');
    await expect(page.locator('[data-region="overview-hero"]'))
      .toHaveScreenshot('overview-hero-desktop.png', { maxDiffPixelRatio: 0.02 });
  });

  // 2. Overview Hero — Mobile
  test('overview hero mobile', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-iphone-13', 'mobile-only');
    await page.goto('/#/overview');
    await disableMotion(page);
    await page.waitForSelector('[data-region="overview-hero"]');
    await expect(page.locator('[data-region="overview-hero"]'))
      .toHaveScreenshot('overview-hero-mobile.png', { maxDiffPixelRatio: 0.02 });
  });

  // 3. Wheel Closeup
  test('wheel closeup', async ({ page }) => {
    await page.goto('/#/western');
    await disableMotion(page);
    await page.waitForSelector('[data-component="natal-wheel"] svg');
    await expect(page.locator('[data-component="natal-wheel"]'))
      .toHaveScreenshot('wheel-closeup.png', { maxDiffPixelRatio: 0.02 });
  });

  // 4. Rolling Letters — settled end-frame
  test('rolling letters settled', async ({ page }) => {
    await page.goto('/#/overview');
    // KEIN disableMotion — wir warten echt ab, dann snapshotten den Endzustand.
    await page.waitForSelector('[data-component="rolling-text"][data-state="settled"]');
    await expect(page.locator('[data-component="rolling-text"]').first())
      .toHaveScreenshot('rolling-letters-settled.png', { maxDiffPixelRatio: 0.02 });
  });

  // 5. Method / Provenance badge area
  test('method provenance', async ({ page }) => {
    await page.goto('/#/overview');
    await disableMotion(page);
    await page.waitForSelector('[data-region="method-provenance"]');
    await expect(page.locator('[data-region="method-provenance"]'))
      .toHaveScreenshot('method-provenance.png', { maxDiffPixelRatio: 0.02 });
  });

  // 6. Daily Hero
  test('daily hero', async ({ page }) => {
    await page.goto('/#/daily');
    await disableMotion(page);
    await page.waitForSelector('[data-region="daily-hero"]');
    await expect(page.locator('[data-region="daily-hero"]'))
      .toHaveScreenshot('daily-hero.png', { maxDiffPixelRatio: 0.02 });
  });

  // 7. Fusion Hero
  test('fusion hero', async ({ page }) => {
    await page.goto('/#/fusion');
    await disableMotion(page);
    await page.waitForSelector('[data-region="fusion-hero"]');
    await expect(page.locator('[data-region="fusion-hero"]'))
      .toHaveScreenshot('fusion-hero.png', { maxDiffPixelRatio: 0.02 });
  });

  // 8. Wu-Xing Radar
  test('wuxing radar', async ({ page }) => {
    await page.goto('/#/wuxing');
    await disableMotion(page);
    await page.waitForSelector('[data-component="wuxing-radar"] svg');
    await expect(page.locator('[data-component="wuxing-radar"]'))
      .toHaveScreenshot('wuxing-radar.png', { maxDiffPixelRatio: 0.02 });
  });
});

// Zusätzlich: für jeden gerenderten Spec eine Full-Page-PNG ins
// docs/qa/screenshots/i8-hardening/ ablegen, damit das QA-Gate-Script (Task 3)
// Artefakte für den Reviewer findet — unabhängig vom Baseline-Vergleich.
test.afterEach(async ({ page }, info) => {
  const slug = info.title.replace(/\s+/g, '-').toLowerCase();
  const project = info.project.name;
  await page.screenshot({
    path: `${RUN_SCREENSHOT_DIR}/${slug}__${project}.png`,
    fullPage: true,
  });
});
```

---

**Step 3: README für Baselines + Baseline-Workflow festhalten**

```markdown
<!-- docs/qa/visual-baselines/README.md -->
# Visual Baselines (Playwright)

Diese Verzeichnisse enthalten **abgenommene** Pixel-Baselines. Sie sind die
Wahrheitsquelle für `npm run qa:visual` und dürfen **nicht** automatisch
aktualisiert werden.

## Aktualisierungs-Workflow (nur mit PO-Abnahme)

1. Lokal: `npm run qa:visual:update` — erzeugt neue PNGs.
2. PR mit Diff-Bildern öffnen, PO/Reviewer prüft visuelle Veränderung.
3. Nach Freigabe: Commit + Merge.
4. CI lehnt `--update-snapshots` aktiv ab (siehe `playwright.config.mjs`).

## Dateipfade

`docs/qa/visual-baselines/visual-regression.spec.js/<name>-<project>.png`

Beispiele:
- `overview-hero-desktop-desktop-chromium.png`
- `overview-hero-mobile-mobile-iphone-13.png`
- `wheel-closeup-desktop-chromium.png`
- `rolling-letters-settled-desktop-chromium.png`
- `method-provenance-desktop-chromium.png`
- `daily-hero-desktop-chromium.png`
- `fusion-hero-desktop-chromium.png`
- `wuxing-radar-desktop-chromium.png`

## Toleranz

`maxDiffPixelRatio: 0.02` (2%). Reicht für Anti-Aliasing-Drift, fängt aber
echte Layoutbrüche und Farbfehler.
```

---

**Step 4: package.json-Scripts ergänzen**

```jsonc
// package.json (Auszug)
{
  "scripts": {
    "qa:visual":        "playwright test test/e2e/visual-regression.spec.js",
    "qa:visual:update": "playwright test test/e2e/visual-regression.spec.js --update-snapshots",
    "qa:gate":          "node scripts/qa-iteration-gate.mjs"
  }
}
```

---

**Step 5: Erst-Baselines (einmalig, mit PO-Abnahme)**

```bash
# 1. Lokal generieren
npm run qa:visual:update

# 2. Diff zum Reviewer geben (Screenshots committen)
git add docs/qa/visual-baselines
git status

# 3. Nach Freigabe committen — KEIN force-update in CI.
```

**Erfolg, wenn:** `npm run qa:visual` ohne Diff durchläuft, 8 PNGs in `docs/qa/visual-baselines/visual-regression.spec.js/` existieren, und das Setzen von `CI=true npx playwright test --update-snapshots` mit dem Guard-Error abbricht.

---

### Task 3: QA-Gate-Script (TASK-I8-003)

**Iterationsziel-Bezug:** Iterationen werden nur dann als "fertig" gemeldet, wenn QA-Doc, Screenshots, Tests und Reviewstatus geschlossen sind. Ein einzelner Befehl prüft das mechanisch.

**Requirement links:** REQ-NF-001, REQ-NF-002, REQ-NF-003.

**Files:**
- Create: `scripts/qa-iteration-gate.mjs`
- Create: `test/qa-iteration-gate.test.js`
- Create: `docs/qa/code-review-checklist.md`
- Modify: `package.json` (`qa:gate` script — bereits in Task 2 mitangelegt)

---

**Step 1: Code-Review-Checklist als Referenzdokument**

```markdown
<!-- docs/qa/code-review-checklist.md -->
# QA Code-Review-Checklist (Iterationen I0–I9)

Jede Iteration MUSS einen Abschnitt **"Finaler Status: PASS"** im
zugehörigen Review-Dokument `docs/qa/iteration-<id>-review.md` haben.
Bis dahin blockiert `npm run qa:gate -- --iteration <id>` den Abschluss.

## Pflichtabschnitte im Review-Dokument

1. `## Backend-Diff-Check`
   - Welche `server.js`- / `public/src/**`-Dateien wurden geändert?
   - Stimmt die Anzahl in `git diff --stat` mit der Plan-Erwartung überein?
2. `## Fake-Data-Guard`
   - `rg "longitude: 0" public/src` → muss leer sein, außer der Wert ist
     explizit als `source: 'api'` markiert.
   - `rg "assert.notStrictEqual\(.*,\s*0\)" test/` → leer.
3. `## Accessibility`
   - axe-core / Lighthouse-Score gegen `/#/overview` ≥ 90.
   - `aria-live` auf RollingText vorhanden, `aria-label` auf Wheel-Glyphen.
4. `## Visual Parity`
   - `npm run qa:visual` grün; PNG-Diffs (falls vorhanden) angehängt.
5. `## Test Evidence`
   - `npm test` Output (Zeitstempel ≤ 24h).
   - Playwright-Screenshots unter `docs/qa/screenshots/<iteration>/` ≥ 1 Datei.
6. `## Offene Findings`
   - Tabelle mit Spalten `Severity | Title | Status`.
   - Severity ∈ {Critical, Major, Minor}.
   - Iteration darf nur schließen, wenn **kein** Eintrag mit
     Severity `Critical` oder `Major` mit Status `open` existiert.
7. `## Finaler Status: PASS`  (oder `FAIL`)
   - Eine explizite Zeile, die das QA-Gate liest.

## Maschinen-lesbare Konventionen

- Marker-Zeile für npm-test: `<!-- npm-test:ran-at:<ISO-8601> -->`
  Beispiel: `<!-- npm-test:ran-at:2026-05-22T17:04:00Z -->`
- Marker für Playwright: `<!-- playwright:ran-at:<ISO-8601> -->`
- Marker für letzten qa:visual-Lauf:
  `<!-- qa-visual:ran-at:<ISO-8601> -->`

Das Gate-Script (`scripts/qa-iteration-gate.mjs`) sucht genau diese Marker.
```

---

**Step 2: Das Gate-Script selbst**

```javascript
// scripts/qa-iteration-gate.mjs
// Hardes QA-Gate für eine Iteration. Exit-Code != 0 blockt den Abschluss.
//
// Benutzung:
//   node scripts/qa-iteration-gate.mjs --iteration i8-hardening
//   npm run qa:gate -- --iteration i8-hardening
//
// Geprüft wird:
//   1. Review-Doc existiert.
//   2. Doc enthält alle Pflichtabschnitte.
//   3. Screenshots-Verzeichnis existiert und enthält nicht-leere Dateien.
//   4. npm-test-Marker max. 24h alt.
//   5. e2e-Screenshots für die Iteration vorhanden.
//   6. Keine offenen Critical/Major Findings.
//   7. "Finaler Status: PASS" ist vorhanden.

import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import process from 'node:process';

const REQUIRED_SECTIONS = [
  '## Backend-Diff-Check',
  '## Fake-Data-Guard',
  '## Accessibility',
  '## Visual Parity',
  '## Test Evidence',
  '## Offene Findings',
  '## Finaler Status:',
];

const MAX_TEST_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/** Parse `--iteration <id>` aus argv. */
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--iteration' && argv[i + 1]) {
      out.iteration = argv[i + 1];
      i++;
    } else if (argv[i] === '--root' && argv[i + 1]) {
      out.root = argv[i + 1];
      i++;
    }
  }
  if (!out.iteration) {
    throw new GateError('missing --iteration <id>');
  }
  return out;
}

export class GateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GateError';
  }
}

/** Lade den Reviewdoc-Text oder werfe einen GateError. */
export function loadReviewDoc(root, iteration) {
  const path = join(root, 'docs', 'qa', `iteration-${iteration}-review.md`);
  if (!existsSync(path)) {
    throw new GateError(`review doc missing at ${path}`);
  }
  return { path, text: readFileSync(path, 'utf8') };
}

/** Prüft Pflicht-Sektionen. */
export function checkRequiredSections(text) {
  const missing = REQUIRED_SECTIONS.filter(h => !text.includes(h));
  if (missing.length > 0) {
    throw new GateError(`review doc missing sections: ${missing.join(', ')}`);
  }
}

/** Prüft Screenshot-Ordner: existiert + mindestens eine Datei > 0 Bytes. */
export function checkScreenshots(root, iteration) {
  const dir = join(root, 'docs', 'qa', 'screenshots', iteration);
  if (!existsSync(dir)) {
    throw new GateError(`screenshots dir missing: ${dir}`);
  }
  const files = readdirSync(dir).filter(f => !f.startsWith('.'));
  if (files.length === 0) {
    throw new GateError(`screenshots dir empty: ${dir}`);
  }
  const empties = files.filter(f => {
    const full = join(dir, f);
    return statSync(full).isFile() && statSync(full).size === 0;
  });
  if (empties.length > 0) {
    throw new GateError(`empty screenshot files: ${empties.join(', ')}`);
  }
  return { dir, count: files.length };
}

/** Prüft, dass <!-- npm-test:ran-at:<ISO --> max 24h alt ist. */
export function checkNpmTestMarker(text, now = Date.now()) {
  const m = text.match(/<!--\s*npm-test:ran-at:([^\s]+)\s*-->/);
  if (!m) {
    throw new GateError('missing marker <!-- npm-test:ran-at:<ISO-8601> -->');
  }
  const t = Date.parse(m[1]);
  if (Number.isNaN(t)) {
    throw new GateError(`invalid npm-test marker timestamp: ${m[1]}`);
  }
  const age = now - t;
  if (age < 0) {
    throw new GateError(`npm-test marker is in the future: ${m[1]}`);
  }
  if (age > MAX_TEST_AGE_MS) {
    throw new GateError(
      `npm-test marker too old: ${Math.round(age / 3600000)}h > 24h`
    );
  }
  return { ranAt: m[1], ageMs: age };
}

/**
 * Parst die "Offene Findings"-Tabelle. Erlaubt nur Einträge mit
 * Status != "open" für Severity Critical/Major.
 *
 * Format (markdown):
 * | Severity | Title | Status |
 * |---|---|---|
 * | Major | foo | closed |
 * | Minor | bar | open   |
 */
export function checkOpenFindings(text) {
  const section = sliceSection(text, '## Offene Findings', '## ');
  if (!section) {
    throw new GateError('section "## Offene Findings" is empty');
  }
  const rows = section.split('\n').filter(l => l.trim().startsWith('|'));
  // Erste zwei Zeilen sind Header + Separator
  const dataRows = rows.slice(2);
  const offenders = [];
  for (const row of dataRows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    const [sev, title, status] = cells;
    const sevLower = sev.toLowerCase();
    const statusLower = status.toLowerCase();
    if ((sevLower === 'critical' || sevLower === 'major') && statusLower === 'open') {
      offenders.push(`${sev}: ${title}`);
    }
  }
  if (offenders.length > 0) {
    throw new GateError(
      `open Critical/Major findings present: ${offenders.join('; ')}`
    );
  }
  return { rowsScanned: dataRows.length };
}

/** Schneidet eine Sektion aus dem Markdown heraus. */
export function sliceSection(text, heading, nextHeadingPrefix) {
  const start = text.indexOf(heading);
  if (start === -1) return null;
  const rest = text.slice(start + heading.length);
  const end = rest.indexOf('\n' + nextHeadingPrefix);
  return end === -1 ? rest : rest.slice(0, end);
}

/** Prüft die Pass-Zeile. */
export function checkFinalStatus(text) {
  if (!/^##\s*Finaler Status:\s*PASS\s*$/m.test(text)) {
    throw new GateError('"## Finaler Status: PASS" line missing');
  }
}

/** Haupteinstieg. */
export function runGate({ root, iteration, now = Date.now() }) {
  const { path, text } = loadReviewDoc(root, iteration);
  checkRequiredSections(text);
  const screens = checkScreenshots(root, iteration);
  const testMarker = checkNpmTestMarker(text, now);
  const findings = checkOpenFindings(text);
  checkFinalStatus(text);
  return {
    ok: true,
    reviewDoc: path,
    screenshots: screens,
    testMarker,
    findings,
  };
}

// CLI-Entrypoint nur bei direktem Aufruf
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const root = args.root ? resolve(args.root) : process.cwd();
    const result = runGate({ root, iteration: args.iteration });
    process.stdout.write(
      `[qa-gate] PASS — iteration=${args.iteration} ` +
      `screenshots=${result.screenshots.count} ` +
      `testMarkerAgeMs=${result.testMarker.ageMs}\n`
    );
    process.exit(0);
  } catch (err) {
    if (err instanceof GateError) {
      process.stderr.write(`[qa-gate] FAIL — ${err.message}\n`);
      process.exit(2);
    }
    process.stderr.write(`[qa-gate] CRASH — ${err.stack || err}\n`);
    process.exit(3);
  }
}
```

---

**Step 3: Self-Test (`node --test`-kompatibel)**

```javascript
// test/qa-iteration-gate.test.js
// Self-Test für scripts/qa-iteration-gate.mjs.
// Erzeugt temporäre Doc-/Screenshot-Strukturen und prüft Pass-/Fail-Cases.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseArgs,
  GateError,
  loadReviewDoc,
  checkRequiredSections,
  checkScreenshots,
  checkNpmTestMarker,
  checkOpenFindings,
  checkFinalStatus,
  runGate,
} from '../scripts/qa-iteration-gate.mjs';

function makeFixture({ withPass = true, withMarker = true, withSections = true,
                       withScreenshots = true, openMajor = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'qa-gate-'));
  const iteration = 'i8-hardening';

  const reviewDir = join(root, 'docs', 'qa');
  mkdirSync(reviewDir, { recursive: true });

  const screensDir = join(root, 'docs', 'qa', 'screenshots', iteration);
  if (withScreenshots) {
    mkdirSync(screensDir, { recursive: true });
    writeFileSync(join(screensDir, 'sample.png'), 'PNG-bytes');
  }

  const isoNow = new Date().toISOString();
  const sections = withSections
    ? [
        '## Backend-Diff-Check\nok',
        '## Fake-Data-Guard\nok',
        '## Accessibility\nok',
        '## Visual Parity\nok',
        `## Test Evidence\n<!-- npm-test:ran-at:${withMarker ? isoNow : 'never'} -->`,
        '## Offene Findings',
        '| Severity | Title | Status |',
        '|---|---|---|',
        openMajor
          ? '| Major | broken wheel | open |'
          : '| Minor | spacing nit  | open |',
      ]
    : ['## Backend-Diff-Check\nok'];

  const finalLine = withPass ? '## Finaler Status: PASS' : '## Finaler Status: FAIL';

  const md = [...sections, finalLine, ''].join('\n');
  writeFileSync(join(reviewDir, `iteration-${iteration}-review.md`), md);

  return { root, iteration, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('parseArgs rejects missing --iteration', () => {
  assert.throws(() => parseArgs([]), GateError);
});

test('parseArgs accepts --iteration <id>', () => {
  assert.deepStrictEqual(parseArgs(['--iteration', 'i8-hardening']), { iteration: 'i8-hardening' });
});

test('runGate returns ok on a fully valid fixture', () => {
  const fx = makeFixture();
  try {
    const result = runGate({ root: fx.root, iteration: fx.iteration });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.screenshots.count, 1);
  } finally {
    fx.cleanup();
  }
});

test('runGate fails when review doc is missing', () => {
  const fx = makeFixture();
  rmSync(join(fx.root, 'docs', 'qa', `iteration-${fx.iteration}-review.md`));
  try {
    assert.throws(
      () => runGate({ root: fx.root, iteration: fx.iteration }),
      /review doc missing/
    );
  } finally {
    fx.cleanup();
  }
});

test('runGate fails when required sections are absent', () => {
  const fx = makeFixture({ withSections: false });
  try {
    assert.throws(
      () => runGate({ root: fx.root, iteration: fx.iteration }),
      /missing sections/
    );
  } finally {
    fx.cleanup();
  }
});

test('runGate fails when screenshots dir is missing', () => {
  const fx = makeFixture({ withScreenshots: false });
  try {
    assert.throws(
      () => runGate({ root: fx.root, iteration: fx.iteration }),
      /screenshots dir missing/
    );
  } finally {
    fx.cleanup();
  }
});

test('checkNpmTestMarker rejects stale timestamps', () => {
  const tooOld = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const md = `## Test Evidence\n<!-- npm-test:ran-at:${tooOld} -->`;
  assert.throws(() => checkNpmTestMarker(md), /too old/);
});

test('checkNpmTestMarker rejects missing marker', () => {
  assert.throws(() => checkNpmTestMarker('no marker here'), /missing marker/);
});

test('checkOpenFindings blocks open Major', () => {
  const md = [
    '## Offene Findings',
    '| Severity | Title | Status |',
    '|---|---|---|',
    '| Major | broken wheel | open |',
    '',
    '## Finaler Status: PASS',
  ].join('\n');
  assert.throws(() => checkOpenFindings(md), /open Critical\/Major findings/);
});

test('checkOpenFindings allows closed Major and open Minor', () => {
  const md = [
    '## Offene Findings',
    '| Severity | Title | Status |',
    '|---|---|---|',
    '| Major | old issue | closed |',
    '| Minor | spacing  | open   |',
    '',
    '## Finaler Status: PASS',
  ].join('\n');
  const r = checkOpenFindings(md);
  assert.strictEqual(r.rowsScanned, 2);
});

test('checkFinalStatus requires PASS line', () => {
  assert.throws(() => checkFinalStatus('## Finaler Status: FAIL'), /PASS/);
  // No throw on PASS
  checkFinalStatus('## Finaler Status: PASS\n');
});

test('runGate fails on open Major finding', () => {
  const fx = makeFixture({ openMajor: true });
  try {
    assert.throws(
      () => runGate({ root: fx.root, iteration: fx.iteration }),
      /open Critical\/Major findings/
    );
  } finally {
    fx.cleanup();
  }
});

test('runGate fails when Finaler Status is FAIL', () => {
  const fx = makeFixture({ withPass: false });
  try {
    assert.throws(
      () => runGate({ root: fx.root, iteration: fx.iteration }),
      /PASS/
    );
  } finally {
    fx.cleanup();
  }
});
```

---

**Step 4: Verifizieren**

```bash
node --test test/qa-iteration-gate.test.js     # Self-Test
npm run qa:gate -- --iteration i8-hardening    # Echter Lauf
```

Bei Erfolg gibt das Script auf stdout aus:
```
[qa-gate] PASS — iteration=i8-hardening screenshots=8 testMarkerAgeMs=42000
```

Bei Fehler exit-code 2 und konkreter Begründung auf stderr, z.B.:
```
[qa-gate] FAIL — open Critical/Major findings present: Major: broken wheel
```

**Erfolg, wenn:** `npm run qa:gate -- --iteration i8-hardening` exit 0, alle Self-Tests in `test/qa-iteration-gate.test.js` grün.

---

## Iteration Definition of Done

Die Iteration I8 ist abgeschlossen, wenn **alle** Punkte erfüllt sind:

1. `npm test` grün — inkl. der neuen strikten Assertions in
   `view_model.test.js`, `natal-chart-wheel.test.js`, `rolling-text.test.js`,
   `visual-baseline-stability.test.js`.
2. `rg "assert.notStrictEqual\(.*,\s*0\)" test/` und
   `rg "assert.ok\(.*querySelector\(" test/` liefern keine Treffer mehr.
3. `npm run qa:visual` grün mit 8 abgenommenen Baselines unter
   `docs/qa/visual-baselines/visual-regression.spec.js/`.
4. `CI=true npx playwright test --update-snapshots` bricht mit dem Guard-Error
   ab (negativer Test).
5. `node --test test/qa-iteration-gate.test.js` grün.
6. `npm run qa:gate -- --iteration i8-hardening` exit 0.
7. Reviewdokument `docs/qa/iteration-i8-hardening-review.md` enthält:
   - alle Pflichtabschnitte (siehe Checklist),
   - `<!-- npm-test:ran-at:... -->`-Marker ≤ 24 h alt,
   - keine offenen Critical/Major-Findings,
   - `## Finaler Status: PASS`.
8. `docs/qa/screenshots/i8-hardening/` enthält mindestens 8 nicht-leere PNGs
   (eine pro Visual-Spec, dank `afterEach`).
9. PO-Abnahme der Baselines per Commit-Author in der PR-History sichtbar.

---

## Validation strategy

Lokale Vollverifikation in dieser Reihenfolge:

```bash
# 1. Unit-Tests inkl. Self-Test des Gates
npm test
node --test test/qa-iteration-gate.test.js

# 2. Server hochfahren (separates Terminal oder via Playwright webServer)
npm start &

# 3. Visual regression (gegen committete Baselines)
npm run qa:visual

# 4. Hostile-Run: CI darf Baselines NICHT aktualisieren
CI=true npx playwright test --update-snapshots; echo "exit=$?"
# Erwartung: exit != 0, stderr enthält "forbidden in CI"

# 5. Reviewdoc + Marker pflegen
#    npm-test-Marker eintragen:
date -u +"%Y-%m-%dT%H:%M:%SZ"
#    Dann in docs/qa/iteration-i8-hardening-review.md:
#      <!-- npm-test:ran-at:2026-05-22T17:04:00Z -->

# 6. Gate ausführen
npm run qa:gate -- --iteration i8-hardening
echo "qa-gate exit=$?"   # erwartet 0
```

Fail-Beweis (negative Tests, sollte vor dem Schließen aktiv ausprobiert werden):

```bash
# a) Marker absichtlich um >24h vordatieren -> exit 2
# b) "## Finaler Status: FAIL" eintragen -> exit 2
# c) Eintrag "| Major | demo | open |" einfügen -> exit 2
```

Jeder Fail-Beweis wird kurz im Reviewdokument unter `## Test Evidence`
festgehalten ("absichtlich provozierter FAIL: …").

---

## Rollback note

I8 ist additiv und betrifft nur Tests, Scripts und QA-Docs — kein
Produktions-Code in `server.js`, `public/` oder `railway.json` wird logisch
verändert (außer ggf. das Setzen von `source: 'missing'` als Konsequenz aus
Task 1, falls noch nicht erledigt; das ist aber Teil der existierenden
REQ-D-001-Implementierung).

Rollback-Schritte, falls die Iteration zurückgenommen werden muss:

```bash
git revert <commit-i8-001>     # strikte Assertions zurück
git revert <commit-i8-002>     # visual specs + Baselines entfernen
git revert <commit-i8-003>     # qa-gate script + checklist + self-test
rm -rf docs/qa/visual-baselines/visual-regression.spec.js
rm -rf docs/qa/screenshots/i8-hardening
```

`npm test` und `npm start` bleiben in jedem Zwischenzustand lauffähig, weil
keine Produktions-Module entfernt werden.

---

## Handoff to next iteration: I9

I9 setzt auf I8 auf und erweitert das Sicherheitsnetz auf Datenfluss und
Performance. Konkret übernimmt I9:

1. **Verwendung des Gates als Pflicht-Step in I9-Closing.**
   `npm run qa:gate -- --iteration i9-...` ist Definition-of-Done-Eintrag.
2. **Erweiterung der Visual-Baselines** um Synastry-, Transit- und Houses-
   Hero-Screens (gleiches `maxDiffPixelRatio: 0.02`-Regime).
3. **Strikte Daten-Assertions** auf das Synastry-/Daily-ViewModel
   (Element-Tension, House-Comparison) im selben Stil wie I8-001 — also
   semantische Quellen statt Existenzchecks.
4. **Performance-Marker im Reviewdoc**:
   `<!-- lighthouse:overview-perf:<score> -->`, geprüft durch eine Erweiterung
   von `scripts/qa-iteration-gate.mjs` (Min-Score 75).
5. **PO-Abnahme-Workflow** der Baselines bleibt unverändert: `--update-snapshots`
   weiterhin nur lokal, in CI weiterhin verboten.

I9 darf damit voraussetzen: jede frühere Iteration hat ein lesbares
`iteration-<id>-review.md`, einen ≤24-h-Test-Marker, ein Screenshots-
Verzeichnis und ein `Finaler Status: PASS`.
