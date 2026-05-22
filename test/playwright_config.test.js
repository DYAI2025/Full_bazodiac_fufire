// test/playwright_config.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG = readFileSync(resolve(HERE, '..', 'playwright.config.mjs'), 'utf8');

test('playwright.config declares chromium-desktop and chromium-mobile projects', () => {
  assert.match(CONFIG, /name:\s*['"]chromium-desktop['"]/, 'missing chromium-desktop project');
  assert.match(CONFIG, /name:\s*['"]chromium-mobile['"]/, 'missing chromium-mobile project');
});

test('playwright.config exposes Pixel 7 (or comparable) mobile device', () => {
  assert.match(CONFIG, /devices\[['"]Pixel 7['"]\]/, 'mobile project must use Pixel 7 device');
});

test('playwright.config keeps webServer reuseExistingServer=true', () => {
  assert.match(CONFIG, /reuseExistingServer:\s*true/);
});
