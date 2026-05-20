#!/usr/bin/env bash
# Sprint H7 / I — visual-regression sweep across all design-mockup routes.
#
# Drives browser-harness (CDP-attached Chrome) over every primary route,
# captures a viewport screenshot, saves to test/_fixtures/visual-baseline/.
# Run after a Sprint-H PR merge to refresh baseline; re-run to verify
# a candidate branch matches.
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
#   ./scripts/visual-regression.sh                          # all 11 routes
#   ./scripts/visual-regression.sh /bazi /western           # subset
#
# Output:
#   test/_fixtures/visual-baseline/<route-slug>.png

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="test/_fixtures/visual-baseline"
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

# Drive browser for each route. Profile injection happens once via /bazi reload.
for route in "${ROUTES[@]}"; do
  slug="$(echo "$route" | sed 's|^/||; s|/|-|g; s|^$|root|')"
  echo ">> Capturing $route → ${OUT_DIR}/${slug}.png"

  browser-harness <<PY 2>&1 | tail -3
import json, time, shutil
with open('test/_fixtures/upstream-snapshots/profile.real.json') as f:
    profile = json.load(f)
js(f"sessionStorage.setItem('azodiac_profile', {json.dumps(json.dumps(profile))}); location.hash = '#$route'; location.reload();")
time.sleep(3)
wait_for_load()
shot_path = screenshot()
shutil.copyfile(shot_path, '${OUT_DIR}/${slug}.png')
print('captured:', '${OUT_DIR}/${slug}.png')
PY
done

echo ">> All routes captured to $OUT_DIR/"
ls -la "$OUT_DIR"
