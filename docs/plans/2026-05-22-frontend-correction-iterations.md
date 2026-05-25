# Frontend Correction — Master Integration Plan (I0 → I9)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to walk the iteration chain. This master document is the orchestration layer; each iteration has its own per-task plan that you must follow when executing that iteration.

**Plan path:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference spec:** `docs/plans/full_plan_to_fix40.md`
**Status:** ready-for-execution-with-gated-iterations
**Owner / Executor:** coding agent + engineer + product owner
**Last updated:** 2026-05-22

---

<!-- GOAL_START -->

**Goal: Bazodiac Frontend sichtbar und pruefbar auf Zielzustand bringen.**

Ziel. Alle bisher identifizierten Maengel werden als messbare Fixing-Auftraege umgesetzt: Rolling Letters, professionelles Zodiac/Birthchart Wheel, konsistentes Premium-Design, korrekte Typografie, belastbare API-/Daten-Provenienz und sichtbare Nutzerverbesserung. Jede Iteration liefert einen im Browser sichtbaren, testbaren Fortschritt und darf erst abgeschlossen werden, wenn Playwright-Review, Screenshot-Dokumentation und Code Review ohne offene Fehler bestanden sind.

Scope. Zielrepo: `Full_bazodiac_fufire-main`. Primaere Dateien: `public/src/**`, `public/index.html`, `server.js`, `test/**`, `docs/plans/**`, `docs/qa/**`, `package.json`. Backend-Architektur, FuFire-Rechenkern und API-Vertraege bleiben stabil; Backend-Code darf nur fuer nachweisbare Health-/Config-/Provenienzfehler minimal korrigiert werden.

Bedingungen (hart):

- TDD-first: vor jeder fachlichen Implementierung muss ein fehlschlagender Test existieren.
- Jede Iteration endet mit Playwright-Live-Browser-Test, dokumentierten Screenshots und Code Review.
- Review-Fix-Review wird wiederholt, bis keine offenen Critical/Major-Findings verbleiben.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte, keine kosmetische Erfolgsmeldung ohne sichtbare Browser-Aenderung.
- Backend-Architektur, API-Shape und FuFire-Proxy-Logik bleiben erhalten, ausser ein Defekt erzwingt eine minimal dokumentierte Korrektur.

Akzeptanzkriterien (Goal-level):

1. Rolling Letters sind im echten Browser sichtbar animiert und respektieren Reduced Motion.
2. Birthchart Wheel ist optisch und technisch deutlich verbessert: ASC-left, Grad-Ticks, Glyphen, Labels, Aspect-Legende, Daten-Audit.
3. Ziel-Design ist als globaler visueller Wechsel sichtbar, nicht nur in einzelnen Ueberschriften.
4. Playwright-Screenshots belegen Vorher/Nachher fuer Overview, Western, BaZi, Wu-Xing, Fusion, Tagespuls, Haeuser, Beziehung, Daten, Methode.
5. Code Review bestaetigt: keine Backend-Architekturverletzung, keine Fake-Daten, keine offenen Critical/Major Findings.

Explizit out-of-scope:

- Kein Rewrite des Backend-Rechenkerns.
- Keine neuen astrologischen Berechnungen im Frontend ausser SVG-Geometrie/Visualisierung.
- Keine neue Produktfunktion ausser den Korrekturen der bestehenden Zielanforderungen.
- Keine DB-/Persistenzmigration.
- Keine direkte Aenderung an Produktions-Secrets oder Deployment-Credentials.

Done-Definition. Der Plan ist abgeschlossen, wenn alle Iterationen PASS haben: Node-Tests, Playwright-Live-Browser-Tests, Screenshot-Dokumentation, Code Review, optischer PO-Review und Abschlussbericht unter `docs/qa/2026-05-22-final-acceptance.md`.

<!-- GOAL_END -->

---

## 1. Iterationsuebersicht (Sprintziele zuerst)

Jede Iteration hat einen eigenen ausfuehrbaren Plan im writing-plans-Format. Der **Iterationsziel**-Eintrag ist der Sprint-Anker — ohne sichtbare Erfuellung im Browser kein Abschluss.

| Iter | Iterationsziel | Sichtbarer Nutzer-Unterschied | Abschluss nur bei | Plan |
|------|----------------|-------------------------------|-------------------|------|
| **I0** | QA-Gates und Playwright-Basis erzwingen | Noch keine Produktveraenderung, aber harte Abnahmemaschine | Playwright laeuft lokal/live, Screenshots gespeichert | [I0 Plan](./2026-05-22-i0-qa-gate-playwright.md) |
| **I1** | Design-System entkoppeln und Legacy-CSS brechen | App sieht nicht mehr wie alter Prototyp aus | Fonts, Farben, Spacing, Cards, Header global sichtbar geaendert | [I1 Plan](./2026-05-22-i1-design-system.md) |
| **I2** | Rolling Letters wirklich animieren | Titel/Brand-Elemente haben sichtbaren, kontrollierten Letter-Roll | Browservideo/Screenshots + RAF/Reduced-Motion Tests | [I2 Plan](./2026-05-22-i2-rolling-letters.md) |
| **I3** | Birthchart Wheel professionell machen | Wheel wird zentraler visueller Anker, nicht duennes Wireframe | ASC-left, Ticks, Glyphen, Aspekte, Audit-Liste sichtbar | [I3 Plan](./2026-05-22-i3-birthchart-wheel.md) |
| **I4** | Overview auf Ziel-Hero umbauen | Startseite entspricht strukturell dem Zielbild | Hero: Wheel links/gross, Fusion-Narrativ rechts, klare Section-Hierarchie | [I4 Plan](./2026-05-22-i4-overview-hero.md) |
| **I5** | API-/Daten-Provenienz pruefbar machen | Nutzer/PO sieht, welche Daten echt, live, fallback oder fehlend sind | Methode/Daten-Seite trennt Code-Katalog, Upstream-Status, UI-Nutzung | [I5 Plan](./2026-05-22-i5-api-provenance.md) |
| **I6** | Unterseiten visuell konsolidieren | Tagespuls, Haeuser, Fusion, Wu-Xing wirken wie ein Produkt | Alle Hauptseiten nutzen einheitliche Layout-/Typo-Komponenten | [I6 Plan](./2026-05-22-i6-subpages-consolidation.md) |
| **I7** | Navigation und Redundanzen reduzieren | Weniger Tab-Ueberladung, klarere Wege | IA-Review + Playwright-Navigationstest | [I7 Plan](./2026-05-22-i7-navigation.md) |
| **I8** | Visuelle Regression und Code-Review-Haertung | Gruene Tests beweisen Produktanforderungen, nicht nur DOM-Marker | Playwright-Snapshot, strikte Assertions, kein offener Major | [I8 Plan](./2026-05-22-i8-test-hardening.md) |
| **I9** | Finales PO-Acceptance-Bug-Bash | Vollstaendiger sichtbarer Zielzustand | PO-Checkliste, Browser-Screenshots, Code Review, Abschlussbericht | [I9 Plan](./2026-05-22-i9-final-acceptance.md) |

**Abhaengigkeiten:** I0 ist Voraussetzung fuer alle weiteren. I1 vor I4/I6 (PageShell-Bausteine). I2 + I3 vor I4 (Hero verwendet RollingText + Wheel). I4 + I6 + I7 vor I8 (Visual Baselines erst nach Designstabilitaet). I8 vor I9.

---

## 2. Requirements (gemeinsame Goal-Reference)

| ID | Type | Statement | Verifiziert in Iteration |
|----|------|-----------|--------------------------|
| REQ-F-001 | functional | Rolling Letters muessen im echten Browser sichtbar animieren. | I2, I8, I9 |
| REQ-F-002 | functional | Reduced Motion deaktiviert Rolling Letters vollstaendig. | I2, I9 |
| REQ-F-003 | functional | Birthchart Wheel muss ASC-left, Grad-Ticks, Glyphen, Hauskuspen, Aspekte und Daten-Audit zeigen. | I3, I8, I9 |
| REQ-F-004 | functional | Overview muss Ziel-Hero-Struktur erhalten: grosses Wheel, Fusion-Narrativ, Key Facts, Sections. | I4, I8, I9 |
| REQ-F-005 | functional | Methode/Daten-Seiten muessen API-Code, Live-Status, UI-Nutzung und Raw Data trennen. | I5, I9 |
| REQ-F-006 | functional | Alle Ist-Details bleiben erreichbar, aber nicht als unkuratiertes Datenband. | I4, I6, I7, I9 |
| REQ-NF-001 | non-functional | Jede Iteration muss Playwright-Live-Browser-Test mit Screenshots enthalten. | I0–I9 |
| REQ-NF-002 | non-functional | Jede Iteration braucht Code Review nach optischem Review. | I0–I9 |
| REQ-NF-003 | non-functional | Review-Fix-Review wiederholen bis keine Critical/Major Findings offen sind. | I0–I9, I8 (Gate) |
| REQ-D-001 | data | Keine fehlende Longitude darf als 0 Grad interpretiert werden. | I3, I8, I9 |
| REQ-D-002 | data | API-Existenz darf nicht als UI-Nutzung behauptet werden. | I5, I9 |
| REQ-D-003 | data | Wheel zeigt klar, welche Werte echt, abgeleitet, fallback oder fehlend sind. | I3, I9 |
| REQ-A-001 | architecture | Backend-Architektur, FuFire-Proxy und API-Vertrag bleiben erhalten. | I5, I9 |
| REQ-A-002 | architecture | Frontend nutzt ViewModels, nicht rohe API-Feldpfade in Komponenten. | I3, I8, I9 |
| REQ-A-003 | architecture | Keine neue Framework-Migration; Vanilla ESM bleibt. | I1, I9 |
| REQ-S-001 | security/privacy | Keine echten Geburtsdaten, Secrets oder Tokens in Screenshots/Logs commiten. | I0–I9, I9 (Final Sweep) |
| REQ-O-001 | observability | Abschlussbericht listet Testbefehle, Browser, URL, Screenshots und offene Risiken. | I9 |

---

## 3. Globaler Review-Fix-Review-Zyklus (jede Iteration)

```
1. TDD Red          → Failing Test fuer Iterationsanforderung schreiben + dokumentieren
2. Implementation   → Minimal implementieren bis Focused Test gruen
3. Regression       → npm test (kein neuer Skip ohne Begruendung)
4. Playwright Live  → App starten, npm run test:e2e, Screenshots speichern (Desktop + Mobile, wo UI betroffen)
5. Optischer Review → Screenshots vs Ziel; Findings klassifizieren:
                       • Critical: Feature fehlt / Daten falsch / App kaputt
                       • Major: sichtbar nicht zielerfuellend / A11y schwer defekt
                       • Minor: Politur ohne Kernrisiko
6. Code Review      → Architekturgrenzen / Fake-data-guard / A11y / Testqualitaet / CSS-Konsistenz / Animation cleanup
7. Fix & Repeat     → Critical/Major: zurueck zu 2 oder 3. Abschluss erst bei 0 Critical/Major.
8. Iteration Close  → QA-Dokument ausfuellen, Screenshots verlinken, Testcommands notieren, Minor mit PO-Entscheidung.
```

Diese 8 Schritte sind in jedem per-iteration-Plan als Definition of Done verankert.

---

## 4. Mangelliste → Fixing-Auftrag → Iteration

| Mangel (aus Gap-Analyse) | Fixing-Auftrag | Iteration |
|--------------------------|----------------|-----------|
| RollingText splittet nur Zeichen, animiert aber nicht | RAF-/Scramble-Engine mit Reduced Motion + Browserbeleg | I2 |
| Wheel bleibt duennes Wireframe | Pro-Wheel mit ASC-left, Ticks, Glyphen, Collision, Aspect-Legende, Audit | I3 |
| Ziel-Design nicht erreicht | Design Tokens konsolidieren, Overview-Hero umbauen, Unterseiten vereinheitlichen | I1, I4, I6 |
| Schriftart nur teilweise angepasst | Globale Typografie-Komponenten + Token-Integrity-Tests | I1, I6 |
| Legacy CSS ueberschreibt neues Design | Token-Integrity Tests und CSS-Konsolidierung | I1 |
| API-Codes vorhanden, Nutzung unklar | Provenienzmatrix (known/reachable/used/fallback/unknown) | I5 |
| Methode-Seite wirkt Debug-roh | Kuratierte Methode/Daten-Seite, Rohdaten einklappbar | I5 |
| Tests pruefen zu schwach | Strikte semantische Assertions + Visual Regression | I8 |
| Navigation zu breit/redundant | Routing-Kategorien + reduzierte Hauptnavigation | I7 |
| Keine sichtbare Abnahme | Playwright Gate + Screenshots je Iteration | I0–I9 |
| Gefahr Fake-0-Grad-Daten | Normalizer- + Wheel-Contract Tests | I3, I8 |
| Backend-Architektur koennte verletzt werden | Diff-Audit pro Iteration, finaler Architecture Review | I5, I9 |

---

## 5. Validation Strategy (Master-Level)

**Pflicht-Commands je Iteration:**

```bash
npm test
APP_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
# Wenn Deployment-Preview erreichbar:
APP_BASE_URL=<DEPLOYED_PREVIEW_OR_PRODUCTION_URL> npm run test:e2e
```

**Optional (nur wenn FuFire-Live-Contract erlaubt + Env vorhanden):**

```bash
npm run test:contract
```

**Browser-Matrix (Minimum je Iteration):**

- Chromium desktop (1440 × 900)
- Chromium mobile viewport (390 × 844)
- Reduced Motion emulation fuer RollingText-Iteration (I2 + Visual Baseline I8)
- Optional Firefox/WebKit nur fuer finalen Acceptance Sprint (I9)

**Screenshot-Pflicht (Verzeichnis-Standard):**

```
docs/qa/screenshots/i<iteration>-<slug>/
  overview-desktop.png
  overview-mobile.png
  wheel-closeup.png
  method-desktop.png
  ...
```

Jede Iteration dokumentiert mindestens die betroffenen Seiten. **I9 muss alle 11 Hauptseiten (Desktop + Mobile) dokumentieren.**

**Manual Review Checklist (jede Iteration):**

1. Sieht der Nutzer einen klaren Unterschied?
2. Ist das Feature im Browser sichtbar, nicht nur im Code?
3. Sind Datenquellen und Fallbacks klar?
4. Stimmen Typografie, Farben und Abstaende systemweit?
5. Gibt es horizontale Mobile-Overflow-Probleme?
6. Sind keine Secrets oder privaten Daten sichtbar?
7. Sind alte Debug-/Raw-Elemente kuratiert oder eingeklappt?
8. Ist der Code kleiner/sauberer oder mindestens nicht chaotischer?

**Automated QA-Gate (ab I8 verpflichtend):**

```bash
node scripts/qa-iteration-gate.mjs docs/qa/2026-05-22-i<N>-<slug>.md
```

Script wird in **I8** gebaut, ab I9 verpflichtend fuer Final Acceptance.

---

## 6. Rollback & Safety

- Jede Iteration in eigenem Branch oder eindeutigem Commit-Block.
- **Keine** direkten Commits auf `main`.
- Backend-Aenderungen nur mit separatem Review + Begruendung. Default: `server.js` bleibt unangetastet.
- Playwright-Baselines nur nach PO-Zustimmung aktualisieren (`--update-snapshots` ist in CI blockiert, siehe I8 Gate).
- Screenshots vor Commit auf Secrets / private Daten pruefen.
- Bei Wheel-Datenunsicherheit: UI zeigt "Daten fehlen" statt zu raten (siehe REQ-D-001 + I3).
- Bei API-Live-Fehler: Status `fallback` / `unreachable` rendern, nicht `ok` (siehe REQ-D-002 + I5).

---

## 7. Execution Handoff

**Start sequence:**

```bash
# 1. Bring up the repo
cd /Users/benjaminpoersch/Projects/codebase/Full_bazodiac_fufire-main
npm install
npm test                          # baseline: should pass before any iteration

# 2. Start mit I0 — Gate aufbauen
# Folge docs/plans/2026-05-22-i0-qa-gate-playwright.md task-by-task

# 3. Erst nach I0-Abschluss (PASS) zur naechsten Iteration
```

**Allowed files:**

- `public/src/**`
- `test/**`
- `docs/qa/**`
- `docs/plans/**`
- `package.json`
- Playwright config (`playwright.config.mjs`)
- `server.js` **nur** fuer minimal begruendete Health-/Config-/Provenienz-Fixes (dokumentiert in I5)

**Do not touch:**

- FuFire-Rechenkern
- API-Vertrag ohne explizite Entscheidung (FUFIRE_ENDPOINTS-Reihenfolge ist test-pinned)
- Datenbank / Persistenz
- Secrets / Env-Werte
- Produktionsdeployment direkt

**Stop and ask if:**

- Eine visuelle Anforderung echte Backend-Daten benoetigt, die nicht geliefert werden.
- `APP_BASE_URL` nicht verfuegbar ist und Live-Browser-Abnahme nicht moeglich ist.
- PO-Zielschrift / Brand-Font unklar bleibt und Mockup nicht ausreicht.
- Eine Backend-Aenderung groesser als Health-/Config-Provenienz wird.

---

## 8. Expected Final Artifacts

Beim Abschluss von I9 muessen folgende Artefakte existieren:

**Pläne (orchestration):**

- `docs/plans/2026-05-22-frontend-correction-iterations.md` (dieses Dokument)
- `docs/plans/2026-05-22-i0-qa-gate-playwright.md`
- `docs/plans/2026-05-22-i1-design-system.md`
- `docs/plans/2026-05-22-i2-rolling-letters.md`
- `docs/plans/2026-05-22-i3-birthchart-wheel.md`
- `docs/plans/2026-05-22-i4-overview-hero.md`
- `docs/plans/2026-05-22-i5-api-provenance.md`
- `docs/plans/2026-05-22-i6-subpages-consolidation.md`
- `docs/plans/2026-05-22-i7-navigation.md`
- `docs/plans/2026-05-22-i8-test-hardening.md`
- `docs/plans/2026-05-22-i9-final-acceptance.md`

**QA-Evidenz (per iteration):**

- `docs/qa/2026-05-22-i0-playwright-baseline.md`
- `docs/qa/2026-05-22-i1-design-system.md`
- `docs/qa/2026-05-22-i2-rolling-letters.md`
- `docs/qa/2026-05-22-i3-birthchart-wheel.md`
- `docs/qa/2026-05-22-i4-overview-hero.md`
- `docs/qa/2026-05-22-i5-api-provenance.md`
- `docs/qa/2026-05-22-i6-subpages-consolidation.md`
- `docs/qa/2026-05-22-i7-navigation.md`
- `docs/qa/2026-05-22-i8-test-hardening.md`
- `docs/qa/2026-05-22-final-acceptance.md`
- `docs/qa/templates/iteration-review-template.md`
- `docs/qa/code-review-checklist.md`
- `docs/qa/screenshots/i{0..9}-*/` (Vorher/Nachher fuer alle Hauptseiten)
- `docs/qa/visual-baselines/` (ab I8)

**Test-Evidence:**

- `npm test` PASS (full suite)
- `APP_BASE_URL=… npm run test:e2e` PASS (Playwright HTML report unter `playwright-report/`)
- `node scripts/qa-iteration-gate.mjs docs/qa/2026-05-22-final-acceptance.md` PASS

**Code-Evidence:**

- Git diff zeigt: keine Backend-Architekturverletzung
- Keine hardcodierten Sign-Namen / Grad-Literale in `public/src/components/` oder `public/src/pages/`
- Keine echten Geburtsdaten ausserhalb deklarierter Fixtures
- Keine Secrets im Repo

---

## 9. Goal-Forge Tie-In

Dieses Dokument hat einen `GOAL_START` / `GOAL_END`-Block (Abschnitt oben) als Anker fuer `/goal-forge`-konforme Goal-Tracking-Tools. Iterationsplaene referenzieren dieses Goal-Block ueber den Header-Link `Master Plan: ./2026-05-22-frontend-correction-iterations.md`.

Wenn `/goal-forge` oder ein anderer Tracker den Fortschritt prueft, soll er:

1. Den `GOAL_START`/`GOAL_END`-Block parsen.
2. Pro Iteration den jeweiligen `docs/qa/2026-05-22-i<N>-*.md`-Status lesen (Sektion "Finaler Status").
3. Akzeptanzkriterien (Section 1 oben) gegen die `docs/qa/2026-05-22-final-acceptance.md`-Tabelle abgleichen.
4. Bei einer FAIL/BLOCKED-Zelle dort die offene Iteration zurueckmelden.

---

## 10. Execution choice (per writing-plans skill)

Dieser Master-Plan ist orchestration-only. Pro Iteration steht eine eigene ausfuehrbare Datei bereit (Links in Tabelle 1).

**Empfohlene Ausfuehrungsstrategie:**

- **Subagent-Driven (sequenziell, ein Iteration pro Subagent)** — robusteste Variante: Hauptagent dispatcht pro Iteration einen frischen Subagent, reviewt zwischen Iterationen, fixt Findings.
- **Parallel Session (neuer Worktree pro Iteration)** — schneller, aber Konflikte in Shared Components (PageShell, RollingText, NatalChartWheel) muessen manuell gemergt werden. Empfohlen erst ab I6+, wenn Shared-Komponenten stabil sind.

Bei Start: `npm install && npm test` ausfuehren, dann `docs/plans/2026-05-22-i0-qa-gate-playwright.md` als erste Iteration durchziehen.
