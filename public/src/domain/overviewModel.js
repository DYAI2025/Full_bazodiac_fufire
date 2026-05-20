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

function num(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

// ── chartWheel sub-builder ──────────────────────────────────────────────────
// Bodies: enrichWesternBodies returns object keyed by English name; flatten
// to array with normalized fields the wheel expects.
function buildChartWheel(rawWestern) {
  const enrichedBodies = enrichWesternBodies(rawWestern || {});
  const bodies = Object.entries(enrichedBodies).map(([key, b]) => ({
    name:       key,
    longitude:  b.longitude,
    signDE:     b.signDE,
    glyph:      b.glyph,
    retrograde: b.retrograde,
  })).filter((b) => typeof b.longitude === 'number');

  const asc = num(rawWestern?.angles?.Ascendant);
  const mc  = num(rawWestern?.angles?.MC);

  // Houses: raw shape is `{ "1": { longitude, sign }, ... }`. Normalize.
  const rawHouses = rawWestern?.houses || {};
  const houses = Object.entries(rawHouses)
    .map(([num_, h]) => ({
      number: Number(num_),
      cuspLongitude: num(h?.longitude),
      sign: h?.sign ?? null,
    }))
    .filter((h) => Number.isFinite(h.number) && typeof h.cuspLongitude === 'number')
    .sort((a, b) => a.number - b.number);

  // Aspects: raw uses planet1/planet2; normalize to source/target.
  const enrichedAspects = selectSalientAspects(rawWestern?.aspects || [], 12);
  const aspects = enrichedAspects.map((a) => ({
    source: a.planet1,
    target: a.planet2,
    type:   a.type,
    orb:    a.orb,
  }));

  return { bodies, asc, mc, houses, aspects };
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

// ── warnings sub-builder ────────────────────────────────────────────────────
function buildWarnings(profile, chartWheel) {
  const warnings = [];
  if (!profile?.western)            warnings.push('Westliches Chart nicht geliefert.');
  if (!chartWheel.bodies.length)    warnings.push('Keine Planetenpositionen vorhanden — Wheel zeigt nur Tierkreis.');
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
    elementEconomy: safe?.fusion ? enrichWuxing(safe) : null,
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
