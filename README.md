# Full_bazodiac_fufire

Railway-deployable FuFirE dashboard. The app serves a live browser UI and a small Node.js proxy that forwards calculation requests to the FuFirE backend configured by `FUFIRE_BASE_URL`.

## Repository function

- `server.js` starts an HTTP service on `PORT` (Railway injects this variable) and serves files from `public/`.
- `public/index.html` is the live dashboard. It builds a JSON request, sends it to the local proxy, and visualizes real JSON responses from FuFirE.
- `public/reference.html` keeps the original FuFirE calculation reference available as documentation.
- v3-compatible explicit endpoints are exposed directly: `POST /chart`, `POST /calculate/western`, `POST /calculate/bazi`, `POST /calculate/fusion`, `POST /calculate/wuxing`, and `GET /info/wuxing`.
- `/api/fufire/:endpoint` remains as a compatibility proxy for the same allowlisted upstream endpoints.
- `/health` returns a no-cache JSON health check with the active upstream base URL and endpoint catalog.

## FuFirE endpoint surface

| Method | Local endpoint | Upstream path | Purpose |
| --- | --- | --- | --- |
| `POST` | `/chart` | `/chart` | Full combined chart. |
| `POST` | `/calculate/western` | `/calculate/western` | Western astrology calculation. |
| `POST` | `/calculate/bazi` | `/calculate/bazi` | BaZi four pillars calculation. |
| `POST` | `/calculate/fusion` | `/calculate/fusion` | WuXing fusion calculation. |
| `POST` | `/calculate/wuxing` | `/calculate/wuxing` | WuXing vector from planet positions. |
| `GET` | `/info/wuxing` | `/info/wuxing` | Planet-to-element reference. |

The same endpoints are also available under `/api/fufire/...` for backward-compatible same-origin proxy calls.

## API endpoints

### Fusion endpoint

**Path:** `POST /api/azodiac/fusion`

Calculates WuXing fusion for a single birth chart (combines western astrology and BaZi into a WuXing vector analysis).

**Request format:**
```json
{
  "date": "1990-01-01",
  "time": "12:00",
  "tz": "Europe/Berlin",
  "lat": 52.52,
  "lon": 13.405
}
```

Alternative field names are also supported:
- `datetime` or `date`
- `timezone` or `tz`
- `latitude` or `lat`
- `longitude` or `lon`

**Response format:**
```json
{
  "fusion": {
    "wu_xing_vectors": {
      "western_planets": {
        "Holz": 0.2,
        "Feuer": 0.3,
        "Erde": 0.15,
        "Metall": 0.2,
        "Wasser": 0.15
      },
      "bazi_pillars": {
        "Holz": 0.25,
        "Feuer": 0.25,
        "Erde": 0.15,
        "Metall": 0.2,
        "Wasser": 0.15
      },
      "fusion": {
        "Holz": 0.225,
        "Feuer": 0.275,
        "Erde": 0.15,
        "Metall": 0.2,
        "Wasser": 0.15
      }
    },
    "coherence_index": 0.73,
    "fusion_interpretation": "Harmonische Balance der Elemente...",
    "aspects": [],
    "house_overlay": null,
    "dominant_patterns": [],
    "synthesis_notes": null,
    "remediation": {
      "distribution": { "Holz": 0.225, "Feuer": 0.275, "Erde": 0.15, "Metall": 0.2, "Wasser": 0.15 },
      "dominant": null,
      "deficient": null,
      "actions": [],
      "summary": "Deine Element-Signatur ist ausgewogen — keine starke Über- oder Untersteuerung erkennbar."
    }
  },
  "_meta": {
    "view_model_version": "2",
    "fetched_at": "2024-01-15T10:30:00.000Z",
    "endpoint": "/api/azodiac/fusion",
    "input": {
      "date": "1990-01-01T12:00:00",
      "tz": "Europe/Berlin",
      "lat": 52.52,
      "lon": 13.405
    },
    "upstream_status": {
      "western": 200,
      "bazi": 200,
      "fusion": 200
    }
  }
}
```

### Synastry endpoint

**Path:** `POST /api/azodiac/synastry`

Calculates comprehensive synastry analysis between two birth charts, including optional fusion calculation for each person.

**Query parameters:**
- `includeFusion` (optional, boolean): Whether to include fusion calculations for each person. Default: `true`. Set to `false` for faster response when fusion data is not needed.

**Request format:**
```json
{
  "personA": {
    "date": "1990-01-01",
    "time": "12:00",
    "tz": "Europe/Berlin",
    "lat": 52.52,
    "lon": 13.405
  },
  "personB": {
    "date": "1995-05-15",
    "time": "14:30",
    "tz": "Europe/Berlin",
    "lat": 48.8566,
    "lon": 2.3522
  }
}
```

**Example with includeFusion=false:**
```bash
curl -X POST "http://127.0.0.1:3000/api/azodiac/synastry?includeFusion=false" \
  -H "Content-Type: application/json" \
  -d '{"personA": {...}, "personB": {...}}'
```

**Response format:**
```json
{
  "personA": {
    "western": {
      "bodies": { ... },
      "houses": [ ... ],
      "aspects": [ ... ],
      "ascendant": "Scorpio",
      "angles": { ... }
    },
    "bazi": {
      "pillars": { ... },
      "day_master": { ... }
    },
    "fusion": {
      "wu_xing_vectors": { ... },
      "coherence_index": 0.73,
      "fusion_interpretation": "...",
      "aspects": [],
      "house_overlay": null,
      "dominant_patterns": [],
      "synthesis_notes": null,
      "remediation": { "distribution": {...}, "dominant": null, "deficient": null, "actions": [], "summary": "..." }
    },
    "_meta": {
      "view_model_version": "2",
      "fetched_at": "2024-01-15T10:30:00.000Z",
      "input": { ... }
    }
  },
  "personB": {
    "western": { ... },
    "bazi": { ... },
    "fusion": { ... },
    "_meta": { ... }
  },
  "synastry": {
    "combined_coherence": 0.71,
    "element_tension": {
      "dominant_a": "Feuer",
      "dominant_b": "Wasser",
      "cycle_relation": "Zerstörung",
      "tension_score": 0.8
    }
  },
  "_meta": {
    "upstream_status": {
      "western_a": 200,
      "bazi_a": 200,
      "western_b": 200,
      "bazi_b": 200,
      "fusion_a": 200,
      "fusion_b": 200
    },
    "computed_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error responses

All endpoints return JSON error responses with appropriate HTTP status codes:

**400 Bad Request** - Invalid JSON or missing required fields:
```json
{
  "error": "Invalid request payload",
  "errors": [
    "date: required — provide date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:MM)",
    "lat: required — provide lat (decimal degrees, e.g. 48.137)"
  ]
}
```

**405 Method Not Allowed** - Wrong HTTP method:
```json
{
  "error": "Method not allowed",
  "allowed": ["POST"],
  "endpoint": "/api/azodiac/fusion"
}
```

**502 Bad Gateway** - Upstream error or timeout:
```json
{
  "error": "Upstream timeout",
  "detail": "Connection timeout after 20000ms",
  "hint": "Check FUFIRE_BASE_URL and FUFIRE_API_KEY environment variables."
}
```

**404 Not Found** - Endpoint does not exist:
```json
{
  "error": "Not found"
}
```

**429 Too Many Requests** - Rate limit exceeded (geocode only):
```json
{
  "error": "Geocode rate limit exceeded. Max 10 requests/minute per IP."
}
```

## Required Railway variables

```bash
FUFIRE_BASE_URL=https://bafe-production.up.railway.app/
```

Optional:

```bash
API_TIMEOUT_MS=20000
```

## Local development

```bash
npm install
npm start
# open http://127.0.0.1:3000
```

Run checks:

```bash
npm test
curl -fsS http://127.0.0.1:3000/health
```

## Deployment

Railway/Railpack now detects this repository as a Node.js app because `package.json` exists and contains a `start` script. `railway.json` pins the deploy start command to `npm start` and configures `/health` as the health check. The deployed service keeps the v3 public FuFirE surface while adding v4 operational hardening: explicit allowlist, method checks, request-size guard, timeout/abort handling, health/config introspection, and static-file path safety.

## Root cause analysis: Railpack failure

Error excerpt:

```text
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
The app contents that Railpack analyzed contains:
./
├── FuFirE-Reference.html
└── README.md
```

### 5 WHY

1. **Why did Railway fail?** Railpack could not determine a supported app type or build plan.
2. **Why could Railpack not determine a build plan?** The repository only contained `FuFirE-Reference.html` and `README.md`, so there was no language manifest such as `package.json`, no static-site config, and no executable start command.
3. **Why did it mention `start.sh`?** A start command or inferred process expected a shell entrypoint named `start.sh`, but that file did not exist in the uploaded snapshot.
4. **Why was there no deployable entrypoint?** The repository was a reference document, not a runnable web application. It described FuFirE endpoints but did not include a server, proxy, health check, or deploy metadata.
5. **Why did this block real results?** A static reference file cannot safely call the FuFirE backend from Railway with a controlled base URL, timeout, error reporting, health check, or same-origin browser path.

## Thesis check and final fix thesis

- **Thesis 1:** The failure is primarily a missing Railway/Railpack entrypoint problem. Adding a supported manifest and start command should make the app deployable.
- **Counter-thesis 2:** Even if deployment starts, the result is incomplete if the page remains a static reference and never calls `FUFIRE_BASE_URL`; deployability alone does not produce or visualize real FuFirE results.
- **Overlapping truth:** The repository needs both a detectable runtime contract and a real runtime integration path to the FuFirE API.
- **Final thesis 3:** Convert the reference-only repository into a minimal Node.js web service: `package.json` + `server.js` + Railway config for deployability, preserve the v3 explicit FuFirE endpoints (`/chart`, `/calculate/*`, `/info/wuxing`), and harden them with the v4 runtime contract so Railway can deploy, health-check, proxy to `https://bafe-production.up.railway.app/`, and visualize returned calculation JSON.
