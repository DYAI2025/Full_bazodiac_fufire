// Nutzerfreundliche Anzeige der Datenherkunft. Ersetzt SourceBadge sukzessive.
const PILL_CONFIG = {
  api:                   { label: 'Berechnet',  color: '#22c55e' },
  api_aggregated:        { label: 'Fusioniert', color: '#3b82f6' },
  derived_mapping:       { label: 'Abgeleitet', color: '#a855f7' },
  static_interpretation: { label: 'Gedeutet',   color: '#f59e0b' },
  static_fallback:       { label: 'Fallback',   color: '#f97316' },
  llm_narrative:         { label: 'Erklärt',    color: '#64748b' },
  unavailable:           { label: 'Fehlt',      color: '#ef4444' },
};

export function sourcePillLabel(source) {
  return PILL_CONFIG[source]?.label ?? source;
}

export function sourcePillTooltip(source) {
  return `Quelle: ${source}`;
}

export function SourcePill(source) {
  const cfg = PILL_CONFIG[source] || { label: source, color: '#64748b' };
  const el = document.createElement('span');
  el.className = 'source-pill';
  el.title = sourcePillTooltip(source);
  el.style.cssText =
    `background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44;` +
    `font-size:0.7rem;padding:2px 8px;border-radius:999px;letter-spacing:0.02em;` +
    `font-weight:600;display:inline-flex;align-items:center;gap:4px;`;
  el.textContent = cfg.label;
  return el;
}
