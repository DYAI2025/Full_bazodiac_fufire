import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRelationshipResonance } from '../public/src/domain/relationshipResonance.js';
import { containsBannedRelationshipPhrase } from '../public/src/domain/relationshipCopy.js';

const personA = {
  western: {
    bodies: {
      Sun:    { sign: 'Cancer',  longitude: 100 },
      Moon:   { sign: 'Pisces',  longitude: 350 },
      Mercury:{ sign: 'Gemini',  longitude: 70 },
      Venus:  { sign: 'Taurus',  longitude: 45 },
    },
    ascendant: 'Libra',
  },
  bazi: { day_master: { stem: 'Wu', element: 'Erde' } },
  fusion: {
    wu_xing_vectors: { fusion: { Erde: 0.30, Wasser: 0.25, Holz: 0.20, Feuer: 0.15, Metall: 0.10 } },
    coherence_index: 0.62,
  },
};

const personB = {
  western: {
    bodies: {
      Sun:    { sign: 'Capricorn', longitude: 280 },
      Moon:   { sign: 'Cancer',    longitude: 105 },
      Mercury:{ sign: 'Sagittarius', longitude: 260 },
      Venus:  { sign: 'Aquarius',  longitude: 310 },
    },
    ascendant: 'Aries',
  },
  bazi: { day_master: { stem: 'Geng', element: 'Metall' } },
  fusion: {
    wu_xing_vectors: { fusion: { Metall: 0.32, Feuer: 0.22, Holz: 0.20, Wasser: 0.15, Erde: 0.11 } },
    coherence_index: 0.71,
  },
};

const synastryRaw = {
  combined_coherence: 0.66,
  element_tension: { dominant_a: 'Erde', dominant_b: 'Metall', cycle_relation: 'generates', tension_score: 0.4 },
};

test('buildRelationshipResonance: returns full RelationshipAnalysis shape', () => {
  const r = buildRelationshipResonance({ personAProfile: personA, personBProfile: personB, synastryRaw });
  for (const k of ['resonanceIndex','resonanceBand','summaryStatements','mainConnection','mainFriction','contactExperiment','deepDive','safetyCaveat']) {
    assert.ok(k in r, `missing field: ${k}`);
  }
  assert.equal(typeof r.resonanceIndex, 'number');
  assert.ok(['low','mixed','strong','high'].includes(r.resonanceBand));
});

test('buildRelationshipResonance: summaryStatements is exactly three strings', () => {
  const r = buildRelationshipResonance({ personAProfile: personA, personBProfile: personB, synastryRaw });
  assert.equal(r.summaryStatements.length, 3);
  for (const s of r.summaryStatements) {
    assert.ok(typeof s === 'string' && s.length > 8, `bad statement: "${s}"`);
  }
});

test('buildRelationshipResonance: every produced string is free of banned relationship phrases', () => {
  const r = buildRelationshipResonance({ personAProfile: personA, personBProfile: personB, synastryRaw });
  const collected = [
    ...r.summaryStatements,
    r.mainConnection.title, r.mainConnection.summary,
    r.mainFriction.title,   r.mainFriction.summary,
    r.contactExperiment.instruction, r.contactExperiment.reflectionQuestion,
    r.safetyCaveat,
  ];
  for (const text of collected) {
    assert.equal(
      containsBannedRelationshipPhrase(text), false,
      `forbidden language in output: "${text}"`,
    );
  }
});

test('buildRelationshipResonance: mainConnection + mainFriction carry title+summary+evidence+sourceLayer', () => {
  const r = buildRelationshipResonance({ personAProfile: personA, personBProfile: personB, synastryRaw });
  for (const signal of [r.mainConnection, r.mainFriction]) {
    assert.ok(signal.title);
    assert.ok(signal.summary);
    assert.ok(Array.isArray(signal.evidence));
    assert.ok(signal.sourceLayer);
  }
});

test('buildRelationshipResonance: contactExperiment has instruction + reflectionQuestion + sourceReason', () => {
  const r = buildRelationshipResonance({ personAProfile: personA, personBProfile: personB, synastryRaw });
  assert.ok(r.contactExperiment.title);
  assert.ok(r.contactExperiment.instruction);
  assert.ok(r.contactExperiment.reflectionQuestion);
  assert.ok(r.contactExperiment.sourceReason);
});

test('buildRelationshipResonance: works with missing synastryRaw (graceful fallback)', () => {
  const r = buildRelationshipResonance({ personAProfile: personA, personBProfile: personB });
  assert.ok(r.summaryStatements);
  assert.ok(r.mainConnection);
  assert.ok(r.mainFriction);
});

test('buildRelationshipResonance: works when one profile is null (qualitative-only result)', () => {
  const r = buildRelationshipResonance({ personAProfile: personA, personBProfile: null });
  assert.equal(r.resonanceBand, 'unknown');
  assert.equal(r.resonanceIndex, null);
  assert.equal(r.summaryStatements.length, 3);
});
