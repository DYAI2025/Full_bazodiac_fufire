// public/src/domain/wuxingRadar.js
//
// Sprint H3 — pure SVG-generation for the WuXing pentagonal radar with
// Sheng (生 — nourishing) and Ke (克 — controlling) cycle arrows.
//
// Lifted from inline `ElementWheel()` in FusionPage so the same component
// renders identically on FusionPage AND WuxingPage. Pure function — given
// the same distribution + options, returns the same SVG string. No DOM
// manipulation, no side effects.
//
// Two input shapes accepted:
//   1. Object: { Holz: 0.31, Feuer: 0.22, Erde: 0.13, Metall: 0.07, Wasser: 0.27 }
//      Values in [0..1]. The radius of each node scales with its value.
//   2. enrichWuxing(profile).distribution shape (array of 5 entries with
//      { label, intensity } where intensity ∈ [0..100]). Auto-converted.
//
// Empty / null distribution returns an SVG with the wheel drawn but all
// nodes at minimum radius — visually communicates "no data yet" instead
// of breaking layout.

export const ELEMENT_ORDER = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];

// Classical 5-element generative + controlling cycles. Must match server.
export const SHENG_PARENT = { Holz: 'Wasser', Feuer: 'Holz', Erde: 'Feuer', Metall: 'Erde', Wasser: 'Metall' };
export const KE_PARENT    = { Holz: 'Metall', Feuer: 'Wasser', Erde: 'Holz', Metall: 'Feuer', Wasser: 'Erde'  };

// Element-specific colors — match tokens.css --bz-{wood,fire,earth,metal,water}.
const ELEMENT_COLORS = {
  Holz:   '#34d399',
  Feuer:  '#f87171',
  Erde:   '#d4a574',
  Metall: '#cbd5e1',
  Wasser: '#60a5fa',
};

// Cycle relation for the interaction matrix (5×5 grid).
//   identity = same element on row + col
//   sheng-gives / sheng-takes = generative cycle direction
//   ke-gives / ke-takes       = controlling cycle direction
//   neutral                   = no direct relation (2 hops apart)
export function cycleRelation(a, b) {
  if (a === b) return { kind: 'identity',     label: '∞',  tone: 'identity' };
  if (SHENG_PARENT[b] === a) return { kind: 'sheng-gives', label: '生→', tone: 'sheng' };
  if (SHENG_PARENT[a] === b) return { kind: 'sheng-takes', label: '←生', tone: 'sheng' };
  if (KE_PARENT[b]    === a) return { kind: 'ke-gives',    label: '克→', tone: 'ke'    };
  if (KE_PARENT[a]    === b) return { kind: 'ke-takes',    label: '←克', tone: 'ke'    };
  return { kind: 'neutral', label: '·', tone: 'neutral' };
}

// Normalize input — accept either the object form or the enrichWuxing
// array form. Returns { Holz: 0..1, Feuer: 0..1, ... } with missing keys = 0.
export function normalizeDistribution(input) {
  const out = { Holz: 0, Feuer: 0, Erde: 0, Metall: 0, Wasser: 0 };
  if (!input) return out;
  if (Array.isArray(input)) {
    for (const entry of input) {
      if (!entry?.label) continue;
      // entry.intensity may be 0..100 (enrichWuxing) — convert to 0..1.
      const raw = (typeof entry.intensity === 'number') ? entry.intensity : 0;
      out[entry.label] = raw > 1 ? raw / 100 : raw;
    }
    return out;
  }
  if (typeof input === 'object') {
    for (const el of ELEMENT_ORDER) {
      const v = Number(input[el]);
      if (Number.isFinite(v) && v >= 0) {
        out[el] = v > 1 ? v / 100 : v;
      }
    }
  }
  return out;
}

// ── buildRadarSVG ─────────────────────────────────────────────────────────
//
// Returns the full SVG string for the pentagonal wheel. Use this in
// `innerHTML` of a container element (see components/WuxingRadar.js).
export function buildRadarSVG(distributionInput, opts = {}) {
  const { size = 360, ariaLabel = 'WuXing Element-Rad' } = opts;
  const distribution = normalizeDistribution(distributionInput);

  const CX = size / 2;
  const CY = size / 2;
  const R  = Math.round(size * 0.333);

  // Position elements clockwise starting from top.
  const positions = {};
  ELEMENT_ORDER.forEach((el, i) => {
    const angle = (-90 + i * 72) * Math.PI / 180;
    positions[el] = { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  const maxVal = Math.max(...Object.values(distribution), 0.001);
  const minR = Math.round(size * 0.05);
  const maxR = Math.round(size * 0.105);
  const nodeR = (el) => minR + (distribution[el] / maxVal) * (maxR - minR);

  // Sheng arrows traverse the pentagon clockwise (Holz → Feuer → Erde → Metall → Wasser → Holz).
  const shengArrows = ELEMENT_ORDER.map((from, i) => ({
    from, to: ELEMENT_ORDER[(i + 1) % 5],
  }));
  // Ke arrows form the classical star: Holz → Erde → Wasser → Feuer → Metall → Holz.
  const keOrder  = ['Holz', 'Erde', 'Wasser', 'Feuer', 'Metall'];
  const keArrows = keOrder.map((from, i) => ({ from, to: keOrder[(i + 1) % 5] }));

  function arrowPath(from, to) {
    const p1 = positions[from];
    const p2 = positions[to];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const r1 = nodeR(from) + 2;
    const r2 = nodeR(to) + 6;
    const ux = dx / len;
    const uy = dy / len;
    const x1 = p1.x + ux * r1;
    const y1 = p1.y + uy * r1;
    const x2 = p2.x - ux * r2;
    const y2 = p2.y - uy * r2;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  const shengSvg = shengArrows.map(({ from, to }) =>
    `<path d="${arrowPath(from, to)}" class="wheel-arrow wheel-arrow--sheng" marker-end="url(#arrow-sheng)" />`,
  ).join('');
  const keSvg = keArrows.map(({ from, to }) =>
    `<path d="${arrowPath(from, to)}" class="wheel-arrow wheel-arrow--ke" marker-end="url(#arrow-ke)" />`,
  ).join('');

  const nodesSvg = ELEMENT_ORDER.map((el) => {
    const { x, y } = positions[el];
    const r = nodeR(el);
    const value = distribution[el];
    return `
      <g class="wheel-node" data-element="${el}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
                fill="${ELEMENT_COLORS[el]}" fill-opacity="0.85"
                stroke="${ELEMENT_COLORS[el]}" stroke-width="2" />
        <text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="middle"
              class="wheel-node-label">${el}</text>
        <text x="${x.toFixed(1)}" y="${(y + 12).toFixed(1)}" text-anchor="middle"
              class="wheel-node-pct">${Math.round(value * 100)}</text>
      </g>`;
  }).join('');

  return `
    <svg class="fusion-wheel wuxing-radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="${ariaLabel}">
      <defs>
        <marker id="arrow-sheng" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
        </marker>
        <marker id="arrow-ke" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" />
        </marker>
      </defs>
      ${shengSvg}
      ${keSvg}
      ${nodesSvg}
    </svg>
  `;
}
