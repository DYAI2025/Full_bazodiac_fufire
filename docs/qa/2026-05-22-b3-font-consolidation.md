# QA Report: B3 — Brand-Fonts auf Cormorant Garamond + Sora konsolidieren

**Iteration:** B3
**Datum:** 2026-05-22
**Plan-Referenz:** `docs/plans/2026-05-22-iteration-gates-implementation.md`

---

## /goal

/goal
Goal: Brand-Fonts auf Cormorant Garamond + Sora konsolidieren

Ziel. Das Frontend nutzt derzeit vier Brand-Fonts (Playfair Display, DM Serif Display,
Inter, Plus Jakarta Sans) und referenziert Space Mono ohne Import. B3 reduziert auf
genau zwei Brand-Fonts: Cormorant Garamond fuer Ueberschriften, Sora fuer UI und Body.
CJK-Glyph-Fallback (Noto Sans SC) bleibt als technischer Fallback.

Scope. `public/src/styles/tokens.css` (Imports + Tokens), `public/src/styles/main.css`
(hardcodierte Space-Mono-Referenzen + Inter-Fallback-Literale), `public/index.html`
(veralteter Kommentar).
Keine Aenderung an anderen Seiten, Backend, oder Routing.

Bedingungen (hart).
- TDD-first: Vor Implementierung muss ein fehlschlagender Test existieren.
- Kein Abschluss ohne Playwright-Live-Test, Screenshots und Code Review.
- Review-Fix-Review wird wiederholt, bis keine Critical/Major Findings offen sind.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte, keine Backend-Architekturverletzung.

Akzeptanzkriterien.
- Google Fonts @import laedt nur Cormorant Garamond, Sora, Noto Sans SC.
- `--bz-font-serif` und `--bz-font-display` beginnen mit Cormorant Garamond.
- `--bz-font-sans` und `--bz-font-ui` beginnen mit Sora.
- Kein Element in #app nutzt Playfair Display, DM Serif Display, Inter, Plus Jakarta Sans oder Space Mono.
- Ueberschriften (.page-title/.layer-title/.bz-h1/.bz-h2) haben Cormorant Garamond als primaere Font.
- Body-Text (p/li/.bz-body) hat Sora als primaere Font.
- Screenshot-Matrix fuer overview (Desktop+Mobile x Dark+Light).

Explizit out-of-scope.
- Kein Backend-Refactor.
- Keine Aenderungen an anderen Seiten ausser Font-Token-Nutzung.
- Keine neue Berechnung.

Done-Definition. Iteration nur abgeschlossen wenn alle Playwright-Assertions gruen,
npm test gruen, Screenshot-Matrix komplett, optischer Review und Code Review PASS.

Reference-Doc: docs/qa/2026-05-22-b3-font-consolidation.md

---

## Implementierte Aenderungen

| Datei | Aenderung |
|---|---|
| `public/src/styles/tokens.css` | @import auf Cormorant Garamond + Sora + Noto Sans SC reduziert; Token-Vars --bz-font-serif/display/sans/ui aktualisiert; Kommentar aktualisiert |
| `public/src/styles/main.css` | 3 hardcodierte 'Space Mono'-Referenzen durch var(--bz-font-mono) ersetzt; 6 var(--bz-font-ui, 'Inter'...) Fallbacks auf Sora aktualisiert; JetBrains-Mono-Kommentare bereinigt |
| `public/index.html` | Veralteter Font-Stack-Kommentar aktualisiert |
| `test/typography-rollout.test.js` | I1-Font-Import-Test auf B3 aktualisiert (Cormorant Garamond + Sora + Noto Sans SC; banned fonts assert doesNotMatch) |
| `test/e2e/b3-font-consolidation.spec.js` | Neuer E2E-Contract-Test: banned-font check auf 8 Seiten + heading/body serif/sans assertions + Screenshot-Matrix |

---

## Testbefehle

```bash
# B3 e2e font-contract test
APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e -- test/e2e/b3-font-consolidation.spec.js

# Vollstaendige Unit-Suite
npm test
```

---

## Playwright-Live-Test

| Assertion | Ergebnis |
|---|---|
| B3 overview — no banned brand fonts render | PASS |
| B3 bazi — no banned brand fonts render | PASS |
| B3 western — no banned brand fonts render | PASS |
| B3 wuxing — no banned brand fonts render | PASS |
| B3 daily — no banned brand fonts render | PASS |
| B3 synastry — no banned brand fonts render | PASS |
| B3 input — no banned brand fonts render | PASS |
| B3 method — no banned brand fonts render | PASS |
| B3 headings use Cormorant Garamond as primary serif | PASS |
| B3 body text uses Sora as primary sans | PASS |
| B3 screenshot matrix — overview page | PASS |
| (chromium-mobile) all 11 above | PASS |
| **Total** | **22/22 passed** |

Unit suite: **791 pass, 0 fail** (803 total, 12 skipped)

---

## Screenshots

```
docs/qa/screenshots/b3-font-consolidation/
  overview-desktop-dark.png    (329 KB)
  overview-desktop-light.png   (323 KB)
  overview-mobile-dark.png     (968 KB)
  overview-mobile-light.png    (948 KB)
```

---

## TDD Gate

- Failing test committed first: `cfe683c` — "test(e2e): B3 failing font-contract test — banned brand fonts still present"
- Heading selector adjusted after first run (overview without profile shows no `.page-title` → profile inject added to heading test)
- Final run: 22/22 green

---
