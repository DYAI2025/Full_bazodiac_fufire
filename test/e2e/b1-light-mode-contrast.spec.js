// test/e2e/b1-light-mode-contrast.spec.js
// B1: Global light-mode contrast — no dark text on dark panels in morning theme.
import { test, expect } from '@playwright/test';
import { setTheme } from './_helpers/theme.js';
import { captureMatrix } from './_helpers/capture.js';
import { mkdirSync } from 'node:fs';

const PAGES = [
  { slug: 'overview', path: '/#/overview', label: 'Uebersicht' },
  { slug: 'bazi',     path: '/#/bazi',     label: 'Karten/BaZi' },
  { slug: 'western',  path: '/#/western',  label: 'Western' },
  { slug: 'wuxing',   path: '/#/wuxing',   label: 'Wu-Xing' },
  { slug: 'daily',    path: '/#/daily',    label: 'Tagespuls' },
  { slug: 'synastry', path: '/#/synastry', label: 'Beziehung' },
  { slug: 'input',    path: '/',           label: 'Daten' },
  { slug: 'method',   path: '/#/method',   label: 'Methode' },
];

const DIR = 'docs/qa/screenshots/b1-light-mode-contrast';

test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); });

// Contrast checker: finds elements with dark bg + dark text in morning mode.
// Uses blended (effective) background brightness to handle rgba semi-transparent bgs.
// Returns array of offender descriptors (empty = pass).
async function findContrastOffenders(page) {
  return page.evaluate(() => {
    // Blend a foreground rgba color onto a background color (CSS alpha compositing).
    function blend(r, g, b, a, bgR, bgG, bgB) {
      return [
        Math.round(a * r + (1 - a) * bgR),
        Math.round(a * g + (1 - a) * bgG),
        Math.round(a * b + (1 - a) * bgB),
      ];
    }
    function brightness(r, g, b) {
      return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    }
    function parseRgba(str) {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
    }
    // Walk up DOM to find the first opaque (alpha ≥ 0.95) ancestor background.
    function getOpaqueAncestorBg(el) {
      let node = el.parentElement;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        const parsed = parseRgba(bg);
        if (parsed && parsed[3] >= 0.95) return parsed;
        node = node.parentElement;
      }
      return [248, 250, 252, 1]; // fallback: bz-dawn
    }

    const out = [];
    const all = document.querySelectorAll('#app *');
    for (const el of all) {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      if (!bg) continue;
      const parsed = parseRgba(bg);
      if (!parsed) continue;
      const [r, g, b, a] = parsed;
      // Skip fully transparent backgrounds — the element has no own bg
      if (a < 0.05) continue;

      let effectiveBg;
      if (a >= 0.95) {
        effectiveBg = [r, g, b];
      } else {
        // Blend onto nearest opaque ancestor
        const [ar, ag, ab] = getOpaqueAncestorBg(el);
        effectiveBg = blend(r, g, b, a, ar, ag, ab);
      }
      const bgBright = brightness(...effectiveBg);
      // Only flag elements with a noticeably dark effective background (< 0.35 brightness)
      if (bgBright >= 0.35) continue;

      const text = (el.innerText || '').trim();
      if (!text || text.length < 2) continue;
      const fg = cs.color;
      if (!fg) continue;
      const fgParsed = parseRgba(fg);
      if (!fgParsed) continue;
      const [fr, fg2, fb, fa] = fgParsed;
      let effectiveFg;
      if (fa >= 0.95) {
        effectiveFg = [fr, fg2, fb];
      } else {
        effectiveFg = blend(fr, fg2, fb, fa, ...effectiveBg);
      }
      const fgBright = brightness(...effectiveFg);
      // Dark text on dark bg: both < 0.5 brightness
      if (fgBright < 0.5) {
        out.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 60),
          bgBright: Math.round(bgBright * 100) / 100,
          fgBright: Math.round(fgBright * 100) / 100,
          sample: text.slice(0, 40),
        });
      }
    }
    return out;
  });
}

for (const pg of PAGES) {
  test(`B1 morning-mode contrast: ${pg.label}`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await setTheme(p, 'morning');
    await p.goto(pg.path, { waitUntil: 'load' });
    await p.locator('#app > *').first().waitFor({ state: 'attached', timeout: 10_000 });

    const offenders = await findContrastOffenders(p);
    await ctx.close();

    expect(
      offenders,
      `${pg.label} has dark-on-dark text in morning mode:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });
}

test('B1 captures 4-variant screenshot matrix for all 8 pages', async ({ browser }) => {
  for (const pg of PAGES) {
    await captureMatrix({ browser, page: pg.slug, path: pg.path, dir: DIR });
  }
});
