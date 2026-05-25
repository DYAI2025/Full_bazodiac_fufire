# I3: Birthchart Wheel Professional — QA Review

**Date:** 2026-05-22  
**Iteration:** I3  
**Status:** PASS

---

## Iterationsziel

Birthchart Wheel professionell machen: ASC-left, Grad-Ticks, Planetenglyphen mit Kollisionsauflösung, Aspect-Legende und Daten-Audit — alle Werte nachvollziehbar und provenance-tagged.

---

## Testcommands

```bash
node --test test/overview-model.test.js
# → 17/17 pass

node --test test/natal-chart-wheel.test.js
# → 19/19 pass

node --test test/natal-chart-audit.test.js
# → 7/7 pass

npm test
# → 673/682 pass, 0 fail, 9 skipped

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/i3-wheel.spec.js --config=playwright.config.mjs
# → 3 passed (3.8s)
```

---

## Browser / Viewport

- Chromium (Playwright default), 1280×720
- Server: PORT=4100 node server.js

---

## Screenshots

| Test | Screenshot |
|------|------------|
| Overview — no profile | docs/qa/screenshots/i3-wheel/overview-no-profile.png |
| Overview — with wheel | docs/qa/screenshots/i3-wheel/overview-with-wheel.png |
| Overview — audit panel | docs/qa/screenshots/i3-wheel/overview-audit.png |
| Method page | docs/qa/screenshots/i3-wheel/method-page.png |

---

## Implementierte Änderungen

| Datei | Art |
|-------|-----|
| `public/src/components/NatalChartWheel.js` | Komplett überarbeitet: ASC-left, 3 Tick-Layer, Glyphen, Kollisions-Lanes, Leader-Lines |
| `public/src/components/NatalChartAudit.js` | Neu: Daten-Audit-Panel (Provenance-Pills, Aspekt-Legende, Missing-Warning) |
| `public/src/domain/overviewModel.js` | CANONICAL_BODIES-Mapping, source-Feld (api/missing), anglesSource |
| `public/src/pages/OverviewPage.js` | NatalChartAudit importiert und unterhalb des Wheels gemountet |
| `public/src/styles/main.css` | I3-Wheel- und Audit-Stile hinzugefügt |
| `public/src/styles/tokens.css` | Semantische Color-Aliases (--color-aspect-*, --bg-base, --color-warn) |
| `test/overview-model.test.js` | 6 neue I3-Datenvertrag-Tests |
| `test/natal-chart-wheel.test.js` | 8 neue I3-Tests (longitudeToChartAngle, Ticks, Glyphen, Kollision) |
| `test/natal-chart-audit.test.js` | Neu: 7 Audit-Komponenten-Tests |
| `test/e2e/i3-wheel.spec.js` | Neu: Playwright-Spec für Wheel-Rendering |
| `test/css-selector-coverage.test.js` | ALLOW_KNOWN_TEMPLATE für BEM-Template-Modifier erweitert |

---

## Architektur-Highlights

- **ASC-left invariant:** `longitudeToChartAngle(ascDeg, ascDeg) === 180` für alle Charts; exportiert für direkte Unit-Tests
- **Tick-Schichtung:** 360 minor + 72 medium + 36 major, kumulativ (nicht exklusiv)
- **Kollisionserkennung:** Bodies mit Δ < 6° landen auf aufeinanderfolgenden Lanes mit Leader-Lines zurück zur echten Position
- **source='missing' Schutz:** Bodies ohne Longitude werden NIE als 0°-Dot gerendert — nur im Audit sichtbar
- **Daten-Provenienz:** Jede Planetenzeile hat eine Pill (api|derived|missing), fehlende Bodies zeigen "Daten fehlen"
- **Aspekt-Legende:** 3 Buckets (hard/soft/neutral) mit Typ-Bezeichnung und Orb

---

## Code Review

- Keine Fake-Daten, keine hardcodierten astrologischen Werte
- Backend-Architektur unberührt
- REQ-D-001: Longitude null → nie 0° → bestätigt durch Unit-Test und Playwright
- REQ-D-003: Provenance-Pills sichtbar in Audit-Panel
- `longitudeToChartAngle` exportiert und durch Unit-Test für ASC/IC/DSC/MC abgesichert

---

## Findings

Keine Critical/Major Findings.

**Minor (gelöst):**
- `longitudeToChartAngle`: Initiale Implementierung hatte falsche Richtung (CCW vs CW); korrigiert zu `(180 + delta) % 360`
- Ticks: Initiale Implementierung exklusiv (36+36+288=360 total); Spec verlangt kumulativ (360+72+36=468 total)
- `el()` in NatalChartAudit: `appendChild(createTextNode(...))` nicht von `serializeFakeTree` erfasst; geändert zu `node.textContent = ...`
- CSS-Variablen (`--color-aspect-*`, `--bg-base`, `--color-warn`) zu tokens.css hinzugefügt

---

## Finaler Status: PASS
