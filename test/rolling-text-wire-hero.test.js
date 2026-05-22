// test/rolling-text-wire-hero.test.js — I6-fix:
// wireHeroRolling helper extracts the duplicated 13-line RAF wiring block
// that the 6 subpages copy-pasted. Reads hero text + classes from a
// [data-page-title] marker, returns a stopRolling cleanup callback.

import { test } from 'node:test';
import assert  from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.document   = dom.window.document;
global.window     = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.matchMedia = () => ({ matches: false });
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
global.cancelAnimationFrame  = (id) => clearTimeout(id);

const { wireHeroRolling } = await import('../public/src/components/RollingText.js');

function mount(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

test('wireHeroRolling: returns null when no [data-page-title] element exists', () => {
  const root = mount('<header><h1>Plain</h1></header>');
  const result = wireHeroRolling(root);
  assert.equal(result, null);
});

test('wireHeroRolling: replaces [data-page-title] with a RollingText node preserving classes', () => {
  const root = mount('<header><h1 class="page-title bz-h1" data-page-title>Mein Titel</h1></header>');
  const cleanup = wireHeroRolling(root);
  const replaced = root.querySelector('[data-page-title]');
  assert.ok(replaced, 'replacement still carries data-page-title');
  assert.ok(replaced.classList.contains('page-title'), 'class page-title preserved');
  assert.ok(replaced.classList.contains('bz-h1'), 'class bz-h1 preserved');
  assert.ok(replaced.classList.contains('rolling-text'), 'rolling-text class added by RollingText()');
  assert.equal(replaced.getAttribute('aria-label'), 'Mein Titel');
  assert.equal(typeof cleanup, 'function', 'returns stopRolling callback');
});

test('wireHeroRolling: derives hero text from element textContent', () => {
  const root = mount('<header><h1 data-page-title>Was zirkuliert, was staut</h1></header>');
  wireHeroRolling(root);
  const replaced = root.querySelector('[data-page-title]');
  assert.equal(replaced.getAttribute('aria-label'), 'Was zirkuliert, was staut');
});

test('wireHeroRolling: uses fallbackText when element textContent is empty', () => {
  const root = mount('<header><h1 data-page-title></h1></header>');
  wireHeroRolling(root, 'Fallback');
  const replaced = root.querySelector('[data-page-title]');
  assert.equal(replaced.getAttribute('aria-label'), 'Fallback');
});

test('wireHeroRolling: returned cleanup() stops the RAF loop without crashing', () => {
  const root = mount('<header><h1 data-page-title>X</h1></header>');
  const cleanup = wireHeroRolling(root);
  assert.doesNotThrow(() => cleanup());
});
