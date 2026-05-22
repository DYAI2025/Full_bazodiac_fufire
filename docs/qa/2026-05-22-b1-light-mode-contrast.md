# QA Report: B1 — Globaler Light-Mode-Kontrast

**Iteration:** B1
**Datum:** 2026-05-22
**Reviewer:** Claude
**Plan-Referenz:** `docs/plans/2026-05-22-iteration-gates-implementation.md`

---

## /goal

/goal
Goal: Alle 8 Hauptseiten in Morning-Theme ohne unlesbare Texte auf dunklen Panels

Ziel. In `data-theme="morning"` rendern derzeit Panels, Cards und Surfaces mit
dunklem Hintergrund (#1A1C1E) waehrend der Text auf das helle `var(--bz-ink)` umschaltet.
Das Ergebnis ist fast unsichtbarer Text auf fast-schwarzem Hintergrund auf jeder
Hauptseite. Fix: `--panel`, `--card`, `--text-muted`, `--text-strong` und verwandte
Surface-Tokens im morning-Recipe von tokens.css ueberschreiben, sodass alle Consumer
automatisch auf helle Surfaces wechseln.

Scope. `public/src/styles/tokens.css` — ausschliesslich das Morning-Recipe
(`[data-theme="morning"]`). Keine Aenderungen an Komponenten, Seiten oder main.css
ausser diese haben eigene Farb-Hardcodes.

Bedingungen (hart).
- TDD-first: Vor Implementierung muss ein fehlschlagender Test existieren.
- Kein Abschluss ohne Playwright-Live-Test, Screenshots und Code Review.
- Review-Fix-Review wird wiederholt, bis keine Critical/Major Findings offen sind.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte, keine Backend-Architekturverletzung.

Akzeptanzkriterien.
- Kein Text-Element auf Panel-/Card-Background in morning-Mode hat dunkle Textfarbe auf dunklem Hintergrund.
- `npm test` gruen.
- Playwright-E2E-Test gruen fuer alle 8 Seiten in desktop+mobile × dark+light.
- Screenshot-Matrix vollstaendig (4 Variants pro Seite).

Explizit out-of-scope.
- Kein Backend-Refactor.
- Keine neuen Komponenten.
- Keine Aenderungen am Routing.

Done-Definition. Iteration nur abgeschlossen wenn Tests, Playwright-Live-Test,
Screenshot-Matrix, optischer Review und Code Review bestanden sind.

Zeichenzahl: <1000

Reference-Doc: docs/qa/2026-05-22-b1-light-mode-contrast.md

---

## Implementierte Aenderungen

_Wird nach Implementierung ausgefuellt._

## Testbefunde — Failing test (TDD-Red)

_Wird nach erstem Testlauf ausgefuellt._

## Implementierte Aenderungen

_Wird nach Fix ausgefuellt._

## Playwright-Live-Test

_Wird nach Playwright-Run ausgefuellt._

## Screenshots

_Wird nach Screenshot-Capture ausgefuellt._

## Optischer Review

_Manuell — noch ausstehend._

## Code Review

_Noch ausstehend._

## Fix-Runden

_Wird waehrend Review-Fix-Cycle ausgefuellt._

## Abschlussstatus

_Ausstehend._
