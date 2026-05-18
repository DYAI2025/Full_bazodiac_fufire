import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoreIdentity,
  buildFusionSignatureTitle,
  explainCoherence,
  buildDominantTension,
  buildDailyFallback,
  buildActionExperiment,
  buildExperienceProfile,
} from '../public/src/domain/experienceCopy.js';

test('buildExperienceProfile adapts raw server shape to experience shape', () => {
  const raw = {
    western: {
      bodies: { Sun: { sign: 'Cancer' }, Moon: { sign: 'Pisces' } },
      ascendant: 'Libra',
    },
    bazi: { day_master: { stem: 'Wu', element: 'Erde' } },
    fusion: {
      wu_xing_vectors: { fusion: { Erde: 0.3, Wasser: 0.25, Holz: 0.2, Feuer: 0.15, Metall: 0.1 } },
      coherence_index: 0.62,
    },
  };
  const e = buildExperienceProfile(raw);
  assert.equal(e.western.sun.sign,        'Cancer');
  assert.equal(e.western.ascendant.sign,  'Libra');
  assert.equal(e.bazi.dayMaster.stem,     'Wu');
  assert.equal(e.fusion.coherence,        62);
  assert.equal(e.fusion.dominantElement,  'Erde');
  assert.equal(e.fusion.deficientElement, 'Metall');
});

test('buildExperienceProfile handles missing optional fields without throwing', () => {
  const e = buildExperienceProfile({});
  assert.equal(e.fusion.coherence,        null);
  assert.equal(e.fusion.dominantElement,  null);
  assert.equal(e.fusion.deficientElement, null);
});

test('buildExperienceProfile accepts ascendant as object {sign}', () => {
  const e = buildExperienceProfile({ western: { ascendant: { sign: 'Aquarius' } } });
  assert.equal(e.western.ascendant.sign, 'Aquarius');
});

const sampleProfile = {
  western: {
    sun:       { sign: 'Cancer' },
    moon:      { sign: 'Pisces' },
    ascendant: { sign: 'Libra' },
  },
  bazi: {
    dayMaster: { stem: 'Wu', element: 'Erde' },
  },
  fusion: {
    coherence: 62,
    dominantElement:  'Erde',
    deficientElement: 'Metall',
  },
};

test('buildCoreIdentity returns object with sun, moon, ascendant, dayMaster', () => {
  const id = buildCoreIdentity(sampleProfile);
  assert.equal(id.sun,       'Krebs');
  assert.equal(id.moon,      'Fische');
  assert.equal(id.ascendant, 'Waage');
  assert.equal(id.dayMaster, 'Wu Erde');
});

test('buildFusionSignatureTitle returns a non-empty headline string', () => {
  const title = buildFusionSignatureTitle(sampleProfile);
  assert.ok(typeof title === 'string' && title.length > 10);
});

test('explainCoherence returns {scoreLabel, meaning, raises, lowers, caveat}', () => {
  const e = explainCoherence(sampleProfile);
  assert.equal(e.scoreLabel, 'Kohärenz-Index');
  assert.ok(e.meaning.includes('mittler') || e.meaning.includes('hoch') || e.meaning.includes('niedrig'));
  assert.ok(Array.isArray(e.raises));
  assert.ok(Array.isArray(e.lowers));
  assert.ok(e.caveat.toLowerCase().includes('persönlichkeit') || e.caveat.toLowerCase().includes('indexwert'));
});

test('buildDominantTension returns at least one tension sentence', () => {
  const t = buildDominantTension(sampleProfile);
  assert.ok(typeof t.statement === 'string' && t.statement.length > 10);
});

test('buildDailyFallback returns {focus, impulse} when daily API is unavailable', () => {
  const f = buildDailyFallback(sampleProfile);
  assert.ok(f.focus && f.impulse);
});

test('buildActionExperiment(domain, profile) returns experiment for love/career/daily', () => {
  for (const domain of ['love', 'career', 'daily']) {
    const x = buildActionExperiment(domain, sampleProfile);
    assert.ok(x.title);
    assert.ok(x.instruction);
    assert.ok(x.reflectPrompt);
  }
});

test('buildActionExperiment("career") varies instruction by deficient element', () => {
  const metallProfile = { ...sampleProfile, fusion: { ...sampleProfile.fusion, deficientElement: 'Metall' } };
  const wasserProfile = { ...sampleProfile, fusion: { ...sampleProfile.fusion, deficientElement: 'Wasser' } };
  const metall = buildActionExperiment('career', metallProfile);
  const wasser = buildActionExperiment('career', wasserProfile);
  assert.notEqual(metall.instruction, wasser.instruction);
  assert.match(metall.instruction, /schriftlich|Satz/);
  assert.match(wasser.instruction, /24h|reifen|schlaf/i);
});

test('buildActionExperiment("career") falls back to base instruction when deficient element is unknown', () => {
  const noFusion = { ...sampleProfile, fusion: {} };
  const x = buildActionExperiment('career', noFusion);
  assert.ok(x.instruction);
});

import { buildRelationshipSummary } from '../public/src/domain/experienceCopy.js';

test('buildRelationshipSummary returns three sentences keyed easyFlow / friction / helps', () => {
  const r = buildRelationshipSummary(sampleProfile);
  assert.ok(typeof r.easyFlow === 'string' && r.easyFlow.length > 10);
  assert.ok(typeof r.friction === 'string' && r.friction.length > 10);
  assert.ok(typeof r.helps    === 'string' && r.helps.length    > 10);
});

test('buildRelationshipSummary uses ascendant for contact tone', () => {
  const r = buildRelationshipSummary(sampleProfile);
  assert.ok(r.easyFlow.includes('Waage') || r.easyFlow.toLowerCase().includes('kontakt'));
});

test('buildRelationshipSummary names dominant element in friction sentence', () => {
  const r = buildRelationshipSummary(sampleProfile);
  assert.ok(r.friction.includes('Erde') || r.friction.toLowerCase().includes('einseit'));
});

import { buildWeeklyThemes } from '../public/src/domain/experienceCopy.js';

test('buildWeeklyThemes maps a week of dates to themes and impulse text', () => {
  const days = [
    { date: '2026-05-18' }, // Mon
    { date: '2026-05-19' }, // Tue
    { date: '2026-05-20' }, // Wed
    { date: '2026-05-21' }, // Thu
    { date: '2026-05-22' }, // Fri
    { date: '2026-05-23' }, // Sat
    { date: '2026-05-24' }, // Sun
  ];
  const themes = buildWeeklyThemes(days);
  assert.equal(themes.length, 7);
  themes.forEach((t) => {
    assert.ok(t.date);
    assert.ok(typeof t.theme === 'string'   && t.theme.length > 0);
    assert.ok(typeof t.impulse === 'string' && t.impulse.length > 0);
  });
});

test('buildWeeklyThemes assigns each weekday a stable theme', () => {
  const expected = {
    1: /Anstoßen|Ausdruck/i,     // Mon
    2: /Aufbau|Handeln/i,         // Tue
    3: /Austausch|Kontakt/i,      // Wed
    4: /Weite|Wachstum/i,         // Thu
    5: /Verbindung|Resonanz/i,    // Fri
    6: /Struktur|Halten/i,        // Sat
    0: /Rückzug|Reflexion/i,      // Sun
  };
  for (const [wd, regex] of Object.entries(expected)) {
    const date = (wd === '0') ? '2026-05-24' : `2026-05-${17 + Number(wd)}`;
    const [day] = buildWeeklyThemes([{ date }]);
    assert.match(day.theme, regex, `Wochentag ${wd} (${date}) → ${day.theme}`);
  }
});

test('buildWeeklyThemes returns empty array for empty input', () => {
  assert.deepEqual(buildWeeklyThemes([]), []);
});
