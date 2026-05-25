# I2: Rolling Letters — QA Review

**Date:** 2026-05-22  
**Iteration:** I2  
**Status:** PASS

---

## Ziel

Rolling Letters wirklich animieren. Titel/Brand-Elemente haben sichtbaren, kontrollierten Letter-Roll im echten Browser. Reduced Motion deaktiviert Animation vollständig.

---

## Testcommands

```bash
node --test test/rolling-text.test.js
# → 13/13 pass

npm test
# → 652/661 pass, 0 fail, 9 skipped

APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/rolling-letters.spec.js --config=playwright.config.mjs
# → PASS (3) FAIL (0)
```

---

## Browser / Viewport

- Chromium (Playwright default), 1280×720
- Server: PORT=4100 node server.js

---

## Screenshots

| Test | Screenshot |
|------|------------|
| Motion enabled — t=0 (may be scrambling) | docs/qa/screenshots/i2-rolling/motion-on-t0.png |
| Motion enabled — t=1200ms (settled) | docs/qa/screenshots/i2-rolling/motion-on-t1200.png |
| Reduced motion | docs/qa/screenshots/i2-rolling/reduced-motion.png |
| Overview hero | docs/qa/screenshots/i2-rolling/overview-hero.png |

---

## Optischer Review

- `[data-rolling-text="hero"]` vorhanden auf MethodPage, FusionPage, DailyPage, OverviewPage
- `rolling-text--settled` class wird gesetzt nach Animation
- `rolling-text--rolling` class erscheint nicht bei Reduced Motion
- `aria-label` bleibt unverändert (Screenreader-Safe)
- Non-space-Zeichen stimmen überein (stripSpaces-Vergleich)

---

## Implementierte Änderungen

| Datei | Art |
|-------|-----|
| `public/src/components/RollingText.js` | Neu: RAF scramble engine, startRolling/stopRolling API |
| `public/src/styles/main.css` | Erweitert: `.rolling-text`, `[data-roll-char]`, `--rolling`/`--settled` hooks |
| `public/src/pages/MethodPage.js` | `[data-page-title]` → RollingText hero |
| `public/src/pages/FusionPage.js` | `.insight-hero__title` → RollingText hero |
| `public/src/pages/DailyPage.js` | `.daily-title` → RollingText hero |
| `public/src/pages/OverviewPage.js` | `decorateRollingText` + `.overview-hero__title` → RollingText hero |
| `test/rolling-text.test.js` | 5 neue Tests: RAF scheduling, span mutation, settled, reduced-motion, idempotenz |
| `test/e2e/rolling-letters.spec.js` | Playwright: motion-on, reduced-motion, overview screenshot |
| `test/css-selector-coverage.test.js` | ALLOW_KNOWN_TEMPLATE: rolling-text, --rolling, --settled |

---

## Code Review

- Keine Fake-Daten, keine hardcodierten astrologischen Werte
- Backend-Architektur unberührt
- Vanilla ESM bleibt
- `aria-label` bewahrt Zugänglichkeit (Screenreader überspringen Scramble-Spans via `aria-hidden`)
- `prefers-reduced-motion` wird korrekt ausgewertet
- RAF/cancelAnimationFrame mit vollständigem Guard (`typeof cancelAnimationFrame === 'function'`)
- Keine Direktwerte für CSS-Farben in neuen Klassen

---

## Findings

Keine Critical/Major Findings.

**Minor (gelöst):**
- `innerText` bei inline-block spans kollabiert Leerzeichen → stripSpaces-Vergleich in Playwright-Test
- Playwright-Port 3000 belegt → PORT=4100 in webServer config

---

## Finaler Status: PASS
