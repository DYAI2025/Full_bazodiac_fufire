import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEM_MEANINGS, BRANCH_MEANINGS, WUXING_MEANINGS, WESTERN_SIGN_MEANINGS,
  HOUSE_MEANINGS, COHERENCE_MEANINGS, PILLAR_ROLES,
  lookupStem, lookupBranch, lookupElement, lookupSign, lookupHouse, lookupCoherenceBand,
} from '../public/src/domain/meanings.js';

test('STEM_MEANINGS covers all 10 heavenly stems', () => {
  const stems = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  for (const s of stems) assert.ok(STEM_MEANINGS[s], `missing stem ${s}`);
});

test('BRANCH_MEANINGS covers all 12 earthly branches', () => {
  const branches = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  for (const b of branches) assert.ok(BRANCH_MEANINGS[b], `missing branch ${b}`);
});

test('WUXING_MEANINGS: all five elements have meaning/strong/weak/over/balance', () => {
  for (const el of ['Holz','Feuer','Erde','Metall','Wasser']) {
    const m = WUXING_MEANINGS[el];
    assert.ok(m, `missing element ${el}`);
    for (const k of ['meaning','strong','weak','over','balance']) {
      assert.ok(m[k] && m[k].length > 8, `${el}.${k} missing`);
    }
  }
});

test('WESTERN_SIGN_MEANINGS covers all 12 signs with resource+shadow+practice', () => {
  const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  for (const s of signs) {
    const m = WESTERN_SIGN_MEANINGS[s];
    assert.ok(m, `missing sign ${s}`);
    for (const k of ['de','element','mode','resource','shadow','practice']) {
      assert.ok(m[k], `${s}.${k} missing`);
    }
  }
});

test('HOUSE_MEANINGS: all 12 houses carry glyph + label + context', () => {
  for (let i = 1; i <= 12; i++) {
    const m = HOUSE_MEANINGS[i];
    assert.ok(m, `missing house ${i}`);
    assert.ok(m.glyph && m.label && m.context);
  }
});

test('PILLAR_ROLES: year/month/day/hour all defined', () => {
  for (const k of ['year','month','day','hour']) assert.ok(PILLAR_ROLES[k]?.role);
});

test('COHERENCE_MEANINGS: every band carries caveat that frames index, not judgement', () => {
  for (const band of ['low','mixed','high','veryHigh','unknown']) {
    const m = COHERENCE_MEANINGS[band];
    assert.ok(m);
    assert.match(m.caveat, /Index.*Urteil|kein Gut|kein Persönlichkeit/i);
  }
});

test('lookupStem: returns fallback object rather than null/empty for unknown stem', () => {
  const fb = lookupStem('NotARealStem');
  assert.ok(fb);
  assert.ok(fb.resource && fb.resource.length > 5);
});

test('lookupBranch: fallback object for unknown input', () => {
  const fb = lookupBranch('UnknownBranch');
  assert.ok(fb && fb.resource);
});

test('lookupElement: returns null for unknown (caller decides fallback)', () => {
  assert.equal(lookupElement('NotAnElement'), null);
});

test('lookupCoherenceBand: defaults to unknown when band missing', () => {
  assert.equal(lookupCoherenceBand('not-a-band').band, 'unknown');
});

test('lookupHouse: returns null outside 1..12 range', () => {
  assert.equal(lookupHouse(0), null);
  assert.equal(lookupHouse(13), null);
  assert.ok(lookupHouse(7));
});

test('no entry in the meaning maps contains "Keine Beschreibung verfügbar"', () => {
  const blob = JSON.stringify({ STEM_MEANINGS, BRANCH_MEANINGS, WUXING_MEANINGS, WESTERN_SIGN_MEANINGS, HOUSE_MEANINGS, COHERENCE_MEANINGS });
  assert.ok(!/Keine Beschreibung verfügbar/i.test(blob));
});

test('STEM_MEANINGS.Wu and BRANCH_MEANINGS.Wu resolve to different elements (documented collision)', () => {
  assert.equal(STEM_MEANINGS.Wu.element,   'Erde');  // 戊 — Yang Earth stem
  assert.equal(BRANCH_MEANINGS.Wu.element, 'Feuer'); // 午 — Horse / Yang Fire branch
});

test('lookupStem("戊") and lookupBranch("午") map through CHAR_TO_PINYIN bridges', () => {
  assert.equal(lookupStem('戊').element,   'Erde');
  assert.equal(lookupBranch('午').element, 'Feuer');
});

test('lookupStem fallback: dedicated copy mentions Stamm-Zuordnung, not "unbekannt"', () => {
  const fb = lookupStem('NotARealStem');
  assert.match(fb.resource, /Stamm-Zuordnung fehlt/);
  assert.equal(fb.element, undefined);
});

test('lookupBranch fallback: dedicated copy mentions Zweig-Zuordnung, not "unbekannt"', () => {
  const fb = lookupBranch('UnknownBranch');
  assert.match(fb.resource, /Zweig-Zuordnung fehlt/);
});
