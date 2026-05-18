import test from 'node:test';
import assert from 'node:assert/strict';
import { threeDoorsModel } from '../public/src/components/ThreeDoors.js';

test('threeDoorsModel defaults to three signature doors in fixed order', () => {
  const m = threeDoorsModel();
  assert.equal(m.doors.length, 3);
  assert.deepEqual(m.doors.map(d => d.path), ['/daily', '/love', '/career-finance']);
});

test('threeDoorsModel accepts custom doors list', () => {
  const custom = [
    { path: '/foo', eyebrow: 'X', title: 'Foo', hint: 'bar' },
    { path: '/baz', eyebrow: 'Y', title: 'Baz', hint: 'qux' },
  ];
  const m = threeDoorsModel({ doors: custom });
  assert.equal(m.doors.length, 2);
  assert.equal(m.doors[0].path, '/foo');
});
