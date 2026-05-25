// Deterministischer Kernsatz — kein LLM, reine statische Tabelle
// Quelle: Day Master + Sun Sign + Coherence Index

const DM_TRAITS = {
  '甲': { name: 'Yang-Holz',   core: 'Aufwärtswachstum und Pioniergeist' },
  '乙': { name: 'Yin-Holz',    core: 'Anpassungsfähige Ausdauer' },
  '丙': { name: 'Yang-Feuer',  core: 'Strahlende Wärme und Führungskraft' },
  '丁': { name: 'Yin-Feuer',   core: 'Tiefe Empfindsamkeit und inneres Licht' },
  '戊': { name: 'Yang-Erde',   core: 'Zuverlässige Substanz und Beständigkeit' },
  '己': { name: 'Yin-Erde',    core: 'Nährende Tiefe und feines Gespür' },
  '庚': { name: 'Yang-Metall', core: 'Entschlossenheit und klare Struktur' },
  '辛': { name: 'Yin-Metall',  core: 'Präzision und raffinierte Schönheit' },
  '壬': { name: 'Yang-Wasser', core: 'Bewegliche Intelligenz und Weitsicht' },
  '癸': { name: 'Yin-Wasser',  core: 'Intuition und stille Tiefe' },
};

const SUN_SIGN_SHORT = {
  Aries: 'Widder', Taurus: 'Stier', Gemini: 'Zwillinge', Cancer: 'Krebs',
  Leo: 'Löwe', Virgo: 'Jungfrau', Libra: 'Waage', Scorpio: 'Skorpion',
  Sagittarius: 'Schütze', Capricorn: 'Steinbock', Aquarius: 'Wassermann', Pisces: 'Fische',
};

export function generateCoreStatement(profile) {
  const dm  = profile?.bazi?.day_master?.stem;
  const sun = profile?.western?.bodies?.Sun;
  const ci  = profile?.fusion?.coherence_index;

  if (!dm && !sun) return null;

  const parts = [];

  if (dm && DM_TRAITS[dm]) {
    const t = DM_TRAITS[dm];
    parts.push(`Dein Day Master ${dm} (${t.name}) steht für ${t.core}`);
  }

  if (sun?.sign) {
    const sign = SUN_SIGN_SHORT[sun.sign] || sun.sign;
    parts.push(`trifft auf eine Sonne im ${sign}`);
  }

  if (ci !== null && ci !== undefined) {
    const cohText = ci >= 0.7
      ? '— eine hohe innere Deckungsgleichheit'
      : ci <= 0.35
      ? '— eine kreative Spannung zwischen östlichem und westlichem Selbstbild'
      : '— eine ausgewogene Mischung aus Stabilität und Entwicklung';
    parts.push(cohText);
  }

  return parts.length ? parts.join(' ') + '.' : null;
}
