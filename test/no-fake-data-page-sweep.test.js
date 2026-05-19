// Static-source sweep: no Page-level file ships dummy/placeholder/demo strings.
// Complements the runtime noFakeDataGuard by catching strings hardcoded into
// rendered templates (innerHTML literals, default fallbacks, etc).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGES_DIR     = join(__dirname, '..', 'public', 'src', 'pages');
const COMPONENTS_DIR = join(__dirname, '..', 'public', 'src', 'components');

// Same list as in api/client.js DUMMY_SIGNATURES, minus identifiers that
// legitimately appear in code (TBD is a real abbreviation; TODO appears as
// JSDoc/comments — we strip comments before scanning).
const FORBIDDEN_IN_RENDERED_OUTPUT = [
  'Lorem',
  'dummy',
  'fake',
  'placeholder text',   // tighter than bare 'placeholder' which is a valid HTML attr
  'Mustermann',
  'Beispieltext',
  'Beispielwert',
  'Keine Beschreibung verfügbar',
];

function stripComments(src) {
  // Drop /* ... */ blocks and // line comments — those aren't shipped to users.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function scanDir(dir) {
  const offenders = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.js')) continue;
    const path = join(dir, name);
    const src = stripComments(readFileSync(path, 'utf8'));
    for (const sig of FORBIDDEN_IN_RENDERED_OUTPUT) {
      if (src.includes(sig)) {
        offenders.push({ file: name, signature: sig });
      }
    }
  }
  return offenders;
}

test('No page source contains forbidden demo/placeholder strings', () => {
  const offenders = scanDir(PAGES_DIR);
  assert.deepEqual(offenders, [],
    `Forbidden demo strings in pages:\n${JSON.stringify(offenders, null, 2)}`);
});

test('No component source contains forbidden demo/placeholder strings', () => {
  const offenders = scanDir(COMPONENTS_DIR);
  assert.deepEqual(offenders, [],
    `Forbidden demo strings in components:\n${JSON.stringify(offenders, null, 2)}`);
});
