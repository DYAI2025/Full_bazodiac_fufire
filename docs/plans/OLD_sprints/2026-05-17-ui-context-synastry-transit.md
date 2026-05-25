# UI-Verbesserungen: BaZi, Häuser, Synastrie, Transitkalender

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vier Frontend-Bereiche kontextueller, visuell klarer und individuell relevanter machen — ohne API-Änderungen.

**Architecture:** Reine Frontend-Arbeit. Alle Daten liegen bereits im `profile`-Objekt. Neue Logik entsteht in den Page-/Domain-Dateien; CSS-Erweiterungen in `main.css`. Kein neues API-Endpunkt nötig.

**Tech Stack:** Vanilla JS ES-Module, CSS Custom Properties, SVG (Harmoniegauge)

---

## Orientierung: Was liegt wo

| Was                  | Datei                                              |
|----------------------|----------------------------------------------------|
| BaZi Pillar-Render   | `public/src/domain/baziRenderer.js`                |
| Häuser-Section       | `public/src/pages/OverviewPage.js`                 |
| Synastrie            | `public/src/pages/SynastryPage.js`                 |
| Synastrie-Projektion | `public/src/domain/projections.js`                 |
| Transitkalender      | `public/src/pages/TransitCalendarPage.js`          |
| CSS                  | `public/src/styles/main.css`                       |
| App-Router           | `public/src/app.js`                                |

---

## Task 1 — BaZi: Tierzeichen prominent + Hidden Stems Erklärung

**Problem:** `.pillar-animal` ist `.7rem` + `var(--muted)` → praktisch unsichtbar. Außerdem fehlt die Hidden-Stems-Erklärung in der sichtbaren Schicht.

**Files:**
- Modify: `public/src/styles/main.css` (Suche nach `.pillar-animal`)
- Modify: `public/src/domain/baziRenderer.js` (Suche nach `animalSpan`)

### Schritt 1: CSS — Tierzeichen prominent

Ersetze in `main.css`:
```css
.pillar-animal {
  font-size: .7rem;
  color: var(--muted);
  line-height: 1.3;
}
```
durch:
```css
.pillar-animal {
  font-size: .82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
  margin-top: 2px;
}
.pillar-animal-element {
  font-size: .68rem;
  font-weight: 400;
  color: var(--muted);
  margin-top: 1px;
}
```

### Schritt 2: baziRenderer.js — Tierzeichen in zwei Zeilen aufteilen

In `renderBaziPillars()`, ersetze den `animalSpan`-Block (Suche `animalSpan.className = 'pillar-animal'`):

```js
// ── Tierzeichen (Name, eigene Zeile) ─────────────────────────
const animalSpan = document.createElement('span');
animalSpan.className = 'pillar-animal';
animalSpan.textContent = branchInfo.animal || '';

// ── Element + Polarität des Zweigs (zweite Zeile, klein) ─────
const animalElementSpan = document.createElement('span');
animalElementSpan.className = `pillar-animal-element ${ELEMENT_COLOR[branchInfo.element] || ''}`;
animalElementSpan.textContent = branchInfo.element && branchInfo.polarity
  ? `${branchInfo.element} · ${branchInfo.polarity}`
  : '';

branchBlock.append(branchChar, animalSpan, animalElementSpan);
```

Statt dem bisherigen:
```js
const animalSpan = document.createElement('span');
animalSpan.className = 'pillar-animal';
animalSpan.textContent = branchInfo.animal
  ? `${branchInfo.animal} · ${branchInfo.element} ${branchInfo.polarity}`
  : '';

branchBlock.append(branchChar, animalSpan);
```

### Schritt 3: Hidden Stems — Summary-Text verbessern

In `baziRenderer.js`, Suche `summaryText.textContent = '藏干 Verborgene Stämme'` → ändern zu:
```js
summaryText.textContent = `藏干 · ${stems.length > 0 ? stems.map(s => s.stem).join(' ') : 'Verborgene Stämme'}`;
```

So sieht man sofort welche Stämme drinstecken, noch vor dem Aufklappen.

### Schritt 4: Testen (visuell)

Start: `npm start` (oder `node server.js`), Profil eingeben, BaZi-Säulen prüfen:
- Tierzeichen-Name groß + hell
- Darunter Element · Polarität klein + eingefärbt
- Hidden-Stems-Summary zeigt Stamm-Zeichen

### Schritt 5: Commit

```bash
git add public/src/domain/baziRenderer.js public/src/styles/main.css
git commit -m "feat(bazi): Tierzeichen prominent + Hidden Stems Summary"
```

---

## Task 2 — Häuser: Element-Farben nach westlichen Zeichen

**Problem:** Alle Häuser sehen gleich aus. Feuer/Wasser/Erde/Luft sollen farblich codiert sein (linker Border + Sign-Badge).

**Files:**
- Modify: `public/src/styles/main.css`
- Modify: `public/src/pages/OverviewPage.js`

### Schritt 1: CSS — vier Element-Farben für Häuser

Füge in `main.css` nach `.house-card { ... }` ein:

```css
/* Häuser-Element-Farbcodierung (Western Zodiac) */
.house-card--feuer  { border-left: 3px solid #f87171; }
.house-card--wasser { border-left: 3px solid #60a5fa; }
.house-card--erde   { border-left: 3px solid #4ade80; }
.house-card--luft   { border-left: 3px solid #e2e8f0; }

.house-sign-badge--feuer  { color: #f87171; border-color: #f87171; }
.house-sign-badge--wasser { color: #60a5fa; border-color: #60a5fa; }
.house-sign-badge--erde   { color: #4ade80; border-color: #4ade80; }
.house-sign-badge--luft   { color: #e2e8f0; border-color: #e2e8f0; }
```

### Schritt 2: OverviewPage.js — SIGN_ELEMENT-Lookup + Klassen anwenden

Füge direkt nach der `SIGN_IN_HOUSE`-Konstante ein:

```js
// Westliche Zeichen → Element (für Farbcodierung)
const SIGN_ELEMENT = {
  Aries: 'feuer', Leo: 'feuer', Sagittarius: 'feuer',
  Cancer: 'wasser', Scorpio: 'wasser', Pisces: 'wasser',
  Taurus: 'erde', Virgo: 'erde', Capricorn: 'erde',
  Gemini: 'luft', Libra: 'luft', Aquarius: 'luft',
};
```

In `renderWesternHouses()`, bei der `card`-Erstellung ersetze:
```js
card.className = `house-card${sign ? ' house-card--has-sign' : ' house-card--no-sign'}`;
```
durch:
```js
const el = sign ? SIGN_ELEMENT[sign] : null;
card.className = `house-card${el ? ` house-card--${el}` : ''}`;
```

Und beim `signBadge` ersetze:
```js
signBadge.className = `house-sign-badge${sign ? '' : ' house-sign-badge--empty'}`;
```
durch:
```js
signBadge.className = `house-sign-badge${el ? ` house-sign-badge--${el}` : ''}${sign ? '' : ' house-sign-badge--empty'}`;
```

### Schritt 3: Kontextuellerer Hausdeutungs-Text

In der `interpDiv`-Erstellung ersetze:
```js
const interpText = document.createTextNode(
  `${SIGN_IN_HOUSE[sign] || signText} in den Bereich „${info?.theme || `Haus ${i}`}".`
);
```
durch:
```js
const interpText = document.createTextNode(
  `${SIGN_IN_HOUSE[sign] || signText} — dieser Impuls prägt deinen Bereich „${info?.theme || `Haus ${i}`}" auf charakteristische Weise.`
);
```

Das ist immer noch statisch, aber die Formulierung verankert die Deutung stärker im persönlichen Kontext des Hauses.

### Schritt 4: Testen

Profil mit bekanntem Chart eingeben, prüfen:
- Feuerzeichen-Häuser: roter linker Rand + rote Badge
- Wasserzeichen: blau, Erde: grün, Luft: hell

### Schritt 5: Commit

```bash
git add public/src/pages/OverviewPage.js public/src/styles/main.css
git commit -m "feat(houses): Element-Farbcodierung Feuer/Wasser/Erde/Luft"
```

---

## Task 3 — Synastrie: Harmoniegauge + Extension G ersetzen

**Erklärung zu Extension G:** Das war ein Entwickler-Placeholder für einen geplanten `/synastry`-Endpunkt auf BAFE, der einen server-seitigen Composite-Chart (Mittelpunkte aller Planeten beider Personen) berechnen würde. BAFE unterstützt das noch nicht. Stattdessen: wir berechnen client-seitig einen Harmonie-Score aus den vorhandenen Aspekten + Wu-Xing und ersetzen den Placeholder durch den Harmoniegauge.

**Files:**
- Modify: `public/src/domain/projections.js` (Score-Berechnung)
- Modify: `public/src/pages/SynastryPage.js` (Gauge-Widget + Extension G entfernen)
- Modify: `public/src/styles/main.css`

### Schritt 1: projections.js — harmony score pro Sektion

Füge am Ende von `ASPECT_DEFS` für jeden Aspekt ein `harmony`-Gewicht hinzu:

```js
const ASPECT_DEFS = [
  { angle: 0,   orb: 8, label: 'Konjunktion', harmony: 0.5,  description: 'Direkte Verschmelzung — Energien verstärken oder überlagern sich.' },
  { angle: 60,  orb: 5, label: 'Sextil',      harmony: 0.8,  description: 'Harmonische Ergänzung — Chancen entstehen durch Begegnung.' },
  { angle: 90,  orb: 7, label: 'Quadrat',      harmony: 0.2,  description: 'Kreative Spannung — Wachstum durch Auseinandersetzung.' },
  { angle: 120, orb: 7, label: 'Trigon',       harmony: 0.9,  description: 'Natürlicher Fluss — Unterstützung ohne Aufwand.' },
  { angle: 180, orb: 8, label: 'Opposition',   harmony: 0.3,  description: 'Polarisierende Anziehung — zwei Seiten eines Ganzen.' },
];
```

Und füge am Ende von `createSynastryProjection()`, vor `return`, ein:

```js
// Harmonie-Score: 0 = reine Spannung, 1 = reine Harmonie
const WUXING_HARMONY = {
  generating: 0.85, controlling: 0.3, identical: 0.6, neutral: 0.5,
};
const aspectScore = aspects.length > 0
  ? aspects.reduce((sum, a) => {
      const def = ASPECT_DEFS.find(d => d.label === a.aspect);
      return sum + (def?.harmony ?? 0.5);
    }, 0) / aspects.length
  : null;
const wuxingScore = wuxing ? (WUXING_HARMONY[wuxing.relation] ?? 0.5) : null;
const harmonyScore = (aspectScore != null && wuxingScore != null)
  ? Math.round(((aspectScore * 0.6 + wuxingScore * 0.4)) * 100) / 100
  : (aspectScore ?? wuxingScore ?? null);
```

Und erweitere das return-Objekt um `harmonyScore`:
```js
return { wuxing, bazi, aspects, missing, confidence, harmonyScore };
```

### Schritt 2: SynastryPage.js — Harmoniegauge-Funktion

Füge eine neue Hilfsfunktion **vor** `renderWuXing` ein:

```js
function renderHarmonyGauge(score, label) {
  if (score == null) return null;
  // score: 0.0 = Spannung, 1.0 = Harmonie
  const pct = Math.round(score * 100);
  // Zeiger-Winkel: -90° (links=Spannung) bis +90° (rechts=Harmonie)
  const angleDeg = -90 + score * 180;

  const wrap = document.createElement('div');
  wrap.className = 'harmony-gauge-wrap';
  wrap.innerHTML = `
    <div class="harmony-gauge-label">${label || 'Energie-Balance'}</div>
    <svg class="harmony-gauge-svg" viewBox="0 0 200 110" aria-label="${pct}% Harmonie">
      <!-- Hintergrund-Bogen -->
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#60a5fa"/>
          <stop offset="50%"  stop-color="#a78bfa"/>
          <stop offset="100%" stop-color="#f87171"/>
        </linearGradient>
      </defs>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
            stroke="url(#gaugeGrad)" stroke-width="14" stroke-linecap="round"/>
      <!-- Zeiger -->
      <g transform="translate(100,100) rotate(${angleDeg})">
        <line x1="0" y1="0" x2="0" y2="-68" stroke="var(--text)" stroke-width="3"
              stroke-linecap="round"/>
        <circle cx="0" cy="0" r="5" fill="var(--text)"/>
      </g>
      <!-- Labels -->
      <text x="15"  y="108" font-size="9" fill="#60a5fa" text-anchor="middle">Spannung</text>
      <text x="100" y="22"  font-size="9" fill="var(--muted)" text-anchor="middle">Balance</text>
      <text x="185" y="108" font-size="9" fill="#f87171" text-anchor="middle">Harmonie</text>
    </svg>
    <div class="harmony-gauge-pct">${pct} %</div>
  `;
  return wrap;
}
```

### Schritt 3: SynastryPage.js — Gauge in bestehende Sektionen einbauen

In `renderWuXing()`, direkt nach `section.appendChild(card)` und vor `container.appendChild(section)`:
```js
if (proj.harmonyScore != null) {
  const gauge = renderHarmonyGauge(proj.harmonyScore, 'Elementare Energie-Balance');
  if (gauge) section.appendChild(gauge);
}
```

In `renderAspects()`, am Ende nach dem `grid`, vor `container.appendChild`:
```js
if (proj.harmonyScore != null) {
  const gauge = renderHarmonyGauge(proj.harmonyScore, 'Gesamt-Aspekt-Balance');
  if (gauge) section.appendChild(gauge);
}
```

### Schritt 4: SynastryPage.js — Extension G Placeholder ersetzen

Ersetze `renderExtensionPlaceholder()` vollständig:

```js
function renderExtensionPlaceholder(container, proj) {
  // Nur rendern wenn wir Daten haben
  if (!proj.wuxing && !proj.aspects.length) return;

  const section = document.createElement('section');
  section.className = 'synastry-section';

  const h2 = document.createElement('h2');
  h2.textContent = 'Fusions-Bewertung';
  section.appendChild(h2);

  const intro = document.createElement('p');
  intro.className = 'section-intro';
  // Kontextueller Text je nach Score
  const score = proj.harmonyScore;
  let interpretation = '';
  if (score == null) {
    interpretation = 'Für eine vollständige Fusions-Bewertung werden Planetenpositionen beider Personen benötigt.';
  } else if (score >= 0.7) {
    interpretation = `Diese Verbindung zeigt eine hohe elementare und aspektueller Übereinstimmung — Anziehung und Fluss dominieren. Das bedeutet nicht Konfliktfreiheit, sondern eine grundsätzliche Resonanz, die Raum für gemeinsames Wachstum schafft.`;
  } else if (score >= 0.45) {
    interpretation = `Diese Verbindung hält Spannung und Harmonie in einem lebendigen Gleichgewicht. Die Reibungspunkte sind echte Wachstumsorte — sie fordern heraus und ermöglichen dadurch Tiefe.`;
  } else {
    interpretation = `Diese Verbindung ist geprägt von schöpferischer Spannung. Die elementaren und aspektuellen Kräfte wirken oft gegeneinander — das erzeugt Intensität und kann, wenn bewusst genutzt, transformierende Tiefe schaffen.`;
  }
  intro.textContent = interpretation;
  section.appendChild(intro);

  if (score != null) {
    const gauge = renderHarmonyGauge(score, 'Gesamt-Fusions-Balance');
    if (gauge) section.appendChild(gauge);
  }

  container.appendChild(section);
}
```

Und aktualisiere den Aufruf in `renderResult()`:
```js
renderExtensionPlaceholder(resultEl.querySelector('.synastry-extension-placeholder'), proj);
```

### Schritt 5: CSS — Gauge-Styles

Füge in `main.css` ein:
```css
/* ── Harmoniegauge (Synastrie) ──────────────────────────────────────────── */
.harmony-gauge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0 4px;
}
.harmony-gauge-label {
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--muted);
}
.harmony-gauge-svg {
  width: 180px;
  height: auto;
}
.harmony-gauge-pct {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text);
}
```

### Schritt 6: Testen

Synastrie-Seite öffnen, zwei Profile eingeben:
- Jede Sektion sollte einen Gauge anzeigen
- Fusions-Bewertung zeigt kontextuellen Text + Gauge
- Kein "Extension G"-Placeholder mehr sichtbar

### Schritt 7: Commit

```bash
git add public/src/domain/projections.js public/src/pages/SynastryPage.js public/src/styles/main.css
git commit -m "feat(synastry): Harmoniegauge + Fusions-Bewertung, Extension G entfernt"
```

---

## Task 4 — Transitkalender: Individuelle Deutung + Tooltips

**Problem:** Der Transitkalender kennt das Geburtshoroskop nicht — zeigt nur generische Planeten-Positionen ohne persönlichen Bezug. Außerdem keine Erklärungen/Tooltips.

**Files:**
- Modify: `public/src/app.js` (profile an TransitCalendarPage übergeben)
- Modify: `public/src/pages/TransitCalendarPage.js`
- Modify: `public/src/styles/main.css`

### Schritt 1: app.js — profile an TransitCalendarPage übergeben

Ändere die Route `/transit-calendar` von:
```js
.register('/transit-calendar', (app) => {
  TransitCalendarPage(app);
})
```
zu:
```js
.register('/transit-calendar', (app) => {
  TransitCalendarPage(app, { profile: currentProfile });
})
```

Und ändere den Import falls nötig (sollte bereits importiert sein).

### Schritt 2: TransitCalendarPage.js — Signatur anpassen

Ändere die Funktion-Signatur:
```js
export function TransitCalendarPage(app, { profile } = {}) {
```

### Schritt 3: TransitCalendarPage.js — Natal-Kontext-Tabelle

Füge nach den Konstanten am Anfang der Datei ein:

```js
// Transit-Planet → Lebensbereiche (für Tooltip-Kontext)
const TRANSIT_CONTEXT = {
  sun:     'Vitalität, Identität, Lebensrichtung',
  moon:    'Emotionen, Stimmungen, Intuition',
  mercury: 'Denken, Kommunikation, Entscheidungen',
  venus:   'Beziehungen, Werte, Schönheit',
  mars:    'Antrieb, Energie, Konflikte',
  jupiter: 'Wachstum, Chancen, Expansion',
  saturn:  'Struktur, Grenzen, Reife',
  uranus:  'Wandel, Überraschungen, Befreiung',
  neptune: 'Intuition, Auflösung, Spiritualität',
  pluto:   'Tiefe Transformation, Macht, Erneuerung',
};

// Aspekt-Check: welche Natal-Planeten ist ein Transit-Planet nahe?
function findNatalAspects(transitLon, natalBodies, orbDeg = 8) {
  if (!natalBodies || transitLon == null) return [];
  const hits = [];
  for (const [name, body] of Object.entries(natalBodies)) {
    if (body?.longitude == null) continue;
    const diff = Math.abs(((transitLon - body.longitude + 540) % 360) - 180);
    if (diff <= orbDeg) {
      hits.push({ name, orb: Math.round(diff * 10) / 10 });
    }
  }
  return hits.sort((a, b) => a.orb - b.orb);
}
```

### Schritt 4: TransitCalendarPage.js — renderNow mit individuellem Kontext

Ergänze `renderNow()`, um die Natal-Aspekte pro Transit-Planet anzuzeigen.

Ändere `renderNow(planets, sectorIntensity)` zu `renderNow(planets, sectorIntensity, profile)`.

Ersetze innerhalb der Funktion die `card.innerHTML`-Zuweisung:

```js
const isRetro = p.speed < 0;
const natalBodies = profile?.western?.bodies || {};
const natalHits = findNatalAspects(p.longitude, natalBodies);
const hitText = natalHits.length > 0
  ? `Nahe deinem Natal-${natalHits[0].name} (${natalHits[0].orb}°)`
  : '';
const context = TRANSIT_CONTEXT[name] || '';
const tooltip = [context, hitText].filter(Boolean).join(' · ');

card.setAttribute('title', tooltip);
card.innerHTML = `
  <span class="transit-planet-symbol">${PLANET_SYMBOLS[name] || name}</span>
  <span class="transit-planet-name">${PLANET_LABELS_DE[name] || name}</span>
  <span class="transit-planet-sign">${signDE(p.sign)}</span>
  ${isRetro ? '<span class="transit-retro" title="Rückläufig">℞</span>' : ''}
  <span class="transit-planet-deg">${p.longitude != null ? p.longitude.toFixed(1) + '°' : '—'}</span>
  ${hitText ? `<span class="transit-natal-hit" title="${tooltip}">${hitText}</span>` : ''}
`;
```

### Schritt 5: TransitCalendarPage.js — Tooltip für Wochen-Strip

In `renderTimeline(days)`, ändere Signatur auf `renderTimeline(days, profile)` und erweitere die `transit-day-planet`-Chips um `title`:

```js
const activePlanets = Object.entries(day.planets || {})
  .map(([name, p]) => {
    const natalBodies = profile?.western?.bodies || {};
    const hits = findNatalAspects(p.longitude, natalBodies, 6);
    const hitNote = hits.length > 0 ? ` · nahe Natal-${hits[0].name}` : '';
    const ctx = TRANSIT_CONTEXT[name] || '';
    return {
      name, sign: p.sign,
      speed: Math.abs(p.speed || 0),
      retro: (p.speed || 0) < 0,
      tooltip: ctx + hitNote,
    };
  })
  .sort((a, b) => b.speed - a.speed)
  .slice(0, 3);
```

Und im Template:
```js
<div class="transit-day-planet" title="${esc(p.tooltip)}">
```

### Schritt 6: TransitCalendarPage.js — Aufrufe anpassen

Im `Promise.all().then()`:
```js
content.appendChild(renderNow(nowRes.data.planets, nowRes.data.sector_intensity || [], profile));
content.appendChild(renderTimeline(timelineRes.data.days || [], profile));
```

### Schritt 7: CSS — Natal-Hit Chip + Hover

```css
/* ── Transit Natal-Hit Badge ─────────────────────────────────────────────── */
.transit-natal-hit {
  font-size: .62rem;
  color: var(--accent2);
  border: 1px solid var(--accent2)44;
  border-radius: 99px;
  padding: 1px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin-top: 2px;
}

.transit-planet-card {
  cursor: default;
  transition: background .15s, border-color .15s;
}
.transit-planet-card:hover {
  background: var(--panel2);
  border-color: var(--accent);
}

.transit-day-planet {
  cursor: default;
}
.transit-day-planet:hover {
  color: var(--accent);
}
```

### Schritt 8: Testen

- Transit-Kalender über `/overview` (Back-Navigation) aufrufen während ein Profil aktiv ist
- Hover über Planet-Karten → Tooltip mit Lebensbereich + Natal-Aspekt
- Wochenstrip: Hover über Planet-Chips → erklärende Tooltips
- Ohne Profil: funktioniert weiterhin (keine Natal-Aspekte, aber Basis-Tooltips)

### Schritt 9: Commit

```bash
git add public/src/app.js public/src/pages/TransitCalendarPage.js public/src/styles/main.css
git commit -m "feat(transit): individuelle Natal-Kontext-Tooltips + Profil-Übergabe"
```

---

## Abschluss

```bash
git push origin main
```

**Plan complete und gespeichert unter `docs/plans/2026-05-17-ui-context-synastry-transit.md`.**

---

## Ausführungsoptionen

**1. Subagent-gesteuert (diese Session)** — ich dispatche pro Task einen frischen Subagenten, review zwischen Tasks, schnelle Iteration

**2. Parallele Session (separat)** — neue Session öffnen mit `executing-plans`, Batch-Ausführung mit Checkpoints

Welchen Ansatz?
