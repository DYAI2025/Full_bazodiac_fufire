// test/e2e/_helpers/theme.js
// Force ThemeToggle state BEFORE the SPA boots, so the very first render
// already uses the requested theme (no flash, no post-load mutation).
// Storage key + values mirror public/src/components/ThemeToggle.js.

const VALID = new Set(['planetarium', 'morning', 'system']);

export async function setTheme(page, value) {
  if (!VALID.has(value)) throw new Error(`unknown theme: ${value}`);
  await page.addInitScript((v) => {
    try { localStorage.setItem('bz-theme', v); } catch {}
    // Pre-set data-theme so first paint is correct even before ThemeToggle mounts.
    if (v !== 'system') {
      document.documentElement.setAttribute('data-theme', v);
    }
  }, value);
}
