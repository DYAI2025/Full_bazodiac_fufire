# I6 — Sub-Pages Visual Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Unterseiten visuell konsolidieren. Sichtbarer Nutzer-Unterschied: Tagespuls, Haeuser, Fusion, Wu-Xing wirken wie ein Produkt. Abschluss nur wenn alle Hauptseiten einheitliche Layout-/Typo-Komponenten nutzen.

**Goal:** Alle Hauptseiten (Daily, Houses, Fusion, Wuxing, Western, BaZi, Synastry) auf gemeinsames PageShell/SectionHeader/LuxuryCard-Fundament heben — eine visuelle Sprache, kein Inhalt verloren.

**Architecture:** Pro Seite: PageShell als Root, SectionHeader pro Top-Section, LuxuryCard für jede Datenkachel. Domain-Logik (baziRenderer, wuxingEnrichment, relationshipResonance) bleibt unverändert; nur die Präsentationsschicht wird vereinheitlicht.

**Tech Stack:** Vanilla ESM, CSS Grid/Flex, shared components aus I1, node --test, Playwright.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0, I1 (shared components must exist), I2 (RollingText for section titles), I4 (Overview-Hero als visuelle Referenz).

---

## Sprintziel-Bezug

Alle Hauptseiten wirken wie ein gemeinsames Produkt, nicht wie einzelne Implementierungsinseln. Tagespuls, Haeuser, Fusion, Wu-Xing, Western, BaZi und Beziehung werden auf gemeinsame Layout-/Typography-/Card-Standards gebracht. Domain-Inhalte (DailyCheckin, baziRenderer-Pillars, WuxingRadar, RelationshipResonance, etc.) bleiben byte-identisch — nur das Chrome (Hülle) ändert sich.

## Requirements covered

- **REQ-F-004** — Ziel-Hero-Struktur (jede Seite hat genau einen H1, eingebettet in PageShell + SectionHeader).
- **REQ-F-006** — Details erreichbar (alle vorhandenen Daten/Module bleiben sichtbar, nichts entfernt; nur visuell gekapselt in LuxuryCard).

---

## Task-Übersicht

| Task | Datei(en) | Commit |
|---|---|---|
| TASK-I6-001 | `test/typography-rollout.test.js`, `test/page-design-parity.test.js` | `test(i6): design parity assertions across all sub-pages` |
| TASK-I6-002 | `public/src/pages/DailyPage.js` | `refactor(daily): consolidate on PageShell/SectionHeader/LuxuryCard` |
| TASK-I6-003a | `public/src/pages/HousesPage.js` | `refactor(houses): 12-house luxury grid under PageShell` |
| TASK-I6-003b | `public/src/pages/FusionPage.js` | `refactor(fusion): wrap element-layer narrative + radar in PageShell` |
| TASK-I6-003c | `public/src/pages/WuxingPage.js` | `refactor(wuxing): unified radar + education + recs sections` |
| TASK-I6-004a | `public/src/pages/WesternPage.js` | `refactor(western): shared layout, preserve westernBodyEnrichment` |
| TASK-I6-004b | `public/src/pages/BaziPage.js` | `refactor(bazi): shared layout, preserve renderBaziPillars` |
| TASK-I6-004c | `public/src/pages/SynastryPage.js` | `refactor(synastry): shared layout, preserve relationshipResonance` |

One sub-page = one commit. Each commit is independently revertable.

---

## TASK-I6-001 — Design-Parity Tests für alle Hauptseiten

**Iterationsziel-Bezug:** Diese Tests definieren, was "konsolidiert" konkret heißt. Sie failen vor dem Refactor und werden zur grünen Voraussetzung für Iterationsabschluss.

**Requirements:** REQ-F-004 (genau ein H1), REQ-F-006 (Card-System konsistent).

**Files:**
- modify `test/typography-rollout.test.js` — extend rollout list with all seven main sub-pages.
- create `test/page-design-parity.test.js` — single source of truth for cross-page structural invariants.

### TDD steps

1. **Red.** Create test file with the full assertion loop and the page registry. Run `node --test test/page-design-parity.test.js` — should fail on at least one page (likely all seven).
2. **Reference helper.** Use the existing `test/helpers/capture-dom.js` from I0 (jsdom-based mount helper). If absent, fall back to a minimal jsdom bootstrap inside the test.
3. **Loop assertion.** For each page module, dynamically import its default export, mount into a fresh DOM, then assert: exactly 1 `h1`, root has `data-page-shell` attribute (PageShell marker from I1), zero `.page-title-old` legacy selectors, every "main card" container carries `data-card="luxury"` OR is a LuxuryCard instance, exactly one `SectionHeader` per top-level `<section data-section>`.
4. **Offender reporting.** Collect failures per page into a single descriptive error so the engineer sees "DailyPage: missing data-page-shell; HousesPage: 0 H1 found" in one shot, instead of cycling through seven red-bar runs.
5. **Green.** All later tasks (I6-002 … I6-004c) move pages from red to green, one at a time.

### Complete test file — `test/page-design-parity.test.js`

```javascript
// test/page-design-parity.test.js
//
// Cross-page structural parity assertions for I6.
// Every main sub-page must mount under a unified PageShell + SectionHeader + LuxuryCard skeleton.
//
// Run: node --test test/page-design-parity.test.js
//
// Failure mode: a single descriptive error lists every offending page in one shot
// so the engineer doesn't have to cycle through seven red-bar runs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');

// Registry: the seven main sub-pages I6 consolidates.
// `mountArg` is the canonical viewModel each page expects;
// we feed a deterministic fixture so the page can fully render.
const PAGES = [
  { name: 'DailyPage',    file: 'public/src/pages/DailyPage.js' },
  { name: 'HousesPage',   file: 'public/src/pages/HousesPage.js' },
  { name: 'FusionPage',   file: 'public/src/pages/FusionPage.js' },
  { name: 'WuxingPage',   file: 'public/src/pages/WuxingPage.js' },
  { name: 'WesternPage',  file: 'public/src/pages/WesternPage.js' },
  { name: 'BaziPage',     file: 'public/src/pages/BaziPage.js' },
  { name: 'SynastryPage', file: 'public/src/pages/SynastryPage.js' },
];

// Deterministic fixture covering every field any page reads.
// Pages may ignore irrelevant branches; missing keys must never throw.
function makeFixture () {
  return {
    view_model_version: 'i6-test',
    western: {
      sun: { sign: 'Loewe', degree: 12 },
      moon: { sign: 'Krebs', degree: 4 },
      ascendant: { sign: 'Waage', degree: 27 },
      houses: Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        sign: 'Loewe',
        ruler: 'Sonne',
        cusp_degree: i * 30,
        themes: ['Selbst', 'Identitaet'],
      })),
      body_enrichment: { vitality: 0.7, sensitivity: 0.5 },
    },
    bazi: {
      pillars: {
        year:  { stem: 'Geng', branch: 'Yin',  element: 'Metall', hidden_stems: ['Jia', 'Bing'] },
        month: { stem: 'Xin',  branch: 'Mao',  element: 'Metall', hidden_stems: ['Yi'] },
        day:   { stem: 'Ren',  branch: 'Chen', element: 'Wasser', hidden_stems: ['Wu', 'Yi', 'Gui'] },
        hour:  { stem: 'Jia',  branch: 'Wu',   element: 'Holz',   hidden_stems: ['Ding', 'Ji'] },
      },
      day_master: 'Ren',
    },
    fusion: {
      wuxing_distribution: { Holz: 0.18, Feuer: 0.22, Erde: 0.20, Metall: 0.20, Wasser: 0.20 },
      element_layers: [
        { layer: 'Kern',    dominant: 'Wasser', narrative: 'Tiefe Reflexion.' },
        { layer: 'Antrieb', dominant: 'Feuer',  narrative: 'Schoepferischer Impuls.' },
      ],
    },
    wuxing: {
      distribution: { Holz: 0.18, Feuer: 0.22, Erde: 0.20, Metall: 0.20, Wasser: 0.20 },
      recommendations: [
        { element: 'Holz', tone: 'staerken', impulse: 'Tagesplanung in der Frueh.' },
      ],
      education: [
        { element: 'Holz',  meaning: 'Wachstum, Beginn.' },
        { element: 'Feuer', meaning: 'Ausdruck, Praesenz.' },
      ],
    },
    daily: {
      date: '2026-05-22',
      score: 78,
      checkin: { mood: 0.7, energy: 0.6 },
      impulses: [{ id: 'a', text: 'Atme tief.', element: 'Wasser' }],
      sections: [{ id: 'heute', title: 'Heute', body: 'Klare Sicht.' }],
    },
    synastry: {
      personA: { name: 'A' },
      personB: { name: 'B' },
      element_tension: { Holz: 0.1, Feuer: 0.4, Erde: 0.0, Metall: 0.2, Wasser: 0.3 },
      domain_scores: { love: 0.8, career: 0.6, growth: 0.7, conflict: 0.3 },
      house_comparison: Array.from({ length: 12 }, (_, i) => ({
        house: i + 1, score: 0.5 + (i % 3) * 0.1,
      })),
    },
  };
}

function makeDom () {
  const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  // Wire jsdom globals for modules that touch document/window at import time.
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.customElements = dom.window.customElements;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  return dom;
}

async function importPage (relFile) {
  const url = pathToFileURL(path.join(ROOT, relFile)).href + `?cacheBust=${Date.now()}`;
  const mod = await import(url);
  return mod.default ?? mod.render ?? mod;
}

async function mountPage (pageModule, container, viewModel) {
  // Pages export either a class with mount(root, vm), a function (root, vm), or { render(root, vm) }.
  if (typeof pageModule === 'function') {
    const out = pageModule(container, viewModel);
    if (out && typeof out.then === 'function') await out;
    return;
  }
  if (pageModule && typeof pageModule.mount === 'function') {
    await pageModule.mount(container, viewModel);
    return;
  }
  if (pageModule && typeof pageModule.render === 'function') {
    await pageModule.render(container, viewModel);
    return;
  }
  throw new Error('Page module has no callable mount/render/default.');
}

function auditPage (container, name) {
  const offenses = [];

  // 1. Exactly one H1.
  const h1s = container.querySelectorAll('h1');
  if (h1s.length !== 1) offenses.push(`${name}: expected exactly 1 <h1>, found ${h1s.length}`);

  // 2. PageShell root marker.
  const shell = container.querySelector('[data-page-shell]');
  if (!shell) offenses.push(`${name}: missing root [data-page-shell] marker (PageShell not used)`);

  // 3. Legacy class banned.
  const legacy = container.querySelectorAll('.page-title-old');
  if (legacy.length > 0) offenses.push(`${name}: ${legacy.length} legacy .page-title-old element(s) still present`);

  // 4. Main cards use luxury system.
  // "Main card" = any element with role="article" OR class*="card" at depth > 1 inside a section.
  const candidateCards = container.querySelectorAll('section [data-section-body] > *');
  const nonLuxury = Array.from(candidateCards).filter((el) => {
    // Allowed: <p>, <ul>, <div data-card="luxury">, or any explicit LuxuryCard marker.
    if (el.tagName === 'P' || el.tagName === 'UL' || el.tagName === 'OL') return false;
    if (el.matches('[data-card="luxury"]')) return false;
    if (el.matches('[data-component="LuxuryCard"]')) return false;
    // Allow grids/wrappers that themselves contain LuxuryCards.
    if (el.querySelector('[data-card="luxury"], [data-component="LuxuryCard"]')) return false;
    return true;
  });
  if (nonLuxury.length > 0) {
    offenses.push(`${name}: ${nonLuxury.length} card-like element(s) not using data-card="luxury" or LuxuryCard`);
  }

  // 5. Exactly one SectionHeader per top-level section.
  const sections = container.querySelectorAll('[data-page-shell] > main > section[data-section], [data-page-shell] section[data-section]');
  sections.forEach((sec) => {
    const headers = sec.querySelectorAll(':scope > [data-section-header], :scope > header[data-component="SectionHeader"]');
    if (headers.length !== 1) {
      offenses.push(`${name}: section "${sec.dataset.section}" has ${headers.length} SectionHeader(s) (expected 1)`);
    }
  });

  return offenses;
}

test('I6: every main sub-page passes design parity audit', async () => {
  const allOffenses = [];
  const fixture = makeFixture();

  for (const page of PAGES) {
    const dom = makeDom();
    const container = dom.window.document.getElementById('app');
    try {
      const mod = await importPage(page.file);
      await mountPage(mod, container, fixture);
    } catch (err) {
      allOffenses.push(`${page.name}: mount threw ${err.message}`);
      continue;
    }
    const offenses = auditPage(container, page.name);
    allOffenses.push(...offenses);
  }

  assert.equal(
    allOffenses.length,
    0,
    `Design parity violations across sub-pages:\n  - ${allOffenses.join('\n  - ')}`
  );
});
```

### Typography rollout extension — `test/typography-rollout.test.js`

Add the seven sub-pages to the existing rollout list so I2 RollingText / type-scale tests cover them too:

```javascript
// In test/typography-rollout.test.js — extend the existing PAGES_UNDER_ROLLOUT array
export const PAGES_UNDER_ROLLOUT = [
  // existing entries from I2 …
  'public/src/pages/DailyPage.js',
  'public/src/pages/HousesPage.js',
  'public/src/pages/FusionPage.js',
  'public/src/pages/WuxingPage.js',
  'public/src/pages/WesternPage.js',
  'public/src/pages/BaziPage.js',
  'public/src/pages/SynastryPage.js',
];
```

If the file does not yet export `PAGES_UNDER_ROLLOUT`, refactor I2's rollout test to read from a single shared list to keep test drift to zero.

**Commit:** `test(i6): design parity assertions across all sub-pages`

---

## TASK-I6-002 — Tagespuls (DailyPage) konsolidieren

**Iterationsziel-Bezug:** DailyPage ist der sichtbarste Touchpoint (täglich aufgerufen). Wenn sie konsolidiert wirkt, fühlt sich das Produkt geschlossen an.

**Requirements:** REQ-F-004, REQ-F-006.

**Files:** modify `public/src/pages/DailyPage.js`.

### TDD steps

1. **Red.** `node --test test/page-design-parity.test.js` reports DailyPage offenses (missing PageShell, multiple H1, etc.).
2. **Inventory existing content first.** Open `DailyPage.js` and list every child component it currently mounts: `DailyCheckin`, `DailyLearnImpulseCard`, `ScoreBandCard`, impulses list, action panel. Each of these must reappear in the new structure, byte-identical in data binding.
3. **Sections plan (mirrors spec):**
   - Hero — H1 ("Dein Tagespuls" / RollingText), date sub-line, ScoreBandCard.
   - Heute — DailyCheckin + current-state summary.
   - Bedeutung — DailyLearnImpulseCard + element-impulse list.
   - Aktionen — action buttons (CTA back to Overview, share, etc.).
4. **Wrap, don't rewrite.** Each child component keeps its internal markup and event handlers; we only wrap each in a LuxuryCard and group cards under a SectionHeader.
5. **Run domain tests.** `node --test test/daily-data-flow.test.js` must stay green. If anything turns red, the wrap broke a data path — fix before moving on.
6. **Green.** `node --test test/page-design-parity.test.js` clears DailyPage offenses. Other six pages still red — expected.

### Before — current skeleton (illustrative)

```javascript
// public/src/pages/DailyPage.js — BEFORE
import { renderDailyCheckin } from '../components/DailyCheckin.js';
import { renderScoreBand } from '../components/ScoreBandCard.js';
import { renderLearnImpulse } from '../components/DailyLearnImpulseCard.js';

export default function DailyPage (root, vm) {
  root.innerHTML = `
    <div class="daily-page">
      <h1 class="page-title-old">Tagespuls</h1>
      <h1 class="daily-sub">${vm.daily.date}</h1>  <!-- bug: two H1 -->
      <div class="card-old">${renderScoreBand(vm.daily.score)}</div>
      <div class="card-old">${renderDailyCheckin(vm.daily.checkin)}</div>
      <div class="card-old">${renderLearnImpulse(vm.daily.impulses)}</div>
      <div class="actions-bar">…</div>
    </div>
  `;
}
```

### After — consolidated under PageShell/SectionHeader/LuxuryCard

```javascript
// public/src/pages/DailyPage.js — AFTER
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';
import { renderDailyCheckin } from '../components/DailyCheckin.js';
import { renderScoreBand } from '../components/ScoreBandCard.js';
import { renderLearnImpulse } from '../components/DailyLearnImpulseCard.js';

export default function DailyPage (root, vm) {
  const shell = PageShell({
    title: 'Dein Tagespuls',           // single H1 lives inside PageShell
    subtitle: vm.daily.date,
    pageId: 'daily',
  });

  // Hero
  const hero = document.createElement('section');
  hero.dataset.section = 'hero';
  hero.appendChild(SectionHeader({ eyebrow: 'Heute', title: 'Tagesresonanz' }));
  const heroBody = document.createElement('div');
  heroBody.dataset.sectionBody = '';
  heroBody.appendChild(LuxuryCard({ children: renderScoreBand(vm.daily.score) }));
  hero.appendChild(heroBody);

  // Heute
  const heute = document.createElement('section');
  heute.dataset.section = 'heute';
  heute.appendChild(SectionHeader({ eyebrow: 'Check-in', title: 'Wie geht es dir gerade?' }));
  const heuteBody = document.createElement('div');
  heuteBody.dataset.sectionBody = '';
  heuteBody.appendChild(LuxuryCard({ children: renderDailyCheckin(vm.daily.checkin) }));
  heute.appendChild(heuteBody);

  // Bedeutung
  const bedeutung = document.createElement('section');
  bedeutung.dataset.section = 'bedeutung';
  bedeutung.appendChild(SectionHeader({ eyebrow: 'Lerne', title: 'Bedeutung des Impulses' }));
  const bedBody = document.createElement('div');
  bedBody.dataset.sectionBody = '';
  bedBody.appendChild(LuxuryCard({ children: renderLearnImpulse(vm.daily.impulses) }));
  bedeutung.appendChild(bedBody);

  // Aktionen
  const aktionen = document.createElement('section');
  aktionen.dataset.section = 'aktionen';
  aktionen.appendChild(SectionHeader({ eyebrow: 'Naechste Schritte', title: 'Aktionen' }));
  const aktBody = document.createElement('div');
  aktBody.dataset.sectionBody = '';
  aktBody.appendChild(LuxuryCard({ children: renderActionPanel(vm) }));
  aktionen.appendChild(aktBody);

  shell.mountSections([hero, heute, bedeutung, aktionen]);
  root.replaceChildren(shell.element);
}

function renderActionPanel (vm) {
  const wrap = document.createElement('div');
  wrap.className = 'daily-actions';
  wrap.innerHTML = `
    <a class="btn btn--primary" href="#/overview">Zur Uebersicht</a>
    <button class="btn btn--ghost" data-action="share">Teilen</button>
  `;
  return wrap;
}
```

**Commit:** `refactor(daily): consolidate on PageShell/SectionHeader/LuxuryCard`

---

## TASK-I6-003 — Haeuser, Fusion, Wu-Xing

**Iterationsziel-Bezug:** Diese drei Seiten teilen sich das gleiche "Datenkachel-Grid"-Muster. Wenn sie nach demselben Schema gebaut sind, fühlt sich die Navigation zwischen ihnen wie ein einziger Bereich an.

**Requirements:** REQ-F-004, REQ-F-006.

**Files:** modify `public/src/pages/HousesPage.js`, `FusionPage.js`, `WuxingPage.js`. **One commit per page.**

### TASK-I6-003a — HousesPage

12 house cards as LuxuryCard grid. Spec: each card shows house number, sign, ruler, themes; grid wraps responsively (3×4 desktop, 2×6 tablet, 1×12 mobile).

#### Before — HousesPage skeleton

```javascript
// public/src/pages/HousesPage.js — BEFORE
export default function HousesPage (root, vm) {
  const html = vm.western.houses.map((h) => `
    <div class="house-tile-old">
      <span class="num">${h.number}</span>
      <span class="sign">${h.sign}</span>
    </div>
  `).join('');
  root.innerHTML = `<h1>Haeuser</h1><div class="houses-grid-old">${html}</div>`;
}
```

#### After — HousesPage consolidated

```javascript
// public/src/pages/HousesPage.js — AFTER
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';

export default function HousesPage (root, vm) {
  const shell = PageShell({ title: 'Deine zwoelf Haeuser', pageId: 'houses' });

  const overview = document.createElement('section');
  overview.dataset.section = 'houses-grid';
  overview.appendChild(SectionHeader({
    eyebrow: 'Lebensbereiche',
    title: 'Die zwoelf Haeuser im Ueberblick',
  }));
  const body = document.createElement('div');
  body.dataset.sectionBody = '';
  const grid = document.createElement('div');
  grid.className = 'houses-luxury-grid';
  vm.western.houses.forEach((h) => {
    grid.appendChild(LuxuryCard({
      eyebrow: `Haus ${h.number}`,
      title: h.sign,
      meta: `Herrscher: ${h.ruler}`,
      children: `<ul class="house-themes">${h.themes.map((t) => `<li>${t}</li>`).join('')}</ul>`,
    }));
  });
  body.appendChild(grid);
  overview.appendChild(body);

  shell.mountSections([overview]);
  root.replaceChildren(shell.element);
}
```

CSS contract for `.houses-luxury-grid` (lives in `public/styles/houses.css`):

```css
.houses-luxury-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}
@media (max-width: 1024px) { .houses-luxury-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px)  { .houses-luxury-grid { grid-template-columns: 1fr; } }
```

Run `node --test test/house-comparison.test.js` after the edit. Must stay green.

**Commit:** `refactor(houses): 12-house luxury grid under PageShell`

### TASK-I6-003b — FusionPage

Element-layer narrative + WuxingRadar wrapped in PageShell. Sections: Hero (radar), Schichten (element_layers loop), Empfehlung.

```javascript
// public/src/pages/FusionPage.js — AFTER
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';
import { renderWuxingRadar } from '../components/WuxingRadar.js';

export default function FusionPage (root, vm) {
  const shell = PageShell({ title: 'Deine Fusion', pageId: 'fusion' });

  const hero = document.createElement('section');
  hero.dataset.section = 'fusion-hero';
  hero.appendChild(SectionHeader({ eyebrow: 'Wu Xing', title: 'Element-Verteilung' }));
  const heroBody = document.createElement('div');
  heroBody.dataset.sectionBody = '';
  heroBody.appendChild(LuxuryCard({
    children: renderWuxingRadar(vm.fusion.wuxing_distribution),
  }));
  hero.appendChild(heroBody);

  const schichten = document.createElement('section');
  schichten.dataset.section = 'fusion-layers';
  schichten.appendChild(SectionHeader({ eyebrow: 'Tiefe', title: 'Element-Schichten' }));
  const schichtenBody = document.createElement('div');
  schichtenBody.dataset.sectionBody = '';
  const grid = document.createElement('div');
  grid.className = 'fusion-layer-grid';
  (vm.fusion.element_layers || []).forEach((layer) => {
    grid.appendChild(LuxuryCard({
      eyebrow: layer.layer,
      title: layer.dominant,
      children: `<p>${layer.narrative}</p>`,
    }));
  });
  schichtenBody.appendChild(grid);
  schichten.appendChild(schichtenBody);

  shell.mountSections([hero, schichten]);
  root.replaceChildren(shell.element);
}
```

**Commit:** `refactor(fusion): wrap element-layer narrative + radar in PageShell`

### TASK-I6-003c — WuxingPage

Radar + WuXingEducationGrid + recommendations sections.

```javascript
// public/src/pages/WuxingPage.js — AFTER
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';
import { renderWuxingRadar } from '../components/WuxingRadar.js';
import { renderWuXingEducationGrid } from '../components/WuXingEducationGrid.js';

export default function WuxingPage (root, vm) {
  const shell = PageShell({ title: 'Wu Xing', pageId: 'wuxing' });

  const radar = document.createElement('section');
  radar.dataset.section = 'wuxing-radar';
  radar.appendChild(SectionHeader({ eyebrow: 'Verteilung', title: 'Deine Elemente' }));
  const radarBody = document.createElement('div');
  radarBody.dataset.sectionBody = '';
  radarBody.appendChild(LuxuryCard({ children: renderWuxingRadar(vm.wuxing.distribution) }));
  radar.appendChild(radarBody);

  const edu = document.createElement('section');
  edu.dataset.section = 'wuxing-education';
  edu.appendChild(SectionHeader({ eyebrow: 'Lerne', title: 'Was die Elemente bedeuten' }));
  const eduBody = document.createElement('div');
  eduBody.dataset.sectionBody = '';
  eduBody.appendChild(LuxuryCard({ children: renderWuXingEducationGrid(vm.wuxing.education) }));
  edu.appendChild(eduBody);

  const recs = document.createElement('section');
  recs.dataset.section = 'wuxing-recs';
  recs.appendChild(SectionHeader({ eyebrow: 'Praxis', title: 'Empfehlungen' }));
  const recsBody = document.createElement('div');
  recsBody.dataset.sectionBody = '';
  const recsGrid = document.createElement('div');
  recsGrid.className = 'wuxing-recs-grid';
  (vm.wuxing.recommendations || []).forEach((r) => {
    recsGrid.appendChild(LuxuryCard({
      eyebrow: r.element,
      title: r.tone,
      children: `<p>${r.impulse}</p>`,
    }));
  });
  recsBody.appendChild(recsGrid);
  recs.appendChild(recsBody);

  shell.mountSections([radar, edu, recs]);
  root.replaceChildren(shell.element);
}
```

Run `node --test test/wuxing-page.test.js` after the edit. Must stay green.

**Commit:** `refactor(wuxing): unified radar + education + recs sections`

---

## TASK-I6-004 — Western, BaZi, Beziehung (Synastry)

**Iterationsziel-Bezug:** Diese Seiten enthalten den "schweren" Detail-Content. Hier muss am sorgfältigsten darauf geachtet werden, dass nichts visuell oder semantisch verloren geht. Domain-Logik (`renderBaziPillars`, `westernBodyEnrichment`, `RelationshipResonance`) wird **nicht angefasst** — nur die Hülle.

**Requirements:** REQ-F-004, REQ-F-006.

**Files:** `public/src/pages/WesternPage.js`, `BaziPage.js`, `SynastryPage.js`. **One commit per page. Mobile responsive — no horizontal overflow.**

### TASK-I6-004a — WesternPage

Preserve `westernBodyEnrichment`. Sections: Hero (Sonne/Mond/Aszendent), Planeten, Body-Enrichment.

```javascript
// public/src/pages/WesternPage.js — AFTER (shape)
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';
import { renderWesternBodyEnrichment } from '../components/WesternBodyEnrichment.js';
import { renderBigThree } from '../components/BigThreeCards.js';

export default function WesternPage (root, vm) {
  const shell = PageShell({ title: 'Westliches Geburtsbild', pageId: 'western' });

  const hero = section('western-hero', 'Big Three', 'Sonne, Mond, Aszendent', [
    LuxuryCard({ children: renderBigThree(vm.western) }),
  ]);

  const body = section('western-body', 'Koerper', 'Resonanz-Profil', [
    LuxuryCard({ children: renderWesternBodyEnrichment(vm.western.body_enrichment) }),
  ]);

  shell.mountSections([hero, body]);
  root.replaceChildren(shell.element);
}

function section (id, eyebrow, title, cards) {
  const sec = document.createElement('section');
  sec.dataset.section = id;
  sec.appendChild(SectionHeader({ eyebrow, title }));
  const b = document.createElement('div');
  b.dataset.sectionBody = '';
  cards.forEach((c) => b.appendChild(c));
  sec.appendChild(b);
  return sec;
}
```

**Commit:** `refactor(western): shared layout, preserve westernBodyEnrichment`

### TASK-I6-004b — BaziPage

Preserve `renderBaziPillars`. Sections: Hero (Tagesmeister), Saeulen, Verborgene Stems.

```javascript
// public/src/pages/BaziPage.js — AFTER (shape)
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';
import { renderBaziPillars } from '../domain/baziRenderer.js';

export default function BaziPage (root, vm) {
  const shell = PageShell({ title: 'BaZi — Vier Saeulen', pageId: 'bazi' });

  const dm = sectionEl('bazi-daymaster', 'Kern', 'Tagesmeister');
  dm.body.appendChild(LuxuryCard({
    eyebrow: 'Tagesstamm',
    title: vm.bazi.day_master,
    children: `<p>Der Tagesmeister praegt deine Kernidentitaet.</p>`,
  }));

  const pillars = sectionEl('bazi-pillars', 'Vier Saeulen', 'Jahr · Monat · Tag · Stunde');
  const grid = document.createElement('div');
  grid.className = 'bazi-pillar-grid';
  const rendered = renderBaziPillars(vm.bazi.pillars); // returns array of HTMLElements or string blocks
  (Array.isArray(rendered) ? rendered : [rendered]).forEach((p) => {
    grid.appendChild(LuxuryCard({ children: p }));
  });
  pillars.body.appendChild(grid);

  shell.mountSections([dm.section, pillars.section]);
  root.replaceChildren(shell.element);
}

function sectionEl (id, eyebrow, title) {
  const section = document.createElement('section');
  section.dataset.section = id;
  section.appendChild(SectionHeader({ eyebrow, title }));
  const body = document.createElement('div');
  body.dataset.sectionBody = '';
  section.appendChild(body);
  return { section, body };
}
```

Run `node --test test/bazi-page.test.js` after the edit.

**Commit:** `refactor(bazi): shared layout, preserve renderBaziPillars`

### TASK-I6-004c — SynastryPage

Preserve all `RelationshipResonance` flows (element_tension, domain_scores, house_comparison).

```javascript
// public/src/pages/SynastryPage.js — AFTER (shape)
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';
import { renderRelationshipResonance } from '../components/RelationshipResonance.js';
import { renderHouseComparison } from '../components/HouseComparison.js';

export default function SynastryPage (root, vm) {
  const shell = PageShell({ title: 'Beziehungsresonanz', pageId: 'synastry' });

  const hero = sect('syn-hero', 'Resonanz', 'Element-Spannung',
    LuxuryCard({ children: renderRelationshipResonance(vm.synastry) }));

  const domains = sect('syn-domains', 'Bereiche', 'Liebe · Karriere · Wachstum',
    LuxuryCard({ children: renderDomainScores(vm.synastry.domain_scores) }));

  const houses = sect('syn-houses', 'Haeuser', '12 Haeuser im Vergleich',
    LuxuryCard({ children: renderHouseComparison(vm.synastry.house_comparison) }));

  shell.mountSections([hero, domains, houses]);
  root.replaceChildren(shell.element);
}

function sect (id, eyebrow, title, card) {
  const s = document.createElement('section');
  s.dataset.section = id;
  s.appendChild(SectionHeader({ eyebrow, title }));
  const b = document.createElement('div');
  b.dataset.sectionBody = '';
  b.appendChild(card);
  s.appendChild(b);
  return s;
}

function renderDomainScores (scores) {
  const ul = document.createElement('ul');
  ul.className = 'domain-scores';
  Object.entries(scores || {}).forEach(([k, v]) => {
    const li = document.createElement('li');
    li.textContent = `${k}: ${Math.round(v * 100)}%`;
    ul.appendChild(li);
  });
  return ul;
}
```

**Commit:** `refactor(synastry): shared layout, preserve relationshipResonance`

---

## Mobile-Overflow Check (Playwright)

`tests/e2e/i6-mobile-overflow.spec.js` — gate that prevents any sub-page from breaking horizontally at 390px (iPhone 12 / 13 reference).

```javascript
// tests/e2e/i6-mobile-overflow.spec.js
import { test, expect } from '@playwright/test';

const PAGES = [
  { name: 'daily',    path: '/#/daily' },
  { name: 'houses',   path: '/#/houses' },
  { name: 'fusion',   path: '/#/fusion' },
  { name: 'wuxing',   path: '/#/wuxing' },
  { name: 'western',  path: '/#/western' },
  { name: 'bazi',     path: '/#/bazi' },
  { name: 'synastry', path: '/#/synastry' },
];

test.describe('I6 mobile horizontal overflow guard (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const page of PAGES) {
    test(`${page.name}: no horizontal overflow`, async ({ page: pw }) => {
      await pw.goto(page.path);
      await pw.waitForLoadState('networkidle');
      const { scrollWidth, innerWidth } = await pw.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `${page.name} body.scrollWidth ${scrollWidth} > window.innerWidth ${innerWidth}`)
        .toBeLessThanOrEqual(innerWidth);
    });
  }
});
```

---

## Screenshots — `docs/qa/screenshots/i6-subpages/`

Capture these (1440×900 desktop unless noted; 390×844 for mobile):

- `daily-desktop.png`
- `daily-mobile.png`
- `houses-desktop.png`
- `fusion-desktop.png`
- `wuxing-desktop.png`
- `western-desktop.png`
- `bazi-desktop.png`
- `synastry-desktop.png`

Capture script (Playwright):

```javascript
// scripts/qa/i6-screenshots.mjs
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.resolve('docs/qa/screenshots/i6-subpages');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { file: 'daily-desktop.png',    route: '/#/daily',    viewport: { width: 1440, height: 900 } },
  { file: 'daily-mobile.png',     route: '/#/daily',    viewport: { width: 390,  height: 844 } },
  { file: 'houses-desktop.png',   route: '/#/houses',   viewport: { width: 1440, height: 900 } },
  { file: 'fusion-desktop.png',   route: '/#/fusion',   viewport: { width: 1440, height: 900 } },
  { file: 'wuxing-desktop.png',   route: '/#/wuxing',   viewport: { width: 1440, height: 900 } },
  { file: 'western-desktop.png',  route: '/#/western',  viewport: { width: 1440, height: 900 } },
  { file: 'bazi-desktop.png',     route: '/#/bazi',     viewport: { width: 1440, height: 900 } },
  { file: 'synastry-desktop.png', route: '/#/synastry', viewport: { width: 1440, height: 900 } },
];

const browser = await chromium.launch();
for (const shot of SHOTS) {
  const ctx = await browser.newContext({ viewport: shot.viewport });
  const pw  = await ctx.newPage();
  await pw.goto('http://127.0.0.1:3000' + shot.route);
  await pw.waitForLoadState('networkidle');
  await pw.screenshot({ path: path.join(OUT, shot.file), fullPage: true });
  await ctx.close();
}
await browser.close();
console.log('I6 screenshots written to', OUT);
```

Run: `node scripts/qa/i6-screenshots.mjs` (server must be running on port 3000).

---

## Iteration Definition of Done

Per-page checkboxes:

- [ ] **DailyPage** uses PageShell + SectionHeader + LuxuryCard; `test/daily-data-flow.test.js` green.
- [ ] **HousesPage** uses PageShell + SectionHeader + LuxuryCard; 12-card grid responsive; `test/house-comparison.test.js` green.
- [ ] **FusionPage** uses PageShell + SectionHeader + LuxuryCard; element_layers preserved.
- [ ] **WuxingPage** uses PageShell + SectionHeader + LuxuryCard; `test/wuxing-page.test.js` green.
- [ ] **WesternPage** uses PageShell + SectionHeader + LuxuryCard; westernBodyEnrichment preserved visually.
- [ ] **BaziPage** uses PageShell + SectionHeader + LuxuryCard; `test/bazi-page.test.js` green.
- [ ] **SynastryPage** uses PageShell + SectionHeader + LuxuryCard; relationshipResonance preserved.

Global gates:

- [ ] `node --test test/page-design-parity.test.js` passes for all seven pages.
- [ ] `node --test test/typography-rollout.test.js` includes and passes all seven pages.
- [ ] All eight screenshots present in `docs/qa/screenshots/i6-subpages/`.
- [ ] Playwright `tests/e2e/i6-mobile-overflow.spec.js` green (no body.scrollWidth > 390 at iPhone viewport).
- [ ] **Zero data loss:** all referenced domain tests (`daily-data-flow`, `wuxing-page`, `house-comparison`, `bazi-page`) still green.
- [ ] Visual review: side-by-side of all eight screenshots reveals one coherent design language.

## Validation strategy

After each per-page commit:

```bash
# 1. Cross-page parity gate
node --test test/page-design-parity.test.js

# 2. Domain tests (run all four after each page edit — fast and catches regressions early)
node --test test/daily-data-flow.test.js
node --test test/wuxing-page.test.js
node --test test/house-comparison.test.js
node --test test/bazi-page.test.js

# 3. Typography rollout still covers the page
node --test test/typography-rollout.test.js
```

After the iteration is feature-complete:

```bash
# 4. Full suite
npm test

# 5. Playwright mobile overflow
npx playwright test tests/e2e/i6-mobile-overflow.spec.js

# 6. Per-page Playwright greps — quick visual smoke per page
npx playwright test --grep "daily:"     tests/e2e/i6-mobile-overflow.spec.js
npx playwright test --grep "houses:"    tests/e2e/i6-mobile-overflow.spec.js
npx playwright test --grep "fusion:"    tests/e2e/i6-mobile-overflow.spec.js
npx playwright test --grep "wuxing:"    tests/e2e/i6-mobile-overflow.spec.js
npx playwright test --grep "western:"   tests/e2e/i6-mobile-overflow.spec.js
npx playwright test --grep "bazi:"      tests/e2e/i6-mobile-overflow.spec.js
npx playwright test --grep "synastry:"  tests/e2e/i6-mobile-overflow.spec.js

# 7. Capture screenshots
node scripts/qa/i6-screenshots.mjs
ls docs/qa/screenshots/i6-subpages/
```

## Rollback note

Each per-page commit is fully independent — reverting one does not affect the others.

```bash
# Revert a single page (example: SynastryPage broke production)
git log --oneline public/src/pages/SynastryPage.js | head -3
git revert <sha-of-synastry-refactor>
```

The page-design-parity test will then list SynastryPage as offending again — that's the signal that I6 is not yet fully shipped, but Daily/Houses/Fusion/Wuxing/Western/BaZi remain consolidated.

If the design-parity test itself needs adjustment (e.g., a new card variant), prefer extending the auditor's allow-list (step 4 in `auditPage`) over reverting whole pages.

## Handoff to next iteration: I7

I6 leaves us with seven sub-pages on a single visual foundation. **I7 — Transit & Calendar Polish** picks up from here:

- TransitCalendarPage adopts the same PageShell/SectionHeader/LuxuryCard skeleton (currently out of scope because it has its own calendar widget that needs separate I7 work).
- I7 will introduce `data-page-shell` to TransitCalendarPage and extend `page-design-parity.test.js`'s PAGES registry to include it.
- I7 also addresses cross-page motion choreography (page-enter transitions) now that the underlying DOM shape is uniform.

Open question to flag for I7: should `DailyPage`'s "Aktionen" section become a shared component reusable on Transit's "Heute" tab? Decide during I7 brainstorming.
