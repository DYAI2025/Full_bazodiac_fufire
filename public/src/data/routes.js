// Single source of truth for all primary navigation routes. SecondaryNav,
// breadcrumbs, future Method-page-overview reads consume this list.
// Lane attribute drives Phase-C lane-color-coded styling.
//
// 10 design-mockup routes (Solution C per plan
// docs/plans/2026-05-20-smoke-fixes-and-design-shift.md §B2):
//   /overview, /bazi, /western, /wuxing, /fusion, /daily, /synastry, /, /method
//
// Routes NOT listed here (/personality, /love, /career-finance, /dashboard,
// /transit-calendar) stay registered in app.js for back-compat as subordinate
// deep-link routes — they intentionally do not appear in SecondaryNav.

export const ROUTES = [
  { path: '/overview', label: 'Übersicht',  lane: 'fusion',  needsProfile: true                   },
  { path: '/bazi',     label: 'BaZi',       lane: 'bazi',    needsProfile: true, group: 'cards'  },
  { path: '/western',  label: 'Western',    lane: 'west',    needsProfile: true, group: 'cards'  },
  { path: '/wuxing',   label: 'Wu-Xing',    lane: 'wuxing',  needsProfile: true, group: 'cards'  },
  { path: '/fusion',   label: 'Fusion',     lane: 'fusion',  needsProfile: true, group: 'cards'  },
  { path: '/houses',   label: 'Häuser',     lane: 'fusion',  needsProfile: true, group: 'cards'  },
  { path: '/daily',    label: 'Tagespuls',  lane: 'daily',   needsProfile: false                  },
  { path: '/synastry', label: 'Beziehung',  lane: 'rel',     needsProfile: false                  },
  { path: '/',         label: 'Daten',      lane: 'intake',  needsProfile: false                  },
  { path: '/method',   label: 'Methode',    lane: 'method',  needsProfile: false                  },
];

// Group metadata — drives SecondaryNav dropdown rendering.
// I7: 5 chart-lane routes consolidated under "Karten" to reduce tab overload.
export const ROUTE_GROUPS = {
  cards: { label: 'Karten', lane: 'fusion' },
};

// Helper: find a ROUTES entry by current location.hash (handles "#/x" + "/x").
export function currentRoute() {
  if (typeof window === 'undefined') return null;
  const hash = (window.location?.hash || '').replace(/^#\/?/, '/').replace(/^\/+/, '/');
  return ROUTES.find((r) => r.path === hash || r.path === '/' + hash.replace(/^\/+/, '')) || null;
}
