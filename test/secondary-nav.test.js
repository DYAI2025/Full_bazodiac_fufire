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

// ── Hardening fixes: I-3 + I-4 from /code-reviewer ──────────────────────────

test('SecondaryNav: each tab carries data-path attribute (active-state-by-path, NOT positional index)', () => {
  cap.reset();
  const nav = SecondaryNav();
  for (let i = 0; i < ROUTES.length; i++) {
    const tab = nav._children[i];
    assert.equal(tab._attrs['data-path'], ROUTES[i].path,
      `tab ${i} must carry data-path="${ROUTES[i].path}" so active-state survives tab filtering/reordering`);
  }
});

test('mountGlobalNav: clears existing host content before appending (re-init safe — duplicate-nav guard)', async () => {
  const { mountGlobalNav } = await import('../public/src/components/SecondaryNav.js');
  // Synthesize a host with an existing nav inside it — simulates hot-reload
  // / re-import scenario where mountGlobalNav fires twice.
  const host = global.document.createElement('div');
  const ghost = global.document.createElement('nav');
  ghost.className = 'secondary-nav';
  host.appendChild(ghost);
  assert.equal(host._children.length, 1, 'precondition: host has one ghost nav');

  // Hook replaceChildren so the stub records the wipe — mimics real DOM API.
  if (typeof host.replaceChildren !== 'function') {
    host.replaceChildren = () => { host._children = []; };
  }

  mountGlobalNav(host);

  const navs = host._children.filter((c) => c?.tag === 'nav');
  assert.equal(navs.length, 1, `host must contain exactly 1 nav after re-init (got ${navs.length})`);
});
