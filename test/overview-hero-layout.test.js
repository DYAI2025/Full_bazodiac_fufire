// test/overview-hero-layout.test.js
// I4: Overview Premium-Hero layout test.
// Mounts OverviewPage in a real JSDOM environment and asserts:
//   - All 9 data-section elements in the correct order
//   - Hero slot structure (wheel left, narrative right)
//   - RollingText + 3 evidence cards in narrative
//   - Key-facts pills
//   - Deep-dive tiles with hash-routes
//   - Progressive disclosure <details> blocks default-closed
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Install JSDOM globals so OverviewPage and its imports can use document/window.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.document  = dom.window.document;
global.window    = dom.window;
global.sessionStorage = {
  _m: new Map(),
  getItem(k)    { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
global.localStorage = {
  _m: new Map(),
  getItem(k)    { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { OverviewPage } = await import('../public/src/pages/OverviewPage.js');

// ── Fixture ──────────────────────────────────────────────────────────────────
// Passed directly as a viewModel (has keyFacts → treated as pre-mapped).
const FIXTURE = {
  identity: {
    name: 'Test Person',
    birth: { date: '1990-04-12', time: '14:30', place: 'Berlin, DE', timezone: 'Europe/Berlin' },
  },
  keyFacts: [
    { label: 'Sonne',          value: 'Widder 22°' },
    { label: 'Mond',           value: 'Skorpion 8°' },
    { label: 'AC',             value: 'Löwe 3°' },
    { label: 'Tagesmeister',   value: 'Yang Holz' },
    { label: 'Element-Profil', value: 'Holz-dominant' },
  ],
  wheel: {
    bodies: [],
    angles: { Ascendant: 27.71, MC: 280.66, anglesSource: 'api' },
    aspects: [],
  },
  fusionNarrative: {
    headline: 'Pionier mit Tiefenmotor',
    rotations: ['Pionier', 'Tiefenseher', 'Funkenträger'],
    evidence: [
      { title: 'Westen',   body: 'Sonne Widder · Mond Skorpion · AC Löwe' },
      { title: 'BaZi',     body: 'Yang Holz Tagesmeister · Wasser-Mond' },
      { title: 'Resonanz', body: 'Holz-Wasser-Achse · feurige Außenwirkung' },
    ],
  },
  baziPillars: {},
  westernCore: {},
  fusionCoherence: { score: 0.78, lens: 'Holz-Wasser' },
  elementEconomy: { holz: 35, feuer: 25, erde: 10, metall: 10, wasser: 20 },
  deepDive: [
    { id: 'western',     title: 'Westliches Detail',  href: '#/personality' },
    { id: 'bazi',        title: 'BaZi Detail',        href: '#/career-finance' },
    { id: 'houses',      title: 'Häuser',             href: '#/houses' },
  ],
};

function mountPage(fixture) {
  const root = document.createElement('div');
  OverviewPage(root, fixture);
  return root;
}

// ── Tests ────────────────────────────────────────────────────────────────────

test('OverviewPage renders all hero sections in correct order', () => {
  const root = mountPage(FIXTURE);
  const sections = Array.from(root.querySelectorAll('[data-section]'));
  const ids = sections.map((el) => el.getAttribute('data-section'));

  // OV-I2: SignatureHero wraps the legacy hero structure as the first section.
  // The legacy data-section anchors (hero, key-facts, birthchart-wheel,
  // fusion-narrative) remain inside the new signature-hero for backward
  // compatibility with the I4 e2e spec and audit tooling.
  // meaning-bridge sits between the hero and the legacy thematic sections.
  assert.deepEqual(ids, [
    'signature-hero',
    'hero',
    'key-facts',
    'birthchart-wheel',
    'fusion-narrative',
    'meaning-bridge',
    'bazi-pillars',
    'western-core',
    'fusion-coherence',
    'element-economy',
    'deep-dive',
  ], `Section order mismatch. Got: ${ids.join(', ')}`);
});

test('Hero section contains wheel on left and fusion narrative on right', () => {
  const root = mountPage(FIXTURE);
  const hero = root.querySelector('[data-section="hero"]');
  assert.ok(hero, 'hero section missing');

  const wheel     = hero.querySelector('[data-hero-slot="wheel"]');
  const narrative = hero.querySelector('[data-hero-slot="narrative"]');
  assert.ok(wheel,     'hero wheel slot missing');
  assert.ok(narrative, 'hero narrative slot missing');

  const slots = Array.from(hero.querySelectorAll('[data-hero-slot]'));
  assert.equal(slots[0].getAttribute('data-hero-slot'), 'wheel');
  assert.equal(slots[1].getAttribute('data-hero-slot'), 'narrative');
});

test('Hero narrative contains RollingText headline + 3 evidence cards', () => {
  const root      = mountPage(FIXTURE);
  const narrative = root.querySelector('[data-hero-slot="narrative"]');
  const rolling   = narrative.querySelector('[data-rolling-text]');
  assert.ok(rolling, 'RollingText must render in narrative');

  const evidenceCards = narrative.querySelectorAll('[data-evidence-card]');
  assert.equal(evidenceCards.length, 3, 'must have exactly 3 evidence cards');
});

test('Key Facts strip renders as compact pills above hero content', () => {
  const root     = mountPage(FIXTURE);
  const keyFacts = root.querySelector('[data-section="key-facts"]');
  assert.ok(keyFacts, 'key-facts section missing');

  const pills = keyFacts.querySelectorAll('[data-key-fact]');
  assert.ok(pills.length >= 3, `expected >= 3 key fact pills, got ${pills.length}`);
});

test('Deep-Dive section renders tiles that link to detail routes', () => {
  const root = mountPage(FIXTURE);
  const deep = root.querySelector('[data-section="deep-dive"]');
  assert.ok(deep, 'deep-dive section missing');

  const tiles = Array.from(deep.querySelectorAll('a[data-deep-dive-tile]'));
  assert.ok(tiles.length >= 3, `expected >= 3 deep-dive tiles, got ${tiles.length}`);

  for (const tile of tiles) {
    const href = tile.getAttribute('href') || '';
    assert.match(href, /^#\//, `tile href must be hash-route, got: ${href}`);
  }
});

test('Detail blocks are collapsed by default (progressive disclosure)', () => {
  const root    = mountPage(FIXTURE);
  const details = Array.from(root.querySelectorAll('details[data-progressive]'));
  assert.ok(details.length >= 1, 'expected at least one collapsible <details> block');

  for (const d of details) {
    assert.equal(d.hasAttribute('open'), false, 'progressive details must start closed');
    const summary = d.querySelector('summary');
    assert.ok(summary, 'each <details> needs a <summary>');
  }
});

// ── OV-I2: signature-hero / meaning-bridge target DOM structure ─────────────

test('OV-I2: signature-hero section exists with wheel-anchor + fusion-signature-panel slots', () => {
  const root = mountPage(FIXTURE);
  const hero = root.querySelector('[data-section="signature-hero"]');
  assert.ok(hero, 'signature-hero section missing');

  const slots = Array.from(hero.querySelectorAll(':scope > [data-hero-slot]'))
    .map((el) => el.getAttribute('data-hero-slot'));
  assert.deepEqual(
    slots,
    ['wheel-anchor', 'fusion-signature-panel'],
    `signature-hero slot order mismatch. Got: ${slots.join(', ')}`,
  );
});

test('OV-I2: meaning-bridge appears after signature-hero in document order', () => {
  const root = mountPage(FIXTURE);
  const heroIdx   = Array.from(root.querySelectorAll('[data-section]'))
    .findIndex((el) => el.getAttribute('data-section') === 'signature-hero');
  const bridgeIdx = Array.from(root.querySelectorAll('[data-section]'))
    .findIndex((el) => el.getAttribute('data-section') === 'meaning-bridge');

  assert.ok(heroIdx > -1,   'signature-hero section missing');
  assert.ok(bridgeIdx > -1, 'meaning-bridge section missing');
  assert.ok(heroIdx < bridgeIdx, 'meaning-bridge must appear after signature-hero');
});

test('OV-I2: signature-hero is the first data-section in the page', () => {
  const root = mountPage(FIXTURE);
  const sections = Array.from(root.querySelectorAll('[data-section]'))
    .map((el) => el.getAttribute('data-section'));
  assert.ok(sections.length > 0, 'no sections rendered');
  assert.equal(
    sections[0],
    'signature-hero',
    `signature-hero must be first data-section; got: ${sections[0]}`,
  );
});
