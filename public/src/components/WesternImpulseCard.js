// Daily Western Impulse: Fokus → Chance → Achtung → Mikro-Impuls.
// Fed by vm.western from buildDailyCompanionViewModel.

export function westernImpulseModel(w) {
  const src = w || {};
  return {
    theme:        src.theme        || 'Ruhiger Tagespuls',
    activeHouses: Array.isArray(src.activeHouses) ? src.activeHouses : [],
    chance:       src.chance       || 'Heute ist Innenraum die stärkste Ressource.',
    caution:      src.caution      || 'Ungerichtete Energie kann sich verzetteln.',
    microImpulse: src.microImpulse || 'Wähle eine kleine Sache und erledige sie heute fertig.',
  };
}

export function WesternImpulseCard(vmWestern) {
  const m = westernImpulseModel(vmWestern);
  const root = document.createElement('section');
  root.className = 'daily-section daily-section--western impulse-card';

  const h = document.createElement('h2');
  h.className = 'daily-section-title';
  h.textContent = 'Westlicher Impuls';
  root.appendChild(h);

  const theme = document.createElement('p');
  theme.className = 'impulse-card__theme';
  theme.innerHTML = `<strong>Fokus:</strong> ${m.theme}`;
  root.appendChild(theme);

  for (const [labelKey, val] of [['Chance', m.chance], ['Achtung', m.caution], ['Mikro-Impuls', m.microImpulse]]) {
    const p = document.createElement('p');
    p.className = 'impulse-card__row';
    p.innerHTML = `<strong>${labelKey}:</strong> ${val}`;
    root.appendChild(p);
  }
  return root;
}
