# QA Report: B2 — BaZi-Seite Strukturreform

**Iteration:** B2
**Datum:** 2026-05-22
**Reviewer:** Claude
**Plan-Referenz:** `docs/plans/2026-05-22-iteration-gates-implementation.md`

---

## /goal

/goal
Goal: BaZi-Seite zeigt 4 Saeulen in einer Linie mit gemeinsamem Detailpanel

Ziel. Die BaZi-Seite ist zu informationsdicht und erzeugt durch vier separate
Dropdown-Drawers eine unuebersichtliche UX. Ziel ist eine klare Hierarchie: Day Master
als Kern oben, darunter die vier gleich hohen Saeulenkaertchen in einer Zeile,
Klick auf Saeule oeffnet ein einziges gemeinsames Detailpanel darunter. Narrative
Texte werden explizit als Leseschluessel markiert, nicht als absolute Wahrheit.
Provenienz (API vs. abgeleitet) wird fuer Hidden Stems sichtbar gemacht.

Scope. `public/src/pages/BaziPage.js`, `public/src/styles/main.css` (BaZi-Sektion).
Keine Aenderung an anderen Seiten, Routing, Backend oder baziPillarEnrichment.

Bedingungen (hart).
- TDD-first: Vor Implementierung muss ein fehlschlagender Test existieren.
- Kein Abschluss ohne Playwright-Live-Test, Screenshots und Code Review.
- Review-Fix-Review wird wiederholt, bis keine Critical/Major Findings offen sind.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte, keine Backend-Architekturverletzung.

Akzeptanzkriterien.
- [data-bazi-role="day-master-kern"] ist sichtbar.
- 4 [data-bazi-pillar]-Elemente stehen in gleicher Zeile und gleicher Hoehe (Desktop).
- Genau 1 [data-bazi-shared-detail]-Panel existiert, 0 [data-bazi-pillar-dropdown]-Elemente.
- [data-bazi-narrative-marker] traegt Text mit "Leseschluessel".
- 4 [data-bazi-hidden-stems-source]-Labels zeigen "API" oder "aus Branch-Tabelle abgeleitet".
- [data-bazi-lucky-pillar] enthaelt "nicht von API geliefert".
- Screenshot-Matrix: collapsed + expanded fuer beide Themes.

Explizit out-of-scope.
- Kein Backend-Refactor.
- Keine Aenderungen an anderen Seiten.
- Keine neue Berechnung.

Done-Definition. Iteration nur abgeschlossen wenn alle Playwright-Assertions gruen,
npm test gruen, Screenshot-Matrix komplett, optischer Review und Code Review PASS.

Zeichenzahl: <1500

Reference-Doc: docs/qa/2026-05-22-b2-bazi-restructure.md
