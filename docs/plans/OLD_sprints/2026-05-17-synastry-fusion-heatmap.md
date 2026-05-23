# Synastry + Fusion-Layer + Heatmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `anthropic-skills:executing-plans` to implement this plan task-by-task.
> Read each file before editing. Verify with `node --test` after every task.
> Never claim success from a write alone — always re-read and run tests.

**Goal:** Extend `/love` and `/career-finance` with individual Fusion-Layers (Wu-Xing, Day-Master-Archetyp, Kohärenz-Brücke), add a `/synastry` page with Heatmap-Overview, Haus-Gegenüberstellung and Dynastische Resonanz — all 100% derived from real FuFirE endpoint data, no fake values.

**Architecture:** B+C hybrid — Heatmap appears immediately after both profiles are entered (C), `/love` and `/career-finance` also get a pair-tab when Person B data is available (B). Static mapping tables power all interpretations deterministically; no LLM required in this sprint.

**Tech Stack:** Vanilla JS (ESM modules), Node.js `node:test` for tests, no framework, no build step. All frontend files land in `/public/src/`. Backend remains `server.js` untouched except where noted.

**Prerequisite:** INCREMENT 0 from `2026-05-15-azodiac-multipage-devbrief.md` must be complete (fetched_at patch, API client, shared components, router). Verify: `node --test` shows ≥18 pass.

---

## Endpoint Reference (all used in this plan)

| Endpoint | Called via | Yields |
|---|---|---|
| `POST /api/azodiac/profile` | `calculateProfile()` from `api/client.js` | Full `UnifiedAstroProfile` per person |
| `GET /info/wuxing` | direct fetch | `planet_mapping` for transparency layer |

All domain scores, house comparisons, and fusion layers are **derived from the profile response** — no additional backend endpoints needed until Extension G (synastry aspects).

---

## Task 1 — Astro Mapping Data File

**Files:**
- Create: `public/src/data/astro-mappings.js`
- Test: `test/astro-mappings.test.js`

Statische Lookup-Tabellen: Zeichen→Element, Element-Paar→Ton, Haus-Templates, Element-Qualitäten.

**Step 1: Write failing test**

```javascript
// test/astro-mappings.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  signToElement,
  elementPairTone,
  HOUSE_TEMPLATES,
  ELEMENT_QUALITIES,
  ELEMENT_COLORS,
} from '../public/src/data/astro-mappings.js';

test('signToElement maps all 12 signs', () => {
  assert.equal(signToElement('Widder'),     'Feuer');
  assert.equal(signToElement('Stier'),      'Erde');
  assert.equal(signToElement('Zwillinge'),  'Luft');
  assert.equal(signToElement('Krebs'),      'Wasser');
  assert.equal(signToElement('Löwe'),       'Feuer');
  assert.equal(signToElement('Jungfrau'),   'Erde');
  assert.equal(signToElement('Waage'),      'Luft');
  assert.equal(signToElement('Skorpion'),   'Wasser');
  assert.equal(signToElement('Schütze'),    'Feuer');
  assert.equal(signToElement('Steinbock'),  'Erde');
  assert.equal(signToElement('Wassermann'), 'Luft');
  assert.equal(signToElement('Fische'),     'Wasser');
});

test('signToElement also accepts English names', () => {
  assert.equal(signToElement('Aries'),   'Feuer');
  assert.equal(signToElement('Taurus'),  'Erde');
  assert.equal(signToElement('Scorpio'), 'Wasser');
});

test('elementPairTone returns valid tone for all 10 pairs', () => {
  const TONES = ['✨', '⚡', '⚡+', '〰', '〰+'];
  const pairs = [
    ['Feuer','Feuer'],['Feuer','Luft'],['Feuer','Erde'],['Feuer','Wasser'],
    ['Erde','Erde'],['Erde','Wasser'],['Erde','Luft'],
    ['Luft','Luft'],['Luft','Wasser'],['Wasser','Wasser'],
  ];
  for (const [a, b] of pairs) {
    const result = elementPairTone(a, b);
    assert.ok(result.tone, `missing tone for ${a}+${b}`);
    assert.ok(result.score >= 0 && result.score <= 1, `score out of range for ${a}+${b}`);
    assert.ok(typeof result.relation === 'string', `missing relation for ${a}+${b}`);
  }
});

test('elementPairTone is symmetric', () => {
  const ab = elementPairTone('Feuer', 'Wasser');
  const ba = elementPairTone('Wasser', 'Feuer');
  assert.equal(ab.tone, ba.tone);
  assert.equal(ab.score, ba.score);
});

test('HOUSE_TEMPLATES covers all 12 houses', () => {
  for (let i = 1; i <= 12; i++) {
    assert.ok(HOUSE_TEMPLATES[i], `missing template for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].label, `missing label for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].harmonizing, `missing harmonizing for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].tension, `missing tension for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].neutral, `missing neutral for house ${i}`);
  }
});

test('ELEMENT_QUALITIES covers all 5 elements', () => {
  for (const el of ['Feuer','Erde','Luft','Wasser','Holz']) {
    assert.ok(ELEMENT_QUALITIES[el], `missing qualities for ${el}`);
    assert.ok(ELEMENT_QUALITIES[el].love, `missing love quality for ${el}`);
    assert.ok(ELEMENT_QUALITIES[el].career, `missing career quality for ${el}`);
  }
});
```

**Step 2: Run test — verify FAIL**
```bash
cd /Users/benjaminpoersch/Projects/codebase/Full_bazodiac_fufire-main
node --test test/astro-mappings.test.js
```
Expected: `Error: Cannot find module '../public/src/data/astro-mappings.js'`

**Step 3: Implement**

```javascript
// public/src/data/astro-mappings.js

// DE + EN sign names → Element
const SIGN_MAP = {
  // DE
  'Widder':'Feuer','Stier':'Erde','Zwillinge':'Luft','Krebs':'Wasser',
  'Löwe':'Feuer','Jungfrau':'Erde','Waage':'Luft','Skorpion':'Wasser',
  'Schütze':'Feuer','Steinbock':'Erde','Wassermann':'Luft','Fische':'Wasser',
  // EN
  'Aries':'Feuer','Taurus':'Erde','Gemini':'Luft','Cancer':'Wasser',
  'Leo':'Feuer','Virgo':'Erde','Libra':'Luft','Scorpio':'Wasser',
  'Sagittarius':'Feuer','Capricorn':'Erde','Aquarius':'Luft','Pisces':'Wasser',
};

export function signToElement(sign) {
  return SIGN_MAP[sign] ?? null;
}

// Element-pair → { tone, score (0–1 harmony), relation }
// score: 1.0 = volle Harmonie, 0.5 = neutral, 0.2 = starke Spannung
const PAIR_TABLE = {
  'Feuer|Feuer':   { tone:'⚡+', score:0.65, relation:'Intensiv — Vitalität, Risiko Verausgabung' },
  'Feuer|Luft':    { tone:'✨',  score:0.85, relation:'Luft nährt Feuer — Inspiration und Aufwind' },
  'Feuer|Erde':    { tone:'⚡',  score:0.40, relation:'Feuer trocknet Erde — Tempo vs. Beständigkeit' },
  'Feuer|Wasser':  { tone:'⚡',  score:0.35, relation:'Klassischer Kontrast — Leidenschaft trifft Tiefe' },
  'Erde|Erde':     { tone:'〰',  score:0.60, relation:'Stabilität — Risiko Stagnation' },
  'Erde|Wasser':   { tone:'✨',  score:0.80, relation:'Wasser nährt Erde — gegenseitige Fürsorge' },
  'Erde|Luft':     { tone:'⚡',  score:0.38, relation:'Luft erodiert Erde — Pragmatismus vs. Ideen' },
  'Luft|Luft':     { tone:'〰+', score:0.65, relation:'Kommunikation und Ideen — Risiko Bodenlosigkeit' },
  'Luft|Wasser':   { tone:'⚡',  score:0.42, relation:'Luft kräuselt Wasser — Intellekt trifft Gefühl' },
  'Wasser|Wasser': { tone:'✨',  score:0.75, relation:'Emotionale Tiefe — Risiko Verschmelzung' },
};

export function elementPairTone(a, b) {
  const key1 = `${a}|${b}`;
  const key2 = `${b}|${a}`;
  return PAIR_TABLE[key1] ?? PAIR_TABLE[key2] ?? { tone:'〰', score:0.5, relation:'Neutral' };
}

// Wu-Xing element qualities per domain
export const ELEMENT_QUALITIES = {
  Feuer:  { love:'Leidenschaft, Spontanität, Direktheit',      career:'Führung, Sichtbarkeit, Kreativität',     dynasty:'Energie und Aufbruch' },
  Erde:   { love:'Verlässlichkeit, Sinnlichkeit, Beständigkeit', career:'Struktur, Geduld, Aufbau',              dynasty:'Fundament und Kontinuität' },
  Luft:   { love:'Kommunikation, Neugier, Freiheit',           career:'Analyse, Vernetzung, Flexibilität',      dynasty:'Wandel und Austausch' },
  Wasser: { love:'Tiefe, Intuition, Empathie',                 career:'Anpassung, Kreativität, Kommunikation',  dynasty:'Fluss und Erneuerung' },
  Holz:   { love:'Wachstum, Aufbruch, Idealismus',             career:'Strategie, Expansion, Vision',           dynasty:'Wachstum und Erneuerung' },
};

// Element colors (Bazodiac palette)
export const ELEMENT_COLORS = {
  Feuer:  '#EF4444',
  Erde:   '#CA8A04',
  Luft:   '#60A5FA',
  Wasser: '#3B82F6',
  Holz:   '#10B981',
};

// House templates: label + 3 interpretation templates
// {signA}, {signB}, {elemA}, {elemB} are replaced at render time
export const HOUSE_TEMPLATES = {
  1:  { label:'Selbst & Auftritt',       domain:['personality'],
        harmonizing: 'Ihr wirkt nach außen ähnlich — was ihr voneinander als erstes seht, spiegelt euch wider.',
        tension:     'Eure erste Wirkung ist verschieden. {signA} und {signB} begegnen der Welt anders — das macht euch ergänzend statt gleichförmig.',
        neutral:     'Ihr habt unterschiedliche Arten aufzutreten — das gibt eurem Paar Breite.' },

  2:  { label:'Werte & Ressourcen',      domain:['career-finance'],
        harmonizing: 'Eure Wertvorstellungen sprechen dieselbe Sprache ({elemA} × {elemB}). Finanzielle Entscheidungen fallen euch leichter als vielen Paaren.',
        tension:     '{signA} und {signB} im 2. Haus — unterschiedliche Beziehungen zu Geld und Sicherheit. Hier lohnt sich das Gespräch, bevor ihr gemeinsam baut.',
        neutral:     'Unterschiedliche Ressourcen-Perspektiven — wenn bewusst, ein Vorteil.' },

  3:  { label:'Kommunikation',           domain:['personality','love'],
        harmonizing: 'Ihr versteht euch ohne viele Worte. {elemA}-Energie und {elemB}-Energie im 3. Haus resonieren.',
        tension:     'Wie ihr kommuniziert, passt nicht von selbst zusammen ({signA} vs. {signB}). Das kostet kurzfristig Energie — und macht euch langfristig präziser.',
        neutral:     'Ihr sprecht verschiedene Sprachen. Klärung zahlt sich aus.' },

  4:  { label:'Fundament & Familie',     domain:['love','personality'],
        harmonizing: 'Eure Herkunftsenergien {elemA} und {elemB} ergänzen sich — zuhause fühlt sich bei euch beiden ähnlich an.',
        tension:     'Was "Zuhause" bedeutet, ist für {signA} und {signB} verschieden. Das kann anfangs reiben — es führt aber zu einem bewusst gestalteten gemeinsamen Nest.',
        neutral:     'Verschiedene Wurzeln, gemeinsame Richtung möglich.' },

  5:  { label:'Ausdruck & Freude',       domain:['love'],
        harmonizing: 'Wie ihr Freude erlebt, klingt gleich ({elemA} × {elemB}). Zusammen zu spielen fühlt sich natürlich an.',
        tension:     '{signA} und {signB} im 5. Haus — ihr habt verschiedene Arten Freude zu empfinden. Das kann langweilig vermeiden helfen.',
        neutral:     'Unterschiedliche Ausdrucksformen — gut für gegenseitige Überraschung.' },

  6:  { label:'Alltag & Arbeit',         domain:['career-finance'],
        harmonizing: 'Im Alltagsleben seid ihr gut aufeinander eingespielt — ähnliche Energien ({elemA}/{elemB}) im 6. Haus.',
        tension:     'Routinen und Arbeitsrhythmus unterscheiden sich ({signA} vs. {signB}). Verhandlungssache — nicht Schicksal.',
        neutral:     'Alltag braucht Absprache. Beide habt gute Gründe für eure Gewohnheiten.' },

  7:  { label:'Partnerschaft & Vertrag', domain:['love'],
        harmonizing: 'Was ihr voneinander erwartet, ist sehr ähnlich ({elemA} × {elemB}) — eine belastbare Basis.',
        tension:     '{signA} sucht etwas anderes in einer Partnerschaft als {signB}. Das erzeugt Reibung — und hält euch gleichzeitig wach.',
        neutral:     'Verschiedene Partnerschafts-Ideale. Transparenz schützt hier.' },

  8:  { label:'Tiefe & Transformation',  domain:['love','personality'],
        harmonizing: '{signA} und {signB} im 8. Haus — ihr teilt eine Bereitschaft zur Tiefe. Vertrauen baut sich hier schnell auf.',
        tension:     'Dein {signA}-8.-Haus will Tiefe und Kontrolle. Dein Partner\'s {signB}-Energie bringt etwas anderes in diesen Raum. Kleinere Machtkämpfe sind programmiert — und gleichzeitig euer aufregendster Wachstumsmotor.',
        neutral:     'Unterschiedliche Tiefen-Bedürfnisse. Erkundbar, wenn beide offen sind.' },

  9:  { label:'Weltbild & Sinn',         domain:['personality'],
        harmonizing: 'Ihr teilt ähnliche Weltbilder ({elemA} × {elemB}) — Reisen und Philosophieren macht euch stark zusammen.',
        tension:     '{signA} und {signB} im 9. Haus — unterschiedliche Sinngebungen. Inspiriert euch gegenseitig, anstatt zu überzeugen.',
        neutral:     'Verschiedene Lebensphilosophien. Bereichernd, wenn respektiert.' },

  10: { label:'Karriere & Status',       domain:['career-finance'],
        harmonizing: 'Eure Karriere-Energien {elemA} und {elemB} zeigen in dieselbe Richtung — ihr könnt euch im Beruf gegenseitig stärken.',
        tension:     '{signA} und {signB} im 10. Haus — unterschiedliche Karriere-Ästhetiken. Was nach außen gezeigt wird, verhandelt ihr.',
        neutral:     'Verschiedene Karriere-Stile. Kein Problem, wenn klar kommuniziert.' },

  11: { label:'Freundschaft & Visionen', domain:['personality'],
        harmonizing: 'Euer Freundeskreis und eure Zukunftsvisionen klingen ähnlich ({elemA} × {elemB}).',
        tension:     'Wo ihr hinwollt und wer dazugehören soll — das seht ihr verschieden ({signA}/{signB}). Verhandeln lohnt früh.',
        neutral:     'Verschiedene soziale Welten. Beide bereichert das Paar.' },

  12: { label:'Stille & Verborgenes',    domain:['personality','love'],
        harmonizing: 'Was ihr verbergt und wo ihr Ruhe sucht, ist ähnlich ({elemA} × {elemB}). Ihr versteht eure stillen Seiten.',
        tension:     'Eure inneren Rückzugsorte sind verschieden ({signA} vs. {signB}). Gebt euch diesen Raum bewusst — er ist kein Zeichen von Distanz.',
        neutral:     'Verschiedene innere Welten. Neugier hilft mehr als Deutung.' },
};
```

**Step 4: Run test — verify PASS**
```bash
node --test test/astro-mappings.test.js
```
Expected: 6 pass, 0 fail

**Step 5: Full suite**
```bash
node --test
```
Expected: alle bestehenden Tests + 6 neue pass

**Step 6: Commit**
```bash
git add public/src/data/astro-mappings.js test/astro-mappings.test.js
git commit -m "feat: astro mapping tables — sign/element, house templates, element-pair tones"
```

---

## Task 2 — Domain Score Calculator

**Files:**
- Create: `public/src/synastry/domain-score.js`
- Test: `test/domain-score.test.js`

Berechnet die 6 Heatmap-Domain-Scores aus zwei `UnifiedAstroProfile`-Objekten. Pure functions, keine Side Effects.

**Step 1: Write failing test**

```javascript
// test/domain-score.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { computeDomainScores } from '../public/src/synastry/domain-score.js';

// Minimal profile fixtures
const profileA = {
  western: {
    bodies: {
      Venus: { sign: 'Stier', house: 2 },
      Moon:  { sign: 'Krebs', house: 4 },
      Mars:  { sign: 'Widder', house: 1 },
      Mercury: { sign: 'Zwillinge', house: 3 },
      Sun:   { sign: 'Löwe', house: 5 },
    },
    houses: [
      null, // 0-index placeholder
      { cusp: 0,   sign: 'Widder' },   // 1
      { cusp: 30,  sign: 'Stier' },    // 2
      { cusp: 60,  sign: 'Zwillinge' },// 3
      { cusp: 90,  sign: 'Krebs' },    // 4
      { cusp: 120, sign: 'Löwe' },     // 5
      { cusp: 150, sign: 'Jungfrau' }, // 6
      { cusp: 180, sign: 'Waage' },    // 7
      { cusp: 210, sign: 'Skorpion' }, // 8
      { cusp: 240, sign: 'Schütze' },  // 9
      { cusp: 270, sign: 'Steinbock' },// 10
      { cusp: 300, sign: 'Wassermann' },//11
      { cusp: 330, sign: 'Fische' },   // 12
    ],
    aspects: []
  },
  bazi: {
    pillars: {
      year:  { element: 'Holz',  stem: '甲', branch: '子' },
      month: { element: 'Feuer', stem: '丙', branch: '寅' },
      day:   { element: 'Wasser',stem: '壬', branch: '午' },
      hour:  { element: 'Metall',stem: '庚', branch: '申' },
    },
    day_master: { element: 'Wasser', stem: '壬' },
  },
  fusion: {
    wu_xing_vectors: {
      bazi_pillars:    { Holz:0.30, Feuer:0.25, Erde:0.15, Metall:0.15, Wasser:0.15 },
      western_planets: { Holz:0.20, Feuer:0.30, Erde:0.25, Metall:0.10, Wasser:0.15 },
    },
    coherence_index: 0.72,
  },
  wuxing: { vector: { Holz:0.25, Feuer:0.28, Erde:0.20, Metall:0.12, Wasser:0.15 } },
};

const profileB = {
  western: {
    bodies: {
      Venus: { sign: 'Fische', house: 12 },
      Moon:  { sign: 'Stier', house: 2 },
      Mars:  { sign: 'Löwe', house: 5 },
      Mercury: { sign: 'Wassermann', house: 11 },
      Sun:   { sign: 'Wassermann', house: 11 },
    },
    houses: [
      null,
      { cusp: 0,   sign: 'Krebs' },    // 1
      { cusp: 30,  sign: 'Löwe' },     // 2
      { cusp: 60,  sign: 'Jungfrau' }, // 3
      { cusp: 90,  sign: 'Waage' },    // 4
      { cusp: 120, sign: 'Skorpion' }, // 5
      { cusp: 150, sign: 'Schütze' },  // 6
      { cusp: 180, sign: 'Steinbock' },// 7
      { cusp: 210, sign: 'Wassermann' },//8
      { cusp: 240, sign: 'Fische' },   // 9
      { cusp: 270, sign: 'Widder' },   // 10
      { cusp: 300, sign: 'Stier' },    // 11
      { cusp: 330, sign: 'Zwillinge' },// 12
    ],
    aspects: []
  },
  bazi: {
    pillars: {
      year:  { element: 'Feuer', stem: '丙', branch: '卯' },
      month: { element: 'Erde',  stem: '戊', branch: '未' },
      day:   { element: 'Holz',  stem: '甲', branch: '子' },
      hour:  { element: 'Wasser',stem: '癸', branch: '亥' },
    },
    day_master: { element: 'Holz', stem: '甲' },
  },
  fusion: {
    wu_xing_vectors: {
      bazi_pillars:    { Holz:0.15, Feuer:0.35, Erde:0.20, Metall:0.10, Wasser:0.20 },
      western_planets: { Holz:0.10, Feuer:0.20, Erde:0.30, Metall:0.25, Wasser:0.15 },
    },
    coherence_index: 0.58,
  },
  wuxing: { vector: { Holz:0.12, Feuer:0.30, Erde:0.25, Metall:0.18, Wasser:0.15 } },
};

test('computeDomainScores returns all 6 domains', () => {
  const scores = computeDomainScores(profileA, profileB);
  const REQUIRED = ['love','communication','finance','career','growth','foundation'];
  for (const d of REQUIRED) {
    assert.ok(scores[d], `missing domain: ${d}`);
    assert.ok(typeof scores[d].harmony === 'number', `harmony not a number for ${d}`);
    assert.ok(typeof scores[d].tension === 'number', `tension not a number for ${d}`);
    assert.ok(scores[d].harmony >= 0 && scores[d].harmony <= 100, `harmony out of range for ${d}`);
    assert.ok(scores[d].tension >= 0 && scores[d].tension <= 100, `tension out of range for ${d}`);
    assert.ok(Array.isArray(scores[d].sources), `sources not array for ${d}`);
    assert.ok(scores[d].sources.length > 0, `no sources for ${d}`);
  }
});

test('harmony + tension sum is not required to be 100 (they are independent)', () => {
  const scores = computeDomainScores(profileA, profileB);
  // Each is an independent score, not complementary
  for (const d of Object.keys(scores)) {
    assert.ok(scores[d].harmony >= 0, `harmony negative for ${d}`);
    assert.ok(scores[d].tension >= 0, `tension negative for ${d}`);
  }
});

test('computeDomainScores is stable (same input → same output)', () => {
  const s1 = computeDomainScores(profileA, profileB);
  const s2 = computeDomainScores(profileA, profileB);
  assert.deepEqual(s1, s2);
});

test('computeDomainScores handles missing optional fields gracefully', () => {
  const sparse = {
    western: { bodies: {}, houses: [], aspects: [] },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: null },
  };
  assert.doesNotThrow(() => computeDomainScores(sparse, sparse));
});
```

**Step 2: Run test — verify FAIL**
```bash
node --test test/domain-score.test.js
```
Expected: `Cannot find module '../public/src/synastry/domain-score.js'`

**Step 3: Implement**

```javascript
// public/src/synastry/domain-score.js
import { signToElement, elementPairTone } from '../data/astro-mappings.js';

// Wu-Xing delta: how different are two vectors? Returns 0 (same) → 1 (maximally different)
function wuxingDelta(vecA, vecB) {
  if (!vecA || !vecB) return 0.5;
  const keys = ['Holz','Feuer','Erde','Metall','Wasser'];
  const totalDiff = keys.reduce((sum, k) => sum + Math.abs((vecA[k]??0) - (vecB[k]??0)), 0);
  return Math.min(1, totalDiff / 2); // max theoretical diff = 2
}

// Element harmony between two signs (0–1)
function signHarmony(signA, signB) {
  if (!signA || !signB) return 0.5;
  const { score } = elementPairTone(signToElement(signA), signToElement(signB));
  return score;
}

// House sign harmony for a given house index (1-based) in both profiles
function houseHarmony(profileA, profileB, houseIndex) {
  const hA = profileA.western?.houses?.[houseIndex]?.sign;
  const hB = profileB.western?.houses?.[houseIndex]?.sign;
  return signHarmony(hA, hB);
}

// BaZi element harmony between two pillars
function pillarHarmony(pillarA, pillarB) {
  if (!pillarA?.element || !pillarB?.element) return 0.5;
  return elementPairTone(pillarA.element, pillarB.element).score;
}

// Average of values, ignoring nulls
function avg(...values) {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return 0.5;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// Convert harmony score (0–1) to harmony% and tension%
// High harmony score → high harmony, low tension
// Low harmony score → low harmony, high tension
function toScores(harmonyScore) {
  const harmony = Math.round(harmonyScore * 100);
  // tension is the complement, but capped — tension is ALWAYS framed as potential
  const tension = Math.round((1 - harmonyScore) * 100);
  return { harmony, tension };
}

export function computeDomainScores(profileA, profileB) {
  const pA = profileA;
  const pB = profileB;

  // ── LOVE ──────────────────────────────────────────────────────────────────
  const venusTone   = signHarmony(pA.western?.bodies?.Venus?.sign, pB.western?.bodies?.Venus?.sign);
  const moonTone    = signHarmony(pA.western?.bodies?.Moon?.sign,  pB.western?.bodies?.Moon?.sign);
  const dayMasterTone = pillarHarmony(pA.bazi?.day_master, pB.bazi?.day_master);
  const h5Tone      = houseHarmony(pA, pB, 5);
  const h7Tone      = houseHarmony(pA, pB, 7);
  const loveHarmony = avg(venusTone, moonTone, dayMasterTone, h5Tone, h7Tone);

  // ── COMMUNICATION ─────────────────────────────────────────────────────────
  const mercuryTone   = signHarmony(pA.western?.bodies?.Mercury?.sign, pB.western?.bodies?.Mercury?.sign);
  const h3Tone        = houseHarmony(pA, pB, 3);
  const airDeltaA     = pA.wuxing?.vector?.Luft ?? pA.fusion?.wu_xing_vectors?.bazi_pillars?.Luft ?? 0;
  const airDeltaB     = pB.wuxing?.vector?.Luft ?? pB.fusion?.wu_xing_vectors?.bazi_pillars?.Luft ?? 0;
  const airComplement = 1 - Math.abs(airDeltaA - airDeltaB) * 2;
  const commHarmony   = avg(mercuryTone, h3Tone, airComplement);

  // ── FINANCE ───────────────────────────────────────────────────────────────
  const h2Tone       = houseHarmony(pA, pB, 2);
  const h8Tone       = houseHarmony(pA, pB, 8);
  const yearTone     = pillarHarmony(pA.bazi?.pillars?.year, pB.bazi?.pillars?.year);
  const earthMetalA  = (pA.wuxing?.vector?.Erde??0) + (pA.wuxing?.vector?.Metall??0);
  const earthMetalB  = (pB.wuxing?.vector?.Erde??0) + (pB.wuxing?.vector?.Metall??0);
  const earthComplement = 1 - Math.abs(earthMetalA - earthMetalB);
  const financeHarmony  = avg(h2Tone, h8Tone, yearTone, earthComplement);

  // ── CAREER ────────────────────────────────────────────────────────────────
  const h10Tone      = houseHarmony(pA, pB, 10);
  const h6Tone       = houseHarmony(pA, pB, 6);
  const monthTone    = pillarHarmony(pA.bazi?.pillars?.month, pB.bazi?.pillars?.month);
  const cohA         = pA.fusion?.coherence_index ?? 0.5;
  const cohB         = pB.fusion?.coherence_index ?? 0.5;
  const cohComplement = 1 - Math.abs(cohA - cohB);
  const careerHarmony = avg(h10Tone, h6Tone, monthTone, cohComplement);

  // ── GROWTH (Wachstum / Blinde Flecken) ────────────────────────────────────
  const cohDivergence = 1 - Math.abs(cohA - cohB); // high when both have similar clarity
  const h9Tone        = houseHarmony(pA, pB, 9);
  const hourTone      = pillarHarmony(pA.bazi?.pillars?.hour, pB.bazi?.pillars?.hour);
  const growthHarmony = avg(cohDivergence, h9Tone, hourTone);

  // ── FOUNDATION ────────────────────────────────────────────────────────────
  const h4Tone          = houseHarmony(pA, pB, 4);
  const h1Tone          = houseHarmony(pA, pB, 1);
  const earthA          = pA.wuxing?.vector?.Erde ?? 0;
  const earthB          = pB.wuxing?.vector?.Erde ?? 0;
  const earthAlign      = 1 - Math.abs(earthA - earthB);
  const foundationHarmony = avg(yearTone, h4Tone, h1Tone, earthAlign);

  return {
    love:          { ...toScores(loveHarmony),         sources:['Venus','Moon','DayMaster','H5','H7'] },
    communication: { ...toScores(commHarmony),         sources:['Mercury','H3','WuxingLuft'] },
    finance:       { ...toScores(financeHarmony),      sources:['H2','H8','YearPillar','WuxingErde/Metall'] },
    career:        { ...toScores(careerHarmony),       sources:['H10','H6','MonthPillar','CoherenceIndex'] },
    growth:        { ...toScores(growthHarmony),       sources:['CoherenceDelta','H9','HourPillar'] },
    foundation:    { ...toScores(foundationHarmony),   sources:['YearPillar','H4','H1','WuxingErde'] },
  };
}
```

**Step 4: Run test — verify PASS**
```bash
node --test test/domain-score.test.js
```
Expected: 4 pass, 0 fail

**Step 5: Full suite**
```bash
node --test
```
Expected: alle bisherigen + 4 neue pass

**Step 6: Commit**
```bash
git add public/src/synastry/domain-score.js test/domain-score.test.js
git commit -m "feat: domain score calculator — 6 domains from real FuFirE profile data"
```

---

## Task 3 — House Comparison Renderer

**Files:**
- Create: `public/src/synastry/house-comparison.js`
- Test: `test/house-comparison.test.js`

Rendert die Haus-Gegenüberstellungs-Tabelle + Detail-Interpretationen.

**Step 1: Write failing test**

```javascript
// test/house-comparison.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildHouseComparisons, DOMAIN_HOUSES } from '../public/src/synastry/house-comparison.js';

const profileA = {
  western: { houses: [
    null,
    {sign:'Widder'},{sign:'Stier'},{sign:'Zwillinge'},{sign:'Krebs'},
    {sign:'Löwe'},{sign:'Jungfrau'},{sign:'Waage'},{sign:'Skorpion'},
    {sign:'Schütze'},{sign:'Steinbock'},{sign:'Wassermann'},{sign:'Fische'},
  ]}
};
const profileB = {
  western: { houses: [
    null,
    {sign:'Krebs'},{sign:'Löwe'},{sign:'Jungfrau'},{sign:'Waage'},
    {sign:'Skorpion'},{sign:'Schütze'},{sign:'Steinbock'},{sign:'Wassermann'},
    {sign:'Fische'},{sign:'Widder'},{sign:'Stier'},{sign:'Zwillinge'},
  ]}
};

test('buildHouseComparisons returns entries for given house list', () => {
  const entries = buildHouseComparisons(profileA, profileB, [5, 7, 8]);
  assert.equal(entries.length, 3);
  for (const e of entries) {
    assert.ok(e.house, 'missing house number');
    assert.ok(e.label, 'missing label');
    assert.ok(e.signA, 'missing signA');
    assert.ok(e.signB, 'missing signB');
    assert.ok(e.elemA, 'missing elemA');
    assert.ok(e.elemB, 'missing elemB');
    assert.ok(['✨','⚡','⚡+','〰','〰+'].includes(e.tone), `invalid tone: ${e.tone}`);
    assert.ok(typeof e.text === 'string' && e.text.length > 0, 'missing text');
  }
});

test('DOMAIN_HOUSES provides correct house lists per domain', () => {
  assert.ok(Array.isArray(DOMAIN_HOUSES.love), 'love houses missing');
  assert.ok(Array.isArray(DOMAIN_HOUSES['career-finance']), 'career-finance houses missing');
  assert.ok(Array.isArray(DOMAIN_HOUSES.synastry), 'synastry houses missing');
  assert.equal(DOMAIN_HOUSES.synastry.length, 12, 'synastry should have all 12 houses');
});

test('buildHouseComparisons handles missing house data gracefully', () => {
  const empty = { western: { houses: [] } };
  assert.doesNotThrow(() => buildHouseComparisons(empty, empty, [1,2,3]));
});
```

**Step 2: Run test — verify FAIL**
```bash
node --test test/house-comparison.test.js
```

**Step 3: Implement**

```javascript
// public/src/synastry/house-comparison.js
import { signToElement, elementPairTone, HOUSE_TEMPLATES } from '../data/astro-mappings.js';

export const DOMAIN_HOUSES = {
  love:             [1, 4, 5, 7, 8],
  'career-finance': [2, 6, 8, 10],
  personality:      [1, 3, 9, 11, 12],
  synastry:         [1,2,3,4,5,6,7,8,9,10,11,12],
};

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function buildHouseComparisons(profileA, profileB, houseList) {
  return houseList.map(houseIndex => {
    const signA = profileA.western?.houses?.[houseIndex]?.sign ?? '?';
    const signB = profileB.western?.houses?.[houseIndex]?.sign ?? '?';
    const elemA = signToElement(signA) ?? '?';
    const elemB = signToElement(signB) ?? '?';
    const { tone, score } = elementPairTone(elemA, elemB);
    const tmpl = HOUSE_TEMPLATES[houseIndex];

    if (!tmpl) return { house: houseIndex, label:`Haus ${houseIndex}`, signA, signB, elemA, elemB, tone, text:'', score };

    const vars = { signA, signB, elemA, elemB,
      [`haus${houseIndex}_quality_A`]: signA, // placeholder — could be enriched later
      [`haus${houseIndex}_quality_B`]: signB,
      [`haus${houseIndex}_theme`]: tmpl.label,
      tension_bridge: 'Reibungen sind programmiert — und gleichzeitig euer aufregendster Wachstumsmotor.',
    };

    let rawText;
    if (score >= 0.70)      rawText = tmpl.harmonizing;
    else if (score <= 0.45) rawText = tmpl.tension;
    else                    rawText = tmpl.neutral;

    return {
      house:  houseIndex,
      label:  tmpl.label,
      signA,  signB,
      elemA,  elemB,
      tone,   score,
      text:   interpolate(rawText, vars),
    };
  });
}
```

**Step 4: Run test — verify PASS**
```bash
node --test test/house-comparison.test.js
```
Expected: 4 pass, 0 fail

**Step 5: Commit**
```bash
git add public/src/synastry/house-comparison.js test/house-comparison.test.js
git commit -m "feat: house comparison renderer with domain-filtered house lists"
```

---

## Task 4 — Wu-Xing Element Bar Component

**Files:**
- Create: `public/src/components/WuxingBar.js`

Kein Unit-Test (pure DOM renderer) — wird visuell auf der love/career-Seite verifiziert.

```javascript
// public/src/components/WuxingBar.js
// Renders a horizontal Wu-Xing element distribution bar with optional comparison overlay
import { ELEMENT_COLORS } from '../data/astro-mappings.js';

const ELEMENTS = ['Holz','Feuer','Erde','Metall','Wasser'];

/**
 * @param {object} vector     — { Holz:0.25, Feuer:0.30, ... } person A
 * @param {object} [vectorB]  — optional, person B for overlay
 * @param {string} domain     — 'love' | 'career' | 'general'
 */
export function WuxingBar(vector, vectorB = null, domain = 'general') {
  const wrap = document.createElement('div');
  wrap.className = 'wuxing-bar-wrap';
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  for (const el of ELEMENTS) {
    const valA = vector?.[el] ?? 0;
    const valB = vectorB?.[el] ?? null;
    const color = ELEMENT_COLORS[el] ?? '#888';
    const pctA = Math.round(valA * 100);
    const pctB = valB !== null ? Math.round(valB * 100) : null;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';
    row.innerHTML = `
      <span style="width:60px;font-size:0.75rem;color:${color};font-weight:600;">${el}</span>
      <div style="flex:1;position:relative;height:10px;background:#1e1e1e;border-radius:5px;overflow:visible;">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctA}%;
          background:${color};border-radius:5px;transition:width 0.6s ease;"></div>
        ${pctB !== null ? `<div style="position:absolute;left:0;top:-3px;height:16px;width:2px;
          background:${color}88;border-radius:1px;margin-left:${pctB}%;transform:translateX(-50%);"></div>` : ''}
      </div>
      <span style="width:32px;text-align:right;font-size:0.75rem;color:${color}99;">${pctA}%</span>
    `;
    wrap.appendChild(row);
  }

  if (vectorB) {
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;gap:12px;font-size:0.65rem;color:#666;margin-top:2px;';
    legend.innerHTML = `<span>── Partner A (Balken)</span><span>│ Partner B (Marker)</span>`;
    wrap.appendChild(legend);
  }

  return wrap;
}
```

**Commit:**
```bash
git add public/src/components/WuxingBar.js
git commit -m "feat: WuxingBar component — single and dual-profile element visualization"
```

---

## Task 5 — Dynastische Resonanz Block

**Files:**
- Create: `public/src/synastry/dynasty-resonance.js`
- Test: `test/dynasty-resonance.test.js`

**Step 1: Write failing test**

```javascript
// test/dynasty-resonance.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildDynastyResonance } from '../public/src/synastry/dynasty-resonance.js';

test('buildDynastyResonance extracts year pillars from both profiles', () => {
  const pA = { bazi: { pillars: { year: { stem:'甲', element:'Holz', branch:'辰' } } } };
  const pB = { bazi: { pillars: { year: { stem:'丙', element:'Feuer', branch:'卯' } } } };
  const result = buildDynastyResonance(pA, pB);
  assert.equal(result.yearA.element, 'Holz');
  assert.equal(result.yearB.element, 'Feuer');
  assert.ok(typeof result.tone === 'string');
  assert.ok(typeof result.text === 'string' && result.text.length > 0);
  assert.ok(typeof result.score === 'number');
});

test('buildDynastyResonance handles missing pillars gracefully', () => {
  const empty = { bazi: { pillars: { year: {} } } };
  assert.doesNotThrow(() => buildDynastyResonance(empty, empty));
  const result = buildDynastyResonance(empty, empty);
  assert.ok(typeof result.text === 'string');
});
```

**Step 2: Run test — verify FAIL**
```bash
node --test test/dynasty-resonance.test.js
```

**Step 3: Implement**

```javascript
// public/src/synastry/dynasty-resonance.js
import { elementPairTone, ELEMENT_QUALITIES } from '../data/astro-mappings.js';

const DYNASTY_TEXTS = {
  '✨':  (elA, elB) =>
    `${elA} nährt ${elB} — eure Herkunftsenergien fließen in dieselbe Richtung. Was ihr von zuhause mitgebracht habt, ergänzt sich, anstatt zu konkurrieren.`,
  '⚡+': (elA, elB) =>
    `Beide kommt ihr aus einem ${elA}-geprägten Erbe. Das gibt euch viel gemeinsame Energie — und auch die gleichen blinden Flecken. Bewusst eingesetzt ist das eine starke Kraft.`,
  '⚡':  (elA, elB) =>
    `${elA} und ${elB} aus euren Dynastien erzeugen Spannung. Das bedeutet: ihr habt unterschiedliche Prägungen mitgebracht. Diese Differenz ist kein Fehler — sie ist euer Entwicklungsraum.`,
  '〰':  (elA, elB) =>
    `${elA} und ${elB} — eure familiären Hintergründe laufen ruhig nebeneinander. Kein starker Zug, kein starker Widerstand.`,
  '〰+': (elA, elB) =>
    `Ähnliche Dynastieenergie (${elA}/${elB}) — ihr versteht eure jeweiligen Herkunftsgeschichten oft ohne viele Worte.`,
};

export function buildDynastyResonance(profileA, profileB) {
  const yearA = profileA.bazi?.pillars?.year ?? {};
  const yearB = profileB.bazi?.pillars?.year ?? {};
  const elA = yearA.element ?? null;
  const elB = yearB.element ?? null;

  const { tone, score } = (elA && elB) ? elementPairTone(elA, elB) : { tone:'〰', score:0.5 };

  const textFn = DYNASTY_TEXTS[tone] ?? ((a,b) => `${a} trifft ${b} im Dynastieraum.`);
  const text = textFn(elA ?? '?', elB ?? '?');

  return { yearA, yearB, elA, elB, tone, score, text };
}
```

**Step 4: Run test — verify PASS**
```bash
node --test test/dynasty-resonance.test.js
```

**Step 5: Full suite**
```bash
node --test
```

**Step 6: Commit**
```bash
git add public/src/synastry/dynasty-resonance.js test/dynasty-resonance.test.js
git commit -m "feat: dynasty resonance block — year-pillar pair interpretation"
```

---

## Task 6 — Heatmap Overview Component

**Files:**
- Create: `public/src/synastry/HeatmapOverview.js`

```javascript
// public/src/synastry/HeatmapOverview.js
// Renders the 6-domain pair heatmap from computeDomainScores() output

const DOMAIN_META = {
  love:          { icon:'❤', label:'Liebe & Intimität',       detail:'/love' },
  communication: { icon:'💬', label:'Kommunikation',           detail:'/personality' },
  finance:       { icon:'💰', label:'Finanzen & Sicherheit',   detail:'/career-finance' },
  career:        { icon:'🏗', label:'Karriere & Energie',      detail:'/career-finance' },
  growth:        { icon:'🌱', label:'Wachstum & Potenzial',    detail:'/personality' },
  foundation:    { icon:'🏠', label:'Fundament & Familie',     detail:'/love' },
};

/**
 * @param {object} scores — output of computeDomainScores()
 * @param {Function} [onDomainClick] — called with domain key on row click
 */
export function HeatmapOverview(scores, onDomainClick = null) {
  const wrap = document.createElement('div');
  wrap.className = 'heatmap-overview';
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:0;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;';

  const header = document.createElement('div');
  header.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;padding:8px 16px;background:#111;font-size:0.65rem;color:#555;letter-spacing:0.08em;text-transform:uppercase;';
  header.innerHTML = '<span>Domain</span><span style="text-align:center">Harmonie</span><span style="text-align:center">Reibung / Potenzial</span>';
  wrap.appendChild(header);

  for (const [key, meta] of Object.entries(DOMAIN_META)) {
    const s = scores?.[key] ?? { harmony:50, tension:50 };
    const row = document.createElement('div');
    row.style.cssText = `display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;
      padding:12px 16px;border-top:1px solid #1c1c1c;cursor:${onDomainClick ? 'pointer' : 'default'};
      transition:background 0.15s;`;

    // Highlight high-tension rows
    if (s.tension > 55) row.style.background = '#1a1008';

    row.addEventListener('mouseenter', () => row.style.background = '#1e1e1e');
    row.addEventListener('mouseleave', () => row.style.background = s.tension > 55 ? '#1a1008' : '');
    if (onDomainClick) row.addEventListener('click', () => onDomainClick(key, meta.detail));

    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px;font-size:0.875rem;color:#e5e5e5;">
        <span>${meta.icon}</span>
        <span>${meta.label}</span>
        ${onDomainClick ? '<span style="color:#444;font-size:0.7rem;">→</span>' : ''}
      </span>
      <div style="padding:0 8px;">
        <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;">
          <div style="height:100%;width:${s.harmony}%;background:#22c55e;border-radius:4px;transition:width 0.8s ease;"></div>
        </div>
        <span style="font-size:0.7rem;color:#22c55e99;">${s.harmony}%</span>
      </div>
      <div style="padding:0 8px;">
        <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;">
          <div style="height:100%;width:${s.tension}%;background:#f59e0b;border-radius:4px;transition:width 0.8s ease;"></div>
        </div>
        <span style="font-size:0.7rem;color:#f59e0b99;">${s.tension}%</span>
      </div>
    `;
    wrap.appendChild(row);
  }

  return wrap;
}
```

**Commit:**
```bash
git add public/src/synastry/HeatmapOverview.js
git commit -m "feat: HeatmapOverview component — 6-domain pair orientation grid"
```

---

## Task 7 — `/love.html` mit Fusion-Layer

**Files:**
- Create: `public/love.html`

Diese Seite zeigt für Person A (und optional Person B) das Liebeshoroskop mit:
1. Primärfaktoren (Venus, Mond, Mars, Haus 5/7) aus `/calculate/western`
2. Fusion-Layer (Wu-Xing-Balken, Day-Master-Archetyp, Kohärenz-Brücke) aus `/calculate/fusion` + `/calculate/bazi`
3. Haus-Gegenüberstellung (Häuser 1,4,5,7,8) wenn Person B vorhanden

**Step 1: Create the file**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liebeshoroskop — Azodiac</title>
  <link rel="stylesheet" href="/src/styles/base.css">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen">
  <div id="app" class="max-w-2xl mx-auto px-4 py-8">
    <!-- Header -->
    <nav class="flex items-center justify-between mb-8">
      <a href="/" class="text-zinc-500 hover:text-zinc-300 text-sm">← Zurück</a>
      <span class="text-xs text-zinc-600 font-mono">LIEBESHOROSKOP</span>
    </nav>

    <!-- Profile indicator -->
    <div id="profile-status" class="mb-6 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-400">
      Lade Profildaten…
    </div>

    <!-- Primary Factors Section -->
    <section id="primary-factors" class="mb-8 hidden">
      <h2 class="text-xs font-mono text-amber-500 uppercase tracking-widest mb-4">Deine Liebesfaktoren</h2>
      <div id="primary-factors-grid" class="grid gap-3"></div>
    </section>

    <!-- Fusion Layer -->
    <section id="fusion-layer" class="mb-8 hidden">
      <h2 class="text-xs font-mono text-violet-400 uppercase tracking-widest mb-4">Fusion-Deutung</h2>

      <!-- Wu-Xing Element Bar -->
      <div class="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <p class="text-xs text-zinc-500 mb-3 font-mono">ELEMENT-RESONANZ — Quelle: /calculate/fusion</p>
        <div id="wuxing-bar-container"></div>
        <p id="element-dominant-text" class="mt-3 text-sm text-zinc-300 leading-relaxed"></p>
      </div>

      <!-- Day Master Archetyp -->
      <div class="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <p class="text-xs text-zinc-500 mb-2 font-mono">DAY-MASTER-ARCHETYP — Quelle: /calculate/bazi</p>
        <div id="day-master-love" class="text-zinc-200 text-sm leading-relaxed"></div>
      </div>

      <!-- Kohärenz-Brücke -->
      <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <p class="text-xs text-zinc-500 mb-2 font-mono">KOHÄRENZ-BRÜCKE — Quelle: /calculate/fusion</p>
        <div id="coherence-bridge" class="text-zinc-200 text-sm leading-relaxed"></div>
        <div id="coherence-bar-container" class="mt-3"></div>
      </div>
    </section>

    <!-- Partner B Toggle -->
    <section class="mb-8">
      <div id="partner-b-toggle" class="p-4 rounded-xl border border-dashed border-zinc-700 text-center cursor-pointer hover:border-zinc-500 transition-colors">
        <span class="text-zinc-500 text-sm">+ Partner B hinzufügen für Haus-Vergleich</span>
      </div>
      <div id="partner-b-form" class="hidden mt-4">
        <!-- Partner B input — reuses same form pattern as index.html -->
        <div class="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <p class="text-xs text-zinc-500 font-mono mb-3">PARTNER B GEBURTSDATEN</p>
          <div class="grid gap-3">
            <input id="b-date" type="date" class="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 w-full">
            <input id="b-time" type="time" class="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 w-full">
            <input id="b-place" type="text" placeholder="Geburtsort" class="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 w-full">
            <button id="b-calculate" class="bg-amber-500 text-zinc-950 font-bold rounded-lg py-2 text-sm hover:bg-amber-400 transition-colors">
              Partner B berechnen
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- House Comparison (shows when Partner B present) -->
    <section id="house-comparison" class="hidden mb-8">
      <h2 class="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-4">Eure Häuser im Vergleich</h2>
      <div id="house-comparison-grid" class="flex flex-col gap-4"></div>
    </section>

    <!-- Error state -->
    <div id="error-state" class="hidden p-4 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm"></div>
  </div>

  <script type="module">
    import { calculateProfile, geocodePlace } from '/src/api/client.js';
    import { WuxingBar } from '/src/components/WuxingBar.js';
    import { ConfidenceBar, SourceBadge } from '/src/components/ConfidenceBar.js';
    import { buildHouseComparisons, DOMAIN_HOUSES } from '/src/synastry/house-comparison.js';

    // ── Day-Master love archetypes (10 stems) ──────────────────────────────
    const DAY_MASTER_LOVE = {
      '甲': 'Yang Holz — Du liebst mit Aufbruch und Wachstum. Wer an deiner Seite ist, muss dir Raum lassen — und bekommt dafür einen Partner, der aufblüht.',
      '乙': 'Yin Holz — Deine Liebe rankt sich behutsam um wen, dem du vertraust. Du gibst viel, wenn du dich sicher fühlst.',
      '丙': 'Yang Feuer — Leidenschaft, Direktheit, Wärme. Du entzündest, was dich berührt — und willst gesehen werden.',
      '丁': 'Yin Feuer — Die stille Flamme. Du liebst tief und konstant, weniger laut. Wer deine Temperatur kennt, kommt nie mehr in die Kälte.',
      '戊': 'Yang Erde — Du bist das Fundament. Verlässlich, geduldig, stabil. Deine Liebe ist ein Ort, kein Ereignis.',
      '己': 'Yin Erde — Fürsorge mit Tiefgang. Du nährst, was dir wichtig ist — und weißt genau, was du brauchst, auch wenn du es selten sagst.',
      '庚': 'Yang Metall — Klarheit und Anspruch. Du liebst präzise, erwartest Aufrichtigkeit — und gibst sie auch.',
      '辛': 'Yin Metall — Feine Wahrnehmung, hohe Sensibilität. Deine Liebe ist selektiv und tief zugleich.',
      '壬': 'Yang Wasser — Fluss und Tiefe. Du verbindest dich leicht, aber vollständige Intimität braucht Zeit und Vertrauen.',
      '癸': 'Yin Wasser — Der stille Tieftaucher. Du liebst in Resonanz, nicht in Projektion. Wer dich wirklich kennt, wird von dir treu begleitet.',
    };

    // ── Coherence bridge texts ─────────────────────────────────────────────
    function coherenceText(index) {
      if (index === null) return 'Kohärenzwert nicht verfügbar.';
      if (index >= 0.75) return `Dein Kohärenzwert (${Math.round(index*100)}%) zeigt: Dein westliches und dein BaZi-Profil sprechen in der Liebe dieselbe Sprache. Was du dir wünschst und wer du bist, stimmen überein.`;
      if (index >= 0.50) return `Dein Kohärenzwert (${Math.round(index*100)}%) zeigt eine leichte innere Spannung — dein westliches und BaZi-Liebesmuster sind nicht deckungsgleich. Das macht dich interessant und schwer vorherzusagen.`;
      return `Dein Kohärenzwert (${Math.round(index*100)}%) zeigt schöpferische Spannung: dein westliches Liebes-Profil und dein BaZi-Muster ziehen in verschiedene Richtungen. Das ist kein Fehler — es ist deine Komplexität.`;
    }

    // ── Dominant element love text ─────────────────────────────────────────
    function dominantElementText(vector, domain = 'love') {
      if (!vector) return '';
      const QUALITIES = {
        Holz:'Wachstum, Aufbruch, Idealismus', Feuer:'Leidenschaft, Spontanität, Direktheit',
        Erde:'Verlässlichkeit, Sinnlichkeit, Beständigkeit', Metall:'Klarheit, Anspruch, Präzision',
        Wasser:'Tiefe, Intuition, Empathie',
      };
      const dominant = Object.entries(vector).sort((a,b) => b[1]-a[1])[0];
      if (!dominant) return '';
      const [el, val] = dominant;
      return `Dein dominantes Liebeselement ist <strong>${el}</strong> (${Math.round(val*100)}%) — ${QUALITIES[el] ?? el}.`;
    }

    // ── Render primary factors ─────────────────────────────────────────────
    function renderPrimaryFactor(label, value, source) {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#111;border-radius:8px;border:1px solid #222;';
      div.innerHTML = `<span style="font-size:0.875rem;color:#d4d4d4;">${label}</span>
        <span style="font-size:0.875rem;color:#fbbf24;font-weight:600;">${value ?? '—'}</span>`;
      return div;
    }

    // ── House comparison row ───────────────────────────────────────────────
    function renderHouseEntry(entry) {
      const div = document.createElement('div');
      div.style.cssText = 'padding:14px;background:#0d1117;border-radius:10px;border:1px solid #1e2738;';
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:0.75rem;font-family:monospace;color:#60a5fa;">${entry.house}. Haus — ${entry.label}</span>
          <span style="font-size:1rem;">${entry.tone}</span>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <span style="flex:1;text-align:center;padding:4px 8px;background:#1a1a1a;border-radius:4px;font-size:0.8rem;color:#e5e5e5;">A: <strong>${entry.signA}</strong> (${entry.elemA})</span>
          <span style="flex:1;text-align:center;padding:4px 8px;background:#1a1a1a;border-radius:4px;font-size:0.8rem;color:#e5e5e5;">B: <strong>${entry.signB}</strong> (${entry.elemB})</span>
        </div>
        <p style="font-size:0.8rem;color:#a3a3a3;line-height:1.5;margin:0;">${entry.text}</p>
      `;
      return div;
    }

    // ── Main ───────────────────────────────────────────────────────────────
    const stored = sessionStorage.getItem('azodiac_profile_a');
    if (!stored) {
      document.getElementById('profile-status').textContent = 'Kein Profil gefunden. Bitte zuerst auf der Startseite berechnen.';
    } else {
      const profile = JSON.parse(stored);
      document.getElementById('profile-status').textContent =
        `Profil geladen — ${profile._meta?.input?.date ?? ''}`;

      // Primary factors
      const pf = document.getElementById('primary-factors-grid');
      const w = profile.western?.bodies ?? {};
      const b = profile.bazi ?? {};
      [
        ['Venus', w.Venus?.sign ? `${w.Venus.sign} (Haus ${w.Venus.house??'?'})` : null, 'api'],
        ['Mond',  w.Moon?.sign  ? `${w.Moon.sign} (Haus ${w.Moon.house??'?'})` : null,  'api'],
        ['Mars',  w.Mars?.sign  ? `${w.Mars.sign} (Haus ${w.Mars.house??'?'})` : null,  'api'],
        ['5. Haus (Ausdruck)', profile.western?.houses?.[5]?.sign ?? null, 'api'],
        ['7. Haus (Partner)', profile.western?.houses?.[7]?.sign ?? null, 'api'],
        ['Day-Master', b.day_master?.stem ? `${b.day_master.stem} (${b.day_master.element})` : null, 'api'],
      ].forEach(([label, val, src]) => pf.appendChild(renderPrimaryFactor(label, val, src)));
      document.getElementById('primary-factors').classList.remove('hidden');

      // Fusion layer — Wu-Xing
      const fusionVec = profile.fusion?.wu_xing_vectors?.bazi_pillars;
      if (fusionVec) {
        document.getElementById('wuxing-bar-container').appendChild(WuxingBar(fusionVec));
        document.getElementById('element-dominant-text').innerHTML = dominantElementText(fusionVec, 'love');
      }

      // Day Master Archetyp
      const stem = b.day_master?.stem;
      document.getElementById('day-master-love').innerHTML =
        DAY_MASTER_LOVE[stem] ?? `Day-Master ${stem ?? 'unbekannt'} — Archetyp folgt.`;

      // Kohärenz-Brücke
      const ci = profile.fusion?.coherence_index;
      document.getElementById('coherence-bridge').innerHTML = coherenceText(ci);
      if (ci !== null && ci !== undefined) {
        const { ConfidenceBar } = await import('/src/components/ConfidenceBar.js');
        document.getElementById('coherence-bar-container')
          .appendChild(ConfidenceBar(ci, { label:'Kohärenz (West ↔ BaZi)' }));
      }
      document.getElementById('fusion-layer').classList.remove('hidden');

      // Partner B toggle
      document.getElementById('partner-b-toggle').addEventListener('click', () => {
        document.getElementById('partner-b-form').classList.toggle('hidden');
      });

      document.getElementById('b-calculate').addEventListener('click', async () => {
        const date = document.getElementById('b-date').value;
        const time = document.getElementById('b-time').value;
        const place = document.getElementById('b-place').value;
        if (!date || !place) return;

        const geo = await geocodePlace(place);
        if (!geo.ok) { alert('Ort nicht gefunden'); return; }
        const { lat, lon, timezone } = geo.data;

        const result = await calculateProfile({ date, time, lat, lon, tz: timezone });
        if (!result.ok) { alert('Berechnung fehlgeschlagen'); return; }

        sessionStorage.setItem('azodiac_profile_b', JSON.stringify(result.data));

        // Render house comparison
        const profileB = result.data;
        const entries = buildHouseComparisons(profile, profileB, DOMAIN_HOUSES.love);
        const grid = document.getElementById('house-comparison-grid');
        grid.innerHTML = '';
        entries.forEach(e => grid.appendChild(renderHouseEntry(e)));
        document.getElementById('house-comparison').classList.remove('hidden');

        // Update wuxing bar with B overlay
        const vecB = profileB.fusion?.wu_xing_vectors?.bazi_pillars;
        if (fusionVec && vecB) {
          document.getElementById('wuxing-bar-container').innerHTML = '';
          document.getElementById('wuxing-bar-container').appendChild(WuxingBar(fusionVec, vecB, 'love'));
        }
      });
    }
  </script>
</body>
</html>
```

**Verify:** open browser at `http://localhost:3000/love.html` after `npm start`.
- Without stored profile → shows "Kein Profil gefunden" message
- With stored profile → shows Venus/Moon/Mars/Houses, Wu-Xing bar, Day-Master text, coherence bridge
- After Partner B input → Haus-Gegenüberstellung appears

**Commit:**
```bash
git add public/love.html
git commit -m "feat: /love page — primary factors + fusion layer + partner B house comparison"
```

---

## Task 8 — `/career-finance.html` mit Fusion-Layer

Folgt demselben Muster wie Task 7. Unterschiede:

- **Primärfaktoren:** MC, Häuser 2/6/8/10, Monats-Pillar, Jahres-Pillar
- **Fusion-Layer:** `wuxing_vectors` mit karriere-Qualitäten, Day-Master-Karriere-Archetyp, Kohärenz-Brücke für Karriere
- **Haus-Gegenüberstellung:** `DOMAIN_HOUSES['career-finance']` = [2,6,8,10]

Day-Master Karriere-Archetypen (10 Stämme) — analog zu Task 7, career-Domain:
```javascript
const DAY_MASTER_CAREER = {
  '甲': 'Yang Holz — Du bist Stratege und Visionär. Freiraum ist keine Bitte, sondern Voraussetzung.',
  '乙': 'Yin Holz — Du wächst in Netzwerken. Kollaboration ist deine natürliche Arbeitsform.',
  '丙': 'Yang Feuer — Sichtbarkeit, Führung, Energie. Du motivierst durch Präsenz.',
  '丁': 'Yin Feuer — Tiefe Konzentration, hohe Qualität. Deine besten Leistungen entstehen im Fokus.',
  '戊': 'Yang Erde — Aufbau, Verlässlichkeit, Struktur. Du bist das Rückgrat von Teams.',
  '己': 'Yin Erde — Fürsorge als Beruf. Nachhaltige Wirkung über Zeit statt schnellen Ruhm.',
  '庚': 'Yang Metall — Präzision und Klarheit. Du setzt Standards — und hältst sie ein.',
  '辛': 'Yin Metall — Ästhetisches Urteilsvermögen, hoher Anspruch. Deine Qualität spricht für sich.',
  '壬': 'Yang Wasser — Anpassung und Kommunikation. Du findest in jedem Umfeld einen Weg.',
  '癸': 'Yin Wasser — Intuition und Tiefgang. Deine stärksten Entscheidungen kommen aus dem Innern.',
};
```

**Commit:**
```bash
git add public/career-finance.html
git commit -m "feat: /career-finance page — MC/houses + fusion layer + partner B house comparison"
```

---

## Task 9 — `/synastry.html` — Vollintegration

**Files:**
- Create: `public/synastry.html`

Diese Seite ist der Hub. Sie braucht **beide Profile** von Beginn an.

Flow:
1. Wenn beide Profile in `sessionStorage` → sofort Heatmap + alle Sektionen rendern
2. Wenn nur A → zweite Eingabe anzeigen
3. Wenn keines → Redirect zu `/`

Enthält: Heatmap-Overview → Dynastische Resonanz → Vollständige Haus-Gegenüberstellung (alle 12) → Link zu /love und /career-finance für Tiefe

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synastrie — Azodiac</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen">
  <div id="app" class="max-w-2xl mx-auto px-4 py-8">
    <nav class="flex items-center justify-between mb-8">
      <a href="/" class="text-zinc-500 hover:text-zinc-300 text-sm">← Zurück</a>
      <span class="text-xs text-zinc-600 font-mono">SYNASTRIE</span>
    </nav>

    <div id="loading" class="text-zinc-500 text-sm">Lade Profile…</div>

    <!-- Heatmap Overview — appears first (C-Einfluss) -->
    <section id="heatmap-section" class="hidden mb-10">
      <h2 class="text-xs font-mono text-amber-500 uppercase tracking-widest mb-4">Eure Dynamik auf einen Blick</h2>
      <div id="heatmap-container"></div>
      <p class="text-xs text-zinc-600 mt-3 font-mono">Quelle: /api/azodiac/profile × 2 — alle Werte aus echten API-Daten</p>
    </section>

    <!-- Dynastische Resonanz -->
    <section id="dynasty-section" class="hidden mb-10">
      <h2 class="text-xs font-mono text-violet-400 uppercase tracking-widest mb-4">Dynastische Resonanz — Jahr-Pillar Paar</h2>
      <div id="dynasty-container" class="p-5 bg-zinc-900 rounded-xl border border-zinc-800"></div>
    </section>

    <!-- Vollständige Haus-Gegenüberstellung -->
    <section id="houses-section" class="hidden mb-10">
      <h2 class="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-4">Alle Häuser im Vergleich</h2>
      <p class="text-xs text-zinc-600 mb-4 font-mono">Quelle: western.houses aus /calculate/western (via profile)</p>
      <div id="houses-container" class="flex flex-col gap-4"></div>
    </section>

    <!-- Deep-links to domain pages -->
    <section id="deep-links" class="hidden mb-10">
      <h2 class="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Tiefere Einblicke</h2>
      <div class="grid grid-cols-2 gap-3">
        <a href="/love.html" class="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors text-center">
          <div class="text-2xl mb-1">❤</div>
          <div class="text-sm text-zinc-300">Liebeshoroskop</div>
        </a>
        <a href="/career-finance.html" class="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors text-center">
          <div class="text-2xl mb-1">💰</div>
          <div class="text-sm text-zinc-300">Karriere & Finanzen</div>
        </a>
      </div>
    </section>

    <div id="error-state" class="hidden p-4 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm"></div>
  </div>

  <script type="module">
    import { computeDomainScores } from '/src/synastry/domain-score.js';
    import { buildHouseComparisons, DOMAIN_HOUSES } from '/src/synastry/house-comparison.js';
    import { buildDynastyResonance } from '/src/synastry/dynasty-resonance.js';
    import { HeatmapOverview } from '/src/synastry/HeatmapOverview.js';
    import { ELEMENT_COLORS } from '/src/data/astro-mappings.js';

    const storedA = sessionStorage.getItem('azodiac_profile_a');
    const storedB = sessionStorage.getItem('azodiac_profile_b');

    if (!storedA) {
      document.getElementById('loading').textContent = 'Kein Profil A gefunden. Bitte auf der Startseite beginnen.';
    } else if (!storedB) {
      document.getElementById('loading').innerHTML =
        'Profil A geladen. Bitte <a href="/love.html" style="color:#60a5fa">auf der Liebes-Seite</a> Partner B hinzufügen.';
    } else {
      document.getElementById('loading').classList.add('hidden');
      const profileA = JSON.parse(storedA);
      const profileB = JSON.parse(storedB);

      // Heatmap
      const scores = computeDomainScores(profileA, profileB);
      const heatmap = HeatmapOverview(scores, (key, path) => { window.location.href = path; });
      document.getElementById('heatmap-container').appendChild(heatmap);
      document.getElementById('heatmap-section').classList.remove('hidden');

      // Dynasty Resonanz
      const dynasty = buildDynastyResonance(profileA, profileB);
      const dc = document.getElementById('dynasty-container');
      const elColorA = ELEMENT_COLORS[dynasty.elA] ?? '#888';
      const elColorB = ELEMENT_COLORS[dynasty.elB] ?? '#888';
      dc.innerHTML = `
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <div style="flex:1;padding:10px;background:#111;border-radius:8px;border:1px solid #222;text-align:center;">
            <p style="font-size:0.65rem;color:#666;font-family:monospace;margin-bottom:4px;">PARTNER A — JAHR-PILLAR</p>
            <p style="font-size:1.4rem;font-weight:bold;color:${elColorA};">${dynasty.yearA.stem ?? '?'}</p>
            <p style="font-size:0.75rem;color:${elColorA}88;">${dynasty.elA ?? '?'} · ${dynasty.yearA.branch ?? '?'}</p>
          </div>
          <div style="flex:1;padding:10px;background:#111;border-radius:8px;border:1px solid #222;text-align:center;">
            <p style="font-size:0.65rem;color:#666;font-family:monospace;margin-bottom:4px;">PARTNER B — JAHR-PILLAR</p>
            <p style="font-size:1.4rem;font-weight:bold;color:${elColorB};">${dynasty.yearB.stem ?? '?'}</p>
            <p style="font-size:0.75rem;color:${elColorB}88;">${dynasty.elB ?? '?'} · ${dynasty.yearB.branch ?? '?'}</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:1.2rem;">${dynasty.tone}</span>
          <span style="font-size:0.75rem;color:#666;font-family:monospace;">DYNASTISCHE RESONANZ</span>
        </div>
        <p style="font-size:0.875rem;color:#d4d4d4;line-height:1.6;">${dynasty.text}</p>
      `;
      document.getElementById('dynasty-section').classList.remove('hidden');

      // Alle 12 Häuser
      const entries = buildHouseComparisons(profileA, profileB, DOMAIN_HOUSES.synastry);
      const hc = document.getElementById('houses-container');
      entries.forEach(e => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:14px;background:#0d1117;border-radius:10px;border:1px solid #1e2738;';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:0.75rem;font-family:monospace;color:#60a5fa;">${e.house}. Haus — ${e.label}</span>
            <span style="font-size:1rem;">${e.tone}</span>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <span style="flex:1;text-align:center;padding:4px;background:#111;border-radius:4px;font-size:0.75rem;">A: ${e.signA} (${e.elemA})</span>
            <span style="flex:1;text-align:center;padding:4px;background:#111;border-radius:4px;font-size:0.75rem;">B: ${e.signB} (${e.elemB})</span>
          </div>
          <p style="font-size:0.8rem;color:#a3a3a3;line-height:1.5;margin:0;">${e.text}</p>
        `;
        hc.appendChild(div);
      });
      document.getElementById('houses-section').classList.remove('hidden');
      document.getElementById('deep-links').classList.remove('hidden');
    }
  </script>
</body>
</html>
```

**Verify:** `http://localhost:3000/synastry.html`
- No profiles → guidance message
- Profile A only → prompt to add B
- Both profiles → full render: heatmap → dynasty → 12 houses → deep links

**Commit:**
```bash
git add public/synastry.html
git commit -m "feat: /synastry page — heatmap overview + dynasty resonance + all-12-house comparison"
```

---

## Task 10 — Navigation + Profile Persistence

**Files:**
- Modify: `public/index.html` — add nav links after profile calculation
- Modify: `public/src/api/client.js` — ensure profile is stored in sessionStorage after `/api/azodiac/profile`

**Step 1: In `index.html`, after successful profile calculation, store and show nav:**

```javascript
// In existing profile calculation success handler:
sessionStorage.setItem('azodiac_profile_a', JSON.stringify(result.data));

// Show navigation to domain pages
const nav = document.getElementById('domain-nav');
if (nav) nav.classList.remove('hidden');
```

**Step 2: Add `domain-nav` div to `index.html` after results section:**

```html
<div id="domain-nav" class="hidden mt-6 grid grid-cols-3 gap-3">
  <a href="/love.html" class="p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 text-center text-sm text-zinc-300">❤ Liebe</a>
  <a href="/career-finance.html" class="p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 text-center text-sm text-zinc-300">💰 Karriere</a>
  <a href="/synastry.html" class="p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 text-center text-sm text-zinc-300">🔗 Synastrie</a>
</div>
```

**Commit:**
```bash
git add public/index.html
git commit -m "feat: navigation to domain pages after profile calculation"
```

---

## Task 11 — Final Verification

```bash
# Full test suite
node --test
# Expected: all pass, 0 fail

# Start dev server
npm start

# Manual checks:
# 1. / → enter profile → nav appears → sessionStorage has 'azodiac_profile_a'
# 2. /love.html → primary factors, Wu-Xing bar, Day-Master text, Kohärenz
# 3. /love.html → enter Partner B → Haus-Gegenüberstellung appears (Häuser 1,4,5,7,8)
# 4. /synastry.html → with both profiles → Heatmap → Dynasty → 12 Häuser
# 5. No 'undefined' or 'null' strings visible in UI
# 6. All scores traceable to named source fields
```

**Commit:**
```bash
git add docs/plans/2026-05-17-synastry-fusion-heatmap.md
git commit -m "docs: synastry+fusion implementation plan 2026-05-17"
```

---

## Extension G (later sprint): Synastry Aspects via `/api/azodiac/synastry`

When Extension G is implemented (new backend orchestrator endpoint), the domain scores can be enriched with real cross-chart aspects. Until then, all scores are derived from element-pair harmonies and house comparisons — fully traceable, no fake data.
