// test/dynasty-resonance.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildDynastyResonance } from '../public/src/synastry/dynasty-resonance.js';

test('buildDynastyResonance extracts year pillars from both profiles', () => {
  const pA = { bazi: { pillars: { year: { stem:'甲', element:'Holz', branch:'辰' } } } };
  const pB = { bazi: { pillars: { year: { stem:'丙', element:'Feuer', branch:'卯' } } } };
  const result = buildDynastyResonance(pA, pB);
  assert.equal(result.yearA.element, 'Holz');
  assert.equal(result.yearB.element, 'Feuer');
  assert.ok(typeof result.tone === 'string');
  assert.ok(typeof result.text === 'string' && result.text.length > 0);
  assert.ok(typeof result.score === 'number');
});

test('buildDynastyResonance handles missing pillars gracefully', () => {
  const empty = { bazi: { pillars: { year: {} } } };
  assert.doesNotThrow(() => buildDynastyResonance(empty, empty));
  const result = buildDynastyResonance(empty, empty);
  assert.ok(typeof result.text === 'string');
});

test('buildDynastyResonance tone is one of the known tone symbols', () => {
  const pA = { bazi: { pillars: { year: { element:'Wasser', stem:'壬', branch:'子' } } } };
  const pB = { bazi: { pillars: { year: { element:'Feuer', stem:'丙', branch:'午' } } } };
  const result = buildDynastyResonance(pA, pB);
  assert.ok(['✨','⚡','⚡+','〰','〰+'].includes(result.tone), `unexpected tone: ${result.tone}`);
  assert.ok(result.score >= 0 && result.score <= 1);
});
