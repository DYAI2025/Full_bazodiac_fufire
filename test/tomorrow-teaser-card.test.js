import test from 'node:test';
import assert from 'node:assert/strict';
import { tomorrowTeaserModel } from '../public/src/components/TomorrowTeaserCard.js';

test('tomorrowTeaserModel preserves teaser + href + linkLabel', () => {
  const m = tomorrowTeaserModel({
    teaser: 'Morgen aktiviert sich Sichtbarkeit.',
    href: '/transits',
    linkLabel: 'Zur Wochenvorschau',
  });
  assert.match(m.teaser, /Morgen/);
  assert.equal(m.href, '/transits');
  assert.equal(m.linkLabel, 'Zur Wochenvorschau');
});

test('tomorrowTeaserModel falls back when teaser missing', () => {
  const m = tomorrowTeaserModel({ teaser: '' });
  assert.ok(m.teaser.length > 0);
  assert.equal(m.href, '/transits');
});

test('tomorrowTeaserModel: no dramatic urgency words in default teaser', () => {
  const m = tomorrowTeaserModel({});
  assert.ok(!/verpasst|gefahr|achtung!|musst|schicksal/i.test(m.teaser));
});
