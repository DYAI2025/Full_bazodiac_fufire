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
    // Use setAttribute for data-lane so capture-DOM-stub records the value
    // under _attrs (dataset assignments would be invisible to the stub).
    btn.setAttribute('data-lane', route.lane);
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

// Mount the SecondaryNav once at app boot, then keep its data-active state
// in sync with the URL hash. Called from app.js after the router starts.
export function mountGlobalNav(host) {
  if (!host || typeof host.appendChild !== 'function') return null;
  const nav = SecondaryNav();
  host.appendChild(nav);

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', () => {
      const currentHash = window.location?.hash || '#/';
      const currentPath = currentHash.replace(/^#\/?/, '/').replace(/^\/+/, '/') || '/';
      for (const tab of nav._children || nav.querySelectorAll?.('.secondary-nav__tab') || []) {
        if (!tab || typeof tab.removeAttribute !== 'function') continue;
        tab.removeAttribute('data-active');
      }
      // After clear, re-set on the matching tab.
      const tabs = nav._children || [];
      for (let i = 0; i < tabs.length; i++) {
        if (ROUTES[i] && ROUTES[i].path === currentPath) {
          tabs[i].setAttribute?.('data-active', 'true');
        }
      }
    });
  }
  return nav;
}
