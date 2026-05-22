// test/e2e/b2-bazi-restructure.spec.js
// B2: BaZi page restructure — Day Master kern, 4-pillar line, shared detail panel.
import { test, expect } from '@playwright/test';
import { setTheme } from './_helpers/theme.js';
import { captureMatrix } from './_helpers/capture.js';
import { mkdirSync } from 'node:fs';

const DIR = 'docs/qa/screenshots/b2-bazi-restructure';

// Synthetic profile seeded into sessionStorage before page mounts.
const PROFILE = {
  bazi: {
    day_master: {
      stem: 'Yang Holz', element: 'Holz', polarity: 'Yang',
      stemChar: '甲', ressource: 'Expansionskraft', schatten: 'Kontrollverlust',
    },
    pillars: {
      year:  { stem: 'Yin Wasser',  branch: 'Hase',    stemChar: '癸', branchChar: '卯', animal: 'Hase',    stemElement: 'Wasser', branchElement: 'Holz',   polarity: 'Yin',  hidden_stems: { source: 'api',     stems: ['乙'] } },
      month: { stem: 'Yang Erde',   branch: 'Tiger',   stemChar: '戊', branchChar: '寅', animal: 'Tiger',   stemElement: 'Erde',   branchElement: 'Holz',   polarity: 'Yang', hidden_stems: { source: 'derived', stems: ['甲', '丙'] } },
      day:   { stem: 'Yang Holz',   branch: 'Affe',    stemChar: '甲', branchChar: '申', animal: 'Affe',    stemElement: 'Holz',   branchElement: 'Metall', polarity: 'Yang', hidden_stems: { source: 'api',     stems: ['庚'] } },
      hour:  { stem: 'Yin Metall',  branch: 'Schwein', stemChar: '辛', branchChar: '亥', animal: 'Schwein', stemElement: 'Metall', branchElement: 'Wasser', polarity: 'Yin',  hidden_stems: { source: 'derived', stems: ['壬'] } },
    },
  },
  western: { bodies: { Sun: { sign: 'Fische', longitude: 353.15 } }, angles: {}, houses: {}, aspects: [] },
  fusion: { headline: 'Testprofil', coherence_index: 0.75 },
};

test.beforeEach(async ({ page }) => {
  await setTheme(page, 'planetarium');
  await page.addInitScript((p) => {
    try { sessionStorage.setItem('azodiac_profile', JSON.stringify(p)); } catch {}
  }, PROFILE);
});

test('B2 Day Master is marked with data-bazi-role="day-master-kern"', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  const kern = page.locator('[data-bazi-role="day-master-kern"]');
  await expect(kern).toHaveCount(1);
  await expect(kern).toBeVisible();
});

test('B2 exactly 4 data-bazi-pillar elements in a single row', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  const pillars = page.locator('[data-bazi-pillar]');
  await expect(pillars).toHaveCount(4);

  // Row-alignment check only applies at desktop width (≥1024px).
  // On mobile the CSS intentionally stacks pillars to 2 columns.
  const vw = await page.evaluate(() => window.innerWidth);
  if (vw >= 1024) {
    const boxes = await pillars.evaluateAll(els =>
      els.map(el => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), height: Math.round(r.height) };
      })
    );
    const tops = boxes.map(b => b.top);
    const heights = boxes.map(b => b.height);
    expect(Math.max(...tops) - Math.min(...tops), 'pillars not in same row').toBeLessThan(4);
    expect(Math.max(...heights) - Math.min(...heights), 'pillar heights unequal').toBeLessThan(4);
  }
});

test('B2 single shared detail panel, zero per-card dropdowns', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  await expect(page.locator('[data-bazi-shared-detail]')).toHaveCount(1);
  await expect(page.locator('[data-bazi-pillar] [data-bazi-pillar-dropdown]')).toHaveCount(0);
});

test('B2 hidden stems carry source label API or derived', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  const labels = page.locator('[data-bazi-hidden-stems-source]');
  await expect(labels).toHaveCount(4);
  const texts = await labels.allTextContents();
  for (const t of texts) {
    expect(t).toMatch(/API|aus Branch-Tabelle abgeleitet/);
  }
});

test('B2 Glueckssaeule marked "nicht von API geliefert"', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  const lucky = page.locator('[data-bazi-lucky-pillar]');
  if (await lucky.count() > 0) {
    await expect(lucky.first()).toContainText('nicht von API geliefert');
  }
});

test('B2 narrative text is marked as Leseschluessel', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  const marker = page.locator('[data-bazi-narrative-marker]').first();
  await expect(marker).toBeVisible();
  await expect(marker).toContainText(/Leseschluessel/i);
});

test('B2 shared detail opens when pillar is clicked', async ({ page }) => {
  await page.goto('/#/bazi', { waitUntil: 'load' });
  await page.locator('#app > *').first().waitFor({ state: 'attached' });
  const detail = page.locator('[data-bazi-shared-detail]');
  const firstPillar = page.locator('[data-bazi-pillar]').first();
  await firstPillar.click();
  await expect(detail).toHaveAttribute('data-expanded', 'true');
});

test('B2 captures collapsed + expanded screenshots', async ({ browser }) => {
  mkdirSync(DIR, { recursive: true });
  // Collapsed state — no profile needed for structure verification
  await captureMatrix({ browser, slug: 'bazi-collapsed', path: '/#/bazi', dir: DIR });
  // Expanded state — seed profile then click first pillar
  await captureMatrix({
    browser,
    page: 'bazi-expanded',
    path: '/#/bazi',
    dir: DIR,
    beforeShot: async (p) => {
      // Seed profile via evaluate after page load (addInitScript already ran inside captureMatrix)
      await p.evaluate((prof) => {
        try { sessionStorage.setItem('azodiac_profile', JSON.stringify(prof)); } catch {}
      }, PROFILE);
      // Re-navigate so profile is picked up
      await p.goto('/#/bazi', { waitUntil: 'load' });
      await p.locator('#app > *').first().waitFor({ state: 'attached' });
      const firstPillar = p.locator('[data-bazi-pillar]').first();
      if (await firstPillar.count() > 0) await firstPillar.click();
    },
  });
});
