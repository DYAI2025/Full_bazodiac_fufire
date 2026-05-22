# I5 — API-/Daten-Provenienz Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Iterationsziel:** "Methode" und "Daten" werden von Debug-Ansichten zu pruefbaren Provenienzseiten. Es wird sichtbar: welcher Endpoint existiert, welcher live erreichbar ist, welcher von welcher UI-Seite genutzt wird, welche Daten aus Fixture/Fallback/live stammen. API-/Daten-Provenienz pruefbar machen. Sichtbarer Nutzer-Unterschied: Nutzer/PO sieht, welche Daten echt, live, fallback oder fehlend sind. Abschluss nur wenn Methode/Daten-Seite Code-Katalog, Upstream-Status und UI-Nutzung trennt.

**Goal:** Methode-Seite von Debug-Roh zu Provenienzkonsole: Endpoint-Katalog, Upstream-Live-Status, UI-Nutzung und Rohdaten getrennt sichtbar — Nutzer erkennt sofort, welche Werte echt/live/fallback/fehlend sind.

**Architecture:** Reines Frontend-Modul `apiProvenance.js` kombiniert statischen Endpoint-Katalog (aus /api/config + manueller Consumer-Map) mit Live-Health-Snapshot (/health). MethodPage rendert Tabelle + Status-Pills + einklappbare Rohdaten. server.js bleibt unverändert außer /api/config liefert Katalog nicht — dann minimaler Fix, dokumentiert.

**Tech Stack:** Vanilla ESM, fetch, native <details>, node --test mit Stub-Server, Playwright Live.

**Master Plan:** `docs/plans/2026-05-22-frontend-correction-iterations.md`
**Reference Spec:** `docs/plans/full_plan_to_fix40.md`
**Prereq:** I0 (Playwright), I1 (Design-System), I2 (RollingText optional).

---

## TASK-I5-001: API-Provenienzmodell test-first

**Iterationsziel-Bezug:** Liefert die reine Datenstruktur, die Trennung von Code-Katalog, Live-Status und UI-Nutzung überhaupt erst pruefbar macht. Ohne diesen Baustein bleibt die Methode-Seite eine Debug-Ansicht.

**Requirements:** REQ-F-005 (Trennung Code/Status/Usage/Raw), REQ-D-002 (Existenz ≠ Nutzung), REQ-S-001 (keine Secrets im Modell).

**Files:**
- create `public/src/domain/apiProvenance.js`
- create `test/api-provenance.test.js`

### Step 1.1 — Test-File anlegen (RED)

Erstelle `test/api-provenance.test.js` mit folgendem Inhalt:

```javascript
// test/api-provenance.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProvenance, deriveStatus, redactSensitive } from '../public/src/domain/apiProvenance.js';

const catalog = [
  { endpoint: '/api/azodiac/profile', method: 'POST' },
  { endpoint: '/api/azodiac/fusion', method: 'POST' },
  { endpoint: '/api/azodiac/synastry', method: 'POST' },
  { endpoint: '/api/azodiac/daily', method: 'POST' },
  { endpoint: '/health', method: 'GET' },
  { endpoint: '/api/config', method: 'GET' },
];

const healthOk = {
  ok: true,
  upstream_ok: true,
  fufire_base_url: 'https://bafe-production.up.railway.app/',
  endpoints: ['/api/azodiac/profile', '/api/azodiac/fusion', '/api/azodiac/synastry'],
  fallback_endpoints: [],
};

const healthFallback = {
  ok: true,
  upstream_ok: false,
  fufire_base_url: 'https://bafe-production.up.railway.app/',
  endpoints: [],
  fallback_endpoints: ['/api/azodiac/profile', '/api/azodiac/fusion'],
};

const consumerMap = {
  '/api/azodiac/profile': ['OverviewPage', 'PersonalityPage'],
  '/api/azodiac/fusion': ['LovePage'],
  '/api/azodiac/synastry': ['SynastryPage'],
  '/api/azodiac/daily': ['DailyPage'],
  '/health': ['MethodPage'],
  '/api/config': ['MethodPage'],
};

test('buildProvenance: returns entry per catalog endpoint', () => {
  const entries = buildProvenance(catalog, healthOk, consumerMap);
  assert.equal(entries.length, catalog.length);
  for (const e of entries) {
    assert.ok(e.endpoint);
    assert.ok(e.method);
    assert.ok(Array.isArray(e.consumers));
    assert.ok(['known', 'reachable', 'fallback', 'unused', 'unknown'].includes(e.status));
    assert.ok(['config', 'health', 'live-check', 'frontend-use'].includes(e.source));
  }
});

test('buildProvenance: reachable when upstream_ok and endpoint in health.endpoints', () => {
  const entries = buildProvenance(catalog, healthOk, consumerMap);
  const profile = entries.find(e => e.endpoint === '/api/azodiac/profile');
  assert.equal(profile.status, 'reachable');
  assert.deepEqual(profile.consumers.sort(), ['OverviewPage', 'PersonalityPage'].sort());
});

test('buildProvenance: fallback when health flags endpoint as fallback', () => {
  const entries = buildProvenance(catalog, healthFallback, consumerMap);
  const profile = entries.find(e => e.endpoint === '/api/azodiac/profile');
  assert.equal(profile.status, 'fallback');
});

test('buildProvenance: flags unused endpoint (in catalog, not in consumerMap)', () => {
  const sparseConsumer = { '/api/azodiac/profile': ['OverviewPage'] };
  const entries = buildProvenance(catalog, healthOk, sparseConsumer);
  const fusion = entries.find(e => e.endpoint === '/api/azodiac/fusion');
  assert.equal(fusion.status, 'unused');
  assert.deepEqual(fusion.consumers, []);
});

test('buildProvenance: unknown when not in catalog but referenced by consumerMap', () => {
  const extraConsumer = {
    ...consumerMap,
    '/api/azodiac/ghost': ['MysteryPage'],
  };
  const entries = buildProvenance(catalog, healthOk, extraConsumer);
  const ghost = entries.find(e => e.endpoint === '/api/azodiac/ghost');
  assert.ok(ghost, 'ghost endpoint should still be present');
  assert.equal(ghost.status, 'unknown');
  assert.equal(ghost.source, 'frontend-use');
});

test('buildProvenance: never reports "ok"/"reachable" for unknown endpoints', () => {
  const entries = buildProvenance(catalog, healthOk, { '/api/ghost': ['GhostPage'] });
  const ghost = entries.find(e => e.endpoint === '/api/ghost');
  assert.notEqual(ghost.status, 'reachable');
  assert.notEqual(ghost.status, 'known');
});

test('deriveStatus: returns "unknown" on null/empty health', () => {
  assert.equal(deriveStatus('/api/azodiac/profile', null, true), 'unknown');
  assert.equal(deriveStatus('/api/azodiac/profile', {}, true), 'unknown');
});

test('redactSensitive: strips tokens/keys/secrets from raw object', () => {
  const raw = {
    endpoint: '/api/config',
    api_key: 'sk-secret-123',
    token: 'bearer-xyz',
    Authorization: 'Bearer abc',
    fufire_base_url: 'https://bafe-production.up.railway.app/',
    nested: { secret: 'nope', safe: 'visible' },
  };
  const safe = redactSensitive(raw);
  assert.equal(safe.api_key, '[REDACTED]');
  assert.equal(safe.token, '[REDACTED]');
  assert.equal(safe.Authorization, '[REDACTED]');
  assert.equal(safe.fufire_base_url, 'https://bafe-production.up.railway.app/');
  assert.equal(safe.nested.secret, '[REDACTED]');
  assert.equal(safe.nested.safe, 'visible');
});

test('buildProvenance: deterministic order (catalog first, then unknowns alphabetical)', () => {
  const consumer = {
    ...consumerMap,
    '/api/zzz/late': ['LatePage'],
    '/api/aaa/early': ['EarlyPage'],
  };
  const entries = buildProvenance(catalog, healthOk, consumer);
  const catalogEndpoints = catalog.map(c => c.endpoint);
  const orderedEndpoints = entries.map(e => e.endpoint);
  // catalog block first
  assert.deepEqual(orderedEndpoints.slice(0, catalog.length), catalogEndpoints);
  // unknowns sorted alphabetically after
  const tail = orderedEndpoints.slice(catalog.length);
  assert.deepEqual(tail, ['/api/aaa/early', '/api/zzz/late']);
});
```

### Step 1.2 — `apiProvenance.js` implementieren (GREEN)

Erstelle `public/src/domain/apiProvenance.js`:

```javascript
// public/src/domain/apiProvenance.js
//
// Combines:
//   - static endpoint catalog (from server.js / /api/config)
//   - live health snapshot (from /health)
//   - frontend consumer map (which page uses which endpoint)
// into a uniform provenance list rendered by MethodPage.
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
 * Derive a status for a single endpoint based on the live health snapshot.
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
  const liveList = Array.isArray(health.endpoints) ? health.endpoints : [];
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
  const out = [];
  const seen = new Set();

  for (const item of catalog || []) {
    const ep = item.endpoint;
    const consumers = Array.isArray(consumerMap[ep]) ? [...consumerMap[ep]] : [];
    const status = consumers.length === 0
      ? 'unused'
      : deriveStatus(ep, health, true);
    out.push({
      endpoint: ep,
      method: item.method || 'GET',
      source: status === 'unused' ? 'config' : (health ? 'health' : 'config'),
      status,
      consumers,
    });
    seen.add(ep);
  }

  // Endpoints referenced by frontend but not present in catalog → unknown
  const extras = Object.keys(consumerMap || {})
    .filter(ep => !seen.has(ep))
    .sort();

  for (const ep of extras) {
    out.push({
      endpoint: ep,
      method: 'UNKNOWN',
      source: 'frontend-use',
      status: 'unknown',
      consumers: [...consumerMap[ep]],
    });
  }

  return out;
}

/**
 * Recursively redact sensitive values before rendering them into the
 * <details> raw-data panel. Never expose tokens/keys to the DOM.
 *
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
 * Canonical frontend consumer map. Update whenever a page starts
 * or stops calling an endpoint.
 */
export const FRONTEND_CONSUMERS = Object.freeze({
  '/api/azodiac/profile': ['OverviewPage', 'PersonalityPage', 'CareerFinancePage'],
  '/api/azodiac/fusion': ['LovePage', 'OverviewPage'],
  '/api/azodiac/synastry': ['SynastryPage'],
  '/api/azodiac/daily': ['DailyPage'],
  '/api/geocode': ['InputPage'],
  '/health': ['MethodPage'],
  '/api/config': ['MethodPage'],
});
```

### Step 1.3 — Tests laufen lassen

```bash
node --test test/api-provenance.test.js
```

Erwartet: 9/9 grün. Falls rot → niemals "fix" via Status-Erfindung; nur das Modell darf Status setzen, nicht der Renderer.

---

## TASK-I5-002: MethodPage redesign

**Iterationsziel-Bezug:** Übersetzt das Modell aus I5-001 in eine pruefbare Oberfläche. Methode wechselt von Debug-Roh zu vier klar getrennten Sektionen: Was passiert / Provenienz-Tabelle / Live-Status / UI-Nutzung / Rohdaten.

**Requirements:** REQ-F-005, REQ-D-002, REQ-A-001 (Backend bleibt), REQ-S-001.

**Files:**
- modify `public/src/pages/MethodPage.js`
- modify `public/src/styles/main.css`
- create `test/method-page.test.js`

### Step 2.1 — Page-Test test-first (RED)

Erstelle `test/method-page.test.js`:

```javascript
// test/method-page.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderHero,
  renderProvenanceTable,
  renderLiveStatus,
  renderUsage,
  renderRawData,
  statusPillClass,
} from '../public/src/pages/MethodPage.js';

test('statusPillClass: maps each status to a stable class', () => {
  assert.equal(statusPillClass('reachable'), 'pill pill--ok');
  assert.equal(statusPillClass('fallback'), 'pill pill--warn');
  assert.equal(statusPillClass('unused'), 'pill pill--muted');
  assert.equal(statusPillClass('unknown'), 'pill pill--unknown');
  assert.equal(statusPillClass('known'), 'pill pill--neutral');
});

test('renderHero: returns string with hero markers and rolling-text hook', () => {
  const html = renderHero();
  assert.match(html, /method-hero/);
  assert.match(html, /data-rolling-text/);
  assert.match(html, /API-?\s?\/?\s?Daten-?Provenienz/i);
});

test('renderProvenanceTable: renders one row per entry with status pill + consumers', () => {
  const entries = [
    { endpoint: '/api/azodiac/profile', method: 'POST', source: 'health', status: 'reachable', consumers: ['OverviewPage'] },
    { endpoint: '/api/azodiac/ghost', method: 'UNKNOWN', source: 'frontend-use', status: 'unknown', consumers: ['GhostPage'] },
  ];
  const html = renderProvenanceTable(entries);
  assert.match(html, /<table[^>]*provenance-table/);
  assert.match(html, /\/api\/azodiac\/profile/);
  assert.match(html, /\/api\/azodiac\/ghost/);
  assert.match(html, /pill--ok/);
  assert.match(html, /pill--unknown/);
  assert.match(html, /OverviewPage/);
  assert.match(html, /GhostPage/);
});

test('renderProvenanceTable: empty input still renders table head (no crash)', () => {
  const html = renderProvenanceTable([]);
  assert.match(html, /<table[^>]*provenance-table/);
  assert.match(html, /Endpoint/);
});

test('renderLiveStatus: shows upstream_ok pill and base url', () => {
  const html = renderLiveStatus({ ok: true, upstream_ok: true, fufire_base_url: 'https://example.test/' });
  assert.match(html, /pill--ok/);
  assert.match(html, /example\.test/);
});

test('renderLiveStatus: warn pill when upstream_ok=false', () => {
  const html = renderLiveStatus({ ok: true, upstream_ok: false, fufire_base_url: 'https://example.test/' });
  assert.match(html, /pill--warn/);
});

test('renderLiveStatus: gracefully handles null health', () => {
  const html = renderLiveStatus(null);
  assert.match(html, /pill--unknown/);
  assert.match(html, /nicht erreichbar|unbekannt/i);
});

test('renderUsage: groups by page name', () => {
  const entries = [
    { endpoint: '/api/azodiac/profile', method: 'POST', source: 'health', status: 'reachable', consumers: ['OverviewPage', 'PersonalityPage'] },
    { endpoint: '/api/azodiac/fusion', method: 'POST', source: 'health', status: 'reachable', consumers: ['LovePage'] },
  ];
  const html = renderUsage(entries);
  assert.match(html, /OverviewPage/);
  assert.match(html, /PersonalityPage/);
  assert.match(html, /LovePage/);
  assert.match(html, /\/api\/azodiac\/profile/);
});

test('renderRawData: wraps in <details> with closed default and redacts secrets', () => {
  const raw = { api_key: 'sk-secret', fufire_base_url: 'https://x.test/' };
  const html = renderRawData(raw);
  assert.match(html, /<details(?![^>]*\bopen\b)/);
  assert.match(html, /\[REDACTED\]/);
  assert.doesNotMatch(html, /sk-secret/);
});
```

### Step 2.2 — MethodPage implementieren (GREEN)

Schreibe `public/src/pages/MethodPage.js`:

```javascript
// public/src/pages/MethodPage.js
import { apiClient } from '../api/client.js';
import { PageShell } from '../components/PageShell.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { LuxuryCard } from '../components/LuxuryCard.js';
import { mountRollingText } from '../components/RollingText.js';
import {
  buildProvenance,
  redactSensitive,
  FRONTEND_CONSUMERS,
} from '../domain/apiProvenance.js';

// ---------- Pure render helpers (exported for tests) ----------

export function statusPillClass(status) {
  switch (status) {
    case 'reachable': return 'pill pill--ok';
    case 'fallback':  return 'pill pill--warn';
    case 'unused':    return 'pill pill--muted';
    case 'unknown':   return 'pill pill--unknown';
    case 'known':
    default:          return 'pill pill--neutral';
  }
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderHero() {
  return `
    <header class="method-hero">
      <h1 class="method-hero__title" data-rolling-text="API-/Daten-Provenienz">
        API-/Daten-Provenienz
      </h1>
      <p class="method-hero__sub">
        Welche Endpoints existieren, welche sind live erreichbar,
        welche Seite nutzt was — und welche Rohdaten gibt der Server gerade aus.
      </p>
    </header>
  `;
}

export function renderProvenanceTable(entries) {
  const rows = (entries || []).map(e => `
    <tr>
      <td class="mono">${esc(e.method)}</td>
      <td class="mono">${esc(e.endpoint)}</td>
      <td><span class="${statusPillClass(e.status)}">${esc(e.status)}</span></td>
      <td class="mono small">${esc(e.source)}</td>
      <td>${(e.consumers || []).map(c => `<code>${esc(c)}</code>`).join(', ') || '<span class="muted">—</span>'}</td>
    </tr>
  `).join('');

  return `
    <table class="provenance-table">
      <thead>
        <tr>
          <th>Method</th>
          <th>Endpoint</th>
          <th>Status</th>
          <th>Quelle</th>
          <th>Consumers</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function renderLiveStatus(health) {
  if (!health || typeof health !== 'object') {
    return `
      <div class="live-status">
        <span class="${statusPillClass('unknown')}">unbekannt</span>
        <p class="muted">Health-Endpoint nicht erreichbar.</p>
      </div>
    `;
  }
  const ok = health.upstream_ok === true;
  const pill = ok ? statusPillClass('reachable') : statusPillClass('fallback');
  const label = ok ? 'live' : 'fallback / offline';
  const baseUrl = esc(health.fufire_base_url || 'n/a');
  return `
    <div class="live-status">
      <span class="${pill}">${esc(label)}</span>
      <p class="mono small">Upstream: ${baseUrl}</p>
      <p class="muted small">Liefert /health bei Bedarf <code>endpoints</code> und <code>fallback_endpoints</code>.</p>
    </div>
  `;
}

export function renderUsage(entries) {
  const byPage = new Map();
  for (const e of entries || []) {
    for (const consumer of (e.consumers || [])) {
      if (!byPage.has(consumer)) byPage.set(consumer, []);
      byPage.get(consumer).push(e.endpoint);
    }
  }
  if (byPage.size === 0) {
    return `<p class="muted">Keine UI-Nutzung erfasst.</p>`;
  }
  const items = [...byPage.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([page, eps]) => `
      <li>
        <strong>${esc(page)}</strong>
        <ul class="usage-list">${eps.map(ep => `<li class="mono">${esc(ep)}</li>`).join('')}</ul>
      </li>
    `).join('');
  return `<ul class="usage-pages">${items}</ul>`;
}

export function renderRawData(raw) {
  const safe = redactSensitive(raw);
  const json = JSON.stringify(safe, null, 2);
  return `
    <details class="raw-data">
      <summary>Rohdaten anzeigen (redacted)</summary>
      <pre class="mono small">${esc(json)}</pre>
    </details>
  `;
}

// ---------- Page mount ----------

export async function MethodPage(root) {
  root.innerHTML = PageShell({
    body: `
      ${renderHero()}
      <section class="method-section">
        ${SectionHeader({ title: 'Was hier passiert', subtitle: 'Kuratierte Erklärung der Datenflüsse' })}
        ${LuxuryCard({ body: `
          <p>Diese Seite zeigt, woher Werte stammen: aus dem Live-Backend, aus dem
          Fallback-Pfad, oder aus statischen Beispieldaten. Nichts wird hier "schöngerechnet".</p>
        `})}
      </section>

      <section class="method-section">
        ${SectionHeader({ title: 'API-Provenienz', subtitle: 'Katalog + Live-Status + Consumer' })}
        <div data-slot="provenance-table">${renderProvenanceTable([])}</div>
      </section>

      <section class="method-section">
        ${SectionHeader({ title: 'Live-Status', subtitle: 'aus /health' })}
        <div data-slot="live-status">${renderLiveStatus(null)}</div>
      </section>

      <section class="method-section">
        ${SectionHeader({ title: 'UI-Nutzung', subtitle: 'Welche Seite ruft welchen Endpoint' })}
        <div data-slot="usage">${renderUsage([])}</div>
      </section>

      <section class="method-section">
        ${SectionHeader({ title: 'Rohdaten', subtitle: 'redacted, einklappbar' })}
        <div data-slot="raw"></div>
      </section>
    `,
  });

  // Rolling text on the hero title (I2 component)
  const heroTitle = root.querySelector('[data-rolling-text]');
  if (heroTitle && typeof mountRollingText === 'function') {
    try { mountRollingText(heroTitle); } catch (_) { /* non-fatal */ }
  }

  // Fetch /health and /api/config in parallel
  let health = null;
  let config = null;
  try {
    [health, config] = await Promise.all([
      apiClient.getHealth().catch(() => null),
      apiClient.getConfig().catch(() => null),
    ]);
  } catch (err) {
    console.warn('[MethodPage] live check failed', err);
  }

  const catalog = Array.isArray(config?.endpoints)
    ? config.endpoints
    : Array.isArray(health?.endpoints_catalog)
      ? health.endpoints_catalog
      : [];

  const entries = buildProvenance(catalog, health, FRONTEND_CONSUMERS);

  root.querySelector('[data-slot="provenance-table"]').innerHTML = renderProvenanceTable(entries);
  root.querySelector('[data-slot="live-status"]').innerHTML = renderLiveStatus(health);
  root.querySelector('[data-slot="usage"]').innerHTML = renderUsage(entries);
  root.querySelector('[data-slot="raw"]').innerHTML = renderRawData({ health, config });
}

export default MethodPage;
```

### Step 2.3 — `apiClient` erweitern (falls noch nicht vorhanden)

In `public/src/api/client.js` sicherstellen:

```javascript
// Append to public/src/api/client.js if missing
export const apiClient = {
  // ... existing methods ...
  async getHealth() {
    const r = await fetch('/health');
    if (!r.ok) throw new Error(`health ${r.status}`);
    return r.json();
  },
  async getConfig() {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error(`config ${r.status}`);
    return r.json();
  },
};
```

Falls `apiClient` schon ein anderes Shape hat, die zwei Methoden in der vorhandenen Struktur ergänzen — nicht parallele Exports anlegen.

### Step 2.4 — CSS ergänzen

In `public/src/styles/main.css` anhängen (Vars aus I1 nutzen):

```css
/* === MethodPage — I5 === */
.method-hero { padding: var(--space-6) 0 var(--space-4); border-bottom: 1px solid var(--color-border); }
.method-hero__title { font-family: var(--font-display); font-size: var(--fs-h1); margin: 0 0 var(--space-2); }
.method-hero__sub { color: var(--color-fg-muted); max-width: 60ch; }

.method-section { margin: var(--space-6) 0; }

.provenance-table {
  width: 100%; border-collapse: collapse; font-size: var(--fs-sm);
}
.provenance-table th, .provenance-table td {
  text-align: left; padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}
.provenance-table th { color: var(--color-fg-muted); font-weight: 500; }
.provenance-table .mono { font-family: var(--font-mono); }
.provenance-table .small { font-size: 12px; }
.provenance-table .muted { color: var(--color-fg-muted); }

.pill {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 12px; font-family: var(--font-mono); letter-spacing: 0.02em;
}
.pill--ok      { background: var(--color-ok-bg, #0a3); color: #fff; }
.pill--warn    { background: var(--color-warn-bg, #c80); color: #fff; }
.pill--muted   { background: var(--color-muted-bg, #444); color: #ddd; }
.pill--unknown { background: var(--color-err-bg, #b22); color: #fff; }
.pill--neutral { background: var(--color-fg-muted); color: var(--color-bg); }

.live-status { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.usage-pages { list-style: none; padding: 0; display: grid; gap: var(--space-3); }
.usage-list  { margin: var(--space-1) 0 0 var(--space-4); }

.raw-data { margin-top: var(--space-3); }
.raw-data summary { cursor: pointer; color: var(--color-fg-muted); }
.raw-data pre { overflow: auto; max-height: 480px; padding: var(--space-3); background: var(--color-surface-2); border-radius: var(--radius-md); }

@media (max-width: 720px) {
  .provenance-table thead { display: none; }
  .provenance-table tr { display: grid; grid-template-columns: 1fr; padding: var(--space-2) 0; }
  .provenance-table td { border-bottom: none; padding: 2px 0; }
}
```

### Step 2.5 — Tests laufen lassen

```bash
node --test test/method-page.test.js
```

---

## TASK-I5-003: API-Live-Check sicher

**Iterationsziel-Bezug:** Schliesst den Loop zwischen Modell, Renderer und realem Backend. Erst hier wird sichtbar, dass die Tabelle wirklich Live-Daten widerspiegelt und nicht nur statisch erfundenen Katalog zeigt.

**Requirements:** REQ-F-005, REQ-A-001 (Backend nur minimal, dokumentiert), REQ-S-001 (keine Secrets im Raw-Panel).

**Files:**
- modify `public/src/pages/MethodPage.js` (Live-Calls — bereits in TASK-I5-002 angelegt; hier Härtung)
- modify `server.js` (NUR falls `/api/config` keinen Endpoint-Katalog liefert)
- create `tests/e2e/method.spec.js` (Playwright Live-Flow)
- create `test/api-provenance-flow.test.js` (Node-Test mit Stub-Server)

### Step 3.1 — `/api/config`-Katalog verifizieren (Backend-Constraint)

```bash
curl -s http://127.0.0.1:3000/api/config | jq
```

Erwartet: ein Feld `endpoints` als Array von `{endpoint, method}`. Falls vorhanden → server.js NICHT anfassen. Falls fehlt:

1. In `server.js` Funktion identifizieren, die `/api/config` rendert.
2. Konstante `FUFIRE_ENDPOINTS` (test-pinned!) in die Response übernehmen:

```javascript
// in server.js — inside handler for /api/config
return sendJson(res, 200, {
  fufire_base_url: FUFIRE_BASE_URL,
  // existing fields preserved
  endpoints: FUFIRE_ENDPOINTS.map(e => ({ endpoint: e.path, method: e.method || 'POST' })),
});
```

3. Wenn `test/server.test.js` die Reihenfolge von `FUFIRE_ENDPOINTS` pinnt → keine Reihenfolge ändern, nur Response erweitern. Diese Änderung im Commit-Body dokumentieren mit Begründung "I5 provenance needs catalog".

### Step 3.2 — Provenance-Flow-Test mit Stub-Server (RED → GREEN)

Erstelle `test/api-provenance-flow.test.js`:

```javascript
// test/api-provenance-flow.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { buildProvenance, FRONTEND_CONSUMERS } from '../public/src/domain/apiProvenance.js';

function startStub({ healthBody, configBody }) {
  const server = http.createServer((req, res) => {
    const send = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    if (req.url === '/health') return send(200, healthBody);
    if (req.url === '/api/config') return send(200, configBody);
    send(404, { error: 'not-found' });
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

test('end-to-end: live /health + /api/config feed buildProvenance', async () => {
  const { server, base } = await startStub({
    healthBody: {
      ok: true,
      upstream_ok: true,
      fufire_base_url: 'https://bafe-production.up.railway.app/',
      endpoints: ['/api/azodiac/profile', '/api/azodiac/fusion'],
      fallback_endpoints: [],
    },
    configBody: {
      fufire_base_url: 'https://bafe-production.up.railway.app/',
      endpoints: [
        { endpoint: '/api/azodiac/profile', method: 'POST' },
        { endpoint: '/api/azodiac/fusion', method: 'POST' },
        { endpoint: '/api/azodiac/synastry', method: 'POST' },
        { endpoint: '/health', method: 'GET' },
        { endpoint: '/api/config', method: 'GET' },
      ],
    },
  });

  try {
    const [health, config] = await Promise.all([
      fetch(`${base}/health`).then(r => r.json()),
      fetch(`${base}/api/config`).then(r => r.json()),
    ]);

    const entries = buildProvenance(config.endpoints, health, FRONTEND_CONSUMERS);

    const profile = entries.find(e => e.endpoint === '/api/azodiac/profile');
    assert.equal(profile.status, 'reachable');
    assert.ok(profile.consumers.includes('OverviewPage'));

    const synastry = entries.find(e => e.endpoint === '/api/azodiac/synastry');
    // synastry present in catalog AND in consumerMap, but health says it's not in endpoints[]
    assert.notEqual(synastry.status, 'reachable');

    const health_entry = entries.find(e => e.endpoint === '/health');
    assert.ok(['known', 'reachable'].includes(health_entry.status));
  } finally {
    server.close();
  }
});

test('end-to-end: upstream_ok=false → endpoints marked fallback', async () => {
  const { server, base } = await startStub({
    healthBody: {
      ok: true,
      upstream_ok: false,
      fufire_base_url: 'https://bafe-production.up.railway.app/',
      endpoints: [],
      fallback_endpoints: ['/api/azodiac/profile'],
    },
    configBody: {
      endpoints: [{ endpoint: '/api/azodiac/profile', method: 'POST' }],
    },
  });

  try {
    const [health, config] = await Promise.all([
      fetch(`${base}/health`).then(r => r.json()),
      fetch(`${base}/api/config`).then(r => r.json()),
    ]);
    const entries = buildProvenance(config.endpoints, health, FRONTEND_CONSUMERS);
    const profile = entries.find(e => e.endpoint === '/api/azodiac/profile');
    assert.equal(profile.status, 'fallback');
  } finally {
    server.close();
  }
});

test('end-to-end: health unreachable → entries fall back to "known"/"unused"', async () => {
  const entries = buildProvenance(
    [{ endpoint: '/api/azodiac/profile', method: 'POST' }],
    null,
    FRONTEND_CONSUMERS,
  );
  const profile = entries.find(e => e.endpoint === '/api/azodiac/profile');
  // Has consumers → not "unused"; health null → "unknown" per deriveStatus
  assert.equal(profile.status, 'unknown');
});
```

### Step 3.3 — Playwright E2E

Erstelle `tests/e2e/method.spec.js`:

```javascript
// tests/e2e/method.spec.js
import { test, expect } from '@playwright/test';

const BASE = process.env.APP_BASE_URL || 'http://127.0.0.1:3000';

test.describe('MethodPage — API-/Daten-Provenienz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/method`);
    await page.waitForLoadState('networkidle');
  });

  test('renders hero with rolling-text hook', async ({ page }) => {
    const hero = page.locator('.method-hero__title');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-rolling-text', /Provenienz/i);
  });

  test('renders provenance table with at least one row + status pill', async ({ page }) => {
    const table = page.locator('table.provenance-table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead th', { hasText: /Endpoint/i })).toBeVisible();
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const pill = rows.first().locator('.pill');
    await expect(pill).toBeVisible();
    const pillClass = await pill.getAttribute('class');
    expect(pillClass).toMatch(/pill--(ok|warn|muted|unknown|neutral)/);
  });

  test('live status section shows pill + base url', async ({ page }) => {
    const live = page.locator('.live-status');
    await expect(live).toBeVisible();
    await expect(live.locator('.pill')).toBeVisible();
  });

  test('usage section lists at least one page name', async ({ page }) => {
    const usage = page.locator('[data-slot="usage"]');
    await expect(usage).toBeVisible();
    await expect(usage).toContainText(/Page/);
  });

  test('raw data <details> exists and is initially closed', async ({ page }) => {
    const details = page.locator('details.raw-data');
    await expect(details).toBeVisible();
    expect(await details.evaluate(el => el.open)).toBe(false);
    await details.locator('summary').click();
    expect(await details.evaluate(el => el.open)).toBe(true);
  });

  test('raw data never exposes secrets', async ({ page }) => {
    await page.locator('details.raw-data summary').click();
    const pre = page.locator('details.raw-data pre');
    const text = await pre.innerText();
    expect(text).not.toMatch(/sk-[a-z0-9-]{8,}/i);
    expect(text).not.toMatch(/bearer\s+[a-z0-9._-]+/i);
    expect(text).not.toMatch(/"api_?key"\s*:\s*"(?!\[REDACTED\])/i);
  });

  test('mobile: table collapses into stacked rows at <=720px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    const table = page.locator('table.provenance-table');
    await expect(table).toBeVisible();
    const thead = table.locator('thead');
    await expect(thead).toBeHidden();
  });
});
```

### Step 3.4 — Screenshots erstellen

```bash
mkdir -p docs/qa/screenshots/i5-method
APP_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/method.spec.js --grep "method" --reporter=line
```

Mit Playwright Trace oder manuell:
- `docs/qa/screenshots/i5-method/method-desktop.png` — Desktop 1440×900, ganze Page
- `docs/qa/screenshots/i5-method/method-mobile.png` — 390×844, gestapelte Tabelle
- `docs/qa/screenshots/i5-method/provenance-table.png` — Closeup der Tabelle inkl. Pills

### Step 3.5 — Redaction explizit prüfen

Manueller Check vor PR:

```bash
curl -s http://127.0.0.1:3000/health | jq
curl -s http://127.0.0.1:3000/api/config | jq
```

In keinem Feld dürfen `api_key`, `token`, `authorization`, `secret`, `password` als Klartext erscheinen. Falls doch: vor Render im Frontend wird via `redactSensitive` ersetzt, aber zusätzlich Server-Response prüfen.

### Step 3.6 — Contract-Tests (optional)

```bash
FUFIRE_CONTRACT_TEST=true FUFIRE_BASE_URL=https://bafe-production.up.railway.app/ npm run test:contract
```

Falls live Drift entdeckt wird → in `docs/qa/contract-drift.md` notieren; nicht in I5 fixen.

---

## Iteration Definition of Done

- [ ] `public/src/domain/apiProvenance.js` existiert, exportiert `buildProvenance`, `deriveStatus`, `redactSensitive`, `FRONTEND_CONSUMERS`.
- [ ] `test/api-provenance.test.js` grün (mind. 9 Cases).
- [ ] `test/method-page.test.js` grün (mind. 9 Cases).
- [ ] `test/api-provenance-flow.test.js` grün mit Stub-Server.
- [ ] MethodPage rendert 5 klar getrennte Sektionen: Was passiert / Provenienz-Tabelle / Live-Status / UI-Nutzung / Rohdaten.
- [ ] Status-Pills haben deterministische CSS-Klassen (`pill--ok|warn|muted|unknown|neutral`).
- [ ] Rohdaten-Panel ist `<details>` initial geschlossen, redacted via `redactSensitive`.
- [ ] Playwright `tests/e2e/method.spec.js` grün gegen lokalen Server.
- [ ] Screenshots in `docs/qa/screenshots/i5-method/` (3 Stück) eingecheckt.
- [ ] `server.js` unverändert ODER `/api/config`-Erweiterung dokumentiert + `test/server.test.js` aktualisiert ohne Reihenfolge zu brechen.
- [ ] Keine Secrets in HTML/JS-Output (manueller Curl-Check + Playwright-Regex).
- [ ] Master-Plan `docs/plans/2026-05-22-frontend-correction-iterations.md` Statusfeld I5 → "done".

## Validation strategy

```bash
# Unit + integration
npm test

# Targeted
node --test test/api-provenance.test.js
node --test test/method-page.test.js
node --test test/api-provenance-flow.test.js

# Live E2E (requires running app)
npm start &
APP_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- --grep "method"

# Optional contract drift
FUFIRE_CONTRACT_TEST=true npm run test:contract
```

Smoke-Check by hand:

```bash
curl -s http://127.0.0.1:3000/health    | jq '.upstream_ok,.endpoints,.fallback_endpoints'
curl -s http://127.0.0.1:3000/api/config | jq '.endpoints | length'
```

## Rollback note

I5 ist additiv. Rollback durch Revert auf den vorherigen Commit:

```bash
git revert <i5-merge-sha>
```

Wenn `/api/config` erweitert wurde (Step 3.1), wirft das Revert auch diesen Patch zurück — `test/server.test.js` bleibt grün, weil die Reihenfolge nicht angetastet wurde. Frontend fällt zurück auf alte Debug-MethodPage; keine anderen Seiten betroffen, da `apiProvenance.js` reines Add-On ist.

## Handoff to next iteration: I6

I6 ("Daten-Seite") erbt:

- `FRONTEND_CONSUMERS` Map → wird in I6 um Datentyp-Metadaten erweitert (`{ endpoint, fields, sample_path }`).
- `redactSensitive` → wiederverwenden für Roh-Payload-Dumps der einzelnen Endpoint-Calls.
- Status-Pill-CSS-Klassen → unverändert übernehmen, Konsistenz Methode ↔ Daten.
- Erwartung an I6: Pro Endpoint eine eigene Detail-Karte mit "letzter Response (redacted)" + "Felder-Schema" + Link zurück zu MethodPage-Provenienz-Zeile.
- Offene Frage für I6: braucht `/api/config` zusätzlich ein Beispiel-Payload-Feld? Wenn ja → in I6-Plan erfassen, nicht hier nachträglich einbauen.
