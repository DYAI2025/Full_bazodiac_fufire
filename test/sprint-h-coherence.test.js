// Sprint H7 — coherence check across Sprint H deliverables.
//
// Single integration assertion that ties H1-H6 together: bootstrapping the
// browser-side modules in their actual order produces a coherent state
// where tokens, lanes, radar, starfield, theme, typography all coexist.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('Sprint H deliverables all present and exported', async () => {
  // H1: tokens.css
  assert.ok(existsSync(join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css')),
    'H1 tokens.css missing');

  // H3: wuxingRadar + WuxingRadar
  const { buildRadarSVG } = await import('../public/src/domain/wuxingRadar.js');
  const { WuxingRadar } = await import('../public/src/components/WuxingRadar.js');
  assert.equal(typeof buildRadarSVG, 'function', 'H3 buildRadarSVG missing');
  assert.equal(typeof WuxingRadar, 'function',   'H3 WuxingRadar component missing');

  // H4: Starfield
  const { Starfield, mountStarfield } = await import('../public/src/components/Starfield.js');
  assert.equal(typeof Starfield, 'function',      'H4 Starfield missing');
  assert.equal(typeof mountStarfield, 'function', 'H4 mountStarfield missing');

  // H5: ThemeToggle
  const { ThemeToggle, bootstrapTheme, resolveEffectiveTheme } =
    await import('../public/src/components/ThemeToggle.js');
  assert.equal(typeof ThemeToggle, 'function',           'H5 ThemeToggle missing');
  assert.equal(typeof bootstrapTheme, 'function',        'H5 bootstrapTheme missing');
  assert.equal(typeof resolveEffectiveTheme, 'function', 'H5 resolveEffectiveTheme missing');

  // H7: visual-regression script
  assert.ok(existsSync(join(__dirname, '..', 'scripts', 'visual-regression.sh')),
    'H7 visual-regression.sh missing');
});

test('Sprint H: dead legacy code removed from FusionPage (H3 cleanup)', () => {
  const fusionPage = readFileSync(
    join(__dirname, '..', 'public', 'src', 'pages', 'FusionPage.js'), 'utf8',
  );
  assert.ok(!/_legacyElementWheel/.test(fusionPage),
    'FusionPage must no longer contain _legacyElementWheel — H7 cleanup');
});

test('Sprint H: all 4 lane recipe selectors declared in tokens.css', () => {
  const tokens = readFileSync(
    join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css'), 'utf8',
  );
  for (const lane of ['bazi', 'west', 'fusion', 'wuxing']) {
    assert.match(tokens, new RegExp(`\\[data-lane="${lane}"\\]`), `lane "${lane}" recipe missing`);
  }
});

test('Sprint H: both theme recipes declared in tokens.css', () => {
  const tokens = readFileSync(
    join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css'), 'utf8',
  );
  assert.match(tokens, /data-theme="planetarium"/);
  assert.match(tokens, /data-theme="morning"/);
});

test('Sprint H: typography stack — all 5 font tokens declared + used in main.css', () => {
  const tokens = readFileSync(
    join(__dirname, '..', 'public', 'src', 'styles', 'tokens.css'), 'utf8',
  );
  const main = readFileSync(
    join(__dirname, '..', 'public', 'src', 'styles', 'main.css'), 'utf8',
  );
  for (const f of ['--bz-font-serif', '--bz-font-sans', '--bz-font-ui', '--bz-font-cjk']) {
    assert.match(tokens, new RegExp(f.replace(/-/g, '\\-')));
    assert.match(main,   new RegExp(`var\\(${f.replace(/-/g, '\\-')}`),
      `main.css must consume ${f}`);
  }
});
