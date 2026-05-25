# Iteration Review — I0 (QA-Gate & Playwright Baseline)

**Iteration:** I0
**Datum:** 2026-05-22
**Reviewer:** Ben Poersch
**Plan-Referenz:** `docs/plans/2026-05-22-i0-qa-gate-playwright.md`
**Master-Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`

---

## Ziel

Harte Abnahmepipeline einführen: Playwright als Pflicht-Live-Browser-Gate + standardisiertes
Review-Template. Keine sichtbare Produktveränderung für den Nutzer, aber ab jetzt gilt:
keine Iteration ist "fertig" ohne grünen E2E-Lauf, Screenshots, optisches Review und Code
Review. Schließt REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-O-001, REQ-S-001.

## Testcommands

```bash
# Unit + Integration
npm test

# Live-Browser-Gate (startet Server automatisch via webServer-Config auf Port 4100)
PORT=4100 npm run test:e2e

# Optional: visuelle Verifikation
PORT=4100 npm run test:e2e:headed
```

Ergebnis:

```
Running 11 tests using 1 worker

  ✓   1 [chromium] smoke: Root / Dashboard (/) rendert #app + heading (2.7s)
  ✓   2 [chromium] smoke: Overview (/#/overview) rendert #app + heading (484ms)
  ✓   3 [chromium] smoke: BaZi (/#/bazi) rendert #app + heading (455ms)
  ✓   4 [chromium] smoke: Western (/#/western) rendert #app + heading (427ms)
  ✓   5 [chromium] smoke: Wu-Xing (/#/wuxing) rendert #app + heading (3.3s)
  ✓   6 [chromium] smoke: Fusion (/#/fusion) rendert #app + heading (443ms)
  ✓   7 [chromium] smoke: Tagespuls (/#/daily) rendert #app + heading (580ms)
  ✓   8 [chromium] smoke: Haeuser (/#/houses) rendert #app + heading (476ms)
  ✓   9 [chromium] smoke: Beziehung (/#/synastry) rendert #app + heading (512ms)
  ✓  10 [chromium] smoke: Daten (Eingabe via Hash-Route) (/#/) rendert #app + heading (547ms)
  ✓  11 [chromium] smoke: Methode (/#/method) rendert #app + heading (530ms)

  11 passed (11.6s)
```

## Browser / Viewport

| Feld | Wert |
|---|---|
| Browser | Chromium (Playwright managed) |
| Version | Playwright 1.60.0 |
| Viewport | 1440 x 900 |
| OS | macOS 25.3.0 (Darwin) |
| Node | v22.20.0 |

## Screenshots

Pfad: `docs/qa/screenshots/i0-smoke/`

| Seite | Datei | Status |
|---|---|---|
| Root / Dashboard | `01-root.png` | OK |
| Overview | `02-overview.png` | OK |
| BaZi | `03-bazi.png` | OK |
| Western | `04-western.png` | OK |
| Wu-Xing | `05-wuxing.png` | OK |
| Fusion | `06-fusion.png` | OK |
| Tagespuls | `07-tagespuls.png` | OK |
| Haeuser | `08-haeuser.png` | OK |
| Beziehung | `09-beziehung.png` | OK |
| Daten | `10-daten.png` | OK (via `/#/` — kein `/input` alias) |
| Methode | `11-methode.png` | OK |

Hinweis (REQ-S-001): Nur synthetische Testdaten. Keine echten Geburtsdaten / Tokens
in Screenshots. Alle Seiten ohne Profil zeigen ProfileMissingBanner oder InputPage.

## Optischer Review

I0 ist ein Infrastruktur-Sprint — der optische Review konzentriert sich auf:
Lädt jede Route ohne JS-Error? Ist #app befüllt und eine Überschrift sichtbar?
Stimmt Hash-Route mit gemounteter Page überein?

- Root: InputPage korrekt gemountet, h1 "Berechne deine Fusion-Signatur" sichtbar. Formular vollständig.
- Overview: ProfileMissingBanner mit h2 "Profil fehlt" und CTA-Button. Korrekt ohne Profil.
- BaZi: ProfileMissingBanner wie Overview. Korrekt.
- Western: ProfileMissingBanner. Korrekt.
- Wu-Xing: WuxingPage mit eigenem Onboarding (kein Banner) — h2 sichtbar. 3.3s Ladezeit wegen FuFire-Netzwerk-Call (Fallback greift).
- Fusion: ProfileMissingBanner. Korrekt.
- Tagespuls: DailyPage mit eigenem Onboarding (kein Banner). Heading sichtbar.
- Haeuser: ProfileMissingBanner. Korrekt.
- Beziehung: SynastryPage mit eigener Person-A/B-Eingabe — keine Banner-Abhängigkeit. Heading sichtbar.
- Daten: Via `/#/` gleiche InputPage wie Root. Heading sichtbar. (Dedizierter `/input` Alias fehlt — Defer to I7)
- Methode: MethodPage rendert auch ohne Profil. Heading sichtbar.

## Code Review

Geänderte Dateien (commit `24e3898`):

- `package.json` — devDependency `@playwright/test ^1.60.0`, neue Scripts `test:e2e*`. Kein Runtime-Dep, kein Backend-Eingriff. ✓
- `package-lock.json` — automatisch generiert. ✓
- `playwright.config.mjs` — neu. Headless Chromium, `baseURL` via `APP_BASE_URL` (Default 4100 um Konflikt mit Remotion Studio auf 3000 zu vermeiden), `webServer` startet `npm start` automatisch, `reuseExistingServer: true`. Screenshot bei Failure. ✓
- `test/e2e/smoke-main-pages.spec.js` — neu. 11 Smoke-Tests, jeder prüft HTTP-Status < 400, `#app` existiert, erstes Kind gerendert (JS gelaufen), h1/h2 sichtbar. Screenshot in `docs/qa/screenshots/i0-smoke/`. ✓
- `docs/qa/screenshots/.gitkeep` + `i0-smoke/*.png` — 11 PNGs committet. Keine Secrets. ✓
- `.gitignore` — `test-results/`, `playwright-report/`, `docs/qa/playwright-report/` ignoriert. Screenshots NICHT ignoriert. ✓

Checkliste:

- [x] Lesbar und in bestehender Code-Konvention (ESM, keine TS, keine neuen Runtime-Deps)
- [x] Keine toten Imports / dead code
- [x] Keine Console-Errors im Browser (im headed Lauf verifiziert)
- [x] Keine Secrets / API-Keys im Diff
- [x] Tests vorhanden und grün (`npm test` + `PORT=4100 npm run test:e2e`)
- [x] Plan-Status in Master-Plan auf I0 = done gesetzt

## Findings

1. [minor] `playwright.config.mjs` — Default-Port 4100 statt 3000 weil Remotion Studio lokal
   auf 3000 läuft. Keine Auswirkung auf Produktion / CI. Dokumentiert im Config-Kommentar.
   **Defer:** bleibt so — kein Fix nötig.

2. [minor] `smoke-main-pages.spec.js` → Route `10-daten` nutzt `/#/` statt `/#/input` weil
   kein `/input`-Router-Alias existiert. InputPage ist via `/` erreichbar.
   **Defer to I7** (Navigation-Sprint): dort expliziten `/input` Hash-Alias anlegen.

3. [info] Wu-Xing (05-wuxing) benötigt 3.3s — WuxingPage macht Netzwerk-Call zu FuFire,
   Fallback greift erst nach Timeout. Im I6-Sprint (Unterseiten) adressieren.

## Fixes

| Finding | Fix-Commit | Verifikation |
|---|---|---|
| 1 | kein Fix nötig | Dokumentiert in Config, Tests grün |
| 2 | Defer to I7 | `/#/` als pragmatischer Ersatz, 11/11 grün |
| 3 | Defer to I6 | Akzeptabel für I0-Smoke-Test |

Review-Fix-Review-Schleife (REQ-NF-003): Keine Critical/Major Findings — kein weiterer
Fix-Cycle nötig. Alle 3 Findings sind minor/info und bewusst auf Folge-Iterationen deferred.

## Finaler Status

- [x] Playwright lokal grün (11/11 Smoke-Tests PASS)
- [x] Screenshots aller 11 Hauptseiten unter `docs/qa/screenshots/i0-smoke/` committet
- [x] `npm test` grün
- [x] `PORT=4100 npm run test:e2e` grün
- [x] Plan-Datei (`docs/plans/2026-05-22-i0-qa-gate-playwright.md`) als done markiert
- [x] Master-Plan-Eintrag (REQ-O-001) für I0 ergänzt
- [x] Keine Critical/Major Findings offen

**Abnahme:** ja — Ben Poersch, 2026-05-22
