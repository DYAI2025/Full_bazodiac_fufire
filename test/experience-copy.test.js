import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoreIdentity,
  buildFusionSignatureTitle,
  explainCoherence,
  buildDominantTension,
  buildDailyFallback,
  buildActionExperiment,
} from '../public/src/domain/experienceCopy.js';

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
