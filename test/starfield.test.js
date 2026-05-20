// Sprint H4 — Starfield procedural background layer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { Starfield, mountStarfield } = await import('../public/src/components/Starfield.js');

test('Starfield(): generates exactly 80 stars by default', () => {
  cap.reset();
  const field = Starfield();
  assert.equal(field.tag, 'div');
  assert.equal(field._attrs.class, 'starfield');
  assert.equal(field._attrs['aria-hidden'], 'true');
  assert.equal(field._children.length, 80);
});

test('Starfield(): count option respected', () => {
  cap.reset();
  const field = Starfield({ count: 10 });
  assert.equal(field._children.length, 10);
});

test('Starfield(): every star is an <i> with deterministic inline style', () => {
  cap.reset();
  const a = Starfield({ count: 5 });
  const b = Starfield({ count: 5 });
  for (let i = 0; i < 5; i++) {
    assert.equal(a._children[i].tag, 'i');
    // Style is set via cssText; deterministic across calls (sin-based PRNG).
    assert.equal(a._children[i].style.cssText, b._children[i].style.cssText,
      `star ${i} style must be deterministic across calls`);
  }
});

test('mountStarfield: idempotent — second call replaces first, never accumulates', () => {
  cap.reset();
  const host = global.document.createElement('div');
  // Make sure host.querySelector returns existing starfields after append.
  // Stub's querySelector returns a fresh node always — for this test we use
  // an inline replacement: stub host.querySelector to scan _children.
  host.querySelector = (sel) => {
    if (sel !== '.starfield') return null;
    return host._children.find((c) => c._attrs?.class === 'starfield') || null;
  };

  mountStarfield(host);
  const after1 = host._children.filter((c) => c._attrs?.class === 'starfield').length;
  mountStarfield(host);
  const after2 = host._children.filter((c) => c._attrs?.class === 'starfield').length;
  // First mount leaves 1; second mount removes the existing one and appends
  // a new one — still 1.
  assert.equal(after1, 1, 'first mount should leave 1 starfield');
  assert.equal(after2, 1, `re-init must not accumulate (got ${after2})`);
});

test('mountStarfield: null/undefined host returns null safely', () => {
  assert.equal(mountStarfield(null), null);
  assert.equal(mountStarfield(undefined), null);
});
