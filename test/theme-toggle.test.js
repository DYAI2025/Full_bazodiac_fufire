// Sprint H5 — three-state theme toggle.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();

// Stub localStorage + matchMedia for tests.
const lsStore = new Map();
global.localStorage = {
  getItem(k) { return lsStore.has(k) ? lsStore.get(k) : null; },
  setItem(k, v) { lsStore.set(k, String(v)); },
  removeItem(k) { lsStore.delete(k); },
};

let prefersDark = true;
global.window.matchMedia = (q) => ({
  matches: q.includes('dark') ? prefersDark : !prefersDark,
  addEventListener() {},
  removeEventListener() {},
});

// document.documentElement stub
global.document.documentElement = {
  _attrs: {},
  setAttribute(k, v) { this._attrs[k] = v; },
  getAttribute(k) { return this._attrs[k]; },
};

const { ThemeToggle, resolveEffectiveTheme, applyTheme, bootstrapTheme } =
  await import('../public/src/components/ThemeToggle.js');

test('resolveEffectiveTheme: explicit states pass through', () => {
  assert.equal(resolveEffectiveTheme('planetarium'), 'planetarium');
  assert.equal(resolveEffectiveTheme('morning'), 'morning');
});

test('resolveEffectiveTheme: "system" resolves via prefers-color-scheme', () => {
  prefersDark = true;
  assert.equal(resolveEffectiveTheme('system'), 'planetarium');
  prefersDark = false;
  assert.equal(resolveEffectiveTheme('system'), 'morning');
  prefersDark = true; // reset
});

test('applyTheme: sets data-theme attribute on documentElement', () => {
  applyTheme('planetarium');
  assert.equal(global.document.documentElement.getAttribute('data-theme'), 'planetarium');
  applyTheme('morning');
  assert.equal(global.document.documentElement.getAttribute('data-theme'), 'morning');
});

test('applyTheme: "system" sets the effective resolved theme, plus data-theme-state="system"', () => {
  prefersDark = true;
  applyTheme('system');
  assert.equal(global.document.documentElement.getAttribute('data-theme'), 'planetarium');
  assert.equal(global.document.documentElement.getAttribute('data-theme-state'), 'system');
});

test('bootstrapTheme: reads persisted state from localStorage', () => {
  lsStore.set('bz-theme', 'morning');
  bootstrapTheme();
  assert.equal(global.document.documentElement.getAttribute('data-theme'), 'morning');
  // Cleanup
  lsStore.delete('bz-theme');
});

test('bootstrapTheme: defaults to "system" when nothing persisted', () => {
  lsStore.delete('bz-theme');
  prefersDark = true;
  bootstrapTheme();
  assert.equal(global.document.documentElement.getAttribute('data-theme'), 'planetarium',
    'system + prefers-dark must resolve to planetarium');
  assert.equal(global.document.documentElement.getAttribute('data-theme-state'), 'system');
});

test('ThemeToggle: renders exactly 3 buttons with correct data-theme-state attrs', () => {
  cap.reset();
  const toggle = ThemeToggle();
  assert.equal(toggle.tag, 'div');
  assert.equal(toggle._attrs['role'], 'group');
  assert.equal(toggle._children.length, 3);
  assert.equal(toggle._children[0]._attrs['data-theme-state'], 'system');
  assert.equal(toggle._children[1]._attrs['data-theme-state'], 'planetarium');
  assert.equal(toggle._children[2]._attrs['data-theme-state'], 'morning');
});

test('ThemeToggle: active button matches persisted state', () => {
  lsStore.set('bz-theme', 'morning');
  cap.reset();
  const toggle = ThemeToggle();
  const morning = toggle._children.find((b) => b._attrs['data-theme-state'] === 'morning');
  assert.equal(morning._attrs['data-active'], 'true');
  lsStore.delete('bz-theme');
});

test('ThemeToggle: clicking a button persists state + applies theme', () => {
  lsStore.clear();
  cap.reset();
  const toggle = ThemeToggle();
  const morningBtn = toggle._children.find((b) => b._attrs['data-theme-state'] === 'morning');
  // Invoke click handler
  morningBtn._listeners.click[0]();
  assert.equal(lsStore.get('bz-theme'), 'morning', 'state must persist to localStorage');
  assert.equal(global.document.documentElement.getAttribute('data-theme'), 'morning');
});
