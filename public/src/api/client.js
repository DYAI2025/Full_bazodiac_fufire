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

export async function calculateSynastry(inputA, inputB) {
  return request('POST', '/api/azodiac/synastry', { personA: inputA, personB: inputB });
}

// Runs in production by default. Opt-out via window.__FUFIRE_FLAGS?.disableNoFakeDataGuard
// or env NOFAKE_GUARD_DISABLE=1 (for legacy fixtures that legitimately ship sample text).
//
// Signatures are tightened to user-visible demo *content* — bare words like
// "placeholder" or "random" appear in HTML attribute names / Math.random and
// would yield false positives when guarding rendered DOM.
const DUMMY_SIGNATURES = [
  'Lorem ipsum', 'Lorem Ipsum',
  'dummy data', 'dummy value', 'dummy text',
  'fake data',  'fake value',
  'placeholder text', 'Platzhaltertext',
  'test123',
  'TODO:', 'FIXME:', 'TBD:',
  'Beispieltext', 'Beispielwert', 'Mustermann',
  'Keine Beschreibung verfügbar',
];

export function noFakeDataGuard(data, label = '') {
  if (typeof window !== 'undefined' && window.__FUFIRE_FLAGS?.disableNoFakeDataGuard) return;
  if (typeof process !== 'undefined' && process.env?.NOFAKE_GUARD_DISABLE === '1') return;
  const str = JSON.stringify(data || '');
  for (const sig of DUMMY_SIGNATURES) {
    if (str.includes(sig)) {
      throw new Error(`[noFakeDataGuard] Dummy-Wert "${sig}" in "${label}" entdeckt — nur echte API-Daten erlaubt.`);
    }
  }
}

// Sprint smoke-fix A2 — math regression guard for the WuXing distribution.
// Pre-fix the codebase had three+ parallel WuXing read paths; CareerFinancePage
// rendered Holz/Feuer/Erde/Metall/Wasser percentages summing to ~194% because
// it consumed un-normalized wu_xing_vectors.bazi_pillars directly. After the
// single-source-of-truth fix every page renders distribution from
// enrichWuxing(profile) which is normalized to sum 1 (rounded to ~100 ±2).
//
// This guard fires *only* when a string contains a canonical 5-element WuXing
// %% sequence in order Holz → Feuer → Erde → Metall → Wasser with each
// element directly followed by a percentage. The strict ordering avoids
// false-positives on unrelated %% values (confidence bars, retention metrics,
// width:N% inline styles for non-WuXing UI) because those never share the
// in-order Holz…Wasser context.
//
// Disable hooks:
//   - window.__FUFIRE_FLAGS?.disableNoFakeMathGuard
//   - process.env.NOFAKE_GUARD_DISABLE === '1'
export function noFakeMathGuard(domString, label = '') {
  if (typeof window !== 'undefined' && window.__FUFIRE_FLAGS?.disableNoFakeMathGuard) return;
  if (typeof process !== 'undefined' && process.env?.NOFAKE_GUARD_DISABLE === '1') return;
  if (typeof domString !== 'string' || domString.length === 0) return;
  // 5-element-in-order WuXing %% pattern. Each element followed within ≤80
  // non-digit chars by a percentage; intervening markup between rows ≤500.
  const re = /Holz[^0-9]{0,80}(\d+)\s*%[\s\S]{0,500}?Feuer[^0-9]{0,80}(\d+)\s*%[\s\S]{0,500}?Erde[^0-9]{0,80}(\d+)\s*%[\s\S]{0,500}?Metall[^0-9]{0,80}(\d+)\s*%[\s\S]{0,500}?Wasser[^0-9]{0,80}(\d+)\s*%/;
  const m = domString.match(re);
  if (!m) return;
  const sum = [1, 2, 3, 4, 5].reduce((s, i) => s + Number(m[i]), 0);
  if (sum < 95 || sum > 105) {
    throw new Error(`[noFakeMathGuard] WuXing %% in "${label}" sum to ${sum}, must be ~100 ±5`);
  }
}
