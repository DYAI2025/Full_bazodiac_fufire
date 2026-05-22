// test/e2e/subpages-consistency.spec.js — I6 Playwright evidence.
// Verifies each subpage exposes its hero with bz-h1 + data-section in a real browser.
// Run: APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/subpages-consistency.spec.js --config=playwright.config.mjs

import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOT_DIR = path.resolve('docs/qa/screenshots/i6-subpages');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = {
  western: {
    bodies: {
      Sun:  { sign: 'Pisces',  longitude: 353.15 },
      Moon: { sign: 'Virgo',   longitude: 158.23 },
    },
    angles: { Ascendant: 27.71, MC: 280.66 },
    houses: {
      '1':  { longitude: 27.71,  sign: 'Aries' },
      '4':  { longitude: 100.0,  sign: 'Cancer' },
      '7':  { longitude: 207.71, sign: 'Libra' },
      '10': { longitude: 280.66, sign: 'Capricorn' },
    },
    aspects: [],
  },
  bazi: {
    day_master: { stem: 'Yang Holz', element: 'Holz' },
  },
  fusion: {
    headline: 'Pionier mit Tiefenmotor',
    coherence_index: 0.78,
    remediation: { actions: [{ element: 'Wasser', activities: ['Spazieren'] }] },
  },
};

async function injectProfile(page) {
  await page.evaluate((p) => {
    sessionStorage.setItem('azodiac_profile', JSON.stringify(p));
  }, PROFILE);
  await page.reload();
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
  await page.waitForTimeout(400);
}

const SUBPAGES = [
  { name: 'bazi',     route: '/bazi'     },
  { name: 'western',  route: '/western'  },
  { name: 'wuxing',   route: '/wuxing'   },
  { name: 'fusion',   route: '/fusion'   },
  { name: 'houses',   route: '/houses'   },
  { name: 'daily',    route: '/daily'    },
  { name: 'synastry', route: '/synastry' },
];

for (const { name, route } of SUBPAGES) {
  test(`${name}: hero uses bz-h1 design-token class`, async ({ page }) => {
    await page.goto(`/#${route}`);
    await injectProfile(page);
    const h1 = page.locator('h1.bz-h1, .bz-h1').first();
    await expect(h1).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}-hero.png`), fullPage: true });
  });

  test(`${name}: declares at least one data-section`, async ({ page }) => {
    await page.goto(`/#${route}`);
    await injectProfile(page);
    const sections = await page.locator('[data-section]').count();
    expect(sections).toBeGreaterThan(0);
  });
}
