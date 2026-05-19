#!/usr/bin/env bash
# Re-record upstream FuFire response fixtures used for enrichment unit tests.
#
# Run when: upstream contract changes are suspected, or new personas need
# coverage. Output overwrites test/_fixtures/upstream-snapshots/*.real.json
# and test/_fixtures/upstream-snapshots/*.persona{2,3}.json.
#
# Usage:
#   ./scripts/capture-fixtures.sh           # uses .env for FUFIRE_API_KEY + FUFIRE_BASE_URL
#   FUFIRE_API_KEY=... ./scripts/capture-fixtures.sh
#
# Prerequisites: .env in repo root with FUFIRE_API_KEY + FUFIRE_BASE_URL
# (or both set in the calling shell). No external dependencies — uses curl
# only. RTK proxy bypass is included so curl bodies are not token-filtered.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Load .env if neither var is exported.
if [[ -z "${FUFIRE_API_KEY:-}" || -z "${FUFIRE_BASE_URL:-}" ]]; then
  if [[ -f .env ]]; then
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" =~ ^# ]] && continue
      export "$key=$value"
    done < <(grep -E '^(FUFIRE_API_KEY|FUFIRE_BASE_URL)=' .env)
  fi
fi

if [[ -z "${FUFIRE_API_KEY:-}" ]]; then
  echo "ERROR: FUFIRE_API_KEY not set (export it or put it in .env)" >&2
  exit 1
fi

PORT=${PORT:-3000}
FIXTURE_DIR="test/_fixtures/upstream-snapshots"
mkdir -p "$FIXTURE_DIR"

# curl wrapper that bypasses RTK token-saving filter if rtk is on PATH.
if command -v rtk >/dev/null 2>&1; then
  CURL="rtk proxy curl"
else
  CURL="curl"
fi

# Kill any process on PORT before starting our server.
if lsof -ti:$PORT >/dev/null 2>&1; then
  echo "Port $PORT busy, killing..." >&2
  lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo ">> Starting server on :$PORT with FUFIRE_API_KEY + FUFIRE_BASE_URL"
PORT=$PORT FUFIRE_API_KEY="$FUFIRE_API_KEY" FUFIRE_BASE_URL="$FUFIRE_BASE_URL" \
  node server.js > /tmp/fixture-capture-server.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null || true" EXIT

# Wait until /health responds 200.
for i in $(seq 1 30); do
  if $CURL -sf "http://127.0.0.1:$PORT/health" -o /dev/null; then
    break
  fi
  sleep 0.5
done

if ! $CURL -sf "http://127.0.0.1:$PORT/health" -o /dev/null; then
  echo "ERROR: server did not come up; see /tmp/fixture-capture-server.log" >&2
  exit 1
fi

echo ">> Server up"

# Personas — keep this table in sync with docs/contracts/2026-05-19-design-vs-real-gap.md §1.
# Each: label, date, time, lat, lon, tz, description
declare -a PERSONAS=(
  "lina|1987-03-14|07:42|52.3744779|9.7385532|Europe/Berlin|Design-mockup persona — Yang Ren Wasser DM"
  "persona2|1995-08-22|03:15|35.6762|139.6503|Asia/Tokyo|Yin Yi Holz DM, deficient Erde — variant coverage"
  "persona3|1972-11-08|23:45|40.7128|-74.0060|America/New_York|Yin Gui Wasser DM, multi-zero distribution edge case"
)

# Fetch every endpoint for every persona; keep the "lina" persona on the
# unsuffixed file names so existing tests continue to resolve.
for entry in "${PERSONAS[@]}"; do
  IFS='|' read -r label date time lat lon tz desc <<< "$entry"
  echo ">> Capturing $label ($desc)"
  suffix=""
  [[ "$label" != "lina" ]] && suffix=".$label"
  base="$FIXTURE_DIR/profile${suffix:-.real}.json"
  payload=$(printf '{"date":"%s","time":"%s","lat":%s,"lon":%s,"tz":"%s"}' "$date" "$time" "$lat" "$lon" "$tz")

  $CURL -s -X POST "http://127.0.0.1:$PORT/api/azodiac/profile" \
    -H "content-type: application/json" -d "$payload" \
    -o "${FIXTURE_DIR}/profile${suffix:-.real}.json" \
    -w "  profile${suffix:-.real}.json: HTTP %{http_code} | %{size_download} bytes\n"

  $CURL -s -X POST "http://127.0.0.1:$PORT/api/azodiac/daily" \
    -H "content-type: application/json" -d "$payload" \
    -o "${FIXTURE_DIR}/daily${suffix:-.real}.json" \
    -w "  daily${suffix:-.real}.json: HTTP %{http_code} | %{size_download} bytes\n"
done

# Endpoint-only fixtures (no persona variation needed for static info + transit).
echo ">> Capturing endpoint-only fixtures"
$CURL -s "http://127.0.0.1:$PORT/api/fufire/info/wuxing" \
  -o "${FIXTURE_DIR}/wuxing-info.real.json" \
  -w "  wuxing-info.real.json: HTTP %{http_code} | %{size_download} bytes\n"

$CURL -s "http://127.0.0.1:$PORT/api/fufire/transit/now" \
  -o "${FIXTURE_DIR}/transit-now.real.json" \
  -w "  transit-now.real.json: HTTP %{http_code} | %{size_download} bytes\n"

$CURL -s "http://127.0.0.1:$PORT/api/fufire/transit/timeline" \
  -o "${FIXTURE_DIR}/transit-timeline.real.json" \
  -w "  transit-timeline.real.json: HTTP %{http_code} | %{size_download} bytes\n"

# Lina-only standalone calculate fixtures (granular API shapes).
lina_payload='{"date":"1987-03-14T07:42:00","tz":"Europe/Berlin","lat":52.3744779,"lon":9.7385532}'
$CURL -s -X POST "http://127.0.0.1:$PORT/api/fufire/calculate/bazi" \
  -H "content-type: application/json" -d "$lina_payload" \
  -o "${FIXTURE_DIR}/bazi.real.json" \
  -w "  bazi.real.json: HTTP %{http_code} | %{size_download} bytes\n"

$CURL -s -X POST "http://127.0.0.1:$PORT/api/fufire/calculate/western" \
  -H "content-type: application/json" -d "$lina_payload" \
  -o "${FIXTURE_DIR}/western.real.json" \
  -w "  western.real.json: HTTP %{http_code} | %{size_download} bytes\n"

$CURL -s -X POST "http://127.0.0.1:$PORT/api/fufire/calculate/fusion" \
  -H "content-type: application/json" -d "$lina_payload" \
  -o "${FIXTURE_DIR}/fusion.real.json" \
  -w "  fusion.real.json: HTTP %{http_code} | %{size_download} bytes\n"

$CURL -s -X POST "http://127.0.0.1:$PORT/api/fufire/calculate/wuxing" \
  -H "content-type: application/json" -d "$lina_payload" \
  -o "${FIXTURE_DIR}/wuxing.real.json" \
  -w "  wuxing.real.json: HTTP %{http_code} | %{size_download} bytes\n"

# Synastry needs two birth records — use Lina + Persona2.
synastry_payload='{
  "personA":{"date":"1987-03-14","time":"07:42","lat":52.3744779,"lon":9.7385532,"tz":"Europe/Berlin"},
  "personB":{"date":"1990-05-20","time":"15:30","lat":48.1351,"lon":11.582,"tz":"Europe/Berlin"}
}'
$CURL -s -X POST "http://127.0.0.1:$PORT/api/azodiac/synastry" \
  -H "content-type: application/json" -d "$synastry_payload" \
  -o "${FIXTURE_DIR}/synastry.real.json" \
  -w "  synastry.real.json: HTTP %{http_code} | %{size_download} bytes\n"

echo ">> All fixtures captured to $FIXTURE_DIR"
ls -la "$FIXTURE_DIR"
