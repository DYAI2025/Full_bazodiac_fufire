# I1 — Design-System Review

## Ziel
Bazodiac Frontend aus dem Prototyp-Look heraus: Fonts, Farben, Spacing, Karten, Header global konsistent. Sichtbarer Browser-Unterschied ohne Feature-Regression.

## Testcommands
```bash
npm test                          # 647/656 pass, 0 fail (9 skipped)
APP_BASE_URL=http://127.0.0.1:4100 npm run test:e2e  # 11/11 pass
```

## Browser/Viewport
- Chromium headless, 1440×900
- Getestet auf: Root, Overview, BaZi, Western, Wu-Xing, Fusion, Tagespuls, Häuser, Beziehung, Methode

## Screenshots
`docs/qa/screenshots/i1-design/` — 10 PNGs

## Optischer Review
- [ ] Root: Neue Gold/Ember-Palette sichtbar (statt Blau/Lila)
- [ ] Fonts: Playfair Display + Inter laden (Google Fonts)
- [ ] MethodPage: Komplett auf PageShell + SectionHeader + LuxuryCard umgebaut — sieht wie Premium-Card-Layout aus
- [ ] Overview „Technische Basis" section: SectionHeader (Eyebrow + h2) + LuxuryCard sichtbar

## Code Review

### TASK-I1-001: CSS Token Integrity Tests
**Status:** PASS
- `test/css-token-integrity.test.js` — 6 tests; legacy-Hex-Literale, Serif-Klassen, Gold/Ember-Accent
- `test/design-tokens-coverage.test.js` — Extended: legacy `--accent` muss durch `--bz-*` geroutet sein

### TASK-I1-002: Token Consolidation
**Status:** PASS
- `tokens.css`: Cormorant/Manrope → Playfair Display + DM Serif + Inter + Plus Jakarta Sans
- Ember palette: `--bz-ember`, `--bz-ember-light`, `--bz-ember-deep`, `--bz-amber`
- Spacing tokens: `--bz-space-sm/md/lg`
- `main.css`: Legacy `:root { --accent: #7c8cff }` Block entfernt; `body` nutzt `var(--bz-font-ui)`

### TASK-I1-003: Layout Primitives
**Status:** PASS
- `PageShell.js`, `SectionHeader.js`, `LuxuryCard.js` — je vanilla ESM, kein Framework
- 20/20 Unit-Tests grün
- MethodPage vollständig migriert; OverviewPage pilot (Technische Basis section)
- `playwright.config.mjs`: PORT env fix für webServer

## Findings

| # | Severity | Beschreibung | Status |
|---|----------|--------------|--------|
| F1 | Minor | i0-smoke Screenshots wurden beim I1-Serverstart überschrieben (git shows changed) — inhaltlich identisch, nur Timestamp/Pixel-differ | Akzeptiert |
| F2 | Minor | OverviewPage nutzt noch `app.innerHTML` für Hauptstruktur; Pilot ist additive Erweiterung, kein Full-Refactor | Geplant I4 |
| F3 | Info | `luxury-card--hero` ist BEM-Modifier via Template-String, nicht Literal — ALLOW_KNOWN_TEMPLATE erweitert | Fix applied |

## Fixes
- F3: ALLOW_KNOWN_TEMPLATE in `test/css-selector-coverage.test.js` erweitert — sofort gefixt
- F1: Akzeptiert (kein Regressionsrisiko)
- F2: Full-Refactor OverviewPage ist I4-Scope

## Finaler Status
**PASS** — I1 abgeschlossen.
- 647/656 Unit-Tests pass (9 skipped, 0 fail)
- 11/11 Playwright smoke pass
- 10 I1-Screenshots committed
- Keine offenen Critical/Major Findings
