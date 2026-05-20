// DOM-smoke + behavior tests for WesternPage (second Sprint E page).
// Capture-DOM-stub usage mirrors test/bazi-page.test.js.

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

const { WesternPage } = await import('../public/src/pages/WesternPage.js');
const { noFakeDataGuard } = await import('../public/src/api/client.js');

function freshApp() { cap.reset(); return global.document.createElement('main'); }
function aggregate() { return cap.aggregate(); }

// ── Lina ──────────────────────────────────────────────────────────────────

test('WesternPage: Lina profile renders Sun in Fische + Moon in Jungfrau + Asc Widder', () => {
  const app = freshApp();
  assert.doesNotThrow(() => WesternPage(app, { profile: lina, onNavigate: () => {} }));
  const agg = aggregate();
  // Sun: Pisces → Fische, Moon: Virgo → Jungfrau, Asc: Aries → Widder
  assert.match(agg, /Fische/);
  assert.match(agg, /Jungfrau/);
  assert.match(agg, /Widder/);
  // Page-Head copy
  assert.match(agg, /Faktoren, Zeichen, Häuser/);
});

test('WesternPage: Lina activations include top-3 luminary-involving aspects', () => {
  const app = freshApp();
  WesternPage(app, { profile: lina, onNavigate: () => {} });
  const agg = aggregate();
  // Top-3 must include the Mond-trine-Neptun (tightest luminary aspect, orb 0.42)
  assert.match(agg, /Mond Trigon Neptun/);
  // Orb label format
  assert.match(agg, /Orbis 0\.42°/);
});

test('WesternPage: degree formatting present (Sun degree-in-sign 23°09\')', () => {
  const app = freshApp();
  WesternPage(app, { profile: lina, onNavigate: () => {} });
  const agg = aggregate();
  // Lina Sun: degree_in_sign 23.152 → "23°09'"
  assert.match(agg, /23°09'/);
});

// ── Persona2 (Leo Sun + Leo Asc) ─────────────────────────────────────────

test('WesternPage: Persona2 renders Sun in Löwe + Asc in Löwe', () => {
  const app = freshApp();
  WesternPage(app, { profile: persona2, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Löwe/);
});

// ── Persona3 (Scorpio Sun + Leo Asc) ─────────────────────────────────────

test('WesternPage: Persona3 renders Sun in Skorpion + Moon in Schütze', () => {
  const app = freshApp();
  WesternPage(app, { profile: persona3, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Skorpion/);
  assert.match(agg, /Schütze/);
});

// ── noFakeDataGuard sweep ────────────────────────────────────────────────

test('WesternPage: rendered aggregate passes noFakeDataGuard for all 3 personas', () => {
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const app = freshApp();
    WesternPage(app, { profile, onNavigate: () => {} });
    const agg = aggregate();
    assert.doesNotThrow(
      () => noFakeDataGuard(agg, `western-page:${name}`),
      `noFakeDataGuard tripped for ${name}`,
    );
  }
});

// ── Missing western section ──────────────────────────────────────────────

test('WesternPage: missing western section shows Aktivierungen fallback', () => {
  const app = freshApp();
  WesternPage(app, { profile: { western: null, bazi: null, fusion: null }, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Keine Aspekte im API-Profil/);
});
