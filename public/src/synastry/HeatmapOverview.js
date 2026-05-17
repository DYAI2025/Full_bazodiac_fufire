// public/src/synastry/HeatmapOverview.js
// Renders the 6-domain pair heatmap from computeDomainScores() output

const DOMAIN_META = {
  love:          { icon:'❤', label:'Liebe & Intimität',       detail:'/love.html' },
  communication: { icon:'💬', label:'Kommunikation',           detail:'/personality.html' },
  finance:       { icon:'💰', label:'Finanzen & Sicherheit',   detail:'/career-finance.html' },
  career:        { icon:'🏗', label:'Karriere & Energie',      detail:'/career-finance.html' },
  growth:        { icon:'🌱', label:'Wachstum & Potenzial',    detail:'/personality.html' },
  foundation:    { icon:'🏠', label:'Fundament & Familie',     detail:'/love.html' },
};

/**
 * @param {object} scores — output of computeDomainScores()
 * @param {Function} [onDomainClick] — called with (domainKey, detailPath) on row click
 */
export function HeatmapOverview(scores, onDomainClick = null) {
  const wrap = document.createElement('div');
  wrap.className = 'heatmap-overview';
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:0;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;';

  const header = document.createElement('div');
  header.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;padding:8px 16px;background:#111;font-size:0.65rem;color:#555;letter-spacing:0.08em;text-transform:uppercase;';
  header.innerHTML = '<span>Domain</span><span style="text-align:center">Harmonie</span><span style="text-align:center">Reibung / Potenzial</span>';
  wrap.appendChild(header);

  for (const [key, meta] of Object.entries(DOMAIN_META)) {
    const s = scores?.[key] ?? { harmony:50, tension:50 };
    const row = document.createElement('div');
    row.style.cssText = `display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;
      padding:12px 16px;border-top:1px solid #1c1c1c;cursor:${onDomainClick ? 'pointer' : 'default'};
      transition:background 0.15s;`;

    if (s.tension > 55) row.style.background = '#1a1008';

    row.addEventListener('mouseenter', () => row.style.background = '#1e1e1e');
    row.addEventListener('mouseleave', () => row.style.background = s.tension > 55 ? '#1a1008' : '');
    if (onDomainClick) row.addEventListener('click', () => onDomainClick(key, meta.detail));

    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px;font-size:0.875rem;color:#e5e5e5;">
        <span>${meta.icon}</span>
        <span>${meta.label}</span>
        ${onDomainClick ? '<span style="color:#444;font-size:0.7rem;">→</span>' : ''}
      </span>
      <div style="padding:0 8px;">
        <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;">
          <div style="height:100%;width:${s.harmony}%;background:#22c55e;border-radius:4px;transition:width 0.8s ease;"></div>
        </div>
        <span style="font-size:0.7rem;color:#22c55e99;">${s.harmony}%</span>
      </div>
      <div style="padding:0 8px;">
        <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;">
          <div style="height:100%;width:${s.tension}%;background:#f59e0b;border-radius:4px;transition:width 0.8s ease;"></div>
        </div>
        <span style="font-size:0.7rem;color:#f59e0b99;">${s.tension}%</span>
      </div>
    `;
    wrap.appendChild(row);
  }

  return wrap;
}
