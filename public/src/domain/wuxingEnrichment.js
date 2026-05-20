// public/src/domain/wuxingEnrichment.js
//
// Fourth Sprint D′ enrichment module. Maps FuFire fusion.remediation +
// fusion.wu_xing_vectors to the design-shape WuXing VM:
//   {
//     distribution: [{ key, label, glyph, intensity, role, desc, token }] × 5,
//     dominant:   <distribution entry>,
//     deficient:  <distribution entry>,
//     plan:       { heute, woche, monat },   // from dominant element's balance
//     properties: { Holz, Feuer, Erde, Metall, Wasser } with
//                   { wesen, staerke, uebermass, mangel, ausgleich },
//     todayLever: <short string derived from dominant.balance.today>
//   }
//
// Why frontend (not server-side):
// - All narrative content (wesen/staerke/uebermass/mangel/ausgleich/balance)
//   lives in meanings.js WUXING_MEANINGS. Server-side enrichment would
//   require shipping meanings to the server.
// - Server already returns ready-made remediation summary text — we layer
//   the 5-element grid + plan on top.

import { WUXING_MEANINGS } from './meanings.js';

const ELEMENT_ORDER = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];

const ELEMENT_META = {
  Holz:   { key: 'wood',  glyph: '木', token: '--bz-wood',  cycleAusgleich: 'Metall (klares Nein) + Erde (Grund)' },
  Feuer:  { key: 'fire',  glyph: '火', token: '--bz-fire',  cycleAusgleich: 'Holz (Nahrung) + Wasser (Kühlung)' },
  Erde:   { key: 'earth', glyph: '土', token: '--bz-earth', cycleAusgleich: 'Feuer (Belebung) + Holz (Bewegung)' },
  Metall: { key: 'metal', glyph: '金', token: '--bz-metal', cycleAusgleich: 'Erde (Quelle) + Wasser (Geschmeidigkeit)' },
  Wasser: { key: 'water', glyph: '水', token: '--bz-water', cycleAusgleich: 'Metall (Quelle) + Holz (Auslauf)' },
};

const DEFICIENT_THRESHOLD = 0.12;

// Element-specific roles for the "middle" elements (not dominant, not deficient).
const MIDDLE_ROLE = {
  Holz:   'wachsend',
  Feuer:  'erlebbar',
  Erde:   'haltend',
  Metall: 'strukturierend',
  Wasser: 'flüssig',
};

// ── classifyElementRole ────────────────────────────────────────────────────
// Given the element name (DE) and a distribution dict { Holz: 0.34, ... },
// return one of 'dominant' | 'unterrepräsentiert' | element-specific role.
export function classifyElementRole(element, distribution) {
  if (!distribution || typeof distribution !== 'object') return null;
  const entries = Object.entries(distribution);
  if (entries.length === 0) return null;

  const value = Number(distribution[element]) || 0;
  const max   = Math.max(...entries.map(([_, v]) => Number(v) || 0));

  if (value === max && max > 0) return 'dominant';
  if (value < DEFICIENT_THRESHOLD) return 'unterrepräsentiert';
  return MIDDLE_ROLE[element] || 'mittel';
}

// ── enrichWuxingDistribution ──────────────────────────────────────────────
// Returns an ordered 5-entry array. Source preference:
//   1. fusion.remediation.distribution (normalized 0..1 sum=1)
//   2. fusion.wu_xing_vectors.bazi_pillars (un-normalized)
// Falls back to [] if neither present.
export function enrichWuxingDistribution(profile) {
  const fusion = profile?.fusion;
  if (!fusion || typeof fusion !== 'object') return [];

  const remed = fusion.remediation?.distribution;
  const vec   = fusion.wu_xing_vectors?.bazi_pillars;
  const raw   = (remed && typeof remed === 'object') ? remed : vec;
  if (!raw || typeof raw !== 'object') return [];

  // Normalize to 0..1 sum=1 if we're using the un-normalized vector path.
  let total = 0;
  for (const el of ELEMENT_ORDER) total += Number(raw[el]) || 0;
  const useNormalize = (remed === null || remed === undefined);
  const normalized = {};
  for (const el of ELEMENT_ORDER) {
    const v = Number(raw[el]) || 0;
    normalized[el] = useNormalize && total > 0 ? v / total : v;
  }

  return ELEMENT_ORDER.map((el) => {
    const meta    = ELEMENT_META[el];
    const meaning = WUXING_MEANINGS[el] || {};
    const role    = classifyElementRole(el, normalized);
    return {
      key:       meta.key,
      label:     el,
      glyph:     meta.glyph,
      intensity: Math.round((normalized[el] || 0) * 100),
      role,
      desc:      meaning.meaning || '',
      token:     meta.token,
    };
  });
}

// ── enrichWuxing (composite) ──────────────────────────────────────────────
export function enrichWuxing(profile) {
  if (!profile) return null;
  const distribution = enrichWuxingDistribution(profile);
  if (distribution.length === 0) {
    return { distribution: [], dominant: null, deficient: null, plan: null, properties: null, todayLever: null };
  }

  const dominant  = distribution.find((e) => e.role === 'dominant') || null;
  const deficient = distribution.find((e) => e.role === 'unterrepräsentiert') || null;

  const dominantMeaning = (dominant && WUXING_MEANINGS[dominant.label]) || null;

  // 3-step plan derives from dominant element's balance horizons.
  const plan = dominantMeaning?.balance
    ? {
        heute: dominantMeaning.balance.today,
        woche: dominantMeaning.balance.week,
        monat: dominantMeaning.balance.habit,
      }
    : null;

  // 5-element property map: meanings.js (meaning/strong/weak/over) + cycle ausgleich.
  const properties = {};
  for (const el of ELEMENT_ORDER) {
    const m = WUXING_MEANINGS[el] || {};
    properties[el] = {
      wesen:     m.meaning || '',
      staerke:   m.strong  || '',
      uebermass: m.over    || '',
      mangel:    m.weak    || '',
      ausgleich: ELEMENT_META[el].cycleAusgleich,
    };
  }

  const todayLever = dominantMeaning?.balance?.today || null;

  return { distribution, dominant, deficient, plan, properties, todayLever };
}
