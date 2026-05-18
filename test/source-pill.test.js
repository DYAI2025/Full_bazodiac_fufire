import test from 'node:test';
import assert from 'node:assert/strict';
import { sourcePillLabel, sourcePillTooltip } from '../public/src/components/SourcePill.js';

test('sourcePillLabel: maps technical sources to user-friendly labels', () => {
  assert.equal(sourcePillLabel('api'),                   'Berechnet');
  assert.equal(sourcePillLabel('api_aggregated'),        'Fusioniert');
  assert.equal(sourcePillLabel('derived_mapping'),       'Abgeleitet');
  assert.equal(sourcePillLabel('static_interpretation'), 'Gedeutet');
  assert.equal(sourcePillLabel('static_fallback'),       'Fallback');
  assert.equal(sourcePillLabel('llm_narrative'),         'Erklärt');
  assert.equal(sourcePillLabel('unavailable'),           'Fehlt');
});

test('sourcePillLabel: unknown source falls back to raw key', () => {
  assert.equal(sourcePillLabel('foo_bar'), 'foo_bar');
});

test('sourcePillTooltip: returns technical source name for hover', () => {
  assert.equal(sourcePillTooltip('api'),           'Quelle: api');
  assert.equal(sourcePillTooltip('llm_narrative'), 'Quelle: llm_narrative');
});
