import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoveProjection,
  createCareerProjection,
  createFinanceProjection,
  createPersonalityProjection,
} from '../public/src/domain/projections.js';

// Minimal profile with all key factors present
const FULL_PROFILE = {
  western: {
    bodies: {
      Sun:     { sign: 'Aries',       house: 1 },
      Moon:    { sign: 'Cancer',      house: 4 },
      Venus:   { sign: 'Taurus',      house: 2 },
      Mars:    { sign: 'Scorpio',     house: 8 },
      Jupiter: { sign: 'Sagittarius', house: 9 },
      Saturn:  { sign: 'Capricorn',   house: 10 },
    },
    houses: [
      { sign: 'Aries'       }, // 1
      { sign: 'Taurus'      }, // 2
      { sign: 'Gemini'      }, // 3
      { sign: 'Cancer'      }, // 4
      { sign: 'Leo'         }, // 5
      { sign: 'Virgo'       }, // 6
      { sign: 'Libra'       }, // 7
      { sign: 'Scorpio'     }, // 8
      { sign: 'Sagittarius' }, // 9
      { sign: 'Capricorn'   }, // 10
      { sign: 'Aquarius'    }, // 11
      { sign: 'Pisces'      }, // 12
    ],
    ascendant: 'Aries',
  },
  bazi: {
    day_master: { stem: '甲', element: 'Holz' },
    pillars: {
      year:  { stem: '甲', branch: '子', element: 'Holz' },
      month: { stem: '丙', branch: '午', element: 'Feuer' },
      day:   { stem: '戊', branch: '申', element: 'Erde' },
      hour:  { stem: '壬', branch: '寅', element: 'Wasser' },
    },
  },
  fusion: {
    wu_xing_vectors: {
      western_planets: { Holz: 0.3, Feuer: 0.25, Erde: 0.2, Metall: 0.15, Wasser: 0.1 },
      bazi_pillars:    { Holz: 0.2, Feuer: 0.3,  Erde: 0.2, Metall: 0.1,  Wasser: 0.2 },
      fusion:          { Holz: 0.25, Feuer: 0.28, Erde: 0.2, Metall: 0.12, Wasser: 0.15 },
    },
    coherence_index: 0.82,
    fusion_interpretation: 'Strong resonance.',
  },
};

// ── Shape contract ───────────────────────────────────────────────────────────

test('createLoveProjection — returns DomainProjection shape', () => {
  const proj = createLoveProjection(FULL_PROFILE);
  assert.ok(Array.isArray(proj.primaryFactors));
  assert.ok(Array.isArray(proj.supportingFactors));
  assert.ok(Array.isArray(proj.missingFactors));
  assert.ok(Array.isArray(proj.sourceTrace));
  assert.equal(typeof proj.confidence, 'number');
  assert.ok(proj.confidence >= 0 && proj.confidence <= 1);
});

test('createCareerProjection — returns DomainProjection shape', () => {
  const proj = createCareerProjection(FULL_PROFILE);
  assert.ok(Array.isArray(proj.primaryFactors));
  assert.ok(Array.isArray(proj.supportingFactors));
  assert.ok(Array.isArray(proj.missingFactors));
  assert.ok(Array.isArray(proj.sourceTrace));
  assert.equal(typeof proj.confidence, 'number');
});

test('createFinanceProjection — returns DomainProjection shape', () => {
  const proj = createFinanceProjection(FULL_PROFILE);
  assert.ok(Array.isArray(proj.primaryFactors));
  assert.ok(Array.isArray(proj.supportingFactors));
  assert.ok(Array.isArray(proj.missingFactors));
  assert.ok(Array.isArray(proj.sourceTrace));
  assert.equal(typeof proj.confidence, 'number');
});

test('createPersonalityProjection — returns DomainProjection shape', () => {
  const proj = createPersonalityProjection(FULL_PROFILE);
  assert.ok(Array.isArray(proj.primaryFactors));
  assert.ok(Array.isArray(proj.supportingFactors));
  assert.ok(Array.isArray(proj.missingFactors));
  assert.ok(Array.isArray(proj.sourceTrace));
  assert.equal(typeof proj.confidence, 'number');
});

// ── Confidence drops when key factors are missing ─────────────────────────────

test('createLoveProjection — confidence < 1 when Venus missing', () => {
  const noVenus = structuredClone(FULL_PROFILE);
  delete noVenus.western.bodies.Venus;
  const proj = createLoveProjection(noVenus);
  assert.ok(proj.confidence < 1, `Expected confidence < 1, got ${proj.confidence}`);
});

test('createLoveProjection — confidence < 1 when Moon missing', () => {
  const noMoon = structuredClone(FULL_PROFILE);
  delete noMoon.western.bodies.Moon;
  const proj = createLoveProjection(noMoon);
  assert.ok(proj.confidence < 1, `Expected confidence < 1, got ${proj.confidence}`);
});

test('createCareerProjection — confidence < 1 when Sun missing', () => {
  const noSun = structuredClone(FULL_PROFILE);
  delete noSun.western.bodies.Sun;
  const proj = createCareerProjection(noSun);
  assert.ok(proj.confidence < 1, `Expected confidence < 1, got ${proj.confidence}`);
});

test('createCareerProjection — confidence < 1 when 10th house missing', () => {
  const noHouses = structuredClone(FULL_PROFILE);
  noHouses.western.houses = [];
  const proj = createCareerProjection(noHouses);
  assert.ok(proj.confidence < 1, `Expected confidence < 1, got ${proj.confidence}`);
});

test('createFinanceProjection — confidence < 1 when 2nd house missing', () => {
  const noHouses = structuredClone(FULL_PROFILE);
  noHouses.western.houses = [];
  const proj = createFinanceProjection(noHouses);
  assert.ok(proj.confidence < 1, `Expected confidence < 1, got ${proj.confidence}`);
});

// ── Full confidence when all data present ────────────────────────────────────

test('createLoveProjection — confidence is 1 when all key factors present', () => {
  const proj = createLoveProjection(FULL_PROFILE);
  assert.equal(proj.confidence, 1);
});

// ── sourceTrace documents what was accessed ───────────────────────────────────

test('createLoveProjection — sourceTrace mentions Venus when present', () => {
  const proj = createLoveProjection(FULL_PROFILE);
  const hasVenus = proj.sourceTrace.some((t) => t.includes('Venus'));
  assert.ok(hasVenus, `sourceTrace missing Venus entry: ${JSON.stringify(proj.sourceTrace)}`);
});

test('createLoveProjection — sourceTrace mentions Moon when present', () => {
  const proj = createLoveProjection(FULL_PROFILE);
  const hasMoon = proj.sourceTrace.some((t) => t.includes('Moon'));
  assert.ok(hasMoon, `sourceTrace missing Moon entry: ${JSON.stringify(proj.sourceTrace)}`);
});

test('createCareerProjection — sourceTrace mentions Saturn when present', () => {
  const proj = createCareerProjection(FULL_PROFILE);
  const hasSaturn = proj.sourceTrace.some((t) => t.includes('Saturn'));
  assert.ok(hasSaturn, `sourceTrace missing Saturn entry: ${JSON.stringify(proj.sourceTrace)}`);
});

// ── missingFactors is populated when factor is absent ─────────────────────────

test('createLoveProjection — missingFactors lists Venus when absent', () => {
  const noVenus = structuredClone(FULL_PROFILE);
  delete noVenus.western.bodies.Venus;
  const proj = createLoveProjection(noVenus);
  const hasVenusMissing = proj.missingFactors.some((m) => m.toLowerCase().includes('venus'));
  assert.ok(hasVenusMissing, `missingFactors does not mention Venus: ${JSON.stringify(proj.missingFactors)}`);
});

test('createCareerProjection — missingFactors lists 10. Haus when houses absent', () => {
  const noHouses = structuredClone(FULL_PROFILE);
  noHouses.western.houses = [];
  const proj = createCareerProjection(noHouses);
  assert.ok(proj.missingFactors.length > 0, 'Expected at least one missing factor');
});

// ── Personality notes contradiction on low coherence ─────────────────────────

test('createPersonalityProjection — includes contradiction note when coherence_index is low', () => {
  const lowCoh = structuredClone(FULL_PROFILE);
  lowCoh.fusion.coherence_index = 0.2;
  const proj = createPersonalityProjection(lowCoh);
  const allText = [...proj.primaryFactors, ...proj.supportingFactors]
    .map((f) => f.note || f.value || '').join(' ').toLowerCase();
  const hasContradiction = allText.includes('spannung') || allText.includes('kontrast')
    || allText.includes('unterschied') || allText.includes('widerspruch')
    || proj.missingFactors.some((m) => m.toLowerCase().includes('spannung'));
  assert.ok(hasContradiction, `Expected contradiction note in low coherence profile. allText: ${allText}`);
});

// ── Finance projection contains disclaimer ─────────────────────────────────

test('createFinanceProjection — primaryFactors have source annotations', () => {
  const proj = createFinanceProjection(FULL_PROFILE);
  const allFactors = [...proj.primaryFactors, ...proj.supportingFactors];
  const allHaveSources = allFactors.every((f) => typeof f.source === 'string');
  assert.ok(allHaveSources, 'All factors must have a source annotation');
});

// ── Graceful on null/empty profile ────────────────────────────────────────────

test('createLoveProjection — does not throw on empty profile', () => {
  assert.doesNotThrow(() => createLoveProjection({}));
  assert.doesNotThrow(() => createLoveProjection(null));
});

test('createCareerProjection — does not throw on empty profile', () => {
  assert.doesNotThrow(() => createCareerProjection({}));
});

test('createFinanceProjection — does not throw on empty profile', () => {
  assert.doesNotThrow(() => createFinanceProjection({}));
});

test('createPersonalityProjection — does not throw on empty profile', () => {
  assert.doesNotThrow(() => createPersonalityProjection({}));
});
