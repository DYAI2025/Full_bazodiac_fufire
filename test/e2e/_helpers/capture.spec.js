// test/e2e/_helpers/capture.spec.js
import { test, expect } from '@playwright/test';
import { existsSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { captureMatrix } from './capture.js';

const OUT = 'docs/qa/screenshots/_helper-smoke';

test.beforeAll(() => { try { rmSync(OUT, { recursive: true }); } catch {} });

test('captureMatrix writes 4 non-empty PNGs (desktop+mobile × dark+light)', async ({ browser }) => {
  await captureMatrix({ browser, page: 'overview', path: '/#/overview', dir: OUT });
  for (const name of [
    'overview-desktop-dark.png',
    'overview-desktop-light.png',
    'overview-mobile-dark.png',
    'overview-mobile-light.png',
  ]) {
    const p = join(OUT, name);
    expect(existsSync(p), `missing ${name}`).toBe(true);
    expect(statSync(p).size, `${name} is empty`).toBeGreaterThan(5_000);
  }
});
