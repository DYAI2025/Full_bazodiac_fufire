// test/top-movements.test.js
// OV-I4-T10: TopMovements component
//
// Reduces aspect noise: shows up to 3 entries by default, the rest live
// inside a <details data-progressive> accordion. Groups entries by tone
// into Spannung (hard), Harmonie (soft), Neutral (neutral).
//
// REQ-F-OV-005, REQ-F-OV-006.

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Install JSDOM globals before importing the component.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.document = dom.window.document;
global.window   = dom.window;

const { renderTopMovements } = await import('../public/src/components/TopMovements.js');

const VM = {
  topMovements: [
    { sourceKey: 'Sun',   targetKey: 'Moon',   typeDE: 'opposition', tone: 'hard',    orb: 1.1 },
    { sourceKey: 'Venus', targetKey: 'Mars',   typeDE: 'trigon',     tone: 'soft',    orb: 0.8 },
    { sourceKey: 'Sun',   targetKey: 'Saturn', typeDE: 'quadrat',    tone: 'hard',    orb: 2.1 },
    { sourceKey: 'Merc',  targetKey: 'Pluto',  typeDE: 'aspekt',     tone: 'neutral', orb: 4.0 },
  ],
};

test('OV-I4-T10: returns a <section data-section="top-movements">', () => {
  const node = renderTopMovements(VM);
  assert.ok(node, 'must return a node');
  assert.equal(node.getAttribute('data-section'), 'top-movements');
});

test('OV-I4-T10: default renders at most 3 visible [data-movement] entries', () => {
  const node = renderTopMovements(VM);
  // Visible = NOT inside the collapsed <details data-progressive>
  const details = node.querySelector('details[data-progressive]');
  const allMovements = Array.from(node.querySelectorAll('[data-movement]'));
  const visible = allMovements.filter((m) => {
    if (!details) return true;
    return !details.contains(m);
  });
  assert.ok(visible.length <= 3, `expected <=3 visible movements, got ${visible.length}`);
});

test('OV-I4-T10: extra entries live inside <details data-progressive>', () => {
  const node = renderTopMovements(VM);
  const details = node.querySelector('details[data-progressive]');
  assert.ok(details, '<details data-progressive> must exist when total > 3');
  const summary = details.querySelector('summary');
  assert.ok(summary, '<details> must contain a <summary>');
  const detailsMovements = details.querySelectorAll('[data-movement]');
  assert.ok(detailsMovements.length >= 1, 'expected at least one collapsed movement entry');
});

test('OV-I4-T10: groups are labeled Spannung / Harmonie / Neutral', () => {
  const node = renderTopMovements(VM);
  const text = node.textContent || '';
  for (const label of ['Spannung', 'Harmonie', 'Neutral']) {
    assert.ok(text.includes(label), `group label "${label}" missing in rendered output`);
  }
});

test('OV-I4-T10: each movement has data-tone in {hard,soft,neutral}', () => {
  const node = renderTopMovements(VM);
  const movements = node.querySelectorAll('[data-movement]');
  assert.ok(movements.length >= 4, `expected all 4 movements rendered, got ${movements.length}`);
  for (const m of movements) {
    const tone = m.getAttribute('data-tone');
    assert.ok(
      ['hard', 'soft', 'neutral'].includes(tone),
      `unexpected data-tone="${tone}"`,
    );
  }
});

test('OV-I4-T10: gracefully handles empty/missing topMovements', () => {
  const node = renderTopMovements({ topMovements: [] });
  assert.ok(node, 'must still return a node when list is empty');
  const movements = node.querySelectorAll('[data-movement]');
  assert.equal(movements.length, 0);
});
