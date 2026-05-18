// Daily Fusion-Synthese: gemeinsames Thema → Spannung → Balance-Handlung.
// Fed by vm.fusion from buildDailyCompanionViewModel.

export function fusionSynthesisModel(f) {
  const src = f || {};
  return {
    synthesis:       src.synthesis       || 'Beide Systeme tragen heute eine ausgeglichene Verteilung.',
    tension:         src.tension         || 'Keine einzelne Spannung dominiert.',
    balancingAction: src.balancingAction || 'Nutze den Tag, um zu beobachten, was sich von selbst zeigt.',
  };
}

export function FusionSynthesisCard(vmFusion) {
  const m = fusionSynthesisModel(vmFusion);
  const root = document.createElement('section');
  root.className = 'daily-section daily-section--fusion impulse-card';

  const h = document.createElement('h2');
  h.className = 'daily-section-title';
  h.textContent = 'Fusion — Synthese';
  root.appendChild(h);

  for (const [labelKey, val] of [
    ['Befund',  m.synthesis],
    ['Spannung', m.tension],
    ['Balance-Handlung', m.balancingAction],
  ]) {
    const p = document.createElement('p');
    p.className = 'impulse-card__row';
    p.innerHTML = `<strong>${labelKey}:</strong> ${val}`;
    root.appendChild(p);
  }
  return root;
}
