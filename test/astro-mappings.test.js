// test/astro-mappings.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  signToElement,
  elementPairTone,
  HOUSE_TEMPLATES,
  ELEMENT_QUALITIES,
  ELEMENT_COLORS,
} from '../public/src/data/astro-mappings.js';

test('signToElement maps all 12 signs', () => {
  assert.equal(signToElement('Widder'),     'Feuer');
  assert.equal(signToElement('Stier'),      'Erde');
  assert.equal(signToElement('Zwillinge'),  'Luft');
  assert.equal(signToElement('Krebs'),      'Wasser');
  assert.equal(signToElement('Löwe'),       'Feuer');
  assert.equal(signToElement('Jungfrau'),   'Erde');
  assert.equal(signToElement('Waage'),      'Luft');
  assert.equal(signToElement('Skorpion'),   'Wasser');
  assert.equal(signToElement('Schütze'),    'Feuer');
  assert.equal(signToElement('Steinbock'),  'Erde');
  assert.equal(signToElement('Wassermann'), 'Luft');
  assert.equal(signToElement('Fische'),     'Wasser');
});

test('signToElement also accepts English names', () => {
  assert.equal(signToElement('Aries'),   'Feuer');
  assert.equal(signToElement('Taurus'),  'Erde');
  assert.equal(signToElement('Scorpio'), 'Wasser');
});

test('elementPairTone returns valid tone for all 10 pairs', () => {
  const TONES = ['✨', '⚡', '⚡+', '〰', '〰+'];
  const pairs = [
    ['Feuer','Feuer'],['Feuer','Luft'],['Feuer','Erde'],['Feuer','Wasser'],
    ['Erde','Erde'],['Erde','Wasser'],['Erde','Luft'],
    ['Luft','Luft'],['Luft','Wasser'],['Wasser','Wasser'],
  ];
  for (const [a, b] of pairs) {
    const result = elementPairTone(a, b);
    assert.ok(result.tone, `missing tone for ${a}+${b}`);
    assert.ok(result.score >= 0 && result.score <= 1, `score out of range for ${a}+${b}`);
    assert.ok(typeof result.relation === 'string', `missing relation for ${a}+${b}`);
  }
});

test('elementPairTone is symmetric', () => {
  const ab = elementPairTone('Feuer', 'Wasser');
  const ba = elementPairTone('Wasser', 'Feuer');
  assert.equal(ab.tone, ba.tone);
  assert.equal(ab.score, ba.score);
});

test('HOUSE_TEMPLATES covers all 12 houses', () => {
  for (let i = 1; i <= 12; i++) {
    assert.ok(HOUSE_TEMPLATES[i], `missing template for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].label, `missing label for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].harmonizing, `missing harmonizing for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].tension, `missing tension for house ${i}`);
    assert.ok(HOUSE_TEMPLATES[i].neutral, `missing neutral for house ${i}`);
  }
});

test('ELEMENT_QUALITIES covers all 5 elements', () => {
  for (const el of ['Feuer','Erde','Luft','Wasser','Holz']) {
    assert.ok(ELEMENT_QUALITIES[el], `missing qualities for ${el}`);
    assert.ok(ELEMENT_QUALITIES[el].love, `missing love quality for ${el}`);
    assert.ok(ELEMENT_QUALITIES[el].career, `missing career quality for ${el}`);
  }
});
