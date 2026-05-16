import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePayload } from '../server.js';

test('validatePayload: valid full payload returns { valid: true }', () => {
  const result = validatePayload({
    date: '1990-03-15',
    time: '14:30',
    lat: 48.137,
    lon: 11.576,
    tz: 'Europe/Berlin',
  });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: ISO datetime date string accepted', () => {
  const result = validatePayload({ date: '1990-03-15T14:30:00', lat: 48.0, lon: 11.0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: missing date returns error', () => {
  const result = validatePayload({ lat: 48.0, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('date')));
});

test('validatePayload: empty date string returns error', () => {
  const result = validatePayload({ date: '', lat: 48.0, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('date')));
});

test('validatePayload: garbage date string returns error', () => {
  const result = validatePayload({ date: 'not-a-date', lat: 48.0, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('date')));
});

test('validatePayload: missing lat returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lat')));
});

test('validatePayload: missing lon returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lon')));
});

test('validatePayload: lat out of range (-91) returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: -91, lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lat')));
});

test('validatePayload: lon out of range (181) returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0, lon: 181 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lon')));
});

test('validatePayload: non-numeric lat returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 'north', lon: 11.0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lat')));
});

test('validatePayload: lat=0, lon=0 is valid (Gulf of Guinea)', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 0, lon: 0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: multiple errors collected at once', () => {
  const result = validatePayload({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test('validatePayload: accepts datetime alias field', () => {
  const result = validatePayload({ datetime: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: accepts latitude/longitude aliases', () => {
  const result = validatePayload({ date: '1990-03-15', latitude: 48.0, longitude: 11.0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: string body is parsed', () => {
  const result = validatePayload(JSON.stringify({ date: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'UTC' }));
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: invalid JSON string returns error', () => {
  const result = validatePayload('{not json}');
  assert.equal(result.valid, false);
});

test('validatePayload: missing tz returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.137, lon: 11.576 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('tz')), `expected tz error, got: ${JSON.stringify(result.errors)}`);
});

test('validatePayload: accepts timezone alias', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.137, lon: 11.576, timezone: 'Europe/Berlin' });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: obvious garbage tz returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'not a timezone!' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('tz')), `expected tz error, got: ${JSON.stringify(result.errors)}`);
});

test('validatePayload: single-char tz returns error', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'x' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('tz')));
});

test('validatePayload: UTC is valid tz', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'UTC' });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: Etc/GMT+2 is valid tz', () => {
  const result = validatePayload({ date: '1990-03-15', lat: 48.0, lon: 11.0, tz: 'Etc/GMT+2' });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: location.latitude + location.longitude alias works', () => {
  const result = validatePayload({
    date: '1990-03-15',
    location: { latitude: 48.137, longitude: 11.576 },
    tz: 'UTC',
  });
  assert.deepEqual(result, { valid: true });
});

test('validatePayload: location.latitude out of range returns error', () => {
  const result = validatePayload({
    date: '1990-03-15',
    location: { latitude: 99, longitude: 11.576 },
    tz: 'UTC',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('lat')));
});
