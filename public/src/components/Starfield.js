// Sprint H4 — procedural seeded starfield as global background layer.
//
// Ported from /tmp/fufire-spec/src/app.jsx:121 Starfield. Pure-DOM
// equivalent — no React. Generates 80 stars at deterministic positions
// (sin-based PRNG keyed on index), so the field looks identical across
// reloads and across devices.

const STAR_COUNT = 80;

function rand(n) {
  const x = Math.sin(n * 49297 + 233) * 233280;
  return x - Math.floor(x);
}

export function Starfield(opts = {}) {
  const { count = STAR_COUNT } = opts;
  const wrap = document.createElement('div');
  wrap.className = 'starfield';
  wrap.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < count; i++) {
    const star = document.createElement('i');
    const top  = rand(i * 2)     * 100;
    const left = rand(i * 2 + 1) * 100;
    const size = 1 + rand(i * 2 + 2) * 2;
    const op   = 0.3 + rand(i * 2 + 3) * 0.5;
    star.style.cssText = `top:${top}vh;left:${left}vw;width:${size}px;height:${size}px;opacity:${op}`;
    wrap.appendChild(star);
  }
  return wrap;
}

// Mount the starfield once at app boot. Idempotent — if a starfield already
// exists in the host, replace it (matches mountGlobalNav re-init pattern from
// Sprint H2 PR #23). Works in both real DOM (querySelector + remove()) and
// the capture-DOM-stub (which keeps a flat _children array but does not
// re-parent on remove()).
export function mountStarfield(host) {
  if (!host || typeof host.appendChild !== 'function') return null;
  // Stub path — filter directly (capture-stub keeps _children flat).
  if (Array.isArray(host._children)) {
    host._children = host._children.filter((c) => c?._attrs?.class !== 'starfield');
  } else if (typeof host.querySelector === 'function') {
    // Real-DOM path — remove the existing node from its parent.
    const existing = host.querySelector('.starfield');
    if (existing && typeof existing.remove === 'function') existing.remove();
  }
  const field = Starfield();
  host.appendChild(field);
  return field;
}
