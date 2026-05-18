import test from 'node:test';
import assert from 'node:assert/strict';
import { westernImpulseModel } from '../public/src/components/WesternImpulseCard.js';
import { baziImpulseModel }    from '../public/src/components/BaziImpulseCard.js';
import { fusionSynthesisModel } from '../public/src/components/FusionSynthesisCard.js';

test('westernImpulseModel guarantees theme/chance/caution/microImpulse fields', () => {
  const m = westernImpulseModel({ theme: 'Kommunikation aktiv', chance: 'X', caution: 'Y', microImpulse: 'Z', activeHouses: [] });
  for (const k of ['theme', 'chance', 'caution', 'microImpulse']) {
    assert.ok(m[k] && m[k].length > 0, `${k} missing`);
  }
});

test('westernImpulseModel: null input returns fallback strings, not empty', () => {
  const m = westernImpulseModel(null);
  for (const k of ['theme', 'chance', 'caution', 'microImpulse']) {
    assert.ok(m[k] && m[k].length > 0, `${k} empty on null input`);
  }
});

test('baziImpulseModel: null input returns fallback DayMaster string', () => {
  const m = baziImpulseModel(null);
  assert.ok(m.dayMaster);
  assert.ok(m.dailyRelation);
  assert.ok(m.resourceHint);
  assert.ok(m.riskHint);
});

test('fusionSynthesisModel: includes synthesis + tension + balancingAction even on null', () => {
  const m = fusionSynthesisModel(null);
  assert.ok(m.synthesis.length > 5);
  assert.ok(m.tension.length > 5);
  assert.ok(m.balancingAction.length > 5);
});
