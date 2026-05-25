# Sprint K — Mobile + Tablet Responsive Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend Bazodiac's visual coverage to mobile (375×667) and tablet (768×1024) viewports. Every one of the 11 routes renders without horizontal-overflow, without cut-off hero-text, without overlapping cards. Desktop layout is pixel-stable.

**Architecture:** Three-viewport visual-regression sweep driven by env-flag `BU_VIEWPORT={desktop,tablet,mobile}`. Existing baseline PNGs migrate to `desktop/` subfolder; new `tablet/` + `mobile/` subfolders fill in. tokens.css gains breakpoint constants + media-query variants; main.css receives per-page responsive tweaks. No JS changes, no new components, no new runtime deps.

**Tech Stack:** Vanilla CSS @media queries on existing `--bz-*` tokens. browser-harness viewport-emulation via `Emulation.setDeviceMetricsOverride` CDP method. node --test for breakpoint-constant unit tests.

---

## Phase 0 — Pre-flight (this commit)

- Branch `feat/sprint-k-mobile-responsive` created off main `6fa9df4`.
- Agent-state stashed (`agent-state-pre-sprint-k`).
- Baseline confirmed 580 pass / 0 fail / 9 skip.
- This plan-doc + Phase-0 commit start the sprint.

## Phase 1 — Migrate existing baselines to `desktop/` subfolder

`test/_fixtures/visual-baseline/*.png` → `test/_fixtures/visual-baseline/desktop/*.png`. Use `git mv` so blame stays connected to original Sprint-H7 + Sprint-I capture commits.

Update `scripts/visual-regression.sh` to write into `${OUT_DIR}/${VIEWPORT:-desktop}/` instead of bare `${OUT_DIR}/`.

Commit: `chore(visual): migrate baseline PNGs to desktop/ subfolder`.

## Phase 2 — Multi-viewport sweep script + breakpoint test

`scripts/visual-regression.sh` accepts `BU_VIEWPORT` env-flag:
- `desktop` (default): no override, uses current Chrome viewport
- `tablet`: 768×1024
- `mobile`: 375×667

Implementation: emit a per-route CDP `Emulation.setDeviceMetricsOverride` call inside the browser-harness PY block before screenshot:

```python
if VIEWPORT == 'tablet':
    cdp("Emulation.setDeviceMetricsOverride", width=768, height=1024, deviceScaleFactor=2, mobile=True)
elif VIEWPORT == 'mobile':
    cdp("Emulation.setDeviceMetricsOverride", width=375, height=667, deviceScaleFactor=2, mobile=True)
else:
    cdp("Emulation.clearDeviceMetricsOverride")
```

New `test/breakpoints.test.js`:
- Imports breakpoint constants from `public/src/data/breakpoints.js` (new file)
- Asserts `MOBILE_MAX = 480`, `TABLET_MAX = 1024`, `DESKTOP_MIN = 1025`
- Asserts they form a non-overlapping ladder

Commit: `feat(visual): multi-viewport sweep + breakpoint constants`.

## Phase 3 — tokens.css @media breakpoints

Add to `public/src/styles/tokens.css`:

```css
/* Sprint K — Responsive breakpoints. Single source of truth for the
   media-query ladder. Pinned by test/breakpoints.test.js. */
:root {
  --bz-bp-mobile-max:  480px;
  --bz-bp-tablet-max:  1024px;
}

/* Mobile: tighter spacing, smaller hero, single-column grids. */
@media (max-width: 480px) {
  :root {
    --bz-space-hero:   1.5rem;
    --bz-space-stack:  0.75rem;
    --bz-font-hero:    1.5rem;
    --bz-font-body:    0.95rem;
  }
}

/* Tablet: middle ground. */
@media (min-width: 481px) and (max-width: 1024px) {
  :root {
    --bz-space-hero:   2rem;
    --bz-space-stack:  1rem;
    --bz-font-hero:    2rem;
  }
}
```

Goal: no main.css consumer needs to know the breakpoint values directly — they read from `--bz-*` tokens that auto-adjust.

Commit: `feat(tokens): mobile + tablet @media breakpoint variants`.

## Phase 4 — main.css per-page tweaks

Read main.css in chunks (file is 2376 LOC). Per-page touch:

| Page | Mobile fix | Why |
|---|---|---|
| Global nav | Wrap 10 nav-links to 2-3 rows or compact font | 10 tabs overflow 375px width |
| Overview | Wheel max-width 320px on mobile; Hero font scales via tokens | 480px Wheel SVG would overflow 375px viewport |
| Bazi | 2×2 pillar grid → 1×4 on mobile | 4-column would clip |
| Western | 4 core-cards grid → 2×2 on tablet → 1×4 on mobile | preserve readability |
| Wuxing | Pentagonal radar SVG: max-width 280px on mobile | same SVG-overflow concern |
| Fusion | Dominant/Unterrepräsentiert/Hebel trio → vertical stack on mobile | 3-col needs ~600px |
| Daily | Step-card padding tightens; STATE_* indicator-bar shortens | 6 steps × normal padding overflows |
| Synastry | Person-A / Person-B side-by-side → stacked on mobile | 2-col form needs ~700px |
| Houses | 12-house 3×4 grid → 2×6 on tablet → 1×12 on mobile | width thresholds |
| Method | Endpoint-catalog cards stack | already stacks ok, just spacing |
| Transit | Weekly-strip 7-day → horizontal scroll on mobile | 7-col needs scroll |
| Daten (/) | Form fields full-width on mobile | inputs need touch-target ≥ 44px |

Each tweak is one or two @media-query CSS blocks. No JS changes. Group commits by page if main.css edit chunk exceeds ~50 LOC.

Commit: `feat(responsive): per-page mobile/tablet layout tweaks`.

## Phase 5 — Capture 22 new PNGs + stability test

```bash
BU_VIEWPORT=tablet ./scripts/visual-regression.sh
BU_VIEWPORT=mobile ./scripts/visual-regression.sh
```

→ 11 tablet PNGs + 11 mobile PNGs in respective subfolders.

`test/visual-baseline-stability.test.js`:
- For each PNG in `test/_fixtures/visual-baseline/desktop/`, assert that the file exists and its size matches the pre-Sprint-K snapshot within ±5% (or hash-identical, whichever is achievable).
- The pre-K baseline-sizes are pinned in the test as constants captured at branch-creation time.

Commit: `test: capture tablet + mobile baselines; assert desktop unchanged`.

## Phase 6 — PR + safe-merge

PR title: `feat(sprint-k): mobile + tablet responsive coverage`. Body includes the per-page tweak table from Phase 4 with one-line rationale per row.

`/safe-merge` after green.

## Commit shape

1. `docs(sprint-k): plan + media-query target`
2. `chore(visual): migrate baseline PNGs to desktop/ subfolder`
3. `feat(visual): multi-viewport sweep + breakpoint constants`
4. `feat(tokens): mobile + tablet @media variants`
5. `feat(responsive): per-page mobile/tablet layout tweaks`
6. `test: capture tablet + mobile baselines; assert desktop unchanged`

Target 6 commits (within 4–8 goal-band).

## Risks + mitigations

- **R1: tokens-token-override-side-effects.** Adding `@media` blocks that override `--bz-*` tokens could ripple into desktop if media-query is mis-scoped. **Mitigation:** stability-test asserts every desktop PNG unchanged.
- **R2: browser-harness viewport-emulation persists across calls.** **Mitigation:** clear override before each desktop capture; explicit set before tablet/mobile.
- **R3: 22 new PNGs balloon git history.** **Mitigation:** PNGs are deterministic-render-output; one squash-merge collapses them.
- **R4: Per-page tweaks accumulate hidden coupling.** **Mitigation:** scope each @media rule to one selector + one viewport; no global resets.
