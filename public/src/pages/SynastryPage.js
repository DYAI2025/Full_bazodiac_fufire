import { GeoInput }              from '../components/GeoInput.js';
import { CalculationProgress }   from '../components/CalculationProgress.js';
import { SourceBadge }           from '../components/SourceBadge.js';
import { calculateProfile }      from '../api/client.js';
import { createSynastryProjection } from '../domain/projections.js';

export function SynastryPage(app, { onNavigate }) {
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
    renderExtensionPlaceholder(resultEl.querySelector('.synastry-extension-placeholder'));
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
      <span class="synastry-element element-a">${proj.wuxing.elementA}</span>
      <span class="synastry-relation-arrow">→</span>
      <span class="synastry-element element-b">${proj.wuxing.elementB}</span>
      <span class="synastry-cycle-label">${proj.wuxing.cycle}</span>
    `;
    header.appendChild(SourceBadge('static_interpretation'));

    const desc = document.createElement('p');
    desc.className = 'synastry-compat-desc';
    desc.textContent = proj.wuxing.description;

    card.append(header, desc);
    section.appendChild(card);
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
      <span class="bazi-stem-a">${proj.bazi.stemA} ${proj.bazi.elementA}</span>
      <span class="bazi-stem-sep">×</span>
      <span class="bazi-stem-b">${proj.bazi.stemB} ${proj.bazi.elementB}</span>
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
    container.appendChild(section);
  }

  function renderExtensionPlaceholder(container) {
    const section = document.createElement('section');
    section.className = 'synastry-section synastry-section--placeholder';

    const h2 = document.createElement('h2');
    h2.textContent = 'Vertiefter Synastrie-Report';

    const p = document.createElement('p');
    p.className = 'section-intro';
    p.textContent = 'Dieser Bereich wird verfügbar, sobald Extension G (server-seitige Synastrie-Berechnung) aktiviert ist.';

    section.append(h2, p);
    container.appendChild(section);
  }
}
