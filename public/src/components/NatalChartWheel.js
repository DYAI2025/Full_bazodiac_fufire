// public/src/components/NatalChartWheel.js
//
// Pure-SVG natal chart wheel. Additive Hero-section on /overview.
// Consumes the normalized chartWheel shape produced by
// profileToOverviewModel — no raw API field names enter this module.
//
// Production browsers: rendered via document.createElementNS so the
// returned node is a real SVGElement that lays out and styles correctly.
//
// Test environment (capture-DOM stub): falls back to plain object nodes
// with the same _attrs/_children/appendChild surface the stub records.
//
// Static (no animation, no interaction in Sprint I — those are deferred).
// Carries data-lane="west" so Sprint-H lane recipes can color it.

const SIGNS_DE = [
  'Widder','Stier','Zwillinge','Krebs','Löwe','Jungfrau',
  'Waage','Skorpion','Schütze','Steinbock','Wassermann','Fische',
];

const MAJOR_ASPECTS = new Set([
  'conjunction','sextile','square','trine','opposition',
]);

const SVG_NS = 'http://www.w3.org/2000/svg';

// Astronomical convention: 0° = Aries 0° = 9 o'clock (left side).
// Rotating CCW so 90° lands at the top (Cancer 0°), 180° at right, 270° bottom.
function lonToXY(lonDeg, radius) {
  const rad = (180 - lonDeg) * Math.PI / 180;
  return { x: radius * Math.cos(rad), y: -radius * Math.sin(rad) };
}

// Cross-environment element factory. Real DOM gets SVG namespace; stub
// gets a plain object that the capture-DOM helpers know how to record.
function el(tag, attrs = {}, textContent = null, children = []) {
  let node;
  if (typeof document !== 'undefined' && typeof document.createElementNS === 'function') {
    node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      node.setAttribute(k, String(v));
    }
    if (textContent != null && textContent !== '') {
      node.appendChild(document.createTextNode(String(textContent)));
    }
    for (const c of children) {
      if (c != null) node.appendChild(c);
    }
    return node;
  }
  // Stub-fallback path.
  node = {
    tag,
    _attrs: {},
    _children: [],
    _text: '',
    setAttribute(k, v) { this._attrs[k] = String(v); },
    appendChild(c) { if (c != null) this._children.push(c); },
  };
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    node._attrs[k] = String(v);
  }
  if (textContent != null && textContent !== '') {
    node._text = String(textContent);
  }
  for (const c of children) {
    if (c != null) node._children.push(c);
  }
  return node;
}

export function NatalChartWheel({ wheel }) {
  const VIEW    = 480;
  const HALF    = VIEW / 2;
  const R_OUTER = 220;
  const R_INNER = 170;
  const R_BODY  = 140;
  const R_ASPECT = R_BODY - 12;

  const w = wheel || { bodies: [], asc: null, mc: null, houses: [], aspects: [] };

  const root = el('svg', {
    viewBox: `-${HALF} -${HALF} ${VIEW} ${VIEW}`,
    width: '100%',
    height: 'auto',
    preserveAspectRatio: 'xMidYMid meet',
    'data-lane':   'west',
    'aria-label':  'Geburtsrad',
    role:          'img',
    class:         'natal-chart-wheel',
  });

  // Outer + inner rings.
  root.appendChild(el('circle', {
    cx: 0, cy: 0, r: R_OUTER,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1,
    'data-ring': 'outer',
  }));
  root.appendChild(el('circle', {
    cx: 0, cy: 0, r: R_INNER,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1,
    'data-ring': 'inner',
  }));

  // Sign-ring: 12 tick lines + 12 labels (sign labels always render —
  // they are the static orientation fallback when bodies/houses absent).
  for (let i = 0; i < 12; i++) {
    const lon = i * 30;
    const tickOuter = lonToXY(lon, R_OUTER);
    const tickInner = lonToXY(lon, R_INNER);
    root.appendChild(el('line', {
      x1: tickOuter.x, y1: tickOuter.y, x2: tickInner.x, y2: tickInner.y,
      stroke: 'currentColor', 'stroke-width': 0.5,
      'data-sign-tick': SIGNS_DE[i],
    }));
    const labelPos = lonToXY(lon + 15, (R_OUTER + R_INNER) / 2);
    root.appendChild(el('text', {
      x: labelPos.x, y: labelPos.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 10, fill: 'currentColor',
      'data-sign-label': SIGNS_DE[i],
    }, SIGNS_DE[i]));
  }

  // House cusps (if delivered).
  if (Array.isArray(w.houses) && w.houses.length) {
    for (const h of w.houses) {
      if (typeof h.cuspLongitude !== 'number') continue;
      const a = lonToXY(h.cuspLongitude, R_INNER);
      root.appendChild(el('line', {
        x1: 0, y1: 0, x2: a.x, y2: a.y,
        stroke: 'currentColor', 'stroke-width': 0.5,
        'stroke-dasharray': '2 2', opacity: 0.5,
        'data-house': String(h.number),
      }));
    }
  }

  // ASC marker (text "ASC" outside the outer ring at ASC longitude).
  if (typeof w.asc === 'number') {
    const p = lonToXY(w.asc, R_OUTER + 14);
    root.appendChild(el('text', {
      x: p.x, y: p.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 12, 'font-weight': 'bold', fill: 'currentColor',
      'data-marker': 'asc',
    }, 'ASC'));
  }

  // MC marker.
  if (typeof w.mc === 'number') {
    const p = lonToXY(w.mc, R_OUTER + 14);
    root.appendChild(el('text', {
      x: p.x, y: p.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 12, 'font-weight': 'bold', fill: 'currentColor',
      'data-marker': 'mc',
    }, 'MC'));
  }

  // Aspect lines (major only). Render BEFORE body dots so dots overlay.
  if (Array.isArray(w.aspects)) {
    for (const asp of w.aspects) {
      if (!MAJOR_ASPECTS.has(asp.type)) continue;
      const src = w.bodies.find((b) => b.name === asp.source);
      const tgt = w.bodies.find((b) => b.name === asp.target);
      if (!src || !tgt) continue;
      if (typeof src.longitude !== 'number' || typeof tgt.longitude !== 'number') continue;
      const a = lonToXY(src.longitude, R_ASPECT);
      const b = lonToXY(tgt.longitude, R_ASPECT);
      root.appendChild(el('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: 'currentColor', 'stroke-width': 0.5, opacity: 0.35,
        'data-aspect': asp.type,
      }));
    }
  }

  // Bodies as dots.
  if (Array.isArray(w.bodies)) {
    for (const b of w.bodies) {
      if (typeof b.longitude !== 'number') continue;
      const pos = lonToXY(b.longitude, R_BODY);
      root.appendChild(el('circle', {
        cx: pos.x, cy: pos.y, r: 4,
        fill: 'currentColor',
        'data-body': b.name,
      }));
    }
  }

  return root;
}
