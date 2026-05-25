# Smoke-Findings Fix + Bazodiac Design-Shift Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Fix the 7 findings from the 2026-05-20 browser-smoke test of the Sprint-E delivery AND start the deliberate style-shift toward the Bazodiac target design captured in `/tmp/fufire-spec`.

**Architecture:** Three-phase plan. **Phase A** = critical-correctness fixes (math + render-bugs that mislead users). **Phase B** = continuity fixes (nav, SignatureBar) that complete the product-shell. **Phase C** = design-shift Sprint H — methodical token-extraction + lane-aesthetic alignment so BaZi/Western/Fusion are visually distinct as in the target mockup.

**Tech Stack:** Vanilla ESM, `node --test`, browser-harness for visual regression, no new deps.

**Methodology (binding for every task):** Root-Cause-Analysis → Solution A → Counter-Proposal (Solution B) → Decision (or synthesized Solution C). Every chosen solution must (a) pass a RED test before fix and (b) explicitly serve Bazodiac's product thesis:
> "Signatur lernen → Heute anwenden → Beziehung reflektieren — drei visuell unterscheidbare Schichten (BaZi Ost / Western Blau / Fusion Hybrid), gespeist aus echten FuFire-API-Daten, ohne Platzhalter."

---

## Phase A — Critical Correctness (3 Tasks)

### Task A1: Fix duplicate 7-Tage-Strip in TransitCalendarPage (C-1)

**Smoke-Befund:** `/transit-calendar` rendert den "7-Tage-Strip mit Tagesthemen" zweimal hintereinander, identische Inhalte. Sichtbar in Screenshot 7.

#### Root-Cause-Analysis

Mount-Code in `public/src/pages/TransitCalendarPage.js` ruft die Strip-Renderfunktion zweimal auf — vermutlich einmal direkt beim Mount + einmal im Daten-Promise-Callback nach `getTransitTimeline()`. Der zweite Render hängt das Element zusätzlich an, statt das Erste zu ersetzen.

**Verification command (must run before deciding fix):**

```bash
grep -nE "appendChild|append\(|innerHTML\s*=" public/src/pages/TransitCalendarPage.js | grep -i "strip\|7.tage\|weekday"
```

Expected: zwei oder mehr Treffer, die denselben Mount-Punkt anhängen.

#### Lösung A: Mount-Container `innerHTML = ''` vor jedem Append

Bevor der Strip neu gerendert wird, Container zurücksetzen.

```js
const strip = root.querySelector('.transit-strip-mount');
strip.innerHTML = '';
strip.appendChild(buildStrip(...));
```

**Pro:** Minimal-invasiv, lokal, garantiert idempotent.
**Contra:** Tut nichts gegen die Ursache (zweifacher Aufruf bleibt — Aufwand wird einfach ge-no-op'd). Wenn neue Sub-Renderer hinzukommen, vergisst der nächste Entwickler den Reset.

#### Lösung B (Gegenvorschlag): Render-Once-Idempotency via `data-rendered` Flag

```js
const strip = root.querySelector('.transit-strip-mount');
if (strip.dataset.rendered) return;
strip.dataset.rendered = 'true';
strip.appendChild(buildStrip(...));
```

**Pro:** Macht den State explizit. Mehrfach-Mount wird sichtbar abgelehnt.
**Contra:** Maskiert die Bug-Ursache. Wenn Daten sich aktualisieren (z.B. Tab-Wechsel mit neuem Datum), kein Re-Render mehr möglich.

#### Lösung C (synthetisiert + gewählt): Root-Cause-Fix im Aufrufpfad

Identifiziere die doppelte Aufruf-Stelle und entferne den überflüssigen. Idiomatischer Mount-Pattern in `app.js` ist `app.innerHTML = ''` plus `mountWithProfile(...)` — Page-Module sollten **nie selbst** zweimal mounten.

**Bazodiac-Begründung:** Die App ist eine "drei-Lanes"-Erfahrung (Lernen/Anwenden/Beziehung). Transite gehören zu Anwenden. Doppelt-rendernde Inhalte unterminieren das Vertrauen in die anderen Lanes. Korrekt = nicht "less buggy", sondern "der Anwenden-Mode liefert exakt das was er verspricht".

**Files:**
- Modify: `public/src/pages/TransitCalendarPage.js` (Aufruf-Stelle entfernen)
- Test: `test/transit-calendar-page.test.js` (neu — DOM-smoke mit capture-stub)

**Step A1.1: Write the failing test**

```js
// test/transit-calendar-page.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { TransitCalendarPage } = await import('../public/src/pages/TransitCalendarPage.js');

test('TransitCalendarPage: 7-Tage-Strip rendert genau einmal (kein Duplicate)', () => {
  cap.reset();
  const app = global.document.createElement('main');
  // Mock fetch so getTransitTimeline returns a deterministic payload
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ days: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-05-${20 + i}`, themes: [], planets: {}, sector_intensity: new Array(12).fill(0),
    })) }),
  });
  assert.doesNotThrow(() => TransitCalendarPage(app, { profile: { western: {}, bazi: {}, fusion: {} } }));
  // Wait microtask flush — page may schedule render in promise chain
  return new Promise((resolve) => setImmediate(() => {
    const agg = cap.aggregate();
    const matches = agg.match(/7-Tage-Strip mit Tagesthemen/g) || [];
    assert.equal(matches.length, 1, `Expected exactly 1 strip render, got ${matches.length}`);
    resolve();
  }));
});
```

**Step A1.2: Run test — verify failure**

```bash
node --test test/transit-calendar-page.test.js 2>&1 | tail -8
```

Expected: `not ok` with `Expected exactly 1 strip render, got 2`.

**Halt-on-defect:** If RED test passes on first run → bug isn't reproducible from current code; investigate before continuing.

**Step A1.3: Apply the fix**

Read the actual mount code. Locate the duplicate-render line. Remove it. Common patterns to look for:
- `renderStrip()` called both eagerly + in fetch.then()
- Same function called via two different selectors
- Template-literal `${stripHTML}` injected twice into innerHTML

**Step A1.4: Run test — verify GREEN**

```bash
node --test test/transit-calendar-page.test.js
```

Expected: PASS.

**Step A1.5: Run full suite**

```bash
npm test 2>&1 | tail -8
```

Expected: previous-baseline pass-count + 1 (no regression).

**Step A1.6: Browser-smoke verification (delegiert oder via browser-harness)**

```bash
# Server hochfahren mit .env, dann:
browser-harness <<'PY'
new_tab("http://127.0.0.1:3000/#/transit-calendar")
wait_for_load()
print(screenshot())
PY
```

Visuell verifizieren dass Strip genau einmal erscheint.

**Step A1.7: Commit**

```bash
git add public/src/pages/TransitCalendarPage.js test/transit-calendar-page.test.js
git commit -m "fix(transit): single render of 7-day strip (smoke C-1)

Root cause: <describe>. Page mount called <function> twice.
RED test reproduces by counting "7-Tage-Strip" occurrences in
captured DOM output — was 2, now 1.

Solution: removed redundant call at <line>. Idempotency guaranteed
by single eager render in promise chain; no data-rendered flag added
(would mask future re-render needs)."
```

---

### Task A2: Unify WuXing-Distribution math across all pages (C-2 + C-3 + I-1)

**Smoke-Befund:** CareerFinancePage zeigt `Holz 9% / Feuer 18% / Erde 55% / Metall 71% / Wasser 41%` — Summe 194%. PersonalityPage zeigt "WU-XING DOMINANZ: HOLZ". CareerFinancePage Fusion-Analyse zeigt "Dominantes Element: Metall". Same profile, contradictory.

#### Root-Cause-Analysis

**§8 Authoritative-Field-Verstoss** (siehe `docs/contracts/2026-05-19-design-vs-real-gap.md`). Mindestens drei Code-Pfade lesen WuXing-Verteilung anders:
1. `FusionPage` (existing) liest `fusion.remediation.distribution` (server-normalisiert, sum=1).
2. `CareerFinancePage` liest vermutlich `fusion.wu_xing_vectors.bazi_pillars` UND/ODER `western_planets` direkt × 100 (un-normalisiert).
3. `PersonalityPage` "WU-XING DOMINANZ" zieht aus `projections.js` — vermutlich `Math.max` über `wu_xing_vectors.bazi_pillars` (BaZi-only).
4. Mein neuer `enrichWuxing()` aus Sprint D′ liest `remediation.distribution` mit Fallback auf `bazi_pillars`.

→ **Vier verschiedene WuXing-Wahrheiten** existieren parallel.

**Verification:**

```bash
grep -rnE "wu_xing_vectors|remediation\.distribution|dominant.*element" public/src --include="*.js" | grep -v "test\|enrichment" | head -20
```

Expected: 5+ Trefferorte, die unterschiedliche Felder anfassen.

#### Lösung A: Alle WuXing-rendernden Pages auf `enrichWuxing()` umstellen

Migriere CareerFinancePage + PersonalityPage + FusionPage so dass jede einzige WuXing-Anzeige durch `enrichWuxing(profile).distribution` läuft.

**Pro:** Eine Wahrheit, ein Code-Pfad. §8-Compliance erzwungen. CareerFinancePage zeigt automatisch normalisierte 100%-summing Werte.
**Contra:** 3-4 Pages müssen angefasst werden. Risiko: bestehende `projections.js`-Logik bricht andere Tests.

#### Lösung B (Gegenvorschlag): No-Fake-Math-Guard im Render-Layer

Ergänze `noFakeDataGuard` um eine Math-Sanity-Check-Funktion: wenn ein Page-Render eine Liste von %-Werten enthält die nicht zu 100±5 summiert, throw. Existing Code bleibt unberührt, Tests fangen die Diskrepanz.

**Pro:** Defensiv, breit anwendbar (fängt auch zukünftige Fälle anderer Pages).
**Contra:** Symptom-Bekämpfung statt Ursachen-Fix. Page rendert immer noch falsch in Production wenn Guard disabled. Plus: viele legitime %-Anzeigen summieren nicht zu 100 (z.B. einzelne Konfidenz-Werte) — false-positives wahrscheinlich.

#### Lösung C (synthesiert + gewählt): Lösung A + No-Fake-Math-Guard nur für `.wuxing-*` Elemente

A liefert den Fix (single source of truth). B liefert die Regression-Bremse (Tests fangen wenn jemand wieder direkt vector × 100 anzeigt). Bind den Guard an die Klasse `.wuxing-distribution-pct` (neu) so dass false-positives ausgeschlossen sind.

**Bazodiac-Begründung:** Das gesamte Produkt steht auf der These "FuFire-Daten ohne Platzhalter, ohne Lüge". Ein User der auf zwei Pages widersprüchliche Dominanz-Aussagen sieht, verliert Vertrauen in die ganze App — selbst wenn beide Pages technisch "funktionieren". §8-Compliance ist Produkt-Versprechen, nicht Code-Hygiene.

**Files:**
- Modify: `public/src/pages/CareerFinancePage.js` (Element-Verteilung-Block)
- Modify: `public/src/pages/PersonalityPage.js` (WuXing-Dominanz-Faktor)
- Modify: `public/src/pages/FusionPage.js` (sanity check + ggf. align)
- Modify: `public/src/api/client.js` (No-Fake-Math-Guard erweitern)
- Test: `test/wuxing-consistency.test.js` (neu)

**Step A2.1: Write the failing test (consistency across pages)**

```js
// test/wuxing-consistency.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const profile = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '_fixtures', 'upstream-snapshots', 'profile.real.json'), 'utf8'
));

function aggForPage(PageFn) {
  cap.reset();
  const app = global.document.createElement('main');
  PageFn(app, { profile, onNavigate: () => {} });
  return cap.aggregate();
}

test('WuXing dominance: same profile must yield identical dominant element across all pages', async () => {
  const { PersonalityPage } = await import('../public/src/pages/PersonalityPage.js');
  const { CareerFinancePage } = await import('../public/src/pages/CareerFinancePage.js');
  const { WuxingPage } = await import('../public/src/pages/WuxingPage.js');

  const pagesAgg = {
    PersonalityPage: aggForPage(PersonalityPage),
    CareerFinancePage: aggForPage(CareerFinancePage),
    WuxingPage: aggForPage(WuxingPage),
  };

  // Lina remediation.deficient = Metall — every page that surfaces deficient
  // MUST agree.
  for (const [name, agg] of Object.entries(pagesAgg)) {
    assert.ok(/Metall/.test(agg), `${name} must surface Metall (deficient) per fusion.remediation.deficient`);
  }
});

test('WuXing distribution percentages: every page must show values summing to 100 ±2', async () => {
  const { CareerFinancePage } = await import('../public/src/pages/CareerFinancePage.js');
  const agg = aggForPage(CareerFinancePage);
  // Extract any sequence of N% N% N% N% N% labeled with Holz/Feuer/Erde/Metall/Wasser
  const elementPctMatches = [...agg.matchAll(/(Holz|Feuer|Erde|Metall|Wasser)[^0-9]{1,40}(\d+)\s*%/g)];
  if (elementPctMatches.length === 5) {
    const sum = elementPctMatches.reduce((s, m) => s + Number(m[2]), 0);
    assert.ok(sum >= 98 && sum <= 102, `CareerFinancePage WuXing %% sum to ${sum}, expected ~100`);
  }
});
```

**Step A2.2: Run test — verify failure**

```bash
node --test test/wuxing-consistency.test.js 2>&1 | tail -10
```

Expected: second test fails with sum ≠ 100.

**Step A2.3: Migrate CareerFinancePage to enrichWuxing()**

Locate the "Element-Verteilung (Arbeit)" block (around line 290 per pre-smoke audit). Replace direct `wu_xing_vectors.bazi_pillars` access with `enrichWuxing(profile).distribution`. Render via the bar pattern from WuxingPage.

**Step A2.4: Migrate PersonalityPage dominanz factor to enrichWuxing()**

Locate "Wu-Xing Dominanz" factor in `projections.js createPersonalityProjection` (around line where supportingFactors are built). Source dominance from `enrichWuxing(profile).dominant?.label`.

**Step A2.5: Sanity-check FusionPage**

FusionPage existing — `/fusion` route — uses its own pentagonal-radar. Verify radar reads `enrichWuxing` (single source) or document why it has its own normalisation. If divergent, migrate.

**Step A2.6: Add No-Fake-Math-Guard**

```js
// public/src/api/client.js — append to noFakeDataGuard or new export
export function noFakeMathGuard(domString, label = '') {
  if (typeof window !== 'undefined' && window.__FUFIRE_FLAGS?.disableNoFakeMathGuard) return;
  // Only check strings that look like a 5-element WuXing distribution.
  const re = /Holz[^0-9]{1,40}(\d+)\s*%[\s\S]{1,200}?Feuer[^0-9]{1,40}(\d+)\s*%[\s\S]{1,200}?Erde[^0-9]{1,40}(\d+)\s*%[\s\S]{1,200}?Metall[^0-9]{1,40}(\d+)\s*%[\s\S]{1,200}?Wasser[^0-9]{1,40}(\d+)\s*%/;
  const m = domString.match(re);
  if (!m) return;
  const sum = [1,2,3,4,5].reduce((s, i) => s + Number(m[i]), 0);
  if (sum < 95 || sum > 105) {
    throw new Error(`[noFakeMathGuard] WuXing %% in "${label}" sum to ${sum}, must be ~100`);
  }
}
```

**Step A2.7: Run all tests**

```bash
npm test 2>&1 | tail -10
```

Expected: GREEN. Sum=100 enforced on CareerFinancePage.

**Step A2.8: Browser-smoke verify**

Navigate `/career-finance`, screenshot, confirm bars sum visually to 100% and Dominantes Element matches PersonalityPage label.

**Step A2.9: Commit**

```bash
git commit -m "fix(wuxing): single source of truth (smoke C-2 + C-3 + I-1)

3 root causes converged in 1 fix:
- CareerFinancePage read wu_xing_vectors.bazi_pillars direct × 100
  (un-normalized; sum 194%)
- PersonalityPage read same un-normalized vector for Dominanz
- Pages disagreed on which element was dominant

All wuxing-rendering pages now route through enrichWuxing(profile)
from Sprint D' module. Single source = fusion.remediation.distribution
(server-normalized, sum=1).

Added noFakeMathGuard to api/client.js — fires when a 5-element
WuXing %% sequence does not sum to 100 ±5. Bound to label class so
unrelated %% (confidence bars, etc) are not affected.

RED tests in test/wuxing-consistency.test.js:
- Pages disagreed on deficient element (Metall present on Personality
  but not CareerFinance) — now both surface Metall
- CareerFinance %% summed to 194 — now to ~100"
```

---

### Task A3: Fix BaziPage 4-Säulen-Grid Layout (I-3)

**Smoke-Befund:** Mein eigener Smoke-Run zeigte 4 Pillars vertikal gestapelt statt im Grid.

#### Root-Cause-Analysis

`bazi-pillars-grid` CSS hat `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`. Bei einem Container der < 220px ist (z.B. wenn Parent `max-width: 200px` setzt oder Padding zuviel frisst), kollabiert auf 1 Spalte. Container ist `.bazi-page` mit `max-width: 980px` plus `padding: 1rem 1.25rem` — sollte 4-spaltig sein bei 1750px Browser. **Vermutung:** capture-DOM-stub Render hatte keine width-Constraints, also Test-Pass; aber im echten Browser interferiert irgendwas.

Plus: Pages-1.jsx Design verwendet `twocol` Klasse (2-spaltiges Grid). Möglicherweise war 4-spaltig nie die Absicht — Design hat 2x2 Layout.

#### Lösung A: minmax-Wert auf 200px senken + viewport-Test

```css
.bazi-pillars-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
```

Plus DOM-Smoke-Test der Computed Style prüft.

**Pro:** Trivial.
**Contra:** Computed-style-Test braucht echtes DOM (jsdom oder browser-harness). Plus: behebt nur den Symptom, nicht das Layout-Intent-Mismatch.

#### Lösung B (Gegenvorschlag): Explicit 2x2 Grid (matches design)

```css
.bazi-pillars-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, auto);
  gap: 1rem;
}
@media (max-width: 720px) {
  .bazi-pillars-grid { grid-template-columns: 1fr; }
}
```

**Pro:** Matches `/tmp/fufire-spec` design (4-Säulen als 2×2). Predictable behavior.
**Contra:** Verliert die "responsive 1-4 cols" Flexibilität.

#### Lösung C (synthesiert + gewählt): 2×2 Grid mit Lane-spezifischem CJK-Header

Lösung B + zusätzlich: jede der 4 Säulen bekommt einen großen CJK-Stem-Char als visuelles Anker-Element (siehe Design Image 1 + 6). Das adressiert nicht nur das Grid-Layout, sondern startet auch den Style-Shift aus Phase C.

**Bazodiac-Begründung:** Vier Säulen sind im Design **vertikale Siegel** mit großem CJK-Zeichen oben. Diese Optik IST die BaZi-Lane visuell. Wenn wir das Grid-Layout fixen ohne den Stem-CJK-Header zu adoptieren, ist es Cosmetic-Fix. Mit CJK-Header = erster Schritt im Style-Shift.

**Files:**
- Modify: `public/src/pages/BaziPage.js` (pillarCard → mit CJK-Char-Header)
- Modify: `public/src/styles/main.css` (.bazi-pillars-grid → 2×2; .bazi-pillar-stem-char neu)
- Test: `test/bazi-page.test.js` (assert CJK char present in pillar card)

**Step A3.1: Write the failing test**

```js
// add to test/bazi-page.test.js
test('BaziPage: each pillar card displays the CJK stem character prominently', () => {
  const app = freshApp();
  BaziPage(app, { profile: lina, onNavigate: () => {} });
  const agg = aggregate();
  // Lina pillars: Ding/Gui/Ren/Jia → 丁 癸 壬 甲
  for (const cjk of ['丁', '癸', '壬', '甲']) {
    assert.match(agg, new RegExp(cjk), `pillar must show CJK stem ${cjk}`);
  }
});
```

**Step A3.2: Run RED**

Expected: 4 matches but CJK chars may only appear once each in Day Master tile and drawer; assert expects them in pillar cards specifically.

**Step A3.3: Extend pillarCard()**

```js
// public/src/pages/BaziPage.js — extend pillarCard
function pillarCard(pillar, role) {
  if (!pillar) { /* unchanged fallback */ }
  // Wrap card body with prominent CJK char block
  const wrap = document.createElement('section');
  wrap.className = `bazi-pillar-card bazi-pillar-card--${role}${role === 'day' ? ' bazi-pillar-card--day-master' : ''}`;
  const stem = document.createElement('div');
  stem.className = 'bazi-pillar-stem-char';
  stem.textContent = pillar.stemChar || pillar.stem || '';
  wrap.appendChild(stem);
  wrap.appendChild(/* existing ExplainableCard */);
  return wrap;
}
```

**Step A3.4: Update CSS to 2×2 + CJK style**

```css
.bazi-pillars-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
@media (max-width: 720px) { .bazi-pillars-grid { grid-template-columns: 1fr; } }

.bazi-pillar-card { position: relative; }
.bazi-pillar-stem-char {
  font-family: 'Noto Serif CJK SC', serif;
  font-size: 3.5rem;
  color: var(--gold-light, #d4b483);
  line-height: 1;
  text-align: center;
  margin-bottom: .75rem;
  opacity: .9;
}
.bazi-pillar-card--day-master .bazi-pillar-stem-char {
  font-size: 4.5rem;
  text-shadow: 0 0 30px rgba(212,175,55,.3);
}
```

**Step A3.5: GREEN test + browser-smoke + Commit**

```bash
git commit -m "fix(bazi): 2x2 pillar grid + CJK stem-char header (smoke I-3)

Root cause: auto-fit grid collapsed to 1 column due to container
padding eating below minmax(220px). Plus: design mockup intends 2x2
layout with CJK stem char as visual anchor, not responsive 1-4 cols.

Solution: explicit grid-template-columns: repeat(2, 1fr) + mobile
1-col fallback at 720px. Pillar cards now mount a 3.5rem CJK stem
character above the ExplainableCard body — day pillar gets 4.5rem
+ gold glow. First concrete style-shift step from Phase C.

RED test asserts CJK chars 丁 癸 壬 甲 (Lina's pillar stems) all
present in rendered DOM."
```

---

## Phase B — Continuity Fixes (2 Tasks)

### Task B1: PersistentSignatureBar on every Sprint-E page (I-5)

**Smoke-Befund:** PersonalityPage + CareerFinancePage haben den Persistent Signature Bar oben (`KERN Wu Erde · SONNE Krebs · KOHÄRENZ 62`). Meine neuen BaziPage / WesternPage / WuxingPage haben ihn NICHT.

#### Root-Cause-Analysis

Ich habe beim Page-Bauen nicht den existing `PersistentSignatureBar` Component eingebaut. Die existing Pages mounten ihn via `app.querySelector('.sig-bar-mount').replaceWith(PersistentSignatureBar({...}))` direkt im Page-Code. Meine neuen Pages haben kein `.sig-bar-mount` Element + keinen Import.

#### Lösung A: PersistentSignatureBar in jede neue Page hinzufügen

```js
// public/src/pages/BaziPage.js — at top of innerHTML template
<div class="sig-bar-mount"></div>
// Then mount:
app.querySelector('.sig-bar-mount').replaceWith(PersistentSignatureBar({...}));
```

3 Pages × ~10 LOC = 30 LOC duplication.

**Pro:** Konsistent mit existing pages.
**Contra:** Duplication. Wenn Bar-Logik sich ändert, 5+ Pages anpassen.

#### Lösung B (Gegenvorschlag): Mount SignatureBar in `app.js` mountWithProfile()

```js
function mountWithProfile(pageFn, app, pageLabel) {
  if (!currentProfile) { /* banner */ return; }
  // Mount global signature bar first
  app.appendChild(PersistentSignatureBar({...currentProfile}));
  // Then mount the page (which appends below)
  pageFn(app, { profile: currentProfile, onNavigate: ... });
}
```

**Pro:** DRY. Single mount-point. Future pages get bar for free.
**Contra:** Pages, die KEINEN Bar wollen (z.B. MethodPage als Debug-Tool), müssten opt-out. Plus: existing Pages haben Bar AN bestimmter Stelle (nach `<nav>`-Element) — globaler Append ändert visual order.

#### Lösung C (synthesiert + gewählt): Layout-Slot in mountWithProfile + Pages-opt-in via Slot-Class

```js
// app.js
function mountWithProfile(pageFn, app, pageLabel) {
  if (!currentProfile) { /* banner */ return; }
  pageFn(app, { profile: currentProfile, onNavigate: ... });
  // After page mounts, check for opt-in slot
  const slot = app.querySelector('.sig-bar-mount');
  if (slot) slot.replaceWith(PersistentSignatureBar({...currentProfile}));
}
```

Pages, die Bar wollen, fügen `<div class="sig-bar-mount"></div>` ins innerHTML ein. Pages ohne Slot bekommen keinen.

**Bazodiac-Begründung:** Continuity ist ein Bazodiac-Pillar — die Signatur-Bar IST das Symbol von "alle Pages sprechen über dieselbe Person". Aber MethodPage darf debug-isoliert sein. Slot-Pattern macht das Opt-in explizit, ohne in jeder Page Mount-Code zu duplizieren.

**Step B1.1–B1.6:** TDD-style — RED test (assert SignatureBar text in 3 new pages), implementation in app.js mountWithProfile + slot in each Page innerHTML, GREEN test, browser-smoke, commit.

---

### Task B2: Top-Nav für alle 10 Design-Routes (M-3)

**Smoke-Befund:** Top-Nav-Tabs zeigen nur `Übersicht / Liebe / Arbeit & Ressourcen / WuXing Fusion`. Meine neuen Routes (`/bazi`, `/western`, `/wuxing`) sind nicht in der Nav. User kann sie nur per URL aufrufen.

#### Root-Cause-Analysis

Existing Pages haben individuelle `<nav>` Elemente — kein globaler Nav-Component. Plus: die `ROUTES`-Liste aus dem Design-Mockup (`/tmp/fufire-spec/src/app.jsx:5`) existiert noch nicht im Code.

#### Lösung A: `SecondaryNav` Component mit hardcoded 10-Route-Liste

```js
// public/src/components/SecondaryNav.js
const ROUTES = [
  { hash: '#/overview', label: 'Übersicht', lane: 'fusion' },
  { hash: '#/bazi', label: 'BaZi', lane: 'bazi' },
  // ... etc
];
export function SecondaryNav() { /* render tab strip */ }
```

Mount in `mountWithProfile()` (oder `app.js` global header).

**Pro:** Sofort sichtbar, alle Routes erreichbar.
**Contra:** Hardcoded Liste — wenn Route entfernt wird, manuell beide Stellen ändern.

#### Lösung B (Gegenvorschlag): ROUTES als Single Source of Truth in `app.js`

```js
// app.js
export const ROUTES = [
  { path: '/overview', label: 'Übersicht', lane: 'fusion', page: OverviewPage, needsProfile: true },
  { path: '/bazi', label: 'BaZi', lane: 'bazi', page: BaZiPage, needsProfile: true },
  // ...
];
// router-Registration loops over ROUTES
// SecondaryNav consumes same ROUTES
```

**Pro:** Single Source of Truth. Adding a route = one line.
**Contra:** Refactoriert existing router-Registration-Pattern. Risiko: einer der Existing-Route-Handlers hat Sonderlogik (z.B. `/synastry` ohne profile, `/transit-calendar` ohne mountWithProfile). Verlust dieser Custom-Logik bei dumb-loop möglich.

#### Lösung C (synthesiert + gewählt): ROUTES-Manifest + Route-Renderer-Map separat

```js
// public/src/data/routes.js
export const ROUTES = [/* metadata only */];
// app.js
import { ROUTES } from './data/routes.js';
const PAGE_RENDERERS = { '/overview': OverviewPage, /* ... */ };
ROUTES.forEach(r => router.register(r.path, ...));
```

Metadata + renderer separated. SecondaryNav, breadcrumbs, page-titles, Stripe-of-DesignPages-overview alle nutzen `ROUTES`. Renderer-Sonderlogik bleibt in `app.js`.

**Bazodiac-Begründung:** "Drei Modi" (Lernen/Anwenden/Beziehung) sind im Design-Mockup als Tab-Strip oben sichtbar. Ohne Top-Nav verliert User Orientierung welche Lane gerade aktiv ist. SecondaryNav mit `data-lane="bazi|west|fusion"` Attributen → CSS kann active-state lane-farb-coded styling rendern (Phase C Style-Shift Vorbereitung).

**Step B2.1–B2.7:** TDD — RED test (mount any page, assert nav-tabs visible for all 10 routes), create ROUTES-manifest, build SecondaryNav, mount in app.js, GREEN test, browser-smoke, commit.

---

## Phase C — Sprint H: Design-Shift toward Bazodiac Target

**Mandate des Users (verbatim):** *"Das aktuelle Design im Frontend reicht noch nicht an das geplante Design aus. In den kommenden Sprints unbedingt den Stil-Shift hin zum eigentlichen Design präzise durchführen."*

Target Design Reference: `/tmp/fufire-spec/src/{app.jsx, chart.jsx, components.jsx, pages-1.jsx, pages-2.jsx, css/styles.css, css/tokens.css}`.

### Aktuelle vs Target Design — Audit

| Element | Aktuell (Smoke-Befund) | Target (`/tmp/fufire-spec`) | Gap |
|---|---|---|---|
| Color Palette | Generic dark-mode purple-blue | "Planetarium" — deep navy/black + gold accents + per-lane signature colors | **Big** |
| Typography | System sans only | DM Sans (UI) + Geist/Serif (display) + Noto Serif CJK SC (BaZi) — three-font system | **Big** |
| BaZi Pillar Style | Plain card with text-only stem name | Vertical "siegel" — large CJK character + gold border + warm earth gradient | **Big** |
| Western Style | Plain card | Orbital — round shapes, planet glyphs prominent | **Medium** |
| Fusion Style | Plain card | Bridge / Layered / Overlay — dual-tone gradients | **Medium** |
| Element Wheel | Intensity bars only (my WuxingPage) | Pentagonal radar with Sheng/Ke arrows (existing FusionPage has this) | **Need to port** |
| Page-Head | Eyebrow + h1 + intro | Serif h1 italicized + over-eyebrow + intro | **Small** |
| Hero | InsightHero exists | Chart placeholder + accompanying serif quote | **Medium** |
| Starfield Background | None | Procedural seeded star field across all pages | **Medium** |
| Theme Toggle | None | planetarium (dark) / morning (light) toggle in topbar | **Big** |

### Sprint H Breakdown (TDD-style per task)

#### Task H1: Extract design-tokens from target into `public/src/styles/tokens.css`

**RCA:** Aktuelle CSS-Vars (`--accent`, `--gold-light`, `--bg`) sind ad-hoc per Page hinzugefügt worden. Target hat ein durchgängiges Token-System in `/tmp/fufire-spec/src/css/tokens.css`.

**Lösung A:** 1:1 Copy von `tokens.css` ins Projekt.
**Lösung B (Gegenvorschlag):** Lese tokens, behalte nur die genutzten, dokumentiere jeden.
**Lösung C (gewählt):** A+B hybrid — kopiere alle tokens + Lint-Regel die unbenutzte tokens auflistet (cleanup-on-touch).

**Files:**
- Create: `public/src/styles/tokens.css`
- Modify: `public/index.html` (link tokens.css before main.css)
- Test: `test/design-tokens-coverage.test.js`

**TDD Test:**
```js
test('every CSS variable used in main.css is defined in tokens.css', () => {
  const main = readFileSync('public/src/styles/main.css', 'utf8');
  const tokens = readFileSync('public/src/styles/tokens.css', 'utf8');
  const used = [...main.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
  const defined = new Set([...tokens.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
  const missing = used.filter((u) => !defined.has(u));
  assert.deepEqual(missing, [], `missing token definitions: ${missing.join(', ')}`);
});
```

#### Task H2: Three-Lane System CSS — `.lane--bazi`, `.lane--west`, `.lane--fusion`

**RCA:** Pages mischen sich aktuell visually. Design-Mockup macht klare Lane-Trennung: BaZi = warm/gold/CJK, Western = blau/orbital, Fusion = hybrid/gradient.

**Lösung A:** CSS-Klassen `.lane--bazi`, `.lane--west`, `.lane--fusion` mit konsistenten Farb-Sets + Typography-Familie-Wechsel.
**Lösung B (Gegenvorschlag):** CSS-Custom-Properties als `data-lane` Attribute auf `<main>` setzen, alles innerhalb erbt die Tokens.
**Lösung C (gewählt):** B — `data-lane` ist explicit + cascading + browser-introspectable. Plus: bestehende `system-layer--*` Klassen migrieren zu data-lane.

#### Task H3: Pentagonal Element-Radar von FusionPage portieren in shared component

**RCA:** Existing FusionPage hat den schönen Sheng/Ke-Pentagram-Radar inline. WuxingPage hat ihn nicht. Soll als wiederverwendbare Component existieren.

**Lösung A:** Inline-SVG aus FusionPage in `WuxingRadar.js` component extrahieren.
**Lösung B (Gegenvorschlag):** SVG-Generation in `domain/wuxingRadar.js` Domain-Layer als pure function `buildRadarSVG(distribution, size)`.
**Lösung C (gewählt):** B + Wrapper-Component — Domain-Layer pur testbar, UI-Component dünn.

#### Task H4: Starfield-Background als globale Layer

#### Task H5: Theme-Toggle (planetarium / morning) im Top-Header

#### Task H6: Serif-Typography-System einführen (DM Sans / Geist / Noto Serif CJK)

#### Task H7: Per-Page Visual-Regression — Browser-Smoke jeder Sprint-E-Page nach H1-H6

Vor + Nach Screenshots aller 10 Routes, side-by-side commit.

**Sprint-H-Exit-Criteria:**
- [ ] Tokens-Audit-Test grün
- [ ] Drei Lanes (bazi/west/fusion) visuell deutlich unterscheidbar
- [ ] Pentagram-Radar in WuxingPage + FusionPage shared
- [ ] CJK Serif Font load auf BaZi-relevanten Seiten
- [ ] Theme-Toggle umschaltbar
- [ ] Browser-Smoke per Page: zeigt visuelle Annäherung an `/tmp/fufire-spec` (User-Review)

---

## Execution Order

**Strict order:**

1. Phase A (3 Tasks) — kritische Korrektheit; Tests + Browser-Smoke per Task. Ein Commit pro Task.
2. Phase B (2 Tasks) — Continuity; nach jeder Task Browser-Smoke.
3. Phase C — Sprint H (7 Tasks) — Style-Shift sequenziell. NACH H7 (Visual-Regression) hold + User-Review.

**Branch-Strategy:**
- Phase A + B: direct-to-main (additive Fixes + Continuity, kein server.js).
- Phase C: feature-branch `feat/sprint-h-design-shift` + PR — Design-Shift ist holistisch + reversibility-kritisch.

**Tests-Baseline-Erwartung:**
- Pre-Phase-A: 471 / 462 pass / 9 skip / 0 fail
- Post-Phase-A: ~480 (Phase A bringt ~10 neue Tests)
- Post-Phase-B: ~490 (Phase B bringt ~8 neue Tests)
- Post-Phase-C: ~510+ (Token-coverage + Lane-coverage + Visual-Reg)

---

## Decisions (answered by user 2026-05-20)

1. **C-3 Migration-Scope:** Whole `projections.js` migrated. WuXing-Dominanz-Faktor + alle anderen Stellen die WuXing-Werte ausgeben routen via `enrichWuxing()`.
2. **Existing FusionPage:** Behalten als `/fusion`-Detail-Page. WuxingPage bleibt separat. NICHT mergen.
3. **Sprint H Branch:** 7 separate PRs gegen `main` (eine pro Sprint-H-Task). Ermöglicht atomische Reviews je Style-Aspekt.
4. **Theme-Default:** Toggle mit `system`-default via `prefers-color-scheme` media query. Drei States: `system | planetarium (dark) | morning (light)`.
5. **CJK-Font:** Noto Serif CJK SC via Google Fonts CDN. Akzeptierter Trade-off: +200KB Initial-Load gegen authentische BaZi-Visualität.

---

*Plan author: Claude Opus 4.7 — 2026-05-20 — based on browser-smoke findings + design-target audit. RCA + counter-proposal + decision pattern per user mandate. All Phase-A + B tasks TDD-strict; Phase C tasks TDD + visual-regression hybrid.*
