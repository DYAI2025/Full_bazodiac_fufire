# Full_bazodiac_fufire

Railway-deployable FuFirE dashboard. The app serves a live browser UI and a small Node.js proxy that forwards calculation requests to the FuFirE backend configured by `FUFIRE_BASE_URL`.

## Repository function

- `server.js` starts an HTTP service on `PORT` (Railway injects this variable) and serves files from `public/`.
- `public/index.html` is the live dashboard. It builds a JSON request, sends it to the local proxy, and visualizes real JSON responses from FuFirE.
- `public/reference.html` keeps the original FuFirE calculation reference available as documentation.

## Endpoint catalog

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health + upstream config + endpoint catalog |
| `GET` | `/api/config` | Config introspection (upstream URL, API key presence) |
| `POST` | `/api/azodiac/profile` | Full birth profile: western + BaZi + fusion + WuXing + TST (parallel) |
| `POST` | `/api/azodiac/fusion` | WuXing fusion for a single chart |
| `POST` | `/api/azodiac/synastry` | Synastry analysis for two charts |
| `POST` | `/api/azodiac/daily` | Daily experience (sequential: bootstrap → daily) |
| `GET` | `/api/geocode?q=…` | Place search via Nominatim + timezone from timeapi.io |
| `*` | `/api/fufire/:endpoint` | Compatibility proxy (allowlisted upstream endpoints) |
| `POST` | `/chart` | Full combined chart (legacy shortcut, proxied server-side) |

## API endpoints

### Profile endpoint

**Path:** `POST /api/azodiac/profile`

Full birth profile: western astrology, BaZi four pillars, WuXing fusion, and optional TST (Ten-Star Theory) — all fetched in parallel.

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

Alternative field names are supported: `datetime`/`date`, `timezone`/`tz`, `latitude`/`lat`, `longitude`/`lon`.

**Response format:**
```json
{
  "western": {
    "bodies": { "Sun": { "longitude": 280.5, "sign": "Capricorn", "house": 4 } },
    "houses": [{ "number": 1, "sign": "Libra", "cusp": 198.3 }],
    "aspects": [{ "body1": "Sun", "body2": "Moon", "type": "sextile", "orb": 1.2 }],
    "ascendant": "Libra",
    "angles": { "asc": 198.3, "mc": 108.1 }
  },
  "bazi": {
    "pillars": {
      "year":  { "stem": "庚", "branch": "午", "element": "Metall" },
      "month": { "stem": "丁", "branch": "丑", "element": "Feuer" },
      "day":   { "stem": "甲", "branch": "子", "element": "Holz" },
      "hour":  { "stem": "壬", "branch": "午", "element": "Wasser" }
    },
    "day_master": { "element": "Holz", "strength": "weak" }
  },
  "fusion": {
    "wu_xing_vectors": {
      "western_planets": { "Holz": 0.2, "Feuer": 0.3, "Erde": 0.15, "Metall": 0.2, "Wasser": 0.15 },
      "bazi_pillars":    { "Holz": 0.25, "Feuer": 0.25, "Erde": 0.15, "Metall": 0.2, "Wasser": 0.15 },
      "fusion":          { "Holz": 0.225, "Feuer": 0.275, "Erde": 0.15, "Metall": 0.2, "Wasser": 0.15 }
    },
    "coherence_index": 0.73,
    "fusion_interpretation": "Harmonische Balance der Elemente...",
    "remediation": {
      "distribution": { "Holz": 0.225, "Feuer": 0.275, "Erde": 0.15, "Metall": 0.2, "Wasser": 0.15 },
      "dominant": null,
      "deficient": null,
      "actions": [],
      "summary": "Deine Element-Signatur ist ausgewogen."
    }
  },
  "_meta": {
    "view_model_version": "2",
    "fetched_at": "2025-01-15T10:30:00.000Z",
    "endpoint": "/api/azodiac/profile",
    "input": { "date": "1990-01-01T12:00:00", "tz": "Europe/Berlin", "lat": 52.52, "lon": 13.405 },
    "upstream_status": {
      "western": 200,
      "bazi": 200,
      "fusion": 200,
      "wuxing": 200,
      "tst": "n/a",
      "wuxing_info": 200
    }
  }
}
```

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
    "fetched_at": "2025-01-15T10:30:00.000Z",
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
      "fetched_at": "2025-01-15T10:30:00.000Z",
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
    "computed_at": "2025-01-15T10:30:00.000Z"
  }
}
```

### Daily endpoint

**Path:** `POST /api/azodiac/daily`

Sequential two-step aggregator: calls `experience/bootstrap` first (derives soulprint sectors from the birth chart), then calls `experience/daily` with today's date and the bootstrap result.

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

Optional field: `target_date` (ISO date string, e.g. `"2025-06-15"`) — defaults to today.

**Response format:**
```json
{
  "date": "2025-01-15",
  "western": { ... },
  "eastern": { ... },
  "fusion":  { ... },
  "_meta": {
    "bootstrap_profile": { ... },
    "computed_at": "2025-01-15T10:30:00.000Z"
  }
}
```

### Geocode endpoint

**Path:** `GET /api/geocode?q=Berlin`

Place search backed by Nominatim (OpenStreetMap) with timezone lookup via timeapi.io. Results cached 24 h in-memory (max 200 entries). Rate-limited to 10 requests/minute per IP.

**Response format:**
```json
[
  {
    "display": "Berlin, Deutschland",
    "lat": 52.5170365,
    "lon": 13.3888599,
    "tz": "Europe/Berlin",
    "type": "city"
  }
]
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
FUFIRE_API_KEY=
FUFIRE_ALLOWED_ORIGINS=https://yourapp.example.com
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

Run a single test file:

```bash
node --test test/view_model.test.js
```

## Deployment

Railway/Railpack detects this as a Node.js app via `package.json`. `railway.json` pins the start command to `npm start` and configures `/health` as the health check path.
