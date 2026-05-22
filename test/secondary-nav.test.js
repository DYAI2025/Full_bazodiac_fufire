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

test('ROUTES manifest has all design-mockup routes (≥9)', () => {
  // 9 from H2; +1 (/houses) added during gap-analysis closing PR.
  assert.ok(ROUTES.length >= 9, `expected ≥9 routes, got ${ROUTES.length}`);
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

// I7 Cut A: SecondaryNav now buckets group=cards routes into a <details>
// dropdown. Flat counts no longer hold — iterate the full route tree
// (top-level buttons + nested-in-details buttons) instead.

function collectTabs(nav) {
  const flat = [];
  for (const child of nav._children) {
    if (child.tag === 'button') {
      flat.push(child);
    } else if (child.tag === 'details') {
      for (const inner of (child._children || [])) {
        if (inner.tag === 'button') flat.push(inner);
      }
    }
  }
  return flat;
}

test('SecondaryNav: every route is rendered with label + lane attribute (flat or in group)', () => {
  cap.reset();
  const nav = SecondaryNav();
  assert.equal(nav.tag, 'nav');
  const tabs = collectTabs(nav);
  assert.equal(tabs.length, ROUTES.length, 'all routes must surface as buttons (across nav + dropdowns)');
  // Map by data-path to compare independent of render order.
  const byPath = new Map(tabs.map(t => [t._attrs?.['data-path'], t]));
  for (const route of ROUTES) {
    const tab = byPath.get(route.path);
    assert.ok(tab, `route ${route.path} must produce a tab`);
    assert.equal(tab.tag, 'button', `${route.path} must be a <button>`);
    assert.equal(tab._text, route.label, `${route.path} label mismatch`);
    const laneAttr = tab._attrs?.['data-lane'] || tab.dataset?.lane;
    assert.equal(laneAttr, route.lane, `${route.path} data-lane mismatch (got ${laneAttr})`);
  }
});

// ── Hardening fixes: I-3 + I-4 from /code-reviewer ──────────────────────────

test('SecondaryNav: each tab carries data-path attribute (active-state-by-path, NOT positional index)', () => {
  cap.reset();
  const nav = SecondaryNav();
  const tabs = collectTabs(nav);
  const paths = tabs.map(t => t._attrs?.['data-path']);
  for (const route of ROUTES) {
    assert.ok(paths.includes(route.path),
      `route ${route.path} must carry data-path so active-state survives tab filtering/reordering`);
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
