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

import { createSynastryProjection } from '../public/src/domain/projections.js';

// ── Synastry fixtures ──────────────────────────────────────────────────────────

const SYN_PROFILE_A = {
  western: {
    bodies: {
      Sun:   { sign: 'Aries',   longitude: 15.5  },
      Moon:  { sign: 'Cancer',  longitude: 95.2  },
      Venus: { sign: 'Taurus',  longitude: 42.1  },
      Mars:  { sign: 'Scorpio', longitude: 225.0 },
    },
    houses: [],
    ascendant: 'Aries',
  },
  bazi: {
    day_master: { stem: '甲', element: 'Holz' },
    pillars: { day: { stem: '甲', branch: '子', element: 'Holz' } },
  },
  fusion: {
    wu_xing_vectors: { fusion: { Holz: 0.4, Feuer: 0.2, Erde: 0.15, Metall: 0.1, Wasser: 0.15 } },
    coherence_index: 0.8,
  },
};

const SYN_PROFILE_B_FEUER = {
  western: {
    bodies: {
      Sun:   { sign: 'Leo',       longitude: 135.0 },
      Moon:  { sign: 'Capricorn', longitude: 275.8 },
      Venus: { sign: 'Gemini',    longitude: 75.3  },
      Mars:  { sign: 'Aries',     longitude: 10.0  },
    },
    houses: [],
    ascendant: 'Leo',
  },
  bazi: {
    day_master: { stem: '丙', element: 'Feuer' },
    pillars: { day: { stem: '丙', branch: '午', element: 'Feuer' } },
  },
  fusion: {
    wu_xing_vectors: { fusion: { Holz: 0.2, Feuer: 0.4, Erde: 0.15, Metall: 0.1, Wasser: 0.15 } },
    coherence_index: 0.75,
  },
};

const SYN_PROFILE_B_ERDE = {
  western: { bodies: {}, houses: [] },
  bazi: { day_master: { stem: '戊', element: 'Erde' }, pillars: {} },
  fusion: {},
};

// ── Shape contract ────────────────────────────────────────────────────────────

test('createSynastryProjection — returns expected shape with two profiles', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  assert.equal(typeof result, 'object');
  assert.ok(result !== null);
  assert.ok('wuxing'  in result);
  assert.ok('bazi'    in result);
  assert.ok('aspects' in result);
  assert.ok('missing' in result);
  assert.ok('confidence' in result);
  assert.ok(Array.isArray(result.aspects));
  assert.ok(Array.isArray(result.missing));
  assert.equal(typeof result.confidence, 'number');
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});

test('createSynastryProjection — does not throw when profileB is null', () => {
  assert.doesNotThrow(() => createSynastryProjection(SYN_PROFILE_A, null));
});

test('createSynastryProjection — does not throw when profileB is undefined', () => {
  assert.doesNotThrow(() => createSynastryProjection(SYN_PROFILE_A, undefined));
});

test('createSynastryProjection — confidence is 0 when profileB is null', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, null);
  assert.equal(result.confidence, 0);
});

test('createSynastryProjection — wuxing is null when profileB is null', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, null);
  assert.equal(result.wuxing, null);
});

test('createSynastryProjection — bazi is null when profileB is null', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, null);
  assert.equal(result.bazi, null);
});

test('createSynastryProjection — aspects is empty array when profileB is null', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, null);
  assert.deepEqual(result.aspects, []);
});

// ── Wu-Xing compatibility ─────────────────────────────────────────────────────

test('createSynastryProjection — wuxing has elementA and elementB', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  assert.equal(result.wuxing.elementA, 'Holz');
  assert.equal(result.wuxing.elementB, 'Feuer');
});

test('createSynastryProjection — Holz+Feuer relation is nährt', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  assert.equal(result.wuxing.relation, 'nährt');
});

test('createSynastryProjection — Holz+Erde relation is kontrolliert', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_ERDE);
  assert.equal(result.wuxing.relation, 'kontrolliert');
});

test('createSynastryProjection — same element relation is identisch', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_A);
  assert.equal(result.wuxing.relation, 'identisch');
});

test('createSynastryProjection — Feuer+Holz relation is wird-genährt (B nährt A)', () => {
  const result = createSynastryProjection(SYN_PROFILE_B_FEUER, SYN_PROFILE_A);
  assert.equal(result.wuxing.relation, 'wird-genährt');
});

test('createSynastryProjection — wuxing has cycle and description strings', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  assert.equal(typeof result.wuxing.cycle, 'string');
  assert.ok(result.wuxing.cycle.length > 0);
  assert.equal(typeof result.wuxing.description, 'string');
  assert.ok(result.wuxing.description.length > 0);
});

// ── BaZi Day Master ───────────────────────────────────────────────────────────

test('createSynastryProjection — bazi has elementA and elementB', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  assert.equal(result.bazi.elementA, 'Holz');
  assert.equal(result.bazi.elementB, 'Feuer');
});

test('createSynastryProjection — bazi has description string', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  assert.equal(typeof result.bazi.description, 'string');
  assert.ok(result.bazi.description.length > 0);
});

// ── Western aspects ───────────────────────────────────────────────────────────

test('createSynastryProjection — detects trine between A.Sun and B.Sun (119.5°)', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  const sunTrine = result.aspects.find(
    (a) => a.bodyA === 'Sun' && a.bodyB === 'Sun' && a.aspect === 'Trigon'
  );
  assert.ok(sunTrine, `Expected Sun-Sun trine. Got: ${JSON.stringify(result.aspects.map(a => ({bodyA:a.bodyA,bodyB:a.bodyB,aspect:a.aspect})))}`);
});

test('createSynastryProjection — detects conjunction when same profile used for A and B', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_A);
  const sunConj = result.aspects.find(
    (a) => a.bodyA === 'Sun' && a.bodyB === 'Sun' && a.aspect === 'Konjunktion'
  );
  assert.ok(sunConj, 'Expected Sun-Sun conjunction when A === B');
});

test('createSynastryProjection — each aspect has bodyA, bodyB, aspect, orbDeg, description', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  for (const asp of result.aspects) {
    assert.equal(typeof asp.bodyA,       'string');
    assert.equal(typeof asp.bodyB,       'string');
    assert.equal(typeof asp.aspect,      'string');
    assert.equal(typeof asp.orbDeg,      'number');
    assert.equal(typeof asp.description, 'string');
  }
});

// ── Confidence ────────────────────────────────────────────────────────────────

test('createSynastryProjection — confidence > 0 when both profiles have day_master', () => {
  const result = createSynastryProjection(SYN_PROFILE_A, SYN_PROFILE_B_FEUER);
  assert.ok(result.confidence > 0);
});

test('createSynastryProjection — single missing entry when day_master absent in one profile', () => {
  const noEl = structuredClone(SYN_PROFILE_A);
  delete noEl.bazi.day_master;
  const result = createSynastryProjection(noEl, SYN_PROFILE_B_FEUER);
  const dayMasterMissing = result.missing.filter(m => m.toLowerCase().includes('day master') || m.toLowerCase().includes('bazi'));
  assert.equal(dayMasterMissing.length, 1, `Expected exactly 1 missing entry for absent Day Master, got ${dayMasterMissing.length}: ${JSON.stringify(result.missing)}`);
});
