// Daily-Experiment-Engine. Pure rules → 24h-Handlung mit nachvollziehbarem sourceReason.
// Priorisierung: aktiviertes Haus > schwaches Element > Kohärenz-Band > Default.
// Default-Regel feuert nur, wenn keine spezifische Regel matcht.

import { getCoherenceBand } from './dailyCompanion.js';

function mk(title, instruction, reflectionQuestion, tags, sourceReason) {
  return { title, instruction, reflectionQuestion, tags: [...tags, '24 Stunden'], sourceReason };
}

const houseRule = (houseId, tag, instr, refl) => ({
  sourceReason: `${houseId}. Haus aktiv`,
  match: ({ activeHouses }) => activeHouses?.[0]?.house === houseId,
  build: () => mk('24h Experiment', instr, refl, [tag], `${houseId}. Haus aktiv`),
});

const elementRule = (elementKey, tag, instr, refl) => ({
  sourceReason: `${elementKey}-Hebel schwach`,
  match: ({ exp }) => exp?.fusion?.deficientElement === elementKey,
  build: () => mk('24h Experiment', instr, refl, [tag], `${elementKey}-Hebel schwach`),
});

const bandRule = (bandSet, tag, instr, refl, reason) => ({
  sourceReason: reason,
  match: ({ exp }) => bandSet.has(getCoherenceBand(exp?.fusion?.coherence)),
  build: () => mk('24h Experiment', instr, refl, [tag], reason),
});

const DEFAULT_RULE = {
  sourceReason: 'Default — keine Spezialregel',
  match: () => true,
  build: () => mk(
    '24h Experiment',
    'Sprich heute eine Sache direkter aus als sonst.',
    'Was wurde leichter, als du klarer wurdest?',
    ['Klarer Schritt'],
    'Default — keine Spezialregel',
  ),
};

// Reihenfolge ist die Priorisierung. Default IMMER am Schluss.
export const EXPERIMENT_RULES = [
  houseRule(3,  'Kommunikation',         'Schreibe eine Aussage auf, bevor du sie sendest.',                 'Was wurde klarer, als du es sichtbar gemacht hast?'),
  houseRule(4,  'Familie & Innenraum',   'Räume heute eine Ecke deines Zuhauses, die du sonst übersiehst.',  'Was hat sich an Stimmung verändert?'),
  houseRule(10, 'Sichtbarkeit & Arbeit', 'Mache heute eine offene Arbeit sichtbar — sende, statt zu polieren.', 'Welcher Druck hat sich gelöst?'),
  houseRule(7,  'Partnerschaft',         'Sag in einem Kontakt heute eine Sache direkt aus.',                 'Was wurde leichter im Gegenüber?'),
  elementRule('Metall', 'Entscheidung',  'Triff heute eine offene Sache schriftlich — ein Satz reicht.',     'Was hat sich an Energie freigesetzt?'),
  elementRule('Wasser', 'Reflexion',     'Lass heute eine Entscheidung 24h reifen, schreib sie auf.',        'Was hat sich an Klarheit gezeigt?'),
  elementRule('Holz',   'Wachstum',      'Setze heute einen Schritt, der erst in einer Woche zählt.',        'Was hat sich an Richtung gezeigt?'),
  elementRule('Feuer',  'Ausdruck',      'Zeige heute eine Sache, bevor sie fertig ist.',                    'Was hat sich an Resonanz gezeigt?'),
  elementRule('Erde',   'Halten',        'Halte heute eine Sache aus, statt sie zu beschleunigen.',          'Was wurde stabiler?'),
  bandRule(new Set(['high', 'very-high']), 'Blindspot prüfen',
           'Frage heute eine Person nach einem Eindruck, den du sonst überhörst.',
           'Was war an dieser Sicht ungewohnt?',
           'Kohärenz hoch — Echoraum-Risiko'),
  bandRule(new Set(['low']), 'Spannung benennen',
           'Benenne heute eine innere Spannung in einem Satz.',
           'Was wurde leichter, als sie ausgesprochen war?',
           'Kohärenz niedrig — Spannung produktiv machen'),
  bandRule(new Set(['medium']), 'Brücke bauen',
           'Verbinde heute zwei Themen, die du sonst getrennt hältst.',
           'Wo hat die Brücke gehalten?',
           'Kohärenz mittel — Brücke nutzen'),
  DEFAULT_RULE,
];

export function pickDailyExperiment(context) {
  for (const rule of EXPERIMENT_RULES) {
    if (rule.match(context)) return rule.build(context);
  }
  return DEFAULT_RULE.build(context);
}
