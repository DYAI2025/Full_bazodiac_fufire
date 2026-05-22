// test/e2e/_helpers/capture.js
// 4-variant screenshot capture (dev-brief §2.4):
//   <slug>-desktop-dark.png
//   <slug>-desktop-light.png
//   <slug>-mobile-dark.png
//   <slug>-mobile-light.png
import { devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTheme } from './theme.js';

const VIEWPORTS = {
  desktop: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
  mobile:  { ...devices['Pixel 7'] },
};
const THEMES = { dark: 'planetarium', light: 'morning' };

export async function captureMatrix({ browser, slug, path, dir, beforeShot }) {
  mkdirSync(dir, { recursive: true });
  const variants = Object.entries(VIEWPORTS).flatMap(([vpName, vp]) =>
    Object.entries(THEMES).map(([themeName, themeVal]) => ({ vpName, vp, themeName, themeVal }))
  );
  await Promise.all(variants.map(async ({ vpName, vp, themeName, themeVal }) => {
    const ctx = await browser.newContext({ ...vp });
    const p = await ctx.newPage();
    try {
      await setTheme(p, themeVal);
      await p.goto(path, { waitUntil: 'load' });
      await p.locator('#app > *').first().waitFor({ state: 'attached', timeout: 10_000 });
      if (typeof beforeShot === 'function') await beforeShot(p);
      await p.screenshot({
        path: join(dir, `${slug}-${vpName}-${themeName}.png`),
        fullPage: true,
      });
    } finally {
      await ctx.close();
    }
  }));
}
