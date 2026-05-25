// public/src/components/NatalChartAuditTabs.js
//
// OV-I4-T11: full tabbed audit panel — Top 3 / Planeten / Häuser / Aspekte.
//
// Each tab owns one panel. Exactly one panel is active at a time
// (data-active="true"); inactive panels carry data-active="false" and are
// hidden via CSS. Clicking a tab swaps the active panel via a delegated
// listener on the tab-bar root.
//
// Audit row markers ([data-audit-row="<key>"]) are emitted in the Planets
// panel for every body — including missing ones, marked "Daten fehlen" —
// and in the Houses panel for ASC/MC/DSC/IC. The OverviewPage wheel
// hover/click listener finds those rows via querySelector and toggles
// data-active on the first matching <li>.
//
// REQ-D-002, REQ-F-OV-006.

const AXIS_LABEL = {
  ASC: 'AC · Aszendent',
  MC:  'MC · Medium Coeli',
  DSC: 'DC · Deszendent',
  IC:  'IC · Imum Coeli',
};

const SOURCE_LABEL = {
  api:     'api',
  derived: 'abgeleitet',
  missing: 'fehlt',
};

const TONE_LABEL_DE = {
  hard:    'Spannung',
  soft:    'Harmonie',
  neutral: 'Neutral',
};

const TABS = [
  { key: 'top3',    label: 'Top 3'    },
  { key: 'planets', label: 'Planeten' },
  { key: 'houses',  label: 'Häuser'   },
  { key: 'aspects', label: 'Aspekte'  },
];

// ── tiny DOM helpers ────────────────────────────────────────────────────────

function mkSection(className, attrs = {}) {
  const n = document.createElement('section');
  n.className = className;
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    n.setAttribute(k, String(v));
  }
  return n;
}

function mkLi(className, dataset = {}, text = null) {
  const n = document.createElement('li');
  n.className = className;
  for (const [k, v] of Object.entries(dataset)) {
    if (v == null) continue;
    n.setAttribute(k, String(v));
  }
  if (text != null) n.textContent = String(text);
  return n;
}

function mkButton(className, dataset = {}, text = null) {
  const n = document.createElement('button');
  n.type = 'button';
  n.className = className;
  for (const [k, v] of Object.entries(dataset)) {
    if (v == null) continue;
    n.setAttribute(k, String(v));
  }
  if (text != null) n.textContent = String(text);
  return n;
}

// ── Tab bar ─────────────────────────────────────────────────────────────────

function buildTabBar(activeKey) {
  const bar = document.createElement('nav');
  bar.className = 'bz-audit-tabs__bar';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Geburtsrad — Audit-Ansichten');
  for (const t of TABS) {
    const isActive = t.key === activeKey;
    const btn = mkButton('bz-audit-tabs__tab', {
      role: 'tab',
      'data-tab': t.key,
      'data-active': String(isActive),
      'aria-selected': String(isActive),
      tabindex: isActive ? '0' : '-1',
    }, t.label);
    bar.append(btn);
  }
  return bar;
}

// ── Planet row ──────────────────────────────────────────────────────────────

function planetRow(b) {
  const key = b.key || b.name || 'unknown';
  const source = b.source || (typeof b.longitude === 'number' ? 'api' : 'missing');
  const isMissing = source === 'missing';

  const row = mkLi(`bz-audit-planet bz-audit-planet--${source}`, {
    'data-audit-row': key,
    'data-audit-kind': 'body',
    'data-audit-source': source,
  });

  const glyph = document.createElement('span');
  glyph.className = 'bz-audit-planet__glyph';
  glyph.textContent = b.glyph || '·';
  row.append(glyph);

  const name = document.createElement('span');
  name.className = 'bz-audit-planet__name';
  name.textContent = b.labelDE || key;
  row.append(name);

  if (isMissing) {
    const miss = document.createElement('span');
    miss.className = 'bz-audit-planet__missing';
    miss.textContent = 'Daten fehlen';
    row.append(miss);
  } else {
    const sign = document.createElement('span');
    sign.className = 'bz-audit-planet__sign';
    sign.textContent = b.signDE
      ? (b.signGlyph ? `${b.signGlyph} ${b.signDE}` : b.signDE)
      : (b.signGlyph || '—');
    row.append(sign);

    const deg = document.createElement('span');
    deg.className = 'bz-audit-planet__degree';
    deg.textContent = b.degreeDisplay || '—';
    row.append(deg);

    const house = document.createElement('span');
    house.className = 'bz-audit-planet__house';
    house.textContent = b.house != null ? String(b.house) : '—';
    row.append(house);
  }

  const sourcePill = document.createElement('span');
  sourcePill.className = `bz-audit-planet__source bz-audit-planet__source--${source}`;
  sourcePill.setAttribute('data-source-pill', source);
  sourcePill.textContent = SOURCE_LABEL[source] || source;
  row.append(sourcePill);

  return row;
}

// ── Axis row (used in Houses panel) ─────────────────────────────────────────

function axisRow(key, lon, sourceTag) {
  const source = sourceTag || (typeof lon === 'number' ? 'derived' : 'missing');
  const row = mkLi(`bz-audit-axis bz-audit-axis--${source}`, {
    'data-audit-row': key,
    'data-audit-kind': 'axis',
    'data-audit-source': source,
  });
  const label = document.createElement('span');
  label.className = 'bz-audit-axis__label';
  label.textContent = AXIS_LABEL[key] || key;
  row.append(label);

  const deg = document.createElement('span');
  deg.className = 'bz-audit-axis__degree';
  deg.textContent = typeof lon === 'number' ? `${lon.toFixed(2)}°` : 'Daten fehlen';
  row.append(deg);

  return row;
}

// ── House row ──────────────────────────────────────────────────────────────

function houseRow(h) {
  const row = mkLi('bz-audit-house', {
    'data-house': String(h.number),
  });
  const label = document.createElement('span');
  label.className = 'bz-audit-house__label';
  label.textContent = `Haus ${h.number}`;
  row.append(label);

  const sign = document.createElement('span');
  sign.className = 'bz-audit-house__sign';
  sign.textContent = h.sign || '—';
  row.append(sign);

  const cusp = document.createElement('span');
  cusp.className = 'bz-audit-house__cusp';
  cusp.textContent = typeof h.cuspLongitude === 'number'
    ? `${h.cuspLongitude.toFixed(2)}°`
    : 'Daten fehlen';
  row.append(cusp);

  return row;
}

// ── Aspect row ─────────────────────────────────────────────────────────────

function aspectRow(a) {
  const tone = ['hard', 'soft', 'neutral'].includes(a.tone) ? a.tone : 'neutral';
  const sourceKey = a.sourceKey || a.source || a.planet1 || '?';
  const targetKey = a.targetKey || a.target || a.planet2 || '?';
  const typeDE = a.typeDE || a.type || 'Aspekt';
  const orb = typeof a.orb === 'number' && Number.isFinite(a.orb)
    ? `${a.orb.toFixed(1)}°` : '—';

  const row = mkLi(`bz-audit-aspect bz-audit-aspect--${tone}`, {
    'data-aspect-row': `${sourceKey}-${typeDE}-${targetKey}`,
    'data-tone': tone,
  });

  const pair = document.createElement('span');
  pair.className = 'bz-audit-aspect__pair';
  pair.textContent = `${sourceKey} ↔ ${targetKey}`;
  row.append(pair);

  const type = document.createElement('span');
  type.className = 'bz-audit-aspect__type';
  type.textContent = typeDE;
  row.append(type);

  const orbEl = document.createElement('span');
  orbEl.className = 'bz-audit-aspect__orb';
  orbEl.textContent = `Orb ${orb}`;
  row.append(orbEl);

  const toneLabel = document.createElement('span');
  toneLabel.className = `bz-audit-aspect__tone bz-audit-aspect__tone--${tone}`;
  toneLabel.textContent = TONE_LABEL_DE[tone] || tone;
  row.append(toneLabel);

  return row;
}

// ── Panel builders ─────────────────────────────────────────────────────────

function buildTop3Panel(topMovements, isActive) {
  const sec = mkSection('bz-audit-tabs__panel bz-audit-tabs__panel--top3', {
    'data-tab-panel': 'top3',
    'data-active': String(isActive),
    role: 'tabpanel',
  });

  const intro = document.createElement('p');
  intro.className = 'bz-audit-tabs__intro';
  intro.textContent = 'Die markantesten Bewegungen — sortiert nach Orb.';
  sec.append(intro);

  if (!Array.isArray(topMovements) || topMovements.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bz-audit-tabs__empty';
    empty.textContent = 'Keine Top-Bewegungen geliefert.';
    sec.append(empty);
    return sec;
  }
  const ul = document.createElement('ul');
  ul.className = 'bz-audit-tabs__list';
  for (const m of topMovements.slice(0, 3)) ul.append(aspectRow(m));
  sec.append(ul);
  return sec;
}

function buildPlanetsPanel(bodies, isActive) {
  const sec = mkSection('bz-audit-tabs__panel bz-audit-tabs__panel--planets', {
    'data-tab-panel': 'planets',
    'data-active': String(isActive),
    role: 'tabpanel',
  });

  if (!Array.isArray(bodies) || bodies.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bz-audit-tabs__empty';
    empty.textContent = 'Planetendaten nicht geliefert.';
    sec.append(empty);
    return sec;
  }
  const ul = document.createElement('ul');
  ul.className = 'bz-audit-tabs__list bz-audit-tabs__list--planets';
  for (const b of bodies) ul.append(planetRow(b));
  sec.append(ul);
  return sec;
}

function buildHousesPanel(houses, angles, isActive) {
  const sec = mkSection('bz-audit-tabs__panel bz-audit-tabs__panel--houses', {
    'data-tab-panel': 'houses',
    'data-active': String(isActive),
    role: 'tabpanel',
  });

  const axesIntro = document.createElement('h4');
  axesIntro.className = 'bz-audit-tabs__subhead';
  axesIntro.textContent = 'Achsen';
  sec.append(axesIntro);

  const axesList = document.createElement('ul');
  axesList.className = 'bz-audit-tabs__list bz-audit-tabs__list--axes';
  const a = angles || {};
  axesList.append(axisRow('ASC', a.asc, a.source));
  axesList.append(axisRow('MC',  a.mc,  a.source));
  axesList.append(axisRow('DSC', a.dsc, a.source));
  axesList.append(axisRow('IC',  a.ic,  a.source));
  sec.append(axesList);

  const housesIntro = document.createElement('h4');
  housesIntro.className = 'bz-audit-tabs__subhead';
  housesIntro.textContent = 'Häuser';
  sec.append(housesIntro);

  if (!Array.isArray(houses) || houses.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bz-audit-tabs__empty';
    empty.textContent = 'Häuser noch nicht geliefert.';
    sec.append(empty);
    return sec;
  }
  const ul = document.createElement('ul');
  ul.className = 'bz-audit-tabs__list bz-audit-tabs__list--houses';
  for (const h of houses) ul.append(houseRow(h));
  sec.append(ul);
  return sec;
}

function buildAspectsPanel(aspects, isActive) {
  const sec = mkSection('bz-audit-tabs__panel bz-audit-tabs__panel--aspects', {
    'data-tab-panel': 'aspects',
    'data-active': String(isActive),
    role: 'tabpanel',
  });

  if (!Array.isArray(aspects) || aspects.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bz-audit-tabs__empty';
    empty.textContent = 'Keine Aspekte geliefert.';
    sec.append(empty);
    return sec;
  }
  const ul = document.createElement('ul');
  ul.className = 'bz-audit-tabs__list bz-audit-tabs__list--aspects';
  for (const a of aspects) ul.append(aspectRow(a));
  sec.append(ul);
  return sec;
}

// ── Tab-bar interaction (delegated) ─────────────────────────────────────────

function wireTabSwitching(root) {
  const bar = root.querySelector('.bz-audit-tabs__bar');
  if (!bar) return;
  bar.addEventListener('click', (e) => {
    const target = e.target && e.target.closest && e.target.closest('[data-tab]');
    if (!target) return;
    const key = target.getAttribute('data-tab');
    activateTab(root, key);
  });
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target && e.target.closest && e.target.closest('[data-tab]');
    if (!target) return;
    e.preventDefault();
    activateTab(root, target.getAttribute('data-tab'));
  });
}

function activateTab(root, key) {
  if (!key) return;
  const tabs = root.querySelectorAll('[data-tab]');
  for (const t of tabs) {
    const on = t.getAttribute('data-tab') === key;
    t.setAttribute('data-active', String(on));
    t.setAttribute('aria-selected', String(on));
    t.setAttribute('tabindex', on ? '0' : '-1');
  }
  const panels = root.querySelectorAll('[data-tab-panel]');
  for (const p of panels) {
    const on = p.getAttribute('data-tab-panel') === key;
    p.setAttribute('data-active', String(on));
  }
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {{ wheel?: { bodies?: any[], angles?: any, houses?: any[], aspects?: any[] }, topMovements?: any[], chartWheel?: any }} input
 */
export function NatalChartAuditTabs(input) {
  // Tolerate three input shapes:
  //   - { wheel, topMovements }    (current OverviewPage call site)
  //   - { chartWheel, topMovements } (overview model direct)
  //   - the wheel object itself
  const wheel = (input && (input.wheel || input.chartWheel)) || input || {};
  const w = wheel && (wheel.wheel || wheel.chartWheel || wheel);
  const safe = w || {};
  const topMovements = (input && Array.isArray(input.topMovements))
    ? input.topMovements
    : [];

  const root = mkSection('natal-chart-audit-tabs bz-audit-tabs', {
    'data-component': 'natal-chart-audit-tabs',
    'aria-label': 'Geburtsrad — Audit-Tabs',
  });

  const defaultActive = 'top3';
  root.append(buildTabBar(defaultActive));

  const panels = document.createElement('div');
  panels.className = 'bz-audit-tabs__panels';
  panels.append(buildTop3Panel(topMovements, true));
  panels.append(buildPlanetsPanel(safe.bodies, false));
  panels.append(buildHousesPanel(safe.houses, safe.angles, false));
  panels.append(buildAspectsPanel(safe.aspects, false));
  root.append(panels);

  wireTabSwitching(root);
  return root;
}

export { AXIS_LABEL };
