import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FEATURE_FLAGS,
  readFeatureFlags,
  featureFlag,
} from '../public/src/domain/featureFlags.js';

function makeMemStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}

test('DEFAULT_FEATURE_FLAGS has relationshipResonanceV1 and relationshipShareCardV1 ON', () => {
  assert.equal(DEFAULT_FEATURE_FLAGS.relationshipResonanceV1, true);
  assert.equal(DEFAULT_FEATURE_FLAGS.relationshipShareCardV1, true);
});

test('readFeatureFlags: returns defaults when storage is empty', () => {
  const f = readFeatureFlags({ storage: makeMemStorage() });
  assert.equal(f.relationshipResonanceV1, true);
});

test('readFeatureFlags: storage override wins over defaults', () => {
  const s = makeMemStorage({ 'fufire.flags': JSON.stringify({ relationshipResonanceV1: false }) });
  const f = readFeatureFlags({ storage: s });
  assert.equal(f.relationshipResonanceV1, false);
  assert.equal(f.relationshipShareCardV1, true);
});

test('readFeatureFlags: window override wins over storage', () => {
  const s = makeMemStorage({ 'fufire.flags': JSON.stringify({ relationshipShareCardV1: false }) });
  const win = { __FUFIRE_FLAGS: { relationshipShareCardV1: true } };
  const f = readFeatureFlags({ storage: s, win });
  assert.equal(f.relationshipShareCardV1, true);
});

test('featureFlag: returns boolean for a known flag', () => {
  const v = featureFlag('relationshipResonanceV1', { storage: makeMemStorage() });
  assert.equal(typeof v, 'boolean');
});

test('featureFlag: returns false for an unknown flag', () => {
  assert.equal(featureFlag('totallyNotARealFlag', { storage: makeMemStorage() }), false);
});

test('readFeatureFlags: malformed JSON falls back to defaults gracefully', () => {
  const s = makeMemStorage({ 'fufire.flags': '{not json' });
  const f = readFeatureFlags({ storage: s });
  assert.deepEqual(f, DEFAULT_FEATURE_FLAGS);
});
