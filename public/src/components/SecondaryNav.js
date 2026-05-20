// Top tab-strip — primary navigation across the 9 design-mockup routes.
//
// Renders <button> per ROUTES entry. Active state via data-active="true"
// (matches current location.hash). Lane attribute (data-lane) drives
// Phase-C lane-color styling (see public/src/styles/main.css).
//
// Click handlers update window.location.hash — the existing hash-router
// in router.js picks the change up and dispatches the corresponding page.
// Unknown routes (e.g. /method before Sprint E#5 builds the page) fall
// through the router gracefully without crashing.

import { ROUTES } from '../data/routes.js';

export function SecondaryNav() {
  const nav = document.createElement('nav');
  nav.className = 'secondary-nav';
  nav.setAttribute('aria-label', 'Hauptnavigation');

  const currentHash = (typeof window !== 'undefined' && window.location?.hash) || '#/';
  const currentPath = currentHash.replace(/^#\/?/, '/').replace(/^\/+/, '/') || '/';

  for (const route of ROUTES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary-nav__tab';
    // Use setAttribute (not dataset.*) so capture-DOM-stub records under _attrs.
    btn.setAttribute('data-lane', route.lane);
    btn.setAttribute('data-path', route.path);
    if (route.path === currentPath) {
      btn.setAttribute('data-active', 'true');
    }
    btn.textContent = route.label;
    btn.addEventListener('click', () => {
      if (typeof window !== 'undefined') {
        window.location.hash = '#' + route.path;
      }
    });
    nav.appendChild(btn);
  }
  return nav;
}

// Resolve the currently active route-path from window.location.hash. Returns
// '/' when no hash is set (initial load). Pure for testability.
function pathFromHash() {
  const raw = (typeof window !== 'undefined' && window.location?.hash) || '#/';
  return raw.replace(/^#\/?/, '/').replace(/^\/+/, '/') || '/';
}

// Iterate over rendered .secondary-nav__tab elements WITHOUT touching the
// capture-DOM stub's private _children. querySelectorAll is the canonical
// path; the stub also supports it (see test/_helpers/dom-capture-stub.js
// querySelectorAll mock).
function tabsOf(nav) {
  if (!nav) return [];
  if (typeof nav.querySelectorAll === 'function') {
    const list = nav.querySelectorAll('.secondary-nav__tab');
    if (list && list.length) return Array.from(list);
  }
  return Array.from(nav._children || []);
}

// Mount the SecondaryNav once at app boot, then keep its data-active state
// in sync with the URL hash. Called from app.js after the router starts.
// Re-init safe: clears host before re-appending so hot-reload / re-import
// can not produce duplicated navs (same bug class as the duplicate-strip
// regression test guards against in test/transit-calendar-page.test.js).
export function mountGlobalNav(host) {
  if (!host || typeof host.appendChild !== 'function') return null;
  if (typeof host.replaceChildren === 'function') host.replaceChildren();
  else if ('innerHTML' in host) host.innerHTML = '';

  const nav = SecondaryNav();
  host.appendChild(nav);

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', () => {
      const currentPath = pathFromHash();
      // Clear all then set one — keyed by data-path, NOT by positional index,
      // so filtering / re-ordering tabs in the future does not silently break
      // the active-state.
      for (const tab of tabsOf(nav)) {
        tab.removeAttribute?.('data-active');
      }
      const active = (typeof nav.querySelector === 'function')
        ? nav.querySelector(`[data-path="${currentPath}"]`)
        : tabsOf(nav).find((t) => t.getAttribute?.('data-path') === currentPath);
      if (active) active.setAttribute?.('data-active', 'true');
    });
  }
  return nav;
}
