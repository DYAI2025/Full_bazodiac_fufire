// test/e2e/b3-font-consolidation.spec.js
import { test, expect } from '@playwright/test';
import { setTheme } from './_helpers/theme.js';
import { captureMatrix } from './_helpers/capture.js';

const CHOSEN_SERIF = 'Cormorant Garamond';
const CHOSEN_SANS  = 'Sora';

// Brand fonts that must NOT appear (they are replaced by B3)
const BANNED_BRAND_FONTS = new Set([
  'Playfair Display', 'DM Serif Display',
  'Inter', 'Plus Jakarta Sans',
  'Space Mono',
]);

const DIR = 'docs/qa/screenshots/b3-font-consolidation';

const PAGES = [
  { slug: 'overview', path: '/#/overview' },
  { slug: 'bazi',     path: '/#/bazi' },
  { slug: 'western',  path: '/#/western' },
  { slug: 'wuxing',   path: '/#/wuxing' },
  { slug: 'daily',    path: '/#/daily' },
  { slug: 'synastry', path: '/#/synastry' },
  { slug: 'input',    path: '/' },
  { slug: 'method',   path: '/#/method' },
];

const PROFILE = {
  western: {
    bodies: { Sun: { sign: 'Pisces', longitude: 353.15 }, Moon: { sign: 'Virgo', longitude: 158.23 } },
    angles: { Ascendant: 27.71, MC: 280.66 },
    houses: { '1': { longitude: 27.71, sign: 'Aries' }, '4': { longitude: 100.0, sign: 'Cancer' }, '7': { longitude: 207.71, sign: 'Libra' }, '10': { longitude: 280.66, sign: 'Capricorn' } },
    aspects: [],
  },
  bazi: { day_master: { stem: 'Yang Holz', element: 'Holz' }, pillars: {
    year:  { heavenly_stem: 'Ren', earthly_branch: 'Zi', element: 'Wasser' },
    month: { heavenly_stem: 'Wu', earthly_branch: 'Xu', element: 'Erde' },
    day:   { heavenly_stem: 'Jia', earthly_branch: 'Yin', element: 'Holz' },
    hour:  { heavenly_stem: 'Bing', earthly_branch: 'Wu', element: 'Feuer' },
  }},
  fusion: { headline: 'Pionier mit Tiefenmotor', coherence_index: 0.78 },
};

async function injectProfile(page) {
  await page.evaluate((p) => sessionStorage.setItem('azodiac_profile', JSON.stringify(p)), PROFILE);
  await page.reload({ waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
}

for (const pg of PAGES) {
  test(`B3 ${pg.slug} — no banned brand fonts render`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      // Seed profile via addInitScript so it is available on the first (and only) navigation.
      await p.addInitScript((pr) => sessionStorage.setItem('azodiac_profile', JSON.stringify(pr)), PROFILE);
      await setTheme(p, 'planetarium');
      await p.goto(pg.path, { waitUntil: 'load' });
      await p.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });

      const families = await p.evaluate(() => {
        const used = new Set();
        for (const el of document.querySelectorAll('#app *')) {
          const f = getComputedStyle(el).fontFamily;
          for (const part of f.split(',')) used.add(part.trim().replace(/['"]/g, ''));
        }
        return [...used];
      });

      const offenders = families.filter((f) => BANNED_BRAND_FONTS.has(f));
      expect(offenders, `${pg.slug} uses banned brand fonts: ${offenders.join(', ')}`).toEqual([]);
    } finally {
      await ctx.close();
    }
  });
}

test('B3 headings use Cormorant Garamond as primary serif', async ({ page }) => {
  await setTheme(page, 'planetarium');
  await page.goto('/#/overview', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
  await injectProfile(page);
  const h = await page.locator(
    '#app .page-title, #app .layer-title, #app .bz-display, #app .bz-h1, #app .bz-h2, #app .bz-h3'
  ).first().evaluate(el => getComputedStyle(el).fontFamily);
  expect(h).toContain(CHOSEN_SERIF);
});

test('B3 body text uses Sora as primary sans', async ({ page }) => {
  await setTheme(page, 'planetarium');
  await page.goto('/#/overview', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
  const b = await page.locator('#app p, #app li, #app .bz-body').first().evaluate(el =>
    getComputedStyle(el).fontFamily);
  expect(b).toContain(CHOSEN_SANS);
});

test('B3 screenshot matrix — overview page', async ({ browser }) => {
  await captureMatrix({
    browser,
    slug: 'overview',
    path: '/#/overview',
    dir: DIR,
    beforeShot: async (p) => {
      await p.evaluate((pr) => sessionStorage.setItem('azodiac_profile', JSON.stringify(pr)), PROFILE);
      await p.reload({ waitUntil: 'load' });
      await p.locator('#app > *').first().waitFor({ state: 'attached', timeout: 8000 });
    },
  });
});
