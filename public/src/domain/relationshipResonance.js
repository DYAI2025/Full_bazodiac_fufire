// Variante C — Relationship Resonance: deterministische Synthese zweier Profile
// zu einem reflexiven Kontaktspiegel (kein Beziehungsurteil, kein Match-Score).
//
// Pure Funktion: gleiche Inputs → gleicher Output. LLM darf strukturierte Felder
// erklären, aber nichts erfinden. Render-Pfad ruft niemals ein LLM (Plan §14).

import { getRelationshipScoreBand } from './relationshipScoreBands.js';
import {
  RELATIONSHIP_SAFETY_CAVEAT,
  RELATIONSHIP_SUMMARY_LEAD_INS,
} from './relationshipCopy.js';

const ELEMENT_KEYS = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];

const ELEMENT_NUTZER = {
  Holz:   'Wachstum',
  Feuer:  'Ausdruck',
  Erde:   'Halten',
  Metall: 'Entscheiden',
  Wasser: 'Reflexion',
};

const WESTERN_ELEMENT = {
  Aries: 'Feuer', Leo: 'Feuer', Sagittarius: 'Feuer',
  Cancer: 'Wasser', Scorpio: 'Wasser', Pisces: 'Wasser',
  Taurus: 'Erde-West', Virgo: 'Erde-West', Capricorn: 'Erde-West',
  Gemini: 'Luft', Libra: 'Luft', Aquarius: 'Luft',
};

function dominantElement(profile) {
  const v = profile?.fusion?.wu_xing_vectors?.fusion
         || profile?.fusion?.wu_xing_vectors?.western_planets;
  if (!v) return null;
  return Object.entries(v).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function deficientElement(profile) {
  const v = profile?.fusion?.wu_xing_vectors?.fusion
         || profile?.fusion?.wu_xing_vectors?.western_planets;
  if (!v) return null;
  return Object.entries(v).reduce((a, b) => (b[1] < a[1] ? b : a))[0];
}

function bodySign(profile, body) {
  return profile?.western?.bodies?.[body]?.sign || null;
}

function ascendantSign(profile) {
  const a = profile?.western?.ascendant;
  return typeof a === 'string' ? a : a?.sign || null;
}

function bridgeForElements(elA, elB) {
  if (!elA || !elB) return { label: 'gemeinsame Grundströmung', basis: 'Element-Daten unvollständig' };
  if (elA === elB) return { label: `geteilte ${elA}-Achse`, basis: `Beide Systeme betonen ${elA}.` };
  // Sheng (nährt): Holz→Feuer→Erde→Metall→Wasser→Holz
  const sheng = { Holz: 'Feuer', Feuer: 'Erde', Erde: 'Metall', Metall: 'Wasser', Wasser: 'Holz' };
  if (sheng[elA] === elB || sheng[elB] === elA) {
    return { label: `nährender Zyklus ${elA}↔${elB}`, basis: 'Eine Achse stützt die andere im Sheng-Zyklus.' };
  }
  return { label: `Komplementarität ${elA}/${elB}`, basis: 'Unterschiedliche Schwerpunkte können sich ergänzen.' };
}

function frictionForElements(elA, elB) {
  if (!elA || !elB) return { label: 'unklare Reibungsachse', basis: 'Element-Daten unvollständig' };
  // Ke (kontrolliert): Holz→Erde→Wasser→Feuer→Metall→Holz
  const ke = { Holz: 'Erde', Erde: 'Wasser', Wasser: 'Feuer', Feuer: 'Metall', Metall: 'Holz' };
  if (ke[elA] === elB) return { label: `${elA} kontrolliert ${elB}`, basis: 'Ke-Beziehung — strukturierender Druck.' };
  if (ke[elB] === elA) return { label: `${elB} kontrolliert ${elA}`, basis: 'Ke-Beziehung — die andere Seite begrenzt.' };
  if (elA === elB)     return { label: `geteilte ${elA}-Last`, basis: 'Gleiches Element kann sich gegenseitig erschöpfen.' };
  return { label: `unterschiedliche Schwerpunkte`, basis: `${elA} vs. ${elB} — kein automatischer Konflikt, aber Übersetzung nötig.` };
}

function pickContactExperiment({ elA, elB, ascA, ascB, band }) {
  if (ascA === 'Cancer' || ascB === 'Cancer' || elA === 'Wasser' || elB === 'Wasser') {
    return {
      title: '24h Kontakt-Experiment',
      instruction: 'Stellt euch heute eine konkrete Frage, statt Verhalten zu deuten. Frage: „Was brauchst du gerade von mir: Nähe, Klarheit oder Raum?"',
      reflectionQuestion: 'Wurde der Kontakt leichter, als das Bedürfnis ausgesprochen war?',
      tags: ['Nähe-Regulation', '24 Stunden'],
      sourceReason: 'Wasser/Cancer-Signal — Bedürfnisse werden indirekt kommuniziert',
    };
  }
  if (elA === 'Metall' || elB === 'Metall') {
    return {
      title: '24h Kontakt-Experiment',
      instruction: 'Benennt heute jeweils eine Entscheidung, die in eurem Kontakt offen ist — schriftlich, ein Satz reicht.',
      reflectionQuestion: 'Was wurde leichter, als die Entscheidung sichtbar war?',
      tags: ['Klarheit', '24 Stunden'],
      sourceReason: 'Metall-Signal — Klarheit als Hebel',
    };
  }
  if (elA === 'Feuer' || elB === 'Feuer') {
    return {
      title: '24h Kontakt-Experiment',
      instruction: 'Zeigt heute jeweils etwas, das ihr sonst noch zurückhaltet — eine Idee, ein Gefühl, eine Beobachtung.',
      reflectionQuestion: 'Was hat sich an Resonanz gezeigt?',
      tags: ['Ausdruck', '24 Stunden'],
      sourceReason: 'Feuer-Signal — Ausdruck als Hebel',
    };
  }
  if (band === 'high') {
    return {
      title: '24h Kontakt-Experiment',
      instruction: 'Fragt euch heute, wo ihr einander automatisch zustimmt. Was wäre eure ehrliche Gegenposition?',
      reflectionQuestion: 'Welche Sicht ist sichtbar geworden, die ihr sonst überlest?',
      tags: ['Blindspot', '24 Stunden'],
      sourceReason: 'Hohe Resonanz — Echoraum-Risiko',
    };
  }
  return {
    title: '24h Kontakt-Experiment',
    instruction: 'Sprecht heute eine Sache direkter aus, als ihr es sonst tut.',
    reflectionQuestion: 'Was wurde leichter, als ihr klarer wurdet?',
    tags: ['Klarer Schritt', '24 Stunden'],
    sourceReason: 'Default — keine spezifische Element-Regel',
  };
}

export function buildRelationshipResonance({
  personAProfile = null,
  personBProfile = null,
  synastryRaw = null,
  options = {},
} = {}) {
  // ── Resonanz-Index ────────────────────────────────────────────────────────
  let indexNum = null;
  if (typeof synastryRaw?.combined_coherence === 'number') {
    indexNum = Math.round(synastryRaw.combined_coherence * 100);
  } else if (personAProfile?.fusion?.coherence_index != null && personBProfile?.fusion?.coherence_index != null) {
    const avg = (personAProfile.fusion.coherence_index + personBProfile.fusion.coherence_index) / 2;
    indexNum = Math.round(avg * 100);
  }
  if (!personBProfile) indexNum = null;
  const bandInfo = getRelationshipScoreBand(indexNum);

  // ── Bridge & Friction ─────────────────────────────────────────────────────
  const elA = dominantElement(personAProfile);
  const elB = dominantElement(personBProfile);
  const ascA = ascendantSign(personAProfile);
  const ascB = ascendantSign(personBProfile);

  const bridge   = bridgeForElements(elA, elB);
  const friction = frictionForElements(elA, elB);

  const mainConnection = {
    title:   `Hauptverbindung: ${bridge.label}`,
    summary: bridge.basis,
    evidence: [
      elA ? `Person A dominant: ${elA} (${ELEMENT_NUTZER[elA] || elA})` : null,
      elB ? `Person B dominant: ${elB} (${ELEMENT_NUTZER[elB] || elB})` : null,
    ].filter(Boolean),
    sourceLayer: 'wuxing',
    confidence:  (elA && elB) ? 0.7 : 0.3,
  };

  const tensionFromRaw = synastryRaw?.element_tension;
  const frictionTitle  = tensionFromRaw
    ? `Hauptspannung: ${tensionFromRaw.dominant_a || elA || '?'} ⟷ ${tensionFromRaw.dominant_b || elB || '?'}`
    : `Hauptspannung: ${friction.label}`;
  const mainFriction = {
    title:   frictionTitle,
    summary: tensionFromRaw
      ? 'Beide Pole brauchen Raum — sonst kippt der Kontakt einseitig.'
      : friction.basis,
    evidence: [
      ascA ? `Aszendent A: ${ascA}` : null,
      ascB ? `Aszendent B: ${ascB}` : null,
      tensionFromRaw?.tension_score != null ? `Spannungs-Intensität: ${Math.round(tensionFromRaw.tension_score * 100)}` : null,
    ].filter(Boolean),
    sourceLayer: tensionFromRaw ? 'synastry' : 'wuxing',
    confidence:  tensionFromRaw ? 0.8 : 0.4,
  };

  // ── Contact Experiment ────────────────────────────────────────────────────
  const contactExperiment = pickContactExperiment({ elA, elB, ascA, ascB, band: bandInfo.band });

  // ── Drei-Satz-Summary ─────────────────────────────────────────────────────
  const connectionSentence = personBProfile
    ? `${RELATIONSHIP_SUMMARY_LEAD_INS.connection} ${bridge.basis}`
    : `${RELATIONSHIP_SUMMARY_LEAD_INS.connection} Lege eine zweite Person an, um die Verbindung zu sehen.`;
  const frictionSentence = personBProfile
    ? `${RELATIONSHIP_SUMMARY_LEAD_INS.friction} ${friction.basis}`
    : `${RELATIONSHIP_SUMMARY_LEAD_INS.friction} Reibungspunkte werden sichtbar, sobald beide Profile vorliegen.`;
  const practicalSentence = `${RELATIONSHIP_SUMMARY_LEAD_INS.practical} ${contactExperiment.instruction}`;

  // ── Deep Dive Passthrough ─────────────────────────────────────────────────
  const deepDive = {
    wuxing:         (elA && elB) ? { dominantA: elA, dominantB: elB, bridge: bridge.label, friction: friction.label } : null,
    bazi:           (personAProfile?.bazi && personBProfile?.bazi) ? {
                      dayMasterA: personAProfile.bazi.day_master,
                      dayMasterB: personBProfile.bazi.day_master,
                    } : null,
    westernAspects: null, // Plan §13: zusätzlicher Layer, kommt aus Synastry-Adapter
    houses:         null, // wird in Phase 2 erweitert
    fusion:         (indexNum != null) ? { resonanceIndex: indexNum, band: bandInfo.band } : null,
  };

  return {
    resonanceIndex: indexNum,
    resonanceBand:  bandInfo.band,
    bandDetails:    bandInfo,
    summaryStatements: [connectionSentence, frictionSentence, practicalSentence],
    mainConnection,
    mainFriction,
    contactExperiment,
    deepDive,
    safetyCaveat: RELATIONSHIP_SAFETY_CAVEAT,
  };
}
