#!/usr/bin/env bash
# Sprint H7 / I / K — visual-regression sweep across all design-mockup routes.
#
# Drives browser-harness (CDP-attached Chrome) over every primary route,
# captures a viewport screenshot, saves to
# test/_fixtures/visual-baseline/<viewport>/. Sprint K added multi-viewport
# support; current viewport is selected via BU_VIEWPORT env-flag.
#
# Prerequisites:
# - Server running on http://127.0.0.1:3000 (npm start with .env)
# - browser-harness on $PATH (per CLAUDE.md global config)
# - A valid sessionStorage 'azodiac_profile' will be injected from
#   test/_fixtures/upstream-snapshots/profile.real.json so profile-gated
#   routes (/overview, /bazi, /western, /wuxing, /fusion) render without
#   redirect.
#
# Usage:
#   ./scripts/visual-regression.sh                          # all 11 routes, desktop
#   ./scripts/visual-regression.sh /bazi /western           # subset, desktop
#   BU_VIEWPORT=tablet ./scripts/visual-regression.sh       # 768x1024
#   BU_VIEWPORT=mobile ./scripts/visual-regression.sh       # 375x667
#
# Output:
#   test/_fixtures/visual-baseline/<viewport>/<route-slug>.png

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

VIEWPORT="${BU_VIEWPORT:-desktop}"
case "$VIEWPORT" in
  desktop|tablet|mobile) ;;
  *) echo "ERROR: BU_VIEWPORT must be desktop|tablet|mobile (got: $VIEWPORT)" >&2; exit 1 ;;
esac

OUT_DIR="test/_fixtures/visual-baseline/${VIEWPORT}"
mkdir -p "$OUT_DIR"

# Routes per ROUTES manifest (public/src/data/routes.js).
ALL_ROUTES=(/ /overview /bazi /western /wuxing /fusion /daily /synastry /houses /method /transit-calendar)

# Subset support.
ROUTES=("${@:-${ALL_ROUTES[@]}}")
if [[ "$#" -eq 0 ]]; then
  ROUTES=("${ALL_ROUTES[@]}")
fi

if ! command -v browser-harness >/dev/null 2>&1; then
  echo "ERROR: browser-harness not on PATH. See ~/claude/browser-harness/SKILL.md" >&2
  exit 1
fi

# Verify server is up.
if ! curl -sf http://127.0.0.1:3000/health -o /dev/null; then
  echo "ERROR: server not running on :3000. Start with: npm start (with .env loaded)" >&2
  exit 1
fi

# Translate viewport name → CDP setDeviceMetricsOverride args. Empty string
# means clear the override (desktop default — uses Chrome's actual viewport).
case "$VIEWPORT" in
  desktop) METRICS="clear" ;;
  tablet)  METRICS="768x1024" ;;
  mobile)  METRICS="375x667" ;;
esac

echo ">> Sweep viewport: ${VIEWPORT} (metrics: ${METRICS})"

# Drive browser for each route. Profile injection happens once via /bazi reload.
for route in "${ROUTES[@]}"; do
  slug="$(echo "$route" | sed 's|^/||; s|/|-|g; s|^$|root|')"
  echo ">> Capturing $route @ ${VIEWPORT} → ${OUT_DIR}/${slug}.png"

  browser-harness <<PY 2>&1 | tail -3
import json, time, shutil
with open('test/_fixtures/upstream-snapshots/profile.real.json') as f:
    profile = json.load(f)
metrics = "${METRICS}"
if metrics == "clear":
    cdp("Emulation.clearDeviceMetricsOverride")
else:
    w, h = metrics.split("x")
    cdp("Emulation.setDeviceMetricsOverride", width=int(w), height=int(h), deviceScaleFactor=2, mobile=True)
js(f"sessionStorage.setItem('azodiac_profile', {json.dumps(json.dumps(profile))}); location.hash = '#$route'; location.reload();")
time.sleep(3)
wait_for_load()
shot_path = screenshot()
shutil.copyfile(shot_path, '${OUT_DIR}/${slug}.png')
print('captured:', '${OUT_DIR}/${slug}.png')
PY
done

# Always clear override after a non-desktop sweep so the user's interactive
# Chrome doesn't stay emulating a phone.
if [[ "$VIEWPORT" != "desktop" ]]; then
  browser-harness <<'PY' 2>&1 | tail -1
cdp("Emulation.clearDeviceMetricsOverride")
print("override cleared")
PY
fi

echo ">> All routes captured to $OUT_DIR/"
ls -la "$OUT_DIR"
