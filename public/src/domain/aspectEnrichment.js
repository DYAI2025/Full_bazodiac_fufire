// public/src/domain/aspectEnrichment.js
//
// Pure enrichment layer for FuFire western-chart aspects. Joins raw API
// records with the EN→DE registries to produce the design-shape per-aspect
// VM the upcoming WesternPage "activations" section + FusionPage evidence
// will render.
//
// API shape (from western.aspects[i]):
//   { planet1, planet2, type, angle, orb, exact_angle }
//   planet1/2: English body name ("Sun", "Moon", "Pluto", ...)
//   type:      English aspect name ("conjunction" | "sextile" | "square"
//              | "trine" | "opposition" | "semi-sextile" | "quincunx")
//   orb:       degrees off-exact (0 = exact, larger = looser)
//
// Salience model for selectSalientAspects():
//   1. Aspects involving Sun OR Moon get priority (luminary involvement
//      is what astrologers typically call out first).
//   2. Within the luminary group, tighter orb wins.
//   3. Non-luminary aspects fill remaining slots, also orb-ranked.

import { ASPECT_DE, PLANET_DE_CLEAN } from '../data/astro-mappings.js';

const LUMINARIES = new Set(['Sun', 'Moon']);

// ── enrichAspect ────────────────────────────────────────────────────────────
export function enrichAspect(raw) {
  if (!raw) return null;
  const planet1   = raw.planet1 ?? null;
  const planet2   = raw.planet2 ?? null;
  const type      = raw.type    ?? null;
  const planet1DE = (planet1 && PLANET_DE_CLEAN[planet1]) || planet1;
  const planet2DE = (planet2 && PLANET_DE_CLEAN[planet2]) || planet2;
  const typeDE    = (type    && ASPECT_DE[type])          || type;
  const label     = (planet1DE && typeDE && planet2DE)
    ? `${planet1DE} ${typeDE} ${planet2DE}`
    : null;

  const involvesLuminary = LUMINARIES.has(planet1) || LUMINARIES.has(planet2);

  return {
    planet1,    planet1DE,
    planet2,    planet2DE,
    type,       typeDE,
    angle:      raw.angle      ?? null,
    orb:        raw.orb        ?? null,
    exactAngle: raw.exact_angle ?? null,
    label,
    involvesLuminary,
  };
}

// ── selectSalientAspects ────────────────────────────────────────────────────
// Returns up to N aspects, luminary-involving first (by orb tightness),
// then non-luminary (also by orb tightness).
export function selectSalientAspects(rawAspects, n = 3) {
  if (!Array.isArray(rawAspects) || rawAspects.length === 0) return [];

  const enriched = rawAspects.map(enrichAspect).filter(Boolean);

  const luminary    = enriched.filter((a) => a.involvesLuminary);
  const nonLuminary = enriched.filter((a) => !a.involvesLuminary);

  const byOrb = (a, b) => {
    const oA = typeof a.orb === 'number' ? a.orb : Infinity;
    const oB = typeof b.orb === 'number' ? b.orb : Infinity;
    return oA - oB;
  };
  luminary.sort(byOrb);
  nonLuminary.sort(byOrb);

  return [...luminary, ...nonLuminary].slice(0, n);
}

// ── enrichWesternAspects ────────────────────────────────────────────────────
// Convenience wrapper: take the whole rawWestern section and return the
// top-N salient enriched aspects ready for rendering.
export function enrichWesternAspects(rawWestern, n = 3) {
  const aspects = rawWestern?.aspects;
  if (!Array.isArray(aspects)) return [];
  return selectSalientAspects(aspects, n);
}
