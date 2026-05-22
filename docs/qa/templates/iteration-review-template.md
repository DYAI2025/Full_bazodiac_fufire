# Iteration Review — <ITERATION-ID> (<TITEL>)

> Pflicht-Artefakt. Eine Iteration gilt erst als abgeschlossen, wenn dieses Dokument
> für die jeweilige Iteration vollständig ausgefüllt und committet ist.
> Pfad-Konvention: `docs/qa/<YYYY-MM-DD>-<iteration-id>-<slug>.md`.

**Iteration:** <ITERATION-ID>
**Datum:** <YYYY-MM-DD>
**Reviewer:** <Name / Rolle>
**Plan-Referenz:** `docs/plans/<YYYY-MM-DD>-<iteration-id>-<slug>.md`
**Master-Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`

---

## Ziel

<Iterationsziel in 2-4 Sätzen. Was soll der Nutzer am Ende sehen / können?
Welche Requirements werden geschlossen? Bezug zu REQ-IDs.>

## Testcommands

Genau die Befehle, die für die Abnahme ausgeführt wurden — copy/paste-fähig:

```bash
# Unit + Integration
npm test

# Live-Browser-Gate
PORT=4100 npm run test:e2e

# (optional) Headed-Lauf zur visuellen Verifikation
PORT=4100 npm run test:e2e:headed
```

Tatsächliches Ergebnis (Auszug):

```
<Output / Zusammenfassung "X passed, Y failed">
```

## Browser / Viewport

| Feld | Wert |
|---|---|
| Browser | Chromium (Playwright managed) |
| Version | <z.B. 130.0.6723.31> |
| Viewport | 1440 x 900 |
| OS | <macOS 15 / Ubuntu 24 / ...> |
| Node | <z.B. 20.17.0> |

## Screenshots

Pfad: `docs/qa/screenshots/<iteration-id>-<sub>/`

| Seite | Datei | Status |
|---|---|---|
| Root / Dashboard | `01-root.png` | OK / NOK |
| Overview | `02-overview.png` | OK / NOK |
| BaZi | `03-bazi.png` | OK / NOK |
| Western | `04-western.png` | OK / NOK |
| Wu-Xing | `05-wuxing.png` | OK / NOK |
| Fusion | `06-fusion.png` | OK / NOK |
| Tagespuls | `07-tagespuls.png` | OK / NOK |
| Haeuser | `08-haeuser.png` | OK / NOK |
| Beziehung | `09-beziehung.png` | OK / NOK |
| Daten | `10-daten.png` | OK / NOK |
| Methode | `11-methode.png` | OK / NOK |

Hinweis (REQ-S-001): Screenshots dürfen KEINE Secrets, API-Keys, echten Personendaten
oder Tokens enthalten. Nur synthetische Testdaten verwenden.

## Optischer Review

<Pro Seite 1-3 Bullets: Layout, Typographie, Lesbarkeit, mobile Optik (sofern getestet),
Konsistenz mit Designsystem, sichtbare Defekte. Direkt auf Screenshot referenzieren.>

- Root: ...
- Overview: ...
- BaZi: ...
- Western: ...
- Wu-Xing: ...
- Fusion: ...
- Tagespuls: ...
- Haeuser: ...
- Beziehung: ...
- Daten: ...
- Methode: ...

## Code Review

<Diff-basiertes Review. Pro geänderter Datei: was wurde geändert, warum, welches Risiko,
welche Tests decken es ab? Mindestens 1 expliziter Reviewer-Eintrag pro Iteration.>

- `path/to/file.js`: ...
- `path/to/other.js`: ...

Checkliste:

- [ ] Lesbar und in bestehender Code-Konvention
- [ ] Keine toten Imports / dead code
- [ ] Keine Console-Errors im Browser (DevTools-Check)
- [ ] Keine Secrets / API-Keys im Diff
- [ ] Tests vorhanden und grün
- [ ] CHANGELOG / Plan-Status aktualisiert

## Findings

Nummerierte Liste konkreter Mängel aus optischem Review + Code Review.
Jeder Eintrag: Schweregrad (blocker / major / minor), Ort, Beobachtung.

1. [major] <Datei/Seite> — <Beobachtung>
2. [minor] <Datei/Seite> — <Beobachtung>

## Fixes

Für jeden Finding: Was wurde getan, in welchem Commit, Verifikation.

| Finding | Fix-Commit | Verifikation |
|---|---|---|
| 1 | `<sha>` | erneuter Playwright-Lauf grün, Screenshot aktualisiert |
| 2 | `<sha>` | … |

Review-Fix-Review-Schleife (REQ-NF-003): Nach jedem Fix muss derselbe E2E-Lauf erneut
laufen und der Screenshot der betroffenen Seite ersetzt werden.

## Finaler Status

- [ ] Alle Pflicht-Seiten gerendert (#app + Überschrift sichtbar)
- [ ] Alle Findings adressiert oder als bewusstes "Defer to <Iteration-ID>" dokumentiert
- [ ] `npm test` grün
- [ ] `PORT=4100 npm run test:e2e` grün
- [ ] Plan-Datei aktualisiert (Status: done)
- [ ] Final-Report-Eintrag im Master-Plan ergänzt (REQ-O-001)

**Abnahme:** <ja / nein> — <Name>, <YYYY-MM-DD>
