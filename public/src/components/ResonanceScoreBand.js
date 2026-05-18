// Resonanz-Index als erklärter Indexwert. Nie als Match/Beziehungsurteil.

import { getRelationshipScoreBand } from '../domain/relationshipScoreBands.js';

export function resonanceScoreBandModel({ score = null, label = 'Resonanz-Index' } = {}) {
  const cfg = getRelationshipScoreBand(score);
  return {
    label,
    score:    cfg.score,
    band:     cfg.band,
    bandLabel:cfg.label,
    meaning:  cfg.meaning,
    strength: cfg.strength,
    risk:     cfg.risk,
    caveat:   cfg.caveat,
  };
}

export function ResonanceScoreBand(opts = {}) {
  const m = resonanceScoreBandModel(opts);
  const root = document.createElement('section');
  root.className = `resonance-score-band resonance-score-band--${m.band}`;

  const head = document.createElement('header');
  head.className = 'resonance-score-band__head';
  const lab = document.createElement('span');
  lab.className = 'resonance-score-band__label';
  lab.textContent = m.label;
  const sc = document.createElement('span');
  sc.className = 'resonance-score-band__score';
  sc.textContent = (m.score == null) ? '—' : String(m.score);
  head.append(lab, sc);
  root.appendChild(head);

  const bandEl = document.createElement('p');
  bandEl.className = 'resonance-score-band__band';
  bandEl.textContent = `Band: ${m.bandLabel}`;
  root.appendChild(bandEl);

  for (const [labelKey, val, cls] of [
    ['Bedeutung', m.meaning,  'resonance-score-band__meaning'],
    ['Stärke',    m.strength, 'resonance-score-band__strength'],
    ['Risiko',    m.risk,     'resonance-score-band__risk'],
  ]) {
    if (!val) continue;
    const p = document.createElement('p');
    p.className = cls;
    p.innerHTML = `<strong>${labelKey}:</strong> ${val}`;
    root.appendChild(p);
  }

  const cav = document.createElement('p');
  cav.className = 'resonance-score-band__caveat';
  cav.textContent = m.caveat;
  root.appendChild(cav);

  return root;
}
