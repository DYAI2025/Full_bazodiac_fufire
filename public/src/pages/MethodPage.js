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
import { PageShell }      from '../components/PageShell.js';
import { SectionHeader }  from '../components/SectionHeader.js';
import { LuxuryCard }     from '../components/LuxuryCard.js';

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
  app.innerHTML = '';

  const nav = document.createElement('nav');
  nav.className = 'page-nav';
  const back = document.createElement('a');
  back.href = '#/overview';
  back.className = 'nav-link';
  back.textContent = '← Signatur-Übersicht';
  nav.appendChild(back);
  app.appendChild(nav);

  const shell = PageShell({
    eyebrow: 'Methode · Roh-Daten',
    headline: 'Was hier passiert',
    subline: 'Diese Seite ist die einzige Stelle der App, die rohe API-Antworten, Endpunkt-Pfade und Berechnungs-Provenienz zeigt. Alles andere ist aufbereitet — hier siehst du, was die FuFire-Engine zurückgibt.',
  });
  shell.setAttribute('data-lane', 'fusion');

  // Endpoint catalog section
  const catalogSection = document.createElement('section');
  catalogSection.setAttribute('aria-label', 'Endpunkt-Katalog');
  catalogSection.appendChild(SectionHeader({
    eyebrow: 'Endpunkt-Katalog',
    headline: 'Verfügbare FuFire-Endpoints',
  }));
  const catalogCard = LuxuryCard({ lane: 'fusion' });
  catalogCard.body.textContent = 'Lade Katalog …';
  catalogSection.appendChild(catalogCard);
  shell.body.appendChild(catalogSection);

  // Health section
  const healthSection = document.createElement('section');
  healthSection.setAttribute('aria-label', 'Health');
  healthSection.appendChild(SectionHeader({
    eyebrow: 'Health',
    headline: 'Upstream-Status',
  }));
  const healthPre = document.createElement('pre');
  healthPre.className = 'method-pre';
  healthPre.textContent = 'Lade Health …';
  healthSection.appendChild(healthPre);
  shell.body.appendChild(healthSection);

  // Raw profile section
  const profileSection = document.createElement('section');
  profileSection.setAttribute('aria-label', 'Raw profile');
  profileSection.appendChild(SectionHeader({
    eyebrow: 'Rohdaten',
    headline: 'Aktuelles Profil (Vorschau)',
  }));
  const profilePre = document.createElement('pre');
  profilePre.className = 'method-pre';
  profileSection.appendChild(profilePre);
  shell.body.appendChild(profileSection);

  app.appendChild(shell);

  // Async fill: endpoint catalog
  getConfig().then((res) => {
    catalogCard.body.textContent = '';
    if (!res.ok || !res.data?.endpoints) {
      catalogCard.body.appendChild(UnavailableCard({
        title: 'Endpunkt-Katalog',
        reason: `Konnte /api/config nicht laden: ${res.error || `HTTP ${res.status}`}`,
      }));
      return;
    }
    for (const ep of res.data.endpoints) catalogCard.body.appendChild(endpointRow(ep));
  }).catch((err) => {
    catalogCard.body.textContent = `Fehler: ${err.message}`;
  });

  // Async fill: health
  getHealth().then((res) => {
    healthPre.textContent = res.ok ? fmtJSON(res.data) : `Fehler: ${res.error || `HTTP ${res.status}`}`;
  }).catch((err) => {
    healthPre.textContent = `Fehler: ${err.message}`;
  });

  // Raw profile
  const prof = profile || readProfileFromStorage();
  profilePre.textContent = prof
    ? fmtJSON(prof, 2000)
    : 'Kein Profil in sessionStorage. Erst Berechnung auf der Startseite ausführen.';
}
