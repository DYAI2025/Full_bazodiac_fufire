import test from 'node:test';
import assert from 'node:assert/strict';
import { actionExperimentCardModel } from '../public/src/components/ActionExperimentCard.js';

test('actionExperimentCardModel preserves required fields', () => {
  const m = actionExperimentCardModel({
    title: '24h Experiment',
    instruction: 'Sprich klarer.',
    reflectPrompt: 'Was wurde leichter?',
    source: 'static_interpretation',
  });
  assert.equal(m.title, '24h Experiment');
  assert.equal(m.instruction, 'Sprich klarer.');
  assert.equal(m.reflectPrompt, 'Was wurde leichter?');
  assert.equal(m.source, 'static_interpretation');
});

test('actionExperimentCardModel defaults duration to 24 Stunden', () => {
  const m = actionExperimentCardModel({ title: 'X', instruction: 'Y', reflectPrompt: 'Z' });
  assert.equal(m.duration, '24 Stunden');
});

test('actionExperimentCardModel respects explicit duration override', () => {
  const m = actionExperimentCardModel({
    title: 'X', instruction: 'Y', reflectPrompt: 'Z', duration: '7 Tage',
  });
  assert.equal(m.duration, '7 Tage');
});
