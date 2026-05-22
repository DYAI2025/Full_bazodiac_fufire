// test/secondary-nav-grouped.test.js — I7 Cut A:
// SecondaryNav groups the 5 chart-lane routes under a single "Karten"
// dropdown. Reduces top-level tab count from 10 to 6, lowers mobile
// scroll-tax, makes IA hierarchy explicit.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { SecondaryNav } = await import('../public/src/components/SecondaryNav.js');
const { ROUTES }       = await import('../public/src/data/routes.js');

const GROUPED_PATHS = ['/bazi', '/western', '/wuxing', '/fusion', '/houses'];

test('ROUTES: chart-lane entries carry group="cards"', () => {
  for (const p of GROUPED_PATHS) {
    const r = ROUTES.find(x => x.path === p);
    assert.ok(r, `route ${p} must exist in ROUTES`);
    assert.equal(r.group, 'cards', `route ${p} must carry group="cards"`);
  }
});

test('ROUTES: non-chart entries have no group (or group !== "cards")', () => {
  const ungrouped = ROUTES.filter(r => !GROUPED_PATHS.includes(r.path));
  for (const r of ungrouped) {
    assert.notEqual(r.group, 'cards', `route ${r.path} must not be in cards group`);
  }
});

test('SecondaryNav: top-level child count = ungrouped routes + 1 dropdown', () => {
  cap.reset();
  const nav = SecondaryNav();
  const ungroupedCount = ROUTES.filter(r => r.group !== 'cards').length;
  assert.equal(nav._children.length, ungroupedCount + 1,
    `top-level should be ${ungroupedCount} ungrouped + 1 cards dropdown`);
});

test('SecondaryNav: cards group renders as <details> with summary label "Karten"', () => {
  cap.reset();
  const nav = SecondaryNav();
  const dropdown = nav._children.find(c => c.tag === 'details');
  assert.ok(dropdown, 'must contain a <details> element for the cards group');
  const summary = dropdown._children?.find(c => c.tag === 'summary');
  assert.ok(summary, '<details> must contain <summary>');
  assert.match(summary._text, /Karten/i, 'summary label must contain "Karten"');
});

test('SecondaryNav: cards dropdown contains one nested button per grouped route', () => {
  cap.reset();
  const nav = SecondaryNav();
  const dropdown = nav._children.find(c => c.tag === 'details');
  const nestedButtons = (dropdown._children || []).filter(c => c.tag === 'button');
  assert.equal(nestedButtons.length, GROUPED_PATHS.length,
    `expected ${GROUPED_PATHS.length} grouped buttons, got ${nestedButtons.length}`);
  const nestedPaths = nestedButtons.map(b => b._attrs?.['data-path']);
  for (const p of GROUPED_PATHS) {
    assert.ok(nestedPaths.includes(p), `dropdown must include path ${p}`);
  }
});

test('SecondaryNav: every route still reachable (top-level + nested combined)', () => {
  cap.reset();
  const nav = SecondaryNav();
  const collected = [];
  for (const child of nav._children) {
    if (child.tag === 'button') {
      collected.push(child._attrs?.['data-path']);
    } else if (child.tag === 'details') {
      for (const inner of (child._children || [])) {
        if (inner.tag === 'button') collected.push(inner._attrs?.['data-path']);
      }
    }
  }
  for (const r of ROUTES) {
    assert.ok(collected.includes(r.path), `route ${r.path} must be reachable from nav`);
  }
});
