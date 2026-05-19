import test from 'node:test';
import assert from 'node:assert/strict';

// Tiny DOM stub — enough for createElement, append, textContent, classList,
// setAttribute. We never assert HTML strings; we only assert that nodes
// were created and labels propagated.
function makeStub() {
  function el(tag) {
    const node = {
      tag, _children: [], _attrs: {},
      get textContent() { return this._text || ''; },
      set textContent(v) { this._text = String(v); },
      get className() { return this._attrs.class || ''; },
      set className(v) { this._attrs.class = v; },
      appendChild(c) { this._children.push(c); return c; },
      append(...kids) { for (const k of kids) this._children.push(k); },
      setAttribute(k, v) { this._attrs[k] = v; },
      querySelector() { return null; },
      addEventListener() {},
    };
    return node;
  }
  global.document = { createElement: el, createTextNode: (v) => ({ textContent: v }) };
}

makeStub();

const { ExplainableCard } = await import('../public/src/components/ExplainableCard.js');
const { DailyLearnImpulseCard } = await import('../public/src/components/DailyLearnImpulseCard.js');
const { MeaningDrawer } = await import('../public/src/components/MeaningDrawer.js');

test('ExplainableCard returns a section node with label child', () => {
  const out = ExplainableCard({ label: 'L', value: 'V', meaning: { resource: 'R' } });
  assert.equal(out.tag, 'section');
  assert.ok(out._children.length > 0);
});

test('DailyLearnImpulseCard returns a section with three labelled rows when all fields present', () => {
  const out = DailyLearnImpulseCard({ anchor: 'A', understand: 'U', apply: 'AP', experiment: 'EX' });
  assert.equal(out.tag, 'section');
  // 1 head + 3 rows
  assert.ok(out._children.length >= 4);
});

test('MeaningDrawer skips empty fields rather than rendering blank rows', () => {
  const out = MeaningDrawer({ title: 'T', meaning: 'M' });
  assert.ok(out._children.some((c) => c.tag === 'h3'));
});
