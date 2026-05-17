// test/house-comparison.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildHouseComparisons, DOMAIN_HOUSES } from '../public/src/synastry/house-comparison.js';

const profileA = {
  western: { houses: [
    null,
    {sign:'Widder'},{sign:'Stier'},{sign:'Zwillinge'},{sign:'Krebs'},
    {sign:'Löwe'},{sign:'Jungfrau'},{sign:'Waage'},{sign:'Skorpion'},
    {sign:'Schütze'},{sign:'Steinbock'},{sign:'Wassermann'},{sign:'Fische'},
  ]}
};
const profileB = {
  western: { houses: [
    null,
    {sign:'Krebs'},{sign:'Löwe'},{sign:'Jungfrau'},{sign:'Waage'},
    {sign:'Skorpion'},{sign:'Schütze'},{sign:'Steinbock'},{sign:'Wassermann'},
    {sign:'Fische'},{sign:'Widder'},{sign:'Stier'},{sign:'Zwillinge'},
  ]}
};

test('buildHouseComparisons returns entries for given house list', () => {
  const entries = buildHouseComparisons(profileA, profileB, [5, 7, 8]);
  assert.equal(entries.length, 3);
  for (const e of entries) {
    assert.ok(e.house, 'missing house number');
    assert.ok(e.label, 'missing label');
    assert.ok(e.signA, 'missing signA');
    assert.ok(e.signB, 'missing signB');
    assert.ok(e.elemA, 'missing elemA');
    assert.ok(e.elemB, 'missing elemB');
    assert.ok(['✨','⚡','⚡+','〰','〰+'].includes(e.tone), `invalid tone: ${e.tone}`);
    assert.ok(typeof e.text === 'string' && e.text.length > 0, 'missing text');
  }
});

test('DOMAIN_HOUSES provides correct house lists per domain', () => {
  assert.ok(Array.isArray(DOMAIN_HOUSES.love), 'love houses missing');
  assert.ok(Array.isArray(DOMAIN_HOUSES['career-finance']), 'career-finance houses missing');
  assert.ok(Array.isArray(DOMAIN_HOUSES.synastry), 'synastry houses missing');
  assert.equal(DOMAIN_HOUSES.synastry.length, 12, 'synastry should have all 12 houses');
});

test('buildHouseComparisons handles missing house data gracefully', () => {
  const empty = { western: { houses: [] } };
  assert.doesNotThrow(() => buildHouseComparisons(empty, empty, [1,2,3]));
});
