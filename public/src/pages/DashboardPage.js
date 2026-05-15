export function DashboardPage(app, { profile, onNavigate }) {
  app.innerHTML = `
    <main class="dashboard-page">
      <nav class="page-nav">
        <a href="#/" class="nav-link">← Eingabe</a>
        <a href="#/overview" class="nav-link">Übersicht</a>
      </nav>
      <h1 class="dash-title">Nerd-Dashboard</h1>

      <section class="dash-section" aria-label="Endpoint-Status">
        <h2>Endpoint-Matrix</h2>
        <div class="endpoint-matrix"></div>
      </section>

      <section class="dash-section" aria-label="ViewModel">
        <h2>Normalized ViewModel</h2>
        <details class="json-viewer" open>
          <summary>Vollständiges Profil-Objekt</summary>
          <pre class="json-pre"></pre>
        </details>
      </section>

      <section class="dash-section" aria-label="Geplante Erweiterungen">
        <h2>Geplante Erweiterungen</h2>
        <div class="planned-list"></div>
      </section>
    </main>
  `;

  // ── Endpoint matrix ──────────────────────────────────────────────────────────
  const endpoints = [
    { label: 'western',  check: () => !!profile?.western?.bodies,        route: 'POST /calculate/western' },
    { label: 'bazi',     check: () => !!profile?.bazi?.pillars,          route: 'POST /calculate/bazi' },
    { label: 'fusion',   check: () => profile?.fusion?.coherence_index !== undefined, route: 'POST /calculate/fusion' },
    { label: 'wuxing',   check: () => Array.isArray(profile?.wuxing?.elements), route: 'POST /calculate/wuxing' },
    { label: 'info/wuxing', check: () => !!profile?._meta?.sources?.info_wuxing, route: 'GET /info/wuxing' },
    { label: 'geocode',  check: () => !!profile?._inputMeta?.location,   route: 'GET /api/geocode' },
  ];

  const matrix = app.querySelector('.endpoint-matrix');
  endpoints.forEach(({ label, check, route }) => {
    const ok = check();
    const row = document.createElement('div');
    row.className = `ep-row ${ok ? 'ep-ok' : 'ep-missing'}`;

    const dot = document.createElement('span');
    dot.className = 'ep-dot';
    dot.textContent = ok ? '●' : '○';

    const routeEl = document.createElement('code');
    routeEl.className = 'ep-route';
    routeEl.textContent = route;

    const statusEl = document.createElement('span');
    statusEl.className = 'ep-status';
    statusEl.textContent = ok ? 'Daten vorhanden' : 'Keine Daten';

    row.append(dot, routeEl, statusEl);
    matrix.appendChild(row);
  });

  // ── JSON viewer ──────────────────────────────────────────────────────────────
  const pre = app.querySelector('.json-pre');
  pre.textContent = JSON.stringify(profile, null, 2);

  // ── Planned extensions ───────────────────────────────────────────────────────
  const planned = [
    { label: 'Transitkalender',        route: '/transit-calendar', note: 'Braucht Upstream-Verifizierung: GET /transit/now' },
    { label: 'Experience / Daily',     route: '/experience',       note: 'Braucht POST /experience/bootstrap upstream' },
    { label: 'LLM-Narrativ-Layer',     route: '/api/narrative',    note: 'Server-seitig, OpenRouter API-Key per ENV' },
    { label: 'Synastrie-Vertiefung',   route: '/synastry',         note: 'Basis-Vergleich sofort möglich, vertieft nach Extension G' },
  ];

  const planList = app.querySelector('.planned-list');
  planned.forEach(({ label, route, note }) => {
    const el = document.createElement('div');
    el.className = 'planned-item';

    const labelEl = document.createElement('span');
    labelEl.className = 'planned-label';
    labelEl.textContent = label;

    const routeEl = document.createElement('code');
    routeEl.className = 'planned-route';
    routeEl.textContent = route;

    const noteEl = document.createElement('p');
    noteEl.className = 'planned-note';
    noteEl.textContent = note;

    const badge = document.createElement('span');
    badge.className = 'planned-badge';
    badge.textContent = 'Noch nicht verfügbar';

    el.append(labelEl, routeEl, badge, noteEl);
    planList.appendChild(el);
  });

  app.querySelector('.page-nav .nav-link').addEventListener('click', (e) => {
    if (e.currentTarget.getAttribute('href') === '#/') {
      e.preventDefault();
      onNavigate?.('/');
    }
  });
}
