import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dailySource = readFileSync(join(__dirname, '../public/src/pages/DailyPage.js'), 'utf8');

test('DailyPage wraps the API "Westlicher Impuls" / "BaZi" sections in a <details> drawer', () => {
  // VM-Cards (WesternImpulseCard etc.) bleiben prominent; API-Sections sind
  // in einem Drawer "daily-api-details", damit kein doppelter Tagespuls-Block
  // entsteht.
  assert.match(dailySource, /class="daily-api-details"|className = 'daily-api-details'|className=['"]daily-api-details['"]/);
  // API-Section-Titel sind mit "(API)" markiert, damit sie sich klar von den
  // VM-Cards unterscheiden.
  assert.match(dailySource, /Westlicher Impuls \(API\)/);
  assert.match(dailySource, /BaZi — Östlicher Impuls \(API\)/);
});

test('DailyPage contains exactly one mount for WesternImpulseCard (no duplicate top-level block)', () => {
  // Im DOM-Aufbau gibt es genau ein vm-cards-mount, und in der Promise-Then
  // genau einen Aufruf WesternImpulseCard(dailyVM.western).
  const mountCount = (dailySource.match(/vm-cards-mount/g) || []).length;
  assert.ok(mountCount >= 1, 'vm-cards-mount missing');
  const renderCount = (dailySource.match(/WesternImpulseCard\(dailyVM\.western\)/g) || []).length;
  assert.equal(renderCount, 1, `WesternImpulseCard rendered ${renderCount} times — expected 1`);
});

test('DailyPage exposes a relationship-context link (Goal §Akzeptanzkriterium 9)', () => {
  assert.match(dailySource, /class="daily-contact-link"/);
  assert.match(dailySource, /href="#\/synastry"/);
  assert.match(dailySource, /Heute in Beziehung/);
});
