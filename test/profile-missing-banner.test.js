import test from 'node:test';
import assert from 'node:assert/strict';

function makeStub() {
  function el(tag) {
    const node = {
      tag, _children: [], _attrs: {}, _listeners: {},
      get textContent() { return this._text || ''; },
      set textContent(v) { this._text = String(v); },
      get className() { return this._attrs.class || ''; },
      set className(v) { this._attrs.class = v; },
      type: '',
      appendChild(c) { this._children.push(c); return c; },
      append(...kids) { for (const k of kids) this._children.push(k); },
      setAttribute(k, v) { this._attrs[k] = v; },
      addEventListener(ev, cb) { (this._listeners[ev] ||= []).push(cb); },
    };
    return node;
  }
  global.document = { createElement: el };
  global.window = { location: { hash: '' } };
}

makeStub();

const { ProfileMissingBanner } = await import('../public/src/components/ProfileMissingBanner.js');

test('ProfileMissingBanner returns section with role=status and CTA child', () => {
  const out = ProfileMissingBanner({ pageLabel: 'die Test-Ansicht' });
  assert.equal(out.tag, 'section');
  assert.equal(out._attrs.role, 'status');
  assert.equal(out.className, 'profile-missing-banner');
  // title + text + actions container
  assert.equal(out._children.length, 3);
  const actions = out._children[2];
  const cta = actions._children[0];
  assert.equal(cta.tag, 'button');
  assert.equal(cta.className, 'profile-missing-cta');
});

test('ProfileMissingBanner uses provided pageLabel in copy', () => {
  const out = ProfileMissingBanner({ pageLabel: 'die Synastry-Ansicht' });
  const text = out._children[1];
  assert.match(text._text, /die Synastry-Ansicht/);
});

test('ProfileMissingBanner CTA click calls onOpenInput callback', () => {
  let called = false;
  const out = ProfileMissingBanner({ onOpenInput: () => { called = true; } });
  const cta = out._children[2]._children[0];
  cta._listeners.click[0]();
  assert.equal(called, true);
});
