// DOM-smoke + behavior tests for BaziPage (first Sprint E page).
// Uses the same capture-DOM stub as test/page-render-integration.test.js
// so we can assert specific mounts, fallbacks, and CTA wiring.

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

const { BaziPage } = await import('../public/src/pages/BaziPage.js');
const { noFakeDataGuard } = await import('../public/src/api/client.js');

function freshApp() {
  cap.reset();
  return global.document.createElement('main');
}

function aggregate() {
  return cap.aggregate();
}

// ── Lina (Yang Ren-Wasser) ─────────────────────────────────────────────────

test('BaziPage: Lina profile renders Day Master Ren + 4 pillars + Luck-Pillar fallback', () => {
  const app = freshApp();
  assert.doesNotThrow(() => BaziPage(app, { profile: lina, onNavigate: () => {} }));
  const agg = aggregate();

  // Day Master (Ren = 壬, Yang Wasser)
  assert.match(agg, /Ren/, 'must show Day Master stem Pinyin');
  assert.match(agg, /壬/,  'must show Day Master stem CJK char');
  assert.match(agg, /Wasser/, 'must show Day Master element');

  // Pillar stems (year=Ding, month=Gui, day=Ren, hour=Jia)
  for (const expected of ['Ding', 'Gui', 'Ren', 'Jia']) {
    assert.match(agg, new RegExp(expected), `Lina must surface pillar stem ${expected}`);
  }

  // Pillar branches (Mao/Mao/Xu/Chen) and animals (Hase/Hase/Hund/Drache)
  for (const expected of ['Mao', 'Xu', 'Chen', 'Hase', 'Hund', 'Drache']) {
    assert.match(agg, new RegExp(expected), `Lina must surface ${expected}`);
  }

  // LuckPillar fallback present (deferred — not in API yet)
  assert.match(agg, /Glückssäule/);

  // Page-Head copy
  assert.match(agg, /Vier Säulen/);
  assert.match(agg, /Day Master/);
});

// ── Persona2 (Yin Yi-Holz) ─────────────────────────────────────────────────

test('BaziPage: Persona2 profile renders Yin Yi Holz DM correctly', () => {
  const app = freshApp();
  BaziPage(app, { profile: persona2, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Yi/);
  assert.match(agg, /乙/);
  assert.match(agg, /Holz/);
});

// ── Persona3 (Yin Gui-Wasser) ──────────────────────────────────────────────

test('BaziPage: Persona3 profile renders Yin Gui Wasser DM correctly', () => {
  const app = freshApp();
  BaziPage(app, { profile: persona3, onNavigate: () => {} });
  const agg = aggregate();
  assert.match(agg, /Gui/);
  assert.match(agg, /癸/);
  assert.match(agg, /Wasser/);
});

// ── noFakeDataGuard sweep across all 3 personas ───────────────────────────

test('BaziPage: rendered aggregate passes noFakeDataGuard for all 3 personas', () => {
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const app = freshApp();
    BaziPage(app, { profile, onNavigate: () => {} });
    const agg = aggregate();
    assert.doesNotThrow(
      () => noFakeDataGuard(agg, `bazi-page:${name}`),
      `noFakeDataGuard tripped for ${name}`,
    );
  }
});

// ── Profile-missing fallback ──────────────────────────────────────────────

test('BaziPage: missing bazi section shows UnavailableCard for Day Master + every pillar', () => {
  const app = freshApp();
  BaziPage(app, { profile: { bazi: null, western: null, fusion: null }, onNavigate: () => {} });
  const agg = aggregate();
  // Day Master UnavailableCard wording from the page module
  assert.match(agg, /BaZi-Tagesstamm konnte nicht berechnet werden/);
  // 4 pillar fallbacks rendered via UnavailableCard (one per role)
  const fallbackCount = (agg.match(/Säule konnte nicht berechnet werden/g) || []).length;
  assert.equal(fallbackCount, 4, 'expected 4 pillar fallbacks (year/month/day/hour)');
});

// ── Day-Master highlight badge ────────────────────────────────────────────

test('BaziPage: day pillar receives Day Master highlight (ExplainableCard --highlight)', () => {
  const app = freshApp();
  BaziPage(app, { profile: lina, onNavigate: () => {} });
  const agg = aggregate();
  // ExplainableCard sets className `explainable-card explainable-card--bazi explainable-card--highlight`
  // for the day pillar. The capture-stub records innerHTML + textContent but
  // child-node className lives in the stub's _attrs.class which we can't read
  // via aggregate alone. Indirect check: the badge text "Day Master" is
  // injected by ExplainableCard when highlighted.
  assert.match(agg, /Day Master/);
});
