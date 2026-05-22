// test/e2e/_helpers/theme.spec.js
import { test, expect } from '@playwright/test';
import { setTheme } from './theme.js';

test('setTheme("morning") writes data-theme=morning before first render', async ({ page }) => {
  await setTheme(page, 'morning');
  await page.goto('/');
  const attr = await page.locator('html').getAttribute('data-theme');
  expect(attr).toBe('morning');
});

test('setTheme("planetarium") writes data-theme=planetarium', async ({ page }) => {
  await setTheme(page, 'planetarium');
  await page.goto('/');
  const attr = await page.locator('html').getAttribute('data-theme');
  expect(attr).toBe('planetarium');
});
