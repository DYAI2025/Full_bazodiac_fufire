// Asserts that BaziPage / WesternPage / WuxingPage include the
// `<div class="sig-bar-mount"></div>` opt-in slot in their innerHTML
// template. The Solution-C plan (Task B1) lifts SignatureBar mounting
// out of individual pages and into app.js mountWithProfile() — pages opt
// in by emitting the slot, mountWithProfile fills it.
//
// The capture-DOM stub records every innerHTML string ever assigned, so
// asserting on the aggregate is a faithful proxy for "this string is in
// the page's template".

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const lina = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '_fixtures', 'upstream-snapshots', 'profile.real.json'), 'utf8'
));

async function mountPage(modPath, pageExport) {
  cap.reset();
  const mod = await import(modPath);
  const Page = mod[pageExport];
  const app = global.document.createElement('main');
  Page(app, { profile: lina, onNavigate: () => {} });
  return { agg: cap.aggregate(), app };
}

test('BaziPage: sig-bar-mount slot is present in template (opt-in marker)', async () => {
  const { agg } = await mountPage('../public/src/pages/BaziPage.js', 'BaziPage');
  assert.match(agg, /sig-bar-mount/, 'BaziPage must include sig-bar-mount slot for mountWithProfile to fill');
});

test('WesternPage: sig-bar-mount slot is present in template', async () => {
  const { agg } = await mountPage('../public/src/pages/WesternPage.js', 'WesternPage');
  assert.match(agg, /sig-bar-mount/, 'WesternPage must include sig-bar-mount slot');
});

test('WuxingPage: sig-bar-mount slot is present in template', async () => {
  const { agg } = await mountPage('../public/src/pages/WuxingPage.js', 'WuxingPage');
  assert.match(agg, /sig-bar-mount/, 'WuxingPage must include sig-bar-mount slot');
});
