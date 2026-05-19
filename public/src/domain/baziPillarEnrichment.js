// public/src/domain/baziPillarEnrichment.js
//
// Pure enrichment layer for FuFire BaZi pillars. Joins raw API facts
// (`bazi.pillars.{year,month,day,hour}` + `bazi.day_master`) with the
// existing meanings.js / hidden-stems registries to produce the
// design-shape per-pillar VM the upcoming BaziPage will render.
//
// The API gives Pinyin stem + Pinyin branch + element (= stem element)
// + (usually empty) hidden_stems array. We resolve:
//   - stemChar via STEM_MEANINGS[stem].stem (CJK character)
//   - stemElement + polarity via STEM_MEANINGS
//   - branchChar via BRANCH_MEANINGS[branch].branch (with fallback to
//     BRANCH_PINYIN_TO_CHAR in case the branch isn't in BRANCH_MEANINGS)
//   - animal + branchElement via BRANCH_MEANINGS
//   - hiddenStems via getHiddenStems() from the shared module
//     (only when API-supplied array is empty/missing)
//   - role label + description via PILLAR_ROLES
//   - ressource/schatten/handlung from STEM_MEANINGS (narrative slots)
//
// Accepts both upstream field-name shapes:
//   - /api/azodiac/profile      → { stem, branch, element, hidden_stems }
//   - /api/fufire/calculate/bazi → { stamm, zweig, tier, element }
// Mirrors the dual-shape support that server.js normalizePillar already
// applies on the orchestrator side.

import { STEM_MEANINGS, BRANCH_MEANINGS, PILLAR_ROLES } from './meanings.js';
import { getHiddenStems, BRANCH_PINYIN_TO_CHAR } from '../data/hidden-stems.js';

// ── enrichPillar ────────────────────────────────────────────────────────────
// Pure function — joins one raw pillar record with the registries above.
// Returns null for null/undefined input. Unknown stem/branch yields null
// narrative slots (no fabricated defaults).
export function enrichPillar(rawPillar, role) {
  if (!rawPillar) return null;

  const stemPinyin   = rawPillar.stem   ?? rawPillar.stamm ?? null;
  const branchPinyin = rawPillar.branch ?? rawPillar.zweig ?? null;

  const stemInfo   = stemPinyin   ? (STEM_MEANINGS[stemPinyin]   || null) : null;
  const branchInfo = branchPinyin ? (BRANCH_MEANINGS[branchPinyin] || null) : null;

  const stemElement   = stemInfo?.element   ?? rawPillar.element ?? null;
  const branchElement = branchInfo?.element ?? null;
  const polarity      = stemInfo?.polarity  ?? null;

  // Hidden stems: API-supplied non-empty array wins; otherwise derive via
  // shared module. Empty derivation array is fine (caller decides display).
  const apiHidden = Array.isArray(rawPillar.hidden_stems) ? rawPillar.hidden_stems : null;
  const hiddenStems = (apiHidden && apiHidden.length > 0)
    ? apiHidden
    : (branchPinyin ? getHiddenStems(branchPinyin) : []);

  const roleInfo = role ? (PILLAR_ROLES[role] || null) : null;

  return {
    role,
    roleLabel:       roleInfo?.label ?? null,
    roleDescription: roleInfo?.role  ?? null,

    stem:        stemPinyin,
    stemChar:    stemInfo?.stem ?? null,
    stemElement,
    polarity,

    branch:        branchPinyin,
    branchChar:    branchInfo?.branch ?? (branchPinyin ? (BRANCH_PINYIN_TO_CHAR[branchPinyin] || null) : null),
    branchElement,
    animal:        branchInfo?.animal ?? null,

    hiddenStems,

    // Narrative slots from stem; null when stem unknown so consumers
    // hide the section rather than render misleading defaults.
    ressource: stemInfo?.resource ?? null,
    schatten:  stemInfo?.shadow   ?? null,
    handlung:  stemInfo?.practice ?? null,
  };
}

// ── enrichBaziPillars ───────────────────────────────────────────────────────
// Composite VM: { year, month, day, hour, dayMaster }. dayMaster falls back
// to the day pillar when `bazi.day_master` is missing — defensive for
// older orchestrator responses that omit the standalone day_master field.
export function enrichBaziPillars(rawBazi) {
  if (!rawBazi || typeof rawBazi !== 'object') return null;

  const pillars = rawBazi.pillars || {};
  const year  = enrichPillar(pillars.year,  'year');
  const month = enrichPillar(pillars.month, 'month');
  const day   = enrichPillar(pillars.day,   'day');
  const hour  = enrichPillar(pillars.hour,  'hour');

  // day_master has the same shape as a pillar; if absent, mirror day pillar.
  const dayMaster = enrichPillar(rawBazi.day_master ?? pillars.day ?? null, 'day');

  return { year, month, day, hour, dayMaster };
}
