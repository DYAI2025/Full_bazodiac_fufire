// I1 — PageShell vanilla-ESM factory test.
//
// PageShell is the outer wrapper every page uses. It owns:
//   - the .page-shell root with role="main"
//   - an optional eyebrow (small UPPERCASE label)
//   - a serif headline (h1)
//   - an optional subline (UI sans, muted)
//   - a body slot (the page's actual content goes here)

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { PageShell } = await import('../public/src/components/PageShell.js');

test('PageShell: returns a DOM node with .page-shell class', () => {
  cap.reset();
  const node = PageShell({ headline: 'Übersicht' });
  assert.ok(node, 'PageShell must return a node');
  assert.ok(node.classList.contains('page-shell'),
    'root must carry .page-shell class');
});

test('PageShell: root has role="main" for landmark a11y', () => {
  const node = PageShell({ headline: 'X' });
  assert.equal(node.getAttribute('role'), 'main');
});

test('PageShell: headline rendered as h1 inside [data-page-title]', () => {
  const node = PageShell({ headline: 'Dein Sternfeld' });
  const titles = node.querySelectorAll('[data-page-title]');
  assert.equal(titles.length, 1, 'exactly one [data-page-title]');
  assert.equal(titles[0].tag, 'h1');
  assert.equal(titles[0].textContent, 'Dein Sternfeld');
});

test('PageShell: eyebrow rendered when provided', () => {
  const node = PageShell({ eyebrow: 'KAPITEL 1', headline: 'X' });
  const ey = node.querySelectorAll('[data-page-eyebrow]');
  assert.equal(ey.length, 1);
  assert.equal(ey[0].textContent, 'KAPITEL 1');
});

test('PageShell: subline rendered when provided', () => {
  const node = PageShell({ headline: 'X', subline: 'Was du heute weißt.' });
  const subs = node.querySelectorAll('[data-page-subline]');
  assert.equal(subs.length, 1);
  assert.equal(subs[0].textContent, 'Was du heute weißt.');
});

test('PageShell: returns body slot via .body property for append', () => {
  const node = PageShell({ headline: 'X' });
  assert.ok(node.body, 'PageShell must expose a .body slot');
  const child = global.document.createElement('section');
  child.textContent = 'content';
  node.body.appendChild(child);
  assert.equal(node.body._children.length, 1);
  assert.equal(node.body._children[0].textContent, 'content');
});

test('PageShell: no eyebrow / no subline → no empty placeholder nodes', () => {
  const node = PageShell({ headline: 'X' });
  assert.equal(node.querySelectorAll('[data-page-eyebrow]').length, 0);
  assert.equal(node.querySelectorAll('[data-page-subline]').length, 0);
});
