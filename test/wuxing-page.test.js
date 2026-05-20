// DOM-smoke + behavior tests for WuxingPage (third Sprint E page).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();

function loadFixture(name) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return JSON.parse(readFileSync(join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'));
}
const lina     = loadFixture('profile.real.json');
const persona2 = loadFixture('profile.persona2.json');
const persona3 = loadFixture('profile.persona3.json');

const { WuxingPage } = await import('../public/src/pages/WuxingPage.js');
const { noFakeDataGuard } = await import('../public/src/api/client.js');

function freshApp() { cap.reset(); return global.document.createElement('main'); }
function aggregate() { return cap.aggregate(); }

// ── Lina (dominant Holz, deficient Metall) ────────────────────────────────

test('WuxingPage: Lina headline shows Holz dominant + Metall deficient', () => {
  const app = freshApp();
  assert.doesNotThrow(() => WuxingPage(app, { profile: lina, onNavigate: () => {} }));
  const agg = aggregate();
  assert.match(agg, /Holz dominant/);
  assert.match(agg, /Metall unterrepräsentiert/);
  // Page-Head copy
  assert.match(agg, /Was zirkuliert, was staut/);
});

test('WuxingPage: Lina renders all five element labels with percentages', () => {
  const app = freshApp();
  WuxingPage(app, { profile: lina, onNavigate: () => {} });
  const agg = aggregate();
  for (const el of ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser']) {
    assert.match(agg, new RegExp(el), `missing ${el}`);
  }
  // Percentage display format used in label header (e.g. "Metall · 7%")
  assert.match(agg, /·\s*\d+%/);
});

test('WuxingPage: Lina shows "Heutiger Hebel" line derived from dominant.balance.today', () => {
  const app = freshApp();
  WuxingPage(app, { profile: lina, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Heutiger Hebel/);
});

test('WuxingPage: Lina renders 3-step plan tiles (Heute / Diese Woche / 30 Tage)', () => {
  const app = freshApp();
  WuxingPage(app, { profile: lina, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Heute/);
  assert.match(agg, /Diese Woche/);
  assert.match(agg, /30 Tage/);
});

// ── Persona2 (Holz dominant, Erde deficient) ──────────────────────────────

test('WuxingPage: Persona2 headline still shows Holz dominant', () => {
  const app = freshApp();
  WuxingPage(app, { profile: persona2, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Holz dominant/);
});

// ── Persona3 (Holz dominant per remediation, Erde deficient at 8.5%) ──────

test('WuxingPage: Persona3 surfaces Erde as deficient', () => {
  const app = freshApp();
  WuxingPage(app, { profile: persona3, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Erde unterrepräsentiert/);
});

// ── noFakeDataGuard sweep ────────────────────────────────────────────────

test('WuxingPage: rendered aggregate passes noFakeDataGuard for all 3 personas', () => {
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const app = freshApp();
    WuxingPage(app, { profile, onNavigate: () => {} });
    const agg = aggregate();
    assert.doesNotThrow(
      () => noFakeDataGuard(agg, `wuxing-page:${name}`),
      `noFakeDataGuard tripped for ${name}`,
    );
  }
});

// ── Missing fusion section ────────────────────────────────────────────────

test('WuxingPage: missing fusion section shows UnavailableCard fallback', () => {
  const app = freshApp();
  WuxingPage(app, { profile: { fusion: null, bazi: null, western: null }, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Fusion-Berechnung nicht verfügbar/);
});
