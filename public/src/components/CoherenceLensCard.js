// CoherenceLensCard — Kohärenz als 4-Linsen-Modell, nie als Gut/Schlecht-Wert
// oder Persönlichkeitsanteil.
//
// Linsen:
//   Deckung         — wo Systeme dieselbe Richtung zeigen
//   Spannung        — wo Systeme sich reiben
//   Blinde Flecken  — wo Bestätigung Selbstprüfung erschwert
//   Entwicklungsraum — was unterrepräsentiert ist und Raum lässt
//
// Jede Linse: { band, strength, risk, caveat }

export function coherenceLensModel({
  coherence = null,
  dominantElement = null,
  deficientElement = null,
} = {}) {
  const score = (typeof coherence === 'number' && Number.isFinite(coherence)) ? coherence : null;
  const band = bandFor(score);

  const deckung = {
    band,
    note: noteForDeckung(band),
    strength: 'Geteilte Grundsprache deiner Systeme — schnelle Anschlussfähigkeit nach innen.',
    risk:     'Eindruck von Selbstverständlichkeit kann blinde Stellen tarnen.',
  };
  const spannung = {
    band,
    note: noteForSpannung(band, dominantElement, deficientElement),
    strength: dominantElement && deficientElement
      ? `${dominantElement} drückt nach vorn, ${deficientElement} hält Gegengewicht — reibungsfähig.`
      : 'Reibung ist Lernfeld, wenn sie ausgesprochen wird.',
    risk: 'Reibung als Problem behandeln statt sie zu nutzen.',
  };
  const blindspots = {
    band,
    note: noteForBlindspots(band),
    strength: 'Hohe Kongruenz schafft klaren roten Faden im Selbstbild.',
    risk:     'Außenperspektive aktiv suchen — Bestätigung deckt fehlende Daten zu.',
  };
  const growth = {
    band,
    note: noteForGrowth(deficientElement),
    strength: deficientElement
      ? `${deficientElement} ist unterrepräsentiert — genau dort liegt Raum für neue Qualität.`
      : 'Kein einzelnes Element fehlt deutlich — Wachstum ist breit verteilt.',
    risk: 'Unterrepräsentation als Mangel framen, statt als Lernkante.',
  };

  return {
    headline: 'Kohärenz als Linsen',
    sub:      'Vier Blickrichtungen — keine Gut-Schlecht-Note, kein Persönlichkeitsanteil.',
    score,
    band,
    lenses: [
      { key: 'deckung',    label: 'Deckung',          ...deckung },
      { key: 'spannung',   label: 'Spannung',         ...spannung },
      { key: 'blind',      label: 'Blinde Flecken',   ...blindspots },
      { key: 'growth',     label: 'Entwicklungsraum', ...growth },
    ],
    caveat: 'Kohärenz ist ein Index, keine Persönlichkeitsnote. Hoch ≠ besser, niedrig ≠ schlechter.',
  };
}

function bandFor(score) {
  if (score == null) return 'unknown';
  const n = Number(score);
  if (!Number.isFinite(n)) return 'unknown';
  if (n < 40)  return 'low';
  if (n < 70)  return 'mixed';
  if (n < 90)  return 'high';
  return 'very-high';
}

function noteForDeckung(band) {
  if (band === 'low') return 'Wenig Deckung — Systeme zeigen unterschiedliche Akzente.';
  if (band === 'mixed') return 'Teildeckung — manche Achsen treffen sich, andere nicht.';
  if (band === 'high') return 'Hohe Deckung — Systeme zeigen in eine ähnliche Richtung.';
  if (band === 'very-high') return 'Sehr hohe Deckung — Systeme decken sich fast vollständig.';
  return 'Kein Wert verfügbar — wir zeigen lieber nichts als etwas Erfundenes.';
}

function noteForSpannung(band, dom, def) {
  if (!dom || !def) return 'Keine eindeutige Spannungsachse erkennbar — beobachten.';
  if (band === 'low' || band === 'mixed') return `Spannung zwischen ${dom} (stark) und ${def} (schwach) — produktiv, wenn benannt.`;
  return `Spannung gering, weil ${dom} und ${def} sich nicht direkt kreuzen.`;
}

function noteForBlindspots(band) {
  if (band === 'low') return 'Wenig Selbstverstärkung — du siehst mehrere Wahrheiten, blinde Flecken sind klein.';
  if (band === 'mixed') return 'Moderate Selbstverstärkung — einzelne Muster bestätigen sich, andere nicht.';
  if (band === 'high' || band === 'very-high') return 'Hohe Selbstverstärkung — Muster bestätigen sich gegenseitig, was Außenperspektive nötig macht.';
  return 'Ohne Wert keine Aussage zu blinden Flecken.';
}

function noteForGrowth(def) {
  if (!def) return 'Wachstumsraum ist breit verteilt — kein einzelnes Element trägt die Last.';
  return `Wachstumsraum konzentriert sich auf ${def} — dort sitzt die Lernkante.`;
}

export function CoherenceLensCard(opts = {}) {
  const m = coherenceLensModel(opts);
  const root = document.createElement('section');
  root.className = 'coherence-lens-card';
  root.setAttribute('aria-label', m.headline);

  const head = document.createElement('header');
  head.className = 'coherence-lens-card__head';
  const h2 = document.createElement('h3');
  h2.className = 'coherence-lens-card__title';
  h2.textContent = m.headline;
  head.appendChild(h2);
  if (m.score != null) {
    const score = document.createElement('span');
    score.className = `coherence-lens-card__band coherence-lens-card__band--${m.band}`;
    score.textContent = `Band: ${m.band} · Index ${m.score}`;
    head.appendChild(score);
  }
  root.appendChild(head);

  const sub = document.createElement('p');
  sub.className = 'coherence-lens-card__sub';
  sub.textContent = m.sub;
  root.appendChild(sub);

  const grid = document.createElement('div');
  grid.className = 'coherence-lens-card__grid';
  for (const lens of m.lenses) {
    const cell = document.createElement('article');
    cell.className = `coherence-lens coherence-lens--${lens.key}`;
    const lab = document.createElement('h4');
    lab.className = 'coherence-lens__label';
    lab.textContent = lens.label;
    cell.appendChild(lab);
    const note = document.createElement('p');
    note.className = 'coherence-lens__note';
    note.textContent = lens.note;
    cell.appendChild(note);
    const strengthP = document.createElement('p');
    strengthP.className = 'coherence-lens__strength';
    const sLabel = document.createElement('strong');
    sLabel.textContent = 'Stärke:';
    strengthP.append(sLabel, document.createTextNode(` ${lens.strength}`));
    cell.appendChild(strengthP);
    const riskP = document.createElement('p');
    riskP.className = 'coherence-lens__risk';
    const rLabel = document.createElement('strong');
    rLabel.textContent = 'Risiko:';
    riskP.append(rLabel, document.createTextNode(` ${lens.risk}`));
    cell.appendChild(riskP);
    grid.appendChild(cell);
  }
  root.appendChild(grid);

  const caveat = document.createElement('p');
  caveat.className = 'coherence-lens-card__caveat';
  caveat.textContent = m.caveat;
  root.appendChild(caveat);

  return root;
}
