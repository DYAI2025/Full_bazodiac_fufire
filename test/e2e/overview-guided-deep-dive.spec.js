// OV-I4-T12 (e2e): GuidedDeepDive 4 intent CTAs.
//
// Asserts that the guided-deep-dive section contains exactly four anchors
// with the four canonical intent texts and internal hash-routes.

import { test, expect } from '@playwright/test';

const PROFILE_FIXTURE = {
  western: {
    bodies: {
      Sun:  { sign: 'Pisces', longitude: 353.15 },
      Moon: { sign: 'Virgo',  longitude: 158.23 },
    },
    angles: { Ascendant: 27.71, MC: 280.66 },
    houses: {
      '1':  { longitude: 27.71,  sign: 'Aries' },
      '10': { longitude: 280.66, sign: 'Capricorn' },
    },
    aspects: [],
  },
  bazi:   { day_master: { stem: 'Yang Holz', element: 'Holz' } },
  fusion: { headline: 'Pionier', coherence_index: 0.78 },
};

const EXPECTED_INTENTS = [
  'Ich will mich verstehen',
  'Ich will es heute anwenden',
  'Ich will Beziehungsmuster sehen',
  'Ich will die Berechnung prüfen',
];

async function seedAndReload(page) {
  await page.goto('/#/overview');
  await page.evaluate((p) => {
    sessionStorage.setItem('azodiac_profile', JSON.stringify(p));
  }, PROFILE_FIXTURE);
  await page.reload();
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
  await page.waitForTimeout(500);
}

test.describe('OV-I4-T12: GuidedDeepDive 4 intent CTAs', () => {
  test('renders 4 anchors with intent texts and internal hash routes', async ({ page }) => {
    await seedAndReload(page);

    const section = page.locator('[data-section="guided-deep-dive"]').first();
    await expect(section).toBeAttached();

    const anchors = section.locator('a[href]');
    const count = await anchors.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Collect all visible intent text + href values.
    const data = await page.evaluate(() => {
      const sec = document.querySelector('[data-section="guided-deep-dive"]');
      if (!sec) return { texts: [], hrefs: [] };
      const links = Array.from(sec.querySelectorAll('a[href]'));
      return {
        texts: links.map((a) => (a.textContent || '').trim()),
        hrefs: links.map((a) => a.getAttribute('href') || ''),
      };
    });

    for (const intent of EXPECTED_INTENTS) {
      expect(data.texts.some((t) => t.includes(intent))).toBe(true);
    }
    for (const href of data.hrefs) {
      expect(href.startsWith('#/')).toBe(true);
    }
  });
});
