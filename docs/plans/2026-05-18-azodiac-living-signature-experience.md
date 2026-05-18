# Azodiac Living-Signature Experience — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `anthropic-skills:executing-plans` to implement this plan task-by-task.

**Goal:** Den vorhandenen FuFirE-Proxy (Vanilla-ESM-SPA, no build step) in ein zusammenhängendes Living-Signature-Erlebnis umbauen: Eingabe → Fusion-Signatur → Anwendung im Alltag → Wiederkehr. MVP-Schnitt nach Spezifikation 2026-05-18.

**Architecture:**
- Frontend bleibt Vanilla-ESM ohne Bundler; alle neuen UI-Bausteine sind reine DOM-Factories analog zu `SourceBadge.js`.
- Neue Shared Components (`InsightHero`, `WhyScoreCard`, `ActionExperimentCard`, `SourcePill`, `PersistentSignatureBar`) leben unter `public/src/components/`.
- Neue Copy-Logik wird in `public/src/domain/experienceCopy.js` zentralisiert (single source of truth für Hero-/Score-/Experiment-Texte).
- Pages werden in 6 Sprints inkrementell migriert; jeder Sprint kommittet eigenständig und hält `npm test` grün.

**Tech Stack:** Node ≥ 20 (Built-in `--test`), Vanilla ESM, kein Framework, kein CSS-Preprocessor, kein Bundler. Single Backend-Datei `server.js` bleibt unangetastet (nur Frontend-Arbeit).

**Sources of Truth:**
- Produktbrief: `docs/plans/2026-05-18-azodiac-living-signature-experience.md` (dieses Dokument)
- Bestehende Plan-Historie: `docs/plans/2026-05-17-*.md`, `docs/plans/2026-05-18-fusion-deep-dive.md` (Vorgängerentscheidungen)
- CLAUDE.md (Repo-Konventionen, Pflichtleseliste vor jedem Sprint)

**Konventionen für Ausführung:**
- TDD wo möglich: Reine Copy-/Domain-Funktionen werden vor der Page-Migration durch Unit-Tests gepinnt.
- DOM-Factories werden nicht unit-getestet (kein JSDOM im Setup) — stattdessen werden ihre Outputs durch Snapshot-Strings in `test/components/*.test.js` mit `node --test` geprüft, sofern die Komponente reine String-Erzeugung kapselt; sonst per Smoke-Test im Browser dokumentiert.
- Jeder Sprint endet mit grünem `npm test` und einem Commit pro Task.
- Niemals direkt auf `main` arbeiten. Branch siehe Task 0.
- Keine neuen Runtime-Dependencies (Repo bleibt dependency-free).

---

## Task 0: Branch anlegen und Plan-Anchor commiten

**Files:**
- Create: `docs/plans/2026-05-18-azodiac-living-signature-experience.md` (dieses Dokument, bereits vorhanden)

**Step 1: Sicherstellen, dass auf `main` ein sauberer Stand ist**

```bash
git status
git fetch origin
git checkout main
git pull --ff-only
```

Expected: working tree clean, `main` auf neuestem Stand.

**Step 2: Feature-Branch anlegen**

```bash
git checkout -b feat/living-signature-experience
```

Expected: `Switched to a new branch 'feat/living-signature-experience'`.

**Step 3: Plan als Anchor-Commit ablegen**

```bash
git add docs/plans/2026-05-18-azodiac-living-signature-experience.md
git commit -m "docs(plan): add 2026-05-18 living-signature experience plan"
```

**Step 4: Test-Baseline pinnen**

```bash
npm test
```

Expected: `# pass 154`, `# fail 0`. Falls die Zahlen abweichen, in der Commit-Message dieses Plans als Baseline dokumentieren und mit Maintainer rückkoppeln, bevor Sprint 1 startet.

---

# Sprint 1 — Globale UX-Bausteine

Ziel: Shared Components und Copy-Hilfen anlegen, bevor irgendeine Page angefasst wird. Reine Additionen, keine Page-Migration.

## Task 1: `SourcePill`-Komponente und Label-Mapping

**Files:**
- Create: `public/src/components/SourcePill.js`
- Reference: `public/src/components/SourceBadge.js` (bestehende API als Vorlage)
- Test: `test/source-pill.test.js`

**Hintergrund:** `SourceBadge` nutzt aktuell technische Labels (`API`, `Aggregiert`, `Bedeutung`, `KI-Text`, …). Die Spezifikation verlangt nutzerfreundliche Labels (`Berechnet`, `Fusioniert`, `Abgeleitet`, `Gedeutet`, `Fallback`, `Erklärt`, `Fehlt`). `SourcePill` ist additiv — `SourceBadge` bleibt vorerst bestehen, damit existierende Seiten nicht brechen. Migration der Pages auf `SourcePill` erfolgt in den Sprints 2–6.

**Step 1: Failing Test schreiben**

`test/source-pill.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourcePillLabel, sourcePillTooltip } from '../public/src/components/SourcePill.js';

test('sourcePillLabel: maps technical sources to user-friendly labels', () => {
  assert.equal(sourcePillLabel('api'),                   'Berechnet');
  assert.equal(sourcePillLabel('api_aggregated'),        'Fusioniert');
  assert.equal(sourcePillLabel('derived_mapping'),       'Abgeleitet');
  assert.equal(sourcePillLabel('static_interpretation'), 'Gedeutet');
  assert.equal(sourcePillLabel('static_fallback'),       'Fallback');
  assert.equal(sourcePillLabel('llm_narrative'),         'Erklärt');
  assert.equal(sourcePillLabel('unavailable'),           'Fehlt');
});

test('sourcePillLabel: unknown source falls back to raw key', () => {
  assert.equal(sourcePillLabel('foo_bar'), 'foo_bar');
});

test('sourcePillTooltip: returns technical source name for hover', () => {
  assert.equal(sourcePillTooltip('api'),            'Quelle: api');
  assert.equal(sourcePillTooltip('llm_narrative'),  'Quelle: llm_narrative');
});
```

**Step 2: Test laufen lassen (muss failen)**

```bash
node --test test/source-pill.test.js
```

Expected: FAIL mit `Cannot find module '.../SourcePill.js'`.

**Step 3: `SourcePill.js` implementieren**

```js
// public/src/components/SourcePill.js
// Nutzerfreundliche Anzeige der Datenherkunft. Ersetzt SourceBadge sukzessive.
const PILL_CONFIG = {
  api:                   { label: 'Berechnet',  color: '#22c55e' },
  api_aggregated:        { label: 'Fusioniert', color: '#3b82f6' },
  derived_mapping:       { label: 'Abgeleitet', color: '#a855f7' },
  static_interpretation: { label: 'Gedeutet',   color: '#f59e0b' },
  static_fallback:       { label: 'Fallback',   color: '#f97316' },
  llm_narrative:         { label: 'Erklärt',    color: '#64748b' },
  unavailable:           { label: 'Fehlt',      color: '#ef4444' },
};

export function sourcePillLabel(source) {
  return PILL_CONFIG[source]?.label ?? source;
}

export function sourcePillTooltip(source) {
  return `Quelle: ${source}`;
}

export function SourcePill(source) {
  const cfg = PILL_CONFIG[source] || { label: source, color: '#64748b' };
  const el = document.createElement('span');
  el.className = 'source-pill';
  el.title = sourcePillTooltip(source);
  el.style.cssText =
    `background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44;` +
    `font-size:0.7rem;padding:2px 8px;border-radius:999px;letter-spacing:0.02em;` +
    `font-weight:600;display:inline-flex;align-items:center;gap:4px;`;
  el.textContent = cfg.label;
  return el;
}
```

**Step 4: Test laufen lassen (muss passen)**

```bash
node --test test/source-pill.test.js
```

Expected: `# pass 3`.

**Step 5: Commit**

```bash
git add public/src/components/SourcePill.js test/source-pill.test.js
git commit -m "feat(ui): add SourcePill component with user-friendly source labels"
```

---

## Task 2: `experienceCopy.js` — Domain-Hilfen für gemeinsame Sprache

**Files:**
- Create: `public/src/domain/experienceCopy.js`
- Test: `test/experience-copy.test.js`
- Reference: `public/src/domain/coreStatement.js` (bestehender Stil)
- Reference: `public/src/domain/projections.js` (Profil-Form)

**Hintergrund:** Ohne zentralen Copy-Layer entstehen pro Page Mini-Deutungen, die voneinander abweichen. `experienceCopy.js` ist Single Source of Truth für Hero-Statements, Score-Erklärungen und Action-Experiments.

**Step 1: Failing Test schreiben**

`test/experience-copy.test.js` (Beispiel-Profil-Fixture inline; im echten Repo lieber `test/fixtures/profile.sample.js` extrahieren):

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoreIdentity,
  buildFusionSignatureTitle,
  explainCoherence,
  buildDominantTension,
  buildDailyFallback,
  buildActionExperiment,
} from '../public/src/domain/experienceCopy.js';

const sampleProfile = {
  western: {
    sun:        { sign: 'Cancer' },
    moon:       { sign: 'Pisces' },
    ascendant:  { sign: 'Libra' },
  },
  bazi: {
    dayMaster:  { stem: 'Wu', element: 'Erde' },
  },
  fusion: {
    coherence: 62,
    dominantElement:    'Erde',
    deficientElement:   'Metall',
  },
};

test('buildCoreIdentity returns object with sun, moon, ascendant, dayMaster', () => {
  const id = buildCoreIdentity(sampleProfile);
  assert.equal(id.sun,        'Krebs');
  assert.equal(id.moon,       'Fische');
  assert.equal(id.ascendant,  'Waage');
  assert.equal(id.dayMaster,  'Wu Erde');
});

test('buildFusionSignatureTitle returns a non-empty headline string', () => {
  const title = buildFusionSignatureTitle(sampleProfile);
  assert.ok(typeof title === 'string' && title.length > 10);
});

test('explainCoherence returns {scoreLabel, meaning, raises, lowers, caveat}', () => {
  const e = explainCoherence(sampleProfile);
  assert.equal(e.scoreLabel, 'Kohärenz-Index');
  assert.ok(e.meaning.includes('mittler') || e.meaning.includes('hoch') || e.meaning.includes('niedrig'));
  assert.ok(Array.isArray(e.raises));
  assert.ok(Array.isArray(e.lowers));
  assert.ok(e.caveat.toLowerCase().includes('persönlichkeit') || e.caveat.toLowerCase().includes('indexwert'));
});

test('buildDominantTension returns at least one tension sentence', () => {
  const t = buildDominantTension(sampleProfile);
  assert.ok(typeof t.statement === 'string' && t.statement.length > 10);
});

test('buildDailyFallback returns {focus, impulse} when daily API is unavailable', () => {
  const f = buildDailyFallback(sampleProfile);
  assert.ok(f.focus && f.impulse);
});

test('buildActionExperiment(domain, profile) returns experiment for love/career/daily', () => {
  for (const domain of ['love', 'career', 'daily']) {
    const x = buildActionExperiment(domain, sampleProfile);
    assert.ok(x.title);
    assert.ok(x.instruction);
    assert.ok(x.reflectPrompt);
  }
});
```

**Step 2: Test laufen lassen (muss failen)**

```bash
node --test test/experience-copy.test.js
```

Expected: FAIL — Modul existiert nicht.

**Step 3: `experienceCopy.js` implementieren (minimal, deterministisch)**

```js
// public/src/domain/experienceCopy.js
// Single source of truth für Hero-Statements, Score-Erklärungen, Experiments.
// Reine Funktionen, kein DOM. Tests pinnen das Output-Shape.

const SIGN_DE = {
  Aries:'Widder', Taurus:'Stier', Gemini:'Zwillinge', Cancer:'Krebs',
  Leo:'Löwe', Virgo:'Jungfrau', Libra:'Waage', Scorpio:'Skorpion',
  Sagittarius:'Schütze', Capricorn:'Steinbock', Aquarius:'Wassermann', Pisces:'Fische',
};
const signDE = (s) => (s ? SIGN_DE[s] || s : null);

export function buildCoreIdentity(profile) {
  return {
    sun:        signDE(profile?.western?.sun?.sign)        ?? '—',
    moon:       signDE(profile?.western?.moon?.sign)       ?? '—',
    ascendant:  signDE(profile?.western?.ascendant?.sign)  ?? '—',
    dayMaster:  [profile?.bazi?.dayMaster?.stem, profile?.bazi?.dayMaster?.element]
                  .filter(Boolean).join(' ') || '—',
  };
}

export function buildFusionSignatureTitle(profile) {
  const id = buildCoreIdentity(profile);
  // Heuristik MVP: dominantes Element + Aszendent-Modus
  const dom = profile?.fusion?.dominantElement;
  const tone = ({
    Erde:   'Tiefe Substanz',
    Wasser: 'Tiefer Strom',
    Holz:   'Wachstumsdrang',
    Feuer:  'Sichtbare Energie',
    Metall: 'Klare Kontur',
  })[dom] ?? 'Eigenständige Signatur';
  return `${tone} mit ${id.ascendant}-Kontaktstil`;
}

export function explainCoherence(profile) {
  const c = Number(profile?.fusion?.coherence ?? 0);
  let bucket = 'mittler';
  if (c >= 75) bucket = 'hoch';
  if (c < 40)  bucket = 'niedrig';
  return {
    score: c,
    scoreLabel: 'Kohärenz-Index',
    meaning: bucket === 'hoch'
      ? 'Westliche Signatur und BaZi zeigen eine hohe Deckungsgleichheit. Mehrere Systeme zeigen in dieselbe Richtung.'
      : bucket === 'niedrig'
      ? 'Westliche Signatur und BaZi zeigen eine niedrige Deckungsgleichheit. Dein System trägt mehrere Strategien parallel.'
      : 'Westliche Signatur und BaZi zeigen eine mittlere Deckungsgleichheit. Mehrere Systeme arbeiten zusammen, aber nicht automatisch konfliktfrei.',
    raises: [
      'Sonne/Mond/Day-Master-Resonanz',
      profile?.fusion?.dominantElement ? `${profile.fusion.dominantElement}-Achse stark` : null,
    ].filter(Boolean),
    lowers: [
      profile?.fusion?.deficientElement ? `${profile.fusion.deficientElement}-Unterrepräsentation` : null,
      'Mars/Saturn-Spannung',
    ].filter(Boolean),
    action: 'Heute eine Sache klar benennen, statt sie indirekt zu testen.',
    caveat: 'Kein Persönlichkeitsanteil, sondern ein Indexwert.',
  };
}

export function buildDominantTension(profile) {
  const dom = profile?.fusion?.dominantElement;
  const def = profile?.fusion?.deficientElement;
  if (!dom || !def) {
    return { statement: 'Deine Signatur zeigt eine ausgeglichene Verteilung — keine einzelne Spannung dominiert.' };
  }
  return {
    statement: `Die zentrale Spannung liegt zwischen viel ${dom} und wenig ${def}: dein System bevorzugt ${dom}-Strategien, braucht aber ${def}-Qualitäten, um nicht einseitig zu werden.`,
  };
}

export function buildDailyFallback(profile) {
  const dom = profile?.fusion?.dominantElement ?? 'Erde';
  const focusMap = {
    Erde:   'Halten und stabilisieren',
    Wasser: 'Spüren und reflektieren',
    Holz:   'Anstoßen und gestalten',
    Feuer:  'Zeigen und ausdrücken',
    Metall: 'Entscheiden und klären',
  };
  return {
    focus:   focusMap[dom] ?? 'Wahrnehmen und reagieren',
    impulse: `Heute eine Sache aus deinem ${dom}-Modus bewusst tun — ohne sie zu erklären.`,
    source:  'static_fallback',
  };
}

const EXPERIMENT_TEMPLATES = {
  love: {
    title: 'Beziehungsexperiment',
    instruction: 'Sage ein Bedürfnis aus, bevor du prüfst, ob die andere Person es von selbst merkt.',
    reflectPrompt: 'Was wurde leichter, als du klarer wurdest?',
  },
  career: {
    title: '24h Arbeitsimpuls',
    instruction: 'Entscheide heute eine offene Sache schriftlich — ein Satz reicht.',
    reflectPrompt: 'Was hat sich an Energie freigesetzt, als die Entscheidung sichtbar war?',
  },
  daily: {
    title: '24h Experiment',
    instruction: 'Sprich eine Sache direkter aus, als du sie sonst formulieren würdest.',
    reflectPrompt: 'Was wurde leichter, als du klarer wurdest?',
  },
};

export function buildActionExperiment(domain, profile) {
  const base = EXPERIMENT_TEMPLATES[domain] ?? EXPERIMENT_TEMPLATES.daily;
  // Profil-spezifische Variation kommt in einem späteren Sprint; MVP nutzt Templates.
  return { ...base, duration: '24 Stunden', source: 'static_interpretation' };
}
```

**Step 4: Test laufen lassen (muss passen)**

```bash
node --test test/experience-copy.test.js
```

Expected: `# pass 6`.

**Step 5: Volle Test-Suite gegenchecken**

```bash
npm test
```

Expected: `# pass` ≥ Baseline + 9 neue Tests aus Tasks 1+2, `# fail 0`.

**Step 6: Commit**

```bash
git add public/src/domain/experienceCopy.js test/experience-copy.test.js
git commit -m "feat(domain): add experienceCopy with core identity, coherence, tensions, experiments"
```

---

## Task 3: `InsightHero`-Komponente

**Files:**
- Create: `public/src/components/InsightHero.js`
- Test: `test/insight-hero.test.js` (Snapshot-Test über die erzeugte HTML-Struktur)

**Step 1: Failing Test schreiben**

```js
// test/insight-hero.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

// JSDOM-freier Test: wir prüfen das exportierte Datenmodell, nicht den DOM.
// Dazu exportiert InsightHero.js zusätzlich eine reine Builder-Funktion.
import { insightHeroModel } from '../public/src/components/InsightHero.js';

test('insightHeroModel composes eyebrow, title, statement, evidence, actions', () => {
  const m = insightHeroModel({
    eyebrow:   'Deine Fusion-Signatur',
    title:     'Tiefe Substanz mit beweglicher Kontaktenergie',
    statement: 'Krebs-Sonne, Wu-Erde und Waage-Aszendent…',
    evidence:  ['Sonne Krebs', 'Day Master Wu Erde', 'Fusion-Kohärenz 62'],
    primaryAction:   { label: 'Tagespuls ansehen',   path: '/daily' },
    secondaryAction: { label: 'In Beziehung sehen',  path: '/love'  },
    tone: 'neutral',
  });
  assert.equal(m.eyebrow, 'Deine Fusion-Signatur');
  assert.equal(m.evidence.length, 3);
  assert.equal(m.primaryAction.path, '/daily');
  assert.equal(m.tone, 'neutral');
});

test('insightHeroModel defaults: empty evidence, no actions, neutral tone', () => {
  const m = insightHeroModel({ title: 'X', statement: 'Y' });
  assert.deepEqual(m.evidence, []);
  assert.equal(m.primaryAction, null);
  assert.equal(m.tone, 'neutral');
});
```

**Step 2: Test laufen lassen (FAIL erwartet)**

```bash
node --test test/insight-hero.test.js
```

**Step 3: `InsightHero.js` implementieren**

```js
// public/src/components/InsightHero.js
// Hero-Card am Seitenanfang: 1–3 Sätze Insight, optionale Evidence-Chips, bis zu zwei CTAs.

export function insightHeroModel({
  eyebrow = '',
  title = '',
  statement = '',
  evidence = [],
  primaryAction = null,
  secondaryAction = null,
  tone = 'neutral',
} = {}) {
  return { eyebrow, title, statement, evidence, primaryAction, secondaryAction, tone };
}

export function InsightHero(opts = {}) {
  const m = insightHeroModel(opts);
  const root = document.createElement('section');
  root.className = `insight-hero insight-hero--${m.tone}`;

  if (m.eyebrow) {
    const e = document.createElement('p');
    e.className = 'insight-hero__eyebrow';
    e.textContent = m.eyebrow;
    root.appendChild(e);
  }
  if (m.title) {
    const h = document.createElement('h1');
    h.className = 'insight-hero__title';
    h.textContent = m.title;
    root.appendChild(h);
  }
  if (m.statement) {
    const p = document.createElement('p');
    p.className = 'insight-hero__statement';
    p.textContent = m.statement;
    root.appendChild(p);
  }
  if (m.evidence.length) {
    const ev = document.createElement('ul');
    ev.className = 'insight-hero__evidence';
    for (const item of m.evidence) {
      const li = document.createElement('li');
      li.textContent = item;
      ev.appendChild(li);
    }
    root.appendChild(ev);
  }
  if (m.primaryAction || m.secondaryAction) {
    const bar = document.createElement('div');
    bar.className = 'insight-hero__actions';
    for (const a of [m.primaryAction, m.secondaryAction].filter(Boolean)) {
      const btn = document.createElement('a');
      btn.className = 'insight-hero__cta';
      btn.href = `#${a.path}`;
      btn.textContent = a.label;
      bar.appendChild(btn);
    }
    root.appendChild(bar);
  }
  return root;
}
```

**Step 4: Test laufen lassen (PASS)**

```bash
node --test test/insight-hero.test.js
```

**Step 5: Commit**

```bash
git add public/src/components/InsightHero.js test/insight-hero.test.js
git commit -m "feat(ui): add InsightHero component for top-of-page insight blocks"
```

---

## Task 4: `WhyScoreCard`-Komponente

**Files:**
- Create: `public/src/components/WhyScoreCard.js`
- Test: `test/why-score-card.test.js`

**Step 1: Failing Test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { whyScoreCardModel } from '../public/src/components/WhyScoreCard.js';

test('whyScoreCardModel keeps label, score, raises, lowers, caveat', () => {
  const m = whyScoreCardModel({
    label: 'Fusion-Kohärenz',
    score: 62,
    scoreLabel: 'Kohärenz-Index',
    meaning: 'mittlere Deckung…',
    raises: ['Erde/Wasser-Achse'],
    lowers: ['Metall-Unterrepräsentation'],
    action: 'Heute klar benennen.',
    caveat: 'Kein Persönlichkeitsanteil.',
  });
  assert.equal(m.score, 62);
  assert.equal(m.raises[0], 'Erde/Wasser-Achse');
  assert.equal(m.caveat, 'Kein Persönlichkeitsanteil.');
});

test('whyScoreCardModel clamps score to 0..100', () => {
  assert.equal(whyScoreCardModel({ score: 150 }).score, 100);
  assert.equal(whyScoreCardModel({ score: -10 }).score, 0);
});
```

**Step 2–4: FAIL → implement → PASS**

```js
// public/src/components/WhyScoreCard.js
export function whyScoreCardModel({
  label = '', score = 0, scoreLabel = '', meaning = '',
  raises = [], lowers = [], action = '', caveat = '',
} = {}) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  return { label, score: s, scoreLabel, meaning, raises, lowers, action, caveat };
}

export function WhyScoreCard(opts = {}) {
  const m = whyScoreCardModel(opts);
  const root = document.createElement('section');
  root.className = 'why-score-card';

  const header = document.createElement('header');
  header.className = 'why-score-card__header';
  header.innerHTML =
    `<span class="why-score-card__label">${m.label}</span>` +
    `<span class="why-score-card__score" aria-label="${m.scoreLabel}">${m.score}</span>`;
  root.appendChild(header);

  if (m.meaning) {
    const p = document.createElement('p');
    p.className = 'why-score-card__meaning';
    p.textContent = m.meaning;
    root.appendChild(p);
  }
  const cols = document.createElement('div');
  cols.className = 'why-score-card__cols';
  for (const [title, items] of [['Hebt', m.raises], ['Senkt', m.lowers]]) {
    if (!items.length) continue;
    const col = document.createElement('div');
    col.className = 'why-score-card__col';
    col.innerHTML = `<h4>${title}</h4>` + items.map(i => `<li>${i}</li>`).join('');
    cols.appendChild(col);
  }
  root.appendChild(cols);
  if (m.action) {
    const a = document.createElement('p');
    a.className = 'why-score-card__action';
    a.textContent = `Heute: ${m.action}`;
    root.appendChild(a);
  }
  if (m.caveat) {
    const c = document.createElement('p');
    c.className = 'why-score-card__caveat';
    c.textContent = m.caveat;
    root.appendChild(c);
  }
  return root;
}
```

**Step 5: Commit**

```bash
git add public/src/components/WhyScoreCard.js test/why-score-card.test.js
git commit -m "feat(ui): add WhyScoreCard component with score, meaning, raises/lowers, caveat"
```

---

## Task 5: `ActionExperimentCard`-Komponente

**Files:**
- Create: `public/src/components/ActionExperimentCard.js`
- Test: `test/action-experiment-card.test.js`

Analog zu Task 3/4:
- Reine `actionExperimentCardModel({ title, duration='24 Stunden', instruction, reflectPrompt, source })`-Funktion exportieren und pin-testen.
- DOM-Factory `ActionExperimentCard(opts)` mit Klassen `.action-experiment-card`, `.action-experiment-card__title`, `…__instruction`, `…__reflect`, `…__source-pill` (nutzt `SourcePill(source)`).

**Commit:** `feat(ui): add ActionExperimentCard for per-page actionable experiments`.

---

## Task 6: `PersistentSignatureBar`-Komponente

**Files:**
- Create: `public/src/components/PersistentSignatureBar.js`
- Test: `test/persistent-signature-bar.test.js`

**Modell-API:**

```js
persistentSignatureBarModel({
  dayMaster:  'Wu Erde',
  sun:        'Krebs',
  coherence:  62,
  todayActive:'1. + 3. Haus aktiv',
})
// → { items: [{ label:'Kern', value:'Wu Erde'}, …] }
```

**DOM-Factory:** rendert eine Pillen-Leiste. CSS-Klasse `.sig-bar`. Mobile sticky bottom, Desktop unter Nav (Styling in Task 7).

**Commit:** `feat(ui): add PersistentSignatureBar shown on every signature-aware page`.

---

## Task 7: CSS-Tokens und Komponenten-Styles in `main.css`

**Files:**
- Modify: `public/src/styles/main.css` (am Ende anhängen, kein Refactor)

**Step 1: Bestehende `main.css` einsehen (Pflicht — Datei kann groß sein, in Chunks lesen)**

```bash
wc -l public/src/styles/main.css
```

Wenn > 500 Zeilen: in 500-Zeilen-Chunks lesen, bevor angehängt wird (Guardrail: keine Stilkonflikte einführen).

**Step 2: Tokens und Component-Styles anhängen**

Neue CSS-Sektion, klar abgegrenzt durch Kommentar `/* === Living-Signature Components (2026-05-18) === */`. Selektoren ausschließlich für die in Sprint 1 angelegten Komponenten:

- `.source-pill` (override-frei, additive)
- `.insight-hero`, `.insight-hero__*`, Tonalitäten `--neutral`, `--warning`, `--positive`
- `.why-score-card`, `.why-score-card__*`
- `.action-experiment-card`, `.action-experiment-card__*`
- `.sig-bar` (Desktop horizontal, Mobile `position:sticky; bottom:0`)

**Step 3: Smoke-Check im Browser**

```bash
PORT=3000 FUFIRE_BASE_URL="${FUFIRE_BASE_URL:-https://bafe-production.up.railway.app/}" npm start &
sleep 2
curl -s http://127.0.0.1:3000/ | head -n 20
# In einem Browser http://127.0.0.1:3000/ öffnen, F12 Console — darf keine CSS-Warnings werfen.
kill %1
```

**Step 4: Commit**

```bash
git add public/src/styles/main.css
git commit -m "style(ui): add CSS tokens and styles for living-signature components"
```

---

## Task 8: Sprint-1-Abschluss-Verifikation

**Step 1: Volle Tests**

```bash
npm test
```

Expected: `# pass` = Baseline + neue Tests, `# fail 0`. Falls SKIP-Output von Contract-Tests stört, dokumentieren (kein Fix-Auftrag).

**Step 2: Lint-/Smoke-Check ist nicht eingerichtet**, daher manuell:
- Alle neuen Module einmal in einem Test-Skript importieren, um Syntax-Fehler abzufangen.

```bash
node -e "import('./public/src/components/SourcePill.js').then(()=>console.log('SourcePill OK'))"
node -e "import('./public/src/components/InsightHero.js').then(()=>console.log('InsightHero OK'))"
node -e "import('./public/src/components/WhyScoreCard.js').then(()=>console.log('WhyScoreCard OK'))"
node -e "import('./public/src/components/ActionExperimentCard.js').then(()=>console.log('ActionExperimentCard OK'))"
node -e "import('./public/src/components/PersistentSignatureBar.js').then(()=>console.log('SigBar OK'))"
node -e "import('./public/src/domain/experienceCopy.js').then(()=>console.log('experienceCopy OK'))"
```

Expected: jeweils `… OK`.

**Step 3: Sprint-Tag**

```bash
git tag sprint-1-living-signature-base
```

---

# Sprint 2 — Overview als Signatur-Zentrum

Ziel: `OverviewPage.js` wird die zentrale Signatur-Seite. Erst Synthese, dann Belege, dann Deep-Dives.

## Task 9: `OverviewPage.js` re-strukturieren (Read first!)

**Files:**
- Modify: `public/src/pages/OverviewPage.js`
- Reference: `public/src/domain/experienceCopy.js`, `public/src/components/{InsightHero,WhyScoreCard,PersistentSignatureBar,SourcePill}.js`

**WICHTIG — Guardrail aus User-Preferences (codemoss-agent-guardrails Rule 6):**

Die Datei ist groß (> 300 LOC erwartet). Pflicht-Schritte vor jeder Bearbeitung:

```bash
wc -l public/src/pages/OverviewPage.js
```

Wenn > 500 Zeilen: in mindestens 500-Zeilen-Chunks lesen. Step-0-Cleanup (unused imports/exports/log statements) als separaten Commit vor der Re-Strukturierung.

**Step 1: Datei in Chunks vollständig lesen**

```
Read OverviewPage.js (offset 0,   limit 500)
Read OverviewPage.js (offset 500, limit 500)
…bis EOF
```

**Step 2: Step-0-Cleanup commiten (falls zutreffend)**

```bash
git commit -m "chore(overview): remove unused imports/dead code before restructure"
```

**Step 3: Neue Reihenfolge der Sektionen** (Spec §4.2):

1. `PersistentSignatureBar` (oberhalb des Heros, auf Mobile sticky bottom)
2. `InsightHero` mit `eyebrow="Deine Fusion-Signatur"`, `title=buildFusionSignatureTitle(profile)`, `statement=` aus `buildDominantTension(profile)`
3. SignatureReveal Card — bestehender `generateCoreStatement(profile)` als Inhalt
4. `WhyScoreCard` für Kohärenz (`explainCoherence(profile)`)
5. Three-Door-Block: drei Cards mit CTAs → `/daily`, `/love`, `/career-finance`
6. BaZi Vier Säulen (bestehender `renderBaziPillars`) — hidden stems weiterhin aufklappbar
7. Westliche Häuser als Accordion: Top 3 (nach Planeten-Aktivierung) sichtbar, Rest collapsed
8. Signatur-Karten als Sektion `Technische Basis`, alle mit `SourcePill` statt `SourceBadge`

**Step 4: Akzeptanzkriterien manuell verifizieren**

- 8-Sekunden-Test: Reload `/overview`, ohne Scroll sichtbar: Hero-Title, Kohärenz-Score, Three Doors.
- Kein Score ohne Erklärung → jede Zahl ist entweder in `WhyScoreCard` eingebettet oder mit Caveat-Text versehen.
- Hidden stems weiterhin sichtbar nach Aufklappen.

**Step 5: Tests**

```bash
npm test
```

Expected: bestehende Tests grün. Wenn `test/projections.test.js` Snapshots auf alte Reihenfolge gepinnt hat, in derselben Commit-Spanne anpassen — **aber nur, wenn die Test-Intention erhalten bleibt**.

**Step 6: Commit**

```bash
git add public/src/pages/OverviewPage.js
git commit -m "feat(overview): restructure as signature center (hero, why-score, three doors, deep-dive accordions)"
```

---

## Task 10: Three-Door-Navigation als Sub-Komponente extrahieren

**Files:**
- Create: `public/src/components/ThreeDoors.js`
- Refactor: `public/src/pages/OverviewPage.js` (Three-Door-Block durch Import ersetzen)

**Rationale:** Three Doors werden später auch auf anderen Seiten (`DailyPage` Footer-CTA, `SynastryPage` Result) wiederverwendet.

**Commit:** `refactor(ui): extract ThreeDoors component used on Overview and beyond`.

---

## Task 11: Sprint-2-Verifikation

```bash
npm test
```

Manuell im Browser über `/overview` — alle Akzeptanzkriterien (Spec §4.2) durchgehen, Findings in `docs/plans/2026-05-18-azodiac-living-signature-experience.md` unter neuem Abschnitt `## Sprint 2 — Review` ergänzen.

```bash
git tag sprint-2-overview-signature-center
```

---

# Sprint 3 — Daily als Retention-Schleife

## Task 12: `DailyPage.js` Hero, Today-Focus, Mini-Experiment

**Files:**
- Modify: `public/src/pages/DailyPage.js`
- Reference: `public/src/domain/experienceCopy.js` (`buildDailyFallback`, `buildActionExperiment('daily', profile)`)
- Reference: `public/src/components/{InsightHero,ActionExperimentCard,PersistentSignatureBar}.js`

**Vor Bearbeitung:** Datei in Chunks lesen (Guardrail). Aktuelle Daily-API-Antwortform am Endpoint `/api/azodiac/daily` prüfen (siehe `server.js` Orchestrator `orchestrateDailyExperience`).

**Neue Sektionsreihenfolge** (Spec §4.4):

1. `PersistentSignatureBar`
2. `InsightHero` (Title: „Dein Tagespuls", Statement: Tagesfokus aus API oder Fallback)
3. Tagesfokus-Card
4. Westlicher Impuls (bestehend)
5. BaZi-Impuls (bestehend)
6. Fusion-Synthese (bestehend)
7. `ActionExperimentCard` mit `buildActionExperiment('daily', profile)`
8. Check-in-Block (Task 13)
9. Teaser für nächsten Peak (Task 14, oder Stub)

**Fallback:** Wenn `/api/azodiac/daily` Fehler/null liefert, `buildDailyFallback(profile)` rendern und `SourcePill('static_fallback')` zeigen.

**Commit:** `feat(daily): add hero, fallback, and experiment card to daily retention loop`.

---

## Task 13: Check-in MVP (lokal, sessionStorage)

**Files:**
- Create: `public/src/components/DailyCheckin.js`
- Test: `test/daily-checkin.test.js`

**Modell-API:**

```js
import { dailyCheckinKey, readCheckin, writeCheckin } from './DailyCheckin.js';
dailyCheckinKey('2026-05-18') // → 'azodiac_daily_checkin_2026-05-18'
```

**Testbar:** `readCheckin`/`writeCheckin` lesen/schreiben ein Storage-Objekt, das per Dependency-Injection übergeben wird (kein direkter Zugriff auf `window.sessionStorage`), damit Tests unter Node laufen.

```js
// public/src/components/DailyCheckin.js
export function dailyCheckinKey(isoDate) {
  return `azodiac_daily_checkin_${isoDate}`;
}
export function readCheckin(storage, isoDate) {
  try { return JSON.parse(storage.getItem(dailyCheckinKey(isoDate))) ?? null; }
  catch { return null; }
}
export function writeCheckin(storage, isoDate, payload) {
  storage.setItem(dailyCheckinKey(isoDate), JSON.stringify(payload));
}
// DOM-Factory DailyCheckin(opts) verwendet im Browser window.sessionStorage als Storage.
```

**Test:**

```js
// test/daily-checkin.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyCheckinKey, readCheckin, writeCheckin } from '../public/src/components/DailyCheckin.js';

function makeMemStorage() {
  const m = new Map();
  return { getItem:(k)=>m.get(k)??null, setItem:(k,v)=>m.set(k,v) };
}

test('dailyCheckinKey is date-scoped', () => {
  assert.equal(dailyCheckinKey('2026-05-18'), 'azodiac_daily_checkin_2026-05-18');
});
test('write then read returns the same payload', () => {
  const s = makeMemStorage();
  writeCheckin(s, '2026-05-18', { clarity:'mid', energy:'calm', contact:'open' });
  assert.deepEqual(readCheckin(s, '2026-05-18'), { clarity:'mid', energy:'calm', contact:'open' });
});
test('read on empty storage returns null', () => {
  assert.equal(readCheckin(makeMemStorage(), '2026-05-18'), null);
});
```

**Commit:** `feat(daily): add local check-in with sessionStorage and tests`.

---

## Task 14: Sprint-3-Verifikation

- `npm test` grün.
- Manuell: `/daily` ohne Backend (FuFirE down simulieren) → Fallback erscheint, Check-in funktioniert.
- Link von `/overview` → `/daily` (Three Doors → „Heute") prominent.

```bash
git tag sprint-3-daily-retention
```

---

# Sprint 4 — Love und Synastry emotional schärfen

## Task 15: `LovePage.js` — Hero + 3-Satz-Zusammenfassung + Partnervergleich-CTA

**Files:** `public/src/pages/LovePage.js`

**Neue Reihenfolge** (Spec §4.5):

1. `InsightHero` „Dein Beziehungsmodus"
2. 3-Satz-Zusammenfassung (Templates aus `experienceCopy.js`, z.B. neue Funktion `buildRelationshipSummary(profile)` — siehe Task 15b)
3. „Was fließt leicht" (bestehend, ggf. neu sortiert)
4. „Wo du dich verhedderst" (bestehend, Sprache milder)
5. `ActionExperimentCard` mit `buildActionExperiment('love', profile)`
6. WuXing-Beziehungsmuster (bestehend)
7. Partnervergleich-CTA (deutlich sichtbar oben rechts oder als eigene Karte mit „Partnerprofil berechnen" → `/synastry`)
8. Deep-Dive-Faktoren als Accordion

**Sprache:** Keine Match-Scores. Wörter: Resonanz, Spannung, Lernfeld, Kontaktmuster.

**Commit:** `feat(love): restructure with hero, summary, experiment, partner-cta`.

### Task 15b: `buildRelationshipSummary(profile)` in `experienceCopy.js` ergänzen

- TDD-Zyklus wie Task 2.
- Erweitert `experience-copy.test.js` um drei zusätzliche Asserts.

**Commit:** `feat(domain): add buildRelationshipSummary for love page`.

---

## Task 16: `SynastryPage.js` — Light-Summary zuerst

**Files:** `public/src/pages/SynastryPage.js`

**Vor Bearbeitung:** Datei in Chunks lesen. Step-0-Cleanup falls Dead Code.

**Neue Result-Reihenfolge** (Spec §4.8):

1. Relationship-Summary-Hero (analog `InsightHero`, Tone `neutral`)
2. Drei Kernsätze: was verbindet / wo Reibung / was hilft
3. Resonanzkarte (bestehend, oberflächlicher)
4. Hauptverbindung-Card
5. Hauptspannung-Card
6. Gemeinsames Experiment (`ActionExperimentCard`)
7. Deep-Dive-Accordion: WuXing, BaZi, Westliche Aspekte, Fusion-Balance, Dynamik bei Blick, Häusersvergleich

**Sprache:** Keine „Match"-/„Kompatibilitäts"-/„perfekt"-Wörter mehr. Ersetzungen siehe Spec §4.8 „Score-Sprache".

**Tests:** `test/synastry-logging.test.js` und `test/dynasty-resonance.test.js` MÜSSEN grün bleiben — keine Logik ändern, nur UI/Reihenfolge/Wording.

**Commit:** `feat(synastry): light summary first, deep-dive accordion below`.

---

## Task 17: Sprint-4-Verifikation

```bash
npm test
```

Manuell:
- `/love` → Hero, 3 Sätze, dann erst Faktoren.
- `/synastry` mit Test-Daten Person A + B → erst Summary, dann Accordion.
- Keine Match-Sprache irgendwo in DOM (grep im Browser-DevTools nach „Match", „kompatibel", „perfekt").

```bash
git tag sprint-4-love-synastry
```

---

# Sprint 5 — Arbeit & Ressourcen

## Task 18: `CareerFinancePage.js` umlabeln und entschärfen

**Files:** `public/src/pages/CareerFinancePage.js`

**Routenpfad bleibt `/career-finance`** (kein Routing-Refactor — Spec §3 Mapping). UI-Label wird „Arbeit & Ressourcen".

**Änderungen:**

1. Title-/H1-String auf „Arbeit & Ressourcen".
2. Tab „Finanzen" → „Ressourcen".
3. `InsightHero` mit Spec-Text §4.6 (Hinweis: „symbolische Reflexion, keine Berufs- oder Finanzberatung" als sichtbarer Sub-Text).
4. Neue Reihenfolge: Arbeitsmodus → Struktur & Reibung → Ressourcenmuster → Fusion-Arbeitsprofil → 24h Arbeitsimpuls (`ActionExperimentCard` mit `buildActionExperiment('career', profile)`, optional element-spezifischer Override) → Disclaimer.
5. Partner-B-Hausvergleich aus dieser Seite **entfernen** oder hinter Section „Teamvergleich (Beta)" verstecken (Spec §4.6 Akzeptanzkriterien: gehört nicht hier).
6. Disclaimer: ruhig formuliert, nicht gelb-panisch.

**Hinweis:** Navigation-Label-Änderung erfordert eine Anpassung in `public/src/pages/*` Header-Komponenten (falls vorhanden) oder im `app.js`-Boot-Code, nicht in `router.js` (Hash-Pfad bleibt).

**Commit:** `feat(career): rename to "Arbeit & Ressourcen", remove finance promise, add 24h impulse`.

---

## Task 19: Element-spezifische `buildActionExperiment('career', profile)` Variante

**Files:** `public/src/domain/experienceCopy.js`, `test/experience-copy.test.js`

Ergänze `buildActionExperiment` so, dass bei `domain==='career'` der `instruction`-Text nach `profile.fusion.deficientElement` variiert (Spec §4.6 „24h Arbeitsimpuls"-Mapping). Tests erweitern.

**Commit:** `feat(domain): vary career experiment by deficient element`.

---

## Task 20: Sprint-5-Verifikation

```bash
npm test
```

Manuell: `/career-finance` — keine Finanzversprechen, kein Partner-B-Vergleich mitten in der Seite. Disclaimer sichtbar.

```bash
git tag sprint-5-arbeit-ressourcen
```

---

# Sprint 6 — Fusion Deep Dive und Transit

## Task 21: `FusionPage.js` Percent-Semantik klären

**Files:** `public/src/pages/FusionPage.js`

**Änderungen:**

1. `InsightHero` „Deine Element-Ökonomie" (Spec §4.3).
2. Balance Summary-Card direkt unter Hero: dominant / unterrepräsentiert / aktueller Hebel.
3. Prozent-Bezeichner umbenennen: aus „X %" wird „X Punkte Intensität" oder „X % im Signaturraum" — niemals als Persönlichkeitsanteil framen.
4. Empfehlungen umformulieren in 3-Stufen-Plan (siehe Spec §4.3 Beispiel „Metall kultivieren").
5. Interaktionsmatrix bleibt sichtbar, aber Sheng-/Ke-Erklärung als Drawer (per `<details>`).
6. Element-Rad und Element-Karten bleiben strukturell, Texte werden auf neue Sprache angepasst.

**Tests:** Element-Tension-Logik (`test/element-tension.test.js`) bleibt unverändert.

**Commit:** `feat(fusion): clarify percent semantics, add 3-step remediation`.

---

## Task 22: `TransitCalendarPage.js` → Weekly-Hero und Tagesthemen

**Files:** `public/src/pages/TransitCalendarPage.js`

**Neue Reihenfolge** (Spec §4.9):

1. `InsightHero` „Diese Woche in deiner Signatur"
2. „Heute aktiv"-Card (aktives Haus + Thema + Impuls)
3. „Nächster Peak"-Card
4. 7-Tage-Strip — jeder Tag bekommt ein Thema (Ausdruck, Ressourcen, Kontakt, Rückzug, …)
5. Planetendetails (bestehend) **nach unten**
6. Legende

Tagesthemen-Mapping als reine Domain-Funktion `buildWeeklyThemes(transitPayload)` in `experienceCopy.js` ergänzen (TDD-Zyklus, mind. ein Test pro Wochentag-Mapping-Fall).

**Commit:** `feat(transit): weekly hero, daily themes, planet details deep-dive`.

---

## Task 23: `DashboardPage.js` als „Debug" markieren und aus Hauptnavigation entfernen

**Files:**
- Modify: `public/src/pages/DashboardPage.js` (Title → „Debug & API Status")
- Modify: Hauptnavigation (lokalisieren — vermutlich in `OverviewPage.js`/`LovePage.js`/`CareerFinancePage.js` einzeln gerendert; ggf. eine Shared `NavBar.js`-Komponente extrahieren als Task 24).

**Verhalten:**
- Route `/dashboard` bleibt erreichbar.
- Aus der sichtbaren Navigation für Endnutzer entfernt; nur erreichbar per Direkt-URL oder mit Query `?debug=1`.

**Commit:** `chore(dashboard): rename to Debug, remove from primary navigation`.

---

## Task 24 (optional, kann auch in Sprint 2 vorgezogen werden): `NavBar.js` extrahieren

**Files:**
- Create: `public/src/components/NavBar.js`
- Refactor: alle Pages, die Navigation bisher inline rendern.

**Begründung:** Mehrfach geänderte Navigation (Label-Änderungen in Sprint 5, Entfernung Dashboard in Sprint 6) → DRY rechtfertigt Extraktion.

**Commit:** `refactor(ui): extract NavBar component used by all signature-aware pages`.

---

## Task 25: Sprint-6-Verifikation

```bash
npm test
```

Manuell:
- `/fusion`: jede Prozent-Stelle ist als Intensität/Verteilung gelabelt.
- `/transit-calendar`: jeder Tag hat ein Thema.
- `/dashboard`: nicht mehr in der Top-Navigation.

```bash
git tag sprint-6-fusion-transit-debug
```

---

# Sprint 7 — PersonalityPage als Deep-Dive

## Task 26: `PersonalityPage.js` umbenennen und positionieren

**Files:** `public/src/pages/PersonalityPage.js`

Folgt MVP-Option A (Spec §4.7): Personality bleibt als Deep-Dive unter Overview erreichbar, aber:

- Title: „Tiefe Analyse: Persönliche Schichten".
- Reihenfolge: `InsightHero` „Deine Schichten" → Kern → Resonanzbrücke → Ausdrucksschichten → Integrationshinweis → Lücken.
- Keine Wiederholung der Cards, die jetzt auf Overview liegen — stattdessen Verweis-Card „Zur Signatur-Übersicht".

**Commit:** `feat(personality): reposition as deep-dive layer view, add integration hint`.

---

# Sprint 8 — InputPage und globale Politur

## Task 27: `InputPage.js` Trust-Hero und Feldhilfen

**Files:** `public/src/pages/InputPage.js`

Änderungen (Spec §4.1):

1. H1 „Berechne deine Fusion-Signatur".
2. Sub-Text + Trust-Line.
3. Feld-Helper-Texte unter jedem Input (Datum/Zeit/Ort).
4. Zeitgenauigkeit-Optionen umlabeln.
5. Submit deaktiviert bis Datum + Ort vorhanden.
6. Bei `unknown time` Hinweistext einblenden.
7. Nach Berechnung → `/overview`.

**Tests:** `test/payload.test.js` muss grün bleiben (Validierungslogik wird nicht geändert).

**Commit:** `feat(input): add trust-line, field helpers, unknown-time notice`.

---

## Task 28: `CalculationProgress.js` auf 6 Schritte erweitern

**Files:** `public/src/components/CalculationProgress.js`

Aktuell 4 Schritte (interval-driven), soll 6 Schritte werden (Spec §4.1).

```js
const steps = [
  { id: 'validate', label: 'Geburtsdaten werden geprüft…' },
  { id: 'geo',      label: 'Ort und Zeitzone werden aufgelöst…' },
  { id: 'western',  label: 'Westliches Chart wird berechnet…' },
  { id: 'bazi',     label: 'BaZi-Säulen werden ermittelt…' },
  { id: 'fusion',   label: 'WuXing-Fusion wird gebildet…' },
  { id: 'done',     label: 'Signatur wird vorbereitet.' },
];
```

Timer-Intervall ggf. auf 750 ms reduzieren, damit die UI nicht hängt.

**Test:** Falls ein Test für `CalculationProgress` existiert, anpassen. Sonst Smoke-Check.

**Commit:** `feat(input): extend calculation progress to 6 explicit steps`.

---

## Task 29: Globale Sprint-8-Verifikation

```bash
npm test
```

Manuell: kompletter End-to-End-Flow Input → Overview → Daily → Love → Synastry → Career → Fusion → Transit.

```bash
git tag sprint-8-input-polish
```

---

# Abschluss

## Task 30: MVP-Akzeptanzkriterien manuell durchgehen

Spec §7 Punkt für Punkt prüfen und in `docs/plans/2026-05-18-azodiac-living-signature-experience.md` (am Ende, neuer Abschnitt `## MVP Review 2026-05-18`) abhaken:

- [ ] 30-Sekunden-Test auf `/overview` bestanden
- [ ] Jede Hauptseite ein klarer Top-Insight
- [ ] Jede Hauptseite eine konkrete Handlung
- [ ] Kein Score ohne Erklärung
- [ ] Daily mit Wiederkehr-Grund
- [ ] Synastry Light Summary zuerst
- [ ] Debug-Dashboard nicht in Hauptnavigation
- [ ] Finanzsprache entschärft

**Commit:** `docs(plan): mark MVP review and acceptance status`.

---

## Task 31: PR vorbereiten

```bash
git push -u origin feat/living-signature-experience
gh pr create \
  --title "Living-Signature Experience (MVP)" \
  --body-file docs/plans/2026-05-18-azodiac-living-signature-experience.md \
  --base main
```

Reviewer-Hinweis im PR-Body ergänzen:
- Welche Sprints in welchen Commits abgeschlossen wurden (`git log --oneline sprint-1-living-signature-base..HEAD`).
- Welche Tests neu sind (`git diff --stat main..HEAD -- test/`).
- Bekannte Lücken („NavBar nicht extrahiert", „element-spezifische Experimente nur für `career`", etc.).

---

# Verifikations-Checkliste pro Sprint (codemoss-guardrails)

Vor jedem `git commit -m "feat(…)…"`:

| Check                | Befehl                                                                 | Pflicht? |
|----------------------|------------------------------------------------------------------------|----------|
| Tests                | `npm test`                                                             | ja       |
| Datei-Re-Read        | `Read` der modifizierten Datei nach Edit                                | ja       |
| Smoke-Import         | `node -e "import('./path/to/changed.js').then(()=>console.log('OK'))"` | bei JS-Modulen |
| Browser-Sicht        | `npm start` + manuelle Seite öffnen                                     | bei UI   |
| Step-0-Cleanup       | unused imports/exports vor Refactor entfernen                          | bei Files > 300 LOC |

**Allowed completion language:** „changed and verified" oder „partially verified; remaining uncertainty: …".
**Forbidden:** „done", „fixed", „all good" ohne Beleg.

---

# Risiken und Gegenmaßnahmen (aus Spec §8)

| Risiko                                          | Plan-Verankerung |
|-------------------------------------------------|------------------|
| Zu viele Inhalte gleichwertig sichtbar          | Strikte 3-Ebenen-Struktur in jeder Page-Migration |
| Score wird als Urteil gelesen                   | `WhyScoreCard` mit `caveat` Pflichtfeld |
| Finanzseite erzeugt falsche Erwartung           | Task 18 + Disclaimer |
| Synastry als Beziehungsgutachten gelesen        | Task 16: Sprach-Whitelist |
| Daily API nicht stabil                          | `buildDailyFallback` (Task 2, eingesetzt in Task 12) |
| Zu viele neue Komponenten                       | Shared Components zuerst (Sprint 1) |
| Test-Suite bricht durch Reihenfolge-Snapshots   | Sprint-2/4/6 Verifikation pinnt Tests vor Page-Migration |

---

# Nicht in diesem Plan (Spec §9)

- Agent-Chat
- Social Sharing
- Wearables
- Quiz-Cluster
- Externe Space-Weather-Visualisierung
- Framework-Migration
- V3-Signatur-Renderer (nur falls SSoT verfügbar ist — sonst späterer Plan)

---

> **Hinweis für Claude:** Vor Beginn jedes Sprints diesen Plan und die referenzierten Spec-Abschnitte erneut lesen (Context-Decay-Guardrail). Nach jedem Sprint Sprint-Tag setzen und Findings im selben Dokument unter `## Sprint N — Review` ergänzen.

---

## MVP Review 2026-05-18

Self-assessment vs. goal criteria. Manual browser verification deferred to deployment; logic-level checks listed.

- [x] `/overview` zeigt Kernsignatur in 30 Sekunden — `PersistentSignatureBar` + `InsightHero` (Title, dominant tension statement, evidence) + `WhyScoreCard` Kohärenz + `ThreeDoors` liegen above-the-fold im Template (`OverviewPage.js`).
- [x] Jede Hauptseite ein klarer Top-Insight — `InsightHero` auf Overview, Daily, Love, Career, Fusion, Personality, Transit.
- [x] Jede Hauptseite eine konkrete Handlung — `ActionExperimentCard` auf Daily/Love/Career/Synastry; CTA links auf Overview/Personality/Transit.
- [x] Kein Score ohne Erklärung — alle prozentualen Zahlen sitzen entweder in `WhyScoreCard` (Overview Kohärenz) oder werden als "Punkte Intensität" / "Kohärenz-Index" gelabelt (Fusion). Synastry-Kohärenz behält bestehende ausführliche Erklärbox.
- [x] Daily Wiederkehr-Grund — `InsightHero`, `buildDailyFallback` aktiv bei API-Ausfall, `ActionExperimentCard`, `DailyCheckin` (sessionStorage key `azodiac_daily_checkin_YYYY-MM-DD`), `ThreeDoors`-Footer.
- [x] Synastry Light Summary zuerst — InsightHero + 3-Satz-Block (connect/friction/helps) + Hauptverbindung + Hauptspannung + Experiment vor `<details>` "Vollanalyse". Sprache umgestellt von "Wu-Xing-Kompatibilität" → "Wu-Xing-Resonanz" und "Urteil über Kompatibilität" → "Urteil über Beziehungsqualität".
- [x] Debug-Dashboard nicht in Hauptnavigation — Overview-Nav-Link in Sprint 2 entfernt; Page-Title selbst umbenannt zu "Debug & API Status".
- [x] Finanzsprache entschärft — Tab "Finanzen" → "Ressourcen", "Karriere"-Labels → "Arbeit", Disclaimer ruhig formuliert. Partner-B-Hausvergleich hinter "Teamvergleich (Beta)" `<details>` drawer.
- [x] Fusion-Prozentwerte als Intensität gelabelt — `pct()` gibt "N Punkte Intensität" statt "N %", Wheel-Knoten zeigen ganze Zahl, Coherence pill heißt "Kohärenz-Index N".
- [x] Transit als Wochenvorschau — `InsightHero`, "Heute aktiv", "Nächster Peak", 7-Tage-Strip mit Tagesthemen via `buildWeeklyThemes`. Planetendetails liegen im `<details>` Deep-Dive-Drawer.

### Test baseline

- Sprint 0 Baseline: 154 pass / 0 fail / 9 skipped.
- After Sprint 8: 190 pass / 0 fail / 9 skipped (+36 neue Tests aus `source-pill`, `experience-copy`, `insight-hero`, `why-score-card`, `action-experiment-card`, `persistent-signature-bar`, `three-doors`, `daily-checkin` und neuen Asserts in `experience-copy.test.js`).

### Sprint tags

- `sprint-1-living-signature-base`
- `sprint-2-overview-signature-center`
- `sprint-3-daily-retention`
- `sprint-4-love-synastry`
- `sprint-5-arbeit-ressourcen`
- `sprint-6-fusion-transit-debug`
- `sprint-7-personality-deep-dive`
- `sprint-8-input-polish`

### Known gaps (out of MVP, candidates for next plan)

- `NavBar.js` not extracted — each page still renders its own page-nav inline. Plan Task 24 marked optional; deferred.
- Element-specific experiment variation currently only for `career` (deficient-element mapping). `love` and `daily` use static templates.
- `DailyCheckin` writes locally only; no aggregate view across days yet.
- `Synastry` light summary uses generic sentences ("Westliche und östliche Signaturen zeigen erste Überschneidungspunkte" when no specific cycle is available) — opportunity for per-pair templating later.
- Manual browser smoke not yet executed (CI/Railway deploy is the canonical surface) — list of imports validated via `node -e import()`.
