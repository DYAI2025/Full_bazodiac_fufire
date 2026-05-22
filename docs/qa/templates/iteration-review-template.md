# QA Report: <ITERATION-ID> — <Titel>

> Pflicht-Artefakt. Gilt fuer jede Frontend-/Content-Iteration nach
> `docs/plans/2026-05-22-iteration-gates-implementation.md` und
> `bazodiac-dev-brief-iteration-gates.md`.
> Pfad-Konvention: `docs/qa/<YYYY-MM-DD>-<iteration-slug>.md`.

**Iteration:** <ITERATION-ID>
**Datum:** <YYYY-MM-DD>
**Reviewer:** <Name / Rolle>
**Plan-Referenz:** `docs/plans/<YYYY-MM-DD>-<iteration-slug>.md`

---

## /goal

```
/goal
Goal: <max. 80 Zeichen>

Ziel. <2-4 Saetze, Nutzerwert + Grund>

Scope. <Dateien / Seiten / Komponenten>

Bedingungen (hart).
- TDD-first: Vor Implementierung muss ein fehlschlagender Test existieren.
- Kein Sprintabschluss ohne Playwright-Live-Test, Screenshots und Code Review.
- Review-Fix-Review wird wiederholt, bis keine Critical/Major Findings offen sind.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte, keine Backend-Architekturverletzung.

Akzeptanzkriterien.
- <messbar>
- <messbar>
- <messbar>

Explizit out-of-scope.
- <Ausschluss>

Done-Definition. Iteration nur abgeschlossen wenn Tests, Playwright-Live-Test,
Screenshot-Matrix, optischer Review und Code Review bestanden sind.
```

Zeichenzahl: <unter 4000>

## Implementierte Aenderungen

- <bullet pro file/concern>

## Testbefehle

```bash
npm test
PORT=4100 npm run test:e2e
```

Ergebnis:

```
<X passed, Y failed>
```

## Playwright-Live-Test

| Feld | Wert |
|---|---|
| URL | http://127.0.0.1:4100 |
| Projects | chromium-desktop, chromium-mobile |
| Themes | planetarium (dark), morning (light) |
| Ergebnis | <X passed / Y failed> |

## Screenshots

Pfad: `docs/qa/screenshots/<iteration-slug>/`

Pflicht-Matrix pro betroffener Seite:

| Seite | desktop-dark | desktop-light | mobile-dark | mobile-light |
|---|---|---|---|---|
| <page> | `<page>-desktop-dark.png` | `<page>-desktop-light.png` | `<page>-mobile-dark.png` | `<page>-mobile-light.png` |

Bei Interaktionen zusaetzlich `<page>-interaction-before.png`, `<page>-interaction-after.png`, `<page>-expanded-state.png`, `<page>-fallback-state.png`.

Hinweis: Keine Secrets, Tokens, echten Personendaten. Nur synthetische Profile.

## Optischer Review

Pruefpunkte (pro Seite kommentieren):

- Geplante Nutzerveraenderung sichtbar?
- Layout / Form / Farbe / Font-Balance konsistent?
- Light und Dark Mode lesbar (Kontrast)?
- Mobile-Regression vorhanden?
- Inhalte verstaendlich, nicht ueberladen?
- Interne Feldnamen / Debug-Artefakte sichtbar?

Findings:

- [Critical] <Ort> — <Beobachtung>
- [Major]    <Ort> — <Beobachtung>
- [Minor]    <Ort> — <Beobachtung>

## Code Review

Pruefliste:

- [ ] keine Backend-Architekturverletzung
- [ ] keine neuen Runtime-Dependencies ohne Entscheidung
- [ ] keine hardcodierten astrologischen Werte
- [ ] keine Fake-Fallbacks / 0-Grad-Longitudes
- [ ] keine sichtbaren internen Feldnamen auf Nutzerseiten
- [ ] keine CSS-Token-Konflikte zwischen Light/Dark
- [ ] keine toten Komponenten / duplizierte Mappings
- [ ] keine Secrets / privaten Daten
- [ ] Tests pruefen Anforderung, nicht nur DOM-Existenz

Findings:

- [Critical] `path/file.js:NN` — <Beobachtung>
- [Major]    `path/file.js:NN` — <Beobachtung>
- [Minor]    `path/file.js:NN` — <Beobachtung>

## Fix-Runden

| Runde | Finding-ID | Fix-Commit | Re-Run Ergebnis |
|---|---|---|---|
| 1 | <ID> | `<sha>` | PASS / FAIL |
| 2 | <ID> | `<sha>` | PASS / FAIL |

Regel: Review-Fix-Review wird wiederholt bis

```
0 offene Critical Findings
0 offene Major Findings
```

## Abschlussstatus

- [ ] `/goal` vorhanden und unter 4000 Zeichen
- [ ] TDD-Nachweis vorhanden (Test war zuerst rot)
- [ ] `npm test` gruen
- [ ] `PORT=4100 npm run test:e2e` gruen (desktop + mobile)
- [ ] Screenshot-Matrix vollstaendig
- [ ] Optischer Review bestanden, 0 Critical, 0 Major
- [ ] Code Review bestanden, 0 Critical, 0 Major
- [ ] QA-Bericht aktualisiert

Status: **PASS** oder **BLOCKED**

Bei BLOCKED: konkrete Begruendung pro fehlender Bedingung.

## Offene Minor Findings

- <Minor mit Owner + Ziel-Iteration>
