// FusionPage — WuXing Element Deep-Dive
// Visualisiert Element-Signatur (Wheel + Matrix), Per-Element-Narrative
// und Remediation-Empfehlungen aus fusion.remediation (server-seitig berechnet).

const ELEMENT_KEYS = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];

// Sheng (生) / Ke (克) parents — must match server.js
const SHENG_PARENT = { Holz: 'Wasser', Feuer: 'Holz', Erde: 'Feuer', Metall: 'Erde', Wasser: 'Metall' };
const KE_PARENT    = { Holz: 'Metall', Feuer: 'Wasser', Erde: 'Holz', Metall: 'Feuer', Wasser: 'Erde'  };

const ELEMENT_COLORS = {
  Holz:   '#34d399',
  Feuer:  '#f87171',
  Erde:   '#d4a574',
  Metall: '#cbd5e1',
  Wasser: '#60a5fa',
};

// FUSION_ELEMENT_PROFILE — local-only object map (do NOT collide with
// ELEMENT_PERSONALITY string map in projections.js, which has 6 string consumers).
const FUSION_ELEMENT_PROFILE = {
  Holz: {
    title:     'Holz — Wachstum & Vision',
    traits:    'Wachstum, Vision, Streben nach Entfaltung, Pionier-Energie.',
    strengths: 'Visionsstärke, Beweglichkeit, langfristige Planung, Mut zum Neuanfang.',
    imbalance: 'Übermaß: Ungeduld, ständiger Aufbruch ohne Abschluss. Mangel: Stagnation, fehlende Richtung.',
  },
  Feuer: {
    title:     'Feuer — Leidenschaft & Ausstrahlung',
    traits:    'Leidenschaft, Ausstrahlung, Inspiration, soziale Wärme.',
    strengths: 'Begeisterungsfähigkeit, Kreativität, charismatische Präsenz, Antrieb.',
    imbalance: 'Übermaß: Ausbrennen, Hyperaktivität, Maßlosigkeit. Mangel: emotionale Kälte, fehlende Freude.',
  },
  Erde: {
    title:     'Erde — Beständigkeit & Substanz',
    traits:    'Beständigkeit, Nährung, praktische Substanz, Verlässlichkeit.',
    strengths: 'Stabilität, Fürsorge, Durchhaltevermögen, Erdung in Krisen.',
    imbalance: 'Übermaß: Stagnation, übertriebene Sorge, Festhalten. Mangel: Wurzellosigkeit, Selbstvernachlässigung.',
  },
  Metall: {
    title:     'Metall — Klarheit & Struktur',
    traits:    'Klarheit, Präzision, strukturierte Kraft, Ordnung.',
    strengths: 'Analytische Schärfe, Disziplin, Standards, klare Entscheidungen.',
    imbalance: 'Übermaß: Kälte, Perfektionismus, Härte. Mangel: Chaos, Entscheidungsschwäche, fehlende Grenzen.',
  },
  Wasser: {
    title:     'Wasser — Tiefe & Intuition',
    traits:    'Tiefe, Intuition, fließende Anpassungsfähigkeit, Reflexion.',
    strengths: 'Emotionale Tiefe, Weisheit, Anpassungsfähigkeit, Regeneration.',
    imbalance: 'Übermaß: Rückzug, Resignation, Verlieren im Diffusen. Mangel: emotionale Oberflächlichkeit, Burnout.',
  },
};

// Cycle relation labels for the 5×5 matrix
function cycleRelation(a, b) {
  if (a === b) return { kind: 'identity', label: '∞', tone: 'identity' };
  if (SHENG_PARENT[b] === a) return { kind: 'sheng-gives', label: '生→', tone: 'sheng' };
  if (SHENG_PARENT[a] === b) return { kind: 'sheng-takes', label: '←生', tone: 'sheng' };
  if (KE_PARENT[b]    === a) return { kind: 'ke-gives',    label: '克→', tone: 'ke'    };
  if (KE_PARENT[a]    === b) return { kind: 'ke-takes',    label: '←克', tone: 'ke'    };
  return { kind: 'neutral', label: '·', tone: 'neutral' };
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

function pct(v) { return Math.round((v ?? 0) * 100) + ' %'; }

// ── ElementWheel ──────────────────────────────────────────────────────────
// 5 nodes on a circle. Radius of each node ∝ vector value.
// Sheng arrows (green) on outer pentagon, Ke arrows (red) on inner star.
function ElementWheel(distribution) {
  const CX = 180, CY = 180, R = 120;
  // Position elements clockwise starting from top: Holz, Feuer, Erde, Metall, Wasser
  const order = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];
  const positions = {};
  order.forEach((el, i) => {
    const angle = (-90 + i * 72) * Math.PI / 180;
    positions[el] = { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  const maxVal = Math.max(...Object.values(distribution || {}), 0.001);
  const minR = 18, maxR = 38;
  const nodeR = (el) => minR + ((distribution?.[el] ?? 0) / maxVal) * (maxR - minR);

  // Sheng arrows along the pentagon (consecutive in `order`)
  const shengArrows = order.map((from, i) => {
    const to = order[(i + 1) % 5];
    return { from, to };
  });
  // Ke arrows: classical star — Holz→Erde→Wasser→Feuer→Metall→Holz
  const keOrder = ['Holz', 'Erde', 'Wasser', 'Feuer', 'Metall'];
  const keArrows = keOrder.map((from, i) => ({ from, to: keOrder[(i + 1) % 5] }));

  function arrowPath(from, to, inset = 0) {
    const p1 = positions[from], p2 = positions[to];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const r1 = nodeR(from) + 2, r2 = nodeR(to) + 6;
    const ux = dx / len, uy = dy / len;
    const x1 = p1.x + ux * r1, y1 = p1.y + uy * r1;
    const x2 = p2.x - ux * r2, y2 = p2.y - uy * r2;
    // optional perpendicular inset (curve effect)
    const mx = (x1 + x2) / 2 + (-uy) * inset;
    const my = (y1 + y2) / 2 + (ux) * inset;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  const shengSvg = shengArrows.map(({ from, to }) =>
    `<path d="${arrowPath(from, to, 0)}" class="wheel-arrow wheel-arrow--sheng" marker-end="url(#arrow-sheng)" />`
  ).join('');
  const keSvg = keArrows.map(({ from, to }) =>
    `<path d="${arrowPath(from, to, 0)}" class="wheel-arrow wheel-arrow--ke" marker-end="url(#arrow-ke)" />`
  ).join('');

  const nodesSvg = order.map((el) => {
    const { x, y } = positions[el];
    const r = nodeR(el);
    const value = distribution?.[el] ?? 0;
    return `
      <g class="wheel-node" data-element="${el}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
                fill="${ELEMENT_COLORS[el]}" fill-opacity="0.85" stroke="${ELEMENT_COLORS[el]}" stroke-width="2" />
        <text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="middle"
              class="wheel-node-label">${el}</text>
        <text x="${x.toFixed(1)}" y="${(y + 12).toFixed(1)}" text-anchor="middle"
              class="wheel-node-pct">${Math.round(value * 100)}%</text>
      </g>`;
  }).join('');

  return `
    <svg class="fusion-wheel" viewBox="0 0 360 360" role="img" aria-label="WuXing Element-Rad">
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
    <div class="fusion-wheel-legend">
      <span class="legend-item"><span class="legend-swatch legend-swatch--sheng"></span> Sheng (生) — nährt</span>
      <span class="legend-item"><span class="legend-swatch legend-swatch--ke"></span> Ke (克) — kontrolliert</span>
    </div>
  `;
}

// ── InteractionMatrix ─────────────────────────────────────────────────────
function InteractionMatrix() {
  const headerCells = ELEMENT_KEYS.map(el => `<th>${el}</th>`).join('');
  const rows = ELEMENT_KEYS.map(rowEl => {
    const cells = ELEMENT_KEYS.map(colEl => {
      const rel = cycleRelation(rowEl, colEl);
      return `<td class="matrix-cell matrix-cell--${rel.tone}" title="${rowEl} → ${colEl}: ${rel.kind}">${rel.label}</td>`;
    }).join('');
    return `<tr><th class="matrix-row-head" style="color:${ELEMENT_COLORS[rowEl]}">${rowEl}</th>${cells}</tr>`;
  }).join('');

  return `
    <table class="fusion-matrix" aria-label="Element-Interaktionsmatrix">
      <thead>
        <tr><th></th>${headerCells}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="fusion-matrix-hint">
      生 = Sheng-Zyklus (nährend) · 克 = Ke-Zyklus (kontrollierend) · ∞ = gleiches Element · · = neutral
    </p>
  `;
}

// ── ElementNarrative cards ────────────────────────────────────────────────
function ElementNarrative(distribution) {
  return ELEMENT_KEYS.map(el => {
    const p = FUSION_ELEMENT_PROFILE[el];
    const v = distribution?.[el] ?? 0;
    return `
      <article class="fusion-element-card" style="border-left-color:${ELEMENT_COLORS[el]}">
        <header class="fusion-element-header">
          <h3 style="color:${ELEMENT_COLORS[el]}">${esc(p.title)}</h3>
          <span class="fusion-element-pct">${pct(v)}</span>
        </header>
        <p class="fusion-element-traits"><strong>Wesen:</strong> ${esc(p.traits)}</p>
        <p class="fusion-element-strengths"><strong>Stärken:</strong> ${esc(p.strengths)}</p>
        <p class="fusion-element-imbalance"><strong>Imbalance-Signale:</strong> ${esc(p.imbalance)}</p>
      </article>
    `;
  }).join('');
}

// ── RemediationPanel ──────────────────────────────────────────────────────
function RemediationPanel(remediation) {
  if (!remediation) {
    return `<p class="fusion-empty">Keine Remediation-Daten verfügbar.</p>`;
  }
  const actionsHtml = (remediation.actions || []).map(a => {
    const headerColor = ELEMENT_COLORS[a.element] || '#cbd5e1';
    const typeLabel = a.type === 'strengthen' ? 'Kultivieren' : 'Ausbalancieren';
    const via = a.via_generator
      ? `über ${esc(a.via_generator)} (Sheng-Generator)`
      : a.via_controller
        ? `über ${esc(a.via_controller)} (Ke-Kontrolleur)`
        : '';
    const activities = (a.activities || []).map(act => `<li>${esc(act)}</li>`).join('');
    return `
      <article class="remediation-action remediation-action--${a.type}">
        <header class="remediation-action-header" style="border-left-color:${headerColor}">
          <h4>${typeLabel}: ${esc(a.element)} ${via ? `<small>${via}</small>` : ''}</h4>
        </header>
        <p class="remediation-rationale">${esc(a.rationale)}</p>
        <ul class="remediation-activities">${activities}</ul>
      </article>
    `;
  }).join('');

  return `
    <p class="remediation-summary">${esc(remediation.summary)}</p>
    ${actionsHtml}
  `;
}

// ── Main page ────────────────────────────────────────────────────────────
export function FusionPage(app, { profile, onNavigate } = {}) {
  const fusion = profile?.fusion;
  if (!fusion) {
    app.innerHTML = `
      <main class="fusion-page">
        <p class="error-detail">Kein Profil geladen. <a href="#/">Zur Eingabe</a></p>
      </main>
    `;
    return;
  }

  // Prefer fusion vector if present, else western (matches server-side priority)
  const vectors = fusion.wu_xing_vectors || {};
  const sourceVec = vectors.fusion && Object.keys(vectors.fusion).length
    ? vectors.fusion
    : vectors.western_planets || {};

  const remediation = fusion.remediation;
  const distribution = remediation?.distribution
    || (() => {
      // Fallback: normalize sourceVec if remediation absent (older API responses)
      const total = ELEMENT_KEYS.reduce((s, k) => s + (Number(sourceVec[k]) || 0), 0);
      if (total <= 0) return null;
      const d = {};
      for (const k of ELEMENT_KEYS) d[k] = (Number(sourceVec[k]) || 0) / total;
      return d;
    })();

  const ci = fusion.coherence_index;
  const coherencePill = (typeof ci === 'number')
    ? `<span class="fusion-coherence-pill">Kohärenz ${Math.round(ci * 100)} %</span>`
    : '';

  app.innerHTML = `
    <main class="fusion-page">
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Übersicht</a>
        <a href="#/personality" class="nav-link">Persönlichkeit</a>
        <a href="#/career-finance" class="nav-link">Karriere</a>
      </nav>

      <header class="page-header">
        <h1>WuXing Fusion <small>— Element-Signatur</small></h1>
        <p class="section-intro">
          Deine 5-Elemente-Verteilung aus dem fusionierten Chart (BaZi + westlich).
          Wheel zeigt Gewichtung, Matrix zeigt Sheng/Ke-Beziehungen, Empfehlungen unten.
        </p>
        ${coherencePill}
      </header>

      <section class="fusion-grid">
        <div class="fusion-wheel-wrap">
          <h2>Element-Rad</h2>
          ${distribution ? ElementWheel(distribution) : '<p class="fusion-empty">Keine Vektor-Daten.</p>'}
        </div>
        <div class="fusion-matrix-wrap">
          <h2>Interaktionsmatrix</h2>
          ${InteractionMatrix()}
        </div>
      </section>

      <section class="fusion-narrative">
        <h2>Element für Element</h2>
        <div class="fusion-element-grid">${ElementNarrative(distribution || {})}</div>
      </section>

      <section class="fusion-remediation">
        <h2>Empfehlungen</h2>
        ${RemediationPanel(remediation)}
      </section>
    </main>
  `;

  // Wire nav-link clicks via onNavigate if provided (preserves SPA hash routing)
  if (typeof onNavigate === 'function') {
    app.querySelectorAll('.nav-link').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('#/')) {
          e.preventDefault();
          onNavigate(href.slice(1));
        }
      });
    });
  }
}
