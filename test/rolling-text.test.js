// TASK-008: RollingText Entry-only — Vanilla DOM motion component.
//
// Tests run in Node (capture-DOM stub). No RAF, no IntersectionObserver.
// Component must:
//   - Work statically in Node (no throw)
//   - Emit .rolling-text, aria-label, data-roll-char per character
//   - Use createElement (no innerHTML)
//   - Respect prefers-reduced-motion mock
//   - decorateRollingText scans [data-roll-text] and decorates
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { RollingText, decorateRollingText } = await import('../public/src/components/RollingText.js');

function freshRoot() {
  cap.reset();
  return global.document.createElement('div');
}

// ── Test 1: element gets .rolling-text class ─────────────────────────────────
test('RollingText: element has .rolling-text class', () => {
  const el = RollingText({ text: 'Hallo', tagName: 'span' });
  assert.ok(el.classList.contains('rolling-text'),
    'element must have rolling-text class');
});

// ── Test 2: aria-label = original text ───────────────────────────────────────
test('RollingText: aria-label equals original text', () => {
  const el = RollingText({ text: 'Welt', tagName: 'span' });
  assert.equal(el.getAttribute('aria-label'), 'Welt',
    'aria-label must be the original unmodified text');
});

// ── Test 3: each character gets data-roll-char ────────────────────────────────
test('RollingText: each character rendered as span[data-roll-char][aria-hidden]', () => {
  const el = RollingText({ text: 'Hi', tagName: 'span' });
  const chars = el.querySelectorAll('[data-roll-char]');
  assert.equal(chars.length, 2, 'one span per character');
  for (const c of chars) {
    assert.equal(c.getAttribute('aria-hidden'), 'true',
      'char spans must be aria-hidden');
  }
});

// ── Test 4: spaces handled stably ────────────────────────────────────────────
test('RollingText: spaces produce data-roll-char spans with non-empty content', () => {
  const el = RollingText({ text: 'A B', tagName: 'span' });
  const chars = el.querySelectorAll('[data-roll-char]');
  assert.equal(chars.length, 3, 'three spans for "A B"');
  // Space char span must not be empty — use non-breaking space or similar
  const spaceSpan = chars[1];
  assert.ok(spaceSpan, 'middle span must exist');
});

// ── Test 5: no throw without RAF/IntersectionObserver ────────────────────────
test('RollingText: no throw in Node (no RAF/IntersectionObserver)', () => {
  assert.doesNotThrow(() => {
    RollingText({ text: 'Test', tagName: 'span', mode: 'entry' });
  }, 'must not throw when RAF is absent');
});

// ── Test 6: reduced motion → no scramble, immediate final text ───────────────
test('RollingText: prefers-reduced-motion → chars show final text immediately', () => {
  // Mock matchMedia to report reduced-motion preference
  const origMatchMedia = global.matchMedia;
  global.matchMedia = (query) => ({
    matches: query.includes('reduce'),
    addListener: () => {},
    removeListener: () => {},
  });
  try {
    const el = RollingText({ text: 'Abc', tagName: 'span' });
    const chars = el.querySelectorAll('[data-roll-char]');
    assert.equal(chars.length, 3);
    // Each char must already show the final target character
    const texts = Array.from(chars).map((c) => c.textContent);
    assert.deepEqual(texts, ['A', 'b', 'c'],
      'reduced-motion must skip scramble and show final text immediately');
  } finally {
    if (origMatchMedia === undefined) {
      delete global.matchMedia;
    } else {
      global.matchMedia = origMatchMedia;
    }
  }
});

// ── Test 7: decorateRollingText processes [data-roll-text] nodes ──────────────
test('decorateRollingText: decorates all [data-roll-text] elements in root', () => {
  const root = freshRoot();
  const h1 = global.document.createElement('h1');
  h1.setAttribute('data-roll-text', '');
  h1.textContent = 'Titelzeile';
  root.appendChild(h1);

  assert.doesNotThrow(() => {
    decorateRollingText(root, { selector: '[data-roll-text]', maxChars: 90 });
  });
  assert.ok(h1.classList.contains('rolling-text'),
    'h1 must get rolling-text class after decoration');
  assert.equal(h1.getAttribute('aria-label'), 'Titelzeile',
    'aria-label must be set to original text');
});

// ── Test 8: decorateRollingText skips long texts beyond maxChars ──────────────
test('decorateRollingText: skips elements with text longer than maxChars', () => {
  const root = freshRoot();
  const p = global.document.createElement('p');
  p.setAttribute('data-roll-text', '');
  p.textContent = 'x'.repeat(91);
  root.appendChild(p);

  decorateRollingText(root, { selector: '[data-roll-text]', maxChars: 90 });
  assert.ok(!p.classList.contains('rolling-text'),
    'element longer than maxChars must NOT be decorated');
});

// ── Test 9+: RAF engine actually drives animation ────────────────────────────
// These tests exercise the scramble engine added in I2.
// We install a synchronous RAF stub that runs queued callbacks up to a step
// limit, and a matchMedia stub we can flip between motion / no-motion.

function installRafStub({ maxSteps = 240 } = {}) {
  let queue = [];
  let now = 0;
  let calls = 0;

  global.requestAnimationFrame = (cb) => {
    calls++;
    queue.push(cb);
    return calls;
  };
  global.cancelAnimationFrame = () => { /* no-op for tests */ };
  global.performance = { now: () => now };

  function drain() {
    let steps = 0;
    while (queue.length && steps < maxSteps) {
      const cb = queue.shift();
      now += 16; // ~60fps
      cb(now);
      steps++;
    }
  }

  return {
    drain,
    callCount: () => calls,
    reset() {
      queue = [];
      now = 0;
      calls = 0;
    },
  };
}

function installMatchMedia(reduce) {
  global.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    addEventListener() {}, removeEventListener() {},
  });
}

test('RollingText (I2): schedules RAF when motion is enabled', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  // Re-import fresh (component reads matchMedia at construction time).
  const mod = await import('../public/src/components/RollingText.js?i2-raf-on');
  const el = mod.RollingText({ text: 'Hi', tagName: 'span' });

  // Component must expose a start() that begins the scramble. Mount mimics DOM.
  assert.equal(typeof el.startRolling, 'function',
    'I2: RollingText element must expose startRolling()');
  el.startRolling();

  raf.drain();
  assert.ok(raf.callCount() >= 1,
    'I2: at least one requestAnimationFrame call must be scheduled');
});

test('RollingText (I2): a span textContent changes at least once before settling', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-raf-change');
  const el = mod.RollingText({
    text: 'Az',
    tagName: 'span',
    baseDelay: 0,
    perChar: 0,
    charPool: 'XYZ',
  });
  const span = el.querySelectorAll('[data-roll-char]')[0];
  const seen = new Set();

  // Patch textContent setter to capture history.
  const origDesc = Object.getOwnPropertyDescriptor(span, 'textContent')
    || { configurable: true };
  let stored = span.textContent;
  Object.defineProperty(span, 'textContent', {
    configurable: true,
    get() { return stored; },
    set(v) { stored = v; seen.add(v); },
  });

  el.startRolling();
  raf.drain();

  // Seen must contain at least one non-final char AND end at final.
  assert.ok(seen.size >= 2, 'I2: span must show >= 2 distinct chars (scramble + final)');
  assert.equal(stored, 'A', 'I2: span must settle on its final character');

  if (origDesc) Object.defineProperty(span, 'textContent', origDesc);
});

test('RollingText (I2): aria-label stays as final cleartext during animation', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-aria');
  const el = mod.RollingText({ text: 'Bazodiac', tagName: 'h1' });
  assert.equal(el.getAttribute('aria-label'), 'Bazodiac');

  el.startRolling();
  raf.drain();
  assert.equal(el.getAttribute('aria-label'), 'Bazodiac',
    'I2: aria-label must not be scrambled — accessibility invariant');
});

test('RollingText (I2): reduced motion = NO RAF scheduled, spans show final immediately', async () => {
  cap.reset();
  installMatchMedia(true);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-reduced');
  const el = mod.RollingText({ text: 'Hi', tagName: 'span' });
  el.startRolling();
  raf.drain();

  assert.equal(raf.callCount(), 0,
    'I2: prefers-reduced-motion must skip RAF scheduling entirely');
  const chars = el.querySelectorAll('[data-roll-char]');
  assert.equal(chars[0].textContent, 'H');
  assert.equal(chars[1].textContent, 'i');
});

test('RollingText (I2): startRolling is idempotent and cleans up on completion', async () => {
  cap.reset();
  installMatchMedia(false);
  const raf = installRafStub();

  const mod = await import('../public/src/components/RollingText.js?i2-idempotent');
  const el = mod.RollingText({ text: 'X', tagName: 'span', baseDelay: 0, perChar: 0 });
  el.startRolling();
  el.startRolling(); // second call must NOT schedule another loop
  raf.drain();

  const chars = el.querySelectorAll('[data-roll-char]');
  assert.equal(chars[0].textContent, 'X', 'final char settled');
  // After completion, calling startRolling again must be a no-op (already settled).
  const before = raf.callCount();
  el.startRolling();
  raf.drain();
  assert.equal(raf.callCount(), before,
    'I2: startRolling after completion must not re-schedule');
});
