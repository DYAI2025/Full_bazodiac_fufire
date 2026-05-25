// Daily BaZi Impulse: Day Master → Tagesrelation → Ressource → Risiko.
// Fed by vm.bazi from buildDailyCompanionViewModel.

export function baziImpulseModel(b) {
  const src = b || {};
  return {
    dayMaster:       src.dayMaster       || '—',
    coreEnergyLabel: src.coreEnergyLabel || 'Kernenergie nicht verfügbar',
    dailyRelation:   src.dailyRelation   || 'Ohne BaZi-Tagesbezug nutze die westliche Aktivierung als Leitfaden.',
    resourceHint:    src.resourceHint    || 'Beobachte heute, welche Aktivität dich nährt.',
    riskHint:        src.riskHint        || 'Vermeide, dich aus reiner Gewohnheit zu verausgaben.',
  };
}

export function BaziImpulseCard(vmBazi) {
  const m = baziImpulseModel(vmBazi);
  const root = document.createElement('section');
  root.className = 'daily-section daily-section--eastern impulse-card';

  const h = document.createElement('h2');
  h.className = 'daily-section-title';
  h.textContent = 'BaZi-Impuls';
  root.appendChild(h);

  const dm = document.createElement('p');
  dm.className = 'impulse-card__theme';
  dm.innerHTML = `<strong>Day Master:</strong> ${m.dayMaster} <span class="impulse-card__sub">(${m.coreEnergyLabel})</span>`;
  root.appendChild(dm);

  for (const [labelKey, val] of [
    ['Tagesrelation', m.dailyRelation],
    ['Stärke heute', m.resourceHint],
    ['Risiko', m.riskHint],
  ]) {
    const p = document.createElement('p');
    p.className = 'impulse-card__row';
    p.innerHTML = `<strong>${labelKey}:</strong> ${val}`;
    root.appendChild(p);
  }
  return root;
}
