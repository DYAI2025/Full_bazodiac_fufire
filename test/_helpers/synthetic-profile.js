// Synthetic but realistic API profile shape used across page-render integration
// tests. Keep this in sync with what the FuFire upstream actually returns —
// verified field-by-field against test/_fixtures/upstream-snapshots/profile.real.json.
//
// Field-shape audit (2026-05-20):
//   - western.ascendant  → STRING (EN sign), not object
//   - western.houses[i]  → { longitude, sign }, NOT { cusp, sign }
//   - western.angles     → { Ascendant, MC, Vertex } as raw longitudes
//   - western.aspects[*] → { planet1, planet2, type, angle, orb, exact_angle }
//                          NOT { from, to, label }
//   - bodies[*]          → { longitude, sign, zodiac_sign, house, retrograde,
//                            degree_in_sign }
//   - bazi.day_master    → pillar object (stem/branch/element/hidden_stems)
//   - fusion.remediation → { distribution, dominant, deficient, actions, summary }
//                          IS the authoritative source for dominant/deficient.
//                          NOT to be confused with the legacy
//                          fusion.{dominantElement,deficientElement} (which
//                          NEVER appeared in real API responses).
//
// Every string is a legitimate astrology term — none on the noFakeDataGuard
// blocklist (Lorem/dummy/fake/Mustermann/Beispieltext).

export const SYNTHETIC_PROFILE = {
  view_model_version: '2',
  western: {
    // ASCENDANT: real API returns a bare EN sign string, not an object.
    ascendant: 'Libra',
    // ANGLES: raw longitudes for Asc/MC/Vertex.
    angles: {
      Ascendant: 187.5,
      MC:        97.5,
      Vertex:    7.5,
    },
    bodies: {
      Sun:     { longitude: 55.10,  sign: 'Taurus',      zodiac_sign: 1,  house: 7,  retrograde: false, degree_in_sign: 25.10 },
      Moon:    { longitude: 215.20, sign: 'Scorpio',     zodiac_sign: 7,  house: 1,  retrograde: false, degree_in_sign: 5.20 },
      Mercury: { longitude: 25.40,  sign: 'Aries',       zodiac_sign: 0,  house: 6,  retrograde: false, degree_in_sign: 25.40 },
      Venus:   { longitude: 108.10, sign: 'Cancer',      zodiac_sign: 3,  house: 9,  retrograde: false, degree_in_sign: 18.10 },
      Mars:    { longitude: 142.70, sign: 'Leo',         zodiac_sign: 4,  house: 10, retrograde: false, degree_in_sign: 22.70 },
      Jupiter: { longitude: 250.10, sign: 'Sagittarius', zodiac_sign: 8,  house: 2,  retrograde: true,  degree_in_sign: 10.10 },
      Saturn:  { longitude: 285.80, sign: 'Capricorn',   zodiac_sign: 9,  house: 3,  retrograde: false, degree_in_sign: 15.80 },
    },
    // HOUSES: keyed 1..12, each { longitude, sign } (NOT cusp).
    houses: {
      1:  { longitude: 187.5, sign: 'Libra' },
      2:  { longitude: 217.5, sign: 'Scorpio' },
      3:  { longitude: 247.5, sign: 'Sagittarius' },
      4:  { longitude: 277.5, sign: 'Capricorn' },
      5:  { longitude: 307.5, sign: 'Aquarius' },
      6:  { longitude: 337.5, sign: 'Pisces' },
      7:  { longitude: 7.5,   sign: 'Aries' },
      8:  { longitude: 37.5,  sign: 'Taurus' },
      9:  { longitude: 67.5,  sign: 'Gemini' },
      10: { longitude: 97.5,  sign: 'Cancer' },
      11: { longitude: 127.5, sign: 'Leo' },
      12: { longitude: 157.5, sign: 'Virgo' },
    },
    // ASPECTS: real shape — planet1/planet2/type/angle/orb/exact_angle.
    aspects: [
      { planet1: 'Sun',  planet2: 'Mars',   type: 'square',  angle: 87.6,  orb: 2.4, exact_angle: 90  },
      { planet1: 'Moon', planet2: 'Venus',  type: 'sextile', angle: 106.9, orb: 46.9, exact_angle: 60  },
      { planet1: 'Sun',  planet2: 'Saturn', type: 'opposition', angle: 230.7, orb: 50.7, exact_angle: 180 },
    ],
  },
  bazi: {
    // bazi.day_master is a full pillar object, NOT a bare stem string.
    day_master: { stem: 'Bing', branch: 'Yin', element: 'Feuer', hidden_stems: [] },
    pillars: {
      year:  { stem: 'Geng', branch: 'Wu', element: 'Metall', hidden_stems: [] },
      month: { stem: 'Xin',  branch: 'Si', element: 'Metall', hidden_stems: [] },
      day:   { stem: 'Bing', branch: 'Yin', element: 'Feuer', hidden_stems: [] },
      hour:  { stem: 'Wu',   branch: 'Zi', element: 'Erde',   hidden_stems: [] },
    },
  },
  fusion: {
    wu_xing_vectors: {
      western_planets: { Holz: 0.20, Feuer: 0.40, Erde: 0.25, Metall: 0.10, Wasser: 0.05 },
      bazi_pillars:    { Holz: 0.10, Feuer: 0.45, Erde: 0.25, Metall: 0.15, Wasser: 0.05 },
    },
    coherence_index: 0.73,
    fusion_interpretation: 'Mittlere Resonanz — Feuer dominant, Wasser unterrepräsentiert.',
    aspects: [],
    house_overlay: null,
    dominant_patterns: [],
    synthesis_notes: null,
    // remediation IS the authoritative source for dominant/deficient (server-normalized).
    remediation: {
      distribution: { Holz: 0.10, Feuer: 0.45, Erde: 0.25, Metall: 0.15, Wasser: 0.05 },
      dominant:  'Feuer',
      deficient: 'Wasser',
      actions: [{
        type:        'strengthen',
        element:     'Wasser',
        via_generator: 'Metall',
        activities:  ['Spaziergang am Wasser', 'Schreiben in Stille', 'Tiefes Atmen'],
        rationale:   'Wasser ist unterrepräsentiert. Metall nährt Wasser im Sheng-Zyklus.',
      }],
      summary: 'Wasser ist unterrepräsentiert — gezielter Aufbau über Metall-Aktivitäten.',
    },
  },
  _meta: {
    input: { date: '2000-01-01T12:00:00', tz: 'Europe/Berlin', lat: 52.5, lon: 13.4 },
    upstream_status: { western: 200, bazi: 200, fusion: 200, wuxing: 200, tst: 200, wuxing_info: 200 },
    view_model_version: '2',
    fetched_at: '2026-05-20T00:00:00.000Z',
  },
  _inputMeta: {
    alias: 'Maria',
    timeCertainty: 'exact',
    location: 'Berlin, DE',
  },
};

// Strings the rendered page MUST contain (proves API-driven binding).
// Synthetic profile has bazi pillars Geng-Wu / Xin-Si / Bing-Yin / Wu-Zi
// → unique stems Bing/Geng/Xin/Wu, unique elements Feuer/Metall.
export const EXPECTED_API_STRINGS = ['Bing', 'Wu', 'Yin', 'Feuer', 'Metall'];
