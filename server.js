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

const ENDPOINTS_BY_PATH = new Map(FUFIRE_ENDPOINTS.map((endpoint) => [endpoint.path, endpoint]));
const ENDPOINTS_BY_UPSTREAM_PATH = new Map(FUFIRE_ENDPOINTS.map((endpoint) => [endpoint.upstreamPath, endpoint]));

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
    'access-control-allow-headers': 'content-type,authorization',
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

function getProxyEndpoint(pathname) {
  const requestedPath = decodeURIComponent(pathname.replace(/^\/api\/fufire\/?/, '')).replace(/^\/+|\/+$/g, '');
  return ENDPOINTS_BY_UPSTREAM_PATH.get(requestedPath) || null;
}

function allowedEndpointDescriptions() {
  return endpointCatalog().map(({ method, path, proxyPath, description }) => ({
    method,
    path,
    proxyPath,
    description,
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
      headers: endpoint.method === 'GET'
        ? { accept: 'application/json' }
        : { 'content-type': 'application/json', accept: 'application/json' },
      body: endpoint.method === 'GET' ? undefined : body || '{}',
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
      hint: 'Verify FUFIRE_BASE_URL and Railway service networking. The UI can still run; calculations need the upstream API.',
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

export async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'full-bazodiac-fufire',
      fufireBaseUrl: getFuFireBaseUrl(),
      endpoints: endpointCatalog(),
      allowedEndpoints: FUFIRE_ENDPOINTS.map((endpoint) => endpoint.upstreamPath),
    });
  }
  if (url.pathname === '/api/config') {
    return sendJson(res, 200, {
      fufireBaseUrl: getFuFireBaseUrl(),
      endpoints: endpointCatalog(),
    });
  }
  if (url.pathname.startsWith('/api/fufire')) {
    const endpoint = getProxyEndpoint(url.pathname);
    return endpoint ? proxyFuFireRequest(req, res, endpoint) : unknownFuFireEndpoint(res);
  }
  const explicitEndpoint = ENDPOINTS_BY_PATH.get(url.pathname);
  if (explicitEndpoint) {
    return proxyFuFireRequest(req, res, explicitEndpoint);
  }
  return serveStatic(req, res, url.pathname);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      sendJson(res, 500, { error: 'Internal server error', detail: error.message });
    });
  });
  server.listen(PORT, () => {
    console.log(`FuFirE dashboard listening on :${PORT}`);
    console.log(`FuFirE upstream: ${getFuFireBaseUrl()}`);
    console.log(`FuFirE endpoints: ${FUFIRE_ENDPOINTS.map((endpoint) => `${endpoint.method} ${endpoint.path}`).join(', ')}`);
  });
}
