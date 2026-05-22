// test/natal-chart-audit-tabs.test.js
// OV-I4-T11: NatalChartAuditTabs full Top3/Planets/Houses/Aspects.
//
// REQ-D-002, REQ-F-OV-006.

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.document = dom.window.document;
global.window   = dom.window;

const { NatalChartAuditTabs } = await import('../public/src/components/NatalChartAuditTabs.js');

const FULL_FIXTURE = {
  wheel: {
    bodies: [
      {
        key: 'Sun', glyph: '☉', labelDE: 'Sonne',
        signDE: 'Fische', signGlyph: '♓',
        degreeDisplay: "23°09'", house: 12, source: 'api',
      },
      {
        key: 'Moon', glyph: '☽', labelDE: 'Mond',
        signDE: null, signGlyph: null,
        degreeDisplay: null, house: null, source: 'missing',
      },
    ],
    angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
    houses: [
      { number: 1, cuspLongitude: 27.71,  sign: 'Aries' },
      { number: 4, cuspLongitude: 100.66, sign: 'Cancer' },
    ],
    aspects: [
      { sourceKey: 'Sun', targetKey: 'Moon', typeDE: 'opposition', tone: 'hard', orb: 1.1 },
    ],
  },
  topMovements: [
    { sourceKey: 'Sun', targetKey: 'Moon', typeDE: 'opposition', tone: 'hard', orb: 1.1 },
  ],
};

test('OV-I4-T11: renders 4 tabs labeled Top 3 / Planeten / Häuser / Aspekte', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const tabs = node.querySelectorAll('[data-tab]');
  const tabKeys = Array.from(tabs).map((t) => t.getAttribute('data-tab'));
  for (const k of ['top3', 'planets', 'houses', 'aspects']) {
    assert.ok(tabKeys.includes(k), `tab data-tab="${k}" missing`);
  }
  const labels = Array.from(tabs).map((t) => t.textContent || '');
  for (const label of ['Top 3', 'Planeten', 'Häuser', 'Aspekte']) {
    assert.ok(labels.some((l) => l.includes(label)), `tab label "${label}" missing`);
  }
});

test('OV-I4-T11: exactly one tab has data-active="true" by default', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const tabs = Array.from(node.querySelectorAll('[data-tab]'));
  const active = tabs.filter((t) => t.getAttribute('data-active') === 'true');
  assert.equal(active.length, 1, `expected exactly 1 active tab, got ${active.length}`);
});

test('OV-I4-T11: planet row carries glyph + name + sign + degree + house + source', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const sunRow = node.querySelector('[data-audit-row="Sun"]');
  assert.ok(sunRow, 'Sun row must exist');
  const t = sunRow.textContent || '';
  for (const s of ['☉', 'Sonne', '23°09', '12', 'api']) {
    assert.ok(t.includes(s), `Sun row must include "${s}", got: ${t}`);
  }
  // Sign accepts either German label or zodiac glyph.
  assert.ok(t.includes('Fische') || t.includes('♓'), `Sun row missing sign indicator, got: ${t}`);
});

test('OV-I4-T11: missing planet row marks "Daten fehlen" or "nicht geliefert"', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const moonRow = node.querySelector('[data-audit-row="Moon"]');
  assert.ok(moonRow, 'Moon row must exist');
  const t = moonRow.textContent || '';
  assert.match(t, /Daten fehlen|nicht geliefert/);
});

test('OV-I4-T11: non-active tab panels have data-active="false" (or are not active)', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const panels = Array.from(node.querySelectorAll('[data-tab-panel]'));
  assert.ok(panels.length >= 4, `expected >=4 panels, got ${panels.length}`);
  const activePanels = panels.filter((p) => p.getAttribute('data-active') === 'true');
  assert.equal(activePanels.length, 1, 'exactly one panel must be active');
});

test('OV-I4-T11: clicking a tab swaps which panel is active', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  // Mount it into the document so addEventListener works.
  document.body.appendChild(node);
  try {
    const planetsTab = node.querySelector('[data-tab="planets"]');
    assert.ok(planetsTab, 'planets tab must exist');
    planetsTab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    const activeTabs = Array.from(node.querySelectorAll('[data-tab][data-active="true"]'));
    assert.equal(activeTabs.length, 1);
    assert.equal(activeTabs[0].getAttribute('data-tab'), 'planets');
    const activePanel = node.querySelector('[data-tab-panel][data-active="true"]');
    assert.ok(activePanel);
    assert.equal(activePanel.getAttribute('data-tab-panel'), 'planets');
  } finally {
    node.remove();
  }
});

test('OV-I4-T11: bodies appear in planets panel with data-audit-row markers', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const planetsPanel = node.querySelector('[data-tab-panel="planets"]');
  assert.ok(planetsPanel, 'planets panel must exist');
  const sun = planetsPanel.querySelector('[data-audit-row="Sun"]');
  assert.ok(sun, 'Sun row must exist inside planets panel');
});

test('OV-I4-T11: houses panel renders one row per cusp', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const housesPanel = node.querySelector('[data-tab-panel="houses"]');
  assert.ok(housesPanel, 'houses panel must exist');
  const rows = housesPanel.querySelectorAll('[data-house]');
  assert.ok(rows.length >= 2, `expected >=2 house rows, got ${rows.length}`);
});

test('OV-I4-T11: aspects panel renders each aspect row', () => {
  const node = NatalChartAuditTabs(FULL_FIXTURE);
  const aspectsPanel = node.querySelector('[data-tab-panel="aspects"]');
  assert.ok(aspectsPanel, 'aspects panel must exist');
  const rows = aspectsPanel.querySelectorAll('[data-aspect-row]');
  assert.ok(rows.length >= 1, `expected >=1 aspect row, got ${rows.length}`);
});
