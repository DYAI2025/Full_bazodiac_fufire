// FusionPage — WuXing Element Deep-Dive
// Visualisiert Element-Signatur (Wheel + Matrix), Per-Element-Narrative
// und Remediation-Empfehlungen aus fusion.remediation (server-seitig berechnet).
//
// Sprint smoke-fix A2: the pentagram-radar distribution now routes through
// enrichWuxing() — single source of truth across the app. enrichWuxing's
// resolution order is remediation.distribution > wu_xing_vectors.fusion >
// bazi_pillars > western_planets. Pre-fix this page preferred
// vectors.fusion || vectors.western_planets (skipping bazi_pillars) which
// could diverge from WuxingPage / CareerFinancePage on partial fixtures.

import { enrichWuxing } from '../domain/wuxingEnrichment.js';
import { wireHeroRolling } from '../components/RollingText.js';
// Sprint H3: Pentagonal radar extracted into pure-function module so
// WuxingPage + FusionPage share one source. cycleRelation + SHENG/KE
// also live there now.
import { buildRadarSVG, cycleRelation, ELEMENT_ORDER as ELEMENT_KEYS } from '../domain/wuxingRadar.js';

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

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

// MVP §4.3: nie als Persönlichkeitsanteil framen — Intensität im Signaturraum.
function pct(v) { return Math.round((v ?? 0) * 100) + ' Punkte Intensität'; }

// ── ElementWheel ──────────────────────────────────────────────────────────
// Sprint H3: original inline implementation extracted to
// domain/wuxingRadar.js buildRadarSVG. Kept as thin adapter here for the
// FusionPage innerHTML template flow (returns string with legend appended).
function ElementWheel(distribution) {
  return `
    ${buildRadarSVG(distribution, { size: 360 })}
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
      <main class="fusion-page" data-lane="fusion">
        <p class="error-detail">Kein Profil geladen. <a href="#/">Zur Eingabe</a></p>
      </main>
    `;
    return;
  }

  // Pentagram-radar source: enrichWuxing returns a distribution array; we
  // reshape to the {Holz:0..1,...} dict the wheel/narrative cards expect.
  // remediation is still consulted separately for the bottom 3-step-plan
  // panel since it carries actions[].activities and summary text.
  const remediation = fusion.remediation;
  const wx = enrichWuxing(profile);
  const distribution = (wx && wx.distribution.length > 0)
    ? Object.fromEntries(wx.distribution.map((e) => [e.label, e.intensity / 100]))
    : null;

  const ci = fusion.coherence_index;
  const coherencePill = (typeof ci === 'number')
    ? `<span class="fusion-coherence-pill">Kohärenz-Index ${Math.round(ci * 100)}</span>`
    : '';

  // Balance summary: dominant / deficient / aktueller Hebel
  let dominantEl = null, deficientEl = null;
  if (distribution) {
    const entries = Object.entries(distribution);
    dominantEl  = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    deficientEl = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  }
  const leverEl = remediation?.actions?.[0]?.element || deficientEl;

  app.innerHTML = `
    <main class="fusion-page" data-lane="fusion">
      <nav class="page-nav">
        <a href="#/overview"       class="nav-link">← Übersicht</a>
        <a href="#/personality"    class="nav-link">Persönlichkeit</a>
        <a href="#/career-finance" class="nav-link">Arbeit &amp; Ressourcen</a>
      </nav>

      <section class="insight-hero insight-hero--neutral" data-section="hero">
        <p class="insight-hero__eyebrow">WuXing</p>
        <h1 class="insight-hero__title bz-h1" data-page-title>Deine Element-Ökonomie</h1>
        <p class="insight-hero__statement">Wie deine Energie zwischen den fünf Elementen verteilt ist — kein Persönlichkeitsanteil, sondern Intensität im Signaturraum.</p>
      </section>

      ${distribution ? `
      <section class="fusion-balance-summary">
        <div class="fbs-cell fbs-cell--dominant">
          <span class="fbs-label">Dominant</span>
          <span class="fbs-value" style="color:${ELEMENT_COLORS[dominantEl] || 'inherit'}">${esc(dominantEl)}</span>
          <span class="fbs-hint">trägt am meisten Gewicht</span>
        </div>
        <div class="fbs-cell fbs-cell--deficient">
          <span class="fbs-label">Unterrepräsentiert</span>
          <span class="fbs-value" style="color:${ELEMENT_COLORS[deficientEl] || 'inherit'}">${esc(deficientEl)}</span>
          <span class="fbs-hint">braucht aktive Pflege</span>
        </div>
        <div class="fbs-cell fbs-cell--lever">
          <span class="fbs-label">Aktueller Hebel</span>
          <span class="fbs-value" style="color:${ELEMENT_COLORS[leverEl] || 'inherit'}">${esc(leverEl)}</span>
          <span class="fbs-hint">drei Stufen siehe unten</span>
        </div>
      </section>
      ` : ''}

      <header class="page-header">
        <p class="section-intro">
          Wheel zeigt Verteilung im Signaturraum, Sheng/Ke-Beziehungen liegen im Drawer, Empfehlungen folgen einem 3-Stufen-Plan.
        </p>
        ${coherencePill}
      </header>

      <section class="fusion-wheel-wrap" data-section="wheel">
        <h2 class="bz-h2">Element-Rad</h2>
        ${distribution ? ElementWheel(distribution) : '<p class="fusion-empty">Keine Vektor-Daten.</p>'}
      </section>

      <details class="fusion-matrix-details">
        <summary>Sheng &amp; Ke — Interaktionsmatrix öffnen</summary>
        <div class="fusion-matrix-wrap">
          ${InteractionMatrix()}
        </div>
      </details>

      <section class="fusion-narrative" data-section="narrative">
        <h2 class="bz-h2">Element für Element</h2>
        <div class="fusion-element-grid">${ElementNarrative(distribution || {})}</div>
      </section>

      <section class="fusion-remediation" data-section="remediation">
        <h2 class="bz-h2">3-Stufen-Plan — was du heute, diese Woche, in 30 Tagen tun kannst</h2>
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

  wireHeroRolling(app);
}
