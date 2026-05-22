// public/src/components/NatalChartAuditTabs.js
//
// OV-I3-T09 skeleton — a flat audit list so the wheel's hover/click linking
// has a target [data-audit-row="<key>"] for every body and every axis.
//
// Full tabbed implementation arrives in OV-I4-T11. For now we emit:
//   <section data-component="natal-chart-audit-tabs">
//     <ul data-audit-list>
//       <li data-audit-row="<key>" data-audit-source="<src>">…</li>
//       …
//     </ul>
//   </section>
//
// Pure factory — no state, no side-effects. The hover/click → data-active
// toggle is owned by the page-level interaction layer (OverviewPage), which
// listens on the custom `wheel:body:active` event the wheel dispatches.

const AXIS_LABEL = {
  ASC: 'AC · Aszendent',
  MC:  'MC · Medium Coeli',
  DSC: 'DC · Deszendent',
  IC:  'IC · Imum Coeli',
};

const AXIS_SHORT = {
  ASC: 'AC', MC: 'MC', DSC: 'DC', IC: 'IC',
};

function el(tag, attrs = {}, textContent = null, children = []) {
  let node;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'class') node.className = String(v);
      else node.setAttribute(k, String(v));
    }
    if (textContent != null && textContent !== '') {
      node.textContent = String(textContent);
    }
    for (const c of children) if (c != null) node.appendChild(c);
    return node;
  }
  // Stub-fallback (no real DOM available — tests).
  node = {
    tag, _attrs: {}, _children: [], _text: '',
    setAttribute(k, v) { this._attrs[k] = String(v); },
    appendChild(c) { if (c != null) this._children.push(c); },
  };
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    node._attrs[k] = String(v);
  }
  if (textContent != null && textContent !== '') node._text = String(textContent);
  for (const c of children) if (c != null) node._children.push(c);
  return node;
}

function bodyRow(b) {
  const key = b.key ?? b.name;
  const source = b.source || (typeof b.longitude === 'number' ? 'api' : 'missing');
  return el('li', {
    class: `audit-tabs-row audit-tabs-row--body audit-tabs-row--${source}`,
    'data-audit-row': key,
    'data-audit-kind': 'body',
    'data-audit-source': source,
  }, `${b.labelDE || key}${b.signDE ? ' · ' + b.signDE : ''}${b.degreeDisplay ? ' ' + b.degreeDisplay : ''}`);
}

function axisRow(key, lon, source) {
  return el('li', {
    class: `audit-tabs-row audit-tabs-row--axis audit-tabs-row--${source || 'missing'}`,
    'data-audit-row': key,
    'data-audit-kind': 'axis',
    'data-audit-source': source || (typeof lon === 'number' ? 'derived' : 'missing'),
  }, `${AXIS_LABEL[key] || key}${typeof lon === 'number' ? ' · ' + lon.toFixed(2) + '°' : ''}`);
}

export function NatalChartAuditTabs({ wheel }) {
  const w = wheel || { bodies: [], angles: {} };
  const root = el('section', {
    'data-component': 'natal-chart-audit-tabs',
    class: 'natal-chart-audit-tabs',
    'aria-label': 'Geburtsrad — Audit-Liste',
  });

  const list = el('ul', { class: 'audit-tabs-list', 'data-audit-list': '' });

  for (const b of (w.bodies || [])) list.appendChild(bodyRow(b));

  // Axes — emit ASC/MC/DSC/IC regardless of provenance so the wheel's
  // axis interaction always has a target row.
  const a = w.angles || {};
  list.appendChild(axisRow('ASC', a.asc, a.source));
  list.appendChild(axisRow('MC',  a.mc,  a.source));
  list.appendChild(axisRow('DSC', a.dsc, a.source));
  list.appendChild(axisRow('IC',  a.ic,  a.source));

  root.appendChild(list);
  return root;
}

export { AXIS_SHORT };
