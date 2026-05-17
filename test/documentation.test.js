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

test('README.md uses correct field names for synastry endpoint (personA/personB)', () => {
  const readme = readFileSync('./README.md', 'utf-8');

  // Synastry should use personA and personB, NOT person1 and person2
  assert.match(
    readme,
    /"personA":/,
    'README should use personA (not person1) in synastry request'
  );
  assert.match(
    readme,
    /"personB":/,
    'README should use personB (not person2) in synastry request'
  );

  // Ensure incorrect field names are NOT used
  assert.doesNotMatch(
    readme,
    /"person1":/,
    'README should NOT use person1 in synastry documentation'
  );
  assert.doesNotMatch(
    readme,
    /"person2":/,
    'README should NOT use person2 in synastry documentation'
  );
});

test('README.md documents fusion as single-chart endpoint (not two-person)', () => {
  const readme = readFileSync('./README.md', 'utf-8');

  // Fusion request should have single chart fields (date, time, tz, lat, lon)
  assert.match(
    readme,
    /"date":/,
    'README should show date field in fusion request'
  );
  assert.match(
    readme,
    /"tz":/,
    'README should show tz field in fusion request'
  );

  // Fusion section should NOT mention two persons
  const fusionSection = readme.match(/### Fusion endpoint[\s\S]*?(?=###|$)/)?.[0] || '';
  assert.doesNotMatch(
    fusionSection,
    /personA|personB|person1|person2/i,
    'Fusion endpoint documentation should NOT mention personA/personB (it is for single chart only)'
  );
});

test('README.md documents _meta field in responses', () => {
  const readme = readFileSync('./README.md', 'utf-8');

  // Both endpoints should document _meta field
  assert.match(
    readme,
    /"_meta":/,
    'README should document _meta field in responses'
  );
  assert.match(
    readme,
    /upstream_status/,
    'README should document upstream_status in _meta'
  );
});

test('README.md documents error responses', () => {
  const readme = readFileSync('./README.md', 'utf-8');

  // Should have error responses section
  assert.match(
    readme,
    /Error responses/i,
    'README should have an Error responses section'
  );

  // Should document common error status codes
  assert.match(
    readme,
    /400/,
    'README should document 400 error responses'
  );
  assert.match(
    readme,
    /405/,
    'README should document 405 error responses'
  );
  assert.match(
    readme,
    /502/,
    'README should document 502 error responses'
  );
});

test('README.md documents correct synastry response structure', () => {
  const readme = readFileSync('./README.md', 'utf-8');

  // Synastry response should include personA, personB, synastry fields
  assert.match(
    readme,
    /"personA":/,
    'README should show personA in synastry response'
  );
  assert.match(
    readme,
    /"personB":/,
    'README should show personB in synastry response'
  );
  assert.match(
    readme,
    /"synastry":/,
    'README should show synastry object in response'
  );
  assert.match(
    readme,
    /combined_coherence/,
    'README should document combined_coherence field'
  );
  assert.match(
    readme,
    /element_tension/,
    'README should document element_tension field'
  );
});
