// test/e2e/smoke-main-pages.spec.js
// Smoke-Tests für alle Hauptseiten des SPA.
// Jede Seite muss #app befüllt rendern und eine sichtbare Überschrift zeigen.
// Screenshots landen unter docs/qa/screenshots/i0-smoke/<slug>.png.
//
// Architektur-Notizen:
//  - Shell: <div id="app" role="main"> in index.html (kein <main>-Tag)
//  - Router: hash-basiert (window.location.hash), registriert via router.start()
//  - ESM-Module: deferred — nach domcontentloaded läuft erst der Router
//  - Profil-fehlt-Banner: <h2> "Profil fehlt" für alle Seiten ohne sessionStorage-Profil
//  - InputPage (/): hat <h1> "Berechne deine Fusion-Signatur"

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOT_DIR = 'docs/qa/screenshots/i0-smoke';

test.beforeAll(() => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

const ROUTES = [
  { slug: '01-root',      path: '/',            label: 'Root / Dashboard' },
  { slug: '02-overview',  path: '/#/overview',  label: 'Overview' },
  { slug: '03-bazi',      path: '/#/bazi',      label: 'BaZi' },
  { slug: '04-western',   path: '/#/western',   label: 'Western' },
  { slug: '05-wuxing',    path: '/#/wuxing',    label: 'Wu-Xing' },
  { slug: '06-fusion',    path: '/#/fusion',    label: 'Fusion' },
  { slug: '07-tagespuls', path: '/#/daily',     label: 'Tagespuls' },
  { slug: '08-haeuser',   path: '/#/houses',    label: 'Haeuser' },
  { slug: '09-beziehung', path: '/#/synastry',  label: 'Beziehung' },
  { slug: '10-daten',     path: '/#/',           label: 'Daten (Eingabe via Hash-Route)' },
  { slug: '11-methode',   path: '/#/method',    label: 'Methode' },
];

for (const route of ROUTES) {
  test(`smoke: ${route.label} (${route.path}) rendert #app + heading`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: 'load' });

    // HTTP muss erfolgreich sein.
    expect(response, `keine HTTP-Antwort für ${route.path}`).not.toBeNull();
    expect(response.status(), `HTTP ${response.status()} für ${route.path}`).toBeLessThan(400);

    // App-Container muss existieren (ESM-Router hängt alles daran).
    const app = page.locator('#app');
    await expect(app, '#app-Container fehlt').toHaveCount(1);

    // Warten bis der Hash-Router die Seite gerendet hat (#app nicht leer).
    await app.locator('> *').first().waitFor({ state: 'attached', timeout: 10_000 });

    // Mindestens eine sichtbare Überschrift (h1 auf InputPage, h2 auf Banner-Seiten).
    const heading = page.locator('#app h1, #app h2').first();
    await expect(heading, 'keine sichtbare Überschrift in #app').toBeVisible({ timeout: 10_000 });

    // Screenshot ablegen (full page).
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${route.slug}.png`),
      fullPage: true,
    });
  });
}
