// Education-First Content-Registries für Variante 1B.
// Single source of truth für Bedeutungen — Komponenten lesen daraus,
// rendern nie "Keine Beschreibung verfügbar". Wenn ein Key fehlt,
// liefert der Lookup einen Basis-Fallback statt eines leeren Slots.

// ── BaZi-Säulen (Year/Month/Day/Hour) ──────────────────────────────────────
export const PILLAR_ROLES = {
  year:  { label: 'Jahressäule',  role: 'Herkunft, Ahnen, langfristiger Hintergrund' },
  month: { label: 'Monatssäule',  role: 'Berufung, Eltern, soziale Verortung' },
  day:   { label: 'Tagessäule',   role: 'Day Master — dein Kern und enger Kontakt' },
  hour:  { label: 'Stundensäule', role: 'Nachkommen, Output, späte Lebensphase' },
};

// Heavenly Stems (10) — Pinyin + Element/Polarität + Nutzer-Deutung
export const STEM_MEANINGS = {
  Jia:  { stem: '甲', element: 'Holz',   polarity: 'Yang', resource: 'Initiative, klare Richtung', shadow: 'starrsinnig, übertreibt Eigenständigkeit', practice: 'Setze heute einen Schritt, der erst später zählt.' },
  Yi:   { stem: '乙', element: 'Holz',   polarity: 'Yin',  resource: 'Beweglichkeit, Anpassung',   shadow: 'verbiegt sich aus Harmoniedrang',         practice: 'Sag heute einmal Nein, ohne dich zu rechtfertigen.' },
  Bing: { stem: '丙', element: 'Feuer',  polarity: 'Yang', resource: 'Ausstrahlung, Wärme',        shadow: 'überdreht, schiebt Spannungen weg',       practice: 'Zeige heute eine Sache, bevor sie fertig ist.' },
  Ding: { stem: '丁', element: 'Feuer',  polarity: 'Yin',  resource: 'Konzentration, Nähe-Wärme',   shadow: 'flackert, wenn Aufmerksamkeit fehlt',     practice: 'Bleib heute zwanzig Minuten bei einer Sache.' },
  Wu:   { stem: '戊', element: 'Erde',   polarity: 'Yang', resource: 'Substanz, Verlässlichkeit',   shadow: 'starr, nimmt zu viel Last',                practice: 'Lass heute eine Sache liegen, ohne Schuld.' },
  Ji:   { stem: '己', element: 'Erde',   polarity: 'Yin',  resource: 'Fürsorge, Boden bereiten',    shadow: 'übernimmt fremde Verantwortung',           practice: 'Frage heute, was die andere Person wirklich braucht.' },
  Geng: { stem: '庚', element: 'Metall', polarity: 'Yang', resource: 'Klarheit, Entscheidung',      shadow: 'zu schneidend, urteilt schnell',           practice: 'Triff heute eine offene Sache schriftlich.' },
  Xin:  { stem: '辛', element: 'Metall', polarity: 'Yin',  resource: 'feines Urteil, Ästhetik',     shadow: 'kritisch, perfektionistisch',              practice: 'Lass heute eine Sache unfertig stehen.' },
  Ren:  { stem: '壬', element: 'Wasser', polarity: 'Yang', resource: 'Fluss, Weitsicht',            shadow: 'verliert sich in Optionen',                practice: 'Entscheide heute mit dem, was du gerade weißt.' },
  Gui:  { stem: '癸', element: 'Wasser', polarity: 'Yin',  resource: 'Intuition, Tiefe',             shadow: 'zieht sich zurück, statt zu sprechen',     practice: 'Sprich heute eine leise Wahrnehmung laut aus.' },
};

// Earthly Branches (12) — Tier + Element + Deutung
export const BRANCH_MEANINGS = {
  Zi:   { branch: '子', animal: 'Ratte',    element: 'Wasser', resource: 'Wachheit, neue Anfänge',   shadow: 'unruhig, vorzeitig',         practice: 'Halt heute eine Bewegung kurz an, bevor du losgehst.' },
  Chou: { branch: '丑', animal: 'Büffel',   element: 'Erde',   resource: 'Geduld, Ausdauer',         shadow: 'verbissen, langsam',         practice: 'Heb heute bewusst eine Schwere ab — körperlich oder mental.' },
  Yin:  { branch: '寅', animal: 'Tiger',    element: 'Holz',   resource: 'Mut, Aufbruch',            shadow: 'sprunghaft, überschätzt sich', practice: 'Wage heute eine kleine Sache, die du sonst aufschiebst.' },
  Mao:  { branch: '卯', animal: 'Hase',     element: 'Holz',   resource: 'Sensibilität, Beziehung',  shadow: 'unentschieden, ausweichend', practice: 'Bleib heute in einem Gespräch eine Frage länger.' },
  Chen: { branch: '辰', animal: 'Drache',   element: 'Erde',   resource: 'Vision, Ressourcen',       shadow: 'überdimensioniert',          practice: 'Reduzier heute einen Plan auf einen einzigen Schritt.' },
  Si:   { branch: '巳', animal: 'Schlange', element: 'Feuer',  resource: 'Tiefe, Transformation',    shadow: 'manipuliert, hintergründig', practice: 'Sag heute klar, was du eigentlich willst.' },
  Wu:   { branch: '午', animal: 'Pferd',    element: 'Feuer',  resource: 'Energie, Bewegung',        shadow: 'getrieben, hektisch',        practice: 'Geh heute einmal langsam, wo du sonst rennst.' },
  Wei:  { branch: '未', animal: 'Ziege',    element: 'Erde',   resource: 'Empathie, Kunst',          shadow: 'launisch, anpassungsweich',  practice: 'Setz heute eine kleine ästhetische Geste.' },
  Shen: { branch: '申', animal: 'Affe',     element: 'Metall', resource: 'Witz, Anpassung',          shadow: 'launisch, ablenkbar',        practice: 'Bleib heute bei einer Aufgabe, bis sie wirklich fertig ist.' },
  You:  { branch: '酉', animal: 'Hahn',     element: 'Metall', resource: 'Klarheit, Disziplin',      shadow: 'überkritisch, eitel',        practice: 'Lob heute jemanden konkret, ohne Vergleich.' },
  Xu:   { branch: '戌', animal: 'Hund',     element: 'Erde',   resource: 'Loyalität, Pflicht',       shadow: 'misstrauisch, defensiv',     practice: 'Vertrau heute einmal, bevor du prüfst.' },
  Hai:  { branch: '亥', animal: 'Schwein',  element: 'Wasser', resource: 'Großzügigkeit, Hingabe',   shadow: 'überfließend, naiv',         practice: 'Setze heute eine sanfte Grenze, ohne dich zu erklären.' },
};

// ── WuXing — fünf Elemente, Bedeutung & Stärke/Schwäche/Übersteuerung ──
export const WUXING_MEANINGS = {
  Holz: {
    label: 'Holz', symbol: '🌳', polarity: 'wachsend',
    meaning: 'Wachstum, Vision, Richtung; was sich aufbäumt und neue Form sucht.',
    strong:  'Du startest leicht und ziehst andere mit; Aufbrüche fallen dir zu.',
    weak:    'Du fängst viel an und verzettelst dich; Richtung verliert sich.',
    over:    'Du überrollst andere mit deinem Tempo und reißt Strukturen nieder.',
    balance: 'Setze heute einen kleinen Schritt, der erst in einer Woche zählt.',
  },
  Feuer: {
    label: 'Feuer', symbol: '🔥', polarity: 'leuchtend',
    meaning: 'Ausdruck, Sichtbarkeit, Begeisterung; was sich zeigen und teilen will.',
    strong:  'Du wärmst andere und reißt mit; Begeisterung ist ansteckend.',
    weak:    'Du hältst dich zurück und wirst übersehen; Funken erlöschen früh.',
    over:    'Du brennst aus, weil du dich pausenlos zeigst und nichts hältst.',
    balance: 'Zeige heute eine Sache, bevor sie fertig ist — aber nur eine.',
  },
  Erde: {
    label: 'Erde', symbol: '🪨', polarity: 'haltend',
    meaning: 'Mitte, Substanz, Verlässlichkeit; was hält, nährt und zusammenführt.',
    strong:  'Andere ruhen bei dir; du wirst zum Boden, der trägt.',
    weak:    'Du schwankst zwischen Bedürfnissen anderer und verlierst dich.',
    over:    'Du nimmst zu viel Last und erstarrst; alles bleibt an dir hängen.',
    balance: 'Lass heute eine Verantwortung bewusst bei jemand anderem.',
  },
  Metall: {
    label: 'Metall', symbol: '⚙️', polarity: 'klar',
    meaning: 'Klarheit, Grenze, Entscheidung; was geschnitten und benannt wird.',
    strong:  'Du triffst klare Entscheidungen und schaffst Struktur.',
    weak:    'Du verlierst dich in Optionen und wirst beliebig.',
    over:    'Du wirst kalt und urteilst, bevor du verstanden hast.',
    balance: 'Schreib heute eine offene Entscheidung in einem Satz auf.',
  },
  Wasser: {
    label: 'Wasser', symbol: '💧', polarity: 'fließend',
    meaning: 'Tiefe, Reflexion, Anpassung; was beobachtet und unter der Oberfläche wirkt.',
    strong:  'Du spürst leise Bewegungen und denkst lang nach.',
    weak:    'Du wirkst abwesend und triffst zu spät Entscheidungen.',
    over:    'Du verlierst dich in Optionen und wartest, bis es zu spät ist.',
    balance: 'Sprich heute eine leise Wahrnehmung laut aus.',
  },
};

// ── Westliche Faktoren — Sonnen-/Mond-/Aszendent-Zeichen + Häuser ──
const SIGN_BASE = (de, element, mode, resource, shadow, practice) =>
  ({ de, element, mode, resource, shadow, practice });

export const WESTERN_SIGN_MEANINGS = {
  Aries:       SIGN_BASE('Widder',     'Feuer',  'kardinal', 'Initiative, Mut, Aufbruch',         'übereilt, kämpferisch',          'Mach heute eine Sache zuerst, bevor du sie planst.'),
  Taurus:      SIGN_BASE('Stier',      'Erde',   'fix',      'Verlässlichkeit, Sinnlichkeit',     'beharrend, träge',               'Halt heute bewusst etwas, das du sonst loslässt.'),
  Gemini:      SIGN_BASE('Zwillinge',  'Luft',   'wandelbar','Neugier, Sprache, Vermittlung',     'sprunghaft, unverbindlich',      'Bleib heute zwanzig Minuten bei einer Sache.'),
  Cancer:      SIGN_BASE('Krebs',      'Wasser', 'kardinal', 'Schutz, Nähe, Erinnerung',          'rückzüglich, anhänglich',        'Frage heute klar, was du brauchst — statt zu hoffen, dass es bemerkt wird.'),
  Leo:         SIGN_BASE('Löwe',       'Feuer',  'fix',      'Ausstrahlung, Würde, Großzügigkeit','dominant, eitel',                'Lob heute jemanden, ohne dich selbst zu erwähnen.'),
  Virgo:       SIGN_BASE('Jungfrau',   'Erde',   'wandelbar','Analyse, Pflege, Dienst',           'kritisch, sorgenvoll',           'Lass heute eine Sache unfertig.'),
  Libra:       SIGN_BASE('Waage',      'Luft',   'kardinal', 'Ausgleich, Ästhetik, Kontakt',      'unentschlossen, gefällig',       'Triff heute eine Entscheidung ohne Konsens.'),
  Scorpio:     SIGN_BASE('Skorpion',   'Wasser', 'fix',      'Tiefe, Wandel, Loyalität',          'misstrauisch, kontrollierend',    'Sag heute eine Wahrheit, die du sonst hütest.'),
  Sagittarius: SIGN_BASE('Schütze',    'Feuer',  'wandelbar','Weite, Sinn, Optimismus',           'übersteuert, dogmatisch',        'Gib heute deine Meinung zurück, ohne sie zu verteidigen.'),
  Capricorn:   SIGN_BASE('Steinbock',  'Erde',   'kardinal', 'Disziplin, Verantwortung',          'streng, freudlos',               'Mach heute etwas, das keinen Nutzen hat.'),
  Aquarius:    SIGN_BASE('Wassermann', 'Luft',   'fix',      'Vision, Eigenständigkeit',          'distanziert, kühl',              'Geh heute näher, als dir lieb ist.'),
  Pisces:      SIGN_BASE('Fische',     'Wasser', 'wandelbar','Mitgefühl, Hingabe, Kreativität',   'verschwommen, opferbereit',      'Setz heute eine Grenze, ohne dich zu erklären.'),
};

export const HOUSE_MEANINGS = {
  1:  { label: 'Identität',           glyph: '♈︎', context: 'Aszendent, Auftreten' },
  2:  { label: 'Ressourcen',          glyph: '♉︎', context: 'Werte, Besitz' },
  3:  { label: 'Kommunikation',       glyph: '♊︎', context: 'Sprache, nahe Beziehungen' },
  4:  { label: 'Familie & Innenraum', glyph: '♋︎', context: 'Wurzeln, Zuhause' },
  5:  { label: 'Kreativität',         glyph: '♌︎', context: 'Ausdruck, Spiel' },
  6:  { label: 'Alltag & Gesundheit', glyph: '♍︎', context: 'Routine, Dienst' },
  7:  { label: 'Partnerschaft',       glyph: '♎︎', context: 'Gegenüber, Verträge' },
  8:  { label: 'Transformation',      glyph: '♏︎', context: 'gemeinsame Ressourcen, Wandel' },
  9:  { label: 'Sinn & Weite',        glyph: '♐︎', context: 'Reise, Studium, Glaube' },
  10: { label: 'Sichtbarkeit',        glyph: '♑︎', context: 'Berufung, öffentliche Rolle' },
  11: { label: 'Gemeinschaft',        glyph: '♒︎', context: 'Netzwerk, Hoffnungen' },
  12: { label: 'Rückzug & Tiefe',     glyph: '♓︎', context: 'Unbewusstes, Auflösung' },
};

// ── Kohärenz — kein Gut/Schlecht-Wert ────────────────────────────────────
export const COHERENCE_MEANINGS = {
  low: {
    band: 'low', label: 'niedrige automatische Resonanz',
    meaning:  'Deine Systeme zeigen unterschiedliche Akzente. Das heißt nicht „schlecht", sondern „braucht mehr bewusste Übersetzung".',
    strength: 'Vielfalt — du trägst mehrere Strategien parallel.',
    risk:     'Du kannst dich zwischen Polen aufreiben, wenn du sie nicht benennst.',
    caveat:   'Kein Gut-Schlecht-Wert, kein Persönlichkeitsanteil. Index, kein Urteil.',
  },
  mixed: {
    band: 'mixed', label: 'gemischte Resonanz',
    meaning:  'Verbindung und Reibung halten sich die Waage.',
    strength: 'Lernfeld: Spannung wird produktiv, wenn du sie aussprichst.',
    risk:     'Du behandelst Reibung als Problem, statt sie zu nutzen.',
    caveat:   'Kein Gut-Schlecht-Wert, kein Persönlichkeitsanteil. Index, kein Urteil.',
  },
  high: {
    band: 'high', label: 'hohe Resonanz mit Lernfeld',
    meaning:  'Mehrere Systeme zeigen in eine ähnliche Richtung.',
    strength: 'Schnelle Anschlussfähigkeit, geteilte Grundsprache.',
    risk:     'Blinde Flecken, weil sich Muster gegenseitig bestätigen.',
    caveat:   'Kein Gut-Schlecht-Wert, kein Persönlichkeitsanteil. Index, kein Urteil.',
  },
  veryHigh: {
    band: 'very-high', label: 'sehr hohe Resonanz',
    meaning:  'Deine Systeme decken sich fast vollständig.',
    strength: 'Hohe Selbstkongruenz, klarer roter Faden.',
    risk:     'Wenig Innenreiz für Wachstum — Außenperspektive aktiv suchen.',
    caveat:   'Kein Gut-Schlecht-Wert, kein Persönlichkeitsanteil. Index, kein Urteil.',
  },
  unknown: {
    band: 'unknown', label: 'kein Wert verfügbar',
    meaning:  'Für diese Berechnung fehlt der Kohärenzwert — wir zeigen keinen Wert, statt einen zu erfinden.',
    strength: '',
    risk:     '',
    caveat:   'Kein Gut-Schlecht-Wert, kein Persönlichkeitsanteil. Index, kein Urteil.',
  },
};

// ── Lookup-Funktionen mit Basis-Fallback (statt "Keine Beschreibung") ──
// Bridge: BaZi-API liefert Chinese Char ('甲','乙'…); Registry-Keys sind Pinyin.
const STEM_CHAR_TO_PINYIN = {
  '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu',
  '己': 'Ji',  '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui',
};
const BRANCH_CHAR_TO_PINYIN = {
  '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si',
  '午': 'Wu', '未': 'Wei',  '申': 'Shen','酉': 'You', '戌': 'Xu',  '亥': 'Hai',
};

export function lookupStem(name) {
  if (!name) return null;
  const key = STEM_CHAR_TO_PINYIN[name] || name;
  return STEM_MEANINGS[key] || { stem: '?', element: 'unbekannt', polarity: '?', resource: 'Basisdeutung folgt — bitte zurück zur Übersicht.', shadow: '', practice: '' };
}

export function lookupBranch(name) {
  if (!name) return null;
  const key = BRANCH_CHAR_TO_PINYIN[name] || name;
  return BRANCH_MEANINGS[key] || { branch: '?', animal: 'unbekannt', element: 'unbekannt', resource: 'Basisdeutung folgt — bitte zurück zur Übersicht.', shadow: '', practice: '' };
}

export function lookupElement(name) {
  if (!name) return null;
  return WUXING_MEANINGS[name] || null;
}

export function lookupSign(sign) {
  if (!sign) return null;
  return WESTERN_SIGN_MEANINGS[sign] || null;
}

export function lookupHouse(num) {
  return HOUSE_MEANINGS[num] || null;
}

export function lookupCoherenceBand(band) {
  return COHERENCE_MEANINGS[band] || COHERENCE_MEANINGS.unknown;
}

// Daily Learn-Impulse: aus aktivem Element/Haus/Pillar ein dreiteiliges Mini-Lehrstück bauen.
// { understand, apply, experiment } — alle drei Pflichtfelder.
export function buildDailyLearnImpulse({ dominantElement = null, activeHouse = null, dayMasterStem = null, fallbackExperiment = null } = {}) {
  // Priorität: Haus > Element > Day Master > Default
  if (activeHouse && HOUSE_MEANINGS[activeHouse]) {
    const h = HOUSE_MEANINGS[activeHouse];
    return {
      anchor: `Haus ${activeHouse} — ${h.label}`,
      understand: `Heute aktiv: ${h.label}. ${h.context}.`,
      apply:      `Bring heute eine Sache in dieses Feld, statt sie aus Gewohnheit dort zu hinterlegen, wo du sonst landest.`,
      experiment: fallbackExperiment?.instruction || `Setze heute einen Schritt in das ${h.label}-Feld, der morgen noch sichtbar ist.`,
    };
  }
  const el = dominantElement && WUXING_MEANINGS[dominantElement];
  if (el) {
    return {
      anchor: `Element ${el.label}`,
      understand: `${el.label} steht heute im Vordergrund: ${el.meaning}`,
      apply:      `In Stärke: ${el.strong} — in Übersteuerung: ${el.over}`,
      experiment: fallbackExperiment?.instruction || el.balance,
    };
  }
  if (dayMasterStem) {
    const s = lookupStem(dayMasterStem);
    return {
      anchor: `Day Master ${s.element}`,
      understand: `Dein Day Master trägt ${s.element}-Energie (${s.polarity}).`,
      apply:      `Ressource: ${s.resource}. Schatten: ${s.shadow}.`,
      experiment: fallbackExperiment?.instruction || s.practice || 'Bring heute eine kleine Geste deines Day Master in den Tag.',
    };
  }
  return {
    anchor: 'Tagespuls',
    understand: 'Beobachte heute, wo dein Tag selbst Energie nimmt — und wo er gibt.',
    apply:      'Notiere abends einen Moment, der dich heute getragen hat.',
    experiment: fallbackExperiment?.instruction || 'Sprich heute eine Sache direkter aus als sonst.',
  };
}
