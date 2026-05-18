// Resonanz-Index als erklärter Indexwert — niemals als Match-Score, Beziehungsgarantie
// oder Kompatibilitätsurteil. Bands & Copy gemäß Plan §17 / STORY-C-002.

export const RELATIONSHIP_BANDS = {
  low: {
    label:    'niedrige automatische Resonanz',
    meaning:  'Zwischen euch fließt nicht alles von selbst. Das ist kein Defizit, sondern braucht mehr bewusste Übersetzung.',
    strength: 'Vielfalt — ihr bringt jeweils etwas mit, das die andere Person nicht automatisch sieht.',
    risk:     'Annahmen über die andere Person füllen die Lücken, wenn ihr nicht direkt sprecht.',
    caveat:   'Index, kein Urteil. Niedrig heißt nicht „nicht kompatibel".',
  },
  mixed: {
    label:    'gemischte Resonanz',
    meaning:  'Verbindung und Reibung sind etwa gleich stark präsent — der Kontakt lebt aus dem Wechselspiel.',
    strength: 'Lernfeld: Spannung kann produktiv genutzt werden.',
    risk:     'Wenn ihr Reibung als Problem behandelt, verliert ihr die Bewegung.',
    caveat:   'Index, kein Urteil. Gemischt heißt nicht „instabil".',
  },
  strong: {
    label:    'starke Resonanz mit Lernfeld',
    meaning:  'Zwischen euch gibt es deutliche Aktivierung, aber sie wird nicht automatisch leicht.',
    strength: 'Ihr könnt einander schnell in Bewegung bringen.',
    risk:     'Wenn Spannung nicht ausgesprochen wird, wird Verhalten leicht überinterpretiert.',
    caveat:   'Index, kein Urteil. Hoch heißt nicht „besser".',
  },
  high: {
    label:    'hohe Resonanz mit Blindspot-Risiko',
    meaning:  'Starke gegenseitige Aktivierung — vieles fühlt sich „selbstverständlich" an.',
    strength: 'Schnelle Anschlussfähigkeit, geteilte Grundsprache.',
    risk:     'Blinde Flecken, weil Muster sich gegenseitig bestätigen. Außenperspektive bewusst suchen.',
    caveat:   'Index, kein Urteil. Hoch ist kein Match-Score und keine Beziehungsgarantie.',
  },
  unknown: {
    label:    'kein Wert verfügbar',
    meaning:  'Für diese Auswertung fehlt der Resonanz-Index — wir zeigen keinen Wert, statt einen zu erfinden.',
    strength: 'Qualitative Auswertung bleibt nutzbar.',
    risk:     'Ohne Index ist nur die Sprache verfügbar, nicht die Gewichtung.',
    caveat:   'Kein Resonanz-Index berechnet — keine Quantifizierung möglich.',
  },
};

export function getRelationshipScoreBand(score) {
  if (score === null || score === undefined) return { band: 'unknown', score: null, ...RELATIONSHIP_BANDS.unknown };
  const n = Number(score);
  if (!Number.isFinite(n)) return { band: 'unknown', score: null, ...RELATIONSHIP_BANDS.unknown };
  const intScore = Math.round(n);
  let band = 'low';
  if (intScore >= 80) band = 'high';
  else if (intScore >= 60) band = 'strong';
  else if (intScore >= 40) band = 'mixed';
  return { band, score: intScore, ...RELATIONSHIP_BANDS[band] };
}
