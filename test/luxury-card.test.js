// I1 — LuxuryCard vanilla-ESM factory test.
//
// LuxuryCard is the premium card wrapper: gold-antique border, glass
// background, optional title + footer + lane attribute.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { LuxuryCard } = await import('../public/src/components/LuxuryCard.js');

test('LuxuryCard: returns .luxury-card DOM node', () => {
  cap.reset();
  const node = LuxuryCard({ title: 'Kern' });
  assert.ok(node.classList.contains('luxury-card'));
});

test('LuxuryCard: title rendered as h3 inside [data-card-title]', () => {
  const node = LuxuryCard({ title: 'Dein dominantes Element' });
  const t = node.querySelectorAll('[data-card-title]');
  assert.equal(t.length, 1);
  assert.equal(t[0].tag, 'h3');
  assert.equal(t[0].textContent, 'Dein dominantes Element');
});

test('LuxuryCard: lane attribute forwarded to root (data-lane)', () => {
  const node = LuxuryCard({ title: 'X', lane: 'fusion' });
  assert.equal(node.getAttribute('data-lane'), 'fusion');
});

test('LuxuryCard: exposes .body slot, callers append into it', () => {
  const node = LuxuryCard({ title: 'X' });
  assert.ok(node.body, 'must expose .body');
  const child = global.document.createElement('p');
  child.textContent = 'wert';
  node.body.appendChild(child);
  assert.equal(node.body._children.length, 1);
  assert.equal(node.body._children[0].textContent, 'wert');
});

test('LuxuryCard: variant=hero adds .luxury-card--hero modifier', () => {
  const node = LuxuryCard({ title: 'X', variant: 'hero' });
  assert.ok(node.classList.contains('luxury-card--hero'));
});

test('LuxuryCard: no title supplied → no [data-card-title] node', () => {
  const node = LuxuryCard({});
  assert.equal(node.querySelectorAll('[data-card-title]').length, 0);
});

test('LuxuryCard: footer slot rendered + exposed as .footer when requested', () => {
  const node = LuxuryCard({ title: 'X', withFooter: true });
  assert.ok(node.footer, 'must expose .footer when withFooter=true');
  const cta = global.document.createElement('button');
  cta.textContent = 'Mehr';
  node.footer.appendChild(cta);
  assert.equal(node.footer._children.length, 1);
});
