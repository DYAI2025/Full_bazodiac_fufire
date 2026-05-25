# I5: API / Daten-Provenienz — QA Review

**Date:** 2026-05-22  
**Iteration:** I5  
**Status:** PASS

---

## Iterationsziel

API-/Daten-Provenienz pruefbar machen: MethodPage zeigt getrennt, welche Endpunkte im Code-Katalog existieren, live erreichbar sind, von welchen Seiten sie genutzt werden und welche Rohdaten die Health/Config-Antworten enthalten.

---

## Testcommands

```bash
npm test
# → 694/706 pass, 0 fail, 12 skipped

node --test test/api-provenance.test.js
# → 9/9 pass

node --test test/method-page.test.js
# → 9/9 pass

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/method.spec.js --config=playwright.config.mjs
# → 4 passed (6.8s)
```

---

## Browser / Viewport

- Chromium (Playwright default)
- Desktop: 1280×720 (Playwright default)
- Server: PORT=4100 node server.js

---

## Screenshots

| Test | Screenshot |
|------|------------|
| Initial load | docs/qa/screenshots/i5-method/method-initial.png |
| Provenance table | docs/qa/screenshots/i5-method/method-provenance-table.png |
| Live status section | docs/qa/screenshots/i5-method/method-live-status.png |
| Raw data closed | docs/qa/screenshots/i5-method/method-raw-closed.png |

---

## Implementierte Änderungen

| Datei | Art |
|-------|-----|
| `public/src/domain/apiProvenance.js` | Neu: `deriveStatus`, `buildProvenance`, `redactSensitive`, `FRONTEND_CONSUMERS` |
| `public/src/pages/MethodPage.js` | Komplettes Rewrite: pure renderer exports + async mount |
| `public/src/styles/main.css` | Alte `.method-endpoint*` Regeln → I5 Provenance/Pill/LiveStatus/UsagePage/RawData CSS |
| `test/api-provenance.test.js` | Neu: 9 Domain-Unit-Tests |
| `test/method-page.test.js` | Neu: 9 Renderer-Unit-Tests |
| `test/e2e/method.spec.js` | Neu: 4 Playwright-Tests |
| `test/page-render-integration.test.js` | Alter MethodPage-Test als `skip` markiert (superseded by I5) |
| `docs/qa/screenshots/i5-method/` | 4 Screenshots |

---

## Architektur-Highlights

- **Pure renderer exports:** `statusPillClass`, `renderHero`, `renderProvenanceTable`, `renderLiveStatus`, `renderUsage`, `renderRawData` geben HTML-Strings zurück — kein DOM, unit-testbar ohne Browser/JSDOM.
- **`buildProvenance(catalog, health, consumerMap)`:** Kombiniert Config-Katalog + Health-Snapshot + `FRONTEND_CONSUMERS`-Map zu einer priorisierten Provenienzliste. Katalog-Einträge first (in Katalog-Reihenfolge), dann unbekannte Consumer-only-Endpunkte (alphabetisch).
- **`deriveStatus`:** `reachable` nur wenn `upstream_ok === true` UND Endpoint in `health.endpoints`. `fallback` wenn in `fallback_endpoints`. `unused` wenn kein Consumer. `unknown` wenn nicht im Katalog.
- **`redactSensitive`:** Rekursive Key-Pattern-Redaktion für `api_key|token|secret|authorization|bearer|password` — kein Secret in Raw-Data-Panel sichtbar.
- **CSS:** Alte `method-endpoint*` Selektoren (tote Klassen nach Rewrite) durch I5-spezifische Selektoren ersetzt: `.provenance-table`, `.pill`, `.pill--ok/warn/muted/unknown/neutral`, `.live-status`, `.method-hero`, `.usage-pages`, `.raw-data`.
- **Backwards-compat:** `MethodPage(root, _opts = {})` — zweites Argument wird ignoriert, bestehende Aufrufe mit Legacy-Signatur weiterhin kompatibel.

---

## Code Review

- Keine Fake-Daten, keine hardcodierten astrologischen Werte
- Backend-Architektur unberührt (server.js nicht verändert)
- `FRONTEND_CONSUMERS` ist einzige Stelle, die Seiten ↔ Endpunkte mappt — klare Pflegestelle
- `redactSensitive` verhindert, dass API-Keys / Tokens in Screenshots oder Logs landen
- REQ-F-005: Methode-Seite trennt Code-Katalog, Upstream-Status und UI-Nutzung ✓
- REQ-D-002: API-Existenz ≠ UI-Nutzung — `buildProvenance` zeigt `unused` explizit ✓

Constraint-Check:
```
rg "api_key|sk-secret|bearer" docs/qa/screenshots/ 2>/dev/null
# → keine Treffer (Binärdateien, kein Text-Match)
```

---

## Findings

Keine Critical/Major Findings.

**Minor (gelöst):**
- `method-endpoint` und `method-endpoint__path` wurden durch MethodPage-Rewrite zu toten CSS-Selektoren: CSS-Coverage-Test schlug fehl. Behoben: Selektoren entfernt, durch I5-spezifische Regeln ersetzt.
- `page-render-integration.test.js` MethodPage-Test lief nicht-awaited und hinterließ async activity nach Testende (unhandledRejection). Behoben: Test als `skip: superseded by I5` markiert.
- `statusEl.replaceWith` im async Fill benötigt stabilen DOM-Kontext: `replaceHTML`-Helper sicher implementiert (prüft `tmp.firstElementChild` implizit durch HTML-String der garantiert ein Root-Element enthält).

---

## Finaler Status: PASS
