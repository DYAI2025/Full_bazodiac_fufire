// test/rolling-text-detached.test.js — I6-fix:
// RollingText.tick() must self-cancel when the host element is detached from
// the DOM (hash-router unmount). Without this guard, the RAF loop keeps
// writing into garbage-collectible nodes, leaking CPU + memory in long sessions.

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

const { RollingText } = await import('../public/src/components/RollingText.js');

test('RollingText: tick() drops rolling class once element is detached from DOM', async () => {
  const el = RollingText({ text: 'ABC', tagName: 'span' });
  document.body.appendChild(el);
  el.startRolling();
  assert.ok(el.classList.contains('rolling-text--rolling'), 'precondition: animation has started');

  el.remove();
  assert.equal(el.isConnected, false, 'precondition: element is detached');

  // Wait long enough for at least one RAF tick to observe the detachment.
  await new Promise(r => setTimeout(r, 40));

  assert.equal(el.classList.contains('rolling-text--rolling'), false,
    'tick() must remove rolling-text--rolling when isConnected is false');
});
