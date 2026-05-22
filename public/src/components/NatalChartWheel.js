// public/src/components/NatalChartWheel.js
//
// I3: Professional natal chart wheel.
//   - ASC-left invariant: Ascendant always renders at 9 o'clock (chart-angle 180°)
//   - Three tick layers: 360 minor (every 1°), 72 medium (every 5°), 36 major (every 10°)
//   - Planet glyphs with collision resolution and leader-lines
//   - Bodies with source='missing' are skipped (never rendered at 0°)
//   - Exported longitudeToChartAngle for pure-function testing

const SIGNS_DE = [
  'Widder','Stier','Zwillinge','Krebs','Löwe','Jungfrau',
  'Waage','Skorpion','Schütze','Steinbock','Wassermann','Fische',
];

// OV-I3-T08: zodiac element cycle. Aries=fire, Taurus=earth, Gemini=air,
// Cancer=water — pattern repeats every 4 signs.
const ZODIAC_ELEMENT = ['fire', 'earth', 'air', 'water'];

const MAJOR_ASPECTS = new Set([
  'conjunction','sextile','square','trine','opposition',
]);

// Canonical planet glyph map — fallback for bodies that omit b.glyph.
const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷',
};

// Collision: bodies whose longitudes are within this delta share a bucket
// and are offset onto successive radial lanes outward.
const COLLISION_DELTA_DEG = 6;
// Each successive lane sits this many pixels further from R_BODY.
const LANE_RADIAL_STEP = 18;

const SVG_NS = 'http://www.w3.org/2000/svg';

// I3: ASC-left invariant.
//
// chart-angle is measured in standard math convention (CCW from 3 o'clock):
//   0°   = right (3 o'clock)
//   90°  = top
//   180° = left (9 o'clock)  ← ASC always lands here
//   270° = bottom
//
// Without ascDeg, defaults to astronomical convention (0°=Aries=9 o'clock).
// Zodiac increases CCW on the chart. ASC at 9-o'clock (chart-angle 180°).
// delta=0 → 180°, delta=90° → 270° (bottom/IC), delta=180° → 0° (DSC), delta=270° → 90° (MC).
export function longitudeToChartAngle(lonDeg, ascDeg) {
  const asc = typeof ascDeg === 'number' ? ascDeg : 0;
  const delta = ((lonDeg - asc) % 360 + 360) % 360;
  return (180 + delta) % 360;
}

function chartAngleToXY(chartAngleDeg, radius) {
  const rad = chartAngleDeg * Math.PI / 180;
  return { x: radius * Math.cos(rad), y: -radius * Math.sin(rad) };
}

// Format a number for data-attributes without trailing zeros (e.g. 27.71 → "27.71").
function formatNum(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const fixed = n.toFixed(2);
  return fixed.replace(/\.?0+$/, '') || '0';
}

// Normalize a longitude to [0, 360).
function normalizeLon(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return ((n % 360) + 360) % 360;
}

function lonToXYAsc(lonDeg, radius, ascDeg) {
  return chartAngleToXY(longitudeToChartAngle(lonDeg, ascDeg), radius);
}

// Cross-environment element factory.
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
    for (const c of children) if (c != null) node.appendChild(c);
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
  if (textContent != null && textContent !== '') node._text = String(textContent);
  for (const c of children) if (c != null) node._children.push(c);
  return node;
}

// Assign each body a lane index (0 = no offset; 1,2,... = outward).
// Bodies whose longitudes are within COLLISION_DELTA_DEG of each other
// share a collision bucket and are spread across successive lanes.
function assignLanes(bodies) {
  const placeable = bodies.filter((b) => typeof b.longitude === 'number');
  const sorted = [...placeable].sort((a, b) => a.longitude - b.longitude);
  const lanes = new Map();
  let bucketStart = -Infinity;
  let bucketIndex = 0;
  for (const b of sorted) {
    const key = b.key ?? b.name;
    if (b.longitude - bucketStart < COLLISION_DELTA_DEG) {
      lanes.set(key, bucketIndex);
      bucketIndex++;
    } else {
      bucketStart = b.longitude;
      bucketIndex = 0;
      lanes.set(key, 0);
      bucketIndex = 1;
    }
  }
  return lanes;
}

function renderBodies(root, bodies, ascDeg, { R_BODY }) {
  const lanes = assignLanes(bodies);
  for (const b of bodies) {
    if (typeof b.longitude !== 'number') continue; // source='missing' → skip
    if (b.source === 'missing') continue;          // OV-I3: provenance guard
    const bodyKey = b.key ?? b.name;
    const lane = lanes.get(bodyKey) ?? 0;
    const offsetRadius = R_BODY + lane * LANE_RADIAL_STEP;

    const truePos = lonToXYAsc(b.longitude, R_BODY, ascDeg);
    root.appendChild(el('circle', {
      cx: truePos.x, cy: truePos.y, r: 3,
      fill: 'currentColor',
      'data-body': bodyKey,
      'data-body-key': bodyKey,
      'data-pos': formatNum(b.longitude),
      'data-lane-offset': String(lane),
      tabindex: '0',
    }));

    const glyph = b.glyph ?? PLANET_GLYPHS[bodyKey] ?? '·';
    const glyphPos = lonToXYAsc(b.longitude, offsetRadius + 8, ascDeg);
    root.appendChild(el('text', {
      x: glyphPos.x, y: glyphPos.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 14, fill: 'currentColor',
      'data-body-glyph': glyph,
      'data-body-for': bodyKey,
      'data-lane-offset': String(lane),
    }, glyph));

    if (b.degreeDisplay) {
      const degPos = lonToXYAsc(b.longitude, offsetRadius + 22, ascDeg);
      root.appendChild(el('text', {
        x: degPos.x, y: degPos.y,
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': 8, fill: 'currentColor', opacity: 0.7,
        'data-body-degree': b.degreeDisplay,
        'data-body-for': bodyKey,
      }, b.degreeDisplay));
    }

    // Leader-line back to true position when body is offset.
    if (lane > 0) {
      const leaderEnd = lonToXYAsc(b.longitude, offsetRadius - 2, ascDeg);
      root.appendChild(el('line', {
        x1: truePos.x, y1: truePos.y,
        x2: leaderEnd.x, y2: leaderEnd.y,
        stroke: 'currentColor', 'stroke-width': 0.5, opacity: 0.5,
        'data-leader-line': 'true',
        'data-leader-for': bodyKey,
      }));
    }
  }
}

export function NatalChartWheel({ wheel }) {
  const VIEW    = 480;
  const HALF    = VIEW / 2;
  const R_OUTER = 220;
  const R_INNER = 170;
  const R_BODY  = 140;
  const R_ASPECT = R_BODY - 12;

  const w = wheel || { bodies: [], asc: null, mc: null, houses: [], aspects: [], angles: {} };
  const ascRaw = typeof w.asc === 'number' ? w.asc : (w.angles?.asc ?? null);
  const mcRaw  = typeof w.mc  === 'number' ? w.mc  : (w.angles?.mc  ?? null);
  const ascDeg = typeof ascRaw === 'number' ? ascRaw : 0;

  // OV-I3: DSC/IC are always derived from ASC/MC. If a value is provided
  // by the model we trust it for tagging; if not we compute it.
  const dscRaw =
    typeof w.angles?.dsc === 'number'
      ? w.angles.dsc
      : typeof ascRaw === 'number'
      ? normalizeLon(ascRaw + 180)
      : null;
  const icRaw =
    typeof w.angles?.ic === 'number'
      ? w.angles.ic
      : typeof mcRaw === 'number'
      ? normalizeLon(mcRaw + 180)
      : null;

  const rootAttrs = {
    viewBox: `-${HALF} -${HALF} ${VIEW} ${VIEW}`,
    width: '100%', height: 'auto',
    preserveAspectRatio: 'xMidYMid meet',
    'data-lane': 'west',
    'aria-label': 'Geburtsrad',
    role: 'img',
    class: 'natal-chart-wheel',
    // OV-I3: rotation offset + derived angles exposed for tests/audits.
    'data-asc-rotation':
      typeof ascRaw === 'number' ? `-${formatNum(ascRaw)}` : null,
    'data-angle-asc': formatNum(ascRaw),
    'data-angle-mc':  formatNum(mcRaw),
    'data-angle-dsc': formatNum(dscRaw),
    'data-angle-ic':  formatNum(icRaw),
  };
  const root = el('svg', rootAttrs);

  // OV-I3-T07: <defs> with reusable gradient + filter ids. Even when the
  // stub-environment can't realise SVG painting, downstream CSS/HTML
  // consumers (browser) get the materiality.
  const defs = el('defs', {});
  defs.appendChild(el('radialGradient', { id: 'bz-wheel-disc', cx: '50%', cy: '50%', r: '50%' }));
  defs.appendChild(el('filter', { id: 'bz-wheel-glow' }));
  defs.appendChild(el('filter', { id: 'bz-planet-node' }));
  root.appendChild(defs);

  // OV-I3-T07: four layered <g> groups in stable z-order.
  //   1. zodiac-ring     — outer/inner rings, sector wedges, tick marks
  //   2. houses-axes     — house cusp lines, ASC/MC/IC/DC angle markers
  //   3. bodies-aspects  — aspect lines + planet nodes
  //   4. labels          — sign names + body glyphs + degree labels
  const layerZodiac = el('g', { 'data-layer': 'zodiac-ring' });
  const layerHouses = el('g', { 'data-layer': 'houses-axes' });
  const layerBodies = el('g', { 'data-layer': 'bodies-aspects' });
  const layerLabels = el('g', { 'data-layer': 'labels' });
  root.appendChild(layerZodiac);
  root.appendChild(layerHouses);
  root.appendChild(layerBodies);
  root.appendChild(layerLabels);

  // ── Layer 1: zodiac-ring (rings + sector wedges + ticks) ─────────────────
  layerZodiac.appendChild(el('circle', {
    cx: 0, cy: 0, r: R_OUTER,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4,
    'data-ring': 'outer',
  }));
  layerZodiac.appendChild(el('circle', {
    cx: 0, cy: 0, r: R_INNER,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1,
    'data-ring': 'inner',
  }));

  // OV-I3-T08: 12 zodiac sectors with element class. Element mapping:
  //   fire  = Aries, Leo, Sagittarius      (0, 4, 8)
  //   earth = Taurus, Virgo, Capricorn     (1, 5, 9)
  //   air   = Gemini, Libra, Aquarius      (2, 6, 10)
  //   water = Cancer, Scorpio, Pisces      (3, 7, 11)
  for (let i = 0; i < 12; i++) {
    const lonStart = i * 30;
    const lonEnd   = lonStart + 30;
    const element  = ZODIAC_ELEMENT[i % 4];
    const p0 = lonToXYAsc(lonStart, R_OUTER, ascDeg);
    const p1 = lonToXYAsc(lonEnd,   R_OUTER, ascDeg);
    const q0 = lonToXYAsc(lonStart, R_INNER, ascDeg);
    const q1 = lonToXYAsc(lonEnd,   R_INNER, ascDeg);
    // Annular wedge — large-arc-flag=0 (each sector is 30° < 180°).
    const d = [
      `M ${p0.x} ${p0.y}`,
      `A ${R_OUTER} ${R_OUTER} 0 0 0 ${p1.x} ${p1.y}`,
      `L ${q1.x} ${q1.y}`,
      `A ${R_INNER} ${R_INNER} 0 0 1 ${q0.x} ${q0.y}`,
      'Z',
    ].join(' ');
    layerZodiac.appendChild(el('path', {
      d,
      class: `bz-sector bz-sector--${element}`,
      'data-sector': String(i),
      'data-sector-element': element,
      'data-sign': SIGNS_DE[i],
    }));
  }

  // Tick layers (360 minor, 72 medium, 36 major).
  for (let deg = 0; deg < 360; deg++) {
    const tipOuter = lonToXYAsc(deg, R_OUTER, ascDeg);
    const tipMinor = lonToXYAsc(deg, R_OUTER - 3, ascDeg);
    layerZodiac.appendChild(el('line', {
      x1: tipOuter.x, y1: tipOuter.y, x2: tipMinor.x, y2: tipMinor.y,
      stroke: 'currentColor', 'stroke-width': 0.3, opacity: 0.3,
      'data-tick': 'minor', 'data-tick-deg': deg,
    }));
    if (deg % 5 === 0) {
      const tipMed = lonToXYAsc(deg, R_OUTER - 5, ascDeg);
      layerZodiac.appendChild(el('line', {
        x1: tipOuter.x, y1: tipOuter.y, x2: tipMed.x, y2: tipMed.y,
        stroke: 'currentColor', 'stroke-width': 0.6, opacity: 0.55,
        'data-tick': 'medium', 'data-tick-deg': deg,
      }));
    }
    if (deg % 10 === 0) {
      const tipMaj = lonToXYAsc(deg, R_OUTER - 8, ascDeg);
      layerZodiac.appendChild(el('line', {
        x1: tipOuter.x, y1: tipOuter.y, x2: tipMaj.x, y2: tipMaj.y,
        stroke: 'currentColor', 'stroke-width': 1.0, opacity: 0.85,
        'data-tick': 'major', 'data-tick-deg': deg,
      }));
    }
  }

  // ── Layer 2: houses-axes (cusp lines + ASC/MC/IC/DC markers) ─────────────
  if (Array.isArray(w.houses) && w.houses.length) {
    for (const h of w.houses) {
      if (typeof h.cuspLongitude !== 'number') continue;
      const a = lonToXYAsc(h.cuspLongitude, R_INNER, ascDeg);
      layerHouses.appendChild(el('line', {
        x1: 0, y1: 0, x2: a.x, y2: a.y,
        stroke: 'currentColor', 'stroke-width': 0.5,
        'stroke-dasharray': '2 2', opacity: 0.35,
        'data-house': String(h.number),
      }));
    }
  }

  // Angle markers (ASC always at left = chart-angle 180°).
  function renderAngleMarker(lon, label, position) {
    if (typeof lon !== 'number') return;
    const p = lonToXYAsc(lon, R_OUTER + 14, ascDeg);
    layerHouses.appendChild(el('text', {
      x: p.x, y: p.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 12, 'font-weight': 'bold', fill: 'currentColor',
      'data-marker': label.toLowerCase(),
      'data-angle': label,
      'data-angle-position': position,
      // OV-I3-T09: axis nodes are focusable + tagged for hover/click linking.
      'data-axis-key': label,
      tabindex: '0',
    }, label));
  }
  const angles = w.angles || {};
  renderAngleMarker(ascRaw, 'ASC', 'left');
  renderAngleMarker(mcRaw,  'MC',  'top');
  renderAngleMarker(typeof angles.dsc === 'number' ? angles.dsc : dscRaw, 'DSC', 'right');
  renderAngleMarker(typeof angles.ic  === 'number' ? angles.ic  : icRaw,  'IC',  'bottom');

  // ── Layer 3: bodies-aspects (aspect lines + planet nodes) ────────────────
  if (Array.isArray(w.aspects)) {
    for (const asp of w.aspects) {
      if (!MAJOR_ASPECTS.has(asp.type)) continue;
      const srcKey = asp.sourceKey ?? asp.source;
      const tgtKey = asp.targetKey ?? asp.target;
      const src = w.bodies.find((b) => (b.key ?? b.name) === srcKey);
      const tgt = w.bodies.find((b) => (b.key ?? b.name) === tgtKey);
      if (!src || !tgt) continue;
      if (typeof src.longitude !== 'number' || typeof tgt.longitude !== 'number') continue;
      const a = lonToXYAsc(src.longitude, R_ASPECT, ascDeg);
      const b = lonToXYAsc(tgt.longitude, R_ASPECT, ascDeg);
      const tone = ['hard', 'soft', 'neutral'].includes(asp.tone) ? asp.tone : 'neutral';
      layerBodies.appendChild(el('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: 'currentColor', 'stroke-width': 0.7, opacity: 0.85,
        'data-aspect': asp.type,
        'data-aspect-tone': tone,
        class: `natal-aspect natal-aspect--${tone} bz-aspect bz-aspect--${tone}`,
      }));
    }
  }

  // Bodies with glyphs, degree labels, collision lanes, and leader-lines.
  if (Array.isArray(w.bodies)) {
    renderBodies(layerBodies, w.bodies, ascDeg, { R_BODY });
  }

  // ── Layer 4: labels (sign names at sector midpoints) ─────────────────────
  for (let i = 0; i < 12; i++) {
    const lon = i * 30;
    const labelPos = lonToXYAsc(lon + 15, (R_OUTER + R_INNER) / 2, ascDeg);
    layerLabels.appendChild(el('text', {
      x: labelPos.x, y: labelPos.y,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 10, fill: 'currentColor',
      'data-sign-label': SIGNS_DE[i],
    }, SIGNS_DE[i]));
  }

  // OV-I3-T06: embed an inline audit list inside the SVG so the wheel
  // itself carries provenance information per body. Each row mirrors the
  // canonical body source ('api' | 'derived' | 'missing'). The list is
  // hidden from the visual layer via the audit-attribute selector.
  const auditList = el('g', {
    'data-audit': 'inline',
    'aria-hidden': 'true',
  });
  if (Array.isArray(w.bodies)) {
    for (const b of w.bodies) {
      const key = b.key ?? b.name;
      if (!key) continue;
      auditList.appendChild(el('metadata', {
        'data-audit-row': key,
        'data-audit-source': b.source || (typeof b.longitude === 'number' ? 'api' : 'missing'),
      }, key));
    }
  }
  root.appendChild(auditList);

  return root;
}
