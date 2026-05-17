import { GeoInput }              from '../components/GeoInput.js';
import { CalculationProgress }   from '../components/CalculationProgress.js';
import { SourceBadge }           from '../components/SourceBadge.js';
import { calculateProfile }      from '../api/client.js';
import { createSynastryProjection } from '../domain/projections.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function SynastryPage(app) {
  app.innerHTML = `
    <main class="synastry-page">
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Übersicht</a>
      </nav>

      <header class="page-header">
        <h1>Synastrie</h1>
        <p class="page-subtitle">Zwei Energien im Vergleich</p>
      </header>

      <div class="synastry-input-grid">
        <section class="person-input person-a">
          <h2>Person A</h2>
          <form class="birth-form birth-form--a" novalidate>
            <div class="form-group">
              <label for="date-a">Datum</label>
              <input type="date" id="date-a" required />
            </div>
            <div class="form-group">
              <label for="time-a">Uhrzeit</label>
              <input type="time" id="time-a" />
            </div>
            <div class="form-group" id="geo-group-a">
              <label>Ort</label>
            </div>
          </form>
        </section>

        <section class="person-input person-b">
          <h2>Person B <span class="optional-hint">(optional)</span></h2>
          <form class="birth-form birth-form--b" novalidate>
            <div class="form-group">
              <label for="date-b">Datum</label>
              <input type="date" id="date-b" />
            </div>
            <div class="form-group">
              <label for="time-b">Uhrzeit</label>
              <input type="time" id="time-b" />
            </div>
            <div class="form-group" id="geo-group-b">
              <label>Ort</label>
            </div>
          </form>
        </section>
      </div>

      <div class="synastry-form-footer">
        <div class="form-error synastry-error" role="alert" hidden></div>
        <button class="cta-btn synastry-calc-btn" disabled>Berechnen</button>
      </div>

      <div class="synastry-result" hidden>
        <div class="synastry-wuxing-section"></div>
        <div class="synastry-bazi-section"></div>
        <div class="synastry-aspects-section"></div>
        <div class="synastry-extension-placeholder"></div>
      </div>
    </main>
  `;

  const dateA   = app.querySelector('#date-a');
  const timeA   = app.querySelector('#time-a');
  const dateB   = app.querySelector('#date-b');
  const timeB   = app.querySelector('#time-b');
  const calcBtn = app.querySelector('.synastry-calc-btn');
  const errorEl = app.querySelector('.synastry-error');
  const resultEl = app.querySelector('.synastry-result');

  let placeA = null;
  let placeB = null;

  const geoA = GeoInput({ onSelect: (p) => { placeA = p; validate(); } });
  const geoB = GeoInput({ onSelect: (p) => { placeB = p; validate(); } });
  app.querySelector('#geo-group-a').appendChild(geoA);
  app.querySelector('#geo-group-b').appendChild(geoB);

  function bFormStarted() {
    return !!(dateB.value || placeB);
  }

  function validate() {
    const aReady = !!(dateA.value && placeA);
    const bReady = !bFormStarted() || !!(dateB.value && placeB);
    calcBtn.disabled = !(aReady && bReady);
  }

  dateA.addEventListener('input', validate);
  dateB.addEventListener('input', validate);

  calcBtn.addEventListener('click', async () => {
    errorEl.hidden = true;
    calcBtn.disabled = true;

    const inputA = {
      date: dateA.value,
      time: timeA.value || '12:00',
      lat:  placeA.lat,
      lon:  placeA.lon,
      tz:   placeA.tz,
    };

    const progress = document.createElement('div');
    progress.className = 'synastry-progress';
    app.querySelector('.synastry-form-footer').after(progress);
    const pg = CalculationProgress();
    progress.appendChild(pg);

    const fetchB = (dateB.value && placeB)
      ? calculateProfile({ date: dateB.value, time: timeB.value || '12:00', lat: placeB.lat, lon: placeB.lon, tz: placeB.tz })
      : Promise.resolve(null);

    try {
      const [resA, resB] = await Promise.all([calculateProfile(inputA), fetchB]);

      pg.stop();
      progress.remove();
      calcBtn.disabled = false;

      if (!resA.ok) {
        errorEl.textContent = `Person A: ${resA.error || `HTTP ${resA.status}`}`;
        errorEl.hidden = false;
        return;
      }

      const profileA = resA.data;
      const profileB = resB?.ok ? resB.data : null;

      if (resB && !resB.ok) {
        errorEl.textContent = `Person B: ${resB.error || `HTTP ${resB.status}`} — Vergleich nur mit Person A.`;
        errorEl.hidden = false;
      }

      renderResult(profileA, profileB);
    } catch (err) {
      pg.stop();
      progress.remove();
      calcBtn.disabled = false;
      errorEl.textContent = `Netzwerkfehler: ${err.message}`;
      errorEl.hidden = false;
    }
  });

  function renderResult(profileA, profileB) {
    resultEl.hidden = false;
    resultEl.querySelector('.synastry-wuxing-section').innerHTML = '';
    resultEl.querySelector('.synastry-bazi-section').innerHTML = '';
    resultEl.querySelector('.synastry-aspects-section').innerHTML = '';
    resultEl.querySelector('.synastry-extension-placeholder').innerHTML = '';

    const proj = createSynastryProjection(profileA, profileB);

    renderWuXing(resultEl.querySelector('.synastry-wuxing-section'), proj);
    renderBazi(resultEl.querySelector('.synastry-bazi-section'), proj);
    renderAspects(resultEl.querySelector('.synastry-aspects-section'), proj);
    renderExtensionPlaceholder(resultEl.querySelector('.synastry-extension-placeholder'), proj);
  }

  function renderHarmonyGauge(score, label) {
    if (score == null) return null;
    const pct = Math.round(score * 100);
    const angleDeg = -90 + score * 180;

    const wrap = document.createElement('div');
    wrap.className = 'harmony-gauge-wrap';
    wrap.innerHTML = `
      <div class="harmony-gauge-label">${label || 'Energie-Balance'}</div>
      <svg class="harmony-gauge-svg" viewBox="0 0 200 110" aria-label="${pct}% Harmonie">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#60a5fa"/>
            <stop offset="50%"  stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#f87171"/>
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
              stroke="url(#gaugeGrad)" stroke-width="14" stroke-linecap="round"/>
        <g transform="translate(100,100) rotate(${angleDeg})">
          <line x1="0" y1="0" x2="0" y2="-68" stroke="var(--text)" stroke-width="3"
                stroke-linecap="round"/>
          <circle cx="0" cy="0" r="5" fill="var(--text)"/>
        </g>
        <text x="15"  y="108" font-size="9" fill="#60a5fa" text-anchor="middle">Spannung</text>
        <text x="100" y="22"  font-size="9" fill="var(--muted)" text-anchor="middle">Balance</text>
        <text x="185" y="108" font-size="9" fill="#f87171" text-anchor="middle">Harmonie</text>
      </svg>
      <div class="harmony-gauge-pct">${pct} %</div>
    `;
    return wrap;
  }

  function renderWuXing(container, proj) {
    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Wu-Xing-Kompatibilität';
    section.appendChild(h2);

    if (!proj.wuxing) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'BaZi Day Master fehlt — kein elementarer Vergleich möglich.';
      section.appendChild(p);
      container.appendChild(section);
      return;
    }

    const card = document.createElement('div');
    card.className = `synastry-compat-card synastry-compat--${proj.wuxing.relation.replace(/-/g, '')}`;

    const header = document.createElement('div');
    header.className = 'synastry-compat-header';
    header.innerHTML = `
      <span class="synastry-element element-a">${esc(proj.wuxing.elementA)}</span>
      <span class="synastry-relation-arrow">→</span>
      <span class="synastry-element element-b">${esc(proj.wuxing.elementB)}</span>
      <span class="synastry-cycle-label">${esc(proj.wuxing.cycle)}</span>
    `;
    header.appendChild(SourceBadge('static_interpretation'));

    const desc = document.createElement('p');
    desc.className = 'synastry-compat-desc';
    desc.textContent = proj.wuxing.description;

    card.append(header, desc);
    section.appendChild(card);
    if (proj.harmonyScore != null) {
      const gauge = renderHarmonyGauge(proj.harmonyScore, 'Elementare Energie-Balance');
      if (gauge) section.appendChild(gauge);
    }
    container.appendChild(section);
  }

  function renderBazi(container, proj) {
    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'BaZi-Resonanz';
    section.appendChild(h2);

    if (!proj.bazi) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'Day Master unvollständig — BaZi-Resonanz nicht verfügbar.';
      section.appendChild(p);
      container.appendChild(section);
      return;
    }

    const card = document.createElement('div');
    card.className = 'synastry-bazi-card';

    const stems = document.createElement('div');
    stems.className = 'synastry-bazi-stems';
    stems.innerHTML = `
      <span class="bazi-stem-a">${esc(proj.bazi.stemA)} ${esc(proj.bazi.elementA)}</span>
      <span class="bazi-stem-sep">×</span>
      <span class="bazi-stem-b">${esc(proj.bazi.stemB)} ${esc(proj.bazi.elementB)}</span>
    `;
    stems.appendChild(SourceBadge('static_interpretation'));

    const desc = document.createElement('p');
    desc.className = 'synastry-bazi-desc';
    desc.textContent = proj.bazi.description;

    card.append(stems, desc);
    section.appendChild(card);
    container.appendChild(section);
  }

  function renderAspects(container, proj) {
    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Westliche Aspekte';
    section.appendChild(h2);

    if (proj.aspects.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = proj.missing.some(m => m.includes('Aspekte'))
        ? 'Planetenpositionen nicht verfügbar — Aspekte konnten nicht berechnet werden.'
        : 'Keine klassischen Aspekte zwischen den Charts gefunden.';
      section.appendChild(p);
      container.appendChild(section);
      return;
    }

    const intro = document.createElement('p');
    intro.className = 'section-intro';
    intro.textContent = `${proj.aspects.length} Aspekt${proj.aspects.length !== 1 ? 'e' : ''} zwischen den Charts.`;
    section.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'synastry-aspects-grid';

    for (const asp of proj.aspects) {
      const card = document.createElement('div');
      card.className = 'synastry-aspect-card';

      const header = document.createElement('div');
      header.className = 'factor-card-header';

      const label = document.createElement('span');
      label.className = 'factor-label';
      label.textContent = `${asp.bodyA} ↔ ${asp.bodyB} — ${asp.aspect}`;

      header.append(label, SourceBadge('static_interpretation'));

      const orb = document.createElement('p');
      orb.className = 'synastry-orb';
      orb.textContent = `Orb: ${asp.orbDeg}°`;

      const desc = document.createElement('p');
      desc.className = 'factor-value';
      desc.textContent = asp.description;

      card.append(header, orb, desc);
      grid.appendChild(card);
    }

    section.appendChild(grid);
    if (proj.harmonyScore != null) {
      const gauge = renderHarmonyGauge(proj.harmonyScore, 'Gesamt-Aspekt-Balance');
      if (gauge) section.appendChild(gauge);
    }
    container.appendChild(section);
  }

  function renderExtensionPlaceholder(container, proj) {
    if (!proj || (!proj.wuxing && !proj.aspects.length)) return;

    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Fusions-Bewertung';
    section.appendChild(h2);

    const intro = document.createElement('p');
    intro.className = 'section-intro';
    const score = proj.harmonyScore;
    let interpretation = '';
    if (score == null) {
      interpretation = 'Für eine vollständige Fusions-Bewertung werden Planetenpositionen beider Personen benötigt.';
    } else if (score >= 0.7) {
      interpretation = 'Diese Verbindung zeigt eine hohe elementare und aspektuelle Übereinstimmung — Anziehung und Fluss dominieren. Das bedeutet nicht Konfliktfreiheit, sondern eine grundsätzliche Resonanz, die Raum für gemeinsames Wachstum schafft.';
    } else if (score >= 0.45) {
      interpretation = 'Diese Verbindung hält Spannung und Harmonie in einem lebendigen Gleichgewicht. Die Reibungspunkte sind echte Wachstumsorte — sie fordern heraus und ermöglichen dadurch Tiefe.';
    } else {
      interpretation = 'Diese Verbindung ist geprägt von schöpferischer Spannung. Die elementaren und aspektuellen Kräfte wirken oft gegeneinander — das erzeugt Intensität und kann, wenn bewusst genutzt, transformierende Tiefe schaffen.';
    }
    intro.textContent = interpretation;
    section.appendChild(intro);

    if (score != null) {
      const gauge = renderHarmonyGauge(score, 'Gesamt-Fusions-Balance');
      if (gauge) section.appendChild(gauge);
    }

    container.appendChild(section);
  }
}
