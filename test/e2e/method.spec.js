// test/e2e/method.spec.js — I5 Playwright evidence spec.
// Verifies the MethodPage API/Daten-Provenienz layout in a real browser.
// Run: APP_BASE_URL=http://127.0.0.1:4100 npx playwright test test/e2e/method.spec.js --config=playwright.config.mjs

import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOT_DIR = path.resolve('docs/qa/screenshots/i5-method');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe('I5 MethodPage', () => {
  test('method page loads without JS error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/method');
    await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'method-initial.png'), fullPage: true });
    expect(errors.filter((e) => !/fetch|network|CORS/i.test(e))).toHaveLength(0);
  });

  test('provenance table renders with header row', async ({ page }) => {
    await page.goto('/#/method');
    await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
    await page.waitForTimeout(800);
    const table = page.locator('table.provenance-table');
    await expect(table).toBeVisible();
    const headerText = await table.locator('thead').textContent();
    expect(headerText).toMatch(/Endpoint/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'method-provenance-table.png'), fullPage: true });
  });

  test('live status section is present', async ({ page }) => {
    await page.goto('/#/method');
    await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
    await page.waitForTimeout(800);
    const statusSection = page.locator('[data-section="live-status"]');
    await expect(statusSection).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'method-live-status.png'), fullPage: true });
  });

  test('raw data details block is closed by default', async ({ page }) => {
    await page.goto('/#/method');
    await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
    await page.waitForTimeout(1000);
    const details = page.locator('details.raw-data').first();
    const count = await details.count();
    if (!count) return;
    await expect(details).not.toHaveAttribute('open', /.*/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'method-raw-closed.png'), fullPage: true });
  });
});
