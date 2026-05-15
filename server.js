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
    return {
      httpStatus: allOk ? 200 : 502,
      body: {
        western: w.data,
        bazi: b.data,
        fusion: f.data,
        _meta: {
          input: payload,
          upstream_status: { western: w.status, bazi: b.status, fusion: f.status },
        },
      },
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

function sendJson(res, status, payload) {
  const hasBody = status !== 204;
  const body = hasBody ? JSON.stringify(payload, null, 2) : '';
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-api-key',
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
async function handleChartRequest(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed', allowed: ['POST'], endpoint: '/chart' });
  }
  let body = '';
  try {
    body = await readRequestBody(req);
    if (body) JSON.parse(body); // throws on bad JSON → 400
  } catch (error) {
    return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message });
  }
  try {
    const result = await orchestrateChart(body || '{}');
    sendJson(res, result.httpStatus, result.body);
  } catch (error) {
    const isAbort = error.name === 'AbortError';
    sendJson(res, 502, {
      error: isAbort ? 'FuFirE upstream timeout' : 'FuFirE upstream unavailable',
      detail: error.message,
      hint: 'Check FUFIRE_BASE_URL and FUFIRE_API_KEY environment variables.',
    });
  }
}

// ── /api/geocode?q=… handler: Nominatim + timeapi.io ─────────────────────
async function handleGeocodeRequest(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return sendJson(res, 400, { error: 'Missing query parameter: q' });

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
    sendJson(res, 200, results);
  } catch (error) {
    sendJson(res, 502, { error: 'Geocode upstream error', detail: error.message });
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

async function proxyFuFireRequest(req, res, endpoint) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== endpoint.method) {
    return sendJson(res, 405, {
      error: 'Method not allowed',
      allowed: [endpoint.method],
      endpoint: endpoint.path,
    });
  }

  let body = '';
  if (endpoint.method !== 'GET') {
    try {
      body = await readRequestBody(req);
      if (body) JSON.parse(body);
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON request body', detail: error.message });
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
    res.writeHead(upstream.status, {
      'content-type': contentType,
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
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
    });
  } finally {
    clearTimeout(timer);
  }
}

function unknownFuFireEndpoint(res) {
  return sendJson(res, 404, {
    error: 'Unknown FuFirE endpoint',
    allowedEndpoints: allowedEndpointDescriptions(),
  });
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
  createReadStream(filePath).pipe(res);
}

// ── Main request handler ──────────────────────────────────────────────────
export async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // ── Infrastructure ──
  if (url.pathname === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'full-bazodiac-fufire',
      fufireBaseUrl: getFuFireBaseUrl(),
      endpoints: endpointCatalog(),
      allowedEndpoints: FUFIRE_ENDPOINTS.map((e) => e.upstreamPath),
    });
  }
  if (url.pathname === '/api/config') {
    return sendJson(res, 200, {
      fufireBaseUrl: getFuFireBaseUrl(),
      endpoints: endpointCatalog(),
      apiKeyConfigured: Boolean(FUFIRE_API_KEY),
    });
  }

  // ── Geocoder ──
  if (url.pathname === '/api/geocode') {
    return handleGeocodeRequest(req, res);
  }

  // ── Proxy (allowlist) ──
  if (url.pathname.startsWith('/api/fufire')) {
    const endpoint = getProxyEndpoint(url.pathname);
    return endpoint ? proxyFuFireRequest(req, res, endpoint) : unknownFuFireEndpoint(res);
  }

  // ── Explicit shortcut routes ──
  // /chart is special: orchestrates multiple FuFirE calls server-side
  if (url.pathname === '/chart') {
    return handleChartRequest(req, res);
  }
  // All other explicit endpoints proxy directly (body forwarded as-is)
  const explicitEndpoint = ENDPOINTS_BY_PATH.get(url.pathname);
  if (explicitEndpoint) {
    return proxyFuFireRequest(req, res, explicitEndpoint);
  }

  // ── Static files ──
  return serveStatic(req, res, url.pathname);
}

// ── Entry point ───────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      sendJson(res, 500, { error: 'Internal server error', detail: error.message });
    });
  });
  server.listen(PORT, () => {
    console.log(`FuFirE dashboard listening on :${PORT}`);
    console.log(`FuFirE upstream: ${getFuFireBaseUrl()}`);
    console.log(`API key configured: ${Boolean(FUFIRE_API_KEY)}`);
    console.log(`Endpoints: ${FUFIRE_ENDPOINTS.map((e) => `${e.method} ${e.path}`).join(', ')}`);
  });
}
