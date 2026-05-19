// Variante C — Relationship Resonance: deterministische Synthese zweier Profile
// zu einem reflexiven Kontaktspiegel (kein Beziehungsurteil, kein Match-Score).
//
// Pure Funktion: gleiche Inputs ergeben gleichen Output. LLM darf strukturierte
// Felder erklären, aber nichts erfinden. Render-Pfad ruft niemals ein LLM
// (Plan §14).

import { getRelationshipScoreBand } from './relationshipScoreBands.js';
import {
  RELATIONSHIP_SAFETY_CAVEAT,
  RELATIONSHIP_SUMMARY_LEAD_INS,
} from './relationshipCopy.js';
import { createSynastryProjection } from './projections.js';

// Aspect harmony lookup. Spiegelt ASPECT_DEFS aus projections.js inline,
// um zirkuläre Re-Exports zu vermeiden.
const ASPECT_HARMONY = {
  Konjunktion: 0.5,
  Sextil:      0.8,
  Quadrat:     0.2,
  Trigon:      0.9,
  Opposition:  0.3,
};

const ELEMENT_NUTZER = {
  Holz:   'Wachstum',
  Feuer:  'Ausdruck',
  Erde:   'Halten',
  Metall: 'Entscheiden',
  Wasser: 'Reflexion',
};

function dominantElement(profile) {
  const v = profile?.fusion?.wu_xing_vectors?.fusion
         || profile?.fusion?.wu_xing_vectors?.western_planets;
  if (!v) return null;
  if (Object.keys(v).length === 0) return null;
  return Object.entries(v).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function ascendantSign(profile) {
  const a = profile?.western?.ascendant;
  return typeof a === 'string' ? a : a?.sign || null;
}

function bridgeForElements(elA, elB) {
  if (!elA || !elB) return { label: 'gemeinsame Grundströmung', basis: 'Element-Daten unvollständig' };
  if (elA === elB) return { label: `geteilte ${elA}-Achse`, basis: `Beide Systeme betonen ${elA}.` };
  const sheng = { Holz: 'Feuer', Feuer: 'Erde', Erde: 'Metall', Metall: 'Wasser', Wasser: 'Holz' };
  if (sheng[elA] === elB || sheng[elB] === elA) {
    return { label: `nährender Zyklus ${elA} und ${elB}`, basis: 'Eine Achse stützt die andere im Sheng-Zyklus.' };
  }
  return { label: `Komplementarität ${elA}/${elB}`, basis: 'Unterschiedliche Schwerpunkte können sich ergänzen.' };
}

function frictionForElements(elA, elB) {
  if (!elA || !elB) return { label: 'unklare Reibungsachse', basis: 'Element-Daten unvollständig' };
  const ke = { Holz: 'Erde', Erde: 'Wasser', Wasser: 'Feuer', Feuer: 'Metall', Metall: 'Holz' };
  if (ke[elA] === elB) return { label: `${elA} begrenzt ${elB}`, basis: 'Ke-Beziehung: strukturierender Druck.' };
  if (ke[elB] === elA) return { label: `${elB} begrenzt ${elA}`, basis: 'Ke-Beziehung: die andere Seite begrenzt.' };
  if (elA === elB)     return { label: `geteilte ${elA}-Last`, basis: 'Gleiches Element kann sich gegenseitig erschöpfen.' };
  return { label: 'unterschiedliche Schwerpunkte', basis: `${elA} und ${elB} — kein automatischer Konflikt, aber Übersetzung nötig.` };
}

// ── Contact-Experiment-Engine (deklarative Regelmatrix, Default zuletzt) ──
const mkExp = (instruction, reflectionQuestion, tags, sourceReason) => ({
  title: '24h Kontakt-Experiment',
  instruction,
  reflectionQuestion,
  tags: [...tags, '24 Stunden'],
  sourceReason,
});

export const CONTACT_EXPERIMENT_RULES = [
  {
    sourceReason: 'Wasser-Signal — Bedürfnisse werden indirekt kommuniziert',
    match: ({ elA, elB, ascA, ascB }) =>
      ascA === 'Cancer' || ascB === 'Cancer' || ascA === 'Pisces' || ascB === 'Pisces' || elA === 'Wasser' || elB === 'Wasser',
    build: () => mkExp(
      'Stellt euch heute eine konkrete Frage, statt Verhalten zu deuten. Zum Beispiel: Was brauchst du gerade von mir — Nähe, Klarheit oder Raum?',
      'Wurde der Kontakt leichter, als das Bedürfnis ausgesprochen war?',
      ['Nähe-Regulation'],
      'Wasser-Signal — Bedürfnisse werden indirekt kommuniziert',
    ),
  },
  {
    sourceReason: 'Metall-Signal — Klarheit als Hebel',
    match: ({ elA, elB }) => elA === 'Metall' || elB === 'Metall',
    build: () => mkExp(
      'Benennt heute jeweils eine Entscheidung, die in eurem Kontakt offen ist — schriftlich, ein Satz reicht.',
      'Was wurde leichter, als die Entscheidung sichtbar war?',
      ['Klarheit'],
      'Metall-Signal — Klarheit als Hebel',
    ),
  },
  {
    sourceReason: 'Feuer-Signal — Ausdruck als Hebel',
    match: ({ elA, elB, ascA, ascB }) =>
      elA === 'Feuer' || elB === 'Feuer' || ascA === 'Aries' || ascB === 'Aries' || ascA === 'Leo' || ascB === 'Leo',
    build: () => mkExp(
      'Zeigt heute jeweils etwas, das ihr sonst zurückhaltet — eine Idee, ein Gefühl, eine Beobachtung.',
      'Was hat sich an Resonanz gezeigt?',
      ['Ausdruck'],
      'Feuer-Signal — Ausdruck als Hebel',
    ),
  },
  {
    sourceReason: 'Holz-Signal — Wachstum als Hebel',
    match: ({ elA, elB }) => elA === 'Holz' || elB === 'Holz',
    build: () => mkExp(
      'Probiert heute eine Sache zusammen aus, die erst in einer Woche zählt — einen kleinen Plan, eine Idee.',
      'Was hat sich an gemeinsamer Richtung gezeigt?',
      ['Wachstum'],
      'Holz-Signal — Wachstum als Hebel',
    ),
  },
  {
    sourceReason: 'Erde-Doppel — Halten als Hebel',
    match: ({ elA, elB }) => elA === 'Erde' && elB === 'Erde',
    build: () => mkExp(
      'Haltet heute bewusst eine Routine zusammen — Spaziergang, Kaffee, Essen — ohne Agenda.',
      'Was wurde stabiler, weil ihr nichts gelöst habt?',
      ['Halten'],
      'Erde-Doppel — Halten als Hebel',
    ),
  },
  {
    sourceReason: 'Luft-Aszendent (A oder B) — Austausch als Hebel',
    match: ({ ascA, ascB }) =>
      ['Gemini', 'Libra', 'Aquarius'].includes(ascA) || ['Gemini', 'Libra', 'Aquarius'].includes(ascB),
    build: () => mkExp(
      'Tauscht heute jeweils einen Gedanken aus, den ihr sonst nur denkt — schriftlich oder im Gespräch.',
      'Wo hat der Austausch das Bild geändert?',
      ['Austausch'],
      'Luft-Aszendent (A oder B) — Austausch als Hebel',
    ),
  },
  {
    sourceReason: 'Hohe Resonanz — Echoraum-Risiko',
    match: ({ band }) => band === 'high',
    build: () => mkExp(
      'Fragt euch, wo ihr einander automatisch zustimmt. Was wäre eure ehrliche Gegenposition?',
      'Welche Sicht ist sichtbar geworden, die ihr sonst überlest?',
      ['Blindspot'],
      'Hohe Resonanz — Echoraum-Risiko',
    ),
  },
  {
    sourceReason: 'Niedrige Resonanz — Übersetzung explizit machen',
    match: ({ band }) => band === 'low',
    build: () => mkExp(
      'Erklärt euch heute jeweils einmal, was ihr eigentlich gemeint habt — ohne Erwartung, dass die andere Person es errät.',
      'Wo hat das explizite Sagen das Bild geöffnet?',
      ['Übersetzung'],
      'Niedrige Resonanz — Übersetzung explizit machen',
    ),
  },
  {
    sourceReason: 'Gemischte Resonanz — Spannung produktiv nennen',
    match: ({ band }) => band === 'mixed',
    build: () => mkExp(
      'Benennt heute eine Spannung, die ihr beide kennt, in einem Satz. Ohne sie lösen zu müssen.',
      'Was wurde leichter, als sie ausgesprochen war?',
      ['Spannung benennen'],
      'Gemischte Resonanz — Spannung produktiv nennen',
    ),
  },
  {
    sourceReason: 'Default — keine spezifische Regel',
    match: () => true,
    build: () => mkExp(
      'Sprecht heute eine Sache direkter aus, als ihr es sonst tut.',
      'Was wurde leichter, als ihr klarer wurdet?',
      ['Klarer Schritt'],
      'Default — keine spezifische Regel',
    ),
  },
];

function pickContactExperiment(context) {
  for (const rule of CONTACT_EXPERIMENT_RULES) {
    if (rule.match(context)) return rule.build(context);
  }
  return CONTACT_EXPERIMENT_RULES[CONTACT_EXPERIMENT_RULES.length - 1].build(context);
}

function pickAspectExtremes(aspects) {
  if (!aspects || !aspects.length) return { best: null, worst: null };
  let best = null, worst = null;
  for (const a of aspects) {
    const h = ASPECT_HARMONY[a.aspect] ?? 0.5;
    if (!best  || h > (ASPECT_HARMONY[best.aspect]  ?? 0.5)) best  = a;
    if (!worst || h < (ASPECT_HARMONY[worst.aspect] ?? 0.5)) worst = a;
  }
  return { best, worst };
}

function precisionState(personA, personB) {
  const certA = personA?._inputMeta?.timeCertainty || 'exact';
  const certB = personB?._inputMeta?.timeCertainty || 'exact';
  return {
    reduced: certA === 'unknown' || certB === 'unknown',
    approx:  certA === 'approximate' || certB === 'approximate',
    certA, certB,
  };
}

// ── Builder ───────────────────────────────────────────────────────────────
export function buildRelationshipResonance({
  personAProfile = null,
  personBProfile = null,
  synastryRaw = null,
  options = {},
} = {}) {
  const precision = precisionState(personAProfile, personBProfile);

  // Resonanz-Index aus Server (combined_coherence) oder Fallback-Mittelwert.
  let indexNum = null;
  if (typeof synastryRaw?.combined_coherence === 'number') {
    indexNum = Math.round(synastryRaw.combined_coherence * 100);
  } else if (personAProfile?.fusion?.coherence_index != null && personBProfile?.fusion?.coherence_index != null) {
    indexNum = Math.round(((personAProfile.fusion.coherence_index + personBProfile.fusion.coherence_index) / 2) * 100);
  }
  if (!personBProfile) indexNum = null;

  // Reduced-precision Cap: bei unbekannter Geburtszeit wird der Index gedeckelt,
  // damit ein hoher Score nicht über fehlende Daten hinwegtäuscht.
  if (indexNum != null && precision.reduced) {
    indexNum = Math.min(indexNum, 59);
  }

  const bandInfo = getRelationshipScoreBand(indexNum);
  if (precision.reduced && indexNum != null) {
    bandInfo.caveat = `${bandInfo.caveat} Geburtszeit unklar — Präzision reduziert.`;
  }

  // ── Synastrie-Projection nutzen, falls Aspekte vorhanden ──
  let projection = null;
  if (personAProfile && personBProfile) {
    try { projection = createSynastryProjection(personAProfile, personBProfile); }
    catch { projection = null; }
  }
  const aspectExtremes = projection ? pickAspectExtremes(projection.aspects) : { best: null, worst: null };

  // ── Elements als Backup-Layer für Bridge/Friction ──
  const elA = dominantElement(personAProfile);
  const elB = dominantElement(personBProfile);
  const ascA = ascendantSign(personAProfile);
  const ascB = ascendantSign(personBProfile);
  const elementBridge = bridgeForElements(elA, elB);
  const elementFriction = frictionForElements(elA, elB);

  // ── Main Connection: bevorzugt Aspekt, sonst Element-Layer ──
  let mainConnection;
  if (aspectExtremes.best && (ASPECT_HARMONY[aspectExtremes.best.aspect] ?? 0) >= 0.7) {
    const a = aspectExtremes.best;
    mainConnection = {
      title:   `Hauptverbindung: ${a.bodyA}–${a.bodyB} ${a.aspect}`,
      summary: a.description || 'Ein harmonischer Aspekt verbindet beide Profile.',
      evidence: [
        `${a.bodyA} (A) ↔ ${a.bodyB} (B) — ${a.aspect}`,
        `Orb ${a.orbDeg}°`,
        elA && elB ? `Element-Achse: ${elA}/${elB}` : null,
      ].filter(Boolean),
      sourceLayer: 'synastry-aspect',
      confidence:  0.85,
      practice:    'Geht heute bewusst über diese Achse in Kontakt — über ein Thema, das ihr leicht teilt.',
    };
  } else {
    mainConnection = {
      title:   `Hauptverbindung: ${elementBridge.label}`,
      summary: elementBridge.basis,
      evidence: [
        elA ? `Person A dominant: ${elA} (${ELEMENT_NUTZER[elA] || elA})` : null,
        elB ? `Person B dominant: ${elB} (${ELEMENT_NUTZER[elB] || elB})` : null,
      ].filter(Boolean),
      sourceLayer: 'wuxing',
      confidence:  (elA && elB) ? 0.7 : 0.3,
      practice:    elA && elB
        ? `Nutzt heute eine Aktivität, die euren ${elA}/${elB}-Modus beide trägt — Halten, Reden, Spüren.`
        : 'Beobachtet heute, wo der Kontakt von selbst trägt — und merkt es euch.',
    };
  }

  // ── Main Friction: bevorzugt schärfster Aspekt (Quadrat/Opposition), sonst Element-Friktion ──
  let mainFriction;
  const tensionFromRaw = synastryRaw?.element_tension;
  if (aspectExtremes.worst && (ASPECT_HARMONY[aspectExtremes.worst.aspect] ?? 0.5) <= 0.3) {
    const a = aspectExtremes.worst;
    mainFriction = {
      title:   `Hauptspannung: ${a.bodyA}–${a.bodyB} ${a.aspect}`,
      summary: a.description || 'Eine spannungsreiche Achse fordert beide Profile.',
      evidence: [
        `${a.bodyA} (A) ↔ ${a.bodyB} (B) — ${a.aspect}`,
        `Orb ${a.orbDeg}°`,
        tensionFromRaw ? `Element-Tension: ${tensionFromRaw.dominant_a} ⟷ ${tensionFromRaw.dominant_b}` : null,
      ].filter(Boolean),
      sourceLayer: 'synastry-aspect',
      confidence:  0.85,
      practice:    'Sprecht heute eine Sache an, die ihr sonst rund um diese Achse aussparen würdet.',
    };
  } else if (tensionFromRaw) {
    mainFriction = {
      title:   `Hauptspannung: ${tensionFromRaw.dominant_a} und ${tensionFromRaw.dominant_b}`,
      summary: 'Beide Pole brauchen Raum — sonst kippt der Kontakt einseitig.',
      evidence: [
        ascA ? `Aszendent A: ${ascA}` : null,
        ascB ? `Aszendent B: ${ascB}` : null,
        tensionFromRaw.tension_score != null ? `Spannungs-Intensität: ${Math.round(tensionFromRaw.tension_score * 100)}` : null,
      ].filter(Boolean),
      sourceLayer: 'synastry',
      confidence:  0.7,
      practice:    `Macht heute eine Sache, die der ${tensionFromRaw.dominant_b}-Seite Raum gibt, ohne die ${tensionFromRaw.dominant_a}-Seite zu opfern.`,
    };
  } else {
    mainFriction = {
      title:   `Hauptspannung: ${elementFriction.label}`,
      summary: elementFriction.basis,
      evidence: [
        ascA ? `Aszendent A: ${ascA}` : null,
        ascB ? `Aszendent B: ${ascB}` : null,
      ].filter(Boolean),
      sourceLayer: 'wuxing',
      confidence:  0.4,
      practice:    'Nicht prüfen, ob die andere Person es von selbst merkt — direkt fragen.',
    };
  }

  // ── Contact Experiment ────────────────────────────────────────────────────
  const contactExperiment = pickContactExperiment({ elA, elB, ascA, ascB, band: bandInfo.band });

  // ── Drei-Satz-Summary ─────────────────────────────────────────────────────
  const connectionSentence = personBProfile
    ? `${RELATIONSHIP_SUMMARY_LEAD_INS.connection} ${mainConnection.summary}`
    : `${RELATIONSHIP_SUMMARY_LEAD_INS.connection} Lege eine zweite Person an, um die Verbindung zu sehen.`;
  const frictionSentence = personBProfile
    ? `${RELATIONSHIP_SUMMARY_LEAD_INS.friction} ${mainFriction.summary}`
    : `${RELATIONSHIP_SUMMARY_LEAD_INS.friction} Reibungspunkte werden sichtbar, sobald beide Profile vorliegen.`;
  const practicalSentence = `${RELATIONSHIP_SUMMARY_LEAD_INS.practical} ${contactExperiment.instruction}`;

  // ── Deep Dive ─────────────────────────────────────────────────────────────
  const deepDive = {
    wuxing: (elA && elB) ? {
      dominantA: elA,
      dominantB: elB,
      bridge:    elementBridge.label,
      friction:  elementFriction.label,
    } : null,
    bazi: (personAProfile?.bazi?.day_master && personBProfile?.bazi?.day_master) ? {
      dayMasterA: personAProfile.bazi.day_master,
      dayMasterB: personBProfile.bazi.day_master,
    } : null,
    westernAspects: projection ? {
      items: projection.aspects,
      missing: projection.missing,
      confidence: projection.confidence,
    } : null,
    houses: null,
    fusion: (indexNum != null) ? { resonanceIndex: indexNum, band: bandInfo.band } : null,
  };

  // ── Safety Caveat (ggf. mit Präzisions-Hinweis erweitert) ─────────────────
  let safetyCaveat = RELATIONSHIP_SAFETY_CAVEAT;
  if (precision.reduced) {
    safetyCaveat = `${safetyCaveat} Hinweis: Geburtszeit von mindestens einer Person ist unklar — die Präzision dieser Auswertung ist reduziert.`;
  }

  return {
    resonanceIndex: indexNum,
    resonanceBand:  bandInfo.band,
    bandDetails:    bandInfo,
    summaryStatements: [connectionSentence, frictionSentence, practicalSentence],
    mainConnection,
    mainFriction,
    contactExperiment,
    deepDive,
    safetyCaveat,
    precision,
  };
}
