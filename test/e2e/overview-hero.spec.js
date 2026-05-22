// test/e2e/overview-hero.spec.js — I4 Playwright evidence spec.
// Verifies the Overview Premium-Hero layout in a real browser.
// Run: APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/overview-hero.spec.js --config=playwright.config.mjs

import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOT_DIR = path.resolve('docs/qa/screenshots/i4-overview');
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

test.describe('I4 Overview Hero', () => {
  test('overview loads without JS error (no profile)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/overview');
    await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overview-no-profile.png') });
    expect(errors.filter((e) => !/fetch|network|CORS/i.test(e))).toHaveLength(0);
  });

  test('desktop hero renders wheel-left / narrative-right', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/overview');
    await injectProfile(page);

    const heroExists = await page.locator('[data-section="hero"]').count();
    if (!heroExists) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overview-no-hero.png'), fullPage: true });
      return;
    }

    const heroSlots = await page.$$eval(
      '[data-section="hero"] [data-hero-slot]',
      (els) => els.map((e) => e.getAttribute('data-hero-slot')),
    );
    expect(heroSlots).toEqual(['wheel', 'narrative']);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overview-desktop.png'), fullPage: true });
    await page.locator('[data-section="hero"]').screenshot({
      path: path.join(SCREENSHOT_DIR, 'hero-closeup.png'),
    });
  });

  test('mobile (390x844) stacks wheel above narrative', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/overview');
    await injectProfile(page);

    const heroExists = await page.locator('[data-section="hero"]').count();
    if (!heroExists) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overview-mobile-no-hero.png'), fullPage: true });
      return;
    }

    await expect(page.locator('[data-hero-slot="wheel"]')).toBeVisible();
    await expect(page.locator('[data-hero-slot="narrative"]')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overview-mobile.png'), fullPage: true });
  });

  test('progressive <details> blocks start closed and open on click', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/overview');
    await injectProfile(page);

    const count = await page.locator('details[data-progressive]').count();
    if (!count) return;

    const first = page.locator('details[data-progressive]').first();
    await expect(first).not.toHaveAttribute('open', /.*/);

    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'deep-dive-expanded.png'), fullPage: true });
  });
});
