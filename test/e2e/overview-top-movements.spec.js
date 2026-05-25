// OV-I4-T10 (e2e): TopMovements progressive disclosure.
//
// Asserts that at most 3 [data-movement] entries are visible by default and
// that expanding the <details data-progressive> accordion reveals more.
// Saves screenshots for the OV-I4 PO gate.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = path.resolve('docs/qa/screenshots/overview-signature/ov-i4');
fs.mkdirSync(SHOTS, { recursive: true });

// Fixture with >3 aspects so the accordion actually has hidden entries.
const PROFILE_FIXTURE = {
  western: {
    bodies: {
      Sun:  { sign: 'Pisces',     longitude: 353.15 },
      Moon: { sign: 'Virgo',      longitude: 158.23 },
      Venus:{ sign: 'Aquarius',   longitude: 320.10 },
      Mars: { sign: 'Sagittarius',longitude: 250.40 },
    },
    angles: { Ascendant: 27.71, MC: 280.66 },
    houses: {
      '1':  { longitude: 27.71,  sign: 'Aries' },
      '4':  { longitude: 100.0,  sign: 'Cancer' },
      '7':  { longitude: 207.71, sign: 'Libra' },
      '10': { longitude: 280.66, sign: 'Capricorn' },
    },
    // 5+ aspects so we exercise the collapsed-details branch.
    aspects: [
      { planet1: 'Sun',   planet2: 'Moon',  type: 'opposition', orb: 1.1 },
      { planet1: 'Venus', planet2: 'Mars',  type: 'trine',      orb: 0.8 },
      { planet1: 'Sun',   planet2: 'Saturn',type: 'square',     orb: 2.1 },
      { planet1: 'Mercury',planet2: 'Pluto',type: 'conjunction',orb: 4.0 },
      { planet1: 'Jupiter',planet2: 'Uranus',type: 'sextile',   orb: 3.2 },
    ],
  },
  bazi:   { day_master: { stem: 'Yang Holz', element: 'Holz' } },
  fusion: { headline: 'Pionier mit Tiefenmotor', coherence_index: 0.78 },
};

async function seedAndReload(page) {
  await page.goto('/#/overview');
  await page.evaluate((p) => {
    sessionStorage.setItem('azodiac_profile', JSON.stringify(p));
  }, PROFILE_FIXTURE);
  await page.reload();
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
  await page.waitForTimeout(500);
}

test.describe('OV-I4-T10: TopMovements progressive disclosure', () => {
  test('default: at most 3 visible movements; expanded: >3', async ({ page }) => {
    await seedAndReload(page);

    const section = page.locator('[data-section="top-movements"]').first();
    await expect(section).toBeAttached();

    // Count movements that are NOT inside the collapsed <details>.
    const visibleCount = await page.evaluate(() => {
      const sec = document.querySelector('[data-section="top-movements"]');
      if (!sec) return -1;
      const details = sec.querySelector('details[data-progressive]');
      const all = Array.from(sec.querySelectorAll('[data-movement]'));
      return all.filter((m) => !details || !details.contains(m)).length;
    });
    expect(visibleCount).toBeLessThanOrEqual(3);

    // Screenshot the collapsed state.
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(SHOTS, 'aspects-collapsed.png'),
      fullPage: true,
    });

    // Expand details.
    const summary = section.locator('details[data-progressive] > summary').first();
    await expect(summary).toBeAttached();
    await summary.click();
    await page.waitForTimeout(200);

    const totalCount = await page.evaluate(() => {
      const sec = document.querySelector('[data-section="top-movements"]');
      if (!sec) return -1;
      return sec.querySelectorAll('[data-movement]').length;
    });
    expect(totalCount).toBeGreaterThan(3);

    await page.screenshot({
      path: path.join(SHOTS, 'aspects-expanded.png'),
      fullPage: true,
    });
  });
});
