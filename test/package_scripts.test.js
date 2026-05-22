// test/package_scripts.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PKG = JSON.parse(readFileSync('package.json', 'utf8'));

test('test:e2e runs without --project filter so both projects execute', () => {
  assert.match(PKG.scripts['test:e2e'], /^playwright test/);
  assert.ok(!PKG.scripts['test:e2e'].includes('--project'),
    'test:e2e must NOT pin --project — must run desktop + mobile together');
});

test('test:e2e:desktop convenience script exists', () => {
  assert.match(PKG.scripts['test:e2e:desktop'] || '', /--project=chromium-desktop/);
});

test('test:e2e:mobile convenience script exists', () => {
  assert.match(PKG.scripts['test:e2e:mobile'] || '', /--project=chromium-mobile/);
});
