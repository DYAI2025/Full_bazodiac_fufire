// Sprint K — Responsive breakpoint constants.
//
// Single source of truth for the mobile/tablet/desktop ladder. These pixel
// values are mirrored as CSS custom properties in `public/src/styles/tokens.css`
// (--bz-bp-mobile-max + --bz-bp-tablet-max). Test/breakpoints.test.js pins
// both sides so the CSS @media queries cannot drift from these JS values.
//
// Convention:
//   - mobile  ≤ MOBILE_MAX
//   - tablet  MOBILE_MAX+1 .. TABLET_MAX
//   - desktop ≥ TABLET_MAX+1 (DESKTOP_MIN)
//
// The ladder is non-overlapping by design — a width belongs to exactly one tier.

export const MOBILE_MAX  = 480;
export const TABLET_MAX  = 1024;
export const DESKTOP_MIN = 1025;

export function classifyViewport(widthPx) {
  if (typeof widthPx !== 'number' || !Number.isFinite(widthPx) || widthPx <= 0) return null;
  if (widthPx <= MOBILE_MAX)  return 'mobile';
  if (widthPx <= TABLET_MAX)  return 'tablet';
  return 'desktop';
}
