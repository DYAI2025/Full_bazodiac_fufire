// Sprach-Whitelist & Defensive Copy für Variante C.
// Verboten ist alles, was Beziehung als deterministisch, garantiert oder als
// Soulmate-Match framt. Reihenfolge & Wortwahl gemäß Plan §17 / STORY-C-001.

export const RELATIONSHIP_SAFETY_CAVEAT =
  'Kontaktmuster, kein Urteil. Diese Auswertung beschreibt Resonanz und Reibung, keine Beziehungsgarantie.';

// Strings, die niemals in produzierter Relationship-Copy auftauchen dürfen.
// "Match" / "kompatibel" sind im Beziehungskontext gesperrt — in technischen
// Begriffen wie "kompatibel mit Node 20" weiterhin frei.
export const BANNED_RELATIONSHIP_PHRASES = [
  'garantiert',
  'perfekt kompatibel',
  'perfekt füreinander',
  'perfekter Partner',
  'perfekte Partnerin',
  'Schicksal',
  'schicksalhaft',
  'Seelenpartner',
  'Seelenverwandt',
  'Soulmate',
  'füreinander bestimmt',
  'Match-Score',
  'Match Score',
  'kompatibilitätsurteil',
  'Beziehungsgarantie',
];

const LOWER_BANNED = BANNED_RELATIONSHIP_PHRASES.map((s) => s.toLowerCase());

// Wörter, die direkt vor einer verbotenen Phrase deren Verwendung erlauben
// (Defensive Copy: "kein Match-Score", "keine Beziehungsgarantie").
const NEGATORS = ['kein', 'keine', 'keinen', 'keiner', 'keines', 'nicht', 'niemals', 'ohne'];

export function containsBannedRelationshipPhrase(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  for (const phrase of LOWER_BANNED) {
    let idx = 0;
    while ((idx = lower.indexOf(phrase, idx)) !== -1) {
      const before = lower.slice(0, idx).trimEnd();
      const lastWord = before.split(/[\s.,;:!?„"„]+/).pop();
      if (!NEGATORS.includes(lastWord)) return true;
      idx += phrase.length;
    }
  }
  return false;
}

// Drei-Satz-Template gemäß STORY-C-001 + Iteration 1A. Build-Funktion in
// relationshipResonance.js füllt die Slots aus deterministischen Daten.
// Lead-ins exakt wie in Goal §Akzeptanzkriterium 3 verlangt.
export const RELATIONSHIP_SUMMARY_LEAD_INS = {
  connection: 'Hauptverbindung:',
  friction:   'Hauptspannung:',
  practical:  'Heutiger Kontaktimpuls:',
};
