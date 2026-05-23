// public/src/domain/overviewModel.js
//
// profileToOverviewModel — single Source-of-Truth that wraps the modular
// enrichers (westernBodyEnrichment, aspectEnrichment, wuxingEnrichment)
// into the shape OverviewPage binds to. Normalizes raw API field names
// (e.g. `western.houses[i].longitude` → `cuspLongitude`, aspect
// `planet1/planet2` → `source/target`) so downstream components like
// NatalChartWheel never need to know about upstream casing/naming.
//
// Pure function. No DOM, no fetch, no side-effects. Empty/missing
// sections degrade gracefully and surface as `warnings[]` so the UI
// can render UnavailableCard fallbacks instead of crashing.

import { enrichWesternBodies } from './westernBodyEnrichment.js';
import { selectSalientAspects } from './aspectEnrichment.js';
import { enrichWuxing } from './wuxingEnrichment.js';
import {
  PLANET_GLYPH, SIGN_GLYPH, PLANET_DE_CLEAN, ASPECT_DE,
} from '../data/astro-mappings.js';

function num(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

const HARD_ASPECTS  = new Set(['square', 'opposition', 'semi-square', 'sesquiquadrate']);
const SOFT_ASPECTS  = new Set(['trine', 'sextile', 'semi-sextile']);

function aspectTone(type) {
  if (HARD_ASPECTS.has(type))  return 'hard';
  if (SOFT_ASPECTS.has(type))  return 'soft';
  return 'neutral';
}

function normalizeLon(deg) {
  return ((deg % 360) + 360) % 360;
}

// ── chartWheel sub-builder ──────────────────────────────────────────────────
// I3: every canonical body always appears in the output array, even when
// upstream omits its longitude — marked source='missing' so the wheel
// skips rendering and the audit shows "Daten fehlen". NEVER silently 0°.
const CANONICAL_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron',
];

function buildChartWheel(rawWestern) {
  const enrichedBodies = enrichWesternBodies(rawWestern || {});

  const bodies = CANONICAL_BODIES.map((bodyKey) => {
    const b = enrichedBodies[bodyKey] || {};
    const hasLon = typeof b.longitude === 'number' && Number.isFinite(b.longitude);
    return {
      key:           bodyKey,
      labelDE:       PLANET_DE_CLEAN[bodyKey] ?? bodyKey,
      glyph:         PLANET_GLYPH[bodyKey] ?? null,
      signGlyph:     (b.sign && SIGN_GLYPH[b.sign]) ?? null,
      degreeDisplay: hasLon ? (b.degDisplay ?? null) : null,
      house:         b.house ?? null,
      // Backcompat (existing tests use b.name)
      name:          bodyKey,
      longitude:     hasLon ? b.longitude : null,
      signDE:        hasLon ? b.signDE : null,
      retrograde:    b.retrograde ?? false,
      // I3: provenance tag — wheel skips source='missing', audit shows pill
      source:        hasLon ? 'api' : 'missing',
    };
  });

  const ascLon = num(rawWestern?.angles?.Ascendant);
  const mcLon  = num(rawWestern?.angles?.MC);
  const dscLon = ascLon != null ? normalizeLon(ascLon + 180) : null;
  const icLon  = mcLon  != null ? normalizeLon(mcLon  + 180) : null;
  const anglesSource =
    ascLon != null && mcLon != null ? 'api'
    : ascLon != null || mcLon != null ? 'derived'
    : 'missing';

  const rawHouses = rawWestern?.houses || {};
  const houses = Object.entries(rawHouses)
    .map(([num_, h]) => ({
      number: Number(num_),
      cuspLongitude: num(h?.longitude),
      sign: h?.sign ?? null,
    }))
    .filter((h) => Number.isFinite(h.number) && typeof h.cuspLongitude === 'number')
    .sort((a, b) => a.number - b.number);

  const enrichedAspects = selectSalientAspects(rawWestern?.aspects || [], 12);
  const aspects = enrichedAspects.map((a) => ({
    sourceKey: a.planet1,
    targetKey: a.planet2,
    typeDE:    ASPECT_DE[a.type] ?? a.type,
    tone:      aspectTone(a.type),
    // Backcompat
    source:    a.planet1,
    target:    a.planet2,
    type:      a.type,
    orb:       a.orb,
  }));

  return {
    bodies,
    angles: { asc: ascLon, dsc: dscLon, mc: mcLon, ic: icLon, source: anglesSource },
    // Backcompat top-level
    asc: ascLon,
    mc:  mcLon,
    houses,
    aspects,
  };
}

// ── topFacts sub-builder ────────────────────────────────────────────────────
function buildTopFacts(profile) {
  const dm = profile?.bazi?.day_master;
  const dayMaster = dm?.stem
    ? `${dm.stem}${dm.element ? ' ' + dm.element : ''}`.trim()
    : 'unbekannt';

  const sunBody = profile?.western?.bodies?.Sun;
  const sunSignEN = sunBody?.sign;
  const SIGN_DE_MAP = {
    Aries:'Widder', Taurus:'Stier', Gemini:'Zwillinge', Cancer:'Krebs',
    Leo:'Löwe', Virgo:'Jungfrau', Libra:'Waage', Scorpio:'Skorpion',
    Sagittarius:'Schütze', Capricorn:'Steinbock', Aquarius:'Wassermann',
    Pisces:'Fische',
  };
  const sunValue = sunSignEN ? (SIGN_DE_MAP[sunSignEN] || sunSignEN) : 'unbekannt';

  const coherence = num(profile?.fusion?.coherence_index)
                 ?? num(profile?.fusion?.coherence);

  return [
    { label: 'Day Master', value: dayMaster },
    { label: 'Sonne',      value: sunValue  },
    { label: 'Kohärenz',   value: coherence != null ? String(coherence) : '—' },
  ];
}

// ── OV-I1 narrative sub-builders ────────────────────────────────────────────
// Pure: no DOM, no fetch. They map the safe profile into UI-ready narrative
// blocks the OverviewPage renders. Missing data degrades to human German
// fallbacks — never raw technical field names ("Distribution", "Plan", …).

function buildSignatureHero(profile) {
  const dm = profile?.bazi?.day_master;
  const headline = profile?.fusion?.headline
                ?? profile?.fusion?.summary
                ?? null;
  const essence = headline
    ? headline
    : dm?.stem
      ? `Dein Muster trägt einen ${dm.stem}-Kern.`
      : 'Signatur noch nicht vollständig geliefert.';
  return {
    essence,
    ctas: [
      { label: 'Heute anwenden',     route: '/daily'    },
      { label: 'In Beziehung sehen', route: '/synastry' },
    ],
  };
}

function buildEvidenceCards(profile) {
  const sun = profile?.western?.bodies?.Sun;
  const dm  = profile?.bazi?.day_master;
  const coh = num(profile?.fusion?.coherence_index)
           ?? num(profile?.fusion?.coherence);
  return {
    western: {
      title: 'Westliches Chart',
      body:  sun?.sign
        ? `Sonne in ${sun.sign}.`
        : 'Westliches Chart noch nicht geliefert.',
    },
    bazi: {
      title: 'BaZi',
      body:  dm?.stem
        ? `Day Master ${dm.stem}${dm.element ? ' / ' + dm.element : ''}.`
        : 'BaZi Day Master noch nicht geliefert.',
    },
    fusion: {
      title: 'Fusion',
      body:  coh != null
        ? `Kohärenz-Index ${coh}.`
        : 'Fusion-Layer noch nicht geliefert.',
    },
  };
}

function buildMeaningBridge(profile) {
  const sun  = profile?.western?.bodies?.Sun;
  const moon = profile?.western?.bodies?.Moon;
  const dm   = profile?.bazi?.day_master;
  return {
    carries: {
      title:  'Was dich trägt',
      body:   sun?.sign && dm?.stem
        ? `Sonne in ${sun.sign} und Day Master ${dm.stem} bilden deinen Grundimpuls.`
        : 'Tragende Achse wird angezeigt, sobald Sonne und Day Master geliefert sind.',
      source: 'western.Sun + bazi.day_master',
    },
    friction: {
      title:  'Was reibt',
      body:   moon?.sign
        ? `Mond in ${moon.sign} arbeitet gegen den Tagesimpuls, wenn du ihn ignorierst.`
        : 'Reibungsachse wird angezeigt, sobald der Mond geliefert ist.',
      source: 'western.Moon',
    },
    todayLever: {
      title:  'Was heute hilft',
      body:   'Beginne den Tag mit einer kurzen, fokussierten Handlung statt mit Recherche.',
      source: 'Allgemeine Empfehlung',
    },
  };
}

// OV-I4: pass the FULL aspect list to the UI. The TopMovements component
// performs its own slice (visible top-3 + collapsed accordion). The OV-I1
// regression that pinned `topMovements.length <= 3` still holds because the
// salient-aspect selector caps the list to 12 useful entries below.
function buildTopMovements(profile) {
  const raw = Array.isArray(profile?.western?.aspects)
    ? profile.western.aspects
    : [];
  // Limit to the same 12 salient aspects selectSalientAspects produces for
  // the chart wheel — keeps payload small without losing the long tail.
  const limited = raw.slice(0, 12);
  return limited.map((a) => ({
    sourceKey: PLANET_DE_CLEAN[a.planet1] ?? a.planet1,
    targetKey: PLANET_DE_CLEAN[a.planet2] ?? a.planet2,
    typeDE:    (typeof a.type === 'string' && a.type) || 'aspekt',
    tone:      aspectTone(a.type),
    orb:       num(a.orb),
  }));
}

function buildGuidedDeepDives() {
  return [
    { intent: 'Ich will mich verstehen',         route: '/personality' },
    { intent: 'Ich will es heute anwenden',      route: '/daily'       },
    { intent: 'Ich will Beziehungsmuster sehen', route: '/synastry'    },
    { intent: 'Ich will die Berechnung prüfen',  route: '/method'      },
  ];
}

// ── OV-I1-T02: UI-safe Element-Oekonomie summary ────────────────────────────
// Consumes the enrichWuxing output (already produced as elementEconomy) and
// produces a flat, human-readable summary the OverviewPage can render
// directly. NEVER exposes internal keys (`distribution`, `plan`, `properties`,
// `todayLever`) — only German user-facing strings.
function buildElementSummary(elementEconomy) {
  if (!elementEconomy || !Array.isArray(elementEconomy.distribution)
      || elementEconomy.distribution.length === 0) {
    return {
      dominantElement:         '',
      underrepresentedElement: '',
      leverToday:              'WuXing-Daten noch nicht geliefert.',
      sentence:                'Element-Übersicht erscheint, sobald die Fusion-Daten geliefert sind.',
      ctaRoute:                '/wuxing',
    };
  }

  const dominantLabel = elementEconomy.dominant?.label ?? '';
  const deficientLabel = elementEconomy.deficient?.label ?? '';
  const leverToday = (typeof elementEconomy.todayLever === 'string' && elementEconomy.todayLever)
    ? elementEconomy.todayLever
    : (dominantLabel
        ? `${dominantLabel} ist heute prägend — kleine Gegenakzente halten dich beweglich.`
        : 'Setze heute einen kleinen, fokussierten Akzent.');

  const sentence = dominantLabel && deficientLabel
    ? `${dominantLabel} trägt deine Signatur, ${deficientLabel} bleibt unterrepräsentiert.`
    : dominantLabel
      ? `${dominantLabel} trägt deine Signatur.`
      : deficientLabel
        ? `${deficientLabel} ist unterrepräsentiert und braucht Aufmerksamkeit.`
        : 'Element-Verteilung wird angezeigt, sobald die Daten geliefert sind.';

  return {
    dominantElement:         dominantLabel,
    underrepresentedElement: deficientLabel,
    leverToday,
    sentence,
    ctaRoute:                '/wuxing',
  };
}

// ── warnings sub-builder ────────────────────────────────────────────────────
function buildWarnings(profile, chartWheel) {
  const warnings = [];
  if (!profile?.western)            warnings.push('Westliches Chart nicht geliefert.');
  const presentBodies = chartWheel.bodies.filter((b) => b.source !== 'missing');
  if (!presentBodies.length)        warnings.push('Keine Planetenpositionen vorhanden — Wheel zeigt nur Tierkreis.');
  if (!chartWheel.houses.length)    warnings.push('Häuser nicht geliefert — Wheel zeigt nur Tierkreis und Planeten.');
  if (chartWheel.asc == null)       warnings.push('Aszendent fehlt.');
  if (chartWheel.mc == null)        warnings.push('Medium Coeli fehlt.');
  if (!profile?.bazi?.day_master)   warnings.push('BaZi Day Master fehlt.');
  if (!profile?.fusion)             warnings.push('Fusion-Layer nicht geliefert.');
  return warnings;
}

// ── main export ─────────────────────────────────────────────────────────────
export function profileToOverviewModel(profile) {
  const safe = profile || {};
  const chartWheel = buildChartWheel(safe.western);
  const topFacts   = buildTopFacts(safe);
  const warnings   = buildWarnings(safe, chartWheel);
  const elementEconomy = safe?.fusion ? enrichWuxing(safe) : null;
  const elementSummary = buildElementSummary(elementEconomy);

  return {
    identity: {
      alias:     safe?.meta?.alias ?? '',
      dayMaster: topFacts[0].value,
    },
    topFacts,
    chartWheel,
    baziPillars:   safe?.bazi?.pillars ?? null,
    westernFactors: chartWheel.bodies,
    fusionSummary: {
      coherence: num(safe?.fusion?.coherence_index) ?? num(safe?.fusion?.coherence),
      statement: safe?.fusion?.headline
              ?? safe?.fusion?.summary
              ?? safe?.fusion?.fusion_interpretation
              ?? null,
    },
    elementEconomy,
    elementSummary,
    signatureHero:   buildSignatureHero(safe),
    fusionEssence:   safe?.fusion?.summary
                   ?? safe?.fusion?.headline
                   ?? '',
    evidenceCards:   buildEvidenceCards(safe),
    meaningBridge:   buildMeaningBridge(safe),
    topMovements:    buildTopMovements(safe),
    guidedDeepDives: buildGuidedDeepDives(),
    nextDoors: [
      { path: '/bazi',    label: 'BaZi'    },
      { path: '/western', label: 'Western' },
      { path: '/wuxing',  label: 'Wu-Xing' },
      { path: '/fusion',  label: 'Fusion'  },
      { path: '/daily',   label: 'Tagespuls' },
    ],
    methodMeta: {
      provenance: safe?.meta?.provenance ?? null,
      confidence: safe?.meta?.confidence ?? null,
    },
    warnings,
  };
}
