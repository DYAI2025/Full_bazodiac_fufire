// test/domain-score.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { computeDomainScores } from '../public/src/synastry/domain-score.js';

const profileA = {
  western: {
    bodies: {
      Venus: { sign: 'Stier', house: 2 },
      Moon:  { sign: 'Krebs', house: 4 },
      Mars:  { sign: 'Widder', house: 1 },
      Mercury: { sign: 'Zwillinge', house: 3 },
      Sun:   { sign: 'Löwe', house: 5 },
    },
    houses: [
      null,
      { cusp: 0,   sign: 'Widder' },
      { cusp: 30,  sign: 'Stier' },
      { cusp: 60,  sign: 'Zwillinge' },
      { cusp: 90,  sign: 'Krebs' },
      { cusp: 120, sign: 'Löwe' },
      { cusp: 150, sign: 'Jungfrau' },
      { cusp: 180, sign: 'Waage' },
      { cusp: 210, sign: 'Skorpion' },
      { cusp: 240, sign: 'Schütze' },
      { cusp: 270, sign: 'Steinbock' },
      { cusp: 300, sign: 'Wassermann' },
      { cusp: 330, sign: 'Fische' },
    ],
    aspects: []
  },
  bazi: {
    pillars: {
      year:  { element: 'Holz',  stem: '甲', branch: '子' },
      month: { element: 'Feuer', stem: '丙', branch: '寅' },
      day:   { element: 'Wasser',stem: '壬', branch: '午' },
      hour:  { element: 'Metall',stem: '庚', branch: '申' },
    },
    day_master: { element: 'Wasser', stem: '壬' },
  },
  fusion: {
    wu_xing_vectors: {
      bazi_pillars:    { Holz:0.30, Feuer:0.25, Erde:0.15, Metall:0.15, Wasser:0.15 },
      western_planets: { Holz:0.20, Feuer:0.30, Erde:0.25, Metall:0.10, Wasser:0.15 },
    },
    coherence_index: 0.72,
  },
  wuxing: { vector: { Holz:0.25, Feuer:0.28, Erde:0.20, Metall:0.12, Wasser:0.15 } },
};

const profileB = {
  western: {
    bodies: {
      Venus: { sign: 'Fische', house: 12 },
      Moon:  { sign: 'Stier', house: 2 },
      Mars:  { sign: 'Löwe', house: 5 },
      Mercury: { sign: 'Wassermann', house: 11 },
      Sun:   { sign: 'Wassermann', house: 11 },
    },
    houses: [
      null,
      { cusp: 0,   sign: 'Krebs' },
      { cusp: 30,  sign: 'Löwe' },
      { cusp: 60,  sign: 'Jungfrau' },
      { cusp: 90,  sign: 'Waage' },
      { cusp: 120, sign: 'Skorpion' },
      { cusp: 150, sign: 'Schütze' },
      { cusp: 180, sign: 'Steinbock' },
      { cusp: 210, sign: 'Wassermann' },
      { cusp: 240, sign: 'Fische' },
      { cusp: 270, sign: 'Widder' },
      { cusp: 300, sign: 'Stier' },
      { cusp: 330, sign: 'Zwillinge' },
    ],
    aspects: []
  },
  bazi: {
    pillars: {
      year:  { element: 'Feuer', stem: '丙', branch: '卯' },
      month: { element: 'Erde',  stem: '戊', branch: '未' },
      day:   { element: 'Holz',  stem: '甲', branch: '子' },
      hour:  { element: 'Wasser',stem: '癸', branch: '亥' },
    },
    day_master: { element: 'Holz', stem: '甲' },
  },
  fusion: {
    wu_xing_vectors: {
      bazi_pillars:    { Holz:0.15, Feuer:0.35, Erde:0.20, Metall:0.10, Wasser:0.20 },
      western_planets: { Holz:0.10, Feuer:0.20, Erde:0.30, Metall:0.25, Wasser:0.15 },
    },
    coherence_index: 0.58,
  },
  wuxing: { vector: { Holz:0.12, Feuer:0.30, Erde:0.25, Metall:0.18, Wasser:0.15 } },
};

test('computeDomainScores returns all 6 domains', () => {
  const scores = computeDomainScores(profileA, profileB);
  const REQUIRED = ['love','communication','finance','career','growth','foundation'];
  for (const d of REQUIRED) {
    assert.ok(scores[d], `missing domain: ${d}`);
    assert.ok(typeof scores[d].harmony === 'number', `harmony not a number for ${d}`);
    assert.ok(typeof scores[d].tension === 'number', `tension not a number for ${d}`);
    assert.ok(scores[d].harmony >= 0 && scores[d].harmony <= 100, `harmony out of range for ${d}`);
    assert.ok(scores[d].tension >= 0 && scores[d].tension <= 100, `tension out of range for ${d}`);
    assert.ok(Array.isArray(scores[d].sources), `sources not array for ${d}`);
    assert.ok(scores[d].sources.length > 0, `no sources for ${d}`);
  }
});

test('harmony + tension sum is not required to be 100 (they are independent)', () => {
  const scores = computeDomainScores(profileA, profileB);
  for (const d of Object.keys(scores)) {
    assert.ok(scores[d].harmony >= 0, `harmony negative for ${d}`);
    assert.ok(scores[d].tension >= 0, `tension negative for ${d}`);
  }
});

test('computeDomainScores is stable (same input → same output)', () => {
  const s1 = computeDomainScores(profileA, profileB);
  const s2 = computeDomainScores(profileA, profileB);
  assert.deepEqual(s1, s2);
});

test('computeDomainScores handles missing optional fields gracefully', () => {
  const sparse = {
    western: { bodies: {}, houses: [], aspects: [] },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: null },
  };
  assert.doesNotThrow(() => computeDomainScores(sparse, sparse));
});

test('communication harmony never goes negative (airComplement underflow)', () => {
  const highAir = {
    western: { bodies: {}, houses: [], aspects: [] },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: { Holz:0, Feuer:0, Erde:0, Metall:0, Luft:0.6, Wasser:0 } },
  };
  const zeroAir = {
    western: { bodies: {}, houses: [], aspects: [] },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: null },
  };
  const scores = computeDomainScores(highAir, zeroAir);
  assert.ok(scores.communication.harmony >= 0, 'communication harmony went negative');
  assert.ok(scores.communication.tension >= 0, 'communication tension went negative');
});

test('signHarmony returns 0.5 for unknown sign (null element guard)', () => {
  const weirdSign = {
    western: {
      bodies: { Mercury: { sign: 'UNKNOWNSIGN', house: 3 } },
      houses: [],
      aspects: [],
    },
    bazi: { pillars: { year:{}, month:{}, day:{}, hour:{} }, day_master: null },
    fusion: { wu_xing_vectors: { bazi_pillars: null, western_planets: null }, coherence_index: null },
    wuxing: { vector: null },
  };
  assert.doesNotThrow(() => computeDomainScores(weirdSign, weirdSign));
  const scores = computeDomainScores(weirdSign, weirdSign);
  assert.ok(typeof scores.communication.harmony === 'number');
  assert.ok(scores.communication.harmony >= 0 && scores.communication.harmony <= 100);
});
