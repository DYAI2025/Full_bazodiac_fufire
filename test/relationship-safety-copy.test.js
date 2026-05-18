import test from 'node:test';
import assert from 'node:assert/strict';
import { RELATIONSHIP_BANDS } from '../public/src/domain/relationshipScoreBands.js';
import {
  RELATIONSHIP_SAFETY_CAVEAT,
  BANNED_RELATIONSHIP_PHRASES,
  containsBannedRelationshipPhrase,
} from '../public/src/domain/relationshipCopy.js';

test('BANNED_RELATIONSHIP_PHRASES covers plan-mandated forbidden language', () => {
  const required = ['garantiert', 'perfekt', 'Schicksal', 'Seelenpartner', 'Soulmate', 'bestimmt', 'Match'];
  for (const p of required) {
    assert.ok(
      BANNED_RELATIONSHIP_PHRASES.some((entry) => entry.toLowerCase().includes(p.toLowerCase())),
      `BANNED_RELATIONSHIP_PHRASES missing "${p}"`,
    );
  }
});

test('containsBannedRelationshipPhrase: detects forbidden language case-insensitively', () => {
  assert.equal(containsBannedRelationshipPhrase('Ihr seid garantiert füreinander bestimmt.'), true);
  assert.equal(containsBannedRelationshipPhrase('Eure Seelenpartner-Verbindung ist perfekt.'), true);
  assert.equal(containsBannedRelationshipPhrase('Kontaktmuster, kein Urteil.'), false);
});

test('every band caveat is free of banned relationship phrases', () => {
  for (const band of Object.keys(RELATIONSHIP_BANDS)) {
    const cfg = RELATIONSHIP_BANDS[band];
    for (const field of ['label', 'meaning', 'strength', 'risk', 'caveat']) {
      assert.equal(
        containsBannedRelationshipPhrase(cfg[field]),
        false,
        `band "${band}".${field} contains banned phrase: "${cfg[field]}"`,
      );
    }
  }
});

test('RELATIONSHIP_SAFETY_CAVEAT names the index character explicitly', () => {
  assert.match(RELATIONSHIP_SAFETY_CAVEAT, /Kontaktmuster.*kein Urteil/i);
});

test('RELATIONSHIP_SAFETY_CAVEAT itself is free of banned phrases', () => {
  assert.equal(containsBannedRelationshipPhrase(RELATIONSHIP_SAFETY_CAVEAT), false);
});
