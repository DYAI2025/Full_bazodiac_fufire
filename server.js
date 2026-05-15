import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = resolve(__dirname, 'public');
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const DEFAULT_FUFIRE_BASE_URL = 'https://bafe-production.up.railway.app/';
const API_TIMEOUT_MS = Number.parseInt(process.env.API_TIMEOUT_MS || '20000', 10);
const MAX_BODY_BYTES = Number.parseInt(process.env.MAX_BODY_BYTES || '1000000', 10);
const FUFIRE_API_KEY = process.env.FUFIRE_API_KEY || '';

// ── CORS allowlist ────────────────────────────────────────────────────────
// Unset → wildcard (dev). Set → restrict to explicit origins.
// Read env dynamically so tests can override process.env at runtime.
function getAllowedOrigins() {
  const raw = process.env.FUFIRE_ALLOWED_ORIGINS || '';
  return raw ? new Set(raw.split(',').map(o => o.trim()).filter(Boolean)) : null;
}

function corsOrigin(requestOrigin) {
  const allowed = getAllowedOrigins();
  if (!allowed) return '*';
  if (!requestOrigin) return null;
  return allowed.has(requestOrigin) ? requestOrigin : null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// ── Endpoint catalog (order matters: tests assert exact array) ─────────────
const FUFIRE_ENDPOINTS = [
  {
    method: 'POST',
    path: '/chart',
    upstreamPath: 'chart',
    category: 'calculation',
    description: 'Kombiniertes Chart — westliche Astrologie, BaZi und WuXing-Fusion in einem Call.',
  },
  {
    method: 'POST',
    path: '/calculate/western',
    upstreamPath: 'calculate/western',
    category: 'calculation',
    description: 'Westliche Astrologie mit Planeten, Häusern, Aspekten und Provenance.',
  },
  {
    method: 'POST',
    path: '/calculate/bazi',
    upstreamPath: 'calculate/bazi',
    category: 'calculation',
    description: 'BaZi Vier-Säulen-Berechnung mit Day Master, Stämmen, Zweigen und Trace.',
  },
  {
    method: 'POST',
    path: '/calculate/fusion',
    upstreamPath: 'calculate/fusion',
    category: 'calculation',
    description: 'Wu-Xing Fusion aus westlichem Chart und BaZi inklusive Vergleich und Harmonie.',
  },
  {
    method: 'POST',
    path: '/calculate/wuxing',
    upstreamPath: 'calculate/wuxing',
    category: 'calculation',
    description: 'Nur WuXing-Vektor aus Planetenpositionen.',
  },
  {
    method: 'GET',
    path: '/info/wuxing',
    upstreamPath: 'info/wuxing',
    category: 'reference',
    description: 'Statische FuFirE-Referenz: Planet-zu-Element-Mapping.',
  },
];

const ENDPOINTS_BY_PATH = new Map(FUFIRE_ENDPOINTS.map((e) => [e.path, e]));
const ENDPOINTS_BY_UPSTREAM_PATH = new Map(FUFIRE_ENDPOINTS.map((e) => [e.upstreamPath, e]));

// ── URL helpers ───────────────────────────────────────────────────────────
function getFuFireBaseUrl() {
  return normalizeBaseUrl(process.env.FUFIRE_BASE_URL || DEFAULT_FUFIRE_BASE_URL);
}

function normalizeBaseUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.pathname = parsed.pathname.replace(/\/+$/, '/');
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return DEFAULT_FUFIRE_BASE_URL;
  }
}

// ── API key + headers ─────────────────────────────────────────────────────
function getFuFireHeaders(isGet = false) {
  const headers = { accept: 'application/json' };
  if (!isGet) headers['content-type'] = 'application/json';
  if (FUFIRE_API_KEY) headers['x-api-key'] = FUFIRE_API_KEY;
  return headers;
}

// ── Payload translation: browser field names → FuFirE field names ─────────
function translatePayload(raw) {
  const obj = typeof raw === 'string' ? (raw ? JSON.parse(raw) : {}) : (raw || {});
  let date = obj.date || obj.datetime || '';
  const time = obj.time || '';
  if (date && !date.includes('T') && time) {
    const t = time.length === 5 ? `${time}:00` : time;
    date = `${date}T${t}`;
  }
  return {
    date,
    tz: obj.tz || obj.timezone || 'UTC',
    lat: Number(obj.lat ?? obj.latitude ?? obj.location?.latitude ?? 0),
    lon: Number(obj.lon ?? obj.longitude ?? obj.location?.longitude ?? 0),
  };
}

export function validatePayload(raw) {
  const errors = [];
  let obj;
  try {
    obj = typeof raw === 'string' ? (raw ? JSON.parse(raw) : {}) : (raw || {});
  } catch {
    return { valid: false, errors: ['Request body is not valid JSON'] };
  }

  // Date: required, must match YYYY-MM-DD or YYYY-MM-DDTHH:MM[:SS]
  const dateStr = obj.date || obj.datetime || '';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
  if (!dateStr) {
    errors.push('date: required — provide date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:MM)');
  } else if (!DATE_RE.test(dateStr)) {
    errors.push(`date: invalid format "${dateStr}" — expected YYYY-MM-DD or YYYY-MM-DDTHH:MM`);
  }

  // Lat: required, finite, [-90, 90]
  const rawLat = obj.lat ?? obj.latitude ?? obj.location?.latitude;
  const lat = rawLat !== undefined && rawLat !== '' ? Number(rawLat) : NaN;
  if (rawLat === undefined || rawLat === '') {
    errors.push('lat: required — provide lat (decimal degrees, e.g. 48.137)');
  } else if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push(`lat: must be a number between -90 and 90, got "${rawLat}"`);
  }

  // Lon: required, finite, [-180, 180]
  const rawLon = obj.lon ?? obj.longitude ?? obj.location?.longitude;
  const lon = rawLon !== undefined && rawLon !== '' ? Number(rawLon) : NaN;
  if (rawLon === undefined || rawLon === '') {
    errors.push('lon: required — provide lon (decimal degrees, e.g. 11.576)');
  } else if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errors.push(`lon: must be a number between -180 and 180, got "${rawLon}"`);
  }

  if (errors.length) return { valid: false, errors };
  return { valid: true };
}

// ── Element key normalizer ────────────────────────────────────────────────
const ELEM_DE_MAP = {
  wood:'Holz', fire:'Feuer', earth:'Erde', metal:'Metall', water:'Wasser',
  holz:'Holz', feuer:'Feuer', erde:'Erde', metall:'Metall', wasser:'Wasser',
};
function toDE(key) { return ELEM_DE_MAP[(key||'').toLowerCase()] || key; }

function normalizeVector(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const result = {};
  for (const [k, v] of Object.entries(raw)) {
    const de = toDE(k);
    if (['Holz','Feuer','Erde','Metall','Wasser'].includes(de)) result[de] = Number(v) || 0;
  }
  return result;
}

// ── Hidden Stems Tabelle (Zàng Gān 藏干) ─────────────────────────────────
// Quelle: klassische BaZi-Literatur (unveränderlich)
// Format: branch → [ { stem, element, weight, polarity } ]
const HIDDEN_STEMS = {
  '子': [{ stem:'癸', element:'Wasser', weight:10.0, polarity:'Yin'  }],
  '丑': [{ stem:'己', element:'Erde',   weight:6.0,  polarity:'Yin'  },
         { stem:'癸', element:'Wasser', weight:3.0,  polarity:'Yin'  },
         { stem:'辛', element:'Metall', weight:1.0,  polarity:'Yin'  }],
  '寅': [{ stem:'甲', element:'Holz',   weight:7.0,  polarity:'Yang' },
         { stem:'丙', element:'Feuer',  weight:2.0,  polarity:'Yang' },
         { stem:'戊', element:'Erde',   weight:1.0,  polarity:'Yang' }],
  '卯': [{ stem:'乙', element:'Holz',   weight:10.0, polarity:'Yin'  }],
  '辰': [{ stem:'戊', element:'Erde',   weight:6.0,  polarity:'Yang' },
         { stem:'乙', element:'Holz',   weight:3.0,  polarity:'Yin'  },
         { stem:'癸', element:'Wasser', weight:1.0,  polarity:'Yin'  }],
  '巳': [{ stem:'丙', element:'Feuer',  weight:7.0,  polarity:'Yang' },
         { stem:'庚', element:'Metall', weight:2.0,  polarity:'Yang' },
         { stem:'戊', element:'Erde',   weight:1.0,  polarity:'Yang' }],
  '午': [{ stem:'丁', element:'Feuer',  weight:7.0,  polarity:'Yin'  },
         { stem:'己', element:'Erde',   weight:3.0,  polarity:'Yin'  }],
  '未': [{ stem:'己', element:'Erde',   weight:6.0,  polarity:'Yin'  },
         { stem:'丁', element:'Feuer',  weight:3.0,  polarity:'Yin'  },
         { stem:'乙', element:'Holz',   weight:1.0,  polarity:'Yin'  }],
  '申': [{ stem:'庚', element:'Metall', weight:7.0,  polarity:'Yang' },
         { stem:'壬', element:'Wasser', weight:2.0,  polarity:'Yang' },
         { stem:'戊', element:'Erde',   weight:1.0,  polarity:'Yang' }],
  '酉': [{ stem:'辛', element:'Metall', weight:10.0, polarity:'Yin'  }],
  '戌': [{ stem:'戊', element:'Erde',   weight:6.0,  polarity:'Yang' },
         { stem:'辛', element:'Metall', weight:3.0,  polarity:'Yin'  },
         { stem:'丁', element:'Feuer',  weight:1.0,  polarity:'Yin'  }],
  '亥': [{ stem:'壬', element:'Wasser', weight:7.0,  polarity:'Yang' },
         { stem:'甲', element:'Holz',   weight:3.0,  polarity:'Yang' }],
};

function deriveHiddenStems(branch) {
  const table = HIDDEN_STEMS[branch];
  if (!table) return [];
  return table.map(hs => ({ ...hs, source: 'derived_from_branch_table' }));
}

function normalizePillar(raw) {
  if (!raw) return null;
  const branch = raw.zweig ?? raw.branch ?? raw.earthly_branch ?? null;
  const apiHiddenStems = raw.hidden_stems ?? raw.zang_gan ?? null;
  return {
    stem:         raw.stamm   ?? raw.stem   ?? raw.heavenly_stem ?? null,
    branch,
    element:      toDE(raw.element ?? raw.element_name ?? ''),
    hidden_stems: apiHiddenStems && apiHiddenStems.length > 0
                    ? apiHiddenStems
                    : deriveHiddenStems(branch),
  };
}

// ── ViewModel normalizer ──────────────────────────────────────────────────
export function normalizeAzodiacResult(raw) {
  const w = raw?.western || {};
  const b = raw?.bazi    || {};
  const f = raw?.fusion  || {};
  const meta = raw?._meta || {};

  // Western
  const bodies = {};
  for (const [name, body] of Object.entries(w.bodies || {})) {
    bodies[name] = {
      longitude:      Number(body.longitude ?? body.lon ?? body.degree ?? 0),
      sign:           body.sign ?? null,
      zodiac_sign:    body.zodiac_sign ?? null,
      house:          body.house ?? null,
      retrograde:     Boolean(body.is_retrograde ?? body.retrograde),
      degree_in_sign: body.degree_in_sign ?? null,
    };
  }

  // BaZi
  const pillars = {};
  const rawPillars = b.pillars || {};
  for (const key of ['year','month','day','hour']) {
    if (rawPillars[key]) pillars[key] = normalizePillar(rawPillars[key]);
  }
  const dm = b.day_master ?? b.dayMaster ?? null;

  // Fusion vectors
  const vecs = f.wu_xing_vectors || f.vectors || {};
  const westernVec = normalizeVector(vecs.western_planets ?? vecs.western);
  const baziVec    = normalizeVector(vecs.bazi_pillars    ?? vecs.bazi);
  const fusionVec  = normalizeVector(vecs.fusion ?? vecs.fused);

  // Coherence index: FuFirE returns harmony_index: { harmony_index: 0.73, cosine_similarity: ... }
  // Accept that shape as well as the future flat field names.
  const hi = f.harmony_index;
  const coherenceIndex = f.coherence_index
    ?? (hi && typeof hi === 'object' ? (hi.harmony_index ?? hi.cosine_similarity ?? null) : null)
    ?? (typeof hi === 'number' ? hi : null)
    ?? f.harmony
    ?? f.harmony_score
    ?? null;

  // Harmony interpretation: present in FuFirE as harmony_index.interpretation
  const harmonyInterpretation = hi?.interpretation ?? '';

  // Ascendant sign derivation:
  // FuFirE returns angles.Ascendant = ecliptic longitude (number, e.g. 185.34).
  // OverviewPage expects a zodiac sign name string like "Scorpio" / "Libra".
  // Derive from longitude if no direct sign string is available.
  const ASC_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                     'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  function lonToSign(lon) {
    if (lon == null || typeof lon !== 'number') return null;
    return ASC_SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
  }

  // Resolve ascendant: prefer a string (sign name or sign lookup via longitude)
  const ascRaw = w.ascendant;
  const ascLon = w.angles?.Ascendant
    ?? w.angles?.ASC
    ?? (typeof ascRaw === 'number' ? ascRaw : (ascRaw?.longitude ?? null));
  const ascSign = (typeof ascRaw === 'string' && ascRaw.length > 1)
    ? ascRaw                              // API already sends a name
    : lonToSign(ascLon);                  // derive from longitude

  return {
    western: {
      bodies,
      // Pass houses through as-is — frontend handles both object {"1":50.26} and array forms
      houses:    w.houses  ?? [],
      aspects:   Array.isArray(w.aspects) ? w.aspects : [],
      ascendant: ascSign,                 // always a sign name or null
      // Keep raw angles for any downstream calculation (e.g. degree-in-sign)
      angles:    w.angles   ?? null,
    },
    bazi: {
      pillars,
      day_master: dm ? normalizePillar(dm) : null,
    },
    fusion: {
      wu_xing_vectors: {
        western_planets: westernVec,
        bazi_pillars:    baziVec,
        ...(Object.keys(fusionVec).length ? { fusion: fusionVec } : {}),
      },
      coherence_index:       typeof coherenceIndex === 'number' ? coherenceIndex : null,
      fusion_interpretation: [harmonyInterpretation, f.fusion_interpretation ?? f.interpretation ?? ''].filter(Boolean).join('\n\n'),
    },
    _meta: {
      ...meta,
      view_model_version: '1',
      fetched_at: new Date().toISOString(),
    },
  };
}

// ── Low-level FuFirE call (single endpoint) ───────────────────────────────
async function callFuFire(upstreamPath, payload, signal) {
  const url = new URL(upstreamPath, getFuFireBaseUrl());
  const response = await fetch(url, {
    method: 'POST',
    headers: getFuFireHeaders(false),
    body: JSON.stringify(payload),
    signal,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  return { ok: response.ok, status: response.status, data };
}

// ── Chart orchestrator: parallel western + bazi + fusion ──────────────────
async function orchestrateChart(rawBody) {
  const payload = translatePayload(rawBody);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const [w, b, f] = await Promise.all([
      callFuFire('calculate/western', payload, controller.signal),
      callFuFire('calculate/bazi', payload, controller.signal),
      callFuFire('calculate/fusion', payload, controller.signal),
    ]);
    const allOk = w.ok && b.ok && f.ok;
    const rawResult = {
      western: w.data,
      bazi:    b.data,
      fusion:  f.data,
      _meta: {
        input: payload,
        upstream_status: { western: w.status, bazi: b.status, fusion: f.status },
      },
    };
    // NOTE: /chart returns the raw FuFirE response for the legacy index.html frontend
    // which reads field names in the original API format (harmony_index, angles, etc.).
    // The ViewModel normalizer is applied only by /api/azodiac/profile (orchestrateFullProfile).
    return {
      httpStatus: allOk ? 200 : 502,
      body: rawResult,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Full profile aggregator ────────────────────────────────────────────────
async function orchestrateFullProfile(rawBody) {
  const payload = translatePayload(rawBody);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // Mandatory calls (parallel) — western, bazi, fusion must all succeed
    const [w, b, f] = await Promise.all([
      callFuFire('calculate/western', payload, controller.signal),
      callFuFire('calculate/bazi',    payload, controller.signal),
      callFuFire('calculate/fusion',  payload, controller.signal),
    ]);

    // Optional: wuxing standalone vector — absorb errors (fusion already carries wu-xing data)
    let wx = { data: null, ok: false, status: 'n/a' };
    try {
      const r = await callFuFire('calculate/wuxing', payload, controller.signal);
      if (r.ok) wx = r;
    } catch { /* wuxing may not be available on all deployments */ }

    // Optional: wuxing reference info (GET, no body needed)
    let wuxingInfo = { data: null };
    try {
      const url = new URL('info/wuxing', getFuFireBaseUrl());
      const r = await fetch(url, { headers: getFuFireHeaders(true), signal: controller.signal });
      wuxingInfo = { data: r.ok ? await r.json() : null };
    } catch { /* absorb — info endpoint is optional */ }

    // Optional: TST (Ten-Star Theory) — absorb 404/errors
    let tst = { data: null, ok: false };
    try {
      const r = await callFuFire('calculate/tst', payload, controller.signal);
      if (r.ok) tst = r;
    } catch { /* TST endpoint may not exist */ }

    const mandatoryOk = w.ok && b.ok && f.ok;
    const rawResult = {
      western: w.data,
      bazi:    b.data,
      fusion:  f.data,
      wuxing:  wx.data,
      tst:     tst.data,
      wuxing_info: wuxingInfo.data,
      _meta: {
        input: payload,
        upstream_status: {
          western: w.status,
          bazi:    b.status,
          fusion:  f.status,
          wuxing:  wx.ok ? wx.status : 'n/a',
          tst:     tst.ok ? 200 : 'n/a',
          wuxing_info: wuxingInfo.data ? 200 : 'n/a',
        },
        // Surface upstream errors for diagnostics when mandatory calls fail
        upstream_errors: mandatoryOk ? undefined : {
          western: w.ok ? null : `HTTP ${w.status}`,
          bazi:    b.ok ? null : `HTTP ${b.status}`,
          fusion:  f.ok ? null : `HTTP ${f.status}`,
        },
      },
    };
    return {
      httpStatus: mandatoryOk ? 200 : 502,
      body: normalizeAzodiacResult(rawResult),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Response helpers ──────────────────────────────────────────────────────
function endpointCatalog() {
  return FUFIRE_ENDPOINTS.map(({ method, path, category, description }) => ({
    method,
    path,
    localPath: path,
    proxyPath: `/api/fufire${path}`,
    category,
    description,
  }));
}

function sendJson(res, status, payload, requestOrigin = null) {
  const hasBody = status !== 204;
  const body = hasBody ? JSON.stringify(payload, null, 2) : '';
  const origin = corsOrigin(requestOrigin);
  const corsHeaders = origin
    ? {
        'access-control-allow-origin':  origin,
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization,x-api-key',
        ...(origin !== '*' ? { vary: 'Origin' } : {}),
      }
    : {};
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...corsHeaders,
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        reject(new Error(`Request body is larger than ${MAX_BODY_BYTES} bytes.`));
        req.destroy();
      }
    });
    req.on('end', () => resolveBody(body));
    req.on('error', reject);
  });
}

// ── /chart handler: validates JSON, orchestrates parallel FuFirE calls ────
async function handleChartRequest(req, res, requestOrigin = null) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {}, requestOrigin);
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed', allowed: ['POST'], endpoint: '/chart' }, requestOrigin);
  }
  let body = '';
  try {
    body = await readRequestBody(req);
    if (body) JSON.parse(body); // throws on bad JSON → 400
  } catch (error) {
    return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message }, requestOrigin);
  }
  try {
    const result = await orchestrateChart(body || '{}');
    sendJson(res, result.httpStatus, result.body, requestOrigin);
  } catch (error) {
    const isAbort = error.name === 'AbortError';
    sendJson(res, 502, {
      error: isAbort ? 'FuFirE upstream timeout' : 'FuFirE upstream unavailable',
      detail: error.message,
      hint: 'Check FUFIRE_BASE_URL and FUFIRE_API_KEY environment variables.',
    }, requestOrigin);
  }
}

// ── Geo-Cache (in-memory LRU, max 200 entries, TTL 24h) ──────────────────
export function makeGeoCache({ maxSize = 200, ttlMs = 86_400_000 } = {}) {
  const map = new Map(); // key → { value, expiresAt }
  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) { map.delete(key); return null; }
      // LRU: refresh position
      map.delete(key);
      map.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      if (map.size >= maxSize) {
        const firstKey = map.keys().next().value;
        map.delete(firstKey);
      }
      map.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}

// ── Geocode Rate Limiter (sliding window per IP) ──────────────────────────
export function geocodeRateLimiter({ maxPerMinute = 10 } = {}) {
  const windows = new Map(); // ip → timestamps[]
  return {
    allow(ip) {
      const now = Date.now();
      const cutoff = now - 60_000;
      const timestamps = (windows.get(ip) || []).filter(t => t > cutoff);
      if (timestamps.length >= maxPerMinute) return false;
      timestamps.push(now);
      windows.set(ip, timestamps);
      return true;
    },
  };
}

const GEO_CACHE   = makeGeoCache();
const GEO_LIMITER = geocodeRateLimiter();

// ── /api/geocode?q=… handler: Nominatim + timeapi.io ─────────────────────
async function handleGeocodeRequest(req, res, requestOrigin = null) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {}, requestOrigin);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return sendJson(res, 400, { error: 'Missing query parameter: q' }, requestOrigin);

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!GEO_LIMITER.allow(ip)) {
    return sendJson(res, 429, { error: 'Geocode rate limit exceeded. Max 10 requests/minute per IP.' }, requestOrigin);
  }

  // Cache lookup
  const cacheKey = q.toLowerCase();
  const cached = GEO_CACHE.get(cacheKey);
  if (cached) return sendJson(res, 200, cached, requestOrigin);

  try {
    const nominatimUrl =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
    const nominatimRes = await fetch(nominatimUrl, {
      headers: { 'user-agent': 'FuFirE-BirthChart/1.0 contact:ben.poersch@gmail.com' },
      signal: AbortSignal.timeout(8000),
    });
    if (!nominatimRes.ok) throw new Error(`Nominatim HTTP ${nominatimRes.status}`);
    const places = await nominatimRes.json();

    const results = await Promise.all(
      places.slice(0, 5).map(async (place) => {
        const lat = Number(place.lat);
        const lon = Number(place.lon);
        let tz = 'UTC';
        try {
          const tzRes = await fetch(
            `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (tzRes.ok) {
            const tzData = await tzRes.json();
            tz = tzData.timeZone || tzData.timezone || tz;
          }
        } catch { /* UTC fallback */ }
        return { display: place.display_name, lat, lon, tz, type: place.type || place.class };
      }),
    );
    GEO_CACHE.set(cacheKey, results);
    sendJson(res, 200, results, requestOrigin);
  } catch (error) {
    sendJson(res, 502, { error: 'Geocode upstream error', detail: error.message }, requestOrigin);
  }
}

// ── Direct proxy for all other FuFirE endpoints ───────────────────────────
function getProxyEndpoint(pathname) {
  const requestedPath = decodeURIComponent(pathname.replace(/^\/api\/fufire\/?/, ''))
    .replace(/^\/+|\/+$/g, '');
  return ENDPOINTS_BY_UPSTREAM_PATH.get(requestedPath) || null;
}

function allowedEndpointDescriptions() {
  return endpointCatalog().map(({ method, path, proxyPath, description }) => ({
    method, path, proxyPath, description,
  }));
}

async function proxyFuFireRequest(req, res, endpoint, requestOrigin = null) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {}, requestOrigin);
  if (req.method !== endpoint.method) {
    return sendJson(res, 405, {
      error: 'Method not allowed',
      allowed: [endpoint.method],
      endpoint: endpoint.path,
    }, requestOrigin);
  }

  let body = '';
  if (endpoint.method !== 'GET') {
    try {
      body = await readRequestBody(req);
      if (body) JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message }, requestOrigin);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const upstreamUrl = new URL(endpoint.upstreamPath, getFuFireBaseUrl());

  try {
    const upstream = await fetch(upstreamUrl, {
      method: endpoint.method,
      headers: getFuFireHeaders(endpoint.method === 'GET'),
      body: endpoint.method === 'GET' ? undefined : (body || '{}'),
      signal: controller.signal,
    });
    const responseText = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const origin = corsOrigin(requestOrigin);
    const corsH = origin
      ? { 'access-control-allow-origin': origin, ...(origin !== '*' ? { vary: 'Origin' } : {}) }
      : {};
    res.writeHead(upstream.status, {
      'content-type': contentType,
      'cache-control': 'no-store',
      ...corsH,
      'x-fufire-upstream': upstreamUrl.toString(),
    });
    res.end(responseText);
  } catch (error) {
    const isAbort = error.name === 'AbortError';
    sendJson(res, 502, {
      error: isAbort ? 'FuFirE upstream timeout' : 'FuFirE upstream unavailable',
      detail: error.message,
      upstream: upstreamUrl.toString(),
      endpoint: endpoint.path,
      hint: 'Verify FUFIRE_BASE_URL and FUFIRE_API_KEY. The UI can still run; calculations need the upstream API.',
    }, requestOrigin);
  } finally {
    clearTimeout(timer);
  }
}

function unknownFuFireEndpoint(res, requestOrigin = null) {
  return sendJson(res, 404, {
    error: 'Unknown FuFirE endpoint',
    allowedEndpoints: allowedEndpointDescriptions(),
  }, requestOrigin);
}

// ── Static file server ────────────────────────────────────────────────────
async function serveStatic(req, res, pathname) {
  const route = pathname === '/' ? '/index.html' : pathname;
  const safePath = normalize(decodeURIComponent(route)).replace(/^(\.\.[/\\])+/, '');
  const filePath = resolve(join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) {
    return sendJson(res, 404, { error: 'Not found' });
  }

  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME_TYPES[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  const stream = createReadStream(filePath);
  stream.on('error', () => { if (!res.writableEnded) res.end(); });
  stream.pipe(res);
}

// ── Main request handler ──────────────────────────────────────────────────
export async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const requestOrigin = req.headers.origin || null;

  // ── Infrastructure ──
  if (url.pathname === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'full-bazodiac-fufire',
      fufireBaseUrl: getFuFireBaseUrl(),
      endpoints: endpointCatalog(),
      allowedEndpoints: FUFIRE_ENDPOINTS.map((e) => e.upstreamPath),
    }, requestOrigin);
  }
  if (url.pathname === '/api/config') {
    return sendJson(res, 200, {
      fufireBaseUrl: getFuFireBaseUrl(),
      endpoints: endpointCatalog(),
      apiKeyConfigured: Boolean(FUFIRE_API_KEY),
    }, requestOrigin);
  }

  // ── Full profile aggregator ──
  if (url.pathname === '/api/azodiac/profile') {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {}, requestOrigin);
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed', allowed: ['POST'] }, requestOrigin);
    }
    let body = '';
    try {
      body = await readRequestBody(req);
      if (body) JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message }, requestOrigin);
    }
    try {
      const result = await orchestrateFullProfile(body || '{}');
      return sendJson(res, result.httpStatus, result.body, requestOrigin);
    } catch (error) {
      const isAbort = error.name === 'AbortError';
      return sendJson(res, 502, {
        error: isAbort ? 'Upstream timeout' : 'Upstream unavailable',
        detail: error.message,
        hint: 'Check FUFIRE_BASE_URL and FUFIRE_API_KEY environment variables.',
      }, requestOrigin);
    }
  }

  // ── Geocoder ──
  if (url.pathname === '/api/geocode') {
    return handleGeocodeRequest(req, res, requestOrigin);
  }

  // ── Proxy (allowlist) ──
  if (url.pathname.startsWith('/api/fufire')) {
    const endpoint = getProxyEndpoint(url.pathname);
    return endpoint ? proxyFuFireRequest(req, res, endpoint, requestOrigin) : unknownFuFireEndpoint(res, requestOrigin);
  }

  // ── Explicit shortcut routes ──
  // /chart is special: orchestrates multiple FuFirE calls server-side
  if (url.pathname === '/chart') {
    return handleChartRequest(req, res, requestOrigin);
  }
  // All other explicit endpoints proxy directly (body forwarded as-is)
  const explicitEndpoint = ENDPOINTS_BY_PATH.get(url.pathname);
  if (explicitEndpoint) {
    return proxyFuFireRequest(req, res, explicitEndpoint, requestOrigin);
  }

  // ── Static files ──
  return serveStatic(req, res, url.pathname);
}

// ── Entry point ───────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      sendJson(res, 500, { error: 'Internal server error', detail: error.message }, req.headers.origin || null);
    });
  });
  server.listen(PORT, () => {
    console.log(`FuFirE dashboard listening on :${PORT}`);
    console.log(`FuFirE upstream: ${getFuFireBaseUrl()}`);
    console.log(`API key configured: ${Boolean(FUFIRE_API_KEY)}`);
    console.log(`Endpoints: ${FUFIRE_ENDPOINTS.map((e) => `${e.method} ${e.path}`).join(', ')}`);
  });
}
