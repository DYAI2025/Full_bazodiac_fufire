// Zeigt die Datenherkunft eines Wertes
const SOURCE_LABELS = {
  api:                  { label: 'API',         color: '#22c55e' },
  api_aggregated:       { label: 'Aggregiert',  color: '#3b82f6' },
  derived_mapping:      { label: 'Abgeleitet',  color: '#a855f7' },
  static_interpretation:{ label: 'Bedeutung',   color: '#f59e0b' },
  static_fallback:      { label: 'Fallback',    color: '#f97316' },
  llm_narrative:        { label: 'KI-Text',     color: '#64748b' },
  unavailable:          { label: 'Fehlt',       color: '#ef4444' },
};

export function SourceBadge(source) {
  const cfg = SOURCE_LABELS[source] || { label: source, color: '#64748b' };
  const el = document.createElement('span');
  el.className = 'source-badge';
  el.style.cssText = `background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44;
    font-size:0.65rem;padding:1px 6px;border-radius:4px;letter-spacing:0.05em;font-weight:600;`;
  el.textContent = cfg.label;
  return el;
}
