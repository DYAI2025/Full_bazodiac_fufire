// Iteration 1A acceptance: copy alignment + error-state robustness.
// Source-level checks (no JSDOM): grep the page source for the contracts
// the Goal §Akzeptanzkriterien mandate.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  RELATIONSHIP_SUMMARY_LEAD_INS,
} from '../public/src/domain/relationshipCopy.js';
import { buildRelationshipResonance } from '../public/src/domain/relationshipResonance.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const synastrySource = readFileSync(join(__dirname, '../public/src/pages/SynastryPage.js'), 'utf8');

test('Synastry-Hero lead-ins match Goal §Akzeptanzkriterium 3', () => {
  assert.equal(RELATIONSHIP_SUMMARY_LEAD_INS.connection, 'Hauptverbindung:');
  assert.equal(RELATIONSHIP_SUMMARY_LEAD_INS.friction,   'Hauptspannung:');
  assert.equal(RELATIONSHIP_SUMMARY_LEAD_INS.practical,  'Heutiger Kontaktimpuls:');
});

test('buildRelationshipResonance summary uses the three Goal-mandated lead-ins', () => {
  const r = buildRelationshipResonance({
    personAProfile: {
      western: { bodies: { Sun: { sign: 'Cancer', longitude: 100 }, Moon: { sign: 'Pisces', longitude: 350 } }, ascendant: 'Libra' },
      bazi: { day_master: { stem: 'Wu', element: 'Erde' } },
      fusion: { wu_xing_vectors: { fusion: { Erde: 0.3, Wasser: 0.25, Holz: 0.2, Feuer: 0.15, Metall: 0.1 } }, coherence_index: 0.62 },
    },
    personBProfile: {
      western: { bodies: { Sun: { sign: 'Capricorn', longitude: 280 } }, ascendant: 'Aries' },
      bazi: { day_master: { stem: 'Geng', element: 'Metall' } },
      fusion: { wu_xing_vectors: { fusion: { Metall: 0.32, Feuer: 0.22, Holz: 0.2, Wasser: 0.15, Erde: 0.11 } }, coherence_index: 0.71 },
    },
  });
  assert.equal(r.summaryStatements.length, 3);
  assert.match(r.summaryStatements[0], /^Hauptverbindung:/);
  assert.match(r.summaryStatements[1], /^Hauptspannung:/);
  assert.match(r.summaryStatements[2], /^Heutiger Kontaktimpuls:/);
});

test('mainConnection + mainFriction carry a practice ("Praxis-Hinweis") field', () => {
  const r = buildRelationshipResonance({
    personAProfile: {
      western: { bodies: { Sun: { sign: 'Cancer', longitude: 100 } }, ascendant: 'Libra' },
      bazi: { day_master: { stem: 'Wu', element: 'Erde' } },
      fusion: { wu_xing_vectors: { fusion: { Erde: 0.3, Wasser: 0.25, Holz: 0.2, Feuer: 0.15, Metall: 0.1 } } },
    },
    personBProfile: {
      western: { bodies: { Sun: { sign: 'Capricorn', longitude: 280 } }, ascendant: 'Aries' },
      bazi: { day_master: { stem: 'Geng', element: 'Metall' } },
      fusion: { wu_xing_vectors: { fusion: { Metall: 0.32, Feuer: 0.22, Holz: 0.2, Wasser: 0.15, Erde: 0.11 } } },
    },
  });
  assert.ok(r.mainConnection.practice && r.mainConnection.practice.length > 10);
  assert.ok(r.mainFriction.practice   && r.mainFriction.practice.length > 10);
});

// ── Error-state robustness ───────────────────────────────────────────────
// SynastryPage must not call router.navigate('/') or window.location reassignment
// in any of its error paths. The form state (date/time/place inputs) is
// already preserved as DOM elements; the only way to lose it would be a
// redirect or a re-mount.

test('SynastryPage source contains no redirect-to-root in error paths', () => {
  const forbiddenPatterns = [
    /router\.navigate\(['"]\/['"]\)/,
    /window\.location\s*=/,
    /window\.location\.href\s*=/,
    /onNavigate\?\.\(['"]\/['"]\)/,
  ];
  for (const re of forbiddenPatterns) {
    assert.equal(re.test(synastrySource), false, `SynastryPage uses forbidden redirect pattern ${re}`);
  }
});

test('SynastryPage source keeps inputs accessible after error (no innerHTML rewrite of form)', () => {
  // Form rewriting would clobber Person A/B inputs. The page must only touch
  // result mount nodes, not the input form, in error paths.
  const errorBlock = synastrySource.split(/calcBtn\.addEventListener/)[1] || '';
  assert.equal(/\.synastry-input-grid'\s*\)\.innerHTML\s*=/.test(errorBlock), false,
    'SynastryPage clobbers the input grid HTML — would erase Person A/B inputs.');
});

test('SynastryPage shows an inline error element (.synastry-error) rather than redirecting', () => {
  assert.match(synastrySource, /errorEl\.hidden\s*=\s*false/);
  assert.match(synastrySource, /errorEl\.textContent/);
});
