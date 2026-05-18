// Single source of truth für Hero-Statements, Score-Erklärungen, Experiments.
// Reine Funktionen, kein DOM. Tests pinnen das Output-Shape.

const SIGN_DE = {
  Aries:    'Widder',
  Taurus:   'Stier',
  Gemini:   'Zwillinge',
  Cancer:   'Krebs',
  Leo:      'Löwe',
  Virgo:    'Jungfrau',
  Libra:    'Waage',
  Scorpio:  'Skorpion',
  Sagittarius: 'Schütze',
  Capricorn:'Steinbock',
  Aquarius: 'Wassermann',
  Pisces:   'Fische',
};

const signDE = (s) => (s ? SIGN_DE[s] || s : null);

// Adapter: nimmt das rohe Server-Profil (profile.western.bodies.Sun.sign,
// profile.bazi.day_master.{stem,element}, profile.fusion.wu_xing_vectors,
// profile.fusion.coherence_index) und erzeugt die ExperienceProfile-Form,
// die alle Copy-Funktionen erwarten.
export function buildExperienceProfile(profile) {
  const ascRaw  = profile?.western?.ascendant;
  const ascSign = typeof ascRaw === 'string' ? ascRaw : ascRaw?.sign;
  const v =
    profile?.fusion?.wu_xing_vectors?.fusion ||
    profile?.fusion?.wu_xing_vectors?.western_planets || null;
  let dominantElement = null, deficientElement = null;
  if (v) {
    const entries = Object.entries(v);
    dominantElement  = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    deficientElement = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  }
  const ciRaw = profile?.fusion?.coherence_index;
  const coherence = (ciRaw == null) ? null : Math.round(Number(ciRaw) * 100);
  return {
    western: {
      sun:       { sign: profile?.western?.bodies?.Sun?.sign },
      moon:      { sign: profile?.western?.bodies?.Moon?.sign },
      ascendant: { sign: ascSign },
    },
    bazi: {
      dayMaster: {
        stem:    profile?.bazi?.day_master?.stem,
        element: profile?.bazi?.day_master?.element,
      },
    },
    fusion: { coherence, dominantElement, deficientElement },
  };
}

export function buildCoreIdentity(profile) {
  return {
    sun:       signDE(profile?.western?.sun?.sign)       ?? '—',
    moon:      signDE(profile?.western?.moon?.sign)      ?? '—',
    ascendant: signDE(profile?.western?.ascendant?.sign) ?? '—',
    dayMaster: [profile?.bazi?.dayMaster?.stem, profile?.bazi?.dayMaster?.element]
                 .filter(Boolean).join(' ') || '—',
  };
}

const TONE_BY_DOMINANT = {
  Erde:   'Tiefe Substanz',
  Wasser: 'Tiefer Strom',
  Holz:   'Wachstumsdrang',
  Feuer:  'Sichtbare Energie',
  Metall: 'Klare Kontur',
};

export function buildFusionSignatureTitle(profile) {
  const id = buildCoreIdentity(profile);
  const dom = profile?.fusion?.dominantElement;
  const tone = TONE_BY_DOMINANT[dom] ?? 'Eigenständige Signatur';
  return `${tone} mit ${id.ascendant}-Kontaktstil`;
}

export function explainCoherence(profile) {
  const c = Number(profile?.fusion?.coherence ?? 0);
  let bucket = 'mittler';
  if (c >= 75) bucket = 'hoch';
  if (c < 40)  bucket = 'niedrig';
  const meaning = bucket === 'hoch'
    ? 'Westliche Signatur und BaZi zeigen eine hohe Deckungsgleichheit. Mehrere Systeme zeigen in dieselbe Richtung.'
    : bucket === 'niedrig'
    ? 'Westliche Signatur und BaZi zeigen eine niedrige Deckungsgleichheit. Dein System trägt mehrere Strategien parallel.'
    : 'Westliche Signatur und BaZi zeigen eine mittlere Deckungsgleichheit. Mehrere Systeme arbeiten zusammen, aber nicht automatisch konfliktfrei.';
  return {
    score: c,
    scoreLabel: 'Kohärenz-Index',
    meaning,
    raises: [
      'Sonne/Mond/Day-Master-Resonanz',
      profile?.fusion?.dominantElement ? `${profile.fusion.dominantElement}-Achse stark` : null,
    ].filter(Boolean),
    lowers: [
      profile?.fusion?.deficientElement ? `${profile.fusion.deficientElement}-Unterrepräsentation` : null,
      'Mars/Saturn-Spannung',
    ].filter(Boolean),
    action: 'Heute eine Sache klar benennen, statt sie indirekt zu testen.',
    caveat: 'Kein Persönlichkeitsanteil, sondern ein Indexwert.',
  };
}

export function buildDominantTension(profile) {
  const dom = profile?.fusion?.dominantElement;
  const def = profile?.fusion?.deficientElement;
  if (!dom || !def) {
    return { statement: 'Deine Signatur zeigt eine ausgeglichene Verteilung — keine einzelne Spannung dominiert.' };
  }
  return {
    statement: `Die zentrale Spannung liegt zwischen viel ${dom} und wenig ${def}: dein System bevorzugt ${dom}-Strategien, braucht aber ${def}-Qualitäten, um nicht einseitig zu werden.`,
  };
}

const FOCUS_BY_DOMINANT = {
  Erde:   'Halten und stabilisieren',
  Wasser: 'Spüren und reflektieren',
  Holz:   'Anstoßen und gestalten',
  Feuer:  'Zeigen und ausdrücken',
  Metall: 'Entscheiden und klären',
};

export function buildDailyFallback(profile) {
  const dom = profile?.fusion?.dominantElement ?? 'Erde';
  return {
    focus:   FOCUS_BY_DOMINANT[dom] ?? 'Wahrnehmen und reagieren',
    impulse: `Heute eine Sache aus deinem ${dom}-Modus bewusst tun — ohne sie zu erklären.`,
    source:  'static_fallback',
  };
}

const EXPERIMENT_TEMPLATES = {
  love: {
    title: 'Beziehungsexperiment',
    instruction: 'Sage ein Bedürfnis aus, bevor du prüfst, ob die andere Person es von selbst merkt.',
    reflectPrompt: 'Was wurde leichter, als du klarer wurdest?',
  },
  career: {
    title: '24h Arbeitsimpuls',
    instruction: 'Entscheide heute eine offene Sache schriftlich — ein Satz reicht.',
    reflectPrompt: 'Was hat sich an Energie freigesetzt, als die Entscheidung sichtbar war?',
  },
  daily: {
    title: '24h Experiment',
    instruction: 'Sprich eine Sache direkter aus, als du sie sonst formulieren würdest.',
    reflectPrompt: 'Was wurde leichter, als du klarer wurdest?',
  },
};

export function buildActionExperiment(domain, profile) {
  const base = EXPERIMENT_TEMPLATES[domain] ?? EXPERIMENT_TEMPLATES.daily;
  return { ...base, duration: '24 Stunden', source: 'static_interpretation' };
}
