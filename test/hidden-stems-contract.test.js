// Contract test for the shared hidden-stems table.
// Asserts that BY_CHAR and BY_PINYIN expose identical content (modulo key form)
// and that getHiddenStems() accepts both forms equivalently.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HIDDEN_STEMS_BY_CHAR,
  HIDDEN_STEMS_BY_PINYIN,
  BRANCH_PINYIN_TO_CHAR,
  getHiddenStems,
} from '../public/src/data/hidden-stems.js';

test('BY_CHAR covers all 12 earthly branches', () => {
  const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  for (const b of branches) {
    assert.ok(HIDDEN_STEMS_BY_CHAR[b], `missing branch ${b}`);
    assert.ok(HIDDEN_STEMS_BY_CHAR[b].length >= 1, `${b} has empty hidden-stems`);
  }
});

test('BRANCH_PINYIN_TO_CHAR maps all 12 canonical Pinyin transliterations', () => {
  const pinyins = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  for (const p of pinyins) {
    assert.ok(BRANCH_PINYIN_TO_CHAR[p], `missing pinyin ${p}`);
  }
});

test('BY_PINYIN mirrors BY_CHAR via BRANCH_PINYIN_TO_CHAR', () => {
  for (const [pinyin, char] of Object.entries(BRANCH_PINYIN_TO_CHAR)) {
    assert.deepEqual(
      HIDDEN_STEMS_BY_PINYIN[pinyin],
      HIDDEN_STEMS_BY_CHAR[char],
      `pinyin=${pinyin} char=${char} mirror broken`,
    );
  }
});

test('getHiddenStems accepts CJK character + Pinyin equivalently', () => {
  assert.deepEqual(getHiddenStems('子'), getHiddenStems('Zi'));
  assert.deepEqual(getHiddenStems('辰'), getHiddenStems('Chen'));
  assert.deepEqual(getHiddenStems('戌'), getHiddenStems('Xu'));
});

test('getHiddenStems returns [] for unknown / empty / null input', () => {
  assert.deepEqual(getHiddenStems(null), []);
  assert.deepEqual(getHiddenStems(''), []);
  assert.deepEqual(getHiddenStems('NotABranch'), []);
});

test('classical entries match documented Zàng Gān weights (sanity-checks)', () => {
  // 子 = 100% Gui Water (one entry, weight 10)
  assert.equal(HIDDEN_STEMS_BY_CHAR['子'].length, 1);
  assert.equal(HIDDEN_STEMS_BY_CHAR['子'][0].stem, '癸');
  assert.equal(HIDDEN_STEMS_BY_CHAR['子'][0].element, 'Wasser');

  // 寅 = Jia Wood (main) + Bing Fire + Wu Earth
  const yin = HIDDEN_STEMS_BY_CHAR['寅'];
  assert.equal(yin.length, 3);
  assert.equal(yin[0].stem, '甲');
  assert.equal(yin[0].polarity, 'Yang');

  // 酉 = 100% Xin Metal (Yin)
  assert.equal(HIDDEN_STEMS_BY_CHAR['酉'].length, 1);
  assert.equal(HIDDEN_STEMS_BY_CHAR['酉'][0].stem, '辛');
  assert.equal(HIDDEN_STEMS_BY_CHAR['酉'][0].polarity, 'Yin');
});
