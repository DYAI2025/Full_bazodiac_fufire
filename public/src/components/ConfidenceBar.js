// Visueller Confidence-Indicator (0–1)
export function ConfidenceBar(value, { label = 'Vollständigkeit' } = {}) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const el = document.createElement('div');
  el.className = 'confidence-bar';
  el.innerHTML = `
    <span class="confidence-label">${label}</span>
    <div class="confidence-track">
      <div class="confidence-fill" style="width:${pct}%;background:${color};"></div>
    </div>
    <span class="confidence-pct" style="color:${color}">${pct}%</span>
  `;
  return el;
}
