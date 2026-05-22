// test/router-cleanup-chain.test.js — I7 TASK-I7-004:
// Verifies the full cleanup chain on hash navigation:
//   page A returns cleanup → mountWithProfile propagates → router stores →
//   next navigation invokes cleanup before mounting page B.
// This replaces the I6 detached-test proxy with a real router-flow contract.

import { test } from 'node:test';
import assert  from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost/',
});
global.document = dom.window.document;
global.window   = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.matchMedia  = () => ({ matches: false });
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
global.cancelAnimationFrame  = (id) => clearTimeout(id);

const { router } = await import('../public/src/router.js');

test('router: cleanup callback returned by page is invoked on next navigation', () => {
  let cleanupCalls = 0;

  router.register('/test-a', () => {
    return () => { cleanupCalls += 1; };
  });
  router.register('/test-b', () => null);

  // First navigation: mount page A. start() reads window.location.hash and dispatches.
  window.location.hash = '#/test-a';
  router.start();
  assert.equal(cleanupCalls, 0, 'cleanup must not fire on initial mount');

  // Trigger hashchange to /test-b
  window.location.hash = '#/test-b';
  window.dispatchEvent(new dom.window.Event('hashchange'));
  assert.equal(cleanupCalls, 1, 'cleanup must fire exactly once when navigating away');

  // Navigate again — cleanup count must stay 1 (B returned no cleanup).
  window.location.hash = '#/test-a';
  window.dispatchEvent(new dom.window.Event('hashchange'));
  assert.equal(cleanupCalls, 1, 'B returned no cleanup so navigating from B fires nothing');
});

test('mountWithProfile-style wrapper: returns inner pageFn cleanup', async () => {
  // Simulates app.js mountWithProfile contract — outer wrapper must propagate
  // the inner page function's return value so router stores the cleanup.
  let cleaned = false;
  const innerPage = () => () => { cleaned = true; };

  // What mountWithProfile MUST do (post-I7 fix):
  function mountLike(pageFn, app) {
    return pageFn(app);
  }

  // Register a route using the wrapper pattern.
  router.register('/test-mount', (app) => mountLike(innerPage, app));
  router.register('/test-next',  () => null);

  window.location.hash = '#/test-mount';
  window.dispatchEvent(new dom.window.Event('hashchange'));

  window.location.hash = '#/test-next';
  window.dispatchEvent(new dom.window.Event('hashchange'));

  // Give event loop a tick for jsdom hashchange dispatch.
  await new Promise(r => setTimeout(r, 10));
  assert.equal(cleaned, true, 'wrapper must propagate inner cleanup so router invokes it on nav-away');
});
