// test/e2e/_helpers/capture.js
// 4-variant screenshot capture (dev-brief §2.4):
//   <page>-desktop-dark.png
//   <page>-desktop-light.png
//   <page>-mobile-dark.png
//   <page>-mobile-light.png
import { devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTheme } from './theme.js';

const VIEWPORTS = {
  desktop: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
  mobile:  { ...devices['Pixel 7'] },
};
const THEMES = { dark: 'planetarium', light: 'morning' };

export async function captureMatrix({ browser, page: pageSlug, path, dir, beforeShot }) {
  mkdirSync(dir, { recursive: true });
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    for (const [themeName, themeVal] of Object.entries(THEMES)) {
      const ctx = await browser.newContext({ ...vp });
      const p = await ctx.newPage();
      await setTheme(p, themeVal);
      await p.goto(path, { waitUntil: 'load' });
      await p.locator('#app > *').first().waitFor({ state: 'attached', timeout: 10_000 });
      if (typeof beforeShot === 'function') await beforeShot(p);
      await p.screenshot({
        path: join(dir, `${pageSlug}-${vpName}-${themeName}.png`),
        fullPage: true,
      });
      await ctx.close();
    }
  }
}
