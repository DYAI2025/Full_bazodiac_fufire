# I9 — Final Acceptance & Architecture Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** Finales PO-Acceptance-Bug-Bash. Sichtbarer Nutzer-Unterschied: Vollstaendiger sichtbarer Zielzustand. Abschluss nur mit PO-Checkliste, Browser-Screenshots, Code Review, Abschlussbericht.

**Goal:** Gesamtes Frontend gegen Goal/Devbrief/Screenshots final abnehmen — alle Requirements REQ-* haben Status, alle Critical/Major Findings sind 0, Architektur-Audit bestanden.

**Architecture:** Diese Iteration produziert ausschließlich Dokumentation + ggf. Last-Minute-Fixes. Keine neuen Features. Keine Re-Architekturen. Audit per Skript + manueller Review-Pass.

**Tech Stack:** node --test, Playwright Full-Suite, ripgrep für Audit-Greps, qa-iteration-gate (I8).

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0–I8 abgeschlossen mit PASS.

---

## Sprintziel-Bezug

> Das Gesamtfrontend wird gegen Goal, Devbrief und Screenshots final abgenommen. Es gilt: kein Sprintabschluss durch Behauptung, nur durch Browserbeleg, Code Review und PO-Akzeptanz.

I9 ist der finale Acceptance Gate. Es darf in dieser Iteration **kein neues Feature** entstehen. Erlaubt sind ausschließlich:

- Dokumentations-Artefakte (final-acceptance.md, screenshots, audit logs)
- Last-Minute-Fixes für eindeutige Major/Critical-Findings, die sich aus dem Acceptance-Pass ergeben (und dann durch reduzierten Re-Run desselben Acceptance-Schritts belegt werden)
- Korrektur eindeutiger Doku-Inkonsistenzen

Alles Andere ist Scope von I0–I8 und gilt als verriegelt.

---

## TASK-I9-001 — End-to-End PO Acceptance Checklist ausführen

**Iterationsziel-Bezug:** Erfüllt das Iterationsziel direkt — produziert den maßgeblichen PO-Abnahmebericht.

**Requirement links:** ALL — REQ-F-001 … REQ-F-006, REQ-NF-001 … REQ-NF-003, REQ-D-001 … REQ-D-003, REQ-A-001 … REQ-A-003, REQ-S-001, REQ-O-001.

**Files:**
- create: `docs/qa/2026-05-22-final-acceptance.md`
- create: `docs/qa/screenshots/i9-final/` (Verzeichnis mit Screenshots aller 11 Hauptseiten × {desktop, mobile})
- update (optional, nur wenn Inkonsistenzen gefunden): `docs/plans/full_plan_to_fix40.md` (Errata-Block am Ende)

**Konstraint (must read first):**
> NO PASS for any REQ where evidence is only "code exists". Browser-screenshot or test-command output required.

Wenn die einzige verfügbare Evidenz "Datei XY enthält das Feature" lautet, ist der Status **FAIL** (oder maximal **BLOCKED**) — kein PASS.

### Schritte

#### Step 1 — Vorbereitung: lokale Umgebung sauber starten

```bash
# Aus Repo-Root
git status                                  # erwartet: clean working tree, branch fix/iteration-i9
node --version                              # >= 20
npm ci                                      # frische Installation
FUFIRE_BASE_URL="https://bafe-production.up.railway.app/" PORT=3000 npm start &
SERVER_PID=$!
sleep 3
curl -fsS http://127.0.0.1:3000/health | jq '.'   # erwartet: status ok, endpoints array, upstream ok
```

Erwartete Ausgabe von `/health`:

```json
{
  "status": "ok",
  "upstream": { "ok": true, "base": "https://bafe-production.up.railway.app/" },
  "endpoints": [ "...", "...", "..." ]
}
```

Bei Abweichung **abbrechen**, I0-Gate prüfen, Issue eröffnen, Acceptance erst nach Fix fortsetzen.

#### Step 2 — Vollständige Playwright-Suite einmal grün laufen lassen

```bash
APP_BASE_URL=http://127.0.0.1:3000 npx playwright test --reporter=list 2>&1 | tee docs/qa/i9-playwright-fullrun.log
```

Erwartet: `<N> passed, 0 failed, 0 flaky` in der letzten Zeile.
Speichert den vollständigen Run-Log unter `docs/qa/i9-playwright-fullrun.log` — dieser Pfad wird in der final-acceptance.md verlinkt.

#### Step 3 — Final-Acceptance-Dokument anlegen (Template unten kopieren)

Erzeuge `docs/qa/2026-05-22-final-acceptance.md` mit **exakt** dem folgenden Inhalt als Startpunkt. Der Engineer füllt die Tabellenfelder beim Durchlauf aus.

```markdown
# Final Acceptance — Bazodiac Frontend Correction (I0–I9)

**Datum:** 2026-05-22
**Iteration:** I9 (Final Acceptance Gate)
**Master Plan:** ../plans/2026-05-22-frontend-correction-iterations.md
**Spec:** ../plans/full_plan_to_fix40.md
**Playwright Full Run Log:** ./i9-playwright-fullrun.log
**Screenshot-Verzeichnis:** ./screenshots/i9-final/

## 0. Acceptance Rules

- **PASS** = Browser-Screenshot UND grüner Test-Command zeigen das geforderte Verhalten.
- **FAIL** = Mindestens ein Required-Aspekt fehlt oder weicht ab.
- **MINOR** = Verhalten erfüllt das Required-Verhalten; nur kosmetische Abweichung (Toleranz: ≤ 2 px Layout, ≤ 5 ms Animation).
- **BLOCKED** = Evidenzkette unterbrochen (z.B. Upstream down).
- Status "code exists" zählt **NICHT** als PASS.

## 1. Functional Requirements

| Req ID    | Beschreibung (Kurz)                                          | Evidenz (Log/Screenshot)                                       | Test-Command                                                                                                              | Screenshot (desktop)                       | Screenshot (mobile)                       | Status | Open Risks |
|-----------|--------------------------------------------------------------|----------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|--------------------------------------------|-------------------------------------------|--------|------------|
| REQ-F-001 | Rolling-Letters Animation auf Pro-Birthchart, Hero und Daily | `./i9-playwright-fullrun.log` (Block: rolling-letters)         | `APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/rolling-letters.spec.js`                                  | `./screenshots/i9-final/pro-birthchart-desktop.png` | `./screenshots/i9-final/pro-birthchart-mobile.png` |        |            |
| REQ-F-002 | Geo-Input mit Nominatim + tz-Anzeige + Cache-Hit             | `./i9-playwright-fullrun.log` (Block: geo-input)               | `node --test test/geocode.test.js test/payload.test.js && APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/geo-input.spec.js` | `./screenshots/i9-final/input-desktop.png` | `./screenshots/i9-final/input-mobile.png` |        |            |
| REQ-F-003 | Natal-Chart-Wheel rendert Houses + Planets aus ViewModel     | `./i9-playwright-fullrun.log` (Block: natal-chart-wheel)       | `node --test test/natal-chart-wheel.test.js test/overview-model.test.js && APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/natal-chart-wheel.spec.js` | `./screenshots/i9-final/overview-desktop.png` | `./screenshots/i9-final/overview-mobile.png` |        |            |
| REQ-F-004 | Five-Element-Bars + Fusion-Heatmap zeigen normalisierte DE-Elementnamen | `./i9-playwright-fullrun.log` (Block: five-elements)  | `node --test test/view_model.test.js test/element-tension.test.js && APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/five-elements.spec.js` | `./screenshots/i9-final/personality-desktop.png` | `./screenshots/i9-final/personality-mobile.png` |        |            |
| REQ-F-005 | API-Provenance + Method-Page sichtbar, jede Behauptung mit Source-Badge | `./i9-playwright-fullrun.log` (Block: provenance)      | `node --test test/api-provenance.test.js test/method-page.test.js && APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/provenance.spec.js` | `./screenshots/i9-final/method-desktop.png` | `./screenshots/i9-final/method-mobile.png` |        |            |
| REQ-F-006 | Synastry-Vergleich (zwei Charts) inklusive 12-House-Compare  | `./i9-playwright-fullrun.log` (Block: synastry)                | `node --test test/house-comparison.test.js test/domain-score.test.js test/dynasty-resonance.test.js && APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/synastry.spec.js` | `./screenshots/i9-final/synastry-desktop.png` | `./screenshots/i9-final/synastry-mobile.png` |        |            |

## 2. Non-Functional Requirements

| Req ID     | Beschreibung (Kurz)                                          | Evidenz                                                              | Test-Command                                                                                                  | Status | Open Risks |
|------------|--------------------------------------------------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|--------|------------|
| REQ-NF-001 | First Contentful Paint < 1.5 s auf Dashboard (Throttled 4G)  | Playwright Trace `./screenshots/i9-final/traces/dashboard-fcp.json`  | `APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/perf-fcp.spec.js --trace=on`                  |        |            |
| REQ-NF-002 | Bundle der initialen Seite < 200 KB gz                       | Output von `scripts/measure-bundle.mjs`                              | `node scripts/measure-bundle.mjs public/index.html`                                                            |        |            |
| REQ-NF-003 | Kein blockierender Request > 800 ms auf Hauptseiten          | Playwright Network-HAR `./screenshots/i9-final/traces/network.har`   | `APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/perf-network.spec.js --trace=on`             |        |            |

## 3. Data Requirements

| Req ID    | Beschreibung (Kurz)                                                       | Evidenz                                                       | Test-Command                                                                            | Status | Open Risks |
|-----------|---------------------------------------------------------------------------|---------------------------------------------------------------|-----------------------------------------------------------------------------------------|--------|------------|
| REQ-D-001 | Server-ViewModel `view_model_version` ist gestempelt und im UI sichtbar   | Screenshot Footer + `./i9-playwright-fullrun.log`             | `node --test test/view_model.test.js && APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/view-model-stamp.spec.js` |        |            |
| REQ-D-002 | Hidden-Stems werden bei fehlendem Upstream-Feld aus Tabelle abgeleitet    | Server-Log + Unit Test                                        | `node --test test/view_model.test.js`                                                  |        |            |
| REQ-D-003 | Keine Roh-API-Felder im UI — Components lesen ausschließlich ViewModel    | Grep-Output (siehe TASK-I9-002, Step 2)                       | `rg -n "raw\\.|response\\.data\\." public/src/components/ public/src/pages/`           |        |            |

## 4. Accessibility Requirements

| Req ID    | Beschreibung (Kurz)                                              | Evidenz                                                       | Test-Command                                                                                          | Status | Open Risks |
|-----------|------------------------------------------------------------------|---------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|--------|------------|
| REQ-A-001 | WCAG-AA-Kontrast auf allen 11 Hauptseiten (axe-core)             | Playwright + axe Report `./screenshots/i9-final/axe-report.json` | `APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/a11y-axe.spec.js`                  |        |            |
| REQ-A-002 | Keyboard-Navigation vollständig (Tab-Order, Focus-Ring sichtbar) | Playwright Keyboard-Spec + Screenshots                        | `APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/a11y-keyboard.spec.js`               |        |            |
| REQ-A-003 | Prefers-reduced-motion ehrt Rolling-Letters & Wheel-Animation    | Playwright Spec mit emuliertem reduced-motion                 | `APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/a11y-reduced-motion.spec.js`         |        |            |

## 5. Security Requirements

| Req ID    | Beschreibung (Kurz)                                                       | Evidenz                                                            | Test-Command                                                                                          | Status | Open Risks |
|-----------|---------------------------------------------------------------------------|--------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|--------|------------|
| REQ-S-001 | Keine Secrets im Frontend-Bundle; CORS-Origin restriktiv                  | Grep-Output (siehe TASK-I9-002, Step 3) + Browser-Network-Tab      | `rg -n "FUFIRE_API_KEY|sk-[A-Za-z0-9]" public/ && APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/security-headers.spec.js` |        |            |

## 6. Observability Requirements

| Req ID    | Beschreibung (Kurz)                                                       | Evidenz                                                            | Test-Command                                                                                          | Status | Open Risks |
|-----------|---------------------------------------------------------------------------|--------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|--------|------------|
| REQ-O-001 | Synastry-Orchestrierung loggt Phasen + Dauer, Health zeigt Endpoint-Katalog | Server-Logs + `/health`-Response                                  | `node --test test/synastry-logging.test.js test/server.test.js && curl -fsS http://127.0.0.1:3000/health | jq` |        |            |

## 7. Architecture Audit Summary (siehe TASK-I9-002)

| Audit Check                                                                                   | Befund / Output         | Status |
|-----------------------------------------------------------------------------------------------|-------------------------|--------|
| `git diff main..HEAD -- server.js` zeigt nur dokumentierte Health/Config-Änderungen           |                         |        |
| `rg -n "raw\\.|response\\.data\\." public/src/components/ public/src/pages/` ist leer         |                         |        |
| `rg -n "FUFIRE_API_KEY|sk-[A-Za-z0-9]" .` (außerhalb von `.env.example` / `README.md`) leer   |                         |        |
| `rg -nP "(?i)(1990|1985|198[0-9])-[0-9]{2}-[0-9]{2}" public/ test/_fixtures/ test/_helpers/` — alle Treffer in deklarierten Fixtures |  |        |
| Keine hardcoded Astrology-Zielwerte (Sign-Namen + Literal-Grade) in Component-Files           |                         |        |

## 8. Critical / Major / Minor Findings

| Severity   | Count | Items                                                                 |
|------------|-------|-----------------------------------------------------------------------|
| Critical   | 0     | (Pflicht für Abnahme — sonst FAIL)                                    |
| Major      | 0     | (Pflicht für Abnahme — sonst FAIL)                                    |
| Minor      |       | Liste mit PO-Sign-off-Vermerk                                         |

## 9. PO-Sign-Off

- [ ] PO hat alle Desktop-Screenshots gesichtet
- [ ] PO hat alle Mobile-Screenshots gesichtet
- [ ] PO bestätigt: Goal/Devbrief sichtbar erfüllt
- [ ] PO bestätigt: Critical/Major = 0
- [ ] PO bestätigt: Minor-Liste explizit angenommen oder als Follow-up-Tickets erfasst

**PO-Signatur (Name / Datum):** _________________________

## 10. Iteration Gate

```bash
node scripts/qa-iteration-gate.mjs docs/qa/2026-05-22-final-acceptance.md
```

Erwartete Ausgabe: `GATE: PASS  iteration=I9  date=2026-05-22  passed=<N>  failed=0  blocked=0`.
```

#### Step 4 — Screenshots aller 11 Hauptseiten erzeugen (desktop + mobile)

Hauptseiten (gem. `public/src/pages/`):

1. Dashboard (`#/dashboard`)
2. Input (`#/input`)
3. Overview / Pro-Birthchart (`#/overview`)
4. Personality (`#/personality`)
5. Love (`#/love`)
6. Career & Finance (`#/career-finance`)
7. Synastry (`#/synastry`)
8. Transit Calendar (`#/transit-calendar`)
9. Daily (`#/daily`)
10. Method / Provenance (`#/method`)
11. Settings / About (`#/about` oder Settings-Hash der App)

Erzeuge je Seite zwei Screenshots in `docs/qa/screenshots/i9-final/`:

```bash
mkdir -p docs/qa/screenshots/i9-final/traces
APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/final-screenshots.spec.js --reporter=list 2>&1 | tee docs/qa/i9-screenshots.log
```

Falls `test/e2e/final-screenshots.spec.js` nicht existiert, wurde I0/I8 unvollständig abgeschlossen — STOP, zurück zu I0/I8.

Dateinamen-Konvention (verpflichtend, weil in der Tabelle oben verlinkt):

- `dashboard-desktop.png`, `dashboard-mobile.png`
- `input-desktop.png`, `input-mobile.png`
- `overview-desktop.png`, `overview-mobile.png`
- `pro-birthchart-desktop.png`, `pro-birthchart-mobile.png` (alias zu overview, falls App so routet)
- `personality-desktop.png`, `personality-mobile.png`
- `love-desktop.png`, `love-mobile.png`
- `career-finance-desktop.png`, `career-finance-mobile.png`
- `synastry-desktop.png`, `synastry-mobile.png`
- `transit-calendar-desktop.png`, `transit-calendar-mobile.png`
- `daily-desktop.png`, `daily-mobile.png`
- `method-desktop.png`, `method-mobile.png`
- `settings-desktop.png`, `settings-mobile.png`

Verifikation (alle 22 Bilder vorhanden, nicht leer):

```bash
ls -la docs/qa/screenshots/i9-final/*.png | wc -l        # erwartet: >= 22
find docs/qa/screenshots/i9-final/ -name '*.png' -size -2k        # erwartet: leer (keine 0-Byte-PNGs)
```

#### Step 5 — Pro Requirement durchlaufen und Status setzen

Für **jede** REQ-Zeile in der Tabelle:

1. Test-Command aus der Tabelle ausführen.
2. Output an Evidenz-Link kopieren (Pfad relativ).
3. Browser-Screenshot sichten (Pfade aus Tabelle).
4. Status setzen:
   - **PASS** nur, wenn Command exit 0 UND Screenshot zeigt das Verhalten.
   - **FAIL** wenn Command rot ODER Screenshot Abweichung zeigt.
   - **MINOR** wenn Required erfüllt, aber kosmetische Abweichung (≤ 2 px / ≤ 5 ms).
   - **BLOCKED** wenn z.B. Upstream `/health` `upstream.ok=false` meldet.
5. Open Risks frei eintragen (oder `—`).

#### Step 6 — Findings zusammenfassen

In Abschnitt **8. Critical / Major / Minor Findings**:

- **Critical** = REQ mit `FAIL` und sichtbarer Show-Stopper (z.B. Hauptseite leer).
- **Major** = REQ mit `FAIL` ohne Show-Stopper-Wirkung.
- **Minor** = REQ mit `MINOR` Status.

**Acceptance-Regel:** Critical = 0 UND Major = 0 ist Pflicht. Minor darf > 0 sein, muss aber explizit PO-signiert werden.

#### Step 7 — PO-Sign-Off einholen

PO-Checkliste in Abschnitt 9 abhaken. Signatur und Datum eintragen. Ohne signierten PO-Block bleibt das Iteration Gate **FAIL**.

#### Step 8 — Gate ausführen

```bash
node scripts/qa-iteration-gate.mjs docs/qa/2026-05-22-final-acceptance.md
```

Erwartet exakt: `GATE: PASS  iteration=I9  date=2026-05-22  passed=<N>  failed=0  blocked=0`.

Bei `GATE: FAIL` darf I9 nicht geschlossen werden.

#### Step 9 — Server stoppen, finalen Stand committen

```bash
kill $SERVER_PID
git add docs/qa/2026-05-22-final-acceptance.md docs/qa/i9-playwright-fullrun.log docs/qa/i9-screenshots.log docs/qa/screenshots/i9-final/
git status   # erwartet: nur Doku-Artefakte staged
git commit -m "docs(qa): I9 final acceptance — PO signed, gate PASS"
```

---

## TASK-I9-002 — Final Code Review & Architecture Diff Audit

**Iterationsziel-Bezug:** Erfüllt den "Code Review"-Teil des Iterationsziels — sichert zu, dass die Architekturzusagen aus `CLAUDE.md` und `full_plan_to_fix40.md` weiterhin gelten.

**Requirement links:** REQ-D-001, REQ-D-002, REQ-D-003, REQ-S-001, REQ-O-001 (und indirekt alle Functional REQs durch Architektur-Konsistenz).

**Files:**
- update: `docs/qa/2026-05-22-final-acceptance.md` (Abschnitt **7. Architecture Audit Summary** und ggf. Findings)
- create: `docs/qa/i9-audit-greps.log` (rohe Audit-Outputs für Nachvollziehbarkeit)

### Schritte

#### Step 1 — Server-Diff prüfen (kein Backend-Logik-Drift)

Architektur-Invariante (CLAUDE.md): "All logic lives in `server.js`". Frontend-Korrektur darf Backend nicht verändern, außer minimal Health/Config.

```bash
git fetch origin main
git diff origin/main..HEAD -- server.js | tee -a docs/qa/i9-audit-greps.log
```

Erwartet:
- Leerer Diff **oder**
- ausschließlich Änderungen in `/health`-Response (Feld `endpoints` oder `upstream`) und/oder `/api/config`-Response, die in `docs/plans/2026-05-22-i*.md` explizit vorgesehen sind.

Bei jeder anderen Änderung in `server.js`:
- Status in Architecture-Audit-Tabelle **FAIL** setzen
- Eintrag als **Critical Finding** in Abschnitt 8 (führt zu Gate-FAIL).

#### Step 2 — Keine Roh-API-Felder in UI-Components (REQ-D-003)

Architektur-Invariante: UI liest ausschließlich aus dem ViewModel (`normalizeAzodiacResult`-Output), nie aus Roh-Response.

```bash
rg -n "raw\\.|response\\.data\\." public/src/components/ public/src/pages/ | tee -a docs/qa/i9-audit-greps.log
```

Erwartet: **keine Treffer** (Exit-Code 1 von ripgrep = no matches = OK).

Bei Treffern:
- jede Stelle prüfen — wenn Component direkt auf `raw.*` oder `response.data.*` zugreift, ist das ein Major Finding.
- Ausnahme nur, wenn die Datei eine reine Type-Definition / JSDoc-Annotation ist (z.B. Kommentar `// shape: response.data.bazi.pillars[]`); dann MINOR mit explizitem Vermerk.

#### Step 3 — Keine Secrets im Code (REQ-S-001)

```bash
rg -n "FUFIRE_API_KEY" . --glob '!**/node_modules/**' --glob '!.git/**' | tee -a docs/qa/i9-audit-greps.log
rg -nP "sk-[A-Za-z0-9]{16,}" . --glob '!**/node_modules/**' --glob '!.git/**' | tee -a docs/qa/i9-audit-greps.log
rg -nP "(?i)(api[_-]?key|secret|bearer)\\s*[:=]\\s*[\"'][A-Za-z0-9_-]{16,}[\"']" . --glob '!**/node_modules/**' --glob '!.git/**' | tee -a docs/qa/i9-audit-greps.log
```

Erlaubte Treffer (PASS):
- `README.md`, `CLAUDE.md`, `.env.example` — Dokumentation der Variable, kein Wert.
- `server.js` — Lesen von `process.env.FUFIRE_API_KEY` ohne Hardcoding.
- Plan-Docs unter `docs/plans/` — Verweis auf Variable.

Verbotene Treffer (FAIL):
- `public/**` (irgendetwas im Frontend-Bundle).
- Hardcoded Strings, die wie API-Keys aussehen, in beliebigen Code-Files.

#### Step 4 — Keine realen Geburtsdaten außerhalb deklarierter Fixtures

```bash
rg -nP "(?i)(1990|1985|198[0-9])-[0-9]{2}-[0-9]{2}" public/ test/_fixtures/ test/_helpers/ 2>&1 | tee -a docs/qa/i9-audit-greps.log
rg -nP "[0-9]{1,2}\\.[0-9]{4,}\\s*[NSnsEWew]" public/ test/_fixtures/ test/_helpers/ 2>&1 | tee -a docs/qa/i9-audit-greps.log
```

Erwartet:
- Treffer ausschließlich in `test/_fixtures/` oder `test/_helpers/` UND in einer Datei mit deklariertem Fixture-Marker (z.B. `// FIXTURE: synthetic` oder `export const FIXTURE_PERSON_A`).
- Keine echten Geburtsdaten in `public/` (kein hardgecodeter User in der UI).

Bei verdächtigen Treffern (Datum im `public/`, oder Lat/Lon mit > 4 Dezimalstellen ohne Fixture-Marker): Major Finding eintragen.

#### Step 5 — Keine hardcoded Astrology-Zielwerte in Components

Architektur-Invariante (`full_plan_to_fix40.md`): Komponenten dürfen Sign-Namen / Element-Namen / Grade nicht hartkodieren — sie kommen aus dem ViewModel.

```bash
# Sign-Namen in Components
rg -nP "(?i)\\b(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|widder|stier|zwillinge|krebs|löwe|jungfrau|waage|skorpion|schütze|steinbock|wassermann|fische)\\b" public/src/components/ public/src/pages/ 2>&1 | tee -a docs/qa/i9-audit-greps.log

# Literal-Grade (z.B. "23.5°", "180 deg")
rg -nP "\\b([0-9]{1,3}(?:\\.[0-9]+)?)\\s*°" public/src/components/ public/src/pages/ 2>&1 | tee -a docs/qa/i9-audit-greps.log

# Element-Namen DE
rg -nP "\\b(Holz|Feuer|Erde|Metall|Wasser)\\b" public/src/components/ public/src/pages/ 2>&1 | tee -a docs/qa/i9-audit-greps.log
```

Erlaubte Treffer (PASS):
- Sign- / Element-Namen in **Label-Konstanten** (`labels.js`, `i18n.js`, `constants.js`) — Anzeige-Strings.
- Sign-Namen in **Iconmap** (z.B. `iconMap[sign] = '...'`) — Lookup-Tabelle.
- Element-Namen in **Theme-Maps** (`elementToColor`).
- Grade in **SVG-Geometrie-Konstanten** (z.B. `WHEEL_SECTOR_DEG = 30`) — geometrische Konstanten, kein User-Zielwert.

Verbotene Treffer (FAIL):
- Hardcoded `if (sign === 'leo') doX()` — Logik gegen Sign-Namen direkt in Components.
- Hardcoded Berechnungs-Konstanten wie `if (degree > 23.5)` ohne Quellen-Konstante.

Jeden zweifelhaften Treffer manuell sichten und im Audit-Log mit Verdikt versehen (`OK: label constant`, `OK: geometry`, `MAJOR: hardcoded sign logic`).

#### Step 6 — FUFIRE_ENDPOINTS-Reihenfolge ist Test-pinned

Architektur-Invariante (CLAUDE.md): "`FUFIRE_ENDPOINTS` order is test-pinned."

```bash
node --test test/server.test.js 2>&1 | tee -a docs/qa/i9-audit-greps.log
```

Erwartet: alle Tests grün, insbesondere der Test, der die Endpoint-Reihenfolge pinnt.

#### Step 7 — README ↔ Implementation Sync

```bash
node --test test/documentation.test.js 2>&1 | tee -a docs/qa/i9-audit-greps.log
```

Erwartet: grün. Bei rot → README aktualisieren (kein Code-Change), erneut laufen lassen.

#### Step 8 — Befunde in final-acceptance.md eintragen

Abschnitt **7. Architecture Audit Summary** in `docs/qa/2026-05-22-final-acceptance.md` mit den Outputs befüllen. Jede Zeile bekommt:

- **Befund / Output:** kurzer Befund (1 Satz) + Pfad-Verweis auf `i9-audit-greps.log` für Details.
- **Status:** PASS / FAIL / MINOR.

Findings, die FAIL sind, parallel in Abschnitt **8. Critical / Major / Minor Findings** zählen.

#### Step 9 — Audit-Commit

```bash
git add docs/qa/i9-audit-greps.log docs/qa/2026-05-22-final-acceptance.md
git commit -m "docs(qa): I9 architecture audit — diff, secrets, fixtures, hardcoded values"
```

---

## Iteration Definition of Done

Diese Iteration ist DONE, wenn **alle** folgenden Punkte erfüllt sind:

- [ ] `docs/qa/2026-05-22-final-acceptance.md` existiert und enthält **alle** REQ-* Zeilen ausgefüllt (kein leeres Status-Feld).
- [ ] Alle REQ-* haben Status **PASS** oder **MINOR**; **keine** FAIL- und **keine** BLOCKED-Einträge.
- [ ] Critical-Findings = 0, Major-Findings = 0.
- [ ] Minor-Findings — falls > 0 — sind PO-signiert oder als Follow-up-Tickets verlinkt.
- [ ] Architecture-Audit-Tabelle (Abschnitt 7) komplett befüllt, alle Checks PASS oder MINOR (mit Begründung).
- [ ] Alle 22 Pflicht-Screenshots in `docs/qa/screenshots/i9-final/` vorhanden (11 Seiten × {desktop, mobile}) und nicht leer.
- [ ] Playwright-Full-Suite-Log unter `docs/qa/i9-playwright-fullrun.log` zeigt 0 failed / 0 flaky.
- [ ] PO-Sign-Off (Abschnitt 9 der final-acceptance.md) abgehakt + signiert.
- [ ] Gate-Command erfolgreich: `node scripts/qa-iteration-gate.mjs docs/qa/2026-05-22-final-acceptance.md` → `GATE: PASS`.
- [ ] Audit-Greps (`docs/qa/i9-audit-greps.log`) committed.
- [ ] Master-Plan `docs/plans/2026-05-22-frontend-correction-iterations.md` Eintrag I9 → `Status: DONE (2026-05-22)`.

Wenn auch nur einer dieser Punkte offen ist, gilt das Sprintziel als **nicht erfüllt** — Iteration bleibt offen.

---

## Validation strategy

Exakte Befehlssequenz, die für die End-zu-End-Validierung auszuführen ist (kann CI-Pipeline 1:1 übernehmen):

```bash
# 0) sauberer Stand
git status
node --version

# 1) Server starten
FUFIRE_BASE_URL="https://bafe-production.up.railway.app/" PORT=3000 npm start &
SERVER_PID=$!
sleep 3
curl -fsS http://127.0.0.1:3000/health | jq '.upstream.ok'   # erwartet: true

# 2) Unit + Integration Suite
node --test 2>&1 | tee docs/qa/i9-node-test.log
#   erwartet: "tests <N>  pass <N>  fail 0"

# 3) Playwright Full Suite (alle Specs)
APP_BASE_URL=http://127.0.0.1:3000 npx playwright test --reporter=list 2>&1 | tee docs/qa/i9-playwright-fullrun.log
#   erwartet: "<N> passed (M s)"  und  "0 failed"

# 4) Final-Screenshot-Spec (erzeugt die 22 PNGs)
APP_BASE_URL=http://127.0.0.1:3000 npx playwright test test/e2e/final-screenshots.spec.js --reporter=list 2>&1 | tee docs/qa/i9-screenshots.log
ls docs/qa/screenshots/i9-final/*.png | wc -l            # erwartet: >= 22

# 5) Architecture-Audit-Greps (Outputs werden in i9-audit-greps.log gesammelt)
: > docs/qa/i9-audit-greps.log
git diff origin/main..HEAD -- server.js                                           | tee -a docs/qa/i9-audit-greps.log
rg -n "raw\\.|response\\.data\\." public/src/components/ public/src/pages/        | tee -a docs/qa/i9-audit-greps.log
rg -n "FUFIRE_API_KEY" . --glob '!**/node_modules/**' --glob '!.git/**'          | tee -a docs/qa/i9-audit-greps.log
rg -nP "sk-[A-Za-z0-9]{16,}" . --glob '!**/node_modules/**' --glob '!.git/**'    | tee -a docs/qa/i9-audit-greps.log
rg -nP "(?i)(1990|1985|198[0-9])-[0-9]{2}-[0-9]{2}" public/ test/_fixtures/ test/_helpers/ | tee -a docs/qa/i9-audit-greps.log

# 6) Final Gate
node scripts/qa-iteration-gate.mjs docs/qa/2026-05-22-final-acceptance.md
#   erwartet: "GATE: PASS  iteration=I9  date=2026-05-22  passed=<N>  failed=0  blocked=0"

# 7) Server stoppen
kill $SERVER_PID
```

**Pass-Bedingung gesamt:** jeder einzelne Schritt grün; `GATE: PASS`.

---

## Rollback note

Diese Iteration produziert **keinen Code-Change** an Backend oder bestehender Frontend-Logik. Es gibt deshalb **keinen Rollback** im klassischen Sinn.

Last-Minute-Fixes (TASK-I9-001 Step 5/6, TASK-I9-002 Step 5), die im Acceptance-Pass aufgedeckt werden, werden **außerhalb** dieser Iteration in einem neuen Mini-Plan `docs/plans/2026-05-22-i9-followup-fix-*.md` adressiert. I9 wird dann gegen den Fix erneut durchlaufen.

**Wenn das Gate FAIL liefert:** Iteration bleibt offen, kein Branch-Merge, kein Sprintabschluss. Schritte:

1. Findings aus Abschnitt 8 in Issue-Tracker übernehmen.
2. Pro Finding entscheiden: Fix in I9 (nur wenn trivial und dokumentiert), oder Re-Open der entsprechenden Iteration (I1–I8).
3. Nach Fix: Acceptance-Pass komplett wiederholen (alle Test-Commands, alle Screenshots neu).

Es ist explizit **nicht erlaubt**, einen FAIL-Befund durch nachträgliches Editieren der final-acceptance.md auf PASS umzustempeln.

---

## Handoff: Project Complete

Bei `GATE: PASS` und PO-Sign-Off ist das Projekt "Bazodiac Frontend Correction (I0–I9)" abgeschlossen. Finale Artefakte:

**Pflicht-Artefakte (existieren, versioniert, im Repo):**

- `docs/qa/2026-05-22-final-acceptance.md` — der maßgebliche Abnahmebericht (PO-signiert).
- `docs/qa/i9-playwright-fullrun.log` — vollständiger Playwright-Run-Log, 0 failed.
- `docs/qa/i9-node-test.log` — `node --test`-Gesamtlauf, 0 failed.
- `docs/qa/i9-screenshots.log` — Screenshot-Spec-Log.
- `docs/qa/i9-audit-greps.log` — sämtliche Audit-Grep-Outputs.
- `docs/qa/screenshots/i9-final/` — 22 Pflicht-Screenshots (11 Seiten × {desktop, mobile}) + axe-report.json + Playwright-Traces.

**Plan-Artefakte (zur historischen Nachverfolgung):**

- `docs/plans/2026-05-22-frontend-correction-iterations.md` — Master-Plan mit allen Iterationen markiert als DONE.
- `docs/plans/2026-05-22-i0-qa-gate-playwright.md` … `docs/plans/2026-05-22-i8-*.md` — alle Einzeliterationen.
- `docs/plans/2026-05-22-i9-final-acceptance.md` — diese Datei.
- `docs/plans/full_plan_to_fix40.md` — Referenz-Spec (unverändert oder mit Errata-Block).

**Code-Stand:**

- Branch `fix/iteration-i9` mit allen I9-Doku-Commits → Merge in Default-Branch (üblicherweise `main`).
- Tag: `v-frontend-correction-2026-05-22` auf dem Merge-Commit setzen (`git tag -a v-frontend-correction-2026-05-22 -m "Bazodiac frontend correction I0–I9 accepted"`).

**Übergabe an Folgeprojekt:**

- Etwaige Minor-Follow-ups aus Abschnitt 8 sind als Tickets im Issue-Tracker erfasst, mit Verweis auf `final-acceptance.md#Minor`.
- Keine offenen Critical/Major.
- `view_model_version` (`REQ-D-001`) ist der vertraglich gepinnte Anker für künftige Backend-Änderungen — jede inkompatible Backend-Änderung muss diese Version anheben und einen neuen Acceptance-Pass auslösen.

Mit diesem Handoff ist die Frontend-Korrektur abnahmegerecht abgeschlossen.
