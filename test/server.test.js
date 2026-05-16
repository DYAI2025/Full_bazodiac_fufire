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
      'transit/now',
      'transit/timeline',
      'experience/bootstrap',
      'experience/daily',
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
        'GET /transit/now',
        'GET /transit/timeline',
        'POST /experience/bootstrap',
        'POST /experience/daily',
      ],
    );
  });
});

test('root serves the app shell', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Azodiac/);
    assert.match(html, /id="app"/);
    assert.match(html, /src\/app\.js/);
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

test('/api/azodiac/profile orchestrates western + bazi + fusion + wuxing against mock upstream', async () => {
  const seen = [];
  const upstream = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url });
      const responses = {
        '/calculate/western': { bodies: {}, houses: [], aspects: [] },
        '/calculate/bazi':    { pillars: {} },
        '/calculate/fusion':  { wu_xing_vectors: {}, coherence_index: 0.7 },
        '/calculate/wuxing':  { vector: {} },
        '/info/wuxing':       { planet_mapping: {} },
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(responses[req.url] ?? { ok: true }));
    });
  });
  upstream.listen(0);
  await once(upstream, 'listening');
  const prev = process.env.FUFIRE_BASE_URL;
  process.env.FUFIRE_BASE_URL = `http://127.0.0.1:${upstream.address().port}/`;

  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/azodiac/profile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: '1990-01-01', time: '12:00', lat: 48.0, lon: 11.0, tz: 'Europe/Berlin' }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      // ViewModel keys present
      assert.ok('western' in json);
      assert.ok('bazi' in json);
      assert.ok('fusion' in json);
      assert.ok('_meta' in json);
      assert.equal(json._meta.view_model_version, '1');
      // wuxing endpoint was called
      assert.ok(seen.some(s => s.url === '/calculate/wuxing'));
    });
  } finally {
    if (prev === undefined) delete process.env.FUFIRE_BASE_URL;
    else process.env.FUFIRE_BASE_URL = prev;
    upstream.close();
    await once(upstream, 'close');
  }
});

test('CORS allows * when FUFIRE_ALLOWED_ORIGINS is unset', async () => {
  const prev = process.env.FUFIRE_ALLOWED_ORIGINS;
  delete process.env.FUFIRE_ALLOWED_ORIGINS;
  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/health`, { headers: { origin: 'https://evil.example.com' } });
      assert.equal(res.headers.get('access-control-allow-origin'), '*');
    });
  } finally {
    if (prev !== undefined) process.env.FUFIRE_ALLOWED_ORIGINS = prev;
    else delete process.env.FUFIRE_ALLOWED_ORIGINS;
  }
});

test('CORS restricts to allowed origin when FUFIRE_ALLOWED_ORIGINS is set', async () => {
  const prev = process.env.FUFIRE_ALLOWED_ORIGINS;
  process.env.FUFIRE_ALLOWED_ORIGINS = 'https://bazodiac.space,https://app.bazodiac.space';
  try {
    await withServer(async (base) => {
      // Allowed origin → echo it back
      const res1 = await fetch(`${base}/health`, {
        headers: { origin: 'https://bazodiac.space' },
      });
      assert.equal(res1.headers.get('access-control-allow-origin'), 'https://bazodiac.space');

      // Unknown origin → no ACAO header or not the evil one
      const res2 = await fetch(`${base}/health`, {
        headers: { origin: 'https://evil.example.com' },
      });
      const acao = res2.headers.get('access-control-allow-origin');
      assert.ok(!acao || acao !== 'https://evil.example.com');
    });
  } finally {
    if (prev !== undefined) process.env.FUFIRE_ALLOWED_ORIGINS = prev;
    else delete process.env.FUFIRE_ALLOWED_ORIGINS;
  }
});

test('/chart: returns 400 when date is missing', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/chart`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 48.137, lon: 11.576, tz: 'Europe/Berlin' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some(e => e.includes('date')));
  });
});

test('/chart: returns 400 when lat is out of range', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/chart`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '1990-03-15', lat: 999, lon: 11.576 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.some(e => e.includes('lat')));
  });
});

test('/api/azodiac/profile: returns 400 when lon is missing', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '1990-03-15', lat: 48.0 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors.some(e => e.includes('lon')));
  });
});

test('/api/azodiac/profile: returns 400 when body is empty', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.length >= 3);
  });
});

test('/api/azodiac/daily: returns 400 when date is missing', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/daily`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: 48.137, lon: 11.576 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.some(e => e.includes('date')));
  });
});

test('/api/azodiac/daily: returns 405 for GET', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/azodiac/daily`);
    assert.equal(res.status, 405);
  });
});

test('/api/azodiac/daily orchestrates bootstrap → daily and returns 200 with western+eastern+fusion', async () => {
  const seen = [];
  const upstream = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url });
      const responses = {
        '/experience/bootstrap': {
          soulprint_sectors: new Array(12).fill(0.5),
          profile: { sun_sign: 'aries', day_master: 'Wasser-Ratte' },
        },
        '/experience/daily': {
          date: '2026-05-16',
          western: { summary: 'Guter Tag', themes: ['Klarheit'] },
          eastern: { summary: 'Holz-Energie', themes: ['Wachstum'] },
          fusion: { summary: 'Harmonisch', synthesis: 'Nutze den Moment', pushworthy: true },
        },
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(responses[req.url] ?? { ok: true }));
    });
  });
  upstream.listen(0);
  await once(upstream, 'listening');
  const prev = process.env.FUFIRE_BASE_URL;
  process.env.FUFIRE_BASE_URL = `http://127.0.0.1:${upstream.address().port}/`;

  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/azodiac/daily`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: '1990-03-15', time: '14:30', lat: 48.137, lon: 11.576, tz: 'Europe/Berlin' }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok('western' in json, 'western must be present');
      assert.ok('eastern' in json, 'eastern must be present');
      assert.ok('fusion' in json, 'fusion must be present');
      assert.ok('_meta' in json, '_meta must be present');
      assert.ok(json._meta.bootstrap_profile, 'bootstrap_profile must be in _meta');
    });
  } finally {
    if (prev === undefined) delete process.env.FUFIRE_BASE_URL;
    else process.env.FUFIRE_BASE_URL = prev;
    upstream.close();
    await once(upstream, 'close');
  }

  assert.equal(seen.length, 2);
  assert.equal(seen[0].url, '/experience/bootstrap');
  assert.equal(seen[1].url, '/experience/daily');
});

test('/api/azodiac/daily returns 502 when bootstrap fails', async () => {
  const upstream = createServer((req, res) => {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream exploded' }));
  });
  upstream.listen(0);
  await once(upstream, 'listening');
  const prev = process.env.FUFIRE_BASE_URL;
  process.env.FUFIRE_BASE_URL = `http://127.0.0.1:${upstream.address().port}/`;

  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/azodiac/daily`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: '1990-03-15', time: '14:30', lat: 48.137, lon: 11.576, tz: 'Europe/Berlin' }),
      });
      assert.equal(res.status, 502);
      const json = await res.json();
      assert.ok(json.error.toLowerCase().includes('bootstrap'), `error should mention bootstrap, got: ${json.error}`);
    });
  } finally {
    if (prev === undefined) delete process.env.FUFIRE_BASE_URL;
    else process.env.FUFIRE_BASE_URL = prev;
    upstream.close();
    await once(upstream, 'close');
  }
});

test('/api/azodiac/daily returns 502 when daily experience call fails', async () => {
  let callCount = 0;
  const upstream = createServer((req, res) => {
    callCount++;
    if (callCount === 1) {
      // bootstrap succeeds
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ soulprint_sectors: new Array(12).fill(0), profile: {} }));
    } else {
      // daily fails
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'daily unavailable' }));
    }
  });
  upstream.listen(0);
  await once(upstream, 'listening');
  const prev = process.env.FUFIRE_BASE_URL;
  process.env.FUFIRE_BASE_URL = `http://127.0.0.1:${upstream.address().port}/`;

  try {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/azodiac/daily`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: '1990-03-15', time: '14:30', lat: 48.137, lon: 11.576, tz: 'Europe/Berlin' }),
      });
      assert.equal(res.status, 502);
      const json = await res.json();
      assert.ok(json.error.toLowerCase().includes('daily'), `error should mention daily, got: ${json.error}`);
    });
  } finally {
    if (prev === undefined) delete process.env.FUFIRE_BASE_URL;
    else process.env.FUFIRE_BASE_URL = prev;
    upstream.close();
    await once(upstream, 'close');
  }
});
