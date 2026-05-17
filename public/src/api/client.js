// Typed API Client für Azodiac — alle Requests über diese Schicht
// Response Envelope: { endpoint, fetchedAt, ok, status, data, error }

const BASE = '';  // same-origin

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'accept': 'application/json' },
  };
  if (body !== null) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    let data = null;
    let error = null;
    try {
      data = await res.json();
    } catch (e) {
      error = 'Response war kein gültiges JSON';
    }
    if (!res.ok && !error) error = data?.error || `HTTP ${res.status}`;
    return { endpoint: path, fetchedAt, ok: res.ok && error === null, status: res.status, data, error };
  } catch (e) {
    return { endpoint: path, fetchedAt, ok: false, status: 0, data: null, error: e.message };
  }
}

export async function calculateProfile(input) {
  return request('POST', '/api/azodiac/profile', input);
}

export async function geocodePlace(q) {
  return request('GET', `/api/geocode?q=${encodeURIComponent(q)}`);
}

export async function getConfig() {
  return request('GET', '/api/config');
}

export async function getHealth() {
  return request('GET', '/health');
}

export async function getTransitNow() {
  return request('GET', '/transit/now');
}

export async function getTransitTimeline() {
  return request('GET', '/transit/timeline');
}

export async function getDailyExperience(birthInput) {
  return request('POST', '/api/azodiac/daily', birthInput);
}

export async function calculateFusion(input) {
  return request('POST', '/api/azodiac/fusion', input);
}

export function noFakeDataGuard(data, label = '') {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'development') return;
  const DUMMY_SIGNATURES = ['Lorem', 'dummy', 'fake', 'random', 'placeholder', 'test123'];
  const str = JSON.stringify(data || '');
  for (const sig of DUMMY_SIGNATURES) {
    if (str.includes(sig)) {
      throw new Error(`[noFakeDataGuard] Dummy-Wert "${sig}" in "${label}" entdeckt — nur echte API-Daten erlaubt.`);
    }
  }
}
