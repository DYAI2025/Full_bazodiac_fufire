// Synthetic but realistic API profile shape used across page-render integration
// tests. Keep this in sync with what the FuFirE upstream returns.
// Every string is a legitimate astrology term — none on the noFakeDataGuard
// blocklist (Lorem/dummy/fake/Mustermann/Beispieltext).

export const SYNTHETIC_PROFILE = {
  view_model_version: '1.0',
  western: {
    ascendant: { sign: 'Libra', longitude: 187.5 },
    bodies: {
      Sun:     { sign: 'Taurus',  longitude: 55.10,  house: 7,  retrograde: false },
      Moon:    { sign: 'Scorpio', longitude: 215.20, house: 1,  retrograde: false },
      Mercury: { sign: 'Aries',   longitude: 25.40,  house: 6,  retrograde: false },
      Venus:   { sign: 'Cancer',  longitude: 108.10, house: 9,  retrograde: false },
      Mars:    { sign: 'Leo',     longitude: 142.70, house: 10, retrograde: false },
      Jupiter: { sign: 'Sagittarius', longitude: 250.10, house: 2, retrograde: true  },
      Saturn:  { sign: 'Capricorn',   longitude: 285.80, house: 3, retrograde: false },
    },
    houses: {
      1:  { cusp: 187.5, sign: 'Libra' },
      2:  { cusp: 217.5, sign: 'Scorpio' },
      3:  { cusp: 247.5, sign: 'Sagittarius' },
      4:  { cusp: 277.5, sign: 'Capricorn' },
      5:  { cusp: 307.5, sign: 'Aquarius' },
      6:  { cusp: 337.5, sign: 'Pisces' },
      7:  { cusp: 7.5,   sign: 'Aries' },
      8:  { cusp: 37.5,  sign: 'Taurus' },
      9:  { cusp: 67.5,  sign: 'Gemini' },
      10: { cusp: 97.5,  sign: 'Cancer' },
      11: { cusp: 127.5, sign: 'Leo' },
      12: { cusp: 157.5, sign: 'Virgo' },
    },
    aspects: [
      { from: 'Sun', to: 'Mars', angle: 90, label: 'Quadrat', orb: 2.5 },
      { from: 'Moon', to: 'Venus', angle: 60, label: 'Sextil', orb: 1.1 },
    ],
  },
  bazi: {
    // Mirror real /api/azodiac/profile shape: day_master is a pillar object,
    // not a bare stem string. Verified in test/_fixtures/upstream-snapshots/profile.real.json.
    day_master: { stem: 'Bing', branch: 'Yin', element: 'Feuer', hidden_stems: [] },
    pillars: {
      year:  { stem: 'Geng', branch: 'Wu', element: 'Metall', hidden_stems: [] },
      month: { stem: 'Xin',  branch: 'Si', element: 'Metall', hidden_stems: [] },
      day:   { stem: 'Bing', branch: 'Yin', element: 'Feuer', hidden_stems: [] },
      hour:  { stem: 'Wu',   branch: 'Zi', element: 'Erde',   hidden_stems: [] },
    },
  },
  fusion: {
    coherence_index: 0.73,
    dominantElement:  'Feuer',
    deficientElement: 'Wasser',
    wu_xing_vectors: {
      bazi_pillars: { Holz: 0.10, Feuer: 0.45, Erde: 0.25, Metall: 0.15, Wasser: 0.05 },
    },
  },
  _inputMeta: {
    alias: 'Maria',
    timeCertainty: 'exact',
    location: 'Berlin, DE',
  },
};

// Strings the rendered page MUST contain (proves API-driven binding).
export const EXPECTED_API_STRINGS = ['Bing', 'Wu', 'Yin', 'Feuer', 'Metall'];
