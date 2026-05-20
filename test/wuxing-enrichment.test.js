// Unit tests for public/src/domain/wuxingEnrichment.js
// Pattern mirrors test/bazi-pillar-enrichment.test.js — 3-persona coverage
// + edge cases for extreme distributions (Persona3 has Feuer=0, Erde=0).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  classifyElementRole,
  enrichWuxingDistribution,
  enrichWuxing,
} from '../public/src/domain/wuxingEnrichment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'));
}
const lina     = loadFixture('profile.real.json');
const persona2 = loadFixture('profile.persona2.json');
const persona3 = loadFixture('profile.persona3.json');

// ── classifyElementRole ────────────────────────────────────────────────────

test('classifyElementRole: dominant when intensity is the max of the set', () => {
  const dist = { Holz: 0.34, Feuer: 0.22, Erde: 0.11, Metall: 0.18, Wasser: 0.15 };
  assert.equal(classifyElementRole('Holz', dist), 'dominant');
});

test('classifyElementRole: unterrepräsentiert when intensity < 0.12 and not the max', () => {
  const dist = { Holz: 0.34, Feuer: 0.22, Erde: 0.11, Metall: 0.18, Wasser: 0.15 };
  assert.equal(classifyElementRole('Erde', dist), 'unterrepräsentiert');
});

test('classifyElementRole: middle elements get element-specific roles', () => {
  const dist = { Holz: 0.34, Feuer: 0.22, Erde: 0.20, Metall: 0.18, Wasser: 0.15 };
  // Metall is "strukturierend", Feuer "erlebbar", Wasser "flüssig", Erde "haltend"
  assert.equal(classifyElementRole('Metall', dist), 'strukturierend');
  assert.equal(classifyElementRole('Feuer',  dist), 'erlebbar');
  assert.equal(classifyElementRole('Wasser', dist), 'flüssig');
  assert.equal(classifyElementRole('Erde',   dist), 'haltend');
});

test('classifyElementRole: handles multi-zero distribution (Persona3) without throwing', () => {
  const dist = { Holz: 0.24, Feuer: 0, Erde: 0, Metall: 0.16, Wasser: 0.60 };
  assert.equal(classifyElementRole('Wasser', dist), 'dominant');
  assert.equal(classifyElementRole('Feuer',  dist), 'unterrepräsentiert');
  assert.equal(classifyElementRole('Erde',   dist), 'unterrepräsentiert');
});

// ── enrichWuxingDistribution ───────────────────────────────────────────────

test('enrichWuxingDistribution: Lina yields 5 entries with required fields', () => {
  const out = enrichWuxingDistribution(lina);
  assert.equal(out.length, 5);
  for (const e of out) {
    assert.ok(e.key,       `missing key`);
    assert.ok(e.label,     `missing label`);
    assert.ok(e.glyph,     `missing glyph for ${e.label}`);
    assert.ok(typeof e.intensity === 'number', `${e.label}: intensity not number`);
    assert.ok(e.role,      `missing role for ${e.label}`);
    assert.ok(e.desc,      `missing desc for ${e.label}`);
    assert.ok(e.token,     `missing CSS token for ${e.label}`);
  }
});

test('enrichWuxingDistribution: order is fixed (Holz/Feuer/Erde/Metall/Wasser)', () => {
  const out = enrichWuxingDistribution(lina);
  assert.deepEqual(out.map((e) => e.label), ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser']);
});

test('enrichWuxingDistribution: Lina marks Holz dominant + Metall deficient (from remediation)', () => {
  const out = enrichWuxingDistribution(lina);
  const holz   = out.find((e) => e.label === 'Holz');
  const metall = out.find((e) => e.label === 'Metall');
  assert.equal(holz.role, 'dominant', `Holz should be dominant, got ${holz.role}`);
  assert.equal(metall.role, 'unterrepräsentiert', `Metall should be deficient per fusion.remediation, got ${metall.role}`);
});

test('enrichWuxingDistribution: missing fusion section returns []', () => {
  assert.deepEqual(enrichWuxingDistribution(null), []);
  assert.deepEqual(enrichWuxingDistribution({}), []);
  assert.deepEqual(enrichWuxingDistribution({ fusion: null }), []);
});

test('enrichWuxingDistribution: intensities are rounded to integer percentages', () => {
  const out = enrichWuxingDistribution(lina);
  for (const e of out) {
    assert.equal(e.intensity, Math.round(e.intensity), `${e.label}: intensity ${e.intensity} not integer`);
    assert.ok(e.intensity >= 0 && e.intensity <= 100, `${e.label}: intensity ${e.intensity} out of range`);
  }
});

// ── enrichWuxing (composite) ───────────────────────────────────────────────

test('enrichWuxing: Lina produces {distribution, dominant, deficient, plan, properties, todayLever}', () => {
  const out = enrichWuxing(lina);
  assert.ok(Array.isArray(out.distribution));
  assert.equal(out.distribution.length, 5);
  assert.ok(out.dominant);   // Holz per Lina
  assert.ok(out.deficient);  // Metall per Lina
  assert.equal(out.dominant.label, 'Holz');
  assert.equal(out.deficient.label, 'Metall');
  // 3-step plan derives from WUXING_MEANINGS[dominant].balance
  assert.ok(out.plan);
  assert.ok(out.plan.heute);
  assert.ok(out.plan.woche);
  assert.ok(out.plan.monat);
  // properties is { Holz, Feuer, Erde, Metall, Wasser } each with wesen/staerke/uebermass/mangel/ausgleich
  assert.ok(out.properties);
  for (const el of ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser']) {
    const p = out.properties[el];
    assert.ok(p, `missing properties for ${el}`);
    assert.ok(p.wesen);
    assert.ok(p.staerke);
    assert.ok(p.uebermass);
    assert.ok(p.mangel);
    assert.ok(p.ausgleich);
  }
  // todayLever is a short string derived from dominant.balance.today
  assert.ok(out.todayLever);
  assert.ok(out.todayLever.length > 8);
});

test('enrichWuxing: all 3 personas produce design-shape VM, passes noFakeDataGuard', async () => {
  const { noFakeDataGuard } = await import('../public/src/api/client.js');
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const out = enrichWuxing(profile);
    assert.equal(out.distribution.length, 5, `${name}: distribution count`);
    assert.ok(out.dominant,   `${name}: missing dominant`);
    // Persona3 remediation.distribution: Holz 30, Feuer 20, Erde 8.5, Metall 13, Wasser 28.
    // Erde < 12% threshold → unterrepräsentiert. Feuer 20% → NOT deficient.
    // (raw wu_xing_vectors.bazi_pillars has Feuer=0/Erde=0, but server-side
    // remediation.distribution mixes in western contributions and normalizes.)
    if (name === 'Persona3') {
      const erde = out.distribution.find((e) => e.label === 'Erde');
      assert.equal(erde.role, 'unterrepräsentiert', 'Persona3 Erde 8.5% must be deficient');
    }
    assert.doesNotThrow(() => noFakeDataGuard(out, `wuxing-enrichment:${name}`));
  }
});

test('enrichWuxing: missing profile returns null', () => {
  assert.equal(enrichWuxing(null), null);
  assert.equal(enrichWuxing(undefined), null);
});
