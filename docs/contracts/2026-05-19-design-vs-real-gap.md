# Design-VM vs Real-API Gap Matrix

**Source design VM:** `/tmp/fufire-spec/src/data.js` `window.DEMO_PROFILE`
**Source real API:** snapshots in `test/_fixtures/upstream-snapshots/*.real.json`
**Birth data used for snapshots:** 1987-03-14 07:42 Europe/Berlin · 52.3744779 / 9.7385532 (Hannover)
**Captured at:** 2026-05-19T20:01:12Z · FUFIRE_BASE_URL=https://bafe-production.up.railway.app/

This document replaces every "ungeprüft" claim in the 2026-05-19-fufire-endpoint-full-binding plan with empirically observed API shapes. Every binding decision in the implementation must reference this matrix.

---

## 0. Cardinal Insight

**FuFire API is purely COMPUTATIONAL.** It returns: planet longitudes, signs (English), zodiac sign indices, retrograde flags, house cusps, aspect angles/orbs, BaZi stems/branches (Pinyin), elements (German), 5-element WuXing vectors, coherence_index, fusion.remediation summary, daily impulse text.

**Design VM mixes COMPUTATIONAL + NARRATIVE** (essence/role/ressource/schatten/handlung/meaning/short/...). Narrative is **not in the API** — it lives in `public/src/domain/meanings.js` (already shipped). Production pattern: API delivers facts → frontend joins with meanings.js → design-shape VM.

**Implication for plan:** Sprint D (server-side VM extension) is **NOT needed**. Replace with **frontend enrichment layer**: `public/src/domain/profileEnrichment.js` reads API profile + meanings.js → produces design-shape VM. Pages consume enriched VM.

---

## 1. Endpoint Reachability

| Endpoint                                  | HTTP | Bytes | Status                                                                  |
|-------------------------------------------|-----:|------:|-------------------------------------------------------------------------|
| `POST /api/azodiac/profile`               | 200  |  9699 | orchestrates 6 upstream calls in parallel, all 200                      |
| `POST /api/azodiac/daily`                 | 200  |  2755 | sequential bootstrap → daily, returns daily VM                          |
| `POST /api/fufire/calculate/bazi`         | 200  |  2896 | rich response: pillars + chinese + dates + transition + provenance + derivation_trace |
| `POST /api/fufire/calculate/western`      | 200  |  6231 | bodies + houses + aspects + angles + house_quality + provenance        |
| `POST /api/fufire/calculate/fusion`       | 200  |  6629 | wu_xing_vectors + harmony_index + calibration + elemental_comparison + contribution_ledger |
| `POST /api/fufire/calculate/wuxing`       | 200  |  3493 | wu_xing_vector + dominant_element + contribution_ledger                |
| `GET  /api/fufire/info/wuxing`            | 200  |   474 | **Fix `332ffc3` confirmed effective.** mapping + order + description    |
| `GET  /api/fufire/transit/now`            | 200  |   800 | computed_at + planets (10) + sector_intensity (12)                      |
| `GET  /api/fufire/transit/timeline`       | 200  |  5502 | days[] timeline                                                         |
| `POST /api/azodiac/synastry`              | 200  | 21578 | personA + personB profiles + synastry summary (combined_coherence, element_tension) |

All 10 endpoints reachable. No upstream gating remains.

---

## 2. Design-Field → Real-Source Matrix

### 2.1 `signature` section (design)

| Design field            | Real-API source                                                | Enrichment            |
|-------------------------|----------------------------------------------------------------|-----------------------|
| `signature.title`       | none                                                            | **frontend-derived** from sun-sign + day-master + dominant-element |
| `signature.line`        | none                                                            | **frontend-derived** narrative composition                          |
| `signature.coreLabel`   | `bazi.day_master.stem` + `meanings.STEM_MEANINGS[stem].label` | meanings.js join      |
| `signature.sunLabel`    | `western.bodies.Sun.sign` + `degree_in_sign`                  | format + German translate via `astro-mappings.js` |
| `signature.coherence`   | `Math.round(fusion.coherence_index * 100)`                     | direct (×100)         |
| `signature.coherenceBand` | derived from coherence value                                   | banding rule (0-40 disjunkt, 41-60 reibungsvoll, 61-80 resonant, 81-100 sehr resonant) |

### 2.2 `western.{sun,moon,asc,mc}` cores (design)

Real-API `western.bodies.Sun` (snapshot):
```
{ longitude: 353.15, sign: "Pisces", zodiac_sign: 11, house: null, retrograde: false, degree_in_sign: 23.15 }
```

| Design field   | Real-API source                                       | Enrichment                          |
|----------------|-------------------------------------------------------|-------------------------------------|
| `sun.sign`     | `western.bodies.Sun.sign` (English)                   | translate to German via `SIGN_DE`   |
| `sun.glyph`    | sign → glyph                                          | static map `SIGN_GLYPH`             |
| `sun.elem`     | sign → element                                        | `astro-mappings.js SIGN_ELEMENT`    |
| `sun.deg`      | `degree_in_sign`                                      | format `formatDegMinutes()` → "23°09'" |
| `sun.house`    | `bodies.Sun.house` is **null** in API                 | **GAP** — compute frontend-side from `houses` cusps + body longitude (Whole-Sign or Placidus reverse-lookup) |
| `sun.role`     | none                                                  | `meanings.WESTERN_SIGN_MEANINGS[sign].role` |
| `sun.short`    | none                                                  | meanings.js                         |
| `sun.ressource` | none                                                 | meanings.js                         |
| `sun.risiko`   | none                                                  | meanings.js                         |
| `sun.handlung` | none                                                  | meanings.js                         |

**Key gap:** `bodies[*].house: null` in both `/api/azodiac/profile` AND `/api/fufire/calculate/western`. Upstream does not assign bodies to houses. **Frontend MUST compute body→house.**

`western.angles` provides `{Ascendant, MC, Vertex}` as longitudes. `western.houses.{1..12}.longitude` gives house cusps. Whole-Sign: house = ((body.longitude - asc.longitude) / 30) floor + 1, then mod 12. Placidus: requires the house-cusp array — use binary search to find which cusp pair the longitude falls between.

### 2.3 `western.activations` (= aspects with narrative)

Real-API `western.aspects[i]`:
```
{ planet1: "Moon", planet2: "Neptune", type: "trine", angle: 119.58, orb: 0.42, exact_angle: 120 }
```

| Design field           | Real-API source                                          | Enrichment                             |
|------------------------|----------------------------------------------------------|----------------------------------------|
| `activations[i].name`  | `planet1 + type + planet2`                               | translate `type` (trine → Trigon), `planet1/2` (Moon → Mond) |
| `activations[i].desc`  | none                                                     | derived from aspect-key `{planet1,type,planet2}` → meanings table (NEW: `ASPECT_INTERPRETATIONS` registry in meanings.js) |

**Gap:** Aspect-narrative table does not exist yet. Either:
- Add per-aspect-pair narratives (`ASPECT_NARRATIVES` in meanings.js) — explodes combinatorically (10 planets × 5 aspect types = 50 entries) per pair-permutation, mitigate by symmetry
- Generate generic narrative from sign-element interaction (simpler; less specific)

### 2.4 `bazi.dayMaster` (design)

Real-API `bazi.day_master`:
```
{ stem: "Ren", branch: "Xu", element: "Wasser", hidden_stems: [] }
```

| Design field         | Real-API source                                | Enrichment                                          |
|----------------------|------------------------------------------------|-----------------------------------------------------|
| `dayMaster.stem`     | API `stem` Pinyin                              | char-mapping: Ren → 壬 via `STEM_PINYIN_TO_CHAR`    |
| `dayMaster.elem`     | API `element` ("Wasser")                       | direct                                              |
| `dayMaster.polarity` | derived from stem (Jia/Bing/Wu/Geng/Ren = Yang; Yi/Ding/Ji/Xin/Gui = Yin) | `STEM_POLARITY` map |
| `dayMaster.label`    | derived `${pinyin} ${element}` ("Ren Wasser")  | format                                              |
| `dayMaster.essence`  | none                                           | `meanings.STEM_MEANINGS[stem].essence`              |
| `dayMaster.archetype`| none                                           | `meanings.STEM_MEANINGS[stem].archetype`            |

### 2.5 `bazi.pillars.{year,month,day,hour}` (design)

Real-API `/api/azodiac/profile` `bazi.pillars.year`:
```
{ stem: "Ding", branch: "Mao", element: "Feuer", hidden_stems: [] }
```

Real-API `/api/fufire/calculate/bazi` `pillars.year`:
```
{ stamm: "Ding", zweig: "Mao", tier: "Hase", element: "Feuer" }
```

| Design field    | Real source                                        | Enrichment                                                                    |
|-----------------|---------------------------------------------------|-------------------------------------------------------------------------------|
| `stem`          | profile.bazi.pillars.year.stem                    | direct                                                                        |
| `stemLabel`     | derived `${stem} ${stemElem} (${polarity})`       | format                                                                        |
| `stemElem`      | API element (matches stem polarity rule)          | needs derivation from stem (not from pillar.element which is BRANCH element) |
| `branch`        | profile pillar.branch (Pinyin "Mao")              | char-mapping: Mao → 卯                                                        |
| `animal`        | **profile DROPS this**; standalone has `tier: "Hase"` | derive frontend from branch via `BRANCH_ANIMAL_DE` map                       |
| `animalLatin`   | branch Pinyin                                     | already in profile                                                            |
| `branchElem`    | profile pillar.element                            | direct (CAUTION: this is BRANCH element, not stem element)                    |
| `hidden`        | profile pillar.hidden_stems[] — **empty in API**  | **GAP** — derive frontend via `HIDDEN_STEMS` table in server.js (already exists) or move table to frontend meanings.js |
| `age`           | none                                              | static per role (year: "Bis 16", month: "17-32", day: "Lebenskern", hour: "Spätes Leben") |
| `meaning`       | none                                              | meanings.js — keyed by `pillarRole × stem × branch` (use generic by role + element if specific missing) |
| `ressource`     | none                                              | meanings.STEM_MEANINGS[stem].resource                                         |
| `schatten`      | none                                              | meanings.STEM_MEANINGS[stem].shadow                                           |
| `handlung`      | none                                              | meanings.STEM_MEANINGS[stem].practice                                         |

**Important:** `bazi.pillars.year.element` in API = **BRANCH element**, NOT stem element. Design `stemElem` requires derivation from stem name. Verify in server.js normalization — `HIDDEN_STEMS` table at top of server.js maps branch → hidden stems. Stem element rule: Jia/Yi=Holz, Bing/Ding=Feuer, Wu/Ji=Erde, Geng/Xin=Metall, Ren/Gui=Wasser.

### 2.6 `bazi.luckPillar` (design)

| Design field    | Real source       | Enrichment |
|-----------------|-------------------|------------|
| `luckPillar.*`  | **NOT in any current endpoint**                  | **DEFERRED** — display "Glückssäule wird in einer kommenden Version berechnet" or omit section |

**GAP CONFIRMED:** Luck Pillar absent from `/api/azodiac/profile` AND `/api/fufire/calculate/bazi` (verified — full bazi response captured, no `luck_pillar` field). Decision: defer or compute frontend-side from birth date + age (classical formula: 10-year periods starting from monthly stem ± 10 years based on stem polarity × gender).

### 2.7 `wuxing.distribution` (design)

Real-API `fusion.wu_xing_vectors.bazi_pillars`:
```
{ Holz: 0.7223, Feuer: 0.2683, Erde: 0.4127, Metall: 0.1032, Wasser: 0.4747 }
```

Real-API `fusion.remediation.distribution` (normalized 0..1 summing to 1):
```
{ Holz: 0.3087, Feuer: 0.2215, Erde: 0.1342, Metall: 0.0671, Wasser: 0.2685 }
```

| Design field                   | Real-API source                              | Enrichment                                  |
|--------------------------------|----------------------------------------------|---------------------------------------------|
| `distribution[i].key`          | element-name → lowercase ("Holz" → "wood")  | translation map                             |
| `distribution[i].glyph`        | none                                         | static `ELEMENT_GLYPH` (木/火/土/金/水)      |
| `distribution[i].label`        | element-name (German already)                | direct                                      |
| `distribution[i].intensity`    | `fusion.remediation.distribution[el] * 100` round to int | format                                |
| `distribution[i].role`         | derived from intensity rank + position       | "dominant" if max, "unterrepräsentiert" if < 0.10 (verify with `fusion.remediation.deficient`), "strukturierend" if Metall mid, "erlebbar" if Feuer mid, "flüssig" if Wasser mid |
| `distribution[i].token`        | none                                         | static `--bz-${key}` token                  |
| `distribution[i].desc`         | none                                         | meanings.WUXING_MEANINGS[el].meaning        |

**Bonus signal:** `fusion.remediation.deficient: "Metall"` from API directly identifies under-represented element. Use this instead of frontend threshold logic.

### 2.8 `wuxing.todayLever` + `wuxing.plan` (design)

| Design field        | Real source                              | Enrichment                                                |
|---------------------|------------------------------------------|-----------------------------------------------------------|
| `todayLever`        | `daily.eastern.daily_pillar` + daily-element  | derived from `daily.eastern.daily_pillar.stem` element + dominant pillar element |
| `plan.heute`        | none                                     | `meanings.WUXING_MEANINGS[dominant].balance.today`        |
| `plan.woche`        | none                                     | `meanings.WUXING_MEANINGS[dominant].balance.week`         |
| `plan.monat`        | none                                     | `meanings.WUXING_MEANINGS[dominant].balance.habit`        |

### 2.9 `wuxing.properties.{wood..water}` (design)

| Design field            | Real source     | Enrichment                                          |
|-------------------------|-----------------|-----------------------------------------------------|
| `properties.wood.wesen` | none            | `meanings.WUXING_MEANINGS.Holz.meaning`             |
| `.staerke`              | none            | `meanings.WUXING_MEANINGS.Holz.strong`              |
| `.uebermass`            | none            | `meanings.WUXING_MEANINGS.Holz.over`                |
| `.mangel`               | none            | `meanings.WUXING_MEANINGS.Holz.weak`                |
| `.ausgleich`            | none            | derive from element-cycle (Holz needs Metall + Erde) — already implicit in `meanings.js` but may need explicit `.ausgleich` field |

### 2.10 `houses[1..12]` (design)

Real-API `western.houses`:
```
{ 1: {longitude, sign}, 2: {longitude, sign}, ..., 12: {longitude, sign} }
```

Real-API `western.bodies[*].house: null` (uncomputed).

| Design field          | Real source                              | Enrichment                                                                    |
|-----------------------|------------------------------------------|-------------------------------------------------------------------------------|
| `houses[i].n`         | i (1..12)                                | direct                                                                        |
| `houses[i].sign`      | `western.houses[i].sign` (English)       | translate to German                                                           |
| `houses[i].glyph`     | sign → glyph                              | static                                                                        |
| `houses[i].elem`      | sign → element                            | astro-mappings.js                                                             |
| `houses[i].active[]`  | **uncomputed** — derive frontend from `western.bodies[*].longitude` ∈ house cusp range | new frontend fn `computeBodyHouses(bodies, houseCusps)` |
| `houses[i].bedeutung` | none                                      | `meanings.HOUSE_MEANINGS[i].context` (already exists)                         |
| `houses[i].praxis`    | none                                      | meanings.js — new `.praxis` slot or reuse `.context`                          |

### 2.11 `fusion.evidence.{west,bazi,wuxing}` + `fusion.synthesis` (design)

Real-API `fusion`:
```
{ wu_xing_vectors, coherence_index, fusion_interpretation, aspects[], house_overlay, dominant_patterns[], synthesis_notes, remediation }
```

| Design field                   | Real source                                  | Enrichment                                                                     |
|--------------------------------|----------------------------------------------|--------------------------------------------------------------------------------|
| `fusion.index`                 | `coherence_index * 100`                      | direct                                                                         |
| `fusion.band`                  | derived from index                            | banding rule (see 2.1)                                                         |
| `fusion.bandRange`             | derived                                       | "61-80" etc                                                                    |
| `fusion.summary`               | `fusion_interpretation` (truncated)          | direct or first sentence                                                       |
| `fusion.evidence.west[3]`      | top-3 Western bodies                          | derive from bodies — Sun, Moon, Asc default; or use aspects with largest weight |
| `fusion.evidence.bazi[3]`      | day master pillar + dominant + supporting    | derive from pillars + dominant element                                         |
| `fusion.evidence.wuxing[3]`    | dominant + deficient + structuring element  | derive from `remediation.distribution` + `remediation.deficient`                |
| `fusion.synthesis.befund`      | none                                          | composite from `fusion.dominant_patterns[]` (currently empty in API) + meanings.js |
| `fusion.synthesis.staerke`     | `fusion.remediation.actions[i].rationale`    | partial source — narrative compose                                             |
| `fusion.synthesis.risiko`      | `fusion.remediation.summary`                  | partial source                                                                 |
| `fusion.synthesis.handlung`    | `fusion.remediation.actions[i].activities[]` | direct list                                                                    |

**KEY FINDING:** `fusion.remediation` is a strong source for synthesis content. The orchestrator already attaches it. Frontend can pull `.actions[].rationale` + `.actions[].activities[]` + `.summary` to compose synthesis.

### 2.12 `daily.*` (design)

Real-API `/api/azodiac/daily`:
```
{
  date: "2026-05-19",
  western: { summary, themes[], opportunity, caution, evidence{transit_sectors, natal_focus, weekday}, jieqi_note, weekday_note },
  eastern: { summary, themes[], opportunity, caution, evidence{day_master, daily_pillar, relation_to_day_master, jieqi}, jieqi_note, weekday_note },
  fusion:  { summary, synthesis, action, pushworthy, push_text, jieqi_note, weekday_note },
  _meta:   { bootstrap_profile{sun_sign, moon_sign, ascendant_sign, day_master, harmony_index}, computed_at }
}
```

| Design field   | Real-API source                                      | Notes                                              |
|----------------|------------------------------------------------------|----------------------------------------------------|
| `daily.date`   | `daily.date`                                         | format DE date                                     |
| `daily.focus`  | `daily.fusion.summary`                               | direct                                             |
| `daily.west`   | `{ line: daily.western.summary, time: ?}`            | `time` slot is design-only; API has no time window |
| `daily.bazi`   | `{ line: daily.eastern.summary, stem: daily.eastern.evidence.daily_pillar.stem, branch: daily.eastern.evidence.daily_pillar.branch }` | direct        |
| `daily.fusion` | `daily.fusion.synthesis`                             | direct                                             |
| `daily.experiment` | `daily.fusion.action`                            | direct                                             |
| `daily.morgen` | none                                                  | derive from transit-timeline next day              |

### 2.13 `relationship.factors` (design) + Synastry (real)

Real-API `/api/azodiac/synastry`:
```
{
  personA: <full profile>,
  personB: <full profile>,
  synastry: { combined_coherence: 0.79, element_tension: { dominant_a, dominant_b, cycle_relation, tension_score } },
  _meta: { upstream_status, computed_at }
}
```

| Design field            | Real-API source                                | Enrichment                                                        |
|-------------------------|------------------------------------------------|-------------------------------------------------------------------|
| `factors[i].f`          | derived from personA bodies                    | frontend                                                          |
| `factors[i].w`          | none                                            | meanings.js                                                       |
| `factors[i].risk`       | none                                            | meanings.js                                                       |
| `combined_coherence`    | `synastry.combined_coherence` ×100             | direct                                                            |
| `element_tension`       | `synastry.element_tension.*`                   | direct                                                            |
| `primary_connection`    | derived from element_tension + cycle_relation  | already in `relationshipResonance.js` (frontend, working)         |
| `primary_tension`       | same                                            | already in `relationshipResonance.js`                             |
| `24h_experiment`        | derived from contact-element                   | already in `relationshipResonance.js`                             |

**Note:** API gives MINIMAL synastry data (just combined_coherence + element_tension). All narrative comes from existing `relationshipResonance.js` + `relationshipCopy.js` modules. **No new endpoint or VM extension needed for RelationshipPage.**

---

## 3. Confirmed Konfabulation-Audit Results

Mapping back to the audit table in the ultrathink-craftsmanship response:

| # | Claim                                                                          | Real status                                                                                       |
|---|--------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| 1 | `calculate/western` standalone gives bodies + houses + aspects                 | **BESTÄTIGT.** 6231 bytes. Plus `house_quality`, `quality_flags`, `provenance.parameter_set`     |
| 2 | `/api/fufire/info/wuxing` doesn't resolve                                       | **WAR korrekt — jetzt durch `332ffc3` gefixt.** Endpoint resolved 200, returns mapping/order/description |
| 3 | Luck Pillar in some endpoint                                                   | **WIDERLEGT.** Nicht in `/api/fufire/calculate/bazi` enthalten. Frontend muss berechnen oder Feature deferren |
| 4 | `view_model_version: 'viewmodel.v2.4'`                                          | Real: `view_model_version: '2'`. Design demo uses `apiVersion: 'viewmodel.v2.4'` — separate concepts. No version-bump needed in `normalizeAzodiacResult` |
| 5 | `experience/bootstrap` gibt soulprint sector intensities                       | **Indirekt belegt:** `daily._meta.bootstrap_profile` shows fields `{sun_sign, moon_sign, ascendant_sign, day_master, harmony_index}`. No `sector_intensities` array — sector data is in `transit/now` response |
| 6 | `signature.title` deterministisch ableitbar (poetisch)                          | **WIDERLEGT** wie erwartet. Design title "Weite mit Präzisionskern" hand-crafted. Frontend derivation will produce more functional titles (e.g. "Pisces-Hingabe trifft Ren-Wasser-Klarheit"). |
| 7 | Sprint G HoroskopChart-Port = 4 Tage                                            | Unchanged — chart implementation is independent of API shape                                      |
| 8 | Test-Baseline 376                                                               | Now 378 after compat-proxy fix commit `332ffc3`                                                   |
| 9 | client.js exports 9 functions                                                  | Confirmed                                                                                          |
| 10| `/tmp/fufire-spec/src/data.js` contains design VM shape                        | Confirmed                                                                                          |

---

## 4. Revised Sprint Plan (replaces §1 of 2026-05-19-fufire-endpoint-full-binding.md)

| Original Sprint | New decision           | Rationale                                                                                            |
|-----------------|------------------------|------------------------------------------------------------------------------------------------------|
| **A** Audit + ViewModel Contract | **DELIVERED by this doc** | Real snapshots replace contract test fixtures; no separate audit sprint needed                       |
| **B** Client.js +5 functions    | **REDUCED to +1 (`getWuxingInfo`)** | calculateWestern/Bazi/Wuxing reachable via existing `/api/fufire/<path>` compat proxy. Only `getWuxingInfo` clearly needed for MethodPage reference table. Other functions can be added on-demand when MethodPage gains refresh buttons |
| **C** Server allowlist verify   | **DONE** by `332ffc3` (compat-proxy fix) | path-vs-upstreamPath bug fixed + tested                                                              |
| **D** ViewModel server-side extension | **DROPPED — replaced by frontend enrichment** | Insight 0: API delivers facts, frontend joins meanings.js. Create `public/src/domain/profileEnrichment.js` instead of touching server.js normalization |
| **E** 5 new pages               | **UNCHANGED** but now bind to **enriched VM**, not raw API | BaziPage, WesternPage, WuxingPage, HousesPage, MethodPage                                            |
| **F** Router + nav              | **UNCHANGED**          |                                                                                                       |
| **G** HoroskopChart             | **UNCHANGED**          |                                                                                                       |

**New Sprint D′ — Frontend enrichment layer (2 days):**
- `public/src/domain/profileEnrichment.js` — `enrichProfile(rawApiProfile, meaningsRegistries)` → design-shape VM.
- `public/src/domain/baziPillarEnrichment.js` — `enrichPillar(rawPillar, role)` → `{stem, stemLabel, stemElem, branch, animal, hidden[], age, meaning, ressource, schatten, handlung}`.
- `public/src/domain/westernBodyEnrichment.js` — `enrichBody(rawBody, houseCusps)` → `{sign, glyph, elem, deg, house, role, short, ressource, risiko, handlung}` plus body-house mapping.
- `public/src/domain/aspectEnrichment.js` — `enrichAspect(rawAspect)` → German names + narrative.
- `public/src/domain/houseEnrichment.js` — `enrichHouses(rawHouses, rawBodies)` → 12 houses each with active bodies + bedeutung + praxis.
- `public/src/domain/signatureDerivation.js` — `deriveSignature(enrichedProfile)` → `{title, line, coreLabel, sunLabel, coherence, coherenceBand}`.
- `public/src/domain/fusionSynthesis.js` — `composeFusion(enrichedProfile, rawFusion)` → `{index, band, bandRange, summary, evidence, synthesis}` using `remediation.actions` as source.

Each module: pure function + unit tests against `test/_fixtures/upstream-snapshots/*.real.json` fixtures.

---

## 5. Sprint E Bindings (revised — bind to enriched VM)

| Page          | Inputs needed (enriched)                                          | Existing components reusable                                                  |
|---------------|-------------------------------------------------------------------|-------------------------------------------------------------------------------|
| **BaziPage**  | `enriched.bazi.{dayMaster, pillars, luckPillar?}`                | `ExplainableCard`, `MeaningDrawer`, `PillarRoleLabels`                        |
| **WesternPage** | `enriched.western.{sun, moon, asc, mc, ...planets, activations[]}` | `ExplainableCard`, `SourceBadge`, future `HoroskopChart`                      |
| **WuxingPage**| `enriched.wuxing.{distribution[], todayLever, plan, properties}` | `WuXingEducationGrid` (already exists, P4) — adapt for 5-card grid           |
| **HousesPage**| `enriched.houses[1..12]`                                          | new `HouseRow` component                                                       |
| **MethodPage**| `getConfig()`, `getHealth()`, `getWuxingInfo()`, raw profile JSON | `SourceBadge`, new `EndpointRow`                                              |

---

## 6. Deferred Items (from real-API verification)

1. **Luck Pillar** — not in current API. Three options:
   - (a) Defer entirely — show "Glückssäule folgt" placeholder
   - (b) Compute frontend-side from classical formula (10-year periods from monthly stem ± gender)
   - (c) Request upstream extension
   **Recommend (a)** for MVP, (b) for Phase 2.

2. **Aspect narratives** — combinatoric (10 planets × 5 types × ordering). MVP: generic narrative from sign-element interaction; Phase 2: per-pair narrative library.

3. **Body→House mapping** — frontend computation needed. Use Whole-Sign initially (simple); Placidus inverse-lookup later.

4. **Soulprint sector intensities** — `experience/bootstrap` is invoked but its raw output not exposed via `/api/azodiac/daily` envelope (only `bootstrap_profile` summary). For MethodPage to show sectors, add separate client wrapper around `/api/fufire/experience/bootstrap`.

---

## 7. Next Steps

1. Commit this gap-matrix doc.
2. Annotate `docs/plans/2026-05-19-fufire-endpoint-full-binding.md` with link to this doc + revisions in §4.
3. Begin **Sprint D′** (frontend enrichment layer) as vertical-slice prerequisite.
4. Begin **vertical slice: BaziPage** end-to-end using enriched VM + real snapshots.

**No upstream changes required. No new runtime deps. No server.js normalization changes. All work additive on frontend.**

---

## 8. Authoritative-Field Resolution Order

The FuFire API returns several redundant or near-redundant fields for the same concept. Pages and enrichment modules MUST use the canonical field; secondary fields are diagnostic only. This table is the source-of-truth when choosing between them.

| Concept | Canonical (use this) | Secondary (do NOT use as primary) | Why |
|---|---|---|---|
| WuXing element distribution | `fusion.remediation.distribution` (normalized, sum=1, server-side combines western + bazi contributions) | `fusion.wu_xing_vectors.bazi_pillars` (un-normalized, BaZi-only) or `fusion.wu_xing_vectors.western_planets` | remediation is the post-processed, balanced view. Raw vectors are useful for transparency on MethodPage only. |
| Dominant element flag | `fusion.remediation.dominant` (string, server-computed) | Frontend-derived `classifyElementRole(el, dist) === 'dominant'` | Server already labels it. Frontend may use threshold logic for the OTHER 4 elements but must accept server's `dominant` for the top one. |
| Deficient element flag | `fusion.remediation.deficient` (string, server-computed) | Frontend-derived `intensity < 0.12` threshold | Same — server flag is authoritative when present. Threshold is fallback. |
| Fusion narrative (long) | `fusion.remediation.summary` (curated text, mentions element + percentage + path) | `fusion.fusion_interpretation` (terse band label like "Starke Resonanz...") | `fusion_interpretation` is a 1-sentence band tag. `remediation.summary` is the page-ready narrative. |
| BaZi pillar field names | `stem` / `branch` (Pinyin, orchestrator endpoint `/api/azodiac/profile`) | `stamm` / `zweig` (German, standalone `/api/fufire/calculate/bazi`) | Orchestrator-shape is canonical for page rendering. Enrichment modules MUST accept both (verified in baziPillarEnrichment). |
| Retrograde flag | `retrograde: bool` (orchestrator endpoint) | `is_retrograde: bool` (standalone `/calculate/western`) | Accept both per westernBodyEnrichment review fix I-2. Orchestrator field wins when both present. |
| Animal name | derived frontend from `branch` Pinyin via BRANCH_MEANINGS[branch].animal | `tier` (standalone `/calculate/bazi` only — German animal name) | Orchestrator response drops `tier`. Derive from registry to avoid endpoint coupling. |
| Hidden stems | API-supplied `hidden_stems[]` IF non-empty; else derive via `getHiddenStems(branch)` from shared module | n/a — API often returns empty `[]` | Server orchestrator does NOT derive these for Pinyin branches (latent bug fixed in commit `5d13af8`). Frontend derivation is now load-bearing. |
| Element of a pillar | `pillar.element` (STEM element, e.g. Ding pillar → Feuer) | n/a | Pillar.element is ALWAYS stem element, never branch element. Branch element must be derived separately via BRANCH_MEANINGS. Confirmed against fixtures. |
| Ascendant | `western.ascendant` (string, EN sign) | `western.angles.Ascendant` (raw longitude number) | String form is page-ready. Longitude needed for body-to-house computation in westernBodyEnrichment.computeBodyHouse + for MC sign derivation via signFromLongitude. |
| House cusps | `western.houses[i].longitude` + `western.houses[i].sign` | NEVER `western.houses[i].cusp` (this field DOES NOT EXIST in real API — historical artifact in synthetic fixture, now corrected) | Synthetic-profile.js audit (2026-05-20) caught this drift before it broke a real test. |
| Coherence value | `fusion.coherence_index` (0..1 float) | `fusion.harmony_index` (when present from standalone `/calculate/fusion` — same value under different name) | Orchestrator returns `coherence_index`. Standalone returns `harmony_index.harmony_index` (nested!). Frontend reads orchestrator name; if you ever consume the standalone endpoint, normalize at that boundary. |

**Rule when a new redundant pair surfaces:** add a row here BEFORE writing code that picks one. Picking blind = +1.5R drift cost per pages risk-manager assessment.

---

## 9. Lessons after 3 Sprint-E Pages (BaZi / Western / WuXing)

Captured 2026-05-20 after WuxingPage commit `6a49685`. Stop-loss + take-profit triggers set per risk-manager evaluation.

### Observations + verdicts

| # | Observation | Verdict | Trigger / Action |
|---|---|---|---|
| 1 | Capture-DOM stub covers ~95% of real DOM. Each page surfaces one missing method (so far: `style.setProperty` in WuxingPage). | DEFER | **Stop-loss:** at 4th occurrence (next page that hits a stub gap), extend the stub with the missing surface instead of working around in page code. |
| 2 | Synthetic-profile.js shape drifted from real API (`western.ascendant` object vs string, `houses[i].cusp` vs `longitude`, etc). | INTERVENED 2026-05-20 | This Lessons section + §8 above. Synthetic-profile rewritten field-by-field against `profile.real.json`. |
| 3 | API redundant fields (wu_xing_vectors vs remediation, retrograde vs is_retrograde) need an authoritative-field doc. | INTERVENED 2026-05-20 | §8 above. |
| 4 | `ExplainableCard` domain enum (`bazi`/`west`/`fusion`/`house`) already covers all Sprint E pages. | NONE | — |
| 5 | Page-Layout pattern emerging: Page-Head + sections (eyebrow + title + grid/list) + page-actions. | DEFER | **Take-profit:** at 5th page (after HousesPage + MethodPage), extract `PageLayout` component if pattern still holds. |
| 6 | Aspect salience heuristic (luminary-first + orb-tightness) works for all 3 personas. | NONE | Reuse in Sprint G fusionSynthesis instead of re-implementing scoring. |
| 7 | 3 personas (Lina/Persona2/Persona3) cover Yang/Yin DMs + extreme distributions. | DEFER | Persona4 only on-demand via `scripts/capture-fixtures.sh` if a future module hits a coverage gap. |
| 8 | `UnavailableCard` is the established pattern for deferred API data (Luck Pillar, missing sections). | NONE | Continue. |
| 9 | server.js has not changed since `332ffc3` (Compat-Proxy fix). All Sprint D′/E work is pure frontend. | NONE (Virtue) | Confirms Camp B (frontend enrichment) decision was correct. Keep server untouched unless orchestration change is unavoidable. |
| 10 | Commit size varies: 2 files (Compat-Proxy fix) to 7 files (Wuxing module + page bundle). | NONE | Logical cohesion > LOC cap. |
| 11 | `aspectEnrichment.js` only consumed by WesternPage so far. Underutilized until Sprint G `fusionSynthesis`. | TRACK | Sprint G plan MUST explicitly require reuse — no re-implementation of aspect scoring. |

### Cross-cutting takeaway

**Frontend enrichment layer scales linearly** with page count. Each new page = ~1 enrichment module (if missing) + ~1 page module + ~2 test files. No combinatoric explosion. Architecture vindicated.

**Biggest discovered risk** was concentration on FIXTURE TRUTH (Obs 2 + 3, correlation 0.7 per risk-manager). Bundle-intervene was the cheapest hedge — fixed both in one commit instead of patching each at the next surface.

**Pattern that will eventually need extraction** is the page layout (Obs 5). Not yet — rule of three says wait until pattern is proven at 5 pages.

