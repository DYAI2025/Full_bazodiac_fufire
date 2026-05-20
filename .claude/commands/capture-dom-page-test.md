---
description: Generate TDD-style DOM-smoke test skeleton for a new Sprint-E page using capture-DOM-stub + 3-persona fixtures + noFakeDataGuard + noFakeMathGuard
allowed-tools: Bash, Read, Write
---

## Context

Every Sprint-E page (BaziPage, WesternPage, WuxingPage, HousesPage, MethodPage) ships with a `test/<page-slug>-page.test.js` file built on the same skeleton: capture-DOM stub bootstrap → load 3 personas (lina/persona2/persona3) → mount the page per persona → assert aggregate passes `noFakeDataGuard` + `noFakeMathGuard` + contains expected API-derived strings. Same boilerplate, 5+ times. This skill generates it.

Project-local because it references this repo's exact paths: `test/_helpers/dom-capture-stub.js`, `test/_fixtures/upstream-snapshots/profile.{real,persona2,persona3}.json`, `public/src/api/client.js` guards.

## Your Task

Given a new page module path + page export name, generate a passing-out-of-the-box test file with full 3-persona coverage.

### Steps

1. **Read inputs from `$ARGUMENTS`** or prompt: path to page module (`public/src/pages/HousesPage.js`) + export name (`HousesPage`) + optional list of expected German strings the page must surface.

2. **Determine test path** by convention: `test/<lowercase-page-name>-page.test.js`.

3. **Generate the test file** using this template:
   ```js
   // DOM-smoke tests for <PageName> — capture-DOM stub + 3-persona sweep.
   import test from 'node:test';
   import assert from 'node:assert/strict';
   import { readFileSync } from 'node:fs';
   import { fileURLToPath } from 'node:url';
   import { dirname, join } from 'node:path';
   import { installCaptureDom } from './_helpers/dom-capture-stub.js';

   const cap = installCaptureDom();
   function loadFixture(name) {
     const __dirname = dirname(fileURLToPath(import.meta.url));
     return JSON.parse(readFileSync(
       join(__dirname, '_fixtures', 'upstream-snapshots', name), 'utf8'
     ));
   }
   const lina     = loadFixture('profile.real.json');
   const persona2 = loadFixture('profile.persona2.json');
   const persona3 = loadFixture('profile.persona3.json');

   const { <ExportName> } = await import('<MODULE_PATH>');
   const { noFakeDataGuard, noFakeMathGuard } =
     await import('../public/src/api/client.js');

   function freshApp() { cap.reset(); return global.document.createElement('main'); }
   function aggregate() { return cap.aggregate(); }

   test('<PageName>: renders Lina profile + passes both guards', () => {
     const app = freshApp();
     assert.doesNotThrow(() => <ExportName>(app, { profile: lina, onNavigate: () => {} }));
     const agg = aggregate();
     assert.doesNotThrow(() => noFakeDataGuard(agg, '<page-slug>:lina'));
     assert.doesNotThrow(() => noFakeMathGuard(agg, '<page-slug>:lina'));
     // EXPECTED_STRINGS: add asserts here per page intent.
   });

   test('<PageName>: Persona2 (Yin Yi-Holz DM) renders without crash', () => {
     const app = freshApp();
     <ExportName>(app, { profile: persona2, onNavigate: () => {} });
     const agg = aggregate();
     assert.doesNotThrow(() => noFakeDataGuard(agg, '<page-slug>:persona2'));
     assert.doesNotThrow(() => noFakeMathGuard(agg, '<page-slug>:persona2'));
   });

   test('<PageName>: Persona3 (Yin Gui-Wasser DM, extreme distribution) renders without crash', () => {
     const app = freshApp();
     <ExportName>(app, { profile: persona3, onNavigate: () => {} });
     const agg = aggregate();
     assert.doesNotThrow(() => noFakeDataGuard(agg, '<page-slug>:persona3'));
     assert.doesNotThrow(() => noFakeMathGuard(agg, '<page-slug>:persona3'));
   });

   test('<PageName>: missing profile section renders UnavailableCard fallback', () => {
     const app = freshApp();
     <ExportName>(app, { profile: { bazi: null, western: null, fusion: null }, onNavigate: () => {} });
     // Customize: replace with assertion matching the page's specific fallback text.
   });
   ```

4. **Add a route test to `test/page-render-integration.test.js`** following the existing pattern (assertAggregatePasses + assertContainsApiValues with the page's expected strings).

5. **Run the new test file** to verify RED → expected output before fix-write.

### Guardrails

- **Always use `installCaptureDom()` at module top, BEFORE any page-module import.** Page modules touch `document` at top-level via component evaluations — stub must exist first.
- **Never `cap.reset()` outside `freshApp()`.** Resetting mid-test invalidates the aggregate accumulator.
- **Both guards always.** `noFakeDataGuard` catches demo strings; `noFakeMathGuard` catches broken WuXing %% math. Tests without both leak regressions.
- **Personas as constants, not factory functions.** Loading from disk per test is wasteful and breaks if file is renamed; load once at module top.
- **`onNavigate: () => {}` always passed in test mounts.** Pages call `onNavigate?.()` defensively but some still register listeners that fail if undefined.

### When to use

- Adding a new page to Sprint E (or any future page-style module)
- Refactoring an existing page where its test is missing or thin
- Generating regression coverage for a finding from `/code-reviewer`

### When NOT to use

- For domain-module tests (use `node --test` with direct asserts; no stub needed)
- For tests that need full real DOM (`<canvas>`, `<video>`, animations) — capture-stub doesn't model those
- For pages that don't render synchronously (use a different skeleton with await + microtask flush)

---
*Generated by /reflect-skills from 5 Sprint-E page-test files following this exact skeleton.*
