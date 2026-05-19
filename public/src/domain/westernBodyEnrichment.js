// public/src/domain/westernBodyEnrichment.js
//
// Pure enrichment layer for FuFire western-chart bodies. Takes raw API
// response (`western: { bodies, houses, aspects, ascendant, angles }`)
// and joins it with frontend narrative registries to produce the
// design-shape per-body view-model the new WesternPage/HousesPage will
// render.
//
// The API gives computational facts:
//   bodies[*]: { longitude, sign (EN), zodiac_sign, house: null, retrograde, degree_in_sign }
//   houses[i]: { longitude, sign (EN) }
//   aspects[]: { planet1, planet2, type, angle, orb, exact_angle }
//   ascendant: string (DE or EN sign)
//   angles:    { Ascendant, MC, Vertex } as longitudes
//
// API returns `bodies[*].house: null` — orchestrator drops body-to-house
// mapping. We compute it frontend-side via Placidus-style cusp lookup
// (matches `western.house_quality.system: "placidus"` from upstream).

import { signToElement, SIGN_DE, SIGN_GLYPH, PLANET_DE } from '../data/astro-mappings.js';
import { WESTERN_SIGN_MEANINGS } from './meanings.js';

// ── formatDegMinutes ────────────────────────────────────────────────────────
// 23.152453 → "23°09'"  (.152 × 60 = 9.12 → floor 9)
// Returns null for null/undefined/NaN — never invents a value.
export function formatDegMinutes(decimalDeg) {
  if (decimalDeg === null || decimalDeg === undefined) return null;
  const n = Number(decimalDeg);
  if (Number.isNaN(n)) return null;
  const deg = Math.floor(n);
  const minDec = (n - deg) * 60;
  const min = Math.floor(minDec);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

// ── computeBodyHouse ────────────────────────────────────────────────────────
// Placidus inverse-lookup: given a body's ecliptic longitude and the 12
// house cusps (object keyed 1..12 → { longitude, ... }), return the house
// number the body falls into (1..12). Returns null for malformed input.
//
// Algorithm: walk cusps in order 1..12. House i runs from cusp_i (inclusive)
// to cusp_{i+1} (exclusive). Handle the 0°/360° wrap by adding 360 to the
// next cusp when it appears smaller than the current cusp, and similarly
// shifting the body longitude when it's below the current cusp.
export function computeBodyHouse(longitude, houseCusps) {
  if (longitude === null || longitude === undefined || Number.isNaN(Number(longitude))) return null;
  if (!houseCusps || typeof houseCusps !== 'object') return null;

  // Extract numeric cusps; bail out if any of the 12 cusps is missing/non-numeric.
  const cusps = new Array(13);
  for (let i = 1; i <= 12; i++) {
    const c = houseCusps[i] ?? houseCusps[String(i)];
    if (!c || typeof c.longitude !== 'number') return null;
    cusps[i] = c.longitude;
  }

  const L = Number(longitude);
  for (let i = 1; i <= 12; i++) {
    const next = (i % 12) + 1;
    let c1 = cusps[i];
    let c2 = cusps[next];
    if (c2 < c1) c2 += 360; // wrap
    let testL = L;
    if (testL < c1) testL += 360;
    if (testL >= c1 && testL < c2) return i;
  }
  // Numerically unreachable for valid cusps + longitudes; treat as null.
  return null;
}

// ── enrichBody ──────────────────────────────────────────────────────────────
// Join a single raw body record with sign translations + narrative slots.
// Pure function — no side effects, no I/O.
export function enrichBody(bodyKey, rawBody, houseCusps) {
  if (!rawBody) return null;

  const signEN = rawBody.sign ?? null;
  const signDE = (signEN && SIGN_DE[signEN]) || signEN;
  const glyph  = (signEN && SIGN_GLYPH[signEN]) || null;
  const element = signEN ? signToElement(signEN) : null;
  const meaning = (signEN && WESTERN_SIGN_MEANINGS[signEN]) || null;

  const degDecimal = rawBody.degree_in_sign ?? null;
  const degDisplay = formatDegMinutes(degDecimal);

  // House comes either from API (currently always null) or our computation.
  const house = rawBody.house ?? computeBodyHouse(rawBody.longitude, houseCusps);

  return {
    key:        bodyKey,
    name:       PLANET_DE[bodyKey] || bodyKey,
    longitude:  rawBody.longitude ?? null,
    sign:       signEN,
    signDE,
    glyph,
    element,
    degDecimal,
    degDisplay,
    house,
    retrograde: rawBody.retrograde ?? false,
    // Narrative slots — null if sign unknown so consumers can hide the section
    // rather than render a misleading default.
    mode:       meaning?.mode      || null,
    resource:   meaning?.resource  || null,
    shadow:     meaning?.shadow    || null,
    practice:   meaning?.practice  || null,
  };
}

// ── enrichWesternBodies ─────────────────────────────────────────────────────
// Map over all bodies in `rawWestern.bodies`, returning enriched VM keyed
// by the same body name (Sun, Moon, ...). Empty object on missing input —
// pages decide how to render the absence (UnavailableCard).
export function enrichWesternBodies(rawWestern) {
  const bodies = rawWestern?.bodies;
  if (!bodies || typeof bodies !== 'object') return {};
  const cusps = rawWestern.houses || {};
  const out = {};
  for (const [bodyKey, raw] of Object.entries(bodies)) {
    const enriched = enrichBody(bodyKey, raw, cusps);
    if (enriched) out[bodyKey] = enriched;
  }
  return out;
}
