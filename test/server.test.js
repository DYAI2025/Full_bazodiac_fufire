import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { handleRequest } from '../server.js';

async function withServer(fn) {
  const server = createServer((req, res) => handleRequest(req, res));
  server.listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health endpoint exposes Railway and explicit FuFirE v3 endpoint catalog', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.fufireBaseUrl, 'https://bafe-production.up.railway.app/');
    assert.deepEqual(json.allowedEndpoints, [
      'chart',
      'calculate/western',
      'calculate/bazi',
      'calculate/fusion',
      'calculate/wuxing',
      'info/wuxing',
    ]);
    assert.deepEqual(
      json.endpoints.map(({ method, path }) => `${method} ${path}`),
      [
        'POST /chart',
        'POST /calculate/western',
        'POST /calculate/bazi',
        'POST /calculate/fusion',
        'POST /calculate/wuxing',
        'GET /info/wuxing',
      ],
    );
  });
});

test('root serves the live dashboard with explicit endpoints', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /FuFirE Live Dashboard/);
    assert.match(html, /POST \/calculate\/wuxing/);
    assert.match(html, /GET \/info\/wuxing/);
  });
});

test('explicit calculation routes reject invalid JSON before calling upstream', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/chart`, { method: 'POST', body: '{bad' });
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.error, 'Invalid JSON request body');
  });
});

test('explicit reference route enforces its GET method', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/info/wuxing`, { method: 'POST', body: '{}' });
    assert.equal(response.status, 405);
    const json = await response.json();
    assert.deepEqual(json.allowed, ['GET']);
    assert.equal(json.endpoint, '/info/wuxing');
  });
});

test('compatibility proxy validates FuFirE endpoint allowlist before forwarding', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/fufire/not-real`, { method: 'POST', body: '{}' });
    assert.equal(response.status, 404);
    const json = await response.json();
    assert.equal(json.error, 'Unknown FuFirE endpoint');
    assert.ok(json.allowedEndpoints.some(({ path }) => path === '/calculate/wuxing'));
  });
});


test('explicit v3 endpoints forward to configured upstream with v4 proxy hardening', async () => {
  const seen = [];
  const upstream = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, method: req.method, url: req.url }));
    });
  });
  upstream.listen(0);
  await once(upstream, 'listening');
  const previousBaseUrl = process.env.FUFIRE_BASE_URL;
  process.env.FUFIRE_BASE_URL = `http://127.0.0.1:${upstream.address().port}/`;

  try {
    await withServer(async (base) => {
      const response = await fetch(`${base}/calculate/wuxing`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planets: [] }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true, method: 'POST', url: '/calculate/wuxing' });
    });
  } finally {
    if (previousBaseUrl === undefined) delete process.env.FUFIRE_BASE_URL;
    else process.env.FUFIRE_BASE_URL = previousBaseUrl;
    upstream.close();
    await once(upstream, 'close');
  }

  assert.equal(seen.length, 1);
  assert.equal(seen[0].method, 'POST');
  assert.equal(seen[0].url, '/calculate/wuxing');
  assert.equal(seen[0].body, '{"planets":[]}');
});
