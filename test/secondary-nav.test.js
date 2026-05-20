// RED tests for Task B2 — ROUTES manifest + SecondaryNav component.
//
// Solution C per plan: routes metadata lives in public/src/data/routes.js
// (single source of truth for path/label/lane/needsProfile). SecondaryNav
// consumes the manifest and renders one button per route with data-lane
// attribute (Phase C will lane-color via CSS).

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { SecondaryNav } = await import('../public/src/components/SecondaryNav.js');
const { ROUTES }       = await import('../public/src/data/routes.js');

test('ROUTES manifest has all 9 design-mockup routes', () => {
  assert.equal(ROUTES.length, 9);
  const paths = ROUTES.map((r) => r.path);
  for (const expected of ['/overview', '/bazi', '/western', '/wuxing', '/fusion', '/daily', '/synastry', '/', '/method']) {
    assert.ok(paths.includes(expected), `ROUTES missing path ${expected}`);
  }
});

test('ROUTES every entry has path + label + lane + boolean needsProfile', () => {
  for (const r of ROUTES) {
    assert.ok(r.path,  `missing path`);
    assert.ok(r.label, `missing label for path ${r.path}`);
    assert.ok(r.lane,  `missing lane for path ${r.path}`);
    assert.equal(typeof r.needsProfile, 'boolean', `needsProfile must be boolean for ${r.path}`);
  }
});

test('SecondaryNav renders one tab per ROUTES entry with label + lane attribute', () => {
  cap.reset();
  const nav = SecondaryNav();
  assert.equal(nav.tag, 'nav');
  assert.equal(nav._children.length, ROUTES.length);
  for (let i = 0; i < ROUTES.length; i++) {
    const tab = nav._children[i];
    assert.equal(tab.tag, 'button', `child ${i} must be a <button>`);
    assert.equal(tab._text, ROUTES[i].label, `child ${i} label mismatch`);
    // Lane attribute is set either via dataset.lane or setAttribute('data-lane', ...).
    // The capture-stub records setAttribute under _attrs; dataset assignments
    // may not be observable. Accept either path.
    const laneAttr = tab._attrs?.['data-lane'] || tab.dataset?.lane;
    assert.equal(laneAttr, ROUTES[i].lane, `child ${i} data-lane mismatch (got ${laneAttr})`);
  }
});
