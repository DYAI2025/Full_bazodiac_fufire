import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyLearnImpulse } from '../public/src/domain/meanings.js';

test('buildDailyLearnImpulse: house wins over element when both present', () => {
  const r = buildDailyLearnImpulse({ activeHouse: 3, dominantElement: 'Erde' });
  assert.match(r.anchor, /Haus 3|Kommunikation/);
});

test('buildDailyLearnImpulse: element wins over day master when no house', () => {
  const r = buildDailyLearnImpulse({ dominantElement: 'Metall', dayMasterStem: '甲' });
  assert.match(r.anchor, /Metall/);
});

test('buildDailyLearnImpulse: day master used when no house/element present', () => {
  const r = buildDailyLearnImpulse({ dayMasterStem: '甲' });
  assert.match(r.anchor, /Day Master/);
});

test('buildDailyLearnImpulse: default impulse never empty', () => {
  const r = buildDailyLearnImpulse({});
  assert.ok(r.understand && r.apply && r.experiment);
});

test('buildDailyLearnImpulse: respects fallback experiment instruction', () => {
  const r = buildDailyLearnImpulse({
    dominantElement: 'Holz',
    fallbackExperiment: { instruction: 'Custom-Experiment heute.' },
  });
  assert.equal(r.experiment, 'Custom-Experiment heute.');
});

test('buildDailyLearnImpulse: returns three explanatory fields named understand/apply/experiment', () => {
  const r = buildDailyLearnImpulse({ dominantElement: 'Wasser' });
  for (const k of ['understand', 'apply', 'experiment']) {
    assert.ok(typeof r[k] === 'string' && r[k].length > 5, `${k} missing or too short`);
  }
});

import { JSDOM_TEXT_CONTENT_ONLY as LEARN_MARKER } from '../public/src/components/DailyLearnImpulseCard.js';

test('DailyLearnImpulseCard signals textContent-only rendering', () => {
  assert.equal(LEARN_MARKER, true);
});
