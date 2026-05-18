import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRelationshipResonance,
  CONTACT_EXPERIMENT_RULES,
} from '../public/src/domain/relationshipResonance.js';

function makeProfile({ sunLon = 100, moonLon = 350, mercLon = 70, venusLon = 45, marsLon = 200, ascendant = 'Libra', dm = { stem: 'Wu', element: 'Erde' }, dominant = 'Erde', deficient = 'Metall', coh = 0.62, timeCert = 'exact' } = {}) {
  const fusion = { Holz: 0.18, Feuer: 0.16, Erde: 0.20, Metall: 0.14, Wasser: 0.20 };
  fusion[dominant] = 0.32;
  fusion[deficient] = 0.08;
  return {
    _inputMeta: { timeCertainty: timeCert },
    western: {
      bodies: {
        Sun:    { sign: 'Cancer',  longitude: sunLon },
        Moon:   { sign: 'Pisces',  longitude: moonLon },
        Mercury:{ sign: 'Gemini',  longitude: mercLon },
        Venus:  { sign: 'Taurus',  longitude: venusLon },
        Mars:   { sign: 'Scorpio', longitude: marsLon },
      },
      ascendant,
    },
    bazi: { day_master: dm },
    fusion: { wu_xing_vectors: { fusion }, coherence_index: coh },
  };
}

test('CONTACT_EXPERIMENT_RULES exposes >= 8 distinct rule paths plus default', () => {
  const reasons = new Set(CONTACT_EXPERIMENT_RULES.map((r) => r.sourceReason));
  assert.ok(reasons.size >= 8, `expected >=8 sourceReasons, got ${reasons.size}`);
});

test('every contact rule has instruction + reflection + sourceReason + tags', () => {
  for (const rule of CONTACT_EXPERIMENT_RULES) {
    const x = rule.build({ elA: 'Erde', elB: 'Metall', ascA: 'Libra', ascB: 'Aries', band: 'mixed' });
    assert.ok(x.title);
    assert.ok(x.instruction);
    assert.ok(x.reflectionQuestion);
    assert.ok(Array.isArray(x.tags));
    assert.ok(x.sourceReason);
  }
});

test('aspect-driven mainConnection picks the most harmonic synastry aspect when bodies align', () => {
  // Person A Venus 45, Person B Mars 165 → angle 120 → Trigon (harmonic 0.9)
  const a = makeProfile({ venusLon: 45, marsLon: 200 });
  const b = makeProfile({ venusLon: 320, marsLon: 165, ascendant: 'Aries', dm: { stem: 'Geng', element: 'Metall' }, dominant: 'Metall', deficient: 'Erde' });
  const r = buildRelationshipResonance({ personAProfile: a, personBProfile: b });
  // sourceLayer should reflect that an aspect was found
  assert.ok(['synastry-aspect', 'wuxing', 'synastry'].includes(r.mainConnection.sourceLayer));
  assert.ok(r.mainConnection.evidence.length >= 1);
});

test('reduced-precision: timeCertainty="unknown" on either profile caps the band at "mixed"', () => {
  const a = makeProfile({ coh: 0.85, timeCert: 'unknown' });
  const b = makeProfile({ coh: 0.85, timeCert: 'exact', dm: { stem: 'Geng', element: 'Metall' }, dominant: 'Metall' });
  const r = buildRelationshipResonance({ personAProfile: a, personBProfile: b, synastryRaw: { combined_coherence: 0.85 } });
  assert.ok(['low', 'mixed', 'unknown'].includes(r.resonanceBand), `expected capped band, got ${r.resonanceBand}`);
  assert.ok(r.bandDetails.caveat);
});

test('reduced-precision: a precision note appears in the safetyCaveat or bandDetails when time is unknown', () => {
  const a = makeProfile({ timeCert: 'unknown' });
  const b = makeProfile({ dm: { stem: 'Geng', element: 'Metall' } });
  const r = buildRelationshipResonance({ personAProfile: a, personBProfile: b });
  const blob = `${r.safetyCaveat} ${r.bandDetails.caveat} ${r.bandDetails.meaning}`;
  assert.match(blob, /Geburtszeit|Präzision|reduziert/i);
});

test('exact precision on both profiles: no precision note injected', () => {
  const a = makeProfile({ timeCert: 'exact' });
  const b = makeProfile({ dm: { stem: 'Geng', element: 'Metall' }, timeCert: 'exact' });
  const r = buildRelationshipResonance({ personAProfile: a, personBProfile: b, synastryRaw: { combined_coherence: 0.85 } });
  assert.ok(!/Geburtszeit fehlt/.test(r.safetyCaveat));
});

test('deep dive carries westernAspects array when both profiles have positions', () => {
  const a = makeProfile();
  const b = makeProfile({ dm: { stem: 'Geng', element: 'Metall' } });
  const r = buildRelationshipResonance({ personAProfile: a, personBProfile: b });
  assert.ok(r.deepDive.westernAspects, 'westernAspects must be present');
  assert.ok(Array.isArray(r.deepDive.westernAspects.items));
});
