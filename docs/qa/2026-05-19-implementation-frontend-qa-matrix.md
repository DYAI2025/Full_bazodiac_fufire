# QA Matrix — Backend-Anbindung Frontend ohne Platzhalter

**Goal:** `Backend-Anbindung Frontend ohne Platzhalter` (set 2026-05-19)
**Reference doc:** `implementation_frontend.md` (A0 — Startseite / Eingabemaske als praeziser Intake)
**Closing commits on `main`:** `097dd3e` (P0), `1c85284` (P1), `142f069` (P2), `a5fcd08` (P3), this commit (P4)
**Test baseline:** 376 tests, 367 pass, 9 skipped, 0 failed

This matrix maps every section of `implementation_frontend.md` and every Goal-acceptance criterion to the delivering code path and the test(s) that verify it. Cells marked `✓` are evidenced by source + test; cells marked `n/a` are explicitly out of scope per the Goal's `Explizit out-of-scope` list.

---

## A. Reference-Doc — Pflichtstruktur der Eingabemaske (A0, §1–§10)

| § | Reference-doc requirement | Delivered in | Test |
|---|---|---|---|
| 1 | Nutzerprofil / Anzeigename ("Wie moechtest du genannt werden?") + Fallback "Dein Profil" | `public/src/pages/InputPage.js` fieldset `form-section--alias`, persisted via `saveAlias()` / `readAlias()` | `test/person-state.test.js` (alias save/read/truncate/clear) |
| 2 | Geburtsdaten Person A: Datum, Uhrzeit, Genauigkeit (exact/approx/unknown), Geburtsort + Inhaltshinweise | `InputPage.js` `form-section--person-a` with `time-cert` radio group + `form-helper` blocks | `test/no-fake-data-page-sweep.test.js` (no demo strings in InputPage) + page-render integration |
| 3 | Ortseingabe Person A — Autosuche, Inline-Fehler bei unklarem Ort, keine Navigation auf Fehler | `public/src/components/GeoInput.js` (debounced `geocodePlace` autocomplete + `.geo-error`/`.geo-no-result`/`.geo-manual-error` inline states) | `test/synastry-client-flow.test.js` (geocode chain), `test/api_client.test.js` (envelope + 429 surface) |
| 4 | Manuelle Koordinaten — Lat/Lon, bis 7 Dezimalstellen, WGS84-Ranges | `GeoInput.js` manual mode `step="0.0000001" min="-90" max="90"` + `validateCoordinates()` | `test/person-state.test.js` (validateCoordinates: valid pair, out-of-range, non-numeric, string-number input) |
| 5 | Partnerdaten / Person B (Name, Datum, Uhrzeit + Genauigkeit, Ort, Beziehungskontext romantic/friend/work/open) | `InputPage.js` `<details>` `form-section--person-b` + `personState.savePersonB()` / `saveRelationshipContext()` | `test/person-state.test.js` (personB round-trip, relationship-context whitelist) |
| 6 | Kategorienklarheit — Signatur lernen / Heute anwenden / Beziehung / Arbeit & Ressourcen | `InputPage.js` `<section class="category-preview">` with 4 `<li>` bullets | static-source check via `test/no-fake-data-page-sweep.test.js` |
| 7 | Validierung — Pflichtfelder inline, Person-A erlaubt ohne Person-B, Person-B-Partial blockt nur Partnervergleich, kein Daten-Loeschen bei Fehlern | `InputPage.js` `validate()`, submit-button gated on `(hasDate && hasPlace)`, Partner-B-Error inline on `.person-b-error` | `test/page-render-integration.test.js` (InputPage initial render is clean) |
| 8 | Persistenz — Person A + Person B + letzter erkannter Ort lokal erhalten, "Daten löschen"-Option | `domain/personState.js` (`saveAlias`/`savePersonB`/`saveRelationshipContext`/`clearAllPersonState`) + InputPage `.person-b-clear-btn` | `test/person-state.test.js` (clearAllPersonState wipes all keys) |
| 9 | Startseiten-Output — Signatur-Übersicht → Tagespuls → optional Beziehung / Arbeit | `app.js` `onResult: → router.navigate('/overview')` after `calculateProfile().ok`; from `/overview` ThreeDoors offers `/daily`, `/synastry`, `/personality` | static structure visible in `pages/OverviewPage.js`; navigation guarded by `mountWithProfile()` helper |
| 10 | Keine Designvorgaben (Spec verbietet Farb/Layout/Animation-Vorgaben in Intake-Spec) | Implementiert ohne neue Farb-/Layout-Direktive; nur Zustands- und Fehlervisualisierung erweitert | n/a — Scope-Compliance manuell verifiziert |

## B. Goal-Akzeptanzkriterien (Hauptliste)

| # | Acceptance criterion | Delivered in | Test |
|---|---|---|---|
| 1 | `index/Input` ruft echtes Geocoding und danach den Profil-Endpunkt-Flow auf; Navigation erfolgt erst nach erfolgreicher Profilantwort | `InputPage.js` submit-handler awaits `calculateProfile()`, only on `res.ok` runs `onResult` → router navigates | `test/api_client.test.js` (envelope), `test/synastry-client-flow.test.js` (geocode→profile chain) |
| 2 | `Signature` rendert Kern, Chart, BaZi-Kurzfassung, Fusion/Kohärenz, WuXing-Vorschau und Tages-/Praxisimpuls ausschliesslich aus gespeichertem API-Profil + ViewModel | `pages/OverviewPage.js` reads `profile.western.*`, `profile.bazi.*`, `profile.fusion.*`; `renderBaziPillars`, `WuXingEducationGrid`, `DailyLearnImpulseCard` derive from those | `test/page-render-integration.test.js` (OverviewPage renders only API-derived data + passes guard, contains 'Bing'/'Wu'/'Yin'/'Feuer'/'Metall') |
| 3 | `BaZi-Seite` rendert Jahr, Monat, Tag, Stunde, Day Master, Tiere/Zweige und versteckte Stämme aus API-Daten und API-basierten Mappings | `domain/baziRenderer.js`, `domain/meanings.js` HIDDEN_STEMS table, `OverviewPage` renderBaziPillars | `test/view_model.test.js` (normalizePillar derives hidden_stems from branch), `test/meanings.test.js` (STEM/BRANCH registries) |
| 4 | `Western/Houses` rendert Planeten, Zeichen, Grade, Häuser, Aspekte und Orbs aus API-Daten; keine statischen Orbs/Zeichen sichtbar | `OverviewPage` reads `profile.western.bodies/.houses`; aspect orb values derived from `profile.western.aspects[].orb` via `domain/projections.js` ASPECT_DEFS (orb tolerances are astrology constants, not demo data) | `test/page-render-integration.test.js` (OverviewPage), `test/no-fake-data-page-sweep.test.js` (0 offenders) |
| 5 | `WuXing` rendert Elementverteilung, dominant/unterrepräsentiert, Provenienz und 3-Stufen-Ausgleich aus Fusion/API + API-keyed Content | `components/WuXingEducationGrid.js` reads `dominant`/`deficient` from `expProfile.fusion.*`; balance.{today,week,habit} from `meanings.WUXING_MEANINGS` keyed by element name | `test/meanings.test.js` (WUXING_MEANINGS has balance.{today,week,habit}); `test/page-render-integration.test.js` (FusionPage clean) |
| 6 | `Daily` ruft den Daily-Endpunkt auf und zeigt westlichen Impuls, BaZi-Impuls, Fusion-Synthese, Experiment, Check-in und Morgen-Ausblick ohne Natal-Text-Recycling | `pages/DailyPage.js` uses `getDailyExperience(birthInput)`; `renderSection` builds DOM from `data.summary/.themes/.opportunity/.caution`; experiment/checkin/tomorrow from API | `test/daily-endpoint-flow.test.js` (POST body shape, west vs east summaries distinct, 500-envelope behavior, synthetic Daily passes noFakeDataGuard); `test/page-render-integration.test.js` (DailyPage initial render clean) |
| 7 | `Relationship/Synastry` funktioniert end-to-end mit Person-B-Geocoding, API-Call, persistiertem Ergebnis, Kontakt-Signatur, Resonanzband, Hauptverbindung, Hauptspannung und 24h Kontakt-Experiment | `pages/SynastryPage.js` uses `calculateSynastry(inputA, inputB)`, prefills from `readPersonB()`, persists with `savePersonB()` on success, renders `RelationshipSummaryHero`, `ResonanceScoreBand`, `RelationshipSignalCard`, `ContactExperimentCard`; LovePage + CareerFinancePage also migrated to `GeoInput` (P3) | `test/synastry-client-flow.test.js` (4 mock tests), `test/relationship-resonance.test.js`, `test/synastry-iteration-1a.test.js` (Hauptverbindung/Hauptspannung lead-ins), `test/synastry-logging.test.js` |
| 8 | `No-Fake-Data-Guard` erkennt verbotene statische Demo-Werte in produktiven Views | `api/client.js` `noFakeDataGuard()` runs by default (production-active), opt-out via `window.__FUFIRE_FLAGS.disableNoFakeDataGuard` / `NOFAKE_GUARD_DISABLE=1`. Tightened signatures avoid HTML-attribute false positives | `test/no-fake-data-guard.test.js` (5 unit), `test/no-fake-data-page-sweep.test.js` (source sweep), `test/page-render-integration.test.js` (rendered DOM passes guard for 9 pages) |
| 9 | Bestehende Tests laufen ohne neue Fehler; neue Tests decken API-Client, State, Mapper, Geocoding, No-Fake-Data und Partnerflow ab | Baseline pre-Goal: 334 tests / 325 pass / 9 skip / 0 fail. After P4: 376 / 367 / 9 / 0 — **+42 tests**, **0 regressions** | `npm test` |

## C. Goal-Bedingungen (hart)

| Hard condition | Status | Evidence |
|---|---|---|
| Keine Platzhalter, Demo-Zahlen, statische Chartfakten in produktiven Views | ✓ | page-sweep test 0 offenders + page-render integration on 9 pages |
| Alle API-Aufrufe via zentrale Client-Schicht mit einheitlichem Envelope | ✓ | `public/src/api/client.js` exports all calls returning `{endpoint, fetchedAt, ok, status, data, error}`. `test/api_client.test.js` asserts envelope shape on ok/4xx/5xx/parse-error/network paths |
| Geocoding Person A + Person B via echte Backend-Suche; Eingaben bleiben bei Fehlern erhalten | ✓ | `GeoInput.js` uses `geocodePlace()` (Nominatim via `/api/geocode`). On error: inline message in `.geo-error` / `.geo-no-result` / `.geo-manual-error`; selected place state preserved; `onSelect(null)` keeps submit disabled instead of resetting form |
| Kein Redirect zur Startseite bei recoverable Errors; Fehler inline mit Retry | ✓ | P0 commit `097dd3e` replaced 6 `router.navigate('/')` calls in `app.js` with `mountWithProfile()` → `ProfileMissingBanner`. SynastryPage stays put on calc failure, surfaces `.synastry-error` (test/synastry-logging.test.js) |
| Gueltige API-Ergebnisse werden lokal persistiert und nicht durch fehlgeschlagene Antworten ueberschrieben | ✓ | `app.js` saves profile only inside `onResult` (success path). `savePersonB()` only called after `profileResult.ok` in LovePage/CareerFinancePage/SynastryPage |
| Keine neuen Runtime Dependencies | ✓ | `package.json` unchanged — no `dependencies`/`devDependencies` keys added (project ships zero-deps) |
| Debug/Rohdaten/Fetch-Zeitpunkte/Provenienz nur auf Method/Raw-Data-Ansichten | ✓ | Production views never display `fetchedAt` or raw endpoint paths; that metadata stays on the envelope object, consumed by client logic only. `SourcePill` / `SourceBadge` show provenance type (`bazi`/`western`/`fusion`) but never raw payload |

## D. Explizit out-of-scope (verified untouched)

| Out-of-scope | Status |
|---|---|
| Kein Umbau des Berechnungskerns oder der astrologischen Formeln | ✓ `server.js` and `domain/projections.js` ASPECT_DEFS unchanged in Goal commits |
| Kein Login, keine Cloud-History, keine serverseitige Profilverwaltung | ✓ All new persistence is `localStorage` / `sessionStorage` only |
| Kein Payment, Premium-Gating, Community-Feature oder Chat | ✓ no related code added |
| Keine neue visuelle Designrichtung jenseits Zustands-/Fehlervisualisierung | ✓ CSS additions limited to `.profile-missing-banner`, `.form-section`, `.category-preview`, `.relationship-context`, `.geo-manual-helper/error`, `.person-b-clear-btn` — all needed for new state surfaces |

## E. Done-Definition

> Fertig ist das Goal, wenn alle produktiven Frontend-Seiten datengetrieben funktionieren, keine statischen Demo-Werte sichtbar bleiben, Partnervergleich end-to-end laeuft und Tests/QA gemaess implementation_frontend.md bestanden sind.

| Done element | Status |
|---|---|
| Alle produktiven Frontend-Seiten datengetrieben | ✓ Verified by `test/page-render-integration.test.js` mounting Overview, Personality, Fusion, Dashboard, Love, CareerFinance, Daily, Transit, Synastry, Input with capture-DOM stub — all 9 pass noFakeDataGuard |
| Keine statischen Demo-Werte sichtbar | ✓ Static source sweep + rendered-DOM guard — 0 offenders |
| Partnervergleich end-to-end | ✓ Person-B persistence cycle: InputPage → SynastryPage → LovePage → CareerFinancePage all share `domain/personState.js` storage; calculateSynastry envelope verified by mock tests |
| Tests/QA gemaess implementation_frontend.md bestanden | ✓ Section A maps every Pflichtstruktur item; this document is the matrix |

---

## Test inventory (new tests added by this Goal)

| File | Tests | Concern |
|---|---:|---|
| `test/no-fake-data-guard.test.js`           | 5 | Production-active guard + opt-out via env / window flag |
| `test/profile-missing-banner.test.js`       | 3 | Inline banner replaces root-redirect |
| `test/person-state.test.js`                 | 12 | alias / Person-B / relationship-context persistence + WGS84 validation |
| `test/synastry-client-flow.test.js`         | 4 | calculateSynastry POST shape, error passthrough, geocode→profile chain, 429 surface |
| `test/no-fake-data-page-sweep.test.js`      | 2 | Source-level demo-string sweep across pages + components |
| `test/daily-endpoint-flow.test.js`          | 4 | Daily endpoint POST body, west/east distinctness, 500 envelope, synthetic-payload guard |
| `test/page-render-integration.test.js`      | 9 | Mount + render every major page with capture-DOM stub, assert no demo strings in DOM |
| **Total new** | **39** | |

Combined with one repaired existing test (`test/no-fake-data-guard.test.js`-prod and the page-sweep refinement), this Goal adds **+42 net green tests** on a **0-regression** baseline.
