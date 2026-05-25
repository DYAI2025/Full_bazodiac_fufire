// test/meaning-bridge.test.js — OV-I2-T05
//
// Asserts the MeaningBridge component renders three semantically-tagged cards
// (carries / friction / today-lever) each with a bounded body and a visible
// source attribution. Returns an HTMLElement (DOM-style, matches codebase).

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Install JSDOM globals so the component module can call document.createElement.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.document = dom.window.document;
global.window   = dom.window;

const { renderMeaningBridge } = await import('../public/src/components/MeaningBridge.js');

const VM = {
  meaningBridge: {
    carries:    { title: 'Was dich trägt',   body: 'Sonne in Pisces und Day Master Yang Holz bilden deinen Grundimpuls.', source: 'western.Sun + bazi.day_master' },
    friction:   { title: 'Was reibt',        body: 'Mond in Virgo arbeitet gegen den Tagesimpuls, wenn du ihn ignorierst.', source: 'western.Moon' },
    todayLever: { title: 'Was heute hilft',  body: 'Beginne den Tag mit einer kurzen, fokussierten Handlung statt mit Recherche.', source: 'todayLever (heuristic placeholder)' },
  },
};

test('OV-I2: MeaningBridge renders a data-section="meaning-bridge" anchor', () => {
  const el = renderMeaningBridge(VM);
  assert.equal(el.getAttribute('data-section'), 'meaning-bridge');
});

test('OV-I2: MeaningBridge renders exactly 3 cards with carries / friction / today-lever', () => {
  const el = renderMeaningBridge(VM);
  const cards = el.querySelectorAll('[data-card]');
  assert.equal(cards.length, 3, `expected 3 cards, got ${cards.length}`);
  const kinds = Array.from(cards).map((c) => c.getAttribute('data-card')).sort();
  assert.deepEqual(kinds, ['carries', 'friction', 'today-lever']);
});

test('OV-I2: each MeaningBridge card has [data-card-body] + [data-card-source]', () => {
  const el = renderMeaningBridge(VM);
  for (const card of el.querySelectorAll('[data-card]')) {
    const body   = card.querySelector('[data-card-body]');
    const source = card.querySelector('[data-card-source]');
    assert.ok(body,   `data-card="${card.getAttribute('data-card')}" missing [data-card-body]`);
    assert.ok(source, `data-card="${card.getAttribute('data-card')}" missing [data-card-source]`);
  }
});

test('OV-I2: MeaningBridge body text is bounded (<= 240 chars)', () => {
  const el = renderMeaningBridge(VM);
  for (const body of el.querySelectorAll('[data-card-body]')) {
    assert.ok(
      body.textContent.length <= 240,
      `card body exceeds 240 chars: ${body.textContent.length}`,
    );
  }
});

test('OV-I2: MeaningBridge tolerates missing meaningBridge VM gracefully', () => {
  const el = renderMeaningBridge({});
  assert.equal(el.getAttribute('data-section'), 'meaning-bridge');
  // No cards is acceptable; the section still exists for layout / anchor.
});
