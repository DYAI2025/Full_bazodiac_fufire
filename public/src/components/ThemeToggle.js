// Sprint H5 — three-state theme toggle: system | planetarium | morning.
//
// User-decision 4 (plan §H5): system default via prefers-color-scheme.
// When state is "system", reads window.matchMedia('(prefers-color-scheme: dark)')
// to derive the effective theme. State persists in localStorage 'bz-theme'.
// On `<html data-theme="...">` the value 'planetarium' (dark) or 'morning'
// (light) is set explicitly so tokens.css recipes apply.

const STORAGE_KEY = 'bz-theme';
const VALID_STATES = ['system', 'planetarium', 'morning'];

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return VALID_STATES.includes(raw) ? raw : 'system';
  } catch { return 'system'; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, state); } catch { /* private mode */ }
}

// Resolve "system" → "planetarium" | "morning" via prefers-color-scheme.
export function resolveEffectiveTheme(state) {
  if (state === 'planetarium' || state === 'morning') return state;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'planetarium' : 'morning';
  }
  return 'planetarium'; // dark default if matchMedia missing
}

// Apply the effective theme attribute on <html> so CSS-recipe selectors
// `[data-theme="planetarium"]` / `[data-theme="morning"]` activate.
export function applyTheme(state) {
  const effective = resolveEffectiveTheme(state);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', effective);
    // Also expose the user-selected state for UI (e.g. active-button styling).
    document.documentElement.setAttribute('data-theme-state', state);
  }
  return effective;
}

export function ThemeToggle() {
  const wrap = document.createElement('div');
  wrap.className = 'theme-toggle';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Theme-Auswahl');

  const currentState = readState();

  const states = [
    { value: 'system',      label: 'System',     glyph: '⚙︎', title: 'System-Default (prefers-color-scheme)' },
    { value: 'planetarium', label: 'Dunkel',     glyph: '☾',  title: 'Planetarium — dunkles Theme' },
    { value: 'morning',     label: 'Hell',       glyph: '☼',  title: 'Morgen — helles Theme' },
  ];

  for (const s of states) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle__btn';
    btn.setAttribute('data-theme-state', s.value);
    btn.setAttribute('title', s.title);
    btn.setAttribute('aria-label', `Theme: ${s.label}`);
    if (s.value === currentState) btn.setAttribute('data-active', 'true');
    btn.textContent = s.glyph;
    btn.addEventListener('click', () => {
      saveState(s.value);
      applyTheme(s.value);
      // Update active markers across all sibling buttons.
      for (const sib of wrap._children || wrap.querySelectorAll?.('.theme-toggle__btn') || []) {
        sib.removeAttribute?.('data-active');
      }
      btn.setAttribute('data-active', 'true');
    });
    wrap.appendChild(btn);
  }

  // Listen for system-pref changes when in "system" state — re-resolve.
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readState() === 'system') applyTheme('system');
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
  }

  return wrap;
}

// Apply persisted theme at boot. Call once from app.js before / alongside
// mountGlobalNav so the toggle renders with the correct active state.
export function bootstrapTheme() {
  applyTheme(readState());
}
