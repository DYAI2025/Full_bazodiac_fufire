// test/goal_block.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TPL = readFileSync('docs/qa/templates/goal-block.md', 'utf8');

test('goal-block template fits under 4000 Unicode chars', () => {
  assert.ok([...TPL].length < 4000, `template is ${[...TPL].length} chars`);
});

test('goal-block template forbids vague words', () => {
  for (const w of ['vielleicht', 'eventuell', 'sollte', 'koennte']) {
    assert.ok(!TPL.toLowerCase().includes(w), `template contains forbidden word: ${w}`);
  }
});

test('goal-block template carries required section markers', () => {
  for (const m of ['Goal:', 'Ziel.', 'Scope.', 'Bedingungen (hart).',
                    'Akzeptanzkriterien.', 'Explizit out-of-scope.', 'Done-Definition.']) {
    assert.ok(TPL.includes(m), `missing marker: ${m}`);
  }
});
