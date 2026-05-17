import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('README.md contains API documentation for fusion and synastry endpoints', () => {
  const readme = readFileSync('./README.md', 'utf-8');

  // Check for fusion endpoint documentation
  assert.match(
    readme,
    /\/api\/azodiac\/fusion/,
    'README should document the fusion endpoint path'
  );

  // Check for synastry endpoint documentation
  assert.match(
    readme,
    /\/api\/azodiac\/synastry/,
    'README should document the synastry endpoint path'
  );

  // Check for includeFusion query parameter documentation
  assert.match(
    readme,
    /includeFusion/,
    'README should document the includeFusion query parameter'
  );

  // Check that the documentation mentions the default value
  assert.match(
    readme,
    /default.*true/i,
    'README should mention that includeFusion defaults to true'
  );

  // Check for API endpoints section
  assert.match(
    readme,
    /API endpoints/i,
    'README should have an API endpoints section'
  );
});