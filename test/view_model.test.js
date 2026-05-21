import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAzodiacResult, computeFusionRemediation } from '../server.js';

const RAW_MINIMAL = {
  western: {
    bodies: {
      Sun: { longitude: 45.0, zodiac_sign: 1, house: 2, is_retrograde: false },
    },
    houses: [{ cusp: 0 }],
    aspects: [{ planet1: 'Sun', planet2: 'Moon', type: 'trine', orb: 1.2, applying: true }],
  },
  bazi: {
    pillars: {
      day: { stamm: '甲', zweig: '子', element: 'wood' },
    },
  },
  fusion: {
    wu_xing_vectors: {
      western_planets: { holz: 0.4, feuer: 0.2, erde: 0.1, metall: 0.2, wasser: 0.1 },
    },
    coherence_index: 0.82,
    fusion_interpretation: 'Test interpretation.',
  },
  _meta: { input: { date: '2000-01-01T12:00:00', tz: 'UTC', lat: 48.0, lon: 11.0 }, upstream_status: {} },
};

test('normalizeAzodiacResult produces stable ViewModel shape', () => {
  const vm = normalizeAzodiacResult(RAW_MINIMAL);

  // Top-level keys always present
  assert.ok('western' in vm);
  assert.ok('bazi' in vm);
  assert.ok('fusion' in vm);
  assert.ok('_meta' in vm);

  // Western — bodies normalized
  assert.ok(vm.western.bodies.Sun);
  assert.equal(typeof vm.western.bodies.Sun.longitude, 'number');
  assert.equal(typeof vm.western.bodies.Sun.retrograde, 'boolean');

  // BaZi — element normalized to German
  assert.equal(vm.bazi.pillars.day.element, 'Holz');

  // Fusion — vectors normalized to German keys
  const wv = vm.fusion.wu_xing_vectors.western_planets;
  assert.ok('Holz' in wv && 'Feuer' in wv && 'Erde' in wv && 'Metall' in wv && 'Wasser' in wv);

  // Meta version stamp
  assert.equal(vm._meta.view_model_version, '2');

  // fetched_at — ISO timestamp
  assert.ok(typeof vm._meta.fetched_at === 'string', 'fetched_at must be a string');
  assert.doesNotThrow(() => new Date(vm._meta.fetched_at), 'fetched_at must be valid ISO date');
});

test('normalizeAzodiacResult handles missing subsections gracefully', () => {
  const vm = normalizeAzodiacResult({ western: null, bazi: null, fusion: null, _meta: {} });
  assert.deepEqual(vm.western.aspects, []);
  assert.deepEqual(vm.bazi.pillars, {});
  assert.equal(vm.fusion.coherence_index, null);
});

test('normalizePillar derives hidden_stems from branch when API omits them', () => {
  const vm = normalizeAzodiacResult({
    western: null, fusion: null,
    bazi: {
      pillars: {
        day: { stamm: '甲', zweig: '子', element: 'wood' }, // 子 = Ratte, Wasser, HS: 癸
      },
    },
    _meta: {},
  });

  const hs = vm.bazi.pillars.day.hidden_stems;
  assert.ok(Array.isArray(hs));
  assert.ok(hs.length > 0, 'hidden_stems should be derived for 子');
  assert.equal(hs[0].source, 'derived_from_branch_table');
  assert.equal(hs[0].stem, '癸'); // Gui — Yin-Wasser, Hauptstamm der Ratte
});

test('normalizePillar derives hidden_stems from Pinyin branch (real API uses Pinyin)', () => {
  // Real /api/azodiac/profile responses send `branch: "Mao"` (Pinyin), NOT 卯 (char).
  // Pre-refactor, the inline HIDDEN_STEMS map was char-keyed only, so live API
  // responses silently returned hidden_stems: [] (latent bug). The shared module
  // now accepts both forms via getHiddenStems().
  const vm = normalizeAzodiacResult({
    western: null, fusion: null,
    bazi: {
      pillars: {
        day: { stem: 'Ren', branch: 'Mao', element: 'Wasser' }, // Mao = Hase, HS: 乙
      },
    },
    _meta: {},
  });

  const hs = vm.bazi.pillars.day.hidden_stems;
  assert.ok(Array.isArray(hs));
  assert.ok(hs.length > 0, 'hidden_stems must be derived for Pinyin "Mao" (was silently empty before)');
  assert.equal(hs[0].source, 'derived_from_branch_table');
  assert.equal(hs[0].stem, '乙'); // Yi — Yin-Holz, Hauptstamm des Hasen
});

test('normalizeAzodiacResult derives ascendant sign from angles.Ascendant longitude', () => {
  // FuFirE actual: western.angles.Ascendant = ecliptic longitude (number)
  // 185.34° → index 6 (185/30 = 6.17) → Libra (Waage)
  const vm = normalizeAzodiacResult({
    western: {
      bodies: {},
      angles: { Ascendant: 185.34 },
    },
    bazi: null, fusion: null, _meta: {},
  });
  assert.equal(vm.western.ascendant, 'Libra', 'ascendant sign must be derived from angles.Ascendant longitude');
  assert.ok(vm.western.angles?.Ascendant === 185.34, 'raw angles must be preserved');
});

test('normalizeAzodiacResult accepts direct sign string as ascendant', () => {
  const vm = normalizeAzodiacResult({
    western: { bodies: {}, ascendant: 'Scorpio' },
    bazi: null, fusion: null, _meta: {},
  });
  assert.equal(vm.western.ascendant, 'Scorpio');
});

test('normalizeAzodiacResult extracts coherence_index from FuFirE harmony_index nested shape', () => {
  // FuFirE actual response: fusion.harmony_index = { harmony_index: 0.7352, interpretation: "...", cosine_similarity: 0.72 }
  const vm = normalizeAzodiacResult({
    western: null, bazi: null,
    fusion: {
      harmony_index: {
        harmony_index: 0.7352,
        interpretation: 'Hohe Resonanz zwischen westlichem und östlichem System.',
        cosine_similarity: 0.72,
      },
    },
    _meta: {},
  });

  assert.equal(typeof vm.fusion.coherence_index, 'number', 'coherence_index must be a number');
  assert.ok(Math.abs(vm.fusion.coherence_index - 0.7352) < 0.0001, 'coherence_index must match harmony_index.harmony_index');
  assert.ok(
    vm.fusion.fusion_interpretation.includes('Hohe Resonanz'),
    'fusion_interpretation must include harmony_index.interpretation',
  );
});

test('normalizeAzodiacResult falls back to planets field when bodies is absent', () => {
  const vm = normalizeAzodiacResult({
    western: {
      planets: {
        Sun:  { longitude: 45.0, sign: 'Taurus',  house: 2, is_retrograde: false },
        Moon: { longitude: 92.0, sign: 'Cancer',  house: 4, is_retrograde: false },
      },
    },
    bazi: null, fusion: null, _meta: {},
  });

  assert.ok(vm.western.bodies.Sun,  'Sun must be present when upstream sends planets field');
  assert.equal(vm.western.bodies.Sun.sign,  'Taurus');
  assert.ok(vm.western.bodies.Moon, 'Moon must be present when upstream sends planets field');
  assert.equal(vm.western.bodies.Moon.sign, 'Cancer');
});

test('normalizePillar keeps API-supplied hidden_stems unchanged', () => {
  const vm = normalizeAzodiacResult({
    western: null, fusion: null,
    bazi: {
      pillars: {
        day: {
          stamm: '甲', zweig: '子', element: 'wood',
          hidden_stems: [{ stem: '癸', weight: 10.0 }],
        },
      },
    },
    _meta: {},
  });

  const hs = vm.bazi.pillars.day.hidden_stems;
  assert.equal(hs.length, 1);
  assert.equal(hs[0].source, undefined); // API-Daten bleiben unverändert
});

// ── computeFusionRemediation ──────────────────────────────────────────────

test('computeFusionRemediation returns null for empty/invalid vector', () => {
  assert.equal(computeFusionRemediation(null), null);
  assert.equal(computeFusionRemediation({}), null);
  assert.equal(computeFusionRemediation({ Holz: 0, Feuer: 0, Erde: 0, Metall: 0, Wasser: 0 }), null);
});

test('computeFusionRemediation flags no dominant/deficient on balanced vector', () => {
  const r = computeFusionRemediation({ Holz: 0.2, Feuer: 0.2, Erde: 0.2, Metall: 0.2, Wasser: 0.2 });
  assert.equal(r.dominant, null);
  assert.equal(r.deficient, null);
  assert.deepEqual(r.actions, []);
  assert.match(r.summary, /ausgewogen/);
  // distribution sums to 1
  const sum = Object.values(r.distribution).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test('computeFusionRemediation detects dominant + deficient correctly', () => {
  // Feuer way over (0.5, dev +0.30), Wasser way under (0.05, dev -0.15)
  const r = computeFusionRemediation({ Holz: 0.15, Feuer: 0.5, Erde: 0.15, Metall: 0.15, Wasser: 0.05 });
  assert.equal(r.dominant, 'Feuer');
  assert.equal(r.deficient, 'Wasser');
  assert.equal(r.actions.length, 2);

  const strengthen = r.actions.find(a => a.type === 'strengthen');
  assert.equal(strengthen.element, 'Wasser');
  assert.equal(strengthen.via_generator, 'Metall'); // sheng parent of Wasser
  assert.ok(strengthen.activities.length > 0);

  const temper = r.actions.find(a => a.type === 'temper');
  assert.equal(temper.element, 'Feuer');
  assert.equal(temper.via_controller, 'Wasser'); // ke parent of Feuer
  assert.ok(temper.activities.length > 0);
});

test('computeFusionRemediation: dominant only (no element below deficient threshold)', () => {
  // Holz 0.40 (dev +0.20), rest ~0.15 (dev -0.05 — not deficient)
  const r = computeFusionRemediation({ Holz: 0.40, Feuer: 0.15, Erde: 0.15, Metall: 0.15, Wasser: 0.15 });
  assert.equal(r.dominant, 'Holz');
  assert.equal(r.deficient, null);
  assert.equal(r.actions.length, 1);
  assert.equal(r.actions[0].type, 'temper');
});

test('computeFusionRemediation: deficient only (no dominant)', () => {
  // Wasser 0.05 (dev -0.15), rest ~0.2375 — max dev +0.0375, not dominant
  const r = computeFusionRemediation({ Holz: 0.2375, Feuer: 0.2375, Erde: 0.2375, Metall: 0.2375, Wasser: 0.05 });
  assert.equal(r.dominant, null);
  assert.equal(r.deficient, 'Wasser');
  assert.equal(r.actions.length, 1);
  assert.equal(r.actions[0].type, 'strengthen');
});

test('computeFusionRemediation normalizes unnormalized vectors', () => {
  // Scaled values — must still produce same percentages (within float tolerance)
  const a = computeFusionRemediation({ Holz: 0.1, Feuer: 0.4, Erde: 0.2, Metall: 0.2, Wasser: 0.1 });
  const b = computeFusionRemediation({ Holz: 1, Feuer: 4, Erde: 2, Metall: 2, Wasser: 1 });
  for (const k of ['Holz','Feuer','Erde','Metall','Wasser']) {
    assert.ok(Math.abs(a.distribution[k] - b.distribution[k]) < 1e-9, `${k} distribution mismatch`);
  }
  assert.equal(a.dominant, b.dominant);
  assert.equal(a.deficient, b.deficient);
});

test('normalizeAzodiacResult attaches remediation field to fusion', () => {
  const vm = normalizeAzodiacResult({
    western: { bodies: {} },
    bazi: { pillars: {} },
    fusion: { wu_xing_vectors: { fusion: { holz: 0.1, feuer: 0.5, erde: 0.15, metall: 0.15, wasser: 0.1 } } },
    _meta: {},
  });
  assert.ok(vm.fusion.remediation);
  assert.equal(vm.fusion.remediation.dominant, 'Feuer');
});

test('normalizeAzodiacResult: body without longitude is skipped or has non-zero longitude', () => {
  // Upstream sometimes sends bodies without any longitude/lon/degree field.
  // The normalizer falls back to 0 when all three are absent; the test pins
  // that behaviour: Moon must either be absent entirely OR, if present, must
  // not silently carry longitude: 0 from a missing-field default.
  const vm = normalizeAzodiacResult({
    western: {
      bodies: {
        Sun:  { longitude: 45.0, zodiac_sign: 1, house: 2, is_retrograde: false },
        Moon: { zodiac_sign: 4, house: 4, is_retrograde: false }, // no longitude field
      },
    },
    bazi: null, fusion: null, _meta: {},
  });
  const moonEntry = vm.western.bodies.Moon;
  assert.ok(
    moonEntry === undefined || moonEntry.longitude !== 0,
    `Body with missing longitude must be absent or not at 0°; got: ${JSON.stringify(moonEntry)}`,
  );
});
