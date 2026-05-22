// I1 — SectionHeader vanilla-ESM factory test.
//
// SectionHeader is the in-page section divider: eyebrow + serif h2 +
// optional subline + optional anchor id (REQ-F-006 — Details erreichbar
// via deep-link anchors).

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { SectionHeader } = await import('../public/src/components/SectionHeader.js');

test('SectionHeader: returns .section-header DOM node', () => {
  cap.reset();
  const node = SectionHeader({ headline: 'Persönlichkeit' });
  assert.ok(node.classList.contains('section-header'));
});

test('SectionHeader: headline is h2 with serif token class .bz-h2', () => {
  const node = SectionHeader({ headline: 'Karriere & Finanzen' });
  const titles = node.querySelectorAll('[data-section-title]');
  assert.equal(titles.length, 1);
  assert.equal(titles[0].tag, 'h2');
  assert.ok(titles[0].classList.contains('bz-h2'));
  assert.equal(titles[0].textContent, 'Karriere & Finanzen');
});

test('SectionHeader: anchor id set on root when provided (REQ-F-006)', () => {
  const node = SectionHeader({ headline: 'X', anchor: 'persoenlichkeit' });
  assert.equal(node.getAttribute('id'), 'persoenlichkeit');
});

test('SectionHeader: lane attribute forwarded to root (data-lane)', () => {
  const node = SectionHeader({ headline: 'X', lane: 'bazi' });
  assert.equal(node.getAttribute('data-lane'), 'bazi');
});

test('SectionHeader: eyebrow + subline rendered when provided', () => {
  const node = SectionHeader({
    eyebrow: 'OST · BaZi',
    headline: 'Säulenanalyse',
    subline: 'Vier Säulen, vier Lebensphasen.',
  });
  const ey  = node.querySelectorAll('[data-section-eyebrow]');
  const sub = node.querySelectorAll('[data-section-subline]');
  assert.equal(ey.length, 1);
  assert.equal(sub.length, 1);
  assert.equal(ey[0].textContent, 'OST · BaZi');
  assert.equal(sub[0].textContent, 'Vier Säulen, vier Lebensphasen.');
});

test('SectionHeader: no eyebrow / no subline → no empty nodes', () => {
  const node = SectionHeader({ headline: 'Nur Titel' });
  assert.equal(node.querySelectorAll('[data-section-eyebrow]').length, 0);
  assert.equal(node.querySelectorAll('[data-section-subline]').length, 0);
});
