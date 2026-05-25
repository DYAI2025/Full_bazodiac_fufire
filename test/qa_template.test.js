// test/qa_template.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TPL = readFileSync('docs/qa/templates/iteration-review-template.md', 'utf8');

const REQUIRED_HEADINGS = [
  '## /goal',
  '## Implementierte Aenderungen',
  '## Testbefehle',
  '## Playwright-Live-Test',
  '## Screenshots',
  '## Optischer Review',
  '## Code Review',
  '## Fix-Runden',
  '## Abschlussstatus',
  '## Offene Minor Findings',
];

for (const h of REQUIRED_HEADINGS) {
  test(`template contains "${h}"`, () => {
    assert.ok(TPL.includes(h), `missing heading: ${h}`);
  });
}

test('template encodes BLOCKED rule', () => {
  assert.match(TPL, /BLOCKED/);
});

test('template lists 4-variant screenshot filenames', () => {
  assert.match(TPL, /desktop-dark\.png/);
  assert.match(TPL, /desktop-light\.png/);
  assert.match(TPL, /mobile-dark\.png/);
  assert.match(TPL, /mobile-light\.png/);
});

test('template encodes Critical/Major zero-finding rule', () => {
  assert.match(TPL, /0\s+offene\s+Critical/i);
  assert.match(TPL, /0\s+offene\s+Major/i);
});
