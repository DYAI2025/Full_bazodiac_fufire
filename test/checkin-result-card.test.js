import test from 'node:test';
import assert from 'node:assert/strict';
import { checkInResultModel } from '../public/src/components/CheckInResultCard.js';

const sampleVM = {
  signature: { dayMasterLabel: 'Wu Erde', coherenceBand: 'medium', coherenceScore: 62 },
  western:   { theme: 'Kommunikation aktiv', activeHouses: [{ house: 3, label: 'Kommunikation' }] },
  bazi:      { dayMaster: 'Wu Erde' },
  fusion:    { synthesis: 'westlich aktiviert Kommunikation, BaZi betont Erde', tension: 'Erde stark / Metall schwach' },
  experiment:{ sourceReason: 'Metall-Hebel schwach' },
  tomorrow:  { teaser: 'Morgen ruhigeres Feld.' },
};

test('checkInResultModel returns null when entry is incomplete', () => {
  assert.equal(checkInResultModel({ entry: null, vm: sampleVM }), null);
  assert.equal(checkInResultModel({ entry: { clarity: 'mittel' }, vm: sampleVM }), null);
  assert.equal(checkInResultModel({ entry: { clarity: 'mittel', energy: 'aktiv' }, vm: sampleVM }), null);
});

test('checkInResultModel returns stateLabel + interpretation + nextStep + tomorrowUse when complete', () => {
  const entry = { clarity: 'niedrig', energy: 'aktiv', contact: 'gemischt' };
  const m = checkInResultModel({ entry, vm: sampleVM });
  assert.ok(m, 'expected model when entry complete');
  assert.ok(m.stateLabel    && m.stateLabel.length > 5);
  assert.ok(m.interpretation && m.interpretation.length > 10);
  assert.ok(m.nextStep      && m.nextStep.length > 5);
  assert.ok(m.tomorrowUse   && m.tomorrowUse.length > 5);
});

test('checkInResultModel references a tagesfaktor from the ViewModel', () => {
  const entry = { clarity: 'niedrig', energy: 'aktiv', contact: 'gemischt' };
  const m = checkInResultModel({ entry, vm: sampleVM });
  const blob = `${m.interpretation} ${m.nextStep}`;
  const referencesFactor =
    blob.includes('Kommunikation') ||
    blob.includes('Erde') ||
    blob.includes('Metall') ||
    blob.includes('Wu Erde') ||
    blob.includes(sampleVM.experiment.sourceReason);
  assert.ok(referencesFactor, 'result must mention at least one ViewModel factor');
});
