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

import { ROUTES, ROUTE_GROUPS } from '../data/routes.js';

function navigateTo(path) {
  if (typeof window !== 'undefined') {
    window.location.hash = '#' + path;
  }
}

function buildTabButton(route, currentPath) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'secondary-nav__tab';
  btn.setAttribute('data-lane', route.lane);
  btn.setAttribute('data-path', route.path);
  if (route.path === currentPath) btn.setAttribute('data-active', 'true');
  btn.textContent = route.label;
  btn.addEventListener('click', () => navigateTo(route.path));
  return btn;
}

function buildGroupDropdown(groupKey, groupedRoutes, currentPath) {
  const meta = ROUTE_GROUPS[groupKey] || { label: groupKey, lane: 'fusion' };
  const details = document.createElement('details');
  details.className = 'secondary-nav__group';
  details.setAttribute('data-group', groupKey);

  const summary = document.createElement('summary');
  summary.className = 'secondary-nav__tab secondary-nav__group-summary';
  summary.setAttribute('data-lane', meta.lane);
  summary.textContent = meta.label;
  // If any nested route is active, mark the dropdown active too.
  if (groupedRoutes.some(r => r.path === currentPath)) {
    summary.setAttribute('data-active', 'true');
  }
  details.appendChild(summary);

  for (const route of groupedRoutes) {
    const btn = buildTabButton(route, currentPath);
    btn.classList.add('secondary-nav__tab--nested');
    // Close the dropdown after navigation.
    btn.addEventListener('click', () => { details.open = false; });
    details.appendChild(btn);
  }
  return details;
}

export function SecondaryNav() {
  const nav = document.createElement('nav');
  nav.className = 'secondary-nav';
  nav.setAttribute('aria-label', 'Hauptnavigation');

  const currentHash = (typeof window !== 'undefined' && window.location?.hash) || '#/';
  const currentPath = currentHash.replace(/^#\/?/, '/').replace(/^\/+/, '/') || '/';

  // Bucket routes: ungrouped go straight in; grouped collected per key.
  const grouped = new Map();
  const renderQueue = []; // ordered list of { kind: 'route'|'group', payload }

  for (const route of ROUTES) {
    if (route.group) {
      if (!grouped.has(route.group)) {
        grouped.set(route.group, []);
        // Reserve the dropdown's position at first encounter to preserve order.
        renderQueue.push({ kind: 'group', key: route.group });
      }
      grouped.get(route.group).push(route);
    } else {
      renderQueue.push({ kind: 'route', route });
    }
  }

  for (const item of renderQueue) {
    if (item.kind === 'route') {
      nav.appendChild(buildTabButton(item.route, currentPath));
    } else {
      nav.appendChild(buildGroupDropdown(item.key, grouped.get(item.key), currentPath));
    }
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
