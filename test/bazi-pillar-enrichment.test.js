// Unit tests for public/src/domain/baziPillarEnrichment.js
//
// Strategy mirrors test/western-body-enrichment.test.js: every assertion
// runs against the 3 captured personas (Lina, Persona2, Persona3) to catch
// persona-specific assumptions, plus explicit edge cases.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  enrichPillar,
  enrichBaziPillars,
} from '../public/src/domain/baziPillarEnrichment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'));
}

const lina     = loadFixture('profile.real.json');
const persona2 = loadFixture('profile.persona2.json');
const persona3 = loadFixture('profile.persona3.json');

// ── enrichPillar — basic shape ──────────────────────────────────────────────

test('enrichPillar: Lina year pillar (Ding/Mao) yields full enriched VM', () => {
  const raw = lina.bazi.pillars.year;
  const out = enrichPillar(raw, 'year');

  assert.equal(out.role, 'year');
  assert.equal(out.roleLabel, 'Jahressäule');
  assert.ok(out.roleDescription); // PILLAR_ROLES.year.role

  assert.equal(out.stem, 'Ding');
  assert.equal(out.stemChar, '丁');
  assert.equal(out.stemElement, 'Feuer');
  assert.equal(out.polarity, 'Yin');

  assert.equal(out.branch, 'Mao');
  assert.equal(out.branchChar, '卯');
  assert.equal(out.branchElement, 'Holz');
  assert.equal(out.animal, 'Hase');

  // Hidden stems derived from shared module (API returns [] for profile shape)
  assert.ok(Array.isArray(out.hiddenStems));
  assert.ok(out.hiddenStems.length > 0, 'hidden stems must be populated for Mao');
  assert.equal(out.hiddenStems[0].stem, '乙'); // Yi — Yin-Holz, Hauptstamm des Hasen

  // Narrative slots populated from STEM_MEANINGS.Ding
  assert.ok(out.ressource);
  assert.ok(out.schatten);
  assert.ok(out.handlung);
});

test('enrichPillar: Persona2 day pillar (Yi/You) — Yin Holz DM coverage', () => {
  const raw = persona2.bazi.pillars.day;
  const out = enrichPillar(raw, 'day');

  assert.equal(out.stem, 'Yi');
  assert.equal(out.stemChar, '乙');
  assert.equal(out.stemElement, 'Holz');
  assert.equal(out.polarity, 'Yin');

  assert.equal(out.branch, 'You');
  assert.equal(out.branchChar, '酉');
  assert.equal(out.animal, 'Hahn');
  assert.equal(out.branchElement, 'Metall');

  // You (酉) is 100% Xin Metall — single hidden stem
  assert.equal(out.hiddenStems.length, 1);
  assert.equal(out.hiddenStems[0].stem, '辛');
  assert.equal(out.hiddenStems[0].element, 'Metall');
});

test('enrichPillar: Persona3 day pillar (Gui/Mao) — Yin Wasser DM coverage', () => {
  const raw = persona3.bazi.pillars.day;
  const out = enrichPillar(raw, 'day');

  assert.equal(out.stem, 'Gui');
  assert.equal(out.stemElement, 'Wasser');
  assert.equal(out.polarity, 'Yin');
  assert.equal(out.branch, 'Mao');
  assert.equal(out.branchElement, 'Holz');
});

// ── enrichPillar — defensive paths ──────────────────────────────────────────

test('enrichPillar: null/undefined input returns null', () => {
  assert.equal(enrichPillar(null, 'year'), null);
  assert.equal(enrichPillar(undefined, 'year'), null);
});

test('enrichPillar: unknown stem yields null narrative without crashing', () => {
  const out = enrichPillar({ stem: 'NotAStem', branch: 'Mao' }, 'year');
  assert.equal(out.stem, 'NotAStem');
  assert.equal(out.stemChar, null);
  assert.equal(out.stemElement, null);
  assert.equal(out.polarity, null);
  assert.equal(out.ressource, null);
  // Branch still resolves
  assert.equal(out.branchChar, '卯');
  assert.equal(out.animal, 'Hase');
});

test('enrichPillar: unknown branch yields null animal without crashing', () => {
  const out = enrichPillar({ stem: 'Ren', branch: 'NotABranch' }, 'day');
  assert.equal(out.branch, 'NotABranch');
  assert.equal(out.branchChar, null);
  assert.equal(out.animal, null);
  assert.equal(out.branchElement, null);
  assert.deepEqual(out.hiddenStems, []);
  // Stem still resolves
  assert.equal(out.stemElement, 'Wasser');
});

test('enrichPillar: accepts standalone /calculate/bazi shape (stamm/zweig German keys)', () => {
  // /api/fufire/calculate/bazi returns `stamm: "Ding", zweig: "Mao", tier: "Hase"`
  // (verified in test/_fixtures/upstream-snapshots/bazi.real.json). enrichment
  // must accept both field-name shapes — orchestrator returns stem/branch,
  // standalone returns stamm/zweig.
  const out = enrichPillar({ stamm: 'Ding', zweig: 'Mao', element: 'Feuer' }, 'year');
  assert.equal(out.stem, 'Ding');
  assert.equal(out.branch, 'Mao');
  assert.equal(out.stemElement, 'Feuer');
  assert.equal(out.animal, 'Hase');
});

test('enrichPillar: API-supplied hidden_stems (non-empty) take precedence over derivation', () => {
  const supplied = [{ stem: '癸', element: 'Wasser', weight: 10, polarity: 'Yin', source: 'upstream' }];
  const out = enrichPillar({ stem: 'Ding', branch: 'Mao', hidden_stems: supplied }, 'year');
  assert.deepEqual(out.hiddenStems, supplied, 'must keep API-supplied hidden_stems unchanged');
});

test('enrichPillar: missing role → roleLabel + roleDescription are null', () => {
  const out = enrichPillar({ stem: 'Ding', branch: 'Mao' }); // no role arg
  assert.equal(out.role, undefined);
  assert.equal(out.roleLabel, null);
  assert.equal(out.roleDescription, null);
});

// ── enrichBaziPillars — composite ───────────────────────────────────────────

test('enrichBaziPillars: Lina bazi yields {year, month, day, hour, dayMaster}', () => {
  const out = enrichBaziPillars(lina.bazi);
  for (const key of ['year', 'month', 'day', 'hour', 'dayMaster']) {
    assert.ok(out[key], `missing ${key}`);
    assert.ok(out[key].stem, `${key} missing stem`);
    assert.ok(out[key].branch, `${key} missing branch`);
  }
  // dayMaster echoes the day pillar's stem (FuFire returns full pillar shape under day_master)
  assert.equal(out.dayMaster.stem, out.day.stem);
});

test('enrichBaziPillars: all three personas produce only API-derived facts (no demo strings)', async () => {
  const { noFakeDataGuard } = await import('../public/src/api/client.js');
  for (const [name, profile] of [['Lina', lina], ['Persona2', persona2], ['Persona3', persona3]]) {
    const out = enrichBaziPillars(profile.bazi);
    assert.doesNotThrow(
      () => noFakeDataGuard(out, `bazi-pillar-enrichment:${name}`),
      `noFakeDataGuard tripped for ${name}`,
    );
    // Each pillar must have populated narrative slots when stem is known.
    for (const k of ['year', 'month', 'day', 'hour']) {
      assert.ok(out[k].ressource, `${name}/${k} missing ressource`);
      assert.ok(out[k].schatten, `${name}/${k} missing schatten`);
      assert.ok(out[k].handlung, `${name}/${k} missing handlung`);
    }
  }
});

test('enrichBaziPillars: null/empty input returns null', () => {
  assert.equal(enrichBaziPillars(null), null);
  assert.equal(enrichBaziPillars(undefined), null);
});

test('enrichBaziPillars: missing day_master falls back to day pillar (defensive)', () => {
  // Some legacy responses might omit day_master while keeping pillars.day populated.
  const out = enrichBaziPillars({ pillars: lina.bazi.pillars });
  assert.ok(out.dayMaster, 'dayMaster must fall back to day pillar');
  assert.equal(out.dayMaster.stem, lina.bazi.pillars.day.stem);
});

test('enrichBaziPillars: hidden_stems populated across all four pillars', () => {
  const out = enrichBaziPillars(lina.bazi);
  for (const k of ['year', 'month', 'day', 'hour']) {
    assert.ok(out[k].hiddenStems.length > 0, `${k} should have hidden_stems`);
  }
});
