import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAzodiacResult } from '../server.js';

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
  assert.equal(vm._meta.view_model_version, '1');

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
