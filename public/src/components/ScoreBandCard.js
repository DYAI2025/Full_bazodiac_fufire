// Kohärenz interpretieren — Index, kein Urteil.
// Bands: 0–39 low / 40–69 medium / 70–89 high / 90–100 very-high.
// Copy-Regel: "Hoch ist nicht automatisch besser."

import { getCoherenceBand } from '../domain/dailyCompanion.js';

const BAND_COPY = {
  low: {
    label: 'niedrige Resonanz / starke Spannung',
    meaning: 'Deine Systeme zeigen heute eher in unterschiedliche Richtungen. Das ist kein Defizit, sondern produktive Reibung.',
    strength: 'Vielfalt — du kannst aus mehreren Mustern wählen.',
    risk: 'Du kannst zwischen Polen pendeln, ohne dich zu entscheiden.',
  },
  medium: {
    label: 'mittlere Resonanz mit produktiver Spannung',
    meaning: 'Deine Systeme arbeiten nicht gegeneinander, setzen aber unterschiedliche Akzente.',
    strength: 'Entwicklung durch Ausgleich.',
    risk: 'Du kannst zwischen innerem Muster und äußerem Ausdruck pendeln.',
  },
  high: {
    label: 'hohe Resonanz',
    meaning: 'Deine westliche Signatur und dein BaZi-Kern zeigen stark in dieselbe Richtung.',
    strength: 'Klare Selbstverstärkung.',
    risk: 'Blinde Flecken, weil Muster sich gegenseitig bestätigen — Echoraum-Risiko.',
  },
  'very-high': {
    label: 'sehr hohe Resonanz / starke Selbstverstärkung',
    meaning: 'Deine Systeme decken sich fast vollständig — sehr stabiler Eindruck.',
    strength: 'Hohe Selbstkongruenz.',
    risk: 'Geringer Innenreiz für Wachstum; aktives Suchen nach Außenperspektive hilft.',
  },
  unknown: {
    label: 'kein Wert verfügbar',
    meaning: 'Für diese Berechnung fehlt der Kohärenz-Index — wir zeigen keinen Wert, statt einen zu erfinden.',
    strength: '',
    risk: '',
  },
};

export function scoreBandModel({ score = null, label = 'Kohärenz-Index' } = {}) {
  const band = getCoherenceBand(score);
  const copy = BAND_COPY[band] || BAND_COPY.unknown;
  const intScore = (band === 'unknown') ? null : Math.round(Number(score));
  return {
    label,
    score: intScore,
    band,
    bandLabel: copy.label,
    meaning:   copy.meaning,
    strength:  copy.strength,
    risk:      copy.risk,
  };
}

export function ScoreBandCard(opts = {}) {
  const m = scoreBandModel(opts);
  const root = document.createElement('section');
  root.className = `score-band-card score-band-card--${m.band}`;

  const head = document.createElement('header');
  head.className = 'score-band-card__head';
  const lab = document.createElement('span');
  lab.className = 'score-band-card__label';
  lab.textContent = m.label;
  const sc = document.createElement('span');
  sc.className = 'score-band-card__score';
  sc.textContent = (m.score == null) ? '—' : String(m.score);
  head.append(lab, sc);
  root.appendChild(head);

  const band = document.createElement('p');
  band.className = 'score-band-card__band';
  band.textContent = `Band: ${m.bandLabel}`;
  root.appendChild(band);

  const meaning = document.createElement('p');
  meaning.className = 'score-band-card__meaning';
  meaning.textContent = m.meaning;
  root.appendChild(meaning);

  if (m.strength) {
    const s = document.createElement('p');
    s.className = 'score-band-card__strength';
    s.innerHTML = `<strong>Stärke:</strong> ${m.strength}`;
    root.appendChild(s);
  }
  if (m.risk) {
    const r = document.createElement('p');
    r.className = 'score-band-card__risk';
    r.innerHTML = `<strong>Risiko:</strong> ${m.risk}`;
    root.appendChild(r);
  }

  const caveat = document.createElement('p');
  caveat.className = 'score-band-card__caveat';
  caveat.textContent = 'Kohärenz ist ein Index, keine Persönlichkeitsnote. Hoch ≠ besser.';
  root.appendChild(caveat);

  return root;
}
