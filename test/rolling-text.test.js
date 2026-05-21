// test/rolling-text.test.js
// TASK-008: Unit tests for RollingText vanilla-DOM component.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();

// matchMedia stub — reduced motion OFF by default.
let reducedMotion = false;
global.matchMedia = (q) => ({
  matches: q.includes('reduce') ? reducedMotion : false,
  addEventListener() {},
  removeEventListener() {},
});

const { RollingText, decorateRollingText } =
  await import('../public/src/components/RollingText.js');

// ── Test 1: element tag ──────────────────────────────────────────────────────
test('RollingText: returns element with correct tagName', () => {
  cap.reset();
  const el = RollingText({ text: 'Hi', tagName: 'h1' });
  assert.equal(el.tag, 'h1');
});

// ── Test 2: rolling-text class ───────────────────────────────────────────────
test('RollingText: element has rolling-text class', () => {
  cap.reset();
  const el = RollingText({ text: 'Hi' });
  assert.ok(el.classList._classes.has('rolling-text'),
    'element must have rolling-text class');
});

// ── Test 3: aria-label ───────────────────────────────────────────────────────
test('RollingText: aria-label equals original text', () => {
  cap.reset();
  const el = RollingText({ text: 'Hello World' });
  assert.equal(el._attrs['aria-label'], 'Hello World');
});

// ── Test 4: char count ───────────────────────────────────────────────────────
test('RollingText: produces one span per character', () => {
  cap.reset();
  const el = RollingText({ text: 'ABC' });
  assert.equal(el._children.length, 3);
});

// ── Test 5: data-roll-char attribute ────────────────────────────────────────
test('RollingText: every char span has data-roll-char attribute', () => {
  cap.reset();
  const el = RollingText({ text: 'XY' });
  for (const span of el._children) {
    assert.ok('data-roll-char' in span._attrs,
      'each span must have data-roll-char attribute');
  }
});

// ── Test 6: space handling ───────────────────────────────────────────────────
test('RollingText: space chars render as space (not scrambled)', () => {
  cap.reset();
  reducedMotion = true; // reduced motion so textContent is set immediately
  const el = RollingText({ text: 'A B' });
  // Middle span is the space.
  assert.equal(el._children[1]._text, ' ',
    'space char must be stored as plain space');
  reducedMotion = false;
});

// ── Test 7: no-RAF environment does not throw ────────────────────────────────
test('RollingText: does not throw in Node (no RAF, no matchMedia)', () => {
  // Temporarily remove matchMedia to simulate a bare Node environment.
  const savedMM = global.matchMedia;
  delete global.matchMedia;
  try {
    assert.doesNotThrow(() => RollingText({ text: 'Test', tagName: 'p' }));
  } finally {
    global.matchMedia = savedMM;
  }
});

// ── Test 8: reduced motion ───────────────────────────────────────────────────
test('RollingText: reduced motion — data-roll-final NOT set on spans', () => {
  cap.reset();
  reducedMotion = true;
  const el = RollingText({ text: 'Go' });
  for (const span of el._children) {
    assert.ok(!('rollFinal' in (span.dataset || {})),
      'reduced motion must not set data-roll-final');
  }
  reducedMotion = false;
});

// ── Test 9: RAF mock — scramble is scheduled when RAF available ──────────────
test('RollingText: scheduleScramble fires RAF when requestAnimationFrame available', () => {
  const calls = [];
  global.requestAnimationFrame = (cb) => { calls.push(cb); return calls.length; };
  try {
    const el = RollingText({ text: 'AB', tagName: 'span' });
    // At least one RAF call should have been queued (one per non-space char).
    assert.ok(calls.length >= 1,
      `Expected ≥1 RAF calls queued for 2-char text, got ${calls.length}`);
  } finally {
    delete global.requestAnimationFrame;
  }
});

// ── Test 10: RAF mock — chars settle to final value after ticks ──────────────
test('RollingText: chars settle to data-roll-final value when RAF ticks complete', () => {
  // Synchronous RAF mock: immediately runs all queued callbacks.
  const queue = [];
  let now = 0;
  global.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  global.performance = { now: () => now };

  try {
    const el = RollingText({ text: 'X', tagName: 'span' });
    const chars = el.querySelectorAll('[data-roll-char]');
    assert.equal(chars.length, 1);

    // Advance time past delay + scramble duration and flush RAF queue.
    now = 1000; // well past any delay + 380ms scramble
    while (queue.length > 0) {
      const cb = queue.shift();
      cb(now);
    }

    assert.equal(chars[0].textContent, 'X',
      'char must settle to final value "X" after RAF ticks complete');
  } finally {
    delete global.requestAnimationFrame;
    delete global.performance;
  }
});
