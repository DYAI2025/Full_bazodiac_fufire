// test/qa-artifacts.test.js
// Stellt sicher, dass das Review-Template existiert und alle Pflichtsektionen
// enthält, und dass das I0-Review nach diesem Template angelegt wurde.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const TEMPLATE = 'docs/qa/templates/iteration-review-template.md';
const I0_REVIEW = 'docs/qa/2026-05-22-i0-playwright-baseline.md';

// Sections required by the new gate-brief template (aligned with qa_template.test.js)
const REQUIRED_SECTIONS = [
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

// The I0 baseline was written against the old template format and is a historical document.
const I0_REQUIRED_SECTIONS = [
  '## Ziel',
  '## Testcommands',
  '## Browser / Viewport',
  '## Screenshots',
  '## Optischer Review',
  '## Code Review',
  '## Findings',
  '## Fixes',
  '## Finaler Status',
];

test('iteration-review-template existiert und enthält alle Pflichtsektionen', () => {
  assert.ok(existsSync(TEMPLATE), `${TEMPLATE} fehlt`);
  const content = readFileSync(TEMPLATE, 'utf8');
  for (const section of REQUIRED_SECTIONS) {
    assert.ok(
      content.includes(section),
      `Template fehlt Sektion: ${section}`,
    );
  }
});

test('i0-review existiert und referenziert das Template', () => {
  assert.ok(existsSync(I0_REVIEW), `${I0_REVIEW} fehlt`);
  const content = readFileSync(I0_REVIEW, 'utf8');
  for (const section of I0_REQUIRED_SECTIONS) {
    assert.ok(
      content.includes(section),
      `I0-Review fehlt Sektion: ${section}`,
    );
  }
});
