import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCoherenceBand,
  buildDailyCompanionViewModel,
} from '../public/src/domain/dailyCompanion.js';

test('getCoherenceBand: unknown for null/undefined/NaN', () => {
  assert.equal(getCoherenceBand(null),      'unknown');
  assert.equal(getCoherenceBand(undefined), 'unknown');
  assert.equal(getCoherenceBand(Number.NaN),'unknown');
});

test('getCoherenceBand: 0..100 maps to four bands', () => {
  assert.equal(getCoherenceBand(0),   'low');
  assert.equal(getCoherenceBand(39),  'low');
  assert.equal(getCoherenceBand(40),  'medium');
  assert.equal(getCoherenceBand(62),  'medium');
  assert.equal(getCoherenceBand(69),  'medium');
  assert.equal(getCoherenceBand(70),  'high');
  assert.equal(getCoherenceBand(87),  'high');
  assert.equal(getCoherenceBand(89),  'high');
  assert.equal(getCoherenceBand(90),  'very-high');
  assert.equal(getCoherenceBand(100), 'very-high');
});

const sampleProfile = {
  western: {
    bodies: {
      Sun:     { sign: 'Cancer' },
      Moon:    { sign: 'Pisces' },
      Mercury: { sign: 'Gemini' },
    },
    ascendant: 'Libra',
  },
  bazi: { day_master: { stem: 'Wu', element: 'Erde' } },
  fusion: {
    wu_xing_vectors: { fusion: { Erde: 0.30, Wasser: 0.25, Holz: 0.20, Feuer: 0.15, Metall: 0.10 } },
    coherence_index: 0.62,
  },
};

const sampleTransits = {
  today: {
    planets:          { mercury: { sign: 'gemini', longitude: 70 } },
    sector_intensity: [0,0,0.6,0.2,0,0,0,0,0,0,0,0],
  },
  timeline: { days: [{ date: '2026-05-19', planets: {}, sector_intensity: [0,0,0,0,0,0,0,0,0,0.5,0,0] }] },
};

test('buildDailyCompanionViewModel: returns stable shape', () => {
  const vm = buildDailyCompanionViewModel({
    profile: sampleProfile,
    transits: sampleTransits,
    date: '2026-05-18',
    history: { yesterday: null },
  });
  for (const key of ['date','dateLabel','signature','todayNew','western','bazi','fusion','experiment','tomorrow']) {
    assert.ok(key in vm, `missing field: ${key}`);
  }
  assert.equal(vm.date, '2026-05-18');
  assert.match(vm.dateLabel, /2026|Mai|May/);
  assert.equal(vm.signature.coherenceScore, 62);
  assert.equal(vm.signature.coherenceBand,  'medium');
});

test('buildDailyCompanionViewModel: hero/western text contains no "gleich verfügbar" placeholder', () => {
  const vm = buildDailyCompanionViewModel({
    profile: sampleProfile, transits: sampleTransits,
    date: '2026-05-18', history: { yesterday: null },
  });
  const blob = JSON.stringify(vm);
  assert.ok(!/gleich verfügbar/i.test(blob), 'placeholder leaked into ViewModel');
});

test('buildDailyCompanionViewModel: todayNew.isFirstDay=true when history.yesterday is null', () => {
  const vm = buildDailyCompanionViewModel({
    profile: sampleProfile, transits: sampleTransits,
    date: '2026-05-18', history: { yesterday: null },
  });
  assert.equal(vm.todayNew.isFirstDay, true);
  assert.ok(vm.todayNew.points.length >= 1, 'ersttag-fallback must produce at least one bullet');
  assert.ok(vm.todayNew.points.length <= 3);
});

test('buildDailyCompanionViewModel: todayNew references yesterday when available, max 3 bullets', () => {
  const vm = buildDailyCompanionViewModel({
    profile: sampleProfile, transits: sampleTransits,
    date: '2026-05-18',
    history: { yesterday: { activeHouses: [1, 4], dominantElement: 'Wasser' } },
  });
  assert.equal(vm.todayNew.isFirstDay, false);
  assert.ok(vm.todayNew.points.length >= 1);
  assert.ok(vm.todayNew.points.length <= 3);
});

test('buildDailyCompanionViewModel: experiment has title, instruction, reflectionQuestion, sourceReason', () => {
  const vm = buildDailyCompanionViewModel({
    profile: sampleProfile, transits: sampleTransits,
    date: '2026-05-18', history: { yesterday: null },
  });
  assert.ok(vm.experiment.title);
  assert.ok(vm.experiment.instruction);
  assert.ok(vm.experiment.reflectionQuestion);
  assert.ok(vm.experiment.sourceReason, 'experiment must carry a sourceReason');
});

test('buildDailyCompanionViewModel: tomorrow.href links to /transits', () => {
  const vm = buildDailyCompanionViewModel({
    profile: sampleProfile, transits: sampleTransits,
    date: '2026-05-18', history: { yesterday: null },
  });
  assert.equal(vm.tomorrow.href, '/transits');
  assert.ok(vm.tomorrow.teaser);
});

test('buildDailyCompanionViewModel: tolerates missing profile/transits without throwing', () => {
  const vm = buildDailyCompanionViewModel({
    profile: null, transits: null,
    date: '2026-05-18', history: null,
  });
  assert.equal(vm.signature.coherenceBand, 'unknown');
  assert.ok(vm.todayNew.isFirstDay);
  assert.ok(vm.experiment.title);
});
