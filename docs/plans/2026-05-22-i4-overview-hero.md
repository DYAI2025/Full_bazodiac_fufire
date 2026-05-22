# I4 — Overview Premium-Hero Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Overview auf Ziel-Hero umbauen. Sichtbarer Nutzer-Unterschied: Startseite entspricht strukturell dem Zielbild. Abschluss nur wenn Hero: Wheel links/gross, Fusion-Narrativ rechts, klare Section-Hierarchie sichtbar.

**Goal:** Overview von vertikalem Card-Stack zu Premium-Hero-Layout — Wheel links/groß, Fusion-Narrativ rechts, klare Section-Hierarchie, Deep-Dive via Tiles statt Datenband.

**Architecture:** OverviewPage.js orchestriert PageShell + SectionHeader + NatalChartWheel + LuxuryCard + RollingText. CSS-Grid für Desktop-Hero, Stack für Mobile. Daten kommen via profileToOverviewModel — keine Berechnung in der Page.

**Tech Stack:** Vanilla ESM, CSS Grid, NatalChartWheel (I3), RollingText (I2), PageShell/LuxuryCard (I1).

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0 (Playwright), I1 (Design-System), I2 (RollingText), I3 (Wheel).

---

## TASK-I4-001 — Overview-Layout-Test gegen Zielstruktur

**Iterationsziel-Bezug:** Definiert die Akzeptanzgrenze für die Hero-Komposition. Bevor irgendetwas am OverviewPage geändert wird, wird die Ziel-DOM-Struktur als Test verankert: Section-Reihenfolge, data-section-Attribute, Hero-Subbereiche.

**Requirements:** REQ-F-004 (Overview Hero-Struktur), REQ-F-006 (Details erreichbar nicht Datenband).

**Files:**
- modify `test/page-render-integration.test.js` — Overview-Rendering-Block auf neue Sektions-Erwartung anpassen (zunächst skip mit `// TODO I4-002`-Notiz oder via failing assertion).
- create `test/overview-hero-layout.test.js` — neuer dedizierter Test.
- `public/src/pages/OverviewPage.js` bleibt in diesem Task unverändert (Test soll zunächst **rot** sein).

**Steps:**

1. Lege `test/overview-hero-layout.test.js` an. Test nutzt `node --test` + `linkedom` (bzw. bestehendes `JSDOM`-Setup gemäß I0/I1) um OverviewPage zu rendern und die DOM-Struktur zu assertieren.

2. Beispiel-Fixture für die Page-Daten (das ViewModel aus `profileToOverviewModel`) so anlegen, dass alle Sektionen verlässlich Inhalt haben. Wenn ein Section-Inhalt leer ist, soll die Sektion trotzdem mit `data-section` markiert vorhanden sein (Skeleton-State), aber die Akzeptanz schliesst echten Inhalt ein.

3. Erwartungs-Reihenfolge der `data-section`-Attribute (top → bottom):
   - `hero`
   - `key-facts`
   - `birthchart-wheel`
   - `fusion-narrative`
   - `bazi-pillars`
   - `western-core`
   - `fusion-coherence`
   - `element-economy`
   - `deep-dive`

4. Test wird vor TASK-I4-002 **fehlschlagen** (aktueller OverviewPage hat keine dieser Sektionen in dieser Form). Das ist erwünscht und Teil des TDD-Zyklus.

5. `test/page-render-integration.test.js` so anpassen, dass es nicht mehr auf alten Card-Stack pinnt (oder den alten Block mit `t.skip("superseded by overview-hero-layout.test.js")` markiert).

**Complete test file:**

```javascript
// test/overview-hero-layout.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { OverviewPage } from '../public/src/pages/OverviewPage.js';

const FIXTURE = {
  identity: {
    name: 'Test Person',
    birth: {
      date: '1990-04-12',
      time: '14:30',
      place: 'Berlin, DE',
      timezone: 'Europe/Berlin',
    },
  },
  keyFacts: [
    { label: 'Sonne', value: 'Widder 22°' },
    { label: 'Mond', value: 'Skorpion 8°' },
    { label: 'AC', value: 'Löwe 3°' },
    { label: 'Tagesmeister', value: 'Yang Holz' },
    { label: 'Element-Profil', value: 'Holz-dominant' },
  ],
  wheel: {
    western: { /* minimal NatalChartWheel input */ },
    bazi: { /* minimal */ },
  },
  fusionNarrative: {
    headline: 'Pionier mit Tiefenmotor',
    rotations: ['Pionier', 'Tiefenseher', 'Funkenträger'],
    evidence: [
      { title: 'Westen', body: 'Sonne Widder · Mond Skorpion · AC Löwe' },
      { title: 'BaZi', body: 'Yang Holz Tagesmeister · Wasser-Mond' },
      { title: 'Resonanz', body: 'Holz-Wasser-Achse · feurige Außenwirkung' },
    ],
  },
  baziPillars: { /* ... */ },
  westernCore: { /* ... */ },
  fusionCoherence: { score: 0.78, lens: 'Holz-Wasser' },
  elementEconomy: { holz: 35, feuer: 25, erde: 10, metall: 10, wasser: 20 },
  deepDive: [
    { id: 'western', title: 'Westliches Detail', href: '#/personality' },
    { id: 'bazi', title: 'BaZi Detail', href: '#/career-finance' },
    { id: 'houses', title: 'Häuser', href: '#/houses' },
  ],
};

function mountPage(fixture) {
  const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>');
  const { document } = dom.window;
  const root = document.getElementById('app');
  // OverviewPage signature must accept (root, viewModel) — adjust if your project uses a different shape.
  OverviewPage(root, fixture);
  return { dom, document, root };
}

test('OverviewPage renders all hero sections in correct order', () => {
  const { root } = mountPage(FIXTURE);

  const sections = Array.from(root.querySelectorAll('[data-section]'));
  const ids = sections.map((el) => el.getAttribute('data-section'));

  assert.deepEqual(
    ids,
    [
      'hero',
      'key-facts',
      'birthchart-wheel',
      'fusion-narrative',
      'bazi-pillars',
      'western-core',
      'fusion-coherence',
      'element-economy',
      'deep-dive',
    ],
    `Section order mismatch. Got: ${ids.join(', ')}`,
  );
});

test('Hero section contains wheel on left and fusion narrative on right', () => {
  const { root } = mountPage(FIXTURE);

  const hero = root.querySelector('[data-section="hero"]');
  assert.ok(hero, 'hero section missing');

  const wheel = hero.querySelector('[data-hero-slot="wheel"]');
  const narrative = hero.querySelector('[data-hero-slot="narrative"]');
  assert.ok(wheel, 'hero wheel slot missing');
  assert.ok(narrative, 'hero narrative slot missing');

  // Reihenfolge im DOM = links/rechts visuell, weil Grid die Source-Order respektiert
  const slots = Array.from(hero.querySelectorAll('[data-hero-slot]'));
  assert.equal(slots[0].getAttribute('data-hero-slot'), 'wheel');
  assert.equal(slots[1].getAttribute('data-hero-slot'), 'narrative');
});

test('Hero narrative contains RollingText headline + 3 evidence cards', () => {
  const { root } = mountPage(FIXTURE);

  const narrative = root.querySelector('[data-hero-slot="narrative"]');
  const rolling = narrative.querySelector('[data-rolling-text]');
  assert.ok(rolling, 'RollingText must render in narrative');

  const evidenceCards = narrative.querySelectorAll('[data-evidence-card]');
  assert.equal(evidenceCards.length, 3, 'must have exactly 3 evidence cards');
});

test('Key Facts strip renders as compact pills above hero content', () => {
  const { root } = mountPage(FIXTURE);

  const keyFacts = root.querySelector('[data-section="key-facts"]');
  assert.ok(keyFacts, 'key-facts section missing');

  const pills = keyFacts.querySelectorAll('[data-key-fact]');
  assert.ok(pills.length >= 3, `expected >= 3 key fact pills, got ${pills.length}`);
});

test('Deep-Dive section renders tiles that link to detail routes', () => {
  const { root } = mountPage(FIXTURE);

  const deep = root.querySelector('[data-section="deep-dive"]');
  assert.ok(deep, 'deep-dive section missing');

  const tiles = Array.from(deep.querySelectorAll('a[data-deep-dive-tile]'));
  assert.ok(tiles.length >= 3, `expected >= 3 deep-dive tiles, got ${tiles.length}`);

  for (const tile of tiles) {
    const href = tile.getAttribute('href') || '';
    assert.match(href, /^#\//, `tile href must be hash-route, got: ${href}`);
  }
});

test('Detail blocks are collapsed by default (progressive disclosure)', () => {
  const { root } = mountPage(FIXTURE);

  const details = Array.from(root.querySelectorAll('details[data-progressive]'));
  assert.ok(details.length >= 1, 'expected at least one collapsible <details> block');

  for (const d of details) {
    assert.equal(d.hasAttribute('open'), false, 'progressive details must start closed');
    const summary = d.querySelector('summary');
    assert.ok(summary, 'each <details> needs a <summary>');
  }
});
```

**Verification:**

```bash
node --test test/overview-hero-layout.test.js
# Erwartung in diesem Task: tests FAIL (Page liefert noch nicht die Struktur).
# Erwartung nach TASK-I4-002: alle 6 tests PASS.
```

---

## TASK-I4-002 — Hero-Composition implementieren

**Iterationsziel-Bezug:** Liefert den sichtbaren Nutzer-Unterschied: Startseite hat das Wheel groß links, Fusion-Narrativ rechts, Key-Facts-Streifen, danach die thematischen Sektionen. Macht die Tests aus I4-001 grün.

**Requirements:** REQ-F-004.

**Files:**
- modify `public/src/pages/OverviewPage.js` — kompletter Umbau auf Hero-Komposition.
- modify `public/src/styles/main.css` — neue Grid-Klassen `.overview-hero`, `.overview-hero__wheel`, `.overview-hero__narrative`, `.key-facts-strip`, `.section-grid`, etc.
- reuse only — keine neuen Komponenten:
  - `NatalChartWheel` (aus `public/src/components/NatalChartWheel.js`, I3)
  - `RollingText` (aus `public/src/components/RollingText.js`, I2)
  - `PageShell`, `LuxuryCard`, `SectionHeader` (aus I1)

**Steps:**

1. OverviewPage von der bisherigen `[ExplainableCard, InsightHero, WhyScoreCard, CoherenceLensCard, ThreeDoors, …]`-Liste auf die neue Section-Pipeline umstellen. Page wird zur reinen Komposition — keine Datenmassage, alle Werte kommen aus `profileToOverviewModel(profile)`.

2. CSS-Grid Desktop: `grid-template-columns: 1.4fr 1fr; gap: var(--space-xl);` für `.overview-hero`. Mobile (≤ 900px): single column, Wheel zuerst, dann Narrativ. Key-Facts-Strip darüber als `display: flex; flex-wrap: wrap;`.

3. Section-Hierarchie: `bazi-pillars`, `western-core`, `fusion-coherence`, `element-economy` jeweils als `<section data-section="…">` mit `SectionHeader` und kompakter Card-Reihe. Lange Inhalte → in TASK-I4-003 in `<details>`-Accordion verlegt.

4. `deep-dive`-Sektion am Ende: Grid aus Tiles (`<a data-deep-dive-tile>`) zu den Detail-Routen.

5. Daten-Mapping: Alles, was vorher in `ExplainableCard`/`WhyScoreCard`/`CoherenceLensCard`/`ThreeDoors` lebte, bleibt erreichbar — entweder direkt in einer Section, oder als Deep-Dive-Tile, oder als Inhalt eines `<details>`-Accordions. **Keine Information geht verloren.**

6. Snapshot-Test aus I4-001 muss grün werden. `node --test` für gesamte Suite muss weiter grün sein.

**Complete OverviewPage.js skeleton:**

```javascript
// public/src/pages/OverviewPage.js
import { PageShell, SectionHeader, LuxuryCard } from '../components/index.js';
import { NatalChartWheel } from '../components/NatalChartWheel.js';
import { RollingText } from '../components/RollingText.js';
import { profileToOverviewModel } from '../domain/projections.js';

/**
 * OverviewPage — Premium-Hero Composition (I4).
 *
 * @param {HTMLElement} root  Mount node (passed by router).
 * @param {object} input      Either a raw profile or an already-mapped viewModel.
 *                            We accept both; if `keyFacts` is present we assume it's a model.
 */
export function OverviewPage(root, input) {
  const vm = input && input.keyFacts ? input : profileToOverviewModel(input);

  const shell = PageShell({
    title: 'Übersicht',
    subtitle: 'Dein Resonanzraum auf einen Blick',
  });

  shell.append(
    renderHero(vm),
    renderKeyFacts(vm),
    renderBaziPillars(vm),
    renderWesternCore(vm),
    renderFusionCoherence(vm),
    renderElementEconomy(vm),
    renderDeepDive(vm),
  );

  root.replaceChildren(shell);
}

// ---------------------------------------------------------------------------
// Hero  (data-section="hero")  +  inner birthchart-wheel + fusion-narrative
// ---------------------------------------------------------------------------

function renderHero(vm) {
  const hero = document.createElement('section');
  hero.dataset.section = 'hero';
  hero.className = 'overview-hero';

  // Left slot — birthchart wheel (data-section="birthchart-wheel" lives inside)
  const wheelSlot = document.createElement('div');
  wheelSlot.dataset.heroSlot = 'wheel';
  wheelSlot.className = 'overview-hero__wheel';

  const wheelSection = document.createElement('div');
  wheelSection.dataset.section = 'birthchart-wheel';
  wheelSection.append(NatalChartWheel({ data: vm.wheel, size: 'large' }));
  wheelSlot.append(wheelSection);

  // Right slot — fusion narrative
  const narrativeSlot = document.createElement('div');
  narrativeSlot.dataset.heroSlot = 'narrative';
  narrativeSlot.className = 'overview-hero__narrative';

  const narrativeSection = document.createElement('div');
  narrativeSection.dataset.section = 'fusion-narrative';

  const headline = document.createElement('h1');
  headline.className = 'overview-hero__headline';
  headline.append(
    RollingText({
      label: vm.fusionNarrative.headline,
      rotations: vm.fusionNarrative.rotations,
    }),
  );
  narrativeSection.append(headline);

  const evidenceGrid = document.createElement('div');
  evidenceGrid.className = 'overview-hero__evidence';
  for (const ev of vm.fusionNarrative.evidence.slice(0, 3)) {
    const card = LuxuryCard({ title: ev.title, body: ev.body });
    card.dataset.evidenceCard = ev.title.toLowerCase();
    evidenceGrid.append(card);
  }
  narrativeSection.append(evidenceGrid);
  narrativeSlot.append(narrativeSection);

  hero.append(wheelSlot, narrativeSlot);
  return hero;
}

// ---------------------------------------------------------------------------
// Key Facts strip  (data-section="key-facts")  — compact pills above hero body
// ---------------------------------------------------------------------------

function renderKeyFacts(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'key-facts';
  section.className = 'key-facts-strip';

  for (const fact of vm.keyFacts) {
    const pill = document.createElement('span');
    pill.className = 'key-fact-pill';
    pill.dataset.keyFact = '';
    pill.innerHTML = `
      <span class="key-fact-pill__label">${escape(fact.label)}</span>
      <span class="key-fact-pill__value">${escape(fact.value)}</span>
    `;
    section.append(pill);
  }
  return section;
}

// ---------------------------------------------------------------------------
// Thematic sections — each renders a SectionHeader + a tight summary card row.
// Long detail blocks live inside <details data-progressive> (see I4-003).
// ---------------------------------------------------------------------------

function renderBaziPillars(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'bazi-pillars';
  section.append(SectionHeader({ title: 'BaZi · Vier Säulen', kicker: 'Östliche Achse' }));
  section.append(renderPillarSummary(vm.baziPillars));
  section.append(renderDetails('Säulen-Details', () => renderPillarLongform(vm.baziPillars)));
  return section;
}

function renderWesternCore(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'western-core';
  section.append(SectionHeader({ title: 'Westliche Kernachsen', kicker: 'Sonne · Mond · AC' }));
  section.append(renderWesternSummary(vm.westernCore));
  section.append(renderDetails('Aspekte & Häuser', () => renderWesternLongform(vm.westernCore)));
  return section;
}

function renderFusionCoherence(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'fusion-coherence';
  section.append(SectionHeader({ title: 'Fusion · Kohärenz', kicker: 'Wo Ost und West sich tragen' }));
  section.append(renderCoherenceSummary(vm.fusionCoherence));
  return section;
}

function renderElementEconomy(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'element-economy';
  section.append(SectionHeader({ title: 'Element-Ökonomie', kicker: 'Holz · Feuer · Erde · Metall · Wasser' }));
  section.append(renderElementBars(vm.elementEconomy));
  return section;
}

// ---------------------------------------------------------------------------
// Deep-Dive  (see TASK-I4-003 for richer behavior)
// ---------------------------------------------------------------------------

function renderDeepDive(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'deep-dive';
  section.append(SectionHeader({ title: 'Vertiefung', kicker: 'Wo geht es weiter?' }));

  const grid = document.createElement('div');
  grid.className = 'deep-dive-grid';
  for (const tile of vm.deepDive) {
    const a = document.createElement('a');
    a.dataset.deepDiveTile = tile.id;
    a.className = 'deep-dive-tile';
    a.href = tile.href;
    a.innerHTML = `
      <span class="deep-dive-tile__title">${escape(tile.title)}</span>
      <span class="deep-dive-tile__arrow" aria-hidden="true">→</span>
    `;
    grid.append(a);
  }
  section.append(grid);
  return section;
}

// ---------------------------------------------------------------------------
// Tiny helpers — kept inside the file because they are page-local.
// ---------------------------------------------------------------------------

function renderDetails(summaryText, bodyFactory) {
  const d = document.createElement('details');
  d.dataset.progressive = '';
  const s = document.createElement('summary');
  s.textContent = summaryText;
  d.append(s);
  d.append(bodyFactory());
  return d;
}

function renderPillarSummary(pillars) { /* compact row using LuxuryCard */ const el = document.createElement('div'); el.className = 'pillar-summary'; return el; }
function renderPillarLongform(pillars) { const el = document.createElement('div'); el.className = 'pillar-longform'; return el; }
function renderWesternSummary(core) { const el = document.createElement('div'); el.className = 'western-summary'; return el; }
function renderWesternLongform(core) { const el = document.createElement('div'); el.className = 'western-longform'; return el; }
function renderCoherenceSummary(c) { const el = document.createElement('div'); el.className = 'coherence-summary'; return el; }
function renderElementBars(e) { const el = document.createElement('div'); el.className = 'element-bars'; return el; }

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
```

**Complete CSS additions (`public/src/styles/main.css`):**

```css
/* ============================================================
 * Overview Premium-Hero (I4)
 * ============================================================ */

.overview-hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--space-xl, 2rem);
  align-items: start;
  margin-block: var(--space-xl, 2rem);
}

.overview-hero__wheel {
  /* NatalChartWheel sets its own intrinsic sizing — we just give it the column */
  min-width: 0;
}

.overview-hero__wheel svg,
.overview-hero__wheel canvas {
  width: 100%;
  height: auto;
  max-width: 640px;
}

.overview-hero__narrative {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg, 1.5rem);
  min-width: 0;
}

.overview-hero__headline {
  font-family: var(--font-display, "Playfair Display", serif);
  font-size: clamp(1.75rem, 3.2vw, 2.75rem);
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0;
}

.overview-hero__evidence {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md, 1rem);
}

@media (min-width: 1280px) {
  .overview-hero__evidence {
    grid-template-columns: 1fr 1fr;
  }
  .overview-hero__evidence > :first-child {
    grid-column: 1 / -1;
  }
}

/* ---- mobile collapse ---- */
@media (max-width: 900px) {
  .overview-hero {
    grid-template-columns: 1fr;
  }
  .overview-hero__wheel { order: 1; }
  .overview-hero__narrative { order: 2; }
}

/* ---- Key Facts strip ---- */
.key-facts-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm, 0.5rem);
  margin-block: var(--space-md, 1rem) var(--space-lg, 1.5rem);
}

.key-fact-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: var(--surface-elevated, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  font-size: 0.875rem;
}

.key-fact-pill__label {
  color: var(--text-muted, rgba(255, 255, 255, 0.6));
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.7rem;
}
.key-fact-pill__value {
  color: var(--text-strong, #fff);
  font-weight: 600;
}

/* ---- Section spacing ---- */
section[data-section] + section[data-section] {
  margin-top: var(--space-xl, 2rem);
}

/* ---- Progressive disclosure ---- */
details[data-progressive] {
  margin-top: var(--space-md, 1rem);
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  padding-top: var(--space-sm, 0.5rem);
}
details[data-progressive] > summary {
  cursor: pointer;
  list-style: none;
  font-size: 0.9rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.65));
  padding: 0.5rem 0;
}
details[data-progressive] > summary::after {
  content: " ▾";
  display: inline-block;
  transition: transform 0.15s ease-out;
}
details[data-progressive][open] > summary::after {
  transform: rotate(180deg);
}

/* ---- Deep-Dive tiles ---- */
.deep-dive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-md, 1rem);
  margin-top: var(--space-md, 1rem);
}
.deep-dive-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md, 1rem);
  border-radius: var(--radius-lg, 12px);
  background: var(--surface-elevated, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease-out, border-color 0.15s ease-out;
}
.deep-dive-tile:hover,
.deep-dive-tile:focus-visible {
  transform: translateY(-2px);
  border-color: var(--accent, rgba(255, 200, 120, 0.5));
}
.deep-dive-tile__title { font-weight: 600; }
.deep-dive-tile__arrow { opacity: 0.6; }
```

**Verification:**

```bash
node --test test/overview-hero-layout.test.js
node --test
# Sichtprüfung im Browser:
npm start
# → http://127.0.0.1:3000/#/overview
```

---

## TASK-I4-003 — Progressive Disclosure für Ist-Details

**Iterationsziel-Bezug:** Garantiert, dass die Hero-Struktur nicht durch einen ellenlangen Datenband-Anhang verwässert wird. Ist-Details (Aspekte, Häuser, Raw-BaZi-Felder) sind erreichbar, aber zugeklappt; Deep-Dive-Tiles routen klar auf eigene Detailseiten.

**Requirements:** REQ-F-006 (Details erreichbar nicht Datenband).

**Files:**
- modify `public/src/pages/OverviewPage.js` — `renderPillarLongform`, `renderWesternLongform`, ggf. `renderElementEconomyDetails` mit echtem Inhalt füllen; alle in `<details data-progressive>` einhängen.
- possibly modify `public/src/components/SecondaryNav.js` — falls die Deep-Dive-Tiles ein einheitliches SecondaryNav-Pattern teilen sollen.
- create `test/playwright/overview-hero.spec.js` (oder erweitern bestehende `test/playwright/*` aus I0).

**Steps:**

1. Implementiere die `renderPillarLongform`-/`renderWesternLongform`-Stubs aus TASK-I4-002 mit echtem Inhalt: Aspekt-Liste, Haus-Tabelle, Raw-Werte. Wrap das Ganze konsequent in `<details data-progressive>` mit `<summary>` als Toggle. Default `closed`.

2. Stelle sicher, dass `<details>` per Tastatur (Space/Enter auf `<summary>`) toggelbar ist — das ist Native-Browser-Verhalten, also keine zusätzliche JS-Logik. Keine `tabindex`-Eingriffe.

3. Deep-Dive-Tiles routen über den vorhandenen Hash-Router (`#/personality`, `#/career-finance`, `#/houses`). Im OverviewPage **nichts** an `addEventListener`-Handlern — der bestehende Router triggert `hashchange`.

4. Playwright-Spec:
   - Desktop-Viewport (1440×900): Screenshot der Overview, gespeichert nach `docs/qa/screenshots/i4-overview/overview-desktop.png`.
   - Mobile-Viewport (390×844, iPhone-14-ähnlich): Screenshot `overview-mobile.png`.
   - Hero close-up: Screenshot des `[data-section="hero"]` Bereiches → `hero-closeup.png`.
   - Klick auf ersten Deep-Dive-Tile → `expect(page.url()).toContain('#/')` und URL ≠ Overview.
   - Klick auf erstes `<summary>` → `expect(...).toHaveAttribute('open')` am Eltern-`<details>`. Screenshot `deep-dive-expanded.png`.

5. Constraint check: vor dem Merge `rg "ExplainableCard|WhyScoreCard|CoherenceLensCard|ThreeDoors|InsightHero" public/src/pages/OverviewPage.js` → muss leer sein (alte Card-Stack-Reste sind entfernt), aber `rg ...` über das gesamte `public/` darf weiterhin Treffer haben, weil die Komponenten von Detail-Seiten genutzt werden.

**Complete Playwright spec (`test/playwright/overview-hero.spec.js`):**

```javascript
// test/playwright/overview-hero.spec.js
import { test, expect } from '@playwright/test';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/qa/screenshots/i4-overview');
const OVERVIEW_URL = '/#/overview';

test.describe('I4 Overview Hero', () => {
  test('desktop hero renders wheel-left / narrative-right and captures screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(OVERVIEW_URL);
    await page.waitForSelector('[data-section="hero"]');

    // Structural assertions
    const heroSlots = await page.$$eval(
      '[data-section="hero"] [data-hero-slot]',
      (els) => els.map((e) => e.getAttribute('data-hero-slot')),
    );
    expect(heroSlots).toEqual(['wheel', 'narrative']);

    const evidence = await page.locator('[data-evidence-card]').count();
    expect(evidence).toBe(3);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'overview-desktop.png'),
      fullPage: true,
    });

    await page.locator('[data-section="hero"]').screenshot({
      path: path.join(SCREENSHOT_DIR, 'hero-closeup.png'),
    });
  });

  test('mobile (390x844) stacks wheel above narrative', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(OVERVIEW_URL);
    await page.waitForSelector('[data-section="hero"]');

    // On mobile, wheel still appears first in source order
    const heroSlots = await page.$$eval(
      '[data-section="hero"] [data-hero-slot]',
      (els) => els.map((e) => e.getAttribute('data-hero-slot')),
    );
    expect(heroSlots).toEqual(['wheel', 'narrative']);

    // Both slots must be visible
    await expect(page.locator('[data-hero-slot="wheel"]')).toBeVisible();
    await expect(page.locator('[data-hero-slot="narrative"]')).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'overview-mobile.png'),
      fullPage: true,
    });
  });

  test('progressive <details> blocks start closed and open on click', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(OVERVIEW_URL);

    const first = page.locator('details[data-progressive]').first();
    await expect(first).not.toHaveAttribute('open', /.*/);

    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'deep-dive-expanded.png'),
      fullPage: true,
    });
  });

  test('deep-dive tile navigates to detail route', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(OVERVIEW_URL);

    const tile = page.locator('[data-deep-dive-tile]').first();
    const targetHref = await tile.getAttribute('href');
    expect(targetHref).toMatch(/^#\//);

    await tile.click();
    await page.waitForFunction(
      (expected) => window.location.hash === expected,
      targetHref,
    );

    expect(page.url()).toContain(targetHref);
    // Sanity: we are no longer on the overview route
    expect(page.url()).not.toContain('#/overview');
  });
});
```

**Verification:**

```bash
npx playwright test test/playwright/overview-hero.spec.js
ls docs/qa/screenshots/i4-overview/
# expected files: overview-desktop.png, overview-mobile.png, hero-closeup.png, deep-dive-expanded.png
```

---

## Iteration Definition of Done

Die Iteration I4 ist **erst dann** abgeschlossen, wenn alle Punkte erfüllt sind:

- [ ] `test/overview-hero-layout.test.js` läuft grün und assertiert die exakte Section-Reihenfolge: `hero`, `key-facts`, `birthchart-wheel`, `fusion-narrative`, `bazi-pillars`, `western-core`, `fusion-coherence`, `element-economy`, `deep-dive`.
- [ ] `node --test` (gesamte Suite) bleibt grün.
- [ ] `OverviewPage.js` enthält keine Referenzen mehr auf den alten Card-Stack (`ExplainableCard`, `WhyScoreCard`, `CoherenceLensCard`, `ThreeDoors`, `InsightHero`). Diese Komponenten dürfen weiterhin in anderen Pages existieren.
- [ ] Desktop-Hero: Wheel links, groß; Fusion-Narrativ rechts mit RollingText-Headline und genau 3 Evidence-Cards.
- [ ] Key-Facts-Strip mit ≥ 3 Pills oberhalb der thematischen Sektionen sichtbar.
- [ ] Mobile (≤ 900 px): Wheel oben, Narrativ darunter, Pills wrap.
- [ ] Alle „Long-Detail“-Blöcke (Aspekte, Häuser, Raw-Werte) liegen in `<details data-progressive>` und sind default-closed.
- [ ] Deep-Dive-Tiles routen via Hash auf Detailseiten (Western/BaZi/Häuser/…). Klick triggert `hashchange`, Page wechselt.
- [ ] Screenshots in `docs/qa/screenshots/i4-overview/`: `overview-desktop.png`, `overview-mobile.png`, `hero-closeup.png`, `deep-dive-expanded.png`.
- [ ] Keine Datum/Berechnung in der Page selbst — alles über `profileToOverviewModel`.
- [ ] Constraint „no data loss": Jedes Datum, das vorher im Overview-Card-Stack stand, ist weiterhin erreichbar (in einer Section, einem `<details>`, oder via Deep-Dive-Tile).

## Validation strategy

```bash
# 1) Unit + integration suite (must all pass)
node --test

# 2) Targeted Hero-Layout-Test
node --test test/overview-hero-layout.test.js

# 3) Playwright visual + interaction
npx playwright test test/playwright/overview-hero.spec.js

# 4) Manual eyeballs
npm start
# open http://127.0.0.1:3000/#/overview
# resize window between 390px and 1440px, verify mobile↔desktop collapse
# click each deep-dive tile, confirm route changes
# click each <summary>, confirm <details> opens and closes

# 5) Constraint check — no old card-stack residue
rg -n "ExplainableCard|WhyScoreCard|CoherenceLensCard|ThreeDoors|InsightHero" public/src/pages/OverviewPage.js
# expected: zero matches

# 6) Documentation sync
node --test test/documentation.test.js
```

## Rollback note

Wenn das Premium-Hero-Layout in Produktion regressiv wirkt (z. B. Wheel rendert nicht, oder Hero kollabiert nicht sauber auf Mobile), ist der Rollback **eine Datei**:

```bash
git checkout HEAD~1 -- public/src/pages/OverviewPage.js public/src/styles/main.css
```

`NatalChartWheel`, `RollingText`, `PageShell`, `LuxuryCard`, `SectionHeader` werden von anderen Seiten weiter gebraucht — die dürfen **nicht** mitrückgerollt werden. Die Tests `test/overview-hero-layout.test.js` und `test/playwright/overview-hero.spec.js` schlagen dann fehl; das ist gewollt und signalisiert, dass die Iteration zurückgenommen wurde.

Daten gehen nicht verloren: Der Rollback betrifft nur die Komposition. `profileToOverviewModel` und alle Detail-Routen bleiben intakt.

## Handoff to next iteration: I5

I4 liefert die strukturelle Hero-Bühne. **I5** baut darauf:

- I5 = **Detail-Seiten Premium-Pass** (Personality, LoveCareer, Synastry, Daily) bekommen denselben PageShell + SectionHeader + LuxuryCard + RollingText-Pass wie Overview, damit ein Klick auf ein Deep-Dive-Tile nicht in ein visuell unstimmiges Drittes führt.
- I5 darf voraussetzen: `data-section`-Pattern ist etabliert, Hero-Grid-Vokabular (`overview-hero__*`, `key-facts-strip`, `deep-dive-grid`) ist vorhanden und wiederverwendbar.
- I5 darf annehmen: `<details data-progressive>`-Pattern für Long-Detail-Blöcke ist der projektweite Default für „Datenband-Vermeidung".

Open Decision für I5: Sollen die Detail-Seiten ein eigenes Mini-Hero (kleineres Wheel + thematischer Narrativ) bekommen, oder genügt ein SectionHeader + Sticky-Kontext? Hängt davon ab, wie laut der Hero in I4-Screenshots wirkt — vor I5-Start `overview-desktop.png` und `hero-closeup.png` einmal mit dem User durchsehen.
