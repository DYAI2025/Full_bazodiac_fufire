import test from 'node:test';
import assert from 'node:assert/strict';
import { todayNewCardModel } from '../public/src/components/TodayNewCard.js';

test('todayNewCardModel passes through title + bullets up to 3', () => {
  const m = todayNewCardModel({
    title: 'Heute neu',
    isFirstDay: false,
    points: ['A', 'B', 'C', 'D'],
  });
  assert.equal(m.title, 'Heute neu');
  assert.equal(m.points.length, 3);
  assert.equal(m.isFirstDay, false);
});

test('todayNewCardModel uses Ersttag-Title when isFirstDay=true and no points', () => {
  const m = todayNewCardModel({ isFirstDay: true, points: [] });
  assert.ok(m.title);
  assert.ok(m.points.length >= 1, 'must surface at least one Ersttag bullet');
});

test('todayNewCardModel never returns empty state (defensive default)', () => {
  const m = todayNewCardModel(null);
  assert.ok(m.points.length >= 1);
});
