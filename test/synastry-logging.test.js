import { describe, it } from 'node:test';
import assert from 'node:assert';
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

describe('Synastry fusion failure logging', () => {
  it('should log warning when fusion calculation fails', async () => {
    // Note: This test modifies process.env.FUFIRE_BASE_URL global state.
    // The cleanup in the finally block ensures proper restoration.
    // Spy on console.warn
    const originalWarn = console.warn;
    const warnCalls = [];
    console.warn = (...args) => {
      warnCalls.push(args);
      originalWarn(...args);
    };

    try {
      // Set up mock upstream that succeeds for western/bazi but closes connection for fusion
      const upstream = createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname.includes('fusion')) {
          // Close the socket immediately to trigger a deterministic network error
          req.socket.destroy();
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ bodies: {}, pillars: {} }));
        }
      });
      upstream.listen(0);
      await once(upstream, 'listening');
      const upstreamPort = upstream.address().port;

      // Override FUFIRE_BASE_URL to point to mock upstream
      const originalBaseUrl = process.env.FUFIRE_BASE_URL;
      process.env.FUFIRE_BASE_URL = `http://127.0.0.1:${upstreamPort}`;

      try {
        await withServer(async (base) => {
          // Add timeout to prevent test hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(`${base}/api/azodiac/synastry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personA: {
                date: '1990-01-01',
                time: '12:00',
                lat: 52.52,
                lon: 13.405,
                tz: 'Europe/Berlin'
              },
              personB: {
                date: '1995-06-15',
                time: '14:30',
                lat: 48.8566,
                lon: 2.3522,
                tz: 'Europe/Paris'
              }
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          // Request should succeed (fusion failure is non-blocking)
          assert.equal(response.status, 200);
        });

        // Verify console.warn was called with fusion failure message
        assert.ok(warnCalls.length > 0, 'console.warn should be called');
        const fusionWarnCall = warnCalls.find(call =>
          call.length >= 2 &&
          call[0] === 'Fusion calculation failed, continuing without it:' &&
          typeof call[1] === 'string'
        );
        assert.ok(fusionWarnCall, 'console.warn should be called with fusion failure message in format: "Fusion calculation failed, continuing without it:", error_message');

      } finally {
        // Restore original FUFIRE_BASE_URL (delete if it was undefined)
        if (originalBaseUrl === undefined) delete process.env.FUFIRE_BASE_URL;
        else process.env.FUFIRE_BASE_URL = originalBaseUrl;
        upstream.close();
        await once(upstream, 'close');
      }
    } finally {
      // Restore original console.warn
      console.warn = originalWarn;
    }
  });
});