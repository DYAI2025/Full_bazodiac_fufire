// Domain Projection Layer — Love, Career, Finance, Personality
// All functions return: { primaryFactors, supportingFactors, missingFactors, sourceTrace, confidence }
// Rules: no LLM values, no financial advice, no diagnoses, confidence drops on missing key factors

export const COHERENCE_FACTOR_LABEL = 'Fusions-Kohärenz';

const SIGN_DE = {
  Aries: 'Widder', Taurus: 'Stier', Gemini: 'Zwillinge', Cancer: 'Krebs',
  Leo: 'Löwe', Virgo: 'Jungfrau', Libra: 'Waage', Scorpio: 'Skorpion',
  Sagittarius: 'Schütze', Capricorn: 'Steinbock', Aquarius: 'Wassermann', Pisces: 'Fische',
};

const VENUS_LOVE = {
  Aries: 'Direkt und leidenschaftlich — sie geht mutig auf Verbindung zu',
  Taurus: 'Sinnlich und beständig — sie sucht verlässliche Nähe',
  Gemini: 'Lebendig und neugierig — sie liebt geistige Berührung',
  Cancer: 'Fürsorglich und tief — sie bindet durch emotionale Geborgenheit',
  Leo: 'Großzügig und strahlend — sie schenkt Wärme und Aufmerksamkeit',
  Virgo: 'Aufmerksam und feinfühlig — sie zeigt Liebe durch Präzision',
  Libra: 'Harmonisch und ausgleichend — sie sucht echte Partnerschaft',
  Scorpio: 'Intensiv und transformativ — sie liebt mit voller Tiefe',
  Sagittarius: 'Frei und abenteuerlustig — sie braucht Raum zum Wachsen',
  Capricorn: 'Treu und verbindlich — sie baut langsam, aber solide',
  Aquarius: 'Unabhängig und originell — sie liebt auf unkonventionelle Weise',
  Pisces: 'Mitfühlend und träumerisch — sie liebt mit dem ganzen Herzen',
};

const MOON_NEED = {
  Aries: 'Eigenständigkeit und Initiative in Beziehungen',
  Taurus: 'Sicherheit und sinnliche Beständigkeit',
  Gemini: 'Kommunikation und geistige Stimulation',
  Cancer: 'Tiefe Zugehörigkeit und emotionale Sicherheit',
  Leo: 'Anerkennung, Wärme und herzliches Miteinander',
  Virgo: 'Ordnung, Verlässlichkeit und praktische Fürsorge',
  Libra: 'Harmonie, Fairness und Balance im Kontakt',
  Scorpio: 'Tiefe Verbundenheit und ehrliche Intimität',
  Sagittarius: 'Freiheit und gemeinsames Wachstum',
  Capricorn: 'Verlässlichkeit, Struktur und Zielorientierung',
  Aquarius: 'Freundschaft, Geist und persönliche Freiheit',
  Pisces: 'Empathie, Stille und spirituelle Tiefe',
};

const MARS_INITIATIVE = {
  Aries: 'direkt und ohne Umwege auf Verbindung zugehend',
  Taurus: 'geduldig und beharrlich in der Annäherung',
  Gemini: 'durch Gespräch und geistige Funken',
  Cancer: 'fürsorglich und schützend',
  Leo: 'mit Ausstrahlung und selbstsicherer Präsenz',
  Virgo: 'durch Details und aufmerksame Gesten',
  Libra: 'charmant, diplomatisch und ausgleichend',
  Scorpio: 'magnetisch, intensiv und mit Tiefgang',
  Sagittarius: 'begeisternd, offen und mit Schwung',
  Capricorn: 'ausdauernd, zielorientiert und zuverlässig',
  Aquarius: 'originell, überraschend und unkonventionell',
  Pisces: 'sanft, intuitiv und einfühlsam',
};

const SUN_CAREER = {
  Aries: 'Pioniergeist und Eigeninitiative prägen die Berufsrichtung',
  Taurus: 'Beständigkeit und praktisches Talent sind Kernstärken',
  Gemini: 'Vielseitigkeit und Kommunikationsgabe öffnen Türen',
  Cancer: 'Fürsorge und Empathie als berufliche Kraft',
  Leo: 'Führungsqualität und kreative Ausstrahlung',
  Virgo: 'Präzision, Analyse und methodisches Vorgehen',
  Libra: 'Ausgleich, Kooperation und ästhetisches Gespür',
  Scorpio: 'Tiefgang, Transformation und strategischer Fokus',
  Sagittarius: 'Weitsicht, Bildungsdrang und Expansionswille',
  Capricorn: 'Ehrgeiz, Disziplin und langfristiger Aufbau',
  Aquarius: 'Innovation, Unabhängigkeit und Systemdenken',
  Pisces: 'Kreativität, Mitgefühl und ganzheitliches Denken',
};

const SUN_IDENTITY = {
  Aries:       'Direktheit, Mut und der Antrieb, als Erste voranzugehen',
  Taurus:      'Geerdetheit, Beständigkeit und Freude am Sinnlichen',
  Gemini:      'Neugier, Wandlungsfähigkeit und Liebe zur Verbindung',
  Cancer:      'Tiefe Empathie, Fürsorge und emotionale Intuition',
  Leo:         'Strahlkraft, Herzlichkeit und das Bedürfnis, gesehen zu werden',
  Virgo:       'Klarheit, Präzision und der Wunsch, wirklich hilfreich zu sein',
  Libra:       'Harmoniebedürfnis, Schönheitssinn und Fähigkeit zur Balance',
  Scorpio:     'Intensität, Tiefgründigkeit und Lust auf Transformation',
  Sagittarius: 'Weitsicht, Freiheitsdrang und philosophischer Geist',
  Capricorn:   'Zuverlässigkeit, Ehrgeiz und Sinn für das Wesentliche',
  Aquarius:    'Unabhängigkeit, visionäres Denken und Gefühl für das Kollektiv',
  Pisces:      'Feingefühl, Mitgefühl und Zugang zur imaginativen Tiefe',
};

const SATURN_STRUCTURE = {
  Aries: 'Struktur durch Eigenverantwortung und schnelle Entscheidungen',
  Taurus: 'Ausdauer und materielle Stabilität als Fundament',
  Gemini: 'Disziplin beim Lernen und kommunikativer Fokus',
  Cancer: 'Verlässlichkeit und emotionale Reife als Basis',
  Leo: 'Selbstdisziplin und verantwortungsvolles Führen',
  Virgo: 'Perfektion und methodische Strenge',
  Libra: 'Ausgewogenheit und faire Entscheidungsprozesse',
  Scorpio: 'Tiefgehende Fokussierung und Durchhaltevermögen',
  Sagittarius: 'Strukturiertes Wachstum und Zielorientierung',
  Capricorn: 'Hohes Verantwortungsgefühl und langfristige Planung',
  Aquarius: 'Systematisches Denken und gesellschaftliche Verantwortung',
  Pisces: 'Spirituelle Reife und intuitiv gesteuerte Grenzen',
};

const JUPITER_EXPAND = {
  Aries: 'Expansion durch Mut und neue Impulse',
  Taurus: 'Wachstum durch Beständigkeit und materielle Sorgfalt',
  Gemini: 'Erweiterung durch Wissen und Netzwerke',
  Cancer: 'Gedeihen in fürsorgendem, familiärem Kontext',
  Leo: 'Erfolg durch Kreativität und Selbstausdruck',
  Virgo: 'Wachstum durch Exzellenz und präzise Methodik',
  Libra: 'Expansion durch Kooperation und Harmonie',
  Scorpio: 'Tiefe Ressourcen durch Transformation und Fokus',
  Sagittarius: 'Natürliche Erweiterung durch Philosophie und Reise',
  Capricorn: 'Solides Wachstum durch Disziplin und Struktur',
  Aquarius: 'Innovation und gesellschaftlicher Einfluss',
  Pisces: 'Großzügigkeit und spirituelles Wachstum',
};

const ELEMENT_PERSONALITY = {
  Holz: 'Wachstum, Vision und das Streben nach Entfaltung',
  Feuer: 'Leidenschaft, Ausstrahlung und inneres Feuer',
  Erde: 'Beständigkeit, Nährung und praktische Substanz',
  Metall: 'Klarheit, Präzision und strukturierte Kraft',
  Wasser: 'Tiefe, Intuition und fließende Anpassungsfähigkeit',
};

function signDE(s) { return s ? (SIGN_DE[s] || s) : null; }

function getBody(profile, name) { return profile?.western?.bodies?.[name] || null; }

function getHouseSign(profile, houseNum) {
  const houses = profile?.western?.houses;
  if (!houses) return null;
  // houses may be an array [{sign,...}, ...] or an object {"1":{sign,...}, ...}
  const entry = Array.isArray(houses)
    ? houses[houseNum - 1]
    : houses[String(houseNum)];
  return entry?.sign || null;
}

function getDayElement(profile) { return profile?.bazi?.pillars?.day?.element || null; }
function getMonthElement(profile) { return profile?.bazi?.pillars?.month?.element || null; }

function getDominantFusionElement(profile) {
  const v = profile?.fusion?.wu_xing_vectors?.fusion
         || profile?.fusion?.wu_xing_vectors?.western_planets;
  if (!v) return null;
  let max = -Infinity, el = null;
  for (const [k, val] of Object.entries(v)) {
    if (val > max) { max = val; el = k; }
  }
  return el;
}

function buildProjection() {
  return {
    primaryFactors: [],
    supportingFactors: [],
    missingFactors: [],
    sourceTrace: [],
    _deduction: 0,
  };
}

function finalize(proj) {
  return {
    primaryFactors:    proj.primaryFactors,
    supportingFactors: proj.supportingFactors,
    missingFactors:    proj.missingFactors,
    sourceTrace:       proj.sourceTrace,
    confidence:        Math.max(0, Math.round((1 - proj._deduction) * 100) / 100),
  };
}

// ── Love ─────────────────────────────────────────────────────────────────────

export function createLoveProjection(profile) {
  const proj = buildProjection();

  const venus = getBody(profile, 'Venus');
  if (venus?.sign) {
    proj.primaryFactors.push({
      label: `Venus im ${signDE(venus.sign)}`,
      value: VENUS_LOVE[venus.sign] || signDE(venus.sign),
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Wie du in Liebe und Beziehung wirkst',
    });
    proj.sourceTrace.push('western.bodies.Venus.sign');
  } else {
    proj.missingFactors.push('Venus-Zeichen (Geburtsmoment erforderlich)');
    proj.sourceTrace.push('western.bodies.Venus — nicht verfügbar');
    proj._deduction += 0.30;
  }

  const moon = getBody(profile, 'Moon');
  if (moon?.sign) {
    proj.primaryFactors.push({
      label: `Mond im ${signDE(moon.sign)}`,
      value: `Emotionales Bedürfnis: ${MOON_NEED[moon.sign] || signDE(moon.sign)}`,
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Was du in einer Beziehung emotional brauchst',
    });
    proj.sourceTrace.push('western.bodies.Moon.sign');
  } else {
    proj.missingFactors.push('Mond-Zeichen');
    proj.sourceTrace.push('western.bodies.Moon — nicht verfügbar');
    proj._deduction += 0.20;
  }

  const dayEl = getDayElement(profile);
  if (dayEl) {
    proj.primaryFactors.push({
      label: `BaZi Tag-Säule: ${dayEl}`,
      value: ELEMENT_PERSONALITY[dayEl] || dayEl,
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Emotionale Grundschwingung laut BaZi',
    });
    proj.sourceTrace.push('bazi.pillars.day.element');
  } else {
    proj.missingFactors.push('BaZi Tag-Säule');
    proj.sourceTrace.push('bazi.pillars.day — nicht verfügbar');
    proj._deduction += 0.15;
  }

  const mars = getBody(profile, 'Mars');
  if (mars?.sign) {
    proj.supportingFactors.push({
      label: `Mars im ${signDE(mars.sign)}`,
      value: `Initiative: ${MARS_INITIATIVE[mars.sign] || signDE(mars.sign)}`,
      source: 'api',
      endpoint: '/api/azodiac/profile',
    });
    proj.sourceTrace.push('western.bodies.Mars.sign');
  } else {
    proj.missingFactors.push('Mars-Zeichen');
    proj.sourceTrace.push('western.bodies.Mars — nicht verfügbar');
    proj._deduction += 0.10;
  }

  const h5 = getHouseSign(profile, 5);
  if (h5) {
    proj.supportingFactors.push({
      label: `5. Haus im ${signDE(h5)}`,
      value: 'Ausdruck in Romantik und persönlichem Liebesstil',
      source: 'api',
      endpoint: '/api/azodiac/profile',
    });
    proj.sourceTrace.push('western.houses[4].sign');
  } else {
    proj.missingFactors.push('5. Haus (Geburtszeit für Häuser erforderlich)');
    proj.sourceTrace.push('western.houses[4] — nicht verfügbar');
    proj._deduction += 0.025;
  }

  const h7 = getHouseSign(profile, 7);
  if (h7) {
    proj.supportingFactors.push({
      label: `7. Haus im ${signDE(h7)}`,
      value: 'Partnerschaftsprinzip — was du im Gegenüber suchst',
      source: 'api',
      endpoint: '/api/azodiac/profile',
    });
    proj.sourceTrace.push('western.houses[6].sign');
  } else {
    proj.missingFactors.push('7. Haus (Geburtszeit für Häuser erforderlich)');
    proj.sourceTrace.push('western.houses[6] — nicht verfügbar');
    proj._deduction += 0.025;
  }

  const wxEl = getDominantFusionElement(profile);
  if (wxEl) {
    proj.supportingFactors.push({
      label: `Wu-Xing Dominanz: ${wxEl}`,
      value: ELEMENT_PERSONALITY[wxEl] || wxEl,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/profile',
      note: 'Dominantes Fusions-Element der kombinierten Signatur',
    });
    proj.sourceTrace.push('fusion.wu_xing_vectors');
  } else {
    proj.sourceTrace.push('fusion.wu_xing_vectors — nicht verfügbar');
  }

  return finalize(proj);
}

// ── Career ───────────────────────────────────────────────────────────────────

export function createCareerProjection(profile) {
  const proj = buildProjection();

  const h10 = getHouseSign(profile, 10);
  if (h10) {
    proj.primaryFactors.push({
      label: `10. Haus (MC) im ${signDE(h10)}`,
      value: 'Öffentliche Wirkung und berufliche Ausrichtung',
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Das Mitthimmel-Zeichen symbolisiert deine gesellschaftliche Rolle',
    });
    proj.sourceTrace.push('western.houses[9].sign');
  } else {
    proj.missingFactors.push('10. Haus / MC (Geburtszeit für Häuser erforderlich)');
    proj.sourceTrace.push('western.houses[9] — nicht verfügbar');
    proj._deduction += 0.25;
  }

  const sun = getBody(profile, 'Sun');
  if (sun?.sign) {
    proj.primaryFactors.push({
      label: `Sonne im ${signDE(sun.sign)}`,
      value: SUN_CAREER[sun.sign] || signDE(sun.sign),
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Dein Kernantrieb und Selbstausdruck',
    });
    proj.sourceTrace.push('western.bodies.Sun.sign');
  } else {
    proj.missingFactors.push('Sonnenzeichen');
    proj.sourceTrace.push('western.bodies.Sun — nicht verfügbar');
    proj._deduction += 0.20;
  }

  const saturn = getBody(profile, 'Saturn');
  if (saturn?.sign) {
    proj.primaryFactors.push({
      label: `Saturn im ${signDE(saturn.sign)}`,
      value: SATURN_STRUCTURE[saturn.sign] || signDE(saturn.sign),
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Deine Struktur, Disziplin und Wachstumsaufgaben',
    });
    proj.sourceTrace.push('western.bodies.Saturn.sign');
  } else {
    proj.missingFactors.push('Saturn-Zeichen');
    proj.sourceTrace.push('western.bodies.Saturn — nicht verfügbar');
    proj._deduction += 0.15;
  }

  const h6 = getHouseSign(profile, 6);
  if (h6) {
    proj.supportingFactors.push({
      label: `6. Haus im ${signDE(h6)}`,
      value: 'Arbeitsstil, Routine und Alltagsenergie',
      source: 'api',
      endpoint: '/api/azodiac/profile',
    });
    proj.sourceTrace.push('western.houses[5].sign');
  } else {
    proj.missingFactors.push('6. Haus (Geburtszeit für Häuser erforderlich)');
    proj.sourceTrace.push('western.houses[5] — nicht verfügbar');
    proj._deduction += 0.10;
  }

  const monthEl = getMonthElement(profile);
  if (monthEl) {
    proj.supportingFactors.push({
      label: `BaZi Monats-Säule: ${monthEl}`,
      value: ELEMENT_PERSONALITY[monthEl] || monthEl,
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Soziale Energie und berufliche Interaktionsstärke laut BaZi',
    });
    proj.sourceTrace.push('bazi.pillars.month.element');
  } else {
    proj.missingFactors.push('BaZi Monats-Säule');
    proj.sourceTrace.push('bazi.pillars.month — nicht verfügbar');
    proj._deduction += 0.10;
  }

  const wxEl = getDominantFusionElement(profile);
  if (wxEl) {
    proj.supportingFactors.push({
      label: `Wu-Xing Dominanz: ${wxEl}`,
      value: ELEMENT_PERSONALITY[wxEl] || wxEl,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/profile',
    });
    proj.sourceTrace.push('fusion.wu_xing_vectors');
  } else {
    proj.sourceTrace.push('fusion.wu_xing_vectors — nicht verfügbar');
  }

  return finalize(proj);
}

// ── Finance ──────────────────────────────────────────────────────────────────
// Hinweis: Diese Projektion enthält keine Finanzberatung.
// Alle Aussagen sind symbolischer Natur und ersetzen keine professionelle Beratung.

export function createFinanceProjection(profile) {
  const proj = buildProjection();

  const h2 = getHouseSign(profile, 2);
  if (h2) {
    proj.primaryFactors.push({
      label: `2. Haus im ${signDE(h2)}`,
      value: 'Symbolischer Ausdruck deines Verhältnisses zu Ressourcen und Werten',
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Astrologisches Haus der persönlichen Ressourcen — kein Finanzratschlag',
    });
    proj.sourceTrace.push('western.houses[1].sign');
  } else {
    proj.missingFactors.push('2. Haus (Geburtszeit für Häuser erforderlich)');
    proj.sourceTrace.push('western.houses[1] — nicht verfügbar');
    proj._deduction += 0.25;
  }

  const venus = getBody(profile, 'Venus');
  if (venus?.sign) {
    proj.primaryFactors.push({
      label: `Venus im ${signDE(venus.sign)}`,
      value: `Wertvorstellungen: ${VENUS_LOVE[venus.sign] || signDE(venus.sign)}`,
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Was du als wertvoll und erstrebenswert wahrnimmst',
    });
    proj.sourceTrace.push('western.bodies.Venus.sign');
  } else {
    proj.missingFactors.push('Venus-Zeichen');
    proj.sourceTrace.push('western.bodies.Venus — nicht verfügbar');
    proj._deduction += 0.20;
  }

  const jupiter = getBody(profile, 'Jupiter');
  if (jupiter?.sign) {
    proj.primaryFactors.push({
      label: `Jupiter im ${signDE(jupiter.sign)}`,
      value: JUPITER_EXPAND[jupiter.sign] || signDE(jupiter.sign),
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Symbolisches Erweiterungsprinzip — kein Anlageratschlag',
    });
    proj.sourceTrace.push('western.bodies.Jupiter.sign');
  } else {
    proj.missingFactors.push('Jupiter-Zeichen');
    proj.sourceTrace.push('western.bodies.Jupiter — nicht verfügbar');
    proj._deduction += 0.20;
  }

  const h8 = getHouseSign(profile, 8);
  if (h8) {
    proj.supportingFactors.push({
      label: `8. Haus im ${signDE(h8)}`,
      value: 'Symbolisches Prinzip von Transformation und gemeinsamen Ressourcen',
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Kein Finanzratschlag — nur symbolische Einordnung',
    });
    proj.sourceTrace.push('western.houses[7].sign');
  } else {
    proj.missingFactors.push('8. Haus (Geburtszeit für Häuser erforderlich)');
    proj.sourceTrace.push('western.houses[7] — nicht verfügbar');
    proj._deduction += 0.10;
  }

  const wxEl = getDominantFusionElement(profile);
  if (wxEl) {
    const wxNote = wxEl === 'Metall' || wxEl === 'Erde'
      ? `${wxEl} — symbolisches Ressourcenprinzip`
      : `${wxEl} — dominantes Fusions-Element`;
    proj.supportingFactors.push({
      label: `Wu-Xing: ${wxEl}`,
      value: wxNote,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/profile',
    });
    proj.sourceTrace.push('fusion.wu_xing_vectors');
  } else {
    proj.sourceTrace.push('fusion.wu_xing_vectors — nicht verfügbar');
  }

  return finalize(proj);
}

// ── Personality ───────────────────────────────────────────────────────────────

export function createPersonalityProjection(profile) {
  const proj = buildProjection();

  const sun = getBody(profile, 'Sun');
  if (sun?.sign) {
    proj.primaryFactors.push({
      label: `Sonne im ${signDE(sun.sign)}`,
      value: SUN_IDENTITY[sun.sign] || signDE(sun.sign),
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Kern-Identität und bewusster Selbstausdruck',
    });
    proj.sourceTrace.push('western.bodies.Sun.sign');
  } else {
    proj.missingFactors.push('Sonnenzeichen');
    proj.sourceTrace.push('western.bodies.Sun — nicht verfügbar');
    proj._deduction += 0.20;
  }

  const moon = getBody(profile, 'Moon');
  if (moon?.sign) {
    proj.primaryFactors.push({
      label: `Mond im ${signDE(moon.sign)}`,
      value: `Emotionale Innenwelt: ${MOON_NEED[moon.sign] || signDE(moon.sign)}`,
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Das emotionale Fundament der Persönlichkeit',
    });
    proj.sourceTrace.push('western.bodies.Moon.sign');
  } else {
    proj.missingFactors.push('Mond-Zeichen');
    proj.sourceTrace.push('western.bodies.Moon — nicht verfügbar');
    proj._deduction += 0.15;
  }

  const dm = profile?.bazi?.day_master;
  if (dm?.element) {
    proj.primaryFactors.push({
      label: `Day Master: ${dm.stem || ''} ${dm.element}`,
      value: ELEMENT_PERSONALITY[dm.element] || dm.element,
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'BaZi-Kernenergie — das ostasiatische Gegenstück zum Sonnenzeichen',
    });
    proj.sourceTrace.push('bazi.day_master.element');
  } else {
    proj.missingFactors.push('BaZi Day Master');
    proj.sourceTrace.push('bazi.day_master — nicht verfügbar');
    proj._deduction += 0.15;
  }

  const ci = profile?.fusion?.coherence_index;
  if (ci !== null && ci !== undefined) {
    const cohNote = ci >= 0.7
      ? 'Hohe Deckungsgleichheit — östliches und westliches Selbstbild ergänzen sich harmonisch'
      : ci <= 0.35
      ? 'Kreative Spannung — ein Kontrast und Widerspruch zwischen BaZi und westlichem Chart, der zur bewussten Integration einlädt'
      : 'Ausgewogene Mischung aus Stabilität und Entwicklung';
    proj.supportingFactors.push({
      label: COHERENCE_FACTOR_LABEL,
      value: `${Math.round(ci * 100)}% Deckungsgleichheit`,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/profile',
      note: cohNote,
    });
    proj.sourceTrace.push('fusion.coherence_index');
  } else {
    proj.sourceTrace.push('fusion.coherence_index — nicht verfügbar');
  }

  const venus = getBody(profile, 'Venus');
  if (venus?.sign) {
    proj.supportingFactors.push({
      label: `Venus im ${signDE(venus.sign)}`,
      value: VENUS_LOVE[venus.sign] || signDE(venus.sign),
      source: 'api',
      endpoint: '/api/azodiac/profile',
      note: 'Ästhetik, Beziehungsstil und Wertvorstellungen',
    });
    proj.sourceTrace.push('western.bodies.Venus.sign');
  } else {
    proj.sourceTrace.push('western.bodies.Venus — nicht verfügbar');
  }

  const wxEl = getDominantFusionElement(profile);
  if (wxEl) {
    proj.supportingFactors.push({
      label: `Wu-Xing Dominanz: ${wxEl}`,
      value: ELEMENT_PERSONALITY[wxEl] || wxEl,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/profile',
      note: 'Das dominante Fusions-Element verbindet beide Systeme',
    });
    proj.sourceTrace.push('fusion.wu_xing_vectors');
  } else {
    proj.sourceTrace.push('fusion.wu_xing_vectors — nicht verfügbar');
  }

  ['Mercury', 'Mars', 'Jupiter', 'Saturn'].forEach((name) => {
    const body = getBody(profile, name);
    if (body?.sign) {
      proj.supportingFactors.push({
        label: `${name} im ${signDE(body.sign)}`,
        value: name === 'Saturn'
          ? SATURN_STRUCTURE[body.sign] || signDE(body.sign)
          : name === 'Jupiter'
          ? JUPITER_EXPAND[body.sign] || signDE(body.sign)
          : name === 'Mars'
          ? `Initiative: ${MARS_INITIATIVE[body.sign] || signDE(body.sign)}`
          : signDE(body.sign),
        source: 'api',
        endpoint: '/api/azodiac/profile',
      });
      proj.sourceTrace.push(`western.bodies.${name}.sign`);
    }
  });

  return finalize(proj);
}

// ── Synastry ──────────────────────────────────────────────────────────────────

const WUXING_PAIR = {
  'Holz-Holz':    { relation: 'identisch',        cycle: 'Holz ↔ Holz',           description: 'Zwei Holz-Energien begegnen sich — tiefe Wiedererkennung. Gemeinsamer Wachstumsdrang, aber ähnliche blinde Flecken; braucht Impulse von außen.' },
  'Holz-Feuer':   { relation: 'nährt',             cycle: 'Holz nährt Feuer',       description: 'A-Person gibt Kraft und Ressourcen, B-Person entfacht daraus Glanz. Organisch stützende Dynamik.' },
  'Holz-Erde':    { relation: 'kontrolliert',      cycle: 'Holz kontrolliert Erde', description: 'Holz-Wachstum begrenzt Erde-Beständigkeit. Strukturierende Spannung: A formt das Terrain, das B bewohnt.' },
  'Holz-Metall':  { relation: 'wird-kontrolliert', cycle: 'Metall kontrolliert Holz', description: 'Metall-Klarheit formt den Holz-Wachstum. B setzt den Rahmen, A wird verfeinert — herausfordernde, aber prägende Begegnung.' },
  'Holz-Wasser':  { relation: 'wird-genährt',      cycle: 'Wasser nährt Holz',      description: 'Tiefe Unterstützung: B-Person nährt A-Entfaltung. Stille, fließende Fürsorge.' },

  'Feuer-Holz':   { relation: 'wird-genährt',      cycle: 'Holz nährt Feuer',       description: 'A-Person empfängt Kraft von B-Person und leuchtet auf. Natürliche Stützung.' },
  'Feuer-Feuer':  { relation: 'identisch',          cycle: 'Feuer ↔ Feuer',          description: 'Zwei Feuer-Naturen — intensive Anziehung und explosive Energie. Gegenseitige Inspiration, aber auch das Risiko, gemeinsam auszubrennen.' },
  'Feuer-Erde':   { relation: 'nährt',              cycle: 'Feuer nährt Erde',       description: 'Leidenschaft gibt der Beständigkeit Tiefe. A wärmt und entzündet, B gibt dem Feuer Halt.' },
  'Feuer-Metall': { relation: 'kontrolliert',       cycle: 'Feuer kontrolliert Metall', description: 'Feuer schmilzt Metall — transformierende Spannung. A stellt Struktur in Frage, B wird herausgefordert, sich neu zu formen.' },
  'Feuer-Wasser': { relation: 'wird-kontrolliert',  cycle: 'Wasser kontrolliert Feuer', description: 'Wasser-Tiefe kühlt Feuer-Impuls. B dämpft A — eine Polarität, die zur Mäßigung und Reife einladen kann.' },

  'Erde-Holz':    { relation: 'wird-kontrolliert',  cycle: 'Holz kontrolliert Erde', description: 'B-Wachstumsdrang formt das A-Terrain. B setzt Grenzen und Anreize, A wird strukturiert.' },
  'Erde-Feuer':   { relation: 'wird-genährt',       cycle: 'Feuer nährt Erde',       description: 'Feuer-Wärme nährt Erde-Substanz. B gibt A Energie und Begeisterung.' },
  'Erde-Erde':    { relation: 'identisch',           cycle: 'Erde ↔ Erde',            description: 'Zwei Erde-Naturen — stabile, verlässliche Verbindung. Hohe Sicherheit, gemeinsame Werte, aber auch Tendenz zur Stagnation.' },
  'Erde-Metall':  { relation: 'nährt',               cycle: 'Erde nährt Metall',      description: 'A-Substanz gibt B-Klarheit Boden. A nährt die Präzision und Fokus der B-Person.' },
  'Erde-Wasser':  { relation: 'kontrolliert',        cycle: 'Erde kontrolliert Wasser', description: 'Erde formt den Wasserfluss. A gibt der Tiefe von B Kanäle und Richtung.' },

  'Metall-Holz':  { relation: 'kontrolliert',        cycle: 'Metall kontrolliert Holz', description: 'Metall-Schärfe formt Holz-Wachstum. A schleift und verfeinert — kreative, manchmal herausfordernde Präzision.' },
  'Metall-Feuer': { relation: 'wird-kontrolliert',   cycle: 'Feuer kontrolliert Metall', description: 'Feuer stellt Metall-Struktur in Frage. B bringt Wärme und Spontanität, A wird herausgefordert, sich zu öffnen.' },
  'Metall-Erde':  { relation: 'wird-genährt',        cycle: 'Erde nährt Metall',      description: 'Erde-Substanz gibt Metall Kraft. B nährt A mit Beständigkeit und Ressourcen.' },
  'Metall-Metall':{ relation: 'identisch',            cycle: 'Metall ↔ Metall',        description: 'Zwei Metall-Naturen — klare Sprache, hohe gegenseitige Standards. Respekt und Präzision; braucht emotionalen Wärmeausgleich.' },
  'Metall-Wasser':{ relation: 'nährt',                cycle: 'Metall nährt Wasser',    description: 'Klarheit gibt Tiefe Richtung. A-Fokus speist B-Intuition und emotionale Fülle.' },

  'Wasser-Holz':  { relation: 'nährt',                cycle: 'Wasser nährt Holz',      description: 'Tiefe Fürsorge nährt Wachstum. A unterstützt B-Entfaltung mit Stille und emotionaler Weisheit.' },
  'Wasser-Feuer': { relation: 'kontrolliert',          cycle: 'Wasser kontrolliert Feuer', description: 'Wasser-Tiefe kühlt Feuer-Impuls. A dämpft und mäßigt — kann lämmend oder ausgleichend wirken.' },
  'Wasser-Erde':  { relation: 'wird-kontrolliert',     cycle: 'Erde kontrolliert Wasser', description: 'Erde-Beständigkeit kanalisiert Wasserfluss. B gibt A Struktur und Halt im Gefühlsleben.' },
  'Wasser-Metall':{ relation: 'wird-genährt',          cycle: 'Metall nährt Wasser',    description: 'Metall-Fokus gibt Wasser-Tiefe Richtung. B speist A mit Klarheit und Präzision.' },
  'Wasser-Wasser':{ relation: 'identisch',             cycle: 'Wasser ↔ Wasser',        description: 'Zwei Wasser-Naturen — tiefe intuitive Verbindung. Fühlen ohne Worte, aber auch das Risiko, gemeinsam im Unstrukturierten zu versinken.' },
};

const BAZI_PAIR = {
  'Holz-Holz':    'Gleichgesinnte Pioniere — teilen Wachstumsdrang und Idealismus. Stärken: gemeinsame Vision. Herausforderung: ähnliche Ungeduld.',
  'Holz-Feuer':   'Holz gibt dem Feuer Nahrung — A-Person inspiriert und ermöglicht. B-Person leuchtet mit der Energie, die A bereitstellt.',
  'Holz-Erde':    'Strukturierende Spannung — Holz-Expansion begegnet Erde-Beständigkeit. Wachstum trifft auf Verwurzelung.',
  'Holz-Metall':  'Formende Begegnung — Metall schleift Holz. B-Person schärft, fordert, verfeinert die A-Person.',
  'Holz-Wasser':  'Tiefe Unterstützung — Wasser nährt Holz-Wachstum. B gibt A emotionalen Rückhalt und Intuition.',
  'Feuer-Holz':   'Feuer empfängt Holz-Kraft — A-Person leuchtet durch die Ressourcen, die B bereitstellt.',
  'Feuer-Feuer':  'Intensives Aufflackern — leidenschaftliche Anziehung, gemeinsame Begeisterung. Braucht Erdung.',
  'Feuer-Erde':   'Feuer nährt Erde — A-Person wärmt und belebt. B-Person gibt dem Feuer Substanz und Halt.',
  'Feuer-Metall': 'Feuer transformiert Metall — A stellt Strukturen in Frage. B wird herausgefordert, sich neu zu formen.',
  'Feuer-Wasser': 'Polarisierende Anziehung — Leidenschaft und Tiefe in Spannung. Intensive Verbindung, die zur Reife einlädt.',
  'Erde-Holz':    'Erde wird durch Holz geformt — B-Wachstum gibt A-Stabilität neue Richtung.',
  'Erde-Feuer':   'Erde empfängt Feuer-Wärme — B belebt, A gibt dem Feuer Boden.',
  'Erde-Erde':    'Solide Verbindung — tiefe Verlässlichkeit und gemeinsame Werte. Braucht Impulse von außen.',
  'Erde-Metall':  'Erde nährt Metall — A gibt B Substanz und Ressourcen. Natürliche Stützung.',
  'Erde-Wasser':  'Erde kanalisiert Wasser — A gibt B-Tiefe Form und Richtung.',
  'Metall-Holz':  'Metall schleift Holz — A verfeinert und fordert B. Prägende, manchmal harte Begegnung.',
  'Metall-Feuer': 'Metall wird durch Feuer herausgefordert — B Wärme öffnet A-Struktur.',
  'Metall-Erde':  'Metall empfängt Erde-Nahrung — B gibt A Substanz und Stabilität.',
  'Metall-Metall':'Klare Begegnung — hohe Standards, gegenseitiger Respekt. Braucht emotionale Wärme.',
  'Metall-Wasser':'Metall speist Wasser — A-Klarheit gibt B-Intuition Richtung.',
  'Wasser-Holz':  'Wasser nährt Holz — A gibt B emotionalen Rückhalt und Intuition.',
  'Wasser-Feuer': 'Wasser mäßigt Feuer — A dämpft B-Impuls. Ausgleich oder Reibung.',
  'Wasser-Erde':  'Wasser wird durch Erde kanalisiert — B gibt A-Tiefe Form.',
  'Wasser-Metall':'Wasser empfängt Metall-Fokus — B gibt A Richtung und Klarheit.',
  'Wasser-Wasser':'Tiefe intuitive Resonanz — stilles Verstehen. Braucht praktische Erdung.',
};

const ASPECT_DEFS = [
  { angle: 0,   orb: 8, label: 'Konjunktion', description: 'Direkte Verschmelzung — Energien verstärken oder überlagern sich.' },
  { angle: 60,  orb: 5, label: 'Sextil',      description: 'Harmonische Ergänzung — Chancen entstehen durch Begegnung.' },
  { angle: 90,  orb: 7, label: 'Quadrat',     description: 'Kreative Spannung — Wachstum durch Auseinandersetzung.' },
  { angle: 120, orb: 7, label: 'Trigon',      description: 'Natürlicher Fluss — Unterstützung ohne Aufwand.' },
  { angle: 180, orb: 8, label: 'Opposition',  description: 'Polarisierende Anziehung — zwei Seiten eines Ganzen.' },
];

const SYNASTRY_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];

function angleBetween(lonA, lonB) {
  const diff = Math.abs((lonA - lonB + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

export function createSynastryProjection(profileA, profileB) {
  if (!profileB) {
    return { wuxing: null, bazi: null, aspects: [], missing: ['Person B — Zweiter Geburts-Datensatz fehlt'], confidence: 0 };
  }

  const missing = [];
  let deduction = 0;

  const elA = profileA?.bazi?.day_master?.element || null;
  const elB = profileB?.bazi?.day_master?.element || null;
  let wuxing = null;
  if (elA && elB) {
    const pair = WUXING_PAIR[`${elA}-${elB}`];
    wuxing = pair
      ? { elementA: elA, elementB: elB, relation: pair.relation, cycle: pair.cycle, description: pair.description }
      : { elementA: elA, elementB: elB, relation: 'neutral', cycle: `${elA} ↔ ${elB}`, description: 'Keine bekannte Zyklusbeziehung — neutrale Begegnung.' };
  } else {
    missing.push('Wu-Xing Vergleich (BaZi Day Master fehlt in einem der Profile)');
    deduction += 0.3;
  }

  let bazi = null;
  if (elA && elB) {
    const desc = BAZI_PAIR[`${elA}-${elB}`] || `${elA} und ${elB} — individuelle Energiesignaturen begegnen sich.`;
    bazi = {
      stemA:    profileA?.bazi?.day_master?.stem || '',
      elementA: elA,
      stemB:    profileB?.bazi?.day_master?.stem || '',
      elementB: elB,
      description: desc,
    };
  } else {
    missing.push('BaZi-Resonanz (Day Master unvollständig)');
    deduction += 0.2;
  }

  const aspects = [];
  const bodiesA = profileA?.western?.bodies || {};
  const bodiesB = profileB?.western?.bodies || {};
  let aspectsChecked = 0;

  for (const nameA of SYNASTRY_BODIES) {
    const bA = bodiesA[nameA];
    if (!bA || bA.longitude === undefined) continue;
    for (const nameB of SYNASTRY_BODIES) {
      const bB = bodiesB[nameB];
      if (!bB || bB.longitude === undefined) continue;
      aspectsChecked++;
      const angle = angleBetween(bA.longitude, bB.longitude);
      for (const def of ASPECT_DEFS) {
        if (Math.abs(angle - def.angle) <= def.orb) {
          aspects.push({
            bodyA:       nameA,
            bodyB:       nameB,
            aspect:      def.label,
            orbDeg:      Math.round(Math.abs(angle - def.angle) * 10) / 10,
            description: def.description,
          });
          break;
        }
      }
    }
  }

  if (aspectsChecked === 0) {
    missing.push('Westliche Aspekte (Planetenpositionen fehlen)');
    deduction += 0.2;
  }

  const confidence = Math.max(0, Math.round((1 - deduction) * 100) / 100);
  return { wuxing, bazi, aspects, missing, confidence };
}

