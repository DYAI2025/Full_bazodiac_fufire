// OV-I3-T09: Wheel hover/click → audit row linking.
//
// Verifies that hovering or keyboard-activating a planet glyph or an axis
// marker (ASC/MC/IC/DC) toggles data-active="true" on the matching
// [data-audit-row="<key>"] element in the NatalChartAuditTabs list.
//
// Screenshots end up in docs/qa/screenshots/overview-signature/ov-i3/ for
// PO/QA review.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = path.resolve('docs/qa/screenshots/overview-signature/ov-i3');
fs.mkdirSync(SHOTS, { recursive: true });

// Minimal in-session profile fixture — enough to render the wheel with
// Sun, Moon, ASC + MC. Stored in sessionStorage before the page reloads.
const PROFILE_FIXTURE = {
  western: {
    bodies: {
      Sun:  { sign: 'Pisces', longitude: 353.15 },
      Moon: { sign: 'Virgo',  longitude: 158.23 },
    },
    angles: { Ascendant: 27.71, MC: 280.66 },
    houses: {
      '1':  { longitude: 27.71,  sign: 'Aries'     },
      '4':  { longitude: 100.0,  sign: 'Cancer'    },
      '7':  { longitude: 207.71, sign: 'Libra'     },
      '10': { longitude: 280.66, sign: 'Capricorn' },
    },
    aspects: [],
  },
  bazi:   { day_master: { stem: 'Yang Holz', element: 'Holz' } },
  fusion: { headline: 'Pionier', coherence_index: 0.78 },
};

async function seedAndReload(page) {
  await page.goto('/#/overview');
  await page.evaluate((p) => {
    sessionStorage.setItem('azodiac_profile', JSON.stringify(p));
  }, PROFILE_FIXTURE);
  await page.reload();
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
  // Give the OverviewPage time to mount + the audit tabs + interaction listeners.
  await page.waitForTimeout(500);
}

test.describe('OV-I3-T09: Wheel hover/click → audit linking', () => {
  test('hover Sun glyph activates the Sun audit row', async ({ page }) => {
    await seedAndReload(page);

    // Wheel + audit tabs must be in DOM.
    await expect(page.locator('.natal-chart-wheel').first()).toBeAttached();
    await expect(page.locator('li[data-audit-row="Sun"]').first()).toBeAttached();

    const sun = page.locator('[data-body-key="Sun"]').first();
    await sun.hover();

    // Linked row must flip data-active="true".
    await expect(page.locator('li[data-audit-row="Sun"]').first())
      .toHaveAttribute('data-active', 'true');

    await page.screenshot({
      path: path.join(SHOTS, 'wheel-hover-sun.png'),
      fullPage: true,
    });
  });

  test('focus ASC axis + Enter activates the ASC audit row', async ({ page }) => {
    await seedAndReload(page);

    await expect(page.locator('li[data-audit-row="ASC"]').first()).toBeAttached();

    const asc = page.locator('[data-axis-key="ASC"]').first();
    await asc.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('li[data-audit-row="ASC"]').first())
      .toHaveAttribute('data-active', 'true');

    await page.screenshot({
      path: path.join(SHOTS, 'wheel-hover-ac.png'),
      fullPage: true,
    });
  });

  test('wheel close-up screenshot (desktop viewport)', async ({ page }) => {
    await seedAndReload(page);

    const wheel = page.locator('.natal-chart-wheel').first();
    await expect(wheel).toBeAttached();

    // Try to capture the SignatureHero wheel-anchor; fall back to the wheel
    // itself if the anchor selector is missing.
    const anchor = page.locator('[data-hero-slot="wheel-anchor"]').first();
    const target = (await anchor.count()) ? anchor : wheel;
    await target.screenshot({ path: path.join(SHOTS, 'wheel-closeup.png') });
  });
});
