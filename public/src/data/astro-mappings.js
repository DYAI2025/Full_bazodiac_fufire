// public/src/data/astro-mappings.js

// EN sign → DE label
export const SIGN_DE = {
  Aries: 'Widder', Taurus: 'Stier', Gemini: 'Zwillinge', Cancer: 'Krebs',
  Leo: 'Löwe',     Virgo: 'Jungfrau', Libra: 'Waage',     Scorpio: 'Skorpion',
  Sagittarius: 'Schütze', Capricorn: 'Steinbock', Aquarius: 'Wassermann', Pisces: 'Fische',
};

// EN sign → Unicode glyph (sun-style)
export const SIGN_GLYPH = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo:   '♌', Virgo:  '♍', Libra:  '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

// Planet/body name → DE label + glyph (combined display string)
export const PLANET_DE = {
  Sun:           'Sonne ☉',
  Moon:          'Mond ☽',
  Mercury:       'Merkur ☿',
  Venus:         'Venus ♀',
  Mars:          'Mars ♂',
  Jupiter:       'Jupiter ♃',
  Saturn:        'Saturn ♄',
  Uranus:        'Uranus ♅',
  Neptune:       'Neptun ♆',
  Pluto:         'Pluto ♇',
  Chiron:        'Chiron ⚷',
  Lilith:        'Lilith ⚸',
  NorthNode:     'Mondknoten ☊',
  TrueNorthNode: 'Mondknoten (wahr) ☊',
  Ascendant:     'Aszendent ↑',
  MC:            'Medium Coeli ⊥',
};

// Aspect EN → DE label. Covers the 7 aspect types FuFire returns in
// /api/azodiac/profile responses (5 majors + 2 minors).
export const ASPECT_DE = {
  conjunction:    'Konjunktion',
  sextile:        'Sextil',
  square:         'Quadrat',
  trine:          'Trigon',
  opposition:     'Opposition',
  'semi-sextile': 'Halbsextil',
  quincunx:       'Quincunx',
};

// Planet/body name → clean DE label (no glyph). Use this where the glyph
// is rendered separately (e.g. aspect lines: "Mond Trigon Neptun" reads
// cleaner than "Mond ☽ Trigon Neptun ♆").
export const PLANET_DE_CLEAN = {
  Sun: 'Sonne', Moon: 'Mond', Mercury: 'Merkur', Venus: 'Venus',
  Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn',
  Uranus: 'Uranus', Neptune: 'Neptun', Pluto: 'Pluto',
  Chiron: 'Chiron', Lilith: 'Lilith',
  NorthNode: 'Mondknoten', TrueNorthNode: 'Mondknoten (wahr)',
  Ascendant: 'Aszendent', MC: 'Medium Coeli',
};

// Sign order in ecliptic longitude: index 0..11 → Aries..Pisces.
// Used to derive sign from raw angle longitude (Asc/MC come as numbers
// only in the API; bodies come pre-tagged with sign).
const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export function signFromLongitude(longitude) {
  if (longitude === null || longitude === undefined) return null;
  const n = Number(longitude);
  if (!Number.isFinite(n)) return null;
  // Normalize to [0, 360) then floor to 30°-segment index.
  const wrapped = ((n % 360) + 360) % 360;
  const idx = Math.floor(wrapped / 30);
  return SIGN_ORDER[idx] ?? null;
}

// DE + EN sign names → Element
const SIGN_MAP = {
  // DE
  'Widder':'Feuer','Stier':'Erde','Zwillinge':'Luft','Krebs':'Wasser',
  'Löwe':'Feuer','Jungfrau':'Erde','Waage':'Luft','Skorpion':'Wasser',
  'Schütze':'Feuer','Steinbock':'Erde','Wassermann':'Luft','Fische':'Wasser',
  // EN
  'Aries':'Feuer','Taurus':'Erde','Gemini':'Luft','Cancer':'Wasser',
  'Leo':'Feuer','Virgo':'Erde','Libra':'Luft','Scorpio':'Wasser',
  'Sagittarius':'Feuer','Capricorn':'Erde','Aquarius':'Luft','Pisces':'Wasser',
};

export function signToElement(sign) {
  return SIGN_MAP[sign] ?? null;
}

// Element-pair → { tone, score (0–1 harmony), relation }
const PAIR_TABLE = {
  'Feuer|Feuer':   { tone:'⚡+', score:0.65, relation:'Intensiv — Vitalität, Risiko Verausgabung' },
  'Feuer|Luft':    { tone:'✨',  score:0.85, relation:'Luft nährt Feuer — Inspiration und Aufwind' },
  'Feuer|Erde':    { tone:'⚡',  score:0.40, relation:'Feuer trocknet Erde — Tempo vs. Beständigkeit' },
  'Feuer|Wasser':  { tone:'⚡',  score:0.35, relation:'Klassischer Kontrast — Leidenschaft trifft Tiefe' },
  'Erde|Erde':     { tone:'〰',  score:0.60, relation:'Stabilität — Risiko Stagnation' },
  'Erde|Wasser':   { tone:'✨',  score:0.80, relation:'Wasser nährt Erde — gegenseitige Fürsorge' },
  'Erde|Luft':     { tone:'⚡',  score:0.38, relation:'Luft erodiert Erde — Pragmatismus vs. Ideen' },
  'Luft|Luft':     { tone:'〰+', score:0.65, relation:'Kommunikation und Ideen — Risiko Bodenlosigkeit' },
  'Luft|Wasser':   { tone:'⚡',  score:0.42, relation:'Luft kräuselt Wasser — Intellekt trifft Gefühl' },
  'Wasser|Wasser': { tone:'✨',  score:0.75, relation:'Emotionale Tiefe — Risiko Verschmelzung' },
};

export function elementPairTone(a, b) {
  const key1 = `${a}|${b}`;
  const key2 = `${b}|${a}`;
  return PAIR_TABLE[key1] ?? PAIR_TABLE[key2] ?? { tone:'〰', score:0.5, relation:'Neutral' };
}

// Wu-Xing element qualities per domain
export const ELEMENT_QUALITIES = {
  Feuer:  { love:'Leidenschaft, Spontanität, Direktheit',      career:'Führung, Sichtbarkeit, Kreativität',     dynasty:'Energie und Aufbruch' },
  Erde:   { love:'Verlässlichkeit, Sinnlichkeit, Beständigkeit', career:'Struktur, Geduld, Aufbau',              dynasty:'Fundament und Kontinuität' },
  Luft:   { love:'Kommunikation, Neugier, Freiheit',           career:'Analyse, Vernetzung, Flexibilität',      dynasty:'Wandel und Austausch' },
  Wasser: { love:'Tiefe, Intuition, Empathie',                 career:'Anpassung, Kreativität, Kommunikation',  dynasty:'Fluss und Erneuerung' },
  Holz:   { love:'Wachstum, Aufbruch, Idealismus',             career:'Strategie, Expansion, Vision',           dynasty:'Wachstum und Erneuerung' },
};

// Element colors (Bazodiac palette)
export const ELEMENT_COLORS = {
  Feuer:  '#EF4444',
  Erde:   '#CA8A04',
  Luft:   '#60A5FA',
  Wasser: '#3B82F6',
  Holz:   '#10B981',
  Metall: '#A1A1AA',
};

// House templates
export const HOUSE_TEMPLATES = {
  1:  { label:'Selbst & Auftritt',       domain:['personality'],
        harmonizing: 'Ihr wirkt nach außen ähnlich — was ihr voneinander als erstes seht, spiegelt euch wider.',
        tension:     'Eure erste Wirkung ist verschieden. {signA} und {signB} begegnen der Welt anders — das macht euch ergänzend statt gleichförmig.',
        neutral:     'Ihr habt unterschiedliche Arten aufzutreten — das gibt eurem Paar Breite.' },

  2:  { label:'Werte & Ressourcen',      domain:['career-finance'],
        harmonizing: 'Eure Wertvorstellungen sprechen dieselbe Sprache ({elemA} × {elemB}). Finanzielle Entscheidungen fallen euch leichter als vielen Paaren.',
        tension:     '{signA} und {signB} im 2. Haus — unterschiedliche Beziehungen zu Geld und Sicherheit. Hier lohnt sich das Gespräch, bevor ihr gemeinsam baut.',
        neutral:     'Unterschiedliche Ressourcen-Perspektiven — wenn bewusst, ein Vorteil.' },

  3:  { label:'Kommunikation',           domain:['personality','love'],
        harmonizing: 'Ihr versteht euch ohne viele Worte. {elemA}-Energie und {elemB}-Energie im 3. Haus resonieren.',
        tension:     'Wie ihr kommuniziert, passt nicht von selbst zusammen ({signA} vs. {signB}). Das kostet kurzfristig Energie — und macht euch langfristig präziser.',
        neutral:     'Ihr sprecht verschiedene Sprachen. Klärung zahlt sich aus.' },

  4:  { label:'Fundament & Familie',     domain:['love','personality'],
        harmonizing: 'Eure Herkunftsenergien {elemA} und {elemB} ergänzen sich — zuhause fühlt sich bei euch beiden ähnlich an.',
        tension:     'Was "Zuhause" bedeutet, ist für {signA} und {signB} verschieden. Das kann anfangs reiben — es führt aber zu einem bewusst gestalteten gemeinsamen Nest.',
        neutral:     'Verschiedene Wurzeln, gemeinsame Richtung möglich.' },

  5:  { label:'Ausdruck & Freude',       domain:['love'],
        harmonizing: 'Wie ihr Freude erlebt, klingt gleich ({elemA} × {elemB}). Zusammen zu spielen fühlt sich natürlich an.',
        tension:     '{signA} und {signB} im 5. Haus — ihr habt verschiedene Arten Freude zu empfinden. Das kann langweilig vermeiden helfen.',
        neutral:     'Unterschiedliche Ausdrucksformen — gut für gegenseitige Überraschung.' },

  6:  { label:'Alltag & Arbeit',         domain:['career-finance'],
        harmonizing: 'Im Alltagsleben seid ihr gut aufeinander eingespielt — ähnliche Energien ({elemA}/{elemB}) im 6. Haus.',
        tension:     'Routinen und Arbeitsrhythmus unterscheiden sich ({signA} vs. {signB}). Verhandlungssache — nicht Schicksal.',
        neutral:     'Alltag braucht Absprache. Beide habt gute Gründe für eure Gewohnheiten.' },

  7:  { label:'Partnerschaft & Vertrag', domain:['love'],
        harmonizing: 'Was ihr voneinander erwartet, ist sehr ähnlich ({elemA} × {elemB}) — eine belastbare Basis.',
        tension:     '{signA} sucht etwas anderes in einer Partnerschaft als {signB}. Das erzeugt Reibung — und hält euch gleichzeitig wach.',
        neutral:     'Verschiedene Partnerschafts-Ideale. Transparenz schützt hier.' },

  8:  { label:'Tiefe & Transformation',  domain:['love','personality'],
        harmonizing: '{signA} und {signB} im 8. Haus — ihr teilt eine Bereitschaft zur Tiefe. Vertrauen baut sich hier schnell auf.',
        tension:     'Dein {signA}-8.-Haus will Tiefe und Kontrolle. Dein Partner\'s {signB}-Energie bringt etwas anderes in diesen Raum. Kleinere Machtkämpfe sind programmiert — und gleichzeitig euer aufregendster Wachstumsmotor.',
        neutral:     'Unterschiedliche Tiefen-Bedürfnisse. Erkundbar, wenn beide offen sind.' },

  9:  { label:'Weltbild & Sinn',         domain:['personality'],
        harmonizing: 'Ihr teilt ähnliche Weltbilder ({elemA} × {elemB}) — Reisen und Philosophieren macht euch stark zusammen.',
        tension:     '{signA} und {signB} im 9. Haus — unterschiedliche Sinngebungen. Inspiriert euch gegenseitig, anstatt zu überzeugen.',
        neutral:     'Verschiedene Lebensphilosophien. Bereichernd, wenn respektiert.' },

  10: { label:'Karriere & Status',       domain:['career-finance'],
        harmonizing: 'Eure Karriere-Energien {elemA} und {elemB} zeigen in dieselbe Richtung — ihr könnt euch im Beruf gegenseitig stärken.',
        tension:     '{signA} und {signB} im 10. Haus — unterschiedliche Karriere-Ästhetiken. Was nach außen gezeigt wird, verhandelt ihr.',
        neutral:     'Verschiedene Karriere-Stile. Kein Problem, wenn klar kommuniziert.' },

  11: { label:'Freundschaft & Visionen', domain:['personality'],
        harmonizing: 'Euer Freundeskreis und eure Zukunftsvisionen klingen ähnlich ({elemA} × {elemB}).',
        tension:     'Wo ihr hinwollt und wer dazugehören soll — das seht ihr verschieden ({signA}/{signB}). Verhandeln lohnt früh.',
        neutral:     'Verschiedene soziale Welten. Beide bereichert das Paar.' },

  12: { label:'Stille & Verborgenes',    domain:['personality','love'],
        harmonizing: 'Was ihr verbergt und wo ihr Ruhe sucht, ist ähnlich ({elemA} × {elemB}). Ihr versteht eure stillen Seiten.',
        tension:     'Eure inneren Rückzugsorte sind verschieden ({signA} vs. {signB}). Gebt euch diesen Raum bewusst — er ist kein Zeichen von Distanz.',
        neutral:     'Verschiedene innere Welten. Neugier hilft mehr als Deutung.' },
};
