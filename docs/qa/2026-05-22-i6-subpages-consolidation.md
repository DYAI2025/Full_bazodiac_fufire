# I6: Unterseiten visuell konsolidieren — QA Review

**Date:** 2026-05-22  
**Iteration:** I6  
**Status:** PASS

---

## Iterationsziel

DailyPage, HousesPage, FusionPage, WuxingPage, WesternPage, BaziPage, SynastryPage nutzen einheitliche Typo-/Section-Komponenten: `bz-h1` Design-Token auf Hero-Überschriften, `data-section` Attribute auf Hauptsektionen, RollingText-Animation auf den 6 Pages mit Hero-Titel (SynastryPage out-of-scope — eigene State-Machine, separates Scope).

---

## Testcommands

```bash
npm test
# → 714/726 pass, 0 fail, 12 skipped

node --test test/subpages-typo-consistency.test.js
# → 20/20 pass

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/subpages-consistency.spec.js --config=playwright.config.mjs
# → 14 passed (15.9s)
```

---

## Audit-Ergebnis (vor Änderungen)

| Seite | bz-h1 | data-section | RollingText | Zeilen |
|---|---|---|---|---|
| DailyPage | ✗ | ✗ | ✓ | 557 |
| HousesPage | ✗ | ✗ | ✗ | 115 |
| FusionPage | ✗ | ✗ | ✓ | 286 |
| WuxingPage | ✗ | ✗ | ✗ | 219 |
| WesternPage | ✗ | ✗ | ✗ | 188 |
| BaziPage | ✗ | ✗ | ✗ | 180 |
| SynastryPage | ✗ | ✗ | ✗ | 983 |

**3 häufigste Lücken:** Kein `bz-h1` (7/7), kein `data-section` (7/7), kein RollingText (5/7).

---

## Browser / Viewport

- Chromium (Playwright default, 1280×720)
- Server: PORT=4100 node server.js

---

## Screenshots

| Seite | Screenshot |
|---|---|
| BaziPage Hero | docs/qa/screenshots/i6-subpages/bazi-hero.png |
| WesternPage Hero | docs/qa/screenshots/i6-subpages/western-hero.png |
| WuxingPage Hero | docs/qa/screenshots/i6-subpages/wuxing-hero.png |
| FusionPage Hero | docs/qa/screenshots/i6-subpages/fusion-hero.png |
| HousesPage Hero | docs/qa/screenshots/i6-subpages/houses-hero.png |
| DailyPage Hero | docs/qa/screenshots/i6-subpages/daily-hero.png |
| SynastryPage Hero | docs/qa/screenshots/i6-subpages/synastry-hero.png |

---

## Implementierte Änderungen

| Datei | Art |
|---|---|
| `public/src/pages/HousesPage.js` | + RollingText import, h1.page-title→bz-h1+data-page-title, data-section auf header+content-section, RollingText wiring |
| `public/src/pages/WuxingPage.js` | + RollingText import, h1+bz-h1, alle h2.layer-title+bz-h2, data-section auf header+3 Sektionen, RollingText wiring |
| `public/src/pages/WesternPage.js` | + RollingText import, h1+bz-h1, alle h2.layer-title+bz-h2, data-section auf 4 Sektionen, RollingText wiring |
| `public/src/pages/BaziPage.js` | + RollingText import, h1+bz-h1, data-section auf header+3 Sektionen, RollingText wiring |
| `public/src/pages/FusionPage.js` | h1.insight-hero__title+bz-h1, h2+bz-h2 (3x), data-section auf hero+wheel+narrative+remediation, RollingText className-Update auf bz-h1 |
| `public/src/pages/DailyPage.js` | h1.daily-title+bz-h1+data-page-title, data-section="hero" auf daily-header, RollingText className-Update auf bz-h1 |
| `public/src/pages/SynastryPage.js` | bare h1→h1.bz-h1, data-section="hero" auf page-header |
| `test/subpages-typo-consistency.test.js` | Neu: 20 Source-Scan-Tests (bz-h1, data-section, RollingText-Import pro Seite) |
| `test/e2e/subpages-consistency.spec.js` | Neu: 14 Playwright-Tests (Hero-Visibility + data-section-Count pro Seite) |
| `docs/qa/screenshots/i6-subpages/` | 7 Hero-Screenshots |

---

## Architektur-Highlights

- **Minimalinvasiv:** Keine neue `SubpageShell`-Komponente erfunden — bestehende `bz-h1`/`bz-h2` Design-Tokens auf existierende Headings angewendet. CSS-Definitionen (main.css:2297-2304) waren bereits vorhanden.
- **`data-page-title` Marker:** Neuer Attribut-Anker auf Hero-h1 erlaubt zuverlässige Selektion für RollingText-Wiring auch nach `innerHTML`-Refresh.
- **RollingText pro Page:** 4 neue RollingText-Wirings (Houses, Wuxing, Western, Bazi). Bestehende I2-Wirings (Daily, Fusion) um `bz-h1` className erweitert.
- **SynastryPage minimal:** Nur Typo + data-section, KEIN RollingText (983-Zeilen State-Machine, Risiko > Nutzen — separates Scope).
- **`data-section` Hierarchie:** Hero immer `data-section="hero"`, content-spezifische Werte sonst (`distribution`, `properties`, `plan`, `cores`, `planets`, `activations`, `pillars`, `day-master`, `luck-pillar`, `wheel`, `narrative`, `remediation`, `content`).

---

## Code Review

- Keine Fake-Daten, keine hardcodierten astrologischen Werte
- Backend-Architektur unberührt (server.js, FuFire-Proxy nicht angefasst)
- REQ-F-004 (Hero-Struktur): jede Subpage hat klare Hero-Section mit `data-section="hero"` ✓
- REQ-A-002 (ViewModels statt rohe API-Pfade): nichts geändert, Pages nutzen weiterhin ihre Domain-Enrichments ✓
- REQ-NF-001 (Playwright-Live-Browser-Test): 14 Tests, 7 Screenshots ✓

Constraint-Check:
```
grep -l "FUFIRE_ENDPOINTS\|callFuFire" public/src/pages/*.js
# → keine Treffer (Backend-Logik nicht berührt)
```

---

## Findings

Keine Critical/Major Findings.

**Minor (gelöst):**
- HousesPage hatte keine `data-section` Attribute, kein RollingText: beides hinzugefügt.
- WuxingPage h2-Elemente nutzten nur `.layer-title` ohne Design-Token-Klasse: alle 3 mit `bz-h2` erweitert.
- WesternPage: identischer Fall wie WuxingPage, 3 h2 erweitert.
- BaziPage: identischer Fall, plus 3 Sektionen ohne data-section.
- FusionPage: 3 unbeklasste h2-Elemente und keine data-section auf den 3 Hauptsektionen — beides ergänzt.
- DailyPage RollingText hatte `className: 'daily-title'` ohne `bz-h1` — auf `'daily-title bz-h1'` erweitert.
- FusionPage RollingText hatte `className: 'insight-hero__title'` ohne `bz-h1` — auf `'insight-hero__title bz-h1'` erweitert.

---

## Scope-Ausnahme

**SynastryPage** (983 Zeilen, eigene Drei-Zustand-State-Machine `STATE_LOADING/STATE_READY/STATE_EMPTY/STATE_ERROR`) bekam **nur** `bz-h1` + `data-section`, **kein** RollingText-Umbau. Begründung: zu hohes Regressionsrisiko gegenüber visuellem Gewinn auf einer Eingabe-Page mit dominanten Forms. Separates Scope-Item für I7/I8.

---

## Finaler Status: PASS
