import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shareCardModel,
  buildShareCardText,
  SHARE_CARD_FORBIDDEN_KEYS,
} from '../public/src/components/PrivacySafeShareCard.js';

const sampleAnalysis = {
  resonanceIndex: 68,
  resonanceBand:  'strong',
  bandDetails: { label: 'starke Resonanz mit Lernfeld' },
  summaryStatements: [
    'Was euch verbindet: geistige Aktivierung und schnelle Kontaktbewegung.',
    'Wo Reibung entsteht: Nähe wird unterschiedlich reguliert.',
    'Was hilft: eine konkrete Frage stellen, bevor ihr Verhalten interpretiert.',
  ],
  safetyCaveat: 'Kontaktmuster, kein Urteil. Diese Auswertung beschreibt Resonanz und Reibung, keine Beziehungsgarantie.',
};

test('SHARE_CARD_FORBIDDEN_KEYS covers birth-data fields', () => {
  for (const key of ['birthDate', 'birthTime', 'birthPlace', 'rawChart', 'lat', 'lon']) {
    assert.ok(SHARE_CARD_FORBIDDEN_KEYS.includes(key), `forbidden list missing ${key}`);
  }
});

test('shareCardModel: returns title, aliases, summary, resonanceBand, caveat, createdAt', () => {
  const m = shareCardModel({ analysis: sampleAnalysis, aliasA: 'A.', aliasB: 'B.' });
  assert.ok(m.title);
  assert.deepEqual(m.aliases, ['A.', 'B.']);
  assert.ok(m.summary && m.summary.length > 0);
  assert.ok(m.summary.length <= 220, `summary too long: ${m.summary.length}`);
  assert.equal(m.resonanceBand, 'strong');
  assert.match(m.caveat, /Kontaktmuster.*kein Urteil/);
  assert.ok(m.createdAt);
});

test('shareCardModel: trims aliases to display-safe length and refuses empty', () => {
  const m = shareCardModel({ analysis: sampleAnalysis, aliasA: '', aliasB: '' });
  assert.equal(m.aliases.length, 2);
  for (const a of m.aliases) {
    assert.ok(a && a.length <= 40);
  }
});

test('shareCardModel: redacts forbidden keys even when caller supplies them', () => {
  const dirty = {
    analysis: sampleAnalysis,
    aliasA: 'A.', aliasB: 'B.',
    birthDate: '1990-01-01',
    birthTime: '12:00',
    birthPlace: 'Berlin, DE',
    lat: 52.52, lon: 13.40,
    rawChart: { positions: [/* …*/] },
  };
  const m = shareCardModel(dirty);
  const serialized = JSON.stringify(m);
  for (const banned of SHARE_CARD_FORBIDDEN_KEYS) {
    assert.equal(banned in m, false, `share card leaked ${banned} field`);
  }
  assert.ok(!serialized.includes('1990-01-01'),  'birthDate leaked into model');
  assert.ok(!serialized.includes('12:00'),       'birthTime leaked into model');
  assert.ok(!serialized.includes('Berlin'),      'birthPlace leaked into model');
  assert.ok(!serialized.includes('52.52'),       'lat leaked into model');
  assert.ok(!serialized.includes('13.4'),        'lon leaked into model');
});

test('buildShareCardText: produces shareable plain text without any forbidden value', () => {
  const text = buildShareCardText({ analysis: sampleAnalysis, aliasA: 'A.', aliasB: 'B.' });
  assert.ok(typeof text === 'string' && text.length > 50);
  assert.match(text, /Kontaktmuster.*kein Urteil/);
  // Ensure no birth data accidentally serialized
  assert.ok(!/\b\d{4}-\d{2}-\d{2}\b/.test(text), 'date leaked');
  assert.ok(!/\d{1,2}:\d{2}\b/.test(text),        'time leaked');
});

test('shareCardModel: summary trims when source statements are very long', () => {
  const long = {
    ...sampleAnalysis,
    summaryStatements: [
      'Was euch verbindet: ' + 'X'.repeat(300),
      'Wo Reibung entsteht: ' + 'Y'.repeat(300),
      'Was hilft: ' + 'Z'.repeat(300),
    ],
  };
  const m = shareCardModel({ analysis: long, aliasA: 'A.', aliasB: 'B.' });
  assert.ok(m.summary.length <= 220);
});

test('shareCardModel: title carries no deterministic relationship label', () => {
  const m = shareCardModel({ analysis: sampleAnalysis, aliasA: 'A.', aliasB: 'B.' });
  assert.ok(!/Match|Soulmate|garantiert|perfekt|Schicksal/i.test(m.title));
});
