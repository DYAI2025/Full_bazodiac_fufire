# Dev Brief: Pro Birthchart + Rolling Letters Integration

Plan path: `docs/plans/2026-05-21-pro-birthchart-rolling-text.md`

Status: `draft — ausführbar nach Repo-Reconfirm und Testbaseline`

Owner/Executor: `coding agent / engineer`

Last updated: `2026-05-21`

## 1. Zielbild

Die aktuelle Bazodiac-Version soll zwei Erweiterungen erhalten:

**Pro Birthchart auf der Übersichtsseite**

Das Geburtsrad wird vom dekorativen Mini-Wheel zu einem professionelleren astrologischen Berechnungsanker erweitert: echte Hauskuspen, ASC/DSC/MC/IC, Zeichenring, 360 Grad-Ticks, Planetenglyphen, Gradlabels, Kollisionsversatz und farbcodierte Major-Aspekte.

**Rolling Letters / Split-Flap-Typografie**

Titel und ausgewählte Brand-Elemente erhalten eine kontrollierte Rolling-Letters-Animation. Die Animation darf nicht global auf Body-Copy wirken, muss barrierearm sein und darf keine neue Runtime-Abhängigkeit einführen.

Kernentscheidung:

`Datenkorrektheit vor visueller Politur.`

Das Wheel darf nicht professionell aussehen, wenn es intern mit falschen oder erfundenen Daten arbeitet.

---

## 2. Evidence and Source Boundary

### Geprüfte Grundlage

Vorherige lokale Codeinspektion der hochgeladenen Repos/ZIPs:

`Full_bazodiac_fufire-main`

`FURFIRE__ (2).zip`

Vorherige Screenshots der aktuellen App.

Referenzbild `birthchart.jpeg`.

Vorheriger lokaler Testlauf:

`npm test`

Ergebnis: `600 passed`, `0 failed`, `9 skipped`

Aktuelle File-Search auf Uploads ergab keine indexierten Treffer. Daher werden Code-Fakten hier als Ergebnis der vorherigen lokalen Inspektion behandelt, nicht als frisch zitierbare interne Quelle.

### Bekannte Code-Fakten aus vorheriger Inspektion

BereichBefund

App-ArchitekturVanilla ESM unter `public/src/**`, keine React-Architektur im Zielrepo

Aktuelles Wheel`public/src/components/NatalChartWheel.js` existiert bereits

Übersichtsdaten`public/src/domain/overviewModel.js` erzeugt bereits `chartWheel`

Mappings`public/src/data/astro-mappings.js` enthält Planet-/Zeichen-Mappings, aber kein sauberes `PLANET_GLYPH`-Modell

Backend`server.js` normalisiert FuFirE-/Azodiac-Daten

TestsNode-Teststruktur unter `test/**` vorhanden

FURFIRE-PrototypEnthält React-basierte RollingText-/Chart-Referenzen, darf aber nicht direkt übernommen werden

### Nicht geprüft / offen

LabelPunkt

`MISSING`Aktueller Live-Payload der FuFirE-API mit vollständigen Häusern, Winkeln und Aspekten

`MISSING`Manuelle Browserprüfung des finalen SVG-Layouts

`MISSING`Exakte Stub-Fähigkeiten aller bestehenden Page-Render-Tests nach aktuellem Stand

`ASSUMPTION/api/azodiac/profile` liefert genug Western-Daten, wenn Normalisierung korrekt durchreicht

`ASSUMPTION`Kein neuer Endpoint ist für MVP nötig

`BLOCKER`Kein harter Blocker bekannt; Datenlücken werden durch Discovery-Tasks abgefangen

---

## 3. Fachliche und technische Leitentscheidung

## Entscheidung

`Keine visuelle Erweiterung vor stabilem Chart-Datenvertrag.`

Das bedeutet:

Erst `chartWheel`-Contract korrigieren.

Dann Normalizer gegen Fake-0°-Daten absichern.

Dann `NatalChartWheel` erweitern.

Dann RollingText Entry-only integrieren.

Scroll-Re-Scramble erst nach erfolgreichem stabilen MVP.

## Warum

Der kritischste Fehler wäre ein visuell hochwertiges Chart, das intern falsche Daten rendert:

`fehlende Longitude → 0° Widder → professionelles Wheel → faktisch falscher Eindruck`

Das ist schlimmer als ein schlichtes Wheel.

---

## 4. Requirements

IDTypeRequirementSourceVerification

REQ-F-001functional`NatalChartWheel` rendert echte Hauskuspen, nicht Equal-House-Fakewerte.user + auditUnit-Test mit ungleichmäßigen Cusps

REQ-F-002functionalWheel zeigt ASC, DSC, MC, IC. DSC/IC dürfen aus ASC/MC abgeleitet werden.user + auditSVG enthält `data-marker="asc

REQ-F-003functionalWheel rendert 360 Grad-Ticks mit 1°/5°/10°-Unterscheidung.userSVG-Test

REQ-F-004functionalBodies werden mit Planetenglyphen und Gradlabel gerendert.user + auditSVG enthält `data-body-glyph`, `data-body-degree`

REQ-F-005functionalEnge Bodies erhalten radialen Kollisionsversatz.auditTest mit Planetenabstand < 6°

REQ-F-006functionalMajor-Aspekte werden über `sourceKey`/`targetKey` gematcht.auditAspect-Matching-Test

REQ-F-007functionalAspekte erhalten Tone-Klassen: `hard`, `soft`, `neutral`.user + auditSVG enthält `natal-aspect--hard/soft/neutral`

REQ-F-008functional`RollingText` rendert Text zeichenweise mit `aria-label`.userUnit-Test

REQ-F-009functionalRollingText bleibt ohne RAF/IntersectionObserver statisch nutzbar.auditNode-Test ohne Browser APIs

REQ-F-010functionalReduced Motion deaktiviert Scrambling vollständig.userMock-`matchMedia`-Test

REQ-D-001data`chartWheel.bodies` trennt `key`, `labelDE`, `glyph`, `signGlyph`.audit`overviewModel`-Test

REQ-D-002dataFehlende Longitude wird nicht zu `0` normalisiert.auditNormalizer-Test

REQ-D-003dataOptionale Western-Präzisionsfelder werden nicht unnötig verworfen.auditNormalizer-Test

REQ-A-001architectureKeine React-/Babel-Runtime ins Zielrepo übernehmen.audit`package.json` diff

REQ-A-002architectureFURFIRE-Code dient als Referenz, nicht als Importquelle.auditCode Review

REQ-A-003architectureUI-Komponenten konsumieren ViewModels, keine Roh-API-Felder.auditCode Review + Tests

REQ-NF-001non-functionalKein dauerhaft laufender RAF nach Animation.auditCode Review + Manual

REQ-NF-002non-functionalKeine neue horizontale Mobile-Overflow-Regression.auditManual 320px

REQ-S-001security/privacyKeine Geburtsdaten in Logs, Test-Snapshots oder Kommentaren ausgeben.auditCode Review

---

## 5. Ziel-Datenvertrag

### 5.1 `chartWheel.bodies`

Der neue Vertrag muss eindeutig zwischen Planet, Zeichen und Anzeigename trennen.

JavaScript

`{
  key: 'Moon',              // stabiler technischer Schlüssel
  labelDE: 'Mond',          // deutsche Anzeige
  glyph: '☽',               // Planetenglyph
  sign: 'Virgo',            // technischer Zeichenname
  signDE: 'Jungfrau',       // deutsche Anzeige
  signGlyph: '♍',           // Zeichenglyph
  longitude: 158.23,
  signIdx: 5,
  degreeInSign: 8.23,
  degreeDisplay: "8°13'",
  house: 6,
  retrograde: false
}`

Nicht zulässig:

JavaScript

`{
  name: 'Mond',
  glyph: '♍'
}`

Das wäre semantisch falsch, weil `glyph` dann Zeichen statt Planet wäre.

### 5.2 `chartWheel.aspects`

Aspekte müssen über stabile technische Keys gematcht werden.

JavaScript

`{
  sourceKey: 'Moon',
  targetKey: 'Neptune',
  sourceLabelDE: 'Mond',
  targetLabelDE: 'Neptun',
  type: 'trine',
  typeDE: 'Trigon',
  orb: 0.42,
  tone: 'soft'
}`

Backcompat-Felder wie `source` und `target` dürfen temporär bestehen bleiben, aber `NatalChartWheel` muss `sourceKey`/`targetKey` bevorzugen.

### 5.3 `chartWheel.angles`

JavaScript

`{
  asc: 301.42,
  dsc: 121.42,
  mc: 239.85,
  ic: 59.85
}`

Ableitung:

JavaScript

`dsc = normalizeLongitude(asc + 180)
ic = normalizeLongitude(mc + 180)`

### 5.4 Orientierung

Wenn ASC vorhanden ist:

`ASC liegt links / 9-Uhr-Position.`

Regel:

JavaScript

`function chartAngle(longitude, orientation) {
  const anchor = orientation?.anchor === 'asc' && Number.isFinite(orientation.asc)
    ? orientation.asc
    : 0;

  return 180 - normalizeLongitude(longitude - anchor);
}`

Wenn ASC fehlt:

JavaScript

`orientation = {
  anchor: 'aries',
  asc: null
}`

und das Wheel zeigt eine Warning.

---

## 6. Normalizer-Regeln

### 6.1 Verbotener Fallback

Nicht zulässig:

JavaScript

`const bodyLon = Number(body.longitude ?? body.lon ?? body.degree ?? 0);`

Warum: Fehlende Daten werden zu `0° Widder`.

### 6.2 Korrekte Regel

JavaScript

`const rawLon = body.longitude ?? body.lon ?? body.degree;
const bodyLon = Number(rawLon);

if (!Number.isFinite(bodyLon)) {
  warnings.push({
    type: 'missing_longitude',
    body: body.name ?? body.key ?? 'unknown'
  });
  continue;
}`

### 6.3 Optional durchzureichende Felder

Wenn vorhanden, nicht verwerfen:

JavaScript

`latitude
speed
distance
degree_in_sign
house_position_float
jd_ut
jd_tt
house_system
timezone
utc_datetime
precision
provenance`

Diese Felder müssen nicht alle im UI angezeigt werden. Sie sollen aber nicht unnötig aus dem kanonischen Modell verschwinden.

---

## 7. Rolling Letters Spezifikation

### 7.1 Ziel

Rolling Letters werden als kontrollierte, barrierearme Motion-Schicht integriert.

### 7.2 Nicht direkt übernehmen

Der FURFIRE-Prototyp ist React-basiert. Die Ziel-App ist Vanilla ESM. Daher:

`Referenz: ja
Direktimport: nein
React-Runtime: nein`

### 7.3 API

JavaScript

`export function RollingText({
  text,
  tagName = 'span',
  className = '',
  variant = 'inherit',
  mode = 'entry',
  baseDelay = 120,
  perChar = 34,
  charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ·0123456789'
} = {})

export function decorateRollingText(root, {
  selector = '[data-roll-text]',
  maxChars = 90
} = {})`

### 7.4 DOM-Vertrag

Bestehende Headings sollen ihre Semantik behalten.

Aus:

HTML

`<h1 class="page-title" data-roll-text>Was zirkuliert, was staut</h1>`

wird:

HTML

`<h1 class="page-title rolling-text" data-roll-text aria-label="Was zirkuliert, was staut">
  <span data-roll-char aria-hidden="true">W</span>
  <span data-roll-char aria-hidden="true">a</span>
  ...
</h1>`

Nicht zulässig:

HTML

`<span class="rolling-text">...</span>`

wenn dadurch die `h1`-Semantik verloren geht.

### 7.5 Sicherheitsregel

Kein `innerHTML` für dynamische Textzerlegung.

Zulässig:

JavaScript

`const span = document.createElement('span');
span.textContent = char;`

### 7.6 Motion-Regeln

MVP:

`Entry-only Scramble.`

Optional nach MVP:

`Scroll-Re-Scramble.`

Reduced Motion:

CSS

`@media (prefers-reduced-motion: reduce) {
  .rolling-text [data-roll-char] {
    transition: none;
    animation: none;
  }
}`

JavaScript muss Reduced Motion zusätzlich respektieren.

---

## 8. Architekturgrenzen

### 8.1 Zielstruktur

`server.js
  Nur Normalisierung und optionales Durchreichen von Präzisionsfeldern.

public/src/data/astro-mappings.js
  PLANET_GLYPH, SIGN_GLYPH, BODY_KEY_ALIASES, deutsche Labels.

public/src/domain/overviewModel.js
  Baut chartWheel als kanonisches ViewModel.

public/src/components/NatalChartWheel.js
  Rendert SVG aus chartWheel. Keine Roh-API-Feldnamen.

public/src/components/NatalChartDetails.js
  Optional: Positions-/Aspektübersicht.

public/src/components/RollingText.js
  Vanilla Motion-Komponente.

public/src/styles/main.css
  Wheel- und RollingText-Styling.

public/src/app.js / public/src/router.js
  Explizite Page-Mount-Enhancement-Integration.`

### 8.2 Verbotene Änderungen

Keine React- oder Babel-Runtime.

Keine neue Chart-Engine.

Keine Demo-Daten wie `LINA_PLANETS`.

Keine globalen typografischen Overrides auf alle `.page-title`, die bestehende Serif-Hierarchie zerstören.

Kein neuer Endpoint im MVP, solange Normalizer + `/api/azodiac/profile` reichen.

---

## 9. Implementierungsphasen

## Phase P0: Repo-Reconfirm und Schutztests

Ziel: Aktuellen Zustand verifizieren.

Bash

`npm test`

Dann gezielt prüfen:

`public/src/components/NatalChartWheel.js
public/src/domain/overviewModel.js
public/src/data/astro-mappings.js
server.js
test/**`

Ergebnis dokumentieren:

`baseline command
pass/fail count
skipped count
known failures`

---

## Phase P1: Datenvertrag zuerst

Ziel: `chartWheel` fachlich und technisch stabilisieren.

Reihenfolge:

`PLANET_GLYPH` ergänzen.

`BODY_KEY_ALIASES` ergänzen.

`chartWheel.bodies` umstellen.

`chartWheel.aspects` auf `sourceKey`/`targetKey` erweitern.

Normalizer-0°-Fallback entfernen.

Tests schreiben und grün bekommen.

---

## Phase P2: Pro Birthchart

Ziel: Das bestehende Wheel professionell erweitern.

Elemente:

360 Grad-Ticks

Zeichenring mit Glyphen

echte Hauslinien aus `cuspLongitude`

Hausnummern im echten Cusp-Mittelpunkt

ASC/DSC/MC/IC

Planetenglyphen

Gradlabels

Kollisionsversatz

Leader-Lines

farbcodierte Major-Aspekte

Warnings bei fehlenden Daten

---

## Phase P3: RollingText Entry-only

Ziel: Motion ohne Architekturbruch.

Elemente:

`RollingText.js`

`decorateRollingText()`

`data-roll-text`-Integration

Reduced Motion

No-Browser-Fallback

keine Scroll-Reanimation im MVP

---

## Phase P4: Integration und Review

Ziel: Übersicht und Titel kohärent integrieren.

Elemente:

`/overview` mit Birthchart als visuellem Anker

optional `NatalChartDetails`

RollingText nur auf ausgewählte Titel/Brand-Elemente

Mobile-/Reduced-Motion-/Regressionstest

---

## 10. Tasks

### TASK-001: Baseline und Dateigrenzen verifizieren

Objective: Aktuellen Repo-Zustand sichern und reale Integrationspunkte bestätigen.

Requirement links: REQ-A-001, REQ-A-003

Files/modules:

Read: `package.json`

Read: `server.js`

Read: `public/src/app.js`

Read: `public/src/router.js`

Read: `public/src/domain/overviewModel.js`

Read: `public/src/components/NatalChartWheel.js`

Read: `test/**`

Steps:

`npm test` ausführen.

Teststatus dokumentieren.

Prüfen, ob `mountWithProfile()` oder Router nach Page-Render erweitert werden muss.

Prüfen, welche DOM-Test-Stubs `querySelectorAll()` real unterstützen.

Keine Implementierung vor Abschluss dieser Bestandsaufnahme.

Acceptance criteria:

Baseline ist dokumentiert.

Page-Mount-Integrationspunkt ist eindeutig.

Teststub-Grenzen sind bekannt.

Validation:

Bash

`npm test`

Rollback note: Keine Codeänderung außer Dokumentation.

---

### TASK-002: Tests für neuen Chart-Datenvertrag schreiben

Objective: Gewünschte Datenform vor Implementierung festlegen.

Requirement links: REQ-D-001, REQ-F-006

Files/modules:

Modify: `test/overview-model.test.js`

Optional Create: `test/chart-wheel-contract.test.js`

Steps:

Failing Test für `chartWheel.bodies[*].key`.

Failing Test für `labelDE`.

Failing Test für `glyph` als Planetenglyph.

Failing Test für `signGlyph` als Zeichenglyph.

Failing Test für `sourceKey`/`targetKey` in Aspekten.

Failing Test für `angles.asc/dsc/mc/ic`.

Acceptance criteria:

Tests schlagen vor Implementierung sinnvoll fehl.

Tests vermeiden Snapshot-Overcoupling.

Validation:

Bash

`node --test test/overview-model.test.js`

Rollback note: Neue Tests entfernen.

---

### TASK-003: Astro-Mappings stabilisieren

Objective: Körper, Zeichen und Anzeigenamen eindeutig trennen.

Requirement links: REQ-D-001

Files/modules:

Modify: `public/src/data/astro-mappings.js`

Test: `test/overview-model.test.js` oder neue Mapping-Testdatei

Steps:

`PLANET_GLYPH` exportieren:

`Sun: ☉`

`Moon: ☽`

`Mercury: ☿`

`Venus: ♀`

`Mars: ♂`

`Jupiter: ♃`

`Saturn: ♄`

`Uranus: ♅`

`Neptune: ♆`

`Pluto: ♇`

`Chiron: ⚷`

`Lilith: ⚸`

`NorthNode: ☊`

`BODY_KEY_ALIASES` ergänzen:

`North Node`

`NorthNode`

`True North Node`

`TrueNorthNode`

`Mean Node`

Existing exports nicht brechen.

Tests grün bekommen.

Acceptance criteria:

Planetenglyphen und Zeichenglyphen sind getrennt.

Node-/Lilith-Varianten werden stabil auf technische Keys abgebildet.

Validation:

Bash

`node --test test/overview-model.test.js`

Rollback note: Neue Exporte entfernen.

---

### TASK-004: Normalizer gegen Fake-0° absichern

Objective: Fehlende Longitudes dürfen nicht als 0° Widder erscheinen.

Requirement links: REQ-D-002, REQ-D-003

Files/modules:

Modify: `server.js`

Test: `test/view_model.test.js` oder passende Server-Testdatei

Steps:

Failing Test: Body ohne Longitude wird nicht mit `longitude: 0` gerendert.

Failing Test: Missing Longitude erzeugt Warning oder wird übersprungen.

Failing Test: optionale Felder wie `speed`, `latitude`, `degree_in_sign`, `house_system`, `jd_ut` bleiben erhalten, wenn vorhanden.

Normalizer ändern:

kein `?? 0`

`Number.isFinite()` prüfen

Warnung setzen.

Bestehende Minimalpayload-Tests prüfen.

Acceptance criteria:

Keine fehlende Longitude wird als `0` normalisiert.

Reiche Western-Payloads verlieren keine relevanten Präzisionsfelder.

Minimalpayloads crashen nicht.

Validation:

Bash

`node --test test/view_model.test.js`

Rollback note: Normalizer-Änderung zurücksetzen.

---

### TASK-005: `overviewModel.chartWheel` erweitern

Objective: Kanonisches Chart-ViewModel für UI-Komponenten erzeugen.

Requirement links: REQ-D-001, REQ-F-002, REQ-F-006

Files/modules:

Modify: `public/src/domain/overviewModel.js`

Test: `test/overview-model.test.js`

Steps:

`PLANET_GLYPH`, `SIGN_GLYPH`, `BODY_KEY_ALIASES` importieren.

Bodies erzeugen mit:

`key`

`labelDE`

`glyph`

`signGlyph`

`degreeDisplay`

`house`

`retrograde`

`angles` erzeugen:

`asc`

`dsc`

`mc`

`ic`

`orientation` erzeugen:

`anchor: 'asc'`, wenn ASC vorhanden

sonst `anchor: 'aries'` + Warning

Aspekte erweitern:

`sourceKey`

`targetKey`

`typeDE`

`tone`

Backcompat-Felder nur dort erhalten, wo bestehende Tests/Views sie brauchen.

Acceptance criteria:

`NatalChartWheel` braucht keine Rohprofile.

Aspect-Matching ist unabhängig von deutscher Anzeige.

Fehlende Daten erzeugen Warnings.

Validation:

Bash

`node --test test/overview-model.test.js test/natal-chart-wheel.test.js`

Rollback note: `overviewModel` auf vorherigen Chartvertrag zurücksetzen.

---

### TASK-006: Pro-Geometrie in `NatalChartWheel` implementieren

Objective: Professionelles SVG-Wheel aus dem neuen ViewModel rendern.

Requirement links: REQ-F-001 bis REQ-F-007

Files/modules:

Modify: `public/src/components/NatalChartWheel.js`

Test: `test/natal-chart-wheel.test.js`

Steps:

Failing Tests schreiben für:

360 Degree Ticks

12 Sign Glyphs

echte House-Cusp-Lines

ASC/DSC/MC/IC Marker

Body Glyphs

Body Degree Labels

Aspect Tone Classes

`normalizeLongitude()` und `chartAngle()` nutzen oder lokal sauber kapseln.

ASC-anchored Orientierung implementieren.

Hauslinien aus `house.cuspLongitude` rendern.

Hauslabels auf realen Cusp-Mittelpunkten platzieren.

Bodies nach Longitude sortieren.

Kollisionslevel bei engen Longitudes berechnen.

Planetenglyphen mit Leader-Line und Gradlabel rendern.

Aspekte vor Planetenglyphen rendern.

Fehlende Daten über Warnings anzeigen, nicht crashen.

Acceptance criteria:

Kein Equal-House-Fallback, wenn echte Cusps vorhanden sind.

Keine Demo-Planeten.

SVG enthält prüfbare `data-*` Attribute.

Validation:

Bash

`node --test test/natal-chart-wheel.test.js`

Rollback note: Alte Wheel-Komponente wiederherstellen.

---

### TASK-007: Optional `NatalChartDetails` ergänzen

Objective: Das Wheel auditierbar machen.

Requirement links: REQ-F-004, REQ-F-007

Files/modules:

Create: `public/src/components/NatalChartDetails.js`

Create: `test/natal-chart-details.test.js`

Modify: `public/src/pages/OverviewPage.js`

Steps:

Positionsliste rendern:

Body

Zeichen

Grad

Haus

retrograde Marker

Aspektliste rendern:

Quelle

Typ

Ziel

Orb

Leere Zustände sauber erklären.

Nur `chartWheel` konsumieren.

Acceptance criteria:

User kann sehen, welche Daten im Wheel stecken.

Fehlende Aspekte erzeugen Empty-State, keine Fake-Liste.

Validation:

Bash

`node --test test/natal-chart-details.test.js`

Rollback note: Komponente aus Overview entfernen.

---

### TASK-008: RollingText Entry-only bauen

Objective: Kontrollierte Rolling-Letters-Komponente als Vanilla-DOM-Modul.

Requirement links: REQ-F-008, REQ-F-009, REQ-F-010

Files/modules:

Create: `public/src/components/RollingText.js`

Create: `test/rolling-text.test.js`

Steps:

Test: Element erhält `.rolling-text`.

Test: `aria-label` enthält Originaltext.

Test: jedes Zeichen erhält `data-roll-char`.

Test: Spaces werden sichtbar stabil behandelt.

Test: ohne RAF/IntersectionObserver kein Throw.

Test: Reduced Motion setzt sofort Zieltext.

Implementieren ohne `innerHTML`.

Entry-only Animation mit RAF.

RAF stoppt nach Settling.

Acceptance criteria:

RollingText funktioniert in Node-Testumgebung statisch.

Browser erhält Entry-Scramble.

Reduced Motion ist vollständig ruhig.

Validation:

Bash

`node --test test/rolling-text.test.js`

Rollback note: Datei entfernen; keine App-Integration betroffen.

---

### TASK-009: RollingText in Page-Mount integrieren

Objective: Titel/Brand-Elemente dekorieren, ohne Heading-Semantik zu verlieren.

Requirement links: REQ-F-008, REQ-A-003

Files/modules:

Modify: `public/src/app.js`

Modify: `public/src/router.js` oder reale Mount-Datei nach TASK-001

Modify: relevante Page-Dateien mit `data-roll-text`

Modify: `public/src/styles/main.css`

Test: `test/page-render-integration.test.js`

Steps:

`enhanceMountedPage(app)` definieren.

`decorateRollingText(app, { selector: '[data-roll-text]', maxChars: 90 })` aufrufen.

Nach jedem Page-Render explizit ausführen.

Nur ausgewählte Titel mit `data-roll-text` markieren.

Keine Body-Copy animieren.

CSS-Varianten ergänzen:

`.rolling-text--inherit`

`.rolling-text--display`

`.rolling-text--brand`

`.rolling-text--data`

Tests an Stub-Grenzen anpassen:

Isolierte RollingText-Tests für DOM-Details.

Page-Test prüft primär, dass Originaltitel erhalten bleibt und App nicht crasht.

Acceptance criteria:

Page Titles behalten `h1/h2`-Semantik.

No-Browser-Stubs brechen nicht.

Keine globale Typografie-Regression.

Validation:

Bash

`node --test test/rolling-text.test.js test/page-render-integration.test.js`

Rollback note: `enhanceMountedPage()`-Aufruf entfernen.

---

### TASK-010: Overview-Layout integrieren

Objective: Birthchart als primären visuellen Anker auf `/overview` platzieren.

Requirement links: REQ-F-001 bis REQ-F-007, REQ-NF-002

Files/modules:

Modify: `public/src/pages/OverviewPage.js`

Modify: `public/src/styles/main.css`

Test: `test/page-render-integration.test.js`

Test: `test/breakpoints.test.js`, falls vorhanden

Steps:

Wheel prominent in Overview platzieren.

Details daneben auf Desktop, darunter auf Mobile.

Warnings sichtbar machen.

Mobile max-widths definieren.

Keine horizontale Overflow-Regression.

Bestehende Insights/Fusion-Karten nicht entfernen, nur neu priorisieren.

Acceptance criteria:

`/overview` zeigt Chartanker.

Mobile 320px bleibt ohne horizontales Overflow.

Fehlende Daten sind sichtbar markiert.

Validation:

Bash

`node --test test/page-render-integration.test.js
npm test`

Rollback note: Overview-Section auf alte Struktur zurücksetzen.

---

### TASK-011: Optionales Scroll-Re-Scramble separat bewerten

Objective: Verhindern, dass Motion-Komplexität das MVP destabilisiert.

Requirement links: REQ-NF-001

Files/modules:

No code in MVP, unless Entry-only vollständig stabil ist.

Steps:

Nach grünem MVP entscheiden.

Wenn umgesetzt:

ein globaler Scrolllistener

nur sichtbare RollingText-Elemente

RAF stoppt nach Settling

Reduced Motion deaktiviert vollständig

Eigene Tests schreiben.

Acceptance criteria:

Scroll-Re-Scramble wird nicht im MVP erzwungen.

Keine dauerhafte RAF-/Listener-Kaskade.

Validation:

Bash

`node --test test/rolling-text.test.js`

Rollback note: Featureflag/Codepfad deaktivieren.

---

### TASK-012: Abschlussvalidierung

Objective: Implementierung regressionstauglich abschließen.

Requirement links: alle

Steps:

Focused Tests:

Bash

`node --test test/overview-model.test.js
node --test test/natal-chart-wheel.test.js
node --test test/rolling-text.test.js`

Optional:

Bash

`node --test test/natal-chart-details.test.js`

Full regression:

Bash

`npm test`

Manuelle Checks:

`/overview`

Reduced Motion

Mobile 320px

Desktop

Titelanimation nur auf markierten Elementen

keine Demo-Daten

keine falschen 0°-Fallbacks

Acceptance criteria:

Focused Tests grün.

`npm test` grün.

Manuelle Reviewpunkte dokumentiert.

Rollback note:

RollingText Enhancement entfernen.

Pro-Wheel auf alte Komponente zurücksetzen.

Datenvertrag nur zurückrollen, wenn Backcompat unmöglich ist.

---

## 11. Validation Strategy

### Pflicht-Kommandos

Bash

`npm test`

Focused:

Bash

`node --test test/overview-model.test.js
node --test test/natal-chart-wheel.test.js
node --test test/rolling-text.test.js`

Wenn vorhanden:

Bash

`node --test test/view_model.test.js
node --test test/natal-chart-details.test.js
node --test test/page-render-integration.test.js`

### Manuelle Prüfung

CheckErwartung

OverviewBirthchart ist primärer visueller Anker

ASCliegt links, wenn ASC vorhanden

Häuserechte Cusps, nicht pauschal 30°

BodiesPlanetenglyphen, nicht Zeichenglyphen

AspekteLinien verbinden technische Keys

Missing DataWarning statt Fake

Reduced Motionkeine Scramble-Animation

Mobilekein horizontaler Overflow

TypographyBody Copy bleibt ruhig

---

## 12. Rollback and Safety

### RollingText Rollback

`1. enhanceMountedPage-Aufruf entfernen.
2. data-roll-text ignorieren.
3. RollingText.js kann inert bleiben oder entfernt werden.`

### Birthchart Rollback

`1. NatalChartWheel.js auf vorherigen Stand zurücksetzen.
2. Overview-Layout zurücksetzen.
3. chartWheel-Backcompat-Felder nicht entfernen, wenn andere Views sie brauchen.`

### Normalizer Rollback

Nur zurückrollen, wenn Tests zeigen, dass Upstream-Payloads zwingend anders sind. Der alte `?? 0`-Fallback sollte nicht wieder eingeführt werden.

---

## 13. Execution Handoff

Start:

Bash

`git checkout -b feat/pro-birthchart-rolling-text
npm test`

Dann:

`1. Baseline notieren.
2. Datenvertrag-Tests schreiben.
3. Mappings + Normalizer korrigieren.
4. overviewModel erweitern.
5. NatalChartWheel Pro implementieren.
6. Optional NatalChartDetails.
7. RollingText Entry-only bauen.
8. Mount-Integration.
9. Full regression.`

Stop and ask if:

`/api/azodiac/profile` keine Häuser/Winkel/Aspekte liefert.

Bestehende Tests auf altem `glyph = signGlyph`-Vertrag bestehen.

Product entscheidet gegen ASC-left Orientierung.

RollingText auf alle Texte statt nur Titel angewendet werden soll.

Ein neuer Endpoint verpflichtend wird.

Commit strategy:

`1. tests/chart-contract
2. data-contract-and-normalizer
3. pro-wheel
4. overview-integration
5. rolling-text-entry
6. final-regression-docs`

---

## 14. Plausibility and Truth Self-Check

CheckErgebnis

Goal unter 4000 Zeichenja, Goal-Forge-Block gezählt

Repo-Fakten erfunden?nein; bekannte Fakten stammen aus vorheriger Codeinspektion, offene Punkte sind markiert

Harte Risiken sichtbar?ja: Fake-0°, Body-Key-Bruch, Stub-Grenzen, Motion-Komplexität

Plan kleiner als Rewrite?ja

Neue Dependencies vermieden?ja

Backout realistisch?ja

Stärkstes GegenargumentZwei Features in einem Plan erhöhen Kopplung und Review-Komplexität

GegenmaßnahmeSequenzierung P0/P1/P2/P3 und Scroll-Re-Scramble nicht im MVP

Failure Mode:

`Wenn `name` von "Moon" auf "Mond" geändert wird,
dann findet das Wheel Aspect-Endpunkte nicht mehr,
dann verschwinden Aspektlinien ohne sichtbaren Fehler.
Mitigation: `key`, `sourceKey`, `targetKey` als stabiler technischer Vertrag testen.`

Zweiter Failure Mode:

`Wenn fehlende Longitude zu 0 normalisiert wird,
dann erscheinen Bodies fälschlich auf 0° Widder,
dann wirkt das Wheel professionell, ist aber faktisch falsch.
Mitigation: kein 0-Fallback; fehlende Werte erzeugen Warning oder werden nicht gerendert.`

Final readiness:

`draft-with-assumptions`

Nicht `ready-for-execution`, bis TASK-001 die aktuelle Repo-Baseline und Page-Mount-Integrationspunkte bestätigt hat.

## Meta-Status

**Kategorie:** (2) Faktisch + ableitbar

**Datenbasis:** bisherige Codeinspektion, Screenshots, Referenzbild, vorheriger Testlauf; aktuelle Upload-File-Search ohne Treffer

**Unsicherheit:** Live-Payload und Browserlayout müssen vor finaler Umsetzung geprüft werden

**Kritischer Punkt:** Der Dev Brief ist nach den Korrekturen real integrierbar, aber nur, wenn Datenvertrag und Normalizer vor SVG-/Motion-Politur umgesetzt werden.

ENTWICKLERMO
