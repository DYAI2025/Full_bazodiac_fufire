// Sprint-K followup — hygiene test that prevents dead CSS selectors
// inside the Sprint-K SPRINT K block in main.css. Parses class selectors
// from the @media (max-width: 480px) and @media tablet blocks and
// asserts each appears as a `className =` assignment in some JS file
// under public/src/. This catches typos + invented selectors at TDD time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const CSS_PATH  = join(REPO_ROOT, 'public', 'src', 'styles', 'main.css');
const JS_ROOT   = join(REPO_ROOT, 'public', 'src');

// ── 1. Read all JS files under public/src/ and collect every className value.
function walkJS(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJS(p, acc);
    else if (p.endsWith('.js'))    acc.push(p);
  }
  return acc;
}

function collectKnownClasses() {
  const known = new Set();
  for (const file of walkJS(JS_ROOT)) {
    const src = readFileSync(file, 'utf8');
    // Match: className = '...' or .className = "..." or `...${x}-...`
    const reAssign = /className\s*=\s*[`'"]([^`'"]+)[`'"]/g;
    let m;
    while ((m = reAssign.exec(src)) !== null) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) known.add(cls);
      }
    }
    // Also catch <... class="..."> inside template literals (innerHTML).
    const reAttr = /class=["']([^"']+)["']/g;
    while ((m = reAttr.exec(src)) !== null) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls) known.add(cls);
      }
    }
  }
  return known;
}

// ── 2. Extract the Sprint-K @media-block content from main.css.
function extractSprintKBlock() {
  const css = readFileSync(CSS_PATH, 'utf8');
  const start = css.indexOf('SPRINT K — RESPONSIVE COVERAGE');
  assert.ok(start > 0, 'main.css must contain the SPRINT K block (commit cf0d255)');
  return css.slice(start);
}

// ── 3. Extract class selectors (.foo, .foo__bar, .foo--baz) from a CSS chunk.
function extractClassSelectors(css) {
  const out = new Set();
  // Strip @media wrappers (we want selectors inside them).
  // Regex finds .ident sequences NOT preceded by colon (to skip :hover, :nth-child).
  const re = /(?<![:#\w-])\.([A-Za-z_][\w-]*)/g;
  let m;
  while ((m = re.exec(css)) !== null) out.add(m[1]);
  return out;
}

// ── Allow-list for non-class artifacts that pass the regex.
// These are CSS-only artifacts that the JS never sets directly because
// they live inside template-literal innerHTML strings or are CSS-only.
const ALLOW_KNOWN_TEMPLATE = new Set([
  // Add here if any selector is provably-used-via-innerHTML-template.
  // BEM modifiers set via dynamic template strings (not literal className =):
  'luxury-card--hero',  // LuxuryCard.js: `'luxury-card' + (variant ? \` luxury-card--${variant}\` : '')`
]);

test('Sprint-K @media selectors all exist as className assignments in public/src/', () => {
  const known = collectKnownClasses();
  const block = extractSprintKBlock();
  const used  = extractClassSelectors(block);

  const dead = [];
  for (const cls of used) {
    if (!known.has(cls) && !ALLOW_KNOWN_TEMPLATE.has(cls)) {
      dead.push(cls);
    }
  }

  assert.equal(dead.length, 0,
    `Sprint-K @media block references ${dead.length} dead class selector(s): ${dead.join(', ')}.\n` +
    `Each must appear as a className assignment under public/src/ — or be added to ALLOW_KNOWN_TEMPLATE.`);
});
