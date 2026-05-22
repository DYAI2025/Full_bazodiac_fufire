// public/src/pages/MethodPage.js
//
// I5 — API / Daten-Provenienz view.
// Pure renderer functions (exported for unit tests) + async MethodPage mount.

import { getConfig, getHealth }                                      from '../api/client.js';
import { RollingText }                                               from '../components/RollingText.js';
import { buildProvenance, FRONTEND_CONSUMERS, redactSensitive }      from '../domain/apiProvenance.js';

// ─── Pure renderers (unit-testable, no DOM) ──────────────────────────────────

const STATUS_CLASS = {
  reachable: 'pill pill--ok',
  fallback:  'pill pill--warn',
  unused:    'pill pill--muted',
  unknown:   'pill pill--unknown',
  known:     'pill pill--neutral',
};

export function statusPillClass(status) {
  return STATUS_CLASS[status] ?? 'pill pill--unknown';
}

export function renderHero() {
  return `<section class="method-hero" data-section="hero">
  <h1 class="bz-h1" data-rolling-text="hero-headline">API / Daten-Provenienz</h1>
  <p class="method-hero__sub">Welche Endpunkte existieren, live erreichbar sind und welche Seiten sie verwenden.</p>
</section>`;
}

export function renderProvenanceTable(entries) {
  const rows = (entries || []).map(e => {
    const pill      = `<span class="${statusPillClass(e.status)}">${e.status}</span>`;
    const consumers = Array.isArray(e.consumers) && e.consumers.length ? e.consumers.join(', ') : '—';
    return `<tr>
      <td><code>${e.endpoint}</code></td>
      <td>${e.method}</td>
      <td>${e.source}</td>
      <td>${pill}</td>
      <td>${consumers}</td>
    </tr>`;
  }).join('');
  return `<table class="provenance-table">
  <thead><tr>
    <th>Endpoint</th><th>Method</th><th>Quelle</th><th>Status</th><th>Seiten</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

export function renderLiveStatus(health) {
  if (!health) {
    return `<div class="live-status">
  <span class="pill pill--unknown">unbekannt</span>
  <p>Upstream nicht erreichbar oder Status unbekannt.</p>
</div>`;
  }
  const pill = health.upstream_ok
    ? '<span class="pill pill--ok">upstream ok</span>'
    : '<span class="pill pill--warn">upstream fallback</span>';
  const url = health.fufire_base_url ?? '—';
  return `<div class="live-status">
  ${pill}
  <p>Base URL: <code>${url}</code></p>
</div>`;
}

export function renderUsage(entries) {
  const byPage = {};
  for (const e of (entries || [])) {
    for (const page of (e.consumers || [])) {
      if (!byPage[page]) byPage[page] = [];
      byPage[page].push(e.endpoint);
    }
  }
  const items = Object.entries(byPage).map(([page, eps]) => {
    const epList = eps.map(ep => `<li><code>${ep}</code></li>`).join('');
    return `<li class="usage-page"><strong>${page}</strong><ul>${epList}</ul></li>`;
  }).join('');
  return `<ul class="usage-pages">${items}</ul>`;
}

export function renderRawData(raw) {
  const safe = redactSensitive(raw ?? {});
  let json;
  try { json = JSON.stringify(safe, null, 2); } catch { json = '(unable to stringify)'; }
  return `<details class="raw-data">
  <summary>Rohdaten (nur für Debugging)</summary>
  <pre>${json}</pre>
</details>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function catalogFromConfig(config) {
  if (!Array.isArray(config?.endpoints)) return [];
  return config.endpoints.map(ep => ({
    endpoint: ep.localPath || ep.path || ep.proxyPath || ep.endpoint || '',
    method:   ep.method || 'GET',
  })).filter(e => e.endpoint);
}

function mountHTML(parent, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return parent.appendChild(tmp.firstElementChild);
}

function replaceHTML(el, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  el.replaceWith(tmp.firstElementChild);
}

// ─── Page mount ──────────────────────────────────────────────────────────────

export async function MethodPage(root, _opts = {}) {
  root.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'method-page';
  page.setAttribute('data-page', 'method');
  root.appendChild(page);

  // Hero
  const heroEl = mountHTML(page, renderHero());
  const staticTitle = heroEl.querySelector('[data-rolling-text]');
  if (staticTitle) {
    const rolling = RollingText({ text: 'API / Daten-Provenienz', tagName: 'h1', className: 'bz-h1' });
    rolling.setAttribute('data-rolling-text', 'hero-headline');
    staticTitle.replaceWith(rolling);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => rolling.startRolling?.());
    } else {
      rolling.startRolling?.();
    }
  }

  // Live status placeholder
  const statusSection = document.createElement('section');
  statusSection.className = 'method-section';
  statusSection.setAttribute('data-section', 'live-status');
  const statusH2 = document.createElement('h2');
  statusH2.className = 'bz-h2';
  statusH2.textContent = 'Upstream-Status';
  statusSection.appendChild(statusH2);
  const statusEl = mountHTML(statusSection, renderLiveStatus(null));
  page.appendChild(statusSection);

  // Provenance table placeholder
  const provenanceSection = document.createElement('section');
  provenanceSection.className = 'method-section';
  provenanceSection.setAttribute('data-section', 'provenance');
  const provenanceH2 = document.createElement('h2');
  provenanceH2.className = 'bz-h2';
  provenanceH2.textContent = 'API-Endpunkte & Provenienz';
  provenanceSection.appendChild(provenanceH2);
  const tableEl = mountHTML(provenanceSection, renderProvenanceTable([]));
  page.appendChild(provenanceSection);

  // Usage placeholder
  const usageSection = document.createElement('section');
  usageSection.className = 'method-section';
  usageSection.setAttribute('data-section', 'usage');
  const usageH2 = document.createElement('h2');
  usageH2.className = 'bz-h2';
  usageH2.textContent = 'Nutzung nach Seite';
  usageSection.appendChild(usageH2);
  const usageSlot = document.createElement('div');
  usageSection.appendChild(usageSlot);
  page.appendChild(usageSection);

  // Raw data placeholder
  const rawSection = document.createElement('section');
  rawSection.className = 'method-section';
  rawSection.setAttribute('data-section', 'raw-data');
  const rawSlot = document.createElement('div');
  rawSection.appendChild(rawSlot);
  page.appendChild(rawSection);

  // Async fill
  const [healthRes, configRes] = await Promise.allSettled([getHealth(), getConfig()]);

  const health  = healthRes.status === 'fulfilled' && healthRes.value?.ok ? healthRes.value.data  : null;
  const catalog = configRes.status  === 'fulfilled' && configRes.value?.ok  ? catalogFromConfig(configRes.value.data) : [];

  replaceHTML(statusEl,  renderLiveStatus(health));
  const entries = buildProvenance(catalog, health, FRONTEND_CONSUMERS);
  replaceHTML(tableEl,   renderProvenanceTable(entries));
  usageSlot.innerHTML  = renderUsage(entries);
  rawSlot.innerHTML    = renderRawData(health ?? {});
}
