// public/src/pages/MethodPage.js
//
// Sprint E #5 — Method / Raw-Data / Debug view. Per goal-condition the
// ONLY place where raw endpoint paths, fetch timestamps, and full
// JSON payloads are user-visible.
//
// Sources:
//   - getConfig()  → upstream endpoint catalog
//   - getHealth()  → upstream base URL + endpoint allowlist
//   - currentProfile from sessionStorage (raw payload preview)

import { getConfig, getHealth } from '../api/client.js';
import { UnavailableCard } from '../components/UnavailableCard.js';

function fmtJSON(obj, max = 800) {
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > max ? s.slice(0, max) + '\n…' : s;
  } catch { return '(unable to stringify)'; }
}

function endpointRow(ep) {
  const row = document.createElement('article');
  row.className = 'method-endpoint';
  const head = document.createElement('header');
  head.className = 'method-endpoint__head';
  const method = document.createElement('span');
  method.className = `method-endpoint__verb method-endpoint__verb--${(ep.method || 'GET').toLowerCase()}`;
  method.textContent = ep.method || 'GET';
  const path = document.createElement('code');
  path.className = 'method-endpoint__path';
  path.textContent = ep.localPath || ep.path || ep.proxyPath || '—';
  head.append(method, path);
  row.appendChild(head);
  if (ep.description) {
    const desc = document.createElement('p');
    desc.className = 'method-endpoint__desc';
    desc.textContent = ep.description;
    row.appendChild(desc);
  }
  return row;
}

function readProfileFromStorage() {
  try {
    const raw = sessionStorage.getItem('azodiac_profile');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function MethodPage(app, { profile = null } = {}) {
  app.innerHTML = `
    <main class="method-page" data-lane="fusion">
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Signatur-Übersicht</a>
      </nav>

      <header class="page-head">
        <p class="page-eyebrow">Methode · Roh-Daten</p>
        <h1 class="page-title">Was hier passiert</h1>
        <p class="page-intro">
          Diese Seite ist die einzige Stelle der App, die rohe API-Antworten,
          Endpunkt-Pfade und Berechnungs-Provenienz zeigt. Alles andere ist
          aufbereitet — hier siehst du, was die FuFire-Engine zurückgibt.
        </p>
      </header>

      <section class="method-section" aria-label="Endpunkt-Katalog">
        <p class="layer-eyebrow">Endpunkt-Katalog</p>
        <h2 class="layer-title">Verfügbare FuFire-Endpoints</h2>
        <div class="method-endpoints"></div>
      </section>

      <section class="method-section" aria-label="Health">
        <p class="layer-eyebrow">Health</p>
        <h2 class="layer-title">Upstream-Status</h2>
        <pre class="method-pre method-health"></pre>
      </section>

      <section class="method-section" aria-label="Raw profile">
        <p class="layer-eyebrow">Rohdaten</p>
        <h2 class="layer-title">Aktuelles Profil (Vorschau)</h2>
        <pre class="method-pre method-profile"></pre>
      </section>
    </main>
  `;

  // Endpoint catalog — call /api/config asynchronously.
  const endpointsHost = app.querySelector('.method-endpoints');
  endpointsHost.textContent = 'Lade Katalog …';
  getConfig().then((res) => {
    endpointsHost.innerHTML = '';
    if (!res.ok || !res.data?.endpoints) {
      endpointsHost.appendChild(UnavailableCard({
        title: 'Endpunkt-Katalog',
        reason: `Konnte /api/config nicht laden: ${res.error || `HTTP ${res.status}`}`,
      }));
      return;
    }
    for (const ep of res.data.endpoints) endpointsHost.appendChild(endpointRow(ep));
  }).catch((err) => {
    endpointsHost.textContent = `Fehler: ${err.message}`;
  });

  // Health
  const healthHost = app.querySelector('.method-health');
  healthHost.textContent = 'Lade Health …';
  getHealth().then((res) => {
    healthHost.textContent = res.ok ? fmtJSON(res.data) : `Fehler: ${res.error || `HTTP ${res.status}`}`;
  }).catch((err) => {
    healthHost.textContent = `Fehler: ${err.message}`;
  });

  // Raw profile
  const profileHost = app.querySelector('.method-profile');
  const prof = profile || readProfileFromStorage();
  if (prof) {
    profileHost.textContent = fmtJSON(prof, 2000);
  } else {
    profileHost.textContent = 'Kein Profil in sessionStorage. Erst Berechnung auf der Startseite ausführen.';
  }
}
