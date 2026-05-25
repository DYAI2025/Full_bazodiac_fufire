# UI-Verbesserungen: Tierzeichen, Häuser, Transit, Synastrie

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vier konkrete UI-Mängel beheben, die Ben nach dem Fusion-Endpoint-Sprint identifiziert hat.

**Architecture:** Nur Frontend (public/) — kein server.js touch. CSS-Erweiterung in main.css + JS-Fixes in baziRenderer.js, OverviewPage.js, TransitCalendarPage.js, DashboardPage.js.

**Tech Stack:** Vanilla ES-Modules, kein Build-Step, CSS Custom Properties, SVG-Gauge existiert bereits.

---

## Ist-Analyse

| Bereich | Status | Problem |
|---|---|---|
| BaZi Tierzeichen | Code korrekt (`BRANCH_ANIMAL` mapping) | `.pillar-animal` rendert leer oder zu klein — nicht sichtbar |
| `藏干`-Label | Chinesisch | User versteht den Begriff nicht |
| Häuser Elementfarbe | Nur `border-left: 3px` | Zu subtil, kein Background-Tint |
| Kontextueller Haustext | Existiert (SIGN_HOUSE_CONTEXT) | Unter `<details>` versteckt, nicht prominent |
| Transit: individuelle Erklärung | Tooltip vorhanden | Natal-Aspekt-Kontext zu knapp, kein eigener Abschnitt |
| Dashboard Extension-G-Note | Veraltet | Endpoint ist jetzt aktiv (Task 2+3 dieser Session) |

---

## Task A: BaZi Pillars — Tierzeichen sichtbar + Verborgene Stämme erklären

**Files:**
- Modify: `public/src/domain/baziRenderer.js`
- Modify: `public/src/styles/main.css`

### Step A-1: Read baziRenderer.js
```bash
head -200 public/src/domain/baziRenderer.js
```
Expected: file exists, ~201 lines

### Step A-2: Fix pillar-animal rendering

In `baziRenderer.js`, finde den Block `// ── Erdzweig + Tierzeichen ──`:

Das `.pillar-animal` wird als `animalSpan.textContent = branchInfo.animal || ''` gesetzt. Falls `branchInfo` leer ist (Lookup-Mismatch), bleibt es leer.

**Lösung:** Füge eine Fallback-Tabelle mit romanisierten Namen hinzu (für den Fall dass die API romanisierte statt chinesische Branch-Keys zurückgibt), UND mache das Tierzeichen deutlicher:

Nach `const BRANCH_ANIMAL = { ... };` (endet ca. Z.19) füge ein:

```js
// Fallback: romanisiert → Tierzeichen (wenn API romanisiert statt chinesisch liefert)
const BRANCH_ANIMAL_ROMANIZED = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};

function lookupBranch(branch) {
  if (!branch) return {};
  // Try direct Chinese char lookup first
  if (BRANCH_ANIMAL[branch]) return BRANCH_ANIMAL[branch];
  // Try romanized (case-insensitive, strip tones)
  const normalized = branch.toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, c => {
    const map = {ā:'a',á:'a',ǎ:'a',à:'a',ē:'e',é:'e',ě:'e',è:'e',ī:'i',í:'i',ǐ:'i',ì:'i',ō:'o',ó:'o',ǒ:'o',ò:'o',ū:'u',ú:'u',ǔ:'u',ù:'u',ǖ:'u',ǘ:'u',ǚ:'u',ǜ:'u'};
    return map[c] || c;
  });
  const chineseChar = BRANCH_ANIMAL_ROMANIZED[normalized];
  if (chineseChar && BRANCH_ANIMAL[chineseChar]) return BRANCH_ANIMAL[chineseChar];
  return {};
}
```

Dann ersetze alle Vorkommen von `BRANCH_ANIMAL[p.branch] || {}` mit `lookupBranch(p.branch)`.

### Step A-3: Verborgene-Stämme-Label auf Deutsch

Finde in `renderBaziPillars`:
```js
summaryText.textContent = `藏干 · ${stems.length > 0 ? stems.map(s => s.stem).join(' ') : 'Verborgene Stämme'}`;
```
Ersetze durch:
```js
summaryText.textContent = `Verborgene Stämme · ${stems.length > 0 ? stems.map(s => s.stem).join(' ') : ''}`;
```

### Step A-4: Verborgene Stämme — Erklärungstext vor der Liste

Im `renderBaziPillars`, direkt NACH `details.appendChild(summary)` und VOR der `hsList`-Erstellung, füge ein:

```js
    const hsExpl = document.createElement('p');
    hsExpl.className = 'hs-concept-expl';
    hsExpl.textContent = 'Jeder Erdzweig trägt verborgene Himmelsstämme in sich — unsichtbare Kräfte, die erst in bestimmten Lebensabschnitten oder Beziehungen aktiviert werden. Der Hauptstamm (ca. 60–70%) prägt den Charakter am stärksten; Mittel- und Residualstamm wirken subtil, aber messbar.';
    details.appendChild(hsExpl);
```

### Step A-5: CSS — Tierzeichen hervorheben

In `main.css`, finde `.pillar-animal { ... }` (ca. Z.479) und ersetze:
```css
.pillar-animal {
  font-size: .82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
  margin-top: 2px;
}
```
durch:
```css
.pillar-animal {
  font-size: .92rem;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.3;
  margin-top: 4px;
  letter-spacing: .02em;
}
```

Und füge nach `.pillar-animal-element { ... }` ein:
```css
.hs-concept-expl {
  font-size: .72rem;
  color: var(--muted);
  line-height: 1.55;
  padding: 6px 8px;
  margin-bottom: 8px;
  border-left: 2px solid var(--border);
  font-style: italic;
}
```

### Step A-6: Syntax-Check
```bash
cd /sessions/ecstatic-amazing-edison/mnt/codebase/Full_bazodiac_fufire-main
node --check public/src/domain/baziRenderer.js
```
Expected: no output (= OK)

### Step A-7: Commit
```bash
git add public/src/domain/baziRenderer.js public/src/styles/main.css
git commit -m "feat(bazi): Tierzeichen-Fallback, dt. Verborgene-Stämme-Label, Erklärungstext"
```

---

## Task B: Häuser — Elementfarben visuell stärker

**Files:**
- Modify: `public/src/styles/main.css`
- Modify: `public/src/pages/OverviewPage.js`

### Step B-1: CSS — Background-Tint + stärkere Borders

In `main.css`, finde den Block `/* Häuser-Element-Farbcodierung (Western Zodiac) */` (ca. Z.583):

```css
.house-card--feuer  { border-left: 3px solid #f87171; }
.house-card--wasser { border-left: 3px solid #60a5fa; }
.house-card--erde   { border-left: 3px solid #4ade80; }
.house-card--luft   { border-left: 3px solid #e2e8f0; }
```

Ersetze durch:
```css
.house-card--feuer  { border-left: 4px solid #f87171; background: rgba(248, 113, 113, 0.05); }
.house-card--wasser { border-left: 4px solid #60a5fa; background: rgba(96, 165, 250, 0.05); }
.house-card--erde   { border-left: 4px solid #4ade80; background: rgba(74, 222, 128, 0.05); }
.house-card--luft   { border-left: 4px solid #e2e8f0; background: rgba(226, 232, 240, 0.04); }

/* Haus-Nummer erhält Elementfarbe */
.house-card--feuer  .house-num { color: #f87171; }
.house-card--wasser .house-num { color: #60a5fa; }
.house-card--erde   .house-num { color: #4ade80; }
.house-card--luft   .house-num { color: #c8d3e0; }
```

### Step B-2: OverviewPage.js — Intro-Legende für Elementfarben hinzufügen

In `renderWesternHouses()`, direkt nach dem `intro`-Paragraph (Z.103):

```js
  // Element-Legende
  const legend = document.createElement('div');
  legend.className = 'houses-element-legend';
  legend.innerHTML = `
    <span class="hel-item hel-item--feuer">🔴 Feuer: Widder, Löwe, Schütze</span>
    <span class="hel-item hel-item--erde">🟢 Erde: Stier, Jungfrau, Steinbock</span>
    <span class="hel-item hel-item--luft">⚪ Luft: Zwillinge, Waage, Wassermann</span>
    <span class="hel-item hel-item--wasser">🔵 Wasser: Krebs, Skorpion, Fische</span>
  `;
  section.appendChild(legend);
```

### Step B-3: CSS für Legende
In `main.css` hinzufügen (nach den `.house-card--luft`-Regeln):

```css
.houses-element-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 16px;
  font-size: .72rem;
  color: var(--muted);
}
.hel-item { white-space: nowrap; }
```

### Step B-4: Haus-Kontextsatz sichtbarer machen

Im `renderWesternHouses`-Abschnitt "Individuelle Deutung (Zeichen in diesem Haus)" (ca. Z.193–202): Der Text ist aktuell in `<details>` versteckt. Mache ihn direkt im Card-Header sichtbar als Preview:

Nach dem `header.append(numBadge, titleSpan, signBadge)` Block (direkt unter den Planeten-Chips), füge hinzu:

```js
    // Quick context preview — visible without opening details
    if (sign) {
      const contextFn = SIGN_HOUSE_CONTEXT[sign];
      if (contextFn) {
        const preview = document.createElement('p');
        preview.className = 'house-card-preview';
        // First 80 chars of the contextual sentence as teaser
        const fullText = contextFn(info?.theme || `Haus ${i}`);
        preview.textContent = fullText.length > 90 ? fullText.slice(0, 88) + '…' : fullText;
        card.appendChild(preview);
      }
    }
```

CSS dazu:
```css
.house-card-preview {
  font-size: .75rem;
  color: var(--muted);
  line-height: 1.45;
  padding: 0 14px 10px 14px;
  margin: 0;
  border-top: 1px solid var(--border);
}
```

### Step B-5: Syntax-Check und Commit
```bash
cd /sessions/ecstatic-amazing-edison/mnt/codebase/Full_bazodiac_fufire-main
node --check public/src/pages/OverviewPage.js
git add public/src/pages/OverviewPage.js public/src/styles/main.css
git commit -m "feat(houses): Elementfarben Background-Tint, Legende, Kontext-Preview sichtbar"
```

---

## Task C: Transitkalender — Individuelle Konstellation stärker hervorheben

**Files:**
- Modify: `public/src/pages/TransitCalendarPage.js`
- Modify: `public/src/styles/main.css`

### Step C-1: Intro-Sektion mit persönlichem Kontext

In `renderNow()`, direkt nach `el.innerHTML = ...` und VOR dem `grid`-Aufbau:

Prüfe ob `profile?.western?.bodies` existiert und rendere einen personalisierten Kontext-Header:

```js
  // Personalisierter Kontext-Header
  if (profile?.western?.bodies) {
    const sun  = profile.western.bodies['Sun'];
    const moon = profile.western.bodies['Moon'];
    const asc  = profile.western?.ascendant;

    const SIGN_DE_NOW = {
      Aries:'Widder', Taurus:'Stier', Gemini:'Zwillinge', Cancer:'Krebs',
      Leo:'Löwe', Virgo:'Jungfrau', Libra:'Waage', Scorpio:'Skorpion',
      Sagittarius:'Schütze', Capricorn:'Steinbock', Aquarius:'Wassermann', Pisces:'Fische',
    };
    const sDE = s => s ? (SIGN_DE_NOW[s] || s) : null;

    const parts = [];
    if (sun?.sign)  parts.push(`Sonne im ${sDE(sun.sign)}`);
    if (moon?.sign) parts.push(`Mond im ${sDE(moon.sign)}`);
    if (asc)        parts.push(`Aszendent ${sDE(asc)}`);

    if (parts.length) {
      const ctxBar = document.createElement('div');
      ctxBar.className = 'transit-personal-ctx';
      ctxBar.innerHTML = `
        <span class="transit-ctx-label">Deine Konstellation:</span>
        <span class="transit-ctx-signs">${parts.join(' · ')}</span>
        <span class="transit-ctx-hint">— Die folgenden Transits zeigen, welche deiner Energie-Felder heute aktiviert werden.</span>
      `;
      el.insertBefore(ctxBar, el.querySelector('.transit-planets-grid'));
    }
  }
```

### Step C-2: Bessere Natal-Aspekt-Erklärung in den Planet-Cards

In `renderNow()`, ersetze die `card.innerHTML` (ca. Z.96–103):

```js
    const isRetro = p.speed < 0;
    const natalBodies = profile?.western?.bodies || {};
    const natalHits = findNatalAspects(p.longitude, natalBodies);
    
    // Build rich natal hit explanation
    let natalExpl = '';
    if (natalHits.length > 0) {
      const hit = natalHits[0];
      const PLANET_DE_NOW = { Sun:'Sonne', Moon:'Mond', Mercury:'Merkur', Venus:'Venus',
        Mars:'Mars', Jupiter:'Jupiter', Saturn:'Saturn', Uranus:'Uranus', Neptune:'Neptun', Pluto:'Pluto', 'North Node':'Mondknoten', Chiron:'Chiron' };
      natalExpl = `Aktiv bei deiner Natal-${PLANET_DE_NOW[hit.name] || hit.name} (${hit.orb}° Orb)`;
    }
    
    const context = TRANSIT_CONTEXT[name] || '';
    const tooltip = [context, natalExpl].filter(Boolean).join(' · ');

    card.setAttribute('title', tooltip);
    card.className = `transit-planet-card${natalHits.length > 0 ? ' transit-planet-card--active' : ''}`;
    card.innerHTML = `
      <span class="transit-planet-symbol">${PLANET_SYMBOLS[name] || name}</span>
      <span class="transit-planet-name">${PLANET_LABELS_DE[name] || name}</span>
      <span class="transit-planet-sign">${signDE(p.sign)}</span>
      ${isRetro ? '<span class="transit-retro">℞</span>' : ''}
      <span class="transit-planet-context">${esc(context)}</span>
      ${natalExpl ? `<span class="transit-natal-hit transit-natal-hit--highlight">${esc(natalExpl)}</span>` : ''}
    `;
```

### Step C-3: 7-Tage-Strip — Erklärungszeile pro Tag

In `renderTimeline()`, innerhalb des `days.forEach((day) => {` Blocks — nach `activePlanets` und vor `col.innerHTML`:

```js
    // Personal impact summary for this day
    const personalHits = activePlanets.filter(p => {
      const hits = findNatalAspects(
        Object.values(day.planets || {}).find((_, k) => k === p.name)?.longitude,
        natalBodies, 6
      );
      return hits.length > 0;
    });
    const impactText = activePlanets.length > 0
      ? `${activePlanets.map(p => `${PLANET_SYMBOLS[p.name] || p.name} im ${signDE(p.sign)}`).join(', ')}`
      : '';
```

Und erweitere das `col.innerHTML` um einen Impact-Tag:
Füge nach `<div class="transit-day-planets">...</div>` hinzu:
```html
<div class="transit-day-impact" title="${esc(impactText)}">${esc(impactText.slice(0, 35))}${impactText.length > 35 ? '…' : ''}</div>
```

### Step C-4: CSS für Transit-Verbesserungen

In `main.css` hinzufügen:

```css
/* Transit — persönlicher Kontext-Header */
.transit-personal-ctx {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: rgba(96, 165, 250, 0.06);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: var(--radius);
  font-size: .78rem;
  line-height: 1.5;
}
.transit-ctx-label { font-weight: 700; color: var(--accent); }
.transit-ctx-signs { color: var(--text); font-weight: 600; }
.transit-ctx-hint  { color: var(--muted); font-style: italic; }

/* Aktive Planet-Cards (nahe Natal-Planeten) */
.transit-planet-card--active {
  border-color: rgba(96, 165, 250, 0.4);
  background: rgba(96, 165, 250, 0.04);
}

/* Planet-Context-Zeile */
.transit-planet-context {
  font-size: .7rem;
  color: var(--muted);
  grid-column: 1 / -1;
  line-height: 1.4;
}

/* Natal-Hit hervorheben */
.transit-natal-hit--highlight {
  font-size: .72rem;
  color: #60a5fa;
  font-weight: 600;
  grid-column: 1 / -1;
}

/* Day-Strip Impact-Zeile */
.transit-day-impact {
  font-size: .65rem;
  color: var(--muted);
  padding: 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
```

### Step C-5: Syntax-Check und Commit
```bash
cd /sessions/ecstatic-amazing-edison/mnt/codebase/Full_bazodiac_fufire-main
node --check public/src/pages/TransitCalendarPage.js
git add public/src/pages/TransitCalendarPage.js public/src/styles/main.css
git commit -m "feat(transit): persönliche Konstellation-Kontext, Natal-Aspekt-Highlight, Day-Strip-Impact"
```

---

## Task D: Dashboard — Extension-G-Note aktualisieren

**Files:**
- Modify: `public/src/pages/DashboardPage.js`

### Step D-1: Read DashboardPage.js (den relevanten Bereich)

```bash
grep -n "Extension G\|Synastrie\|extension" public/src/pages/DashboardPage.js
```

### Step D-2: Note aktualisieren

Finde die Zeile:
```js
{ label: 'Synastrie-Vertiefung',   route: '/synastry',         note: 'Basis-Vergleich sofort möglich, vertieft nach Extension G' },
```

Ersetze durch:
```js
{ label: 'Synastrie-Vertiefung',   route: '/synastry',         note: 'Server-seitige Synastrie mit Fusions-Bewertung & Kohärenzindex' },
```

### Step D-3: Commit
```bash
git add public/src/pages/DashboardPage.js
git commit -m "fix(dashboard): Extension-G-Hinweis entfernt — Synastrie-Endpoint aktiv"
```

---

## Task E: Finale Integration + Push

### Step E-1: Alle Tests laufen lassen
```bash
cd /sessions/ecstatic-amazing-edison/mnt/codebase/Full_bazodiac_fufire-main
node --test test/ 2>&1 | tail -10
```
Expected: alle Tests grün (26+)

### Step E-2: Syntax aller geänderten Dateien prüfen
```bash
node --check public/src/domain/baziRenderer.js && \
node --check public/src/pages/OverviewPage.js && \
node --check public/src/pages/TransitCalendarPage.js && \
node --check public/src/pages/DashboardPage.js && \
echo "ALL OK"
```

### Step E-3: Git push
```bash
git push origin main
```
Falls rejected: `git pull --rebase origin main && git push --force-with-lease origin main`
