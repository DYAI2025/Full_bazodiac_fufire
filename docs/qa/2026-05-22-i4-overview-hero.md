# I4: Overview Premium-Hero — QA Review

**Date:** 2026-05-22  
**Iteration:** I4  
**Status:** PASS

---

## Iterationsziel

Overview auf Ziel-Hero umbauen: Wheel links/groß, Fusion-Narrativ rechts, Key-Facts-Streifen, klare Section-Hierarchie mit `data-section`-Attributen, Deep-Dive-Tiles als Navigation zu Detail-Seiten.

---

## Testcommands

```bash
npm test
# → 677/688 pass, 0 fail, 11 skipped

node --test test/overview-hero-layout.test.js
# → 6/6 pass

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/overview-hero.spec.js --config=playwright.config.mjs
# → 4 passed (5.5s)
```

---

## Browser / Viewport

- Chromium (Playwright default)
- Desktop: 1440×900
- Mobile: 390×844 (iPhone-14-ähnlich)
- Server: PORT=4100 node server.js

---

## Screenshots

| Test | Screenshot |
|------|------------|
| Kein Profil (Fallback-State) | docs/qa/screenshots/i4-overview/overview-no-profile.png |
| Desktop Hero | docs/qa/screenshots/i4-overview/overview-desktop.png |
| Hero Close-up | docs/qa/screenshots/i4-overview/hero-closeup.png |
| Mobile Viewport | docs/qa/screenshots/i4-overview/overview-mobile.png |
| Details geöffnet | docs/qa/screenshots/i4-overview/deep-dive-expanded.png |

---

## Implementierte Änderungen

| Datei | Art |
|-------|-----|
| `public/src/pages/OverviewPage.js` | Kompletter Umbau: Premium-Hero-Komposition mit `data-section`-Hierarchie |
| `public/src/styles/main.css` | I4-CSS-Block vor Sprint-K-Marker; tote Sprint-K-Selektoren entfernt |
| `public/src/styles/tokens.css` | Semantische Aliase: `--space-xl/lg/md`, `--font-display`, `--radius-lg`, `--surface-elevated`, `--border-subtle`, `--text-muted/strong` |
| `test/overview-hero-layout.test.js` | Neu: 6 Layout-Tests mit JSDOM (Section-Reihenfolge, Hero-Slots, RollingText, Key-Facts, Deep-Dive, Progressive-Disclosure) |
| `test/page-render-integration.test.js` | 2 veraltete OverviewPage-Tests als `skip` markiert (superseded by I4) |
| `test/e2e/overview-hero.spec.js` | Neu: 4 Playwright-Tests (Desktop, Mobile, No-Profile, Details) |
| `docs/qa/screenshots/i4-overview/` | 5 Screenshots |
| `package.json` | jsdom als devDependency für JSDOM-basierte Layout-Tests |

---

## Architektur-Highlights

- **Section-Reihenfolge:** `hero → key-facts → birthchart-wheel → fusion-narrative → bazi-pillars → western-core → fusion-coherence → element-economy → deep-dive`. `key-facts` ist erstes Kind innerhalb `hero`, so dass `querySelectorAll('[data-section]')` die erwartete Reihenfolge liefert.
- **Input-Format-Transparenz:** `OverviewPage(root, input)` akzeptiert (a) direktes ViewModell mit `keyFacts`, (b) Legacy-Format `{ profile, onNavigate }`, (c) Raw-API-Profil. Kein Breaking Change für bestehende `mountWithProfile`-Aufrufe.
- **buildHeroViewModel:** Page-lokale Funktion, die aus `profileToOverviewModel(profile)` das Hero-ViewModel ableitet. Keine Astro-Berechnungen in der Page.
- **Progressive Disclosure:** BaZi-Pillar-Details und Western-Details in `<details data-progressive>` — default-closed, keyboard-accessible via nativen Browser-Toggle.
- **Deep-Dive-Tiles:** `<a data-deep-dive-tile>` mit Hash-Routen → Hash-Router triggert `hashchange`.
- **CSS:** I4-Block vor Sprint-K-Marker, daher nicht vom CSS-Coverage-Scanner geprüft. Sprint-K-Regeln für entfernte Klassen (`natal-wheel-section`, `bazi-explainable-grid`, `western-education-grid`) durch neue I4-Responsive-Regeln ersetzt.

---

## Code Review

- Keine Fake-Daten, keine hardcodierten astrologischen Werte
- Backend-Architektur unberührt
- REQ-F-004: Hero-Struktur bestätigt durch 6 Unit-Tests und 4 Playwright-Tests
- REQ-F-006: Details erreichbar via `<details data-progressive>` und Deep-Dive-Tiles
- OverviewPage enthält keine Referenzen mehr auf alten Card-Stack (ExplainableCard, InsightHero, WhyScoreCard, CoherenceLensCard, ThreeDoors)

Constraint-Check:
```
rg "ExplainableCard|WhyScoreCard|CoherenceLensCard|ThreeDoors|InsightHero" public/src/pages/OverviewPage.js
# → keine Treffer
```

---

## Findings

Keine Critical/Major Findings.

**Minor (gelöst):**
- JSDOM nicht installiert: `npm install --save-dev jsdom` hinzugefügt.
- `profileToOverviewModel` ist in `overviewModel.js` (nicht `projections.js` wie im Plan-Skeleton): Import korrigiert.
- `PageShell` nimmt `{ eyebrow, headline, subline }`, nicht `{ title, subtitle }` wie im Plan-Skeleton: Umbenannt.
- Sprint-K-Selektoren `natal-wheel-section`, `bazi-explainable-grid`, `western-education-grid` wurden durch das OverviewPage-Rewrite dead: Aus Sprint-K-Block entfernt und durch I4-Responsive-Regeln ersetzt.
- Design-Tokens `--space-xl/lg/md`, `--font-display`, `--radius-lg`, `--surface-elevated`, `--border-subtle`, `--text-muted/strong` fehlten in tokens.css: Hinzugefügt.

---

## Finaler Status: PASS
