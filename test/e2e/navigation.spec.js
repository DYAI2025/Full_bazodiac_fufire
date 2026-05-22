// test/e2e/navigation.spec.js — I7 TASK-I7-006
// End-to-end navigation contract: every nav tab + Karten-Dropdown route reaches
// its target without JS errors. Catches regressions where IA cuts break links.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOT_DIR = path.resolve('docs/qa/screenshots/i7-navigation');
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
  bazi:   { day_master: { stem: 'Yang Holz', element: 'Holz' } },
  fusion: { headline: 'Pionier mit Tiefenmotor', coherence_index: 0.78 },
};

async function injectProfile(page) {
  await page.evaluate((p) => sessionStorage.setItem('azodiac_profile', JSON.stringify(p)), PROFILE);
  await page.reload();
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
  await page.waitForTimeout(300);
}

const TOP_LEVEL_TABS = [
  { label: 'Übersicht', expectedHash: '#/overview' },
  { label: 'Tagespuls', expectedHash: '#/daily' },
  { label: 'Beziehung', expectedHash: '#/synastry' },
  { label: 'Daten',     expectedHash: '#/' },
  { label: 'Methode',   expectedHash: '#/method' },
];

const GROUPED_TABS = [
  { label: 'BaZi',    expectedHash: '#/bazi' },
  { label: 'Western', expectedHash: '#/western' },
  { label: 'Wu-Xing', expectedHash: '#/wuxing' },
  { label: 'Fusion',  expectedHash: '#/fusion' },
  { label: 'Häuser',  expectedHash: '#/houses' },
];

test.describe('I7 Navigation', () => {
  test('SecondaryNav shows 6 top-level entries (5 tabs + 1 Karten dropdown)', async ({ page }) => {
    await page.goto('/');
    await page.locator('.secondary-nav').waitFor({ state: 'attached', timeout: 8000 });
    const topLevelButtons = await page.locator('.secondary-nav > button').count();
    const dropdowns       = await page.locator('.secondary-nav > details').count();
    expect(topLevelButtons).toBe(5);
    expect(dropdowns).toBe(1);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'nav-baseline.png'), fullPage: false });
  });

  for (const tab of TOP_LEVEL_TABS) {
    test(`top-level tab "${tab.label}" navigates to ${tab.expectedHash}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto('/');
      await injectProfile(page);
      await page.locator(`.secondary-nav > button:text-is("${tab.label}")`).click();
      await page.waitForFunction(
        (h) => window.location.hash === h,
        tab.expectedHash,
        { timeout: 4000 },
      );
      expect(errors.filter((e) => !/fetch|network|CORS/i.test(e))).toHaveLength(0);
    });
  }

  test('Karten dropdown opens on click and exposes 5 nested buttons', async ({ page }) => {
    await page.goto('/');
    await page.locator('.secondary-nav').waitFor({ state: 'attached', timeout: 8000 });
    const dropdown = page.locator('.secondary-nav__group');
    await expect(dropdown).toHaveCount(1);
    await dropdown.locator('summary').click();
    await expect(dropdown).toHaveAttribute('open', /.*/);
    const nestedButtons = await dropdown.locator('button.secondary-nav__tab--nested').count();
    expect(nestedButtons).toBe(5);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'karten-open.png'), fullPage: false });
  });

  for (const tab of GROUPED_TABS) {
    test(`grouped tab "${tab.label}" reachable via Karten dropdown`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto('/');
      await injectProfile(page);
      const dropdown = page.locator('.secondary-nav__group');
      await dropdown.locator('summary').click();
      await dropdown.locator(`button:text-is("${tab.label}")`).click();
      await page.waitForFunction(
        (h) => window.location.hash === h,
        tab.expectedHash,
        { timeout: 4000 },
      );
      expect(errors.filter((e) => !/fetch|network|CORS/i.test(e))).toHaveLength(0);
    });
  }
});
