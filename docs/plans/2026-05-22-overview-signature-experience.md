# Overview Signature Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> **Per-iteration gate:** every iteration ends with a live Playwright run against a running server, screenshot artifacts persisted to `docs/qa/screenshots/overview-signature/`, parallel subagents for (a) code review, (b) QA / screenshot verification, (c) optical/PO review. All critical/major findings MUST be fixed before push. Iteration is pushed only after gate is green.
>
> **Per-iteration sprint goal:** before starting any iteration, run `/goal-forge` with the iteration's Sprintziel (verbatim from this plan), then start the iteration with `/goal <sprintziel>`.

**Goal:** Turn the Overview page from a data-dump audit screen into a guided "Signature Experience" — a clear dramaturgy of Identity → Signature → Main Tension → Evidence → Action → Deep Dive, with the Zodiac Wheel as the living visual identity object.

**Architecture:** Frontend-only change. Extend `public/src/domain/overviewModel.js` to expose narrative sections (signatureHero, meaningBridge, topMovements, guidedDeepDives). Compose `OverviewPage.js` from new pure components: `SignatureHero`, `FusionSignaturePanel`, `MeaningBridge`, `TopMovements`, `NatalChartAuditTabs`. Enhance `NatalChartWheel.js` with semantic SVG layers, color tokens, hover/click linking to the audit list. **Backend, FuFire calculations, and API contract are untouched.**

**Tech Stack:** Vanilla ESM (no bundler), `node:test`, jsdom, Playwright `@playwright/test`, design tokens in `public/src/styles/tokens.css`.

**Reference:** original requirements doc, evidence table, architecture and acceptance criteria are reproduced inline (sections 1–3 below). User-stated source of truth was `docs/plans/Implementation_plan41.md` — that file is not present in the repo; the full plan content was provided verbatim and is captured here.

---

## 1. Evidence and source boundary

**Provided evidence**

- Current Overview screenshot.
- Separate crop of the Zodiac Wheel.
- Prior analysis: page reads like a mix of landing / audit / Western chart / fusion explainer; wheel is plausibly bound but visually flat; aspect legend dominates; Element-Oekonomie leaks internal field names (`Distribution`, `Dominant`, `Deficient`, `Plan`, `Properties`, `TodayLever`); user flow lacks dramaturgy.

**Known repo context (verified at plan time)**

- `public/src/pages/OverviewPage.js` (355 LOC)
- `public/src/components/NatalChartWheel.js` (306 LOC)
- `public/src/domain/overviewModel.js` (191 LOC) — already exposes `chartWheel`, `topFacts`, `elementEconomy`, `nextDoors`, `warnings`. Missing the new narrative fields.
- `public/src/styles/tokens.css`, `public/src/styles/main.css`
- `test/overview-model.test.js` (207 LOC), `test/natal-chart-wheel.test.js` (290 LOC)
- `test/e2e/overview-hero.spec.js` exists (uses `data-section="hero"`, `data-hero-slot="wheel|narrative"`). This plan uses new selectors (`data-section="signature-hero"`, etc.) — the existing spec stays; new specs are additive.
- Playwright config: `playwright.config.mjs`; npm scripts `test`, `test:e2e`.

**MISSING / open questions**

- Full raw payload for current profile to validate wheel positions astronomically. → If absent, fall back to fixture-based geometry tests (no real-position assertions).
- PO-final visual target (palette + materiality) for the wheel. → If absent, propose tokens via screenshot review in OV-I3 gate.

---

## 2. Requirements (verbatim)

| ID | Type | Statement | Source | Verification |
|---|---|---|---|---|
| REQ-F-OV-001 | functional | Overview folgt klarer Nutzerdramaturgie statt additiver Datenliste. | user | Playwright screenshot + DOM structure test |
| REQ-F-OV-002 | functional | Hero besteht aus grossem Wheel links und Fusion-Signatur rechts. | analysis | Layout test + screenshot |
| REQ-F-OV-003 | functional | Overview zeigt drei Deutungskarten: Was traegt / Was reibt / Was hilft heute. | analysis | Unit/component test |
| REQ-F-OV-004 | functional | Element-Oekonomie zeigt nutzerlesbare Summary statt interner Feldnamen. | user | Text absence/presence test |
| REQ-F-OV-005 | functional | Aspektdetails sind default reduziert auf Top 3. | analysis | DOM test + screenshot |
| REQ-F-OV-006 | functional | Full aspect list bleibt in Accordion/Drawer erreichbar. | analysis | Interaction test |
| REQ-F-WH-001 | functional | Zodiac Wheel zeigt Zeichenring, Haeuser, AC/MC/IC/DC, Planeten, Top-Aspekte. | user | SVG unit test |
| REQ-F-WH-002 | functional | AC/ASC liegt links und alle Radbestandteile sind konsistent dazu rotiert. | analysis | Geometry unit test |
| REQ-F-WH-003 | functional | Planet Hover/Klick hebt passenden Listeneintrag hervor. | analysis | Playwright interaction test |
| REQ-F-WH-004 | functional | Wheel hat visuelle Layer: Zodiac, Houses/Axes, Bodies/Aspects. | analysis | SVG structure test + screenshot |
| REQ-D-001 | data | Fehlende Longitude wird nie als 0 Grad gerendert. | audit | unit test |
| REQ-D-002 | data | Jeder Planet in der Auditliste zeigt Zeichen, Grad, Haus und Quelle. | user | component test |
| REQ-D-003 | data | Keine internen ViewModel-Feldnamen werden in der UI sichtbar. | screenshot | text regression test |
| REQ-A-001 | architecture | Backend-Architektur und FuFire-Berechnung bleiben unveraendert. | user | git diff review |
| REQ-NF-001 | non-functional | Jede Iteration endet mit Playwright-Live-Test, Screenshots und Code Review. | user | QA doc |
| REQ-NF-002 | non-functional | Overview funktioniert auf Desktop und Mobile ohne horizontales Layoutbrechen. | product | Playwright viewport tests |

---

## 3. Architecture and file boundaries

**Target component tree**

```
OverviewPage
  └─ overviewModel (pure)
  ├─ SignatureHero
  │   ├─ NatalChartWheel
  │   └─ FusionSignaturePanel
  ├─ MeaningBridge
  │   ├─ CarriesCard
  │   ├─ FrictionCard
  │   └─ TodayLeverCard
  ├─ TopMovements
  │   ├─ Top3Aspects
  │   └─ DetailsAccordion
  ├─ NatalChartAuditTabs   (Top3 / Planeten / Haeuser / Aspekte)
  └─ GuidedDeepDive        (four intention-based CTAs)
```

**Preferred new components (additive; extend existing if obvious overlap)**

- `public/src/components/SignatureHero.js`
- `public/src/components/FusionSignaturePanel.js`
- `public/src/components/MeaningBridge.js`
- `public/src/components/TopMovements.js`
- `public/src/components/NatalChartAuditTabs.js`

**Prohibited changes**

- No planet-position calculation in frontend.
- No data manipulation for cosmetic reasons.
- No API contract change.
- No removal of detail data without an alternate access path.
- No display of internal field names (`Distribution`, `Dominant`, `Deficient`, `Plan`, `Properties`, `TodayLever`) on user-facing UI.

---

## 4. Per-iteration gate (applies to OV-I1 … OV-I4)

Each iteration MUST pass these steps in order **before push**:

1. `/goal-forge` writes the iteration's Sprintziel; start iteration with `/goal <sprintziel>`.
2. Failing test(s) committed first.
3. Minimal implementation.
4. Focused tests green: `node --test <focused files>`.
5. Full suite green: `npm test`.
6. Server up (`PORT=4100 npm start &`); Playwright live: `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e -- --grep "<iteration tag>"`.
7. Screenshots persisted under `docs/qa/screenshots/overview-signature/<iteration>/`.
8. **Parallel subagent dispatch** (single message, multiple Agent calls):
   - `subagent_type: tester` — verify Playwright actually ran in a real browser. Inspect `docs/qa/playwright-report/` (or last `--reporter=line` output) for `skipped`/`did not find` lines and **fail the gate if any required spec was silently skipped**. Confirm each required screenshot file exists, is non-empty (> 5 KB), and was modified within the last 10 minutes. Return the file list with sizes and mtimes.
   - `subagent_type: reviewer` — code review of the iteration diff (zero critical/major required).
   - `subagent_type: superpowers:code-reviewer` — optical/PO review against acceptance criteria using the screenshots.
9. Every critical/major finding is fixed; re-run steps 4–8 until clean.
10. Update `docs/qa/2026-05-22-overview-signature-review.md` with the iteration's diff summary, screenshot links, and signed-off findings.
11. Commit and push.

---

## Iteration OV-I1: Overview dramaturgy + ViewModel hardening

**Sprintziel (use verbatim with `/goal-forge`):**
> Die Overview bekommt eine klare Storyline und ein sauberes UI-Modell: Identitaet, Signatur, Hauptspannung, Belege, Handlung, Vertiefung.

### Task OV-I1-T01: Overview narrative ViewModel test-first

**Requirement links:** REQ-F-OV-001, REQ-F-OV-003, REQ-D-003

**Files:**
- Test: `test/overview-model.test.js`
- Modify: `public/src/domain/overviewModel.js`

**Step 1 — Write the failing tests.** Append a `describe`-style block (node:test compatible) that asserts the new shape of `profileToOverviewModel(profile)`:

```js
// test/overview-model.test.js — appended block (OV-I1)
import test from 'node:test';
import assert from 'node:assert/strict';
import { profileToOverviewModel } from '../public/src/domain/overviewModel.js';

const FIXTURE = {
  meta: { alias: 'Ben' },
  western: {
    bodies: {
      Sun:  { sign: 'Pisces',  longitude: 353.15 },
      Moon: { sign: 'Virgo',   longitude: 158.23 },
    },
    angles:  { Ascendant: 27.71, MC: 280.66 },
    houses:  { '1': { longitude: 27.71, sign: 'Aries' } },
    aspects: [
      { planet1: 'Sun', planet2: 'Moon', type: 'opposition', orb: 1.1 },
    ],
  },
  bazi:   { day_master: { stem: 'Yang Holz', element: 'Holz' } },
  fusion: { headline: 'Pionier mit Tiefenmotor', coherence_index: 0.78 },
};

test('OV-I1: model exposes signatureHero with essence + cta', () => {
  const m = profileToOverviewModel(FIXTURE);
  assert.ok(m.signatureHero, 'signatureHero missing');
  assert.equal(typeof m.signatureHero.essence, 'string');
  assert.ok(m.signatureHero.essence.length > 0);
  assert.ok(Array.isArray(m.signatureHero.ctas));
});

test('OV-I1: model exposes fusionEssence + evidenceCards (western/bazi/fusion)', () => {
  const m = profileToOverviewModel(FIXTURE);
  assert.equal(typeof m.fusionEssence, 'string');
  assert.ok(m.evidenceCards);
  for (const key of ['western', 'bazi', 'fusion']) {
    assert.ok(m.evidenceCards[key], `evidenceCards.${key} missing`);
    assert.equal(typeof m.evidenceCards[key].title, 'string');
    assert.equal(typeof m.evidenceCards[key].body, 'string');
  }
});

test('OV-I1: model exposes meaningBridge.carries / friction / todayLever', () => {
  const m = profileToOverviewModel(FIXTURE);
  for (const key of ['carries', 'friction', 'todayLever']) {
    assert.ok(m.meaningBridge?.[key], `meaningBridge.${key} missing`);
    assert.equal(typeof m.meaningBridge[key].title, 'string');
    assert.equal(typeof m.meaningBridge[key].body, 'string');
    assert.ok(m.meaningBridge[key].source, 'source/basis required');
  }
});

test('OV-I1: model exposes topMovements (default top 3) and guidedDeepDives (4 intents)', () => {
  const m = profileToOverviewModel(FIXTURE);
  assert.ok(Array.isArray(m.topMovements));
  assert.ok(m.topMovements.length <= 3);
  assert.ok(Array.isArray(m.guidedDeepDives));
  assert.equal(m.guidedDeepDives.length, 4);
  for (const dd of m.guidedDeepDives) {
    assert.equal(typeof dd.intent, 'string');
    assert.equal(typeof dd.route, 'string');
    assert.ok(dd.route.startsWith('/'));
  }
});

test('OV-I1: ViewModel field names never leak as UI labels', () => {
  const m = profileToOverviewModel(FIXTURE);
  const blob = JSON.stringify(m);
  for (const banned of ['"Distribution"', '"Dominant"', '"Deficient"', '"Plan"', '"Properties"', '"TodayLever"']) {
    // Banned strings must not appear as values intended for direct rendering.
    // (They are allowed as JSON keys internally — we test values only.)
  }
  // Concrete: meaningBridge.todayLever must NOT carry a label "TodayLever"
  assert.notEqual(m.meaningBridge.todayLever.title, 'TodayLever');
  // evidenceCards titles must be human German, never raw keys
  for (const k of ['western', 'bazi', 'fusion']) {
    assert.notMatch(m.evidenceCards[k].title, /^(Distribution|Dominant|Deficient|Plan|Properties|TodayLever)$/);
  }
});

test('OV-I1: missing sections produce human fallbacks, not technical keys', () => {
  const m = profileToOverviewModel({});
  assert.match(m.signatureHero.essence, /(nicht|fehlt|geliefert|verf)/i);
  for (const k of ['western', 'bazi', 'fusion']) {
    assert.equal(typeof m.evidenceCards[k].body, 'string');
    assert.ok(m.evidenceCards[k].body.length > 0);
  }
});
```

**Step 2 — Verify it fails.**
Run: `node --test test/overview-model.test.js`
Expected: FAIL with messages like `signatureHero missing`, `evidenceCards.western missing`, etc.

**Step 3 — Implement the minimal extension** in `public/src/domain/overviewModel.js`. Add three pure builders and extend the return object:

```js
// Add near the other sub-builders.

function buildSignatureHero(profile) {
  const dm = profile?.bazi?.day_master;
  const headline = profile?.fusion?.headline ?? profile?.fusion?.summary ?? null;
  const essence = headline
    ? headline
    : dm?.stem
      ? `Dein Muster traegt einen ${dm.stem}-Kern.`
      : 'Signatur noch nicht vollstaendig geliefert.';
  return {
    essence,
    ctas: [
      { label: 'Heute anwenden',   route: '/daily' },
      { label: 'In Beziehung sehen', route: '/synastry' },
    ],
  };
}

function buildEvidenceCards(profile) {
  const sun  = profile?.western?.bodies?.Sun;
  const dm   = profile?.bazi?.day_master;
  const coh  = num(profile?.fusion?.coherence_index) ?? num(profile?.fusion?.coherence);
  return {
    western: {
      title: 'Westliches Chart',
      body:  sun?.sign
        ? `Sonne in ${sun.sign}.`
        : 'Westliches Chart noch nicht geliefert.',
    },
    bazi: {
      title: 'BaZi',
      body:  dm?.stem
        ? `Day Master ${dm.stem}${dm.element ? ' / ' + dm.element : ''}.`
        : 'BaZi Day Master noch nicht geliefert.',
    },
    fusion: {
      title: 'Fusion',
      body:  coh != null
        ? `Kohaerenz-Index ${coh}.`
        : 'Fusion-Layer noch nicht geliefert.',
    },
  };
}

function buildMeaningBridge(profile) {
  const sun  = profile?.western?.bodies?.Sun;
  const moon = profile?.western?.bodies?.Moon;
  const dm   = profile?.bazi?.day_master;
  return {
    carries: {
      title:  'Was dich traegt',
      body:   sun?.sign && dm?.stem
        ? `Sonne in ${sun.sign} und Day Master ${dm.stem} bilden deinen Grundimpuls.`
        : 'Tragende Achse wird angezeigt, sobald Sonne und Day Master geliefert sind.',
      source: 'western.Sun + bazi.day_master',
    },
    friction: {
      title:  'Was reibt',
      body:   moon?.sign
        ? `Mond in ${moon.sign} arbeitet gegen den Tagesimpuls, wenn du ihn ignorierst.`
        : 'Reibungsachse wird angezeigt, sobald der Mond geliefert ist.',
      source: 'western.Moon',
    },
    todayLever: {
      title:  'Was heute hilft',
      body:   'Beginne den Tag mit einer kurzen, fokussierten Handlung statt mit Recherche.',
      source: 'todayLever (heuristic placeholder)',
    },
  };
}

function buildTopMovements(profile) {
  const aspects = Array.isArray(profile?.western?.aspects) ? profile.western.aspects : [];
  return aspects.slice(0, 3).map((a) => ({
    sourceKey: a.planet1,
    targetKey: a.planet2,
    typeDE:    (typeof a.type === 'string' && a.type) || 'aspekt',
    tone:      aspectTone(a.type),
    orb:       num(a.orb),
  }));
}

function buildGuidedDeepDives() {
  return [
    { intent: 'Ich will mich verstehen',       route: '/personality' },
    { intent: 'Ich will es heute anwenden',    route: '/daily' },
    { intent: 'Ich will Beziehungsmuster sehen', route: '/synastry' },
    { intent: 'Ich will die Berechnung pruefen', route: '/method' },
  ];
}
```

Extend the `return` of `profileToOverviewModel` with:

```js
    signatureHero:    buildSignatureHero(safe),
    fusionEssence:    safe?.fusion?.summary ?? safe?.fusion?.headline ?? '',
    evidenceCards:    buildEvidenceCards(safe),
    meaningBridge:    buildMeaningBridge(safe),
    topMovements:     buildTopMovements(safe),
    guidedDeepDives:  buildGuidedDeepDives(),
```

**Step 4 — Verify it passes.**
Run: `node --test test/overview-model.test.js`
Expected: PASS for all new cases; pre-existing cases stay green.

**Step 5 — Commit.**
```bash
git add test/overview-model.test.js public/src/domain/overviewModel.js
git commit -m "feat(overview): add signatureHero/meaningBridge/topMovements/guidedDeepDives to ViewModel (OV-I1-T01)"
```

---

### Task OV-I1-T02: Element-Oekonomie summary — no internal field names

**Requirement links:** REQ-F-OV-004, REQ-D-003

**Files:**
- Modify: `public/src/domain/overviewModel.js` (build a UI-safe element summary on top of `enrichWuxing`)
- Modify: `public/src/pages/OverviewPage.js` (render the summary)
- Test: `test/overview-model.test.js`, `test/page-render-integration.test.js`

**Step 1 — Write the failing tests.**

```js
// test/overview-model.test.js — appended (OV-I1-T02)
test('OV-I1: elementSummary has dominant / underrepresented / leverToday / sentence / cta', () => {
  const m = profileToOverviewModel({
    fusion: { coherence_index: 0.7 },
    wuxing: { distribution: { Holz: 3, Feuer: 1, Erde: 1, Metall: 0, Wasser: 0 } },
  });
  assert.ok(m.elementSummary, 'elementSummary missing');
  assert.equal(typeof m.elementSummary.dominantElement, 'string');
  assert.equal(typeof m.elementSummary.underrepresentedElement, 'string');
  assert.equal(typeof m.elementSummary.leverToday, 'string');
  assert.equal(typeof m.elementSummary.sentence, 'string');
  assert.equal(typeof m.elementSummary.ctaRoute, 'string');
});
```

```js
// test/page-render-integration.test.js — appended (OV-I1-T02)
test('OV-I1: OverviewPage rendered HTML does not contain internal element field names', async () => {
  const html = await renderOverviewWithFixture(/* existing helper */);
  for (const banned of ['Distribution', 'Dominant', 'Deficient', 'Plan', 'Properties', 'TodayLever']) {
    assert.ok(!html.includes(banned), `forbidden field name "${banned}" in DOM`);
  }
});
```

> If `renderOverviewWithFixture` does not yet exist, use the existing test-helper pattern in `test/page-render-integration.test.js` (jsdom + import of the page module). Otherwise write a thin wrapper.

**Step 2 — Run and fail.** `node --test test/overview-model.test.js test/page-render-integration.test.js`

**Step 3 — Implement** `buildElementSummary(profile)` in `overviewModel.js` consuming `enrichWuxing` output and mapping it to German user-facing keys (`dominantElement`, `underrepresentedElement`, `leverToday`, `sentence`, `ctaRoute = '/wuxing'`). Render in `OverviewPage.js` replacing the current Element-Oekonomie block.

**Step 4 — Tests green.**

**Step 5 — Commit.**
```bash
git add public/src/domain/overviewModel.js public/src/pages/OverviewPage.js test/overview-model.test.js test/page-render-integration.test.js
git commit -m "feat(overview): user-readable element summary, drop internal field labels (OV-I1-T02)"
```

### OV-I1 gate (Playwright + parallel subagents)

1. `PORT=4100 npm start &` ; wait for `/health` 200.
2. Run: `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e -- --grep "OV-I1|overview model"` — if no spec yet matches, run smoke spec to ensure no regression: `npm run test:e2e -- --grep "overview"`.
3. Screenshots to `docs/qa/screenshots/overview-signature/ov-i1/` (`overview-default.png`).
4. Parallel subagents:
   - `tester`: confirm screenshot files exist (`ov-i1/overview-default.png`), size > 5 KB, mtime within 10 min. Return list.
   - `reviewer`: review diff (`git diff main...HEAD -- public/src/domain/overviewModel.js public/src/pages/OverviewPage.js test/overview-model.test.js`).
   - `superpowers:code-reviewer`: confirm banned strings absent in rendered HTML and screenshots; verify acceptance criteria for REQ-F-OV-003, REQ-F-OV-004, REQ-D-003.
5. Fix every critical/major; re-run.
6. Update QA doc, push.

---

## Iteration OV-I2: Signature Hero + user flow

**Sprintziel (use verbatim with `/goal-forge`):**
> Die erste Bildschirmhoehe der Overview beantwortet: Wer bin ich im Modell? Was ist die zentrale Fusion-Signatur? Was kann ich als naechstes tun?

### Task OV-I2-T03: Lock target hero DOM via failing test

**Requirement links:** REQ-F-OV-001, REQ-F-OV-002

**Files:**
- Test: `test/overview-hero-layout.test.js` (new)

**Step 1 — Write the failing test.**

```js
// test/overview-hero-layout.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderOverviewPage } from './_helpers/render-page.js'; // existing helper or thin wrapper

test('OV-I2: overview has the six narrative sections in order', async () => {
  const html = await renderOverviewPage(/* fixture profile */);
  const dom  = new JSDOM(html);
  const sections = Array.from(
    dom.window.document.querySelectorAll('[data-section]'),
  ).map((el) => el.getAttribute('data-section'));
  // Required order:
  const expectOrder = [
    'signature-hero',
    'meaning-bridge',
    'top-movements',
    'guided-deep-dive',
  ];
  // Hero itself contains wheel-anchor + fusion-signature-panel
  const heroChildren = Array.from(
    dom.window.document.querySelectorAll(
      '[data-section="signature-hero"] [data-hero-slot]',
    ),
  ).map((el) => el.getAttribute('data-hero-slot'));
  assert.deepEqual(heroChildren, ['wheel-anchor', 'fusion-signature-panel']);
  // Top-level section order — sections list may contain children too; filter
  const top = sections.filter((s) => expectOrder.includes(s));
  assert.deepEqual(top, expectOrder);
});

test('OV-I2: wheel is rendered before any long detail table', async () => {
  const html = await renderOverviewPage(/* fixture */);
  const wheelIdx = html.indexOf('data-section="signature-hero"');
  const detailIdx = html.search(/data-detail="(planets|aspects|houses)-table"/);
  assert.ok(wheelIdx > -1, 'hero missing');
  if (detailIdx > -1) assert.ok(wheelIdx < detailIdx, 'detail tables appear before hero');
});

test('OV-I2: planets list is NOT the first text block after the hero', async () => {
  const html = await renderOverviewPage(/* fixture */);
  const afterHero = html.split('data-section="signature-hero"')[1] ?? '';
  // The next meaningful section is meaning-bridge, not a planets list.
  const meaningIdx = afterHero.indexOf('data-section="meaning-bridge"');
  const planetsIdx = afterHero.indexOf('data-detail="planets-table"');
  if (planetsIdx > -1) assert.ok(meaningIdx > -1 && meaningIdx < planetsIdx);
});
```

**Step 2 — Verify FAIL.** `node --test test/overview-hero-layout.test.js`
Expected: FAIL — `data-section="signature-hero"` does not exist yet.

**Step 3 — No implementation yet.** Commit failing test only.

**Step 5 — Commit.**
```bash
git add test/overview-hero-layout.test.js
git commit -m "test(overview): lock target hero DOM structure (OV-I2-T03)"
```

### Task OV-I2-T04: Implement SignatureHero + FusionSignaturePanel

**Requirement links:** REQ-F-OV-002, REQ-F-WH-001

**Files:**
- Create: `public/src/components/SignatureHero.js`
- Create: `public/src/components/FusionSignaturePanel.js`
- Modify: `public/src/pages/OverviewPage.js`
- Modify: `public/src/styles/main.css`

**Step 1 — Skeleton component (FusionSignaturePanel):**

```js
// public/src/components/FusionSignaturePanel.js
export function renderFusionSignaturePanel({ signatureHero, evidenceCards }) {
  const cards = ['western', 'bazi', 'fusion'].map((k) => `
    <article class="bz-evidence-card" data-evidence="${k}">
      <h4>${evidenceCards[k].title}</h4>
      <p>${evidenceCards[k].body}</p>
    </article>`).join('');
  const ctas = (signatureHero.ctas || []).map((c) =>
    `<a class="bz-cta" href="#${c.route}">${c.label}</a>`).join('');
  return `
    <section data-section="signature-hero" class="bz-signature-hero">
      <div data-hero-slot="wheel-anchor" class="bz-hero__wheel">__WHEEL__</div>
      <div data-hero-slot="fusion-signature-panel" class="bz-hero__panel">
        <p class="bz-hero__essence">${signatureHero.essence}</p>
        <div class="bz-evidence-grid">${cards}</div>
        <nav class="bz-hero__ctas">${ctas}</nav>
      </div>
    </section>`;
}
```

**Step 2 — SignatureHero composes the wheel slot:**

```js
// public/src/components/SignatureHero.js
import { renderFusionSignaturePanel } from './FusionSignaturePanel.js';
import { renderNatalChartWheel }     from './NatalChartWheel.js';

export function renderSignatureHero(viewModel) {
  const wheel = renderNatalChartWheel(viewModel.chartWheel);
  return renderFusionSignaturePanel({
    signatureHero:  viewModel.signatureHero,
    evidenceCards:  viewModel.evidenceCards,
  }).replace('__WHEEL__', wheel);
}
```

**Step 3 — Wire into OverviewPage** (replace top of the page body):

```js
// public/src/pages/OverviewPage.js — relevant fragment
import { renderSignatureHero } from '../components/SignatureHero.js';
// ...
const html = `
  ${renderSignatureHero(vm)}
  ${renderMeaningBridge(vm)}
  ${renderTopMovements(vm)}
  ${renderNatalChartAuditTabs(vm)}
  ${renderGuidedDeepDive(vm)}
`;
```

**Step 4 — Styles** in `public/src/styles/main.css`:

```css
.bz-signature-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--bz-space-6); align-items: start; }
@media (max-width: 900px) {
  .bz-signature-hero { grid-template-columns: 1fr; }
  .bz-hero__wheel { order: 1; } .bz-hero__panel { order: 2; }
}
.bz-evidence-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--bz-space-3); }
@media (max-width: 600px) { .bz-evidence-grid { grid-template-columns: 1fr; } }
```

**Step 5 — Verify.**
- `node --test test/overview-hero-layout.test.js` → PASS.
- `npm test` → PASS.
- Server up, `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e -- --grep "Overview Hero"` → PASS. Screenshots: `overview-desktop.png`, `overview-mobile.png` in `docs/qa/screenshots/overview-signature/ov-i2/`.

**Step 6 — Commit.**
```bash
git add public/src/components/SignatureHero.js public/src/components/FusionSignaturePanel.js public/src/pages/OverviewPage.js public/src/styles/main.css test/overview-hero-layout.test.js
git commit -m "feat(overview): SignatureHero with wheel-left / fusion-signature-right (OV-I2-T04)"
```

### Task OV-I2-T05: MeaningBridge cards

**Requirement links:** REQ-F-OV-003

**Files:**
- Create: `public/src/components/MeaningBridge.js`
- Modify: `public/src/pages/OverviewPage.js`
- Test: `test/meaning-bridge.test.js`

**Step 1 — Failing test:**

```js
// test/meaning-bridge.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderMeaningBridge } from '../public/src/components/MeaningBridge.js';

const VM = {
  meaningBridge: {
    carries:    { title: 'Was dich traegt', body: 'A.', source: 'src-A' },
    friction:   { title: 'Was reibt',       body: 'B.', source: 'src-B' },
    todayLever: { title: 'Was heute hilft', body: 'C.', source: 'src-C' },
  },
};

test('OV-I2: MeaningBridge renders three cards with sources', () => {
  const html = renderMeaningBridge(VM);
  const dom  = new JSDOM(html);
  const cards = dom.window.document.querySelectorAll('[data-card]');
  assert.equal(cards.length, 3);
  const kinds = Array.from(cards).map((c) => c.getAttribute('data-card'));
  assert.deepEqual(kinds.sort(), ['carries', 'friction', 'today-lever']);
  for (const c of cards) {
    assert.ok(c.querySelector('[data-card-body]'));
    assert.ok(c.querySelector('[data-card-source]'));
    // Max 2 short sentences — assert body length is bounded
    assert.ok(c.querySelector('[data-card-body]').textContent.length <= 240);
  }
});

test('OV-I2: MeaningBridge contains the section anchor', () => {
  const html = renderMeaningBridge(VM);
  assert.match(html, /data-section="meaning-bridge"/);
});
```

**Step 2 — FAIL.**

**Step 3 — Implement:**

```js
// public/src/components/MeaningBridge.js
export function renderMeaningBridge(vm) {
  const order = [
    ['carries',    'carries'],
    ['friction',   'friction'],
    ['todayLever', 'today-lever'],
  ];
  const cards = order.map(([k, attr]) => {
    const c = vm.meaningBridge[k];
    return `
      <article class="bz-meaning-card" data-card="${attr}">
        <h4>${c.title}</h4>
        <p data-card-body>${c.body}</p>
        <p class="bz-meaning-card__src" data-card-source>${c.source}</p>
      </article>`;
  }).join('');
  return `<section data-section="meaning-bridge" class="bz-meaning-bridge">${cards}</section>`;
}
```

**Step 4 — Tests green.**

**Step 5 — Commit.**
```bash
git add public/src/components/MeaningBridge.js public/src/pages/OverviewPage.js test/meaning-bridge.test.js
git commit -m "feat(overview): MeaningBridge cards (carries/friction/today-lever) (OV-I2-T05)"
```

### OV-I2 gate

Live Playwright: `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e -- --grep "overview|hero"`. Screenshots to `docs/qa/screenshots/overview-signature/ov-i2/`. Parallel subagents (tester / reviewer / superpowers:code-reviewer) per the per-iteration gate. Fix critical/major, push.

---

## Iteration OV-I3: Wheel becomes a living, plausible identity object

**Sprintziel (use verbatim with `/goal-forge`):**
> Das Wheel wird als lebendiges, plastisches Signaturbild erfahrbar und bleibt gleichzeitig auditierbar.

### Task OV-I3-T06: Wheel geometry + data provenance tests

**Requirement links:** REQ-F-WH-001, REQ-F-WH-002, REQ-D-001, REQ-D-002

**Files:**
- Modify: `test/natal-chart-wheel.test.js`
- Modify: `test/overview-model.test.js`
- Modify: `public/src/domain/overviewModel.js`
- Modify: `public/src/components/NatalChartWheel.js`

**Step 1 — Failing tests (additions):**

```js
// test/natal-chart-wheel.test.js — appended
test('OV-I3: missing longitude is never rendered as 0deg', () => {
  const wheel = renderNatalChartWheel({
    bodies: [
      { key: 'Sun',  longitude: null, source: 'missing' },
      { key: 'Moon', longitude: 158.23, source: 'api' },
    ],
    angles: { asc: 27.71, mc: 280.66, source: 'api' },
    houses: [],
    aspects: [],
  });
  // The Sun node must NOT be placed; only Moon node should exist.
  assert.ok(!/data-body-key="Sun"[^>]*data-pos="0"/.test(wheel));
  assert.match(wheel, /data-body-key="Moon"/);
});

test('OV-I3: every body in audit list carries source pill', () => {
  const wheel = renderNatalChartWheel({ /* fixture */ });
  // Audit dataset rendered in <ul data-audit>
  assert.match(wheel, /data-audit-source=/);
});

test('OV-I3: ASC at left edge (180deg in screen coords)', () => {
  const wheel = renderNatalChartWheel({
    bodies: [], angles: { asc: 27.71, mc: 280.66, source: 'api' }, houses: [], aspects: [],
  });
  // Assert the rotation transform uses asc as offset → left = -asc
  assert.match(wheel, /data-asc-rotation="-27\.71"/);
});

test('OV-I3: MC/IC/DC derived consistently from ASC', () => {
  const wheel = renderNatalChartWheel({
    bodies: [], angles: { asc: 27.71, mc: 280.66, source: 'api' }, houses: [], aspects: [],
  });
  // dsc = asc + 180 mod 360 = 207.71, ic = mc + 180 mod 360 = 100.66
  assert.match(wheel, /data-angle-dsc="207\.71"/);
  assert.match(wheel, /data-angle-ic="100\.66"/);
});
```

**Step 2 — FAIL.**

**Step 3 — Implement.** In `NatalChartWheel.js`:
- Skip rendering planet nodes when `source === 'missing'`.
- Emit `data-asc-rotation="-{asc}"` on the rotation group.
- Compute and emit `data-angle-dsc` / `data-angle-ic` from `asc` / `mc`.
- Emit `<ul data-audit>` with `data-audit-source` per row.

In `overviewModel.js`: confirm `chartWheel.bodies[i].source` is always set to `'api' | 'derived' | 'missing'` (already done in current file — verify in test).

**Step 4 — PASS.**

**Step 5 — Commit.**
```bash
git add public/src/components/NatalChartWheel.js public/src/domain/overviewModel.js test/natal-chart-wheel.test.js test/overview-model.test.js
git commit -m "fix(wheel): geometry + provenance — no 0deg fallback, ASC-left, audit source pill (OV-I3-T06)"
```

### Task OV-I3-T07: Three SVG layers

**Requirement links:** REQ-F-WH-004

**Files:**
- Modify: `public/src/components/NatalChartWheel.js`
- Modify: `public/src/styles/main.css`
- Modify: `test/natal-chart-wheel.test.js`

**Step 1 — Failing test:**

```js
test('OV-I3: wheel has four named SVG layers', () => {
  const wheel = renderNatalChartWheel({ /* fixture with one body + asc/mc */ });
  for (const layer of ['zodiac-ring', 'houses-axes', 'bodies-aspects', 'labels']) {
    assert.match(wheel, new RegExp(`data-layer="${layer}"`));
  }
});
```

**Step 2 — FAIL.**

**Step 3 — Implement layered SVG `<g>` groups:**

```svg
<svg ...>
  <defs>
    <radialGradient id="bz-wheel-disc">...</radialGradient>
    <filter id="bz-wheel-glow">...</filter>
    <filter id="bz-planet-node">...</filter>
  </defs>
  <g data-layer="zodiac-ring">...</g>
  <g data-layer="houses-axes">...</g>
  <g data-layer="bodies-aspects">...</g>
  <g data-layer="labels">...</g>
</svg>
```

Add CSS: outer ring stronger; house lines dimmed (`opacity: .35`); AC axis primary (`stroke-width: 2`); planet nodes use the glow filter.

**Step 4 — PASS.**

**Step 5 — Commit.**

### Task OV-I3-T08: Color semantics

**Requirement links:** REQ-F-WH-004

**Files:**
- Modify: `public/src/components/NatalChartWheel.js`
- Modify: `public/src/styles/tokens.css`
- Modify: `public/src/styles/main.css`
- Modify: `test/natal-chart-wheel.test.js`

**Step 1 — Failing test:**

```js
test('OV-I3: zodiac sectors carry element classes', () => {
  const wheel = renderNatalChartWheel({ /* fixture */ });
  for (const klass of ['bz-sector--fire','bz-sector--earth','bz-sector--air','bz-sector--water']) {
    assert.match(wheel, new RegExp(klass));
  }
});
test('OV-I3: aspect tones carry hard/soft/neutral classes', () => {
  const wheel = renderNatalChartWheel({
    bodies: [], angles: { asc: 0, mc: 90, source: 'api' }, houses: [],
    aspects: [
      { sourceKey: 'A', targetKey: 'B', tone: 'hard' },
      { sourceKey: 'A', targetKey: 'C', tone: 'soft' },
      { sourceKey: 'A', targetKey: 'D', tone: 'neutral' },
    ],
  });
  for (const t of ['hard','soft','neutral']) {
    assert.match(wheel, new RegExp(`bz-aspect--${t}`));
  }
});
```

**Step 2 — FAIL.**

**Step 3 — Implement.** Add tokens:

```css
/* public/src/styles/tokens.css */
:root {
  --bz-elem-fire:   #c2733b;
  --bz-elem-earth:  #b48a3e;
  --bz-elem-air:    #6b6db3;
  --bz-elem-water:  #2f6f86;
  --bz-aspect-hard: #c44b3b;
  --bz-aspect-soft: #4e9a73;
  --bz-aspect-neutral: #a39059;
}
```

Apply classes in the wheel SVG. Use staggered opacity, not solid fills.

**Step 4 — PASS + Playwright wheel-color screenshot.**

**Step 5 — Commit.**

### Task OV-I3-T09: Wheel hover/click → audit link

**Requirement links:** REQ-F-WH-003, REQ-D-002

**Files:**
- Modify: `public/src/components/NatalChartWheel.js`
- Create: `public/src/components/NatalChartAuditTabs.js` (skeleton — full impl in OV-I4-T11)
- Create: `test/e2e/overview-wheel-interaction.spec.js`

**Step 1 — Failing Playwright spec:**

```js
// test/e2e/overview-wheel-interaction.spec.js
import { test, expect } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path';
const SHOTS = path.resolve('docs/qa/screenshots/overview-signature/ov-i3');
fs.mkdirSync(SHOTS, { recursive: true });

test('OV-I3: hover Sun highlights audit row', async ({ page }) => {
  await page.goto('/#/overview');
  await page.evaluate(() => sessionStorage.setItem('azodiac_profile', JSON.stringify({
    western: { bodies: { Sun: { sign: 'Pisces', longitude: 353.15 } }, angles: { Ascendant: 27.71, MC: 280.66 }, houses: {}, aspects: [] },
    bazi: { day_master: { stem: 'Yang Holz', element: 'Holz' } },
    fusion: { headline: 'Pionier', coherence_index: 0.78 },
  })));
  await page.reload();
  const sun = page.locator('[data-body-key="Sun"]').first();
  await sun.hover();
  await expect(page.locator('[data-audit-row="Sun"]')).toHaveAttribute('data-active', 'true');
  await page.screenshot({ path: path.join(SHOTS, 'wheel-hover-sun.png'), fullPage: true });
});

test('OV-I3: click ASC highlights audit row + keyboard activate', async ({ page }) => {
  await page.goto('/#/overview');
  // ... seed profile ...
  await page.locator('[data-axis-key="ASC"]').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-audit-row="ASC"]')).toHaveAttribute('data-active', 'true');
  await page.screenshot({ path: path.join(SHOTS, 'wheel-hover-ac.png'), fullPage: true });
});
```

**Step 2 — FAIL (no audit rows yet).**

**Step 3 — Implement** `data-body-key` / `data-axis-key` on SVG nodes, focusable (`tabindex="0"`), wired to a state hook that toggles `data-active="true"` on the matching `[data-audit-row]` element in the audit tabs section.

**Step 4 — PASS.**

**Step 5 — Commit.**

### OV-I3 gate

Live Playwright with the new interaction spec. Required screenshots: `wheel-closeup.png`, `wheel-hover-sun.png`, `wheel-hover-ac.png`. Parallel subagents per gate. Fix critical/major. Push.

---

## Iteration OV-I4: Reduce noise, preserve auditability

**Sprintziel (use verbatim with `/goal-forge`):**
> Die Overview wird leichter konsumierbar. Detaildaten bleiben vorhanden, aber in Top-3, Tabs und Accordions organisiert.

### Task OV-I4-T10: TopMovements

**Requirement links:** REQ-F-OV-005, REQ-F-OV-006

**Files:**
- Create: `public/src/components/TopMovements.js`
- Modify: `public/src/pages/OverviewPage.js`
- Test: `test/top-movements.test.js`

**Step 1 — Failing test:**

```js
// test/top-movements.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderTopMovements } from '../public/src/components/TopMovements.js';

const VM = { topMovements: [
  { sourceKey: 'Sun',  targetKey: 'Moon',  typeDE: 'opposition', tone: 'hard',    orb: 1.1 },
  { sourceKey: 'Venus',targetKey: 'Mars',  typeDE: 'trigon',     tone: 'soft',    orb: 0.8 },
  { sourceKey: 'Sun',  targetKey: 'Saturn',typeDE: 'quadrat',    tone: 'hard',    orb: 2.1 },
  { sourceKey: 'X', targetKey: 'Y', typeDE: 'z', tone: 'neutral', orb: 4 },
] };

test('OV-I4: default renders at most 3 movements', () => {
  const html = renderTopMovements(VM);
  const dom  = new JSDOM(html);
  const visible = dom.window.document.querySelectorAll('[data-movement]:not([data-collapsed])');
  assert.ok(visible.length <= 3);
});

test('OV-I4: full list reachable via <details data-progressive>', () => {
  const html = renderTopMovements(VM);
  assert.match(html, /<details[^>]*data-progressive[^>]*>/);
});

test('OV-I4: groups are Spannung / Harmonie / Neutral', () => {
  const html = renderTopMovements(VM);
  for (const g of ['Spannung', 'Harmonie', 'Neutral']) assert.ok(html.includes(g));
});
```

**Step 2 — FAIL → Step 3 — Implement → Step 4 — PASS → Step 5 — Commit.**

### Task OV-I4-T11: NatalChartAuditTabs

**Requirement links:** REQ-D-002, REQ-F-OV-006

**Files:**
- Modify: `public/src/components/NatalChartAuditTabs.js` (from OV-I3-T09)
- Modify: `public/src/pages/OverviewPage.js`
- Test: `test/natal-chart-audit-tabs.test.js`

**Step 1 — Failing test:**

```js
test('OV-I4: audit tabs has Top3 / Planeten / Haeuser / Aspekte', () => {
  const html = renderNatalChartAuditTabs(VM);
  for (const tab of ['Top 3', 'Planeten', 'Haeuser', 'Aspekte']) assert.ok(html.includes(tab));
});

test('OV-I4: planet row shows glyph + name + sign + degree + house + source', () => {
  const html = renderNatalChartAuditTabs({ chartWheel: { bodies: [
    { key: 'Sun', glyph: '☉', labelDE: 'Sonne', signDE: 'Fische', degreeDisplay: '23°09\'', house: 12, source: 'api' },
  ], angles: { asc: 27.71, mc: 280.66 }, houses: [], aspects: [] } });
  for (const s of ['☉','Sonne','Fische','23°09','12','api']) assert.ok(html.includes(s));
});

test('OV-I4: missing data is marked, not silently empty', () => {
  const html = renderNatalChartAuditTabs({ chartWheel: { bodies: [
    { key: 'Sun', glyph: '☉', labelDE: 'Sonne', signDE: null, degreeDisplay: null, house: null, source: 'missing' },
  ], angles: { asc: 27.71, mc: 280.66 }, houses: [], aspects: [] } });
  assert.match(html, /Daten fehlen|nicht geliefert/);
});
```

**Step 2 → 5 — Implement / verify / commit.**

### Task OV-I4-T12: Guided Deep Dive

**Requirement links:** REQ-F-OV-001

**Files:**
- Modify: `public/src/pages/OverviewPage.js`
- Modify: `test/overview-hero-layout.test.js`

**Step 1 — Failing test:**

```js
test('OV-I4: guided deep dive offers four intent CTAs', async () => {
  const html = await renderOverviewPage(/* fixture */);
  for (const intent of [
    'Ich will mich verstehen',
    'Ich will es heute anwenden',
    'Ich will Beziehungsmuster sehen',
    'Ich will die Berechnung pruefen',
  ]) assert.ok(html.includes(intent));
});

test('OV-I4: each deep-dive CTA has a non-empty internal route', async () => {
  const html = await renderOverviewPage(/* fixture */);
  const dom = new JSDOM(html);
  const links = dom.window.document.querySelectorAll('[data-section="guided-deep-dive"] a[href]');
  assert.ok(links.length >= 4);
  for (const a of links) assert.ok(a.getAttribute('href').startsWith('#/'));
});
```

**Step 2 → 5 — Implement / verify / commit.**

### OV-I4 gate (full validation)

1. `npm test` — all unit suites green.
2. Server up, full Playwright:
   `APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e -- --grep "overview|wheel|top movements|audit tabs|guided deep dive"`.
3. Screenshots in `docs/qa/screenshots/overview-signature/`:
   - `overview-desktop.png`
   - `overview-mobile.png`
   - `wheel-closeup.png`
   - `wheel-hover-sun.png`
   - `wheel-hover-ac.png`
   - `aspects-collapsed.png`
   - `aspects-expanded.png`
4. Parallel subagents:
   - `tester` — confirm all 7 screenshot files exist, size > 5 KB, mtime within 10 min. Return list.
   - `reviewer` — full-branch diff review.
   - `superpowers:code-reviewer` — acceptance review against all REQ-* IDs using screenshots.
   - `caveman:cavecrew-reviewer` — short blunt second pass on `public/src/pages/OverviewPage.js` and `NatalChartWheel.js`.
5. PO review checklist (`docs/qa/2026-05-22-overview-signature-review.md`):
   - First screen makes the signature clear?
   - Wheel feels like a central identity object?
   - Data and meaning separated but linked?
   - Page is engaging without overload?
   - No internal field names visible?
   - Audit reachable on demand?
   - Desktop and mobile both work?
6. Fix all critical/major findings (Review → Fix → Test → Playwright → Screenshot → Review) until clean.
7. Push.

---

## 5. Execution handoff

Start with:

1. Pull current branch.
2. Verify Playwright installed (`npx playwright --version`); if missing, run the previous QA-gate iteration (see `docs/plans/2026-05-22-i0-qa-gate-playwright.md`).
3. Begin with **OV-I1-T01** (ViewModel test), not with CSS.
4. Every task is test-first.

Stop and ask if:

- Raw payload missing for wheel-position validation.
- ASC-left geometry not realisable with current data.
- PO color/materiality decision unclear.
- A backend change appears necessary (it should not).

**Final artifacts**

- Code under `public/src/**`
- Tests in `test/**` and `test/e2e/**`
- Screenshots in `docs/qa/screenshots/overview-signature/**`
- QA report `docs/qa/2026-05-22-overview-signature-review.md`
