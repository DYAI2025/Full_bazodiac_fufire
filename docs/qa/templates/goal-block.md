/goal
Goal: <max. 80 Zeichen, Imperativ>

Ziel. <Was sieht der Nutzer am Ende? Welcher Nutzerwert wird geliefert?
2-4 Saetze, ohne vage Worte.>

Scope. <Konkrete Dateien, Seiten, Komponenten, Grenzen.>

Bedingungen (hart).
- TDD-first: Vor jeder fachlichen Aenderung existiert ein fehlschlagender Test.
- Kein Abschluss ohne Playwright-Live-Test gegen laufende App.
- Screenshot-Matrix (desktop-dark, desktop-light, mobile-dark, mobile-light) pro betroffener Seite.
- Optischer Review nach Screenshots.
- Code Review nach optischem Review.
- Review-Fix-Review wird wiederholt bis 0 Critical / 0 Major Findings offen sind.
- Keine Fake-Daten, keine hardcodierten astrologischen Zielwerte.
- Keine 0-Grad-Fallbacks fuer fehlende Longitudes.
- Keine Backend-Architekturverletzung, keine neue DB-Migration, keine neue Runtime-Dependency ohne Entscheidung.

Akzeptanzkriterien.
- <messbares Kriterium 1>
- <messbares Kriterium 2>
- <messbares Kriterium 3>

Explizit out-of-scope.
- Kein Backend-Refactor.
- Keine neue astrologische Berechnung im Frontend.
- Keine neue externe UI-Framework-Migration.
- Kein Polish ohne Daten- und Review-Nachweis.

Done-Definition. Iteration nur abgeschlossen wenn:
`/goal` vorhanden + unter 4000 Zeichen, TDD-Nachweis vorhanden, `npm test` gruen,
Playwright-Live-Test gruen (desktop + mobile, dark + light), Screenshot-Matrix komplett,
optischer Review bestanden, Code Review bestanden, 0 offene Critical/Major Findings,
QA-Bericht aktualisiert.

Reference-Doc: docs/qa/<YYYY-MM-DD>-<iteration-slug>.md
