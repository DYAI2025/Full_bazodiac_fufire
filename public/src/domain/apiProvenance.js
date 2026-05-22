// public/src/domain/apiProvenance.js
//
// Combines static endpoint catalog, live health snapshot, and frontend
// consumer map into a uniform provenance list for MethodPage.
//
// Entry shape:
//   {
//     endpoint:  string,
//     method:    string,
//     source:    'config' | 'health' | 'live-check' | 'frontend-use',
//     status:    'known' | 'reachable' | 'fallback' | 'unused' | 'unknown',
//     consumers: string[]
//   }

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|authorization|bearer|password)/i;

/**
 * Derive status for a single endpoint based on the live health snapshot.
 * @param {string} endpoint
 * @param {object|null} health
 * @param {boolean} inCatalog
 * @returns {'known'|'reachable'|'fallback'|'unused'|'unknown'}
 */
export function deriveStatus(endpoint, health, inCatalog) {
  if (!inCatalog) return 'unknown';
  if (!health || typeof health !== 'object' || Object.keys(health).length === 0) {
    return 'unknown';
  }
  const fallbackList = Array.isArray(health.fallback_endpoints) ? health.fallback_endpoints : [];
  const liveList     = Array.isArray(health.endpoints)          ? health.endpoints          : [];
  if (fallbackList.includes(endpoint)) return 'fallback';
  if (health.upstream_ok === true && liveList.includes(endpoint)) return 'reachable';
  if (liveList.includes(endpoint)) return 'known';
  return 'known';
}

/**
 * Build provenance entries by merging catalog + health + consumerMap.
 * Catalog entries appear first in catalog order; consumer-only (unknown)
 * endpoints follow in alphabetical order.
 *
 * @param {Array<{endpoint:string,method:string}>} catalog
 * @param {object|null} health
 * @param {Record<string,string[]>} consumerMap
 * @returns {Array<object>}
 */
export function buildProvenance(catalog, health, consumerMap = {}) {
  const out  = [];
  const seen = new Set();

  for (const item of catalog || []) {
    const ep        = item.endpoint;
    const consumers = Array.isArray(consumerMap[ep]) ? [...consumerMap[ep]] : [];
    const status    = consumers.length === 0
      ? 'unused'
      : deriveStatus(ep, health, true);
    out.push({
      endpoint: ep,
      method:   item.method || 'GET',
      source:   status === 'unused' ? 'config' : (health ? 'health' : 'config'),
      status,
      consumers,
    });
    seen.add(ep);
  }

  // Endpoints referenced by frontend but absent from catalog → unknown
  const extras = Object.keys(consumerMap || {})
    .filter(ep => !seen.has(ep))
    .sort();

  for (const ep of extras) {
    out.push({
      endpoint:  ep,
      method:    'UNKNOWN',
      source:    'frontend-use',
      status:    'unknown',
      consumers: [...consumerMap[ep]],
    });
  }

  return out;
}

/**
 * Recursively redact sensitive values before rendering into the raw-data panel.
 * @param {unknown} input
 * @returns {unknown}
 */
export function redactSensitive(input) {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(redactSensitive);
  if (typeof input !== 'object') return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      out[key] = redactSensitive(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Canonical frontend consumer map.
 * Update when a page starts or stops calling an endpoint.
 */
export const FRONTEND_CONSUMERS = Object.freeze({
  '/api/azodiac/profile':  ['OverviewPage', 'PersonalityPage', 'CareerFinancePage'],
  '/api/azodiac/fusion':   ['LovePage', 'OverviewPage'],
  '/api/azodiac/synastry': ['SynastryPage'],
  '/api/azodiac/daily':    ['DailyPage'],
  '/api/geocode':          ['InputPage'],
  '/health':               ['MethodPage'],
  '/api/config':           ['MethodPage'],
});
