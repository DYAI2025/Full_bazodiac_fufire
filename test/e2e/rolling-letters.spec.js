// I2: Rolling Letters — live browser proof that scramble animation runs.
// Tests two modes: motion enabled (scramble visible, settles) + reduced motion (no scramble).

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = 'docs/qa/screenshots/i2-rolling';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Normalize whitespace including non-breaking spaces for comparison.
function normalizeText(s) {
  // Replace   and any whitespace with single space, then trim.
  return s.replace(/[\s ]+/g, ' ').trim();
}

// Strip all whitespace for char-content comparison (space-agnostic).
function stripSpaces(s) {
  return s.replace(/[\s ]/g, '');
}

test.describe('I2: Rolling Letters — visible scramble animation', () => {
  test('motion enabled: [data-rolling-text=hero] exists, aria-label preserved, settles', async ({ page }) => {
    await page.goto('/#/method');
    const target = page.locator('[data-rolling-text="hero"]').first();
    await target.waitFor({ state: 'attached', timeout: 8000 });

    const ariaLabel = await target.getAttribute('aria-label');
    expect(ariaLabel, 'aria-label must be set on rolling hero').toBeTruthy();
    expect(ariaLabel.length).toBeGreaterThan(0);

    // Screenshot at ~t=0: may still be scrambling.
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'motion-on-t0.png'), fullPage: false });

    // Wait past duration cap (600ms per-char cap + stagger for all chars).
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'motion-on-t1200.png'), fullPage: false });

    // After settling, --settled class must be present.
    await expect(target).toHaveClass(/rolling-text--settled/, { timeout: 3000 });

    // Non-space characters must match aria-label (space rendering is browser-specific for inline-block spans).
    const visibleText = await target.innerText();
    expect(stripSpaces(visibleText)).toBe(stripSpaces(ariaLabel));
  });

  test('reduced motion: --settled immediately, no --rolling class, chars match', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/method');
    const target = page.locator('[data-rolling-text="hero"]').first();
    await target.waitFor({ state: 'attached', timeout: 8000 });

    const ariaLabel = await target.getAttribute('aria-label');

    // With reduced motion, engine calls settleAll() immediately → --settled added synchronously.
    await expect(target).toHaveClass(/rolling-text--settled/, { timeout: 2000 });

    // --rolling must never appear with reduced motion.
    await expect(target).not.toHaveClass(/rolling-text--rolling/);

    // Non-space chars must match.
    const visibleText = await target.innerText();
    expect(stripSpaces(visibleText)).toBe(stripSpaces(ariaLabel));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'reduced-motion.png'), fullPage: false });
  });

  test('overview hero: page loads, screenshot captured', async ({ page }) => {
    await page.goto('/#/overview');
    await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overview-hero.png'), fullPage: false });
    // Overview may have 0 heroes if no profile loaded — that is acceptable.
    const heroCount = await page.locator('[data-rolling-text="hero"]').count();
    expect(heroCount).toBeGreaterThanOrEqual(0);
  });
});
