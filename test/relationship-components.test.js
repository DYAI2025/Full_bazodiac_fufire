import test from 'node:test';
import assert from 'node:assert/strict';
import { relationshipSummaryHeroModel } from '../public/src/components/RelationshipSummaryHero.js';
import { resonanceScoreBandModel }      from '../public/src/components/ResonanceScoreBand.js';
import { relationshipSignalCardModel }  from '../public/src/components/RelationshipSignalCard.js';
import { contactExperimentCardModel }   from '../public/src/components/ContactExperimentCard.js';
import { containsBannedRelationshipPhrase } from '../public/src/domain/relationshipCopy.js';

// RelationshipSummaryHero
test('relationshipSummaryHeroModel: requires exactly 3 statements, attaches caveat', () => {
  const m = relationshipSummaryHeroModel({
    statements: ['Was euch verbindet: X.', 'Wo Reibung entsteht: Y.', 'Was hilft: Z.'],
    caveat:     'Kontaktmuster, kein Urteil.',
  });
  assert.equal(m.statements.length, 3);
  assert.match(m.caveat, /Kontaktmuster.*kein Urteil/);
});

test('relationshipSummaryHeroModel: throws-or-defaults on wrong count', () => {
  const m = relationshipSummaryHeroModel({ statements: ['only one'] });
  assert.equal(m.statements.length, 3);
  assert.ok(m.statements[1].length > 0, 'must pad missing statements');
});

test('relationshipSummaryHeroModel: default caveat present even if not provided', () => {
  const m = relationshipSummaryHeroModel({ statements: ['a','b','c'] });
  assert.ok(m.caveat && m.caveat.length > 10);
});

// ResonanceScoreBand
test('resonanceScoreBandModel: passes through score + band + copy fields', () => {
  const m = resonanceScoreBandModel({ score: 68, label: 'Resonanz-Index' });
  assert.equal(m.score, 68);
  assert.equal(m.band, 'strong');
  assert.ok(m.meaning && m.strength && m.risk && m.caveat);
});

test('resonanceScoreBandModel: null score renders as unknown without false confidence', () => {
  const m = resonanceScoreBandModel({ score: null });
  assert.equal(m.band, 'unknown');
});

test('resonanceScoreBandModel: caveat is not a match-deterministic claim', () => {
  for (const score of [25, 55, 75, 95]) {
    const m = resonanceScoreBandModel({ score });
    assert.equal(containsBannedRelationshipPhrase(m.meaning), false);
    assert.equal(containsBannedRelationshipPhrase(m.strength), false);
    assert.equal(containsBannedRelationshipPhrase(m.risk),     false);
  }
});

// RelationshipSignalCard
test('relationshipSignalCardModel: preserves title, summary, evidence, sourceLayer', () => {
  const m = relationshipSignalCardModel({
    kind: 'connection',
    title: 'Hauptverbindung: Venus–Mars Trigon',
    summary: 'Natürlicher Fluss.',
    evidence: ['Venus (A) ↔ Mars (B) — Trigon', 'Orb 1.2°'],
    sourceLayer: 'synastry-aspect',
  });
  assert.equal(m.kind, 'connection');
  assert.equal(m.evidence.length, 2);
  assert.equal(m.sourceLayer, 'synastry-aspect');
});

test('relationshipSignalCardModel: friction kind keeps separate styling hook', () => {
  const m = relationshipSignalCardModel({ kind: 'friction', title: 'T', summary: 'S' });
  assert.equal(m.kind, 'friction');
});

test('relationshipSignalCardModel: empty evidence -> empty array, not null', () => {
  const m = relationshipSignalCardModel({ title: 'T', summary: 'S' });
  assert.deepEqual(m.evidence, []);
});

// ContactExperimentCard
test('contactExperimentCardModel: requires title, instruction, reflectionQuestion, sourceReason', () => {
  const m = contactExperimentCardModel({
    title: '24h Kontakt-Experiment',
    instruction: 'Sprecht direkter.',
    reflectionQuestion: 'Wurde es leichter?',
    sourceReason: 'Test',
    tags: ['Klarheit', '24 Stunden'],
  });
  assert.equal(m.title, '24h Kontakt-Experiment');
  assert.equal(m.tags.length, 2);
  assert.equal(m.sourceReason, 'Test');
});

test('contactExperimentCardModel: empty input -> placeholders not "gleich verfügbar"', () => {
  const m = contactExperimentCardModel({});
  assert.ok(m.title);
  assert.ok(m.instruction);
  assert.ok(m.reflectionQuestion);
  assert.ok(!/gleich verfügbar/i.test(JSON.stringify(m)));
});
