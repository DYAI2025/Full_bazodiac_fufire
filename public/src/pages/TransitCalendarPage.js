// public/src/pages/TransitCalendarPage.js
import { getTransitNow, getTransitTimeline } from '../api/client.js';

const SIGN_DE = {
  aries: 'Widder', taurus: 'Stier', gemini: 'Zwillinge', cancer: 'Krebs',
  leo: 'Löwe', virgo: 'Jungfrau', libra: 'Waage', scorpio: 'Skorpion',
  sagittarius: 'Schütze', capricorn: 'Steinbock', aquarius: 'Wassermann', pisces: 'Fische',
};

const PLANET_SYMBOLS = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};

const PLANET_LABELS_DE = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun', pluto: 'Pluto',
};

function signDE(s) {
  return s ? (SIGN_DE[s.toLowerCase()] || s) : '—';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderNow(planets, sectorIntensity) {
  const el = document.createElement('section');
  el.className = 'transit-now-section';
  el.setAttribute('aria-label', 'Aktuelle Transitpositionen');

  const topSectors = (sectorIntensity || [])
    .map((v, i) => ({ house: i + 1, intensity: v }))
    .filter(s => s.intensity > 0.2)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 3);

  el.innerHTML = `
    <h2 class="transit-section-title">Aktuelle Transit-Positionen</h2>
    ${topSectors.length ? `<p class="transit-active-houses">Aktivste Häuser heute: ${topSectors.map(s => `<strong>${s.house}. Haus</strong> (${Math.round(s.intensity * 100)}%)`).join(', ')}</p>` : ''}
    <div class="transit-planets-grid"></div>
  `;

  const grid = el.querySelector('.transit-planets-grid');
  const PLANET_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  PLANET_ORDER.forEach((name) => {
    const p = planets[name];
    if (!p) return;
    const card = document.createElement('div');
    card.className = 'transit-planet-card';
    const isRetro = p.speed < 0;
    card.innerHTML = `
      <span class="transit-planet-symbol" title="${PLANET_LABELS_DE[name] || name}">${PLANET_SYMBOLS[name] || name}</span>
      <span class="transit-planet-name">${PLANET_LABELS_DE[name] || name}</span>
      <span class="transit-planet-sign">${signDE(p.sign)}</span>
      ${isRetro ? '<span class="transit-retro" title="Rückläufig">℞</span>' : ''}
      <span class="transit-planet-deg">${p.longitude?.toFixed(1)}°</span>
    `;
    grid.appendChild(card);
  });

  return el;
}

function renderTimeline(days) {
  const el = document.createElement('section');
  el.className = 'transit-timeline-section';
  el.setAttribute('aria-label', '7-Tage Transitkalender');
  el.innerHTML = `<h2 class="transit-section-title">7-Tage Überblick</h2><div class="transit-week-strip"></div>`;

  const strip = el.querySelector('.transit-week-strip');
  const today = new Date().toISOString().split('T')[0];

  days.forEach((day) => {
    const col = document.createElement('div');
    col.className = 'transit-day-col';
    if (day.date === today) col.classList.add('transit-day-col--today');

    const activePlanets = Object.entries(day.planets || {})
      .map(([name, p]) => ({ name, sign: p.sign, speed: Math.abs(p.speed || 0), retro: (p.speed || 0) < 0 }))
      .sort((a, b) => b.speed - a.speed)
      .slice(0, 3);

    col.innerHTML = `
      <div class="transit-day-date">${formatDate(day.date)}</div>
      <div class="transit-day-planets">
        ${activePlanets.map(p => `
          <div class="transit-day-planet">
            <span class="tdp-sym">${PLANET_SYMBOLS[p.name] || p.name}</span>
            <span class="tdp-sign">${signDE(p.sign)}</span>
            ${p.retro ? '<span class="tdp-retro">℞</span>' : ''}
          </div>
        `).join('')}
      </div>
      <div class="transit-day-intensity">
        ${(day.sector_intensity || []).map((v, i) =>
          v > 0.15
            ? `<span class="tdi-bar" title="${i + 1}. Haus" style="height:${Math.round(v * 100)}%;opacity:${Math.max(0.3, v)}"></span>`
            : '<span class="tdi-bar tdi-bar--empty"></span>'
        ).join('')}
      </div>
    `;
    strip.appendChild(col);
  });

  return el;
}

export function TransitCalendarPage(app) {
  app.innerHTML = `
    <main class="transit-calendar-page">
      <header class="transit-header">
        <a href="#/" class="transit-back-link">← Zurück</a>
        <h1 class="transit-title">Transitkalender</h1>
        <p class="transit-subtitle">Aktuelle Planetenbewegungen · 7-Tage-Überblick</p>
      </header>
      <div class="transit-loading" role="status" aria-live="polite">Transits werden geladen…</div>
      <div class="transit-content" hidden></div>
      <div class="transit-error" role="alert" hidden></div>
    </main>
  `;

  const loading = app.querySelector('.transit-loading');
  const content = app.querySelector('.transit-content');
  const errorEl = app.querySelector('.transit-error');

  Promise.all([getTransitNow(), getTransitTimeline()]).then(([nowRes, timelineRes]) => {
    loading.hidden = true;

    if (!nowRes.ok || !timelineRes.ok) {
      errorEl.textContent = 'Transitdaten konnten nicht geladen werden. Bitte später erneut versuchen.';
      errorEl.hidden = false;
      return;
    }

    content.appendChild(renderNow(nowRes.data.planets, nowRes.data.sector_intensity || []));
    content.appendChild(renderTimeline(timelineRes.data.days || []));
    content.hidden = false;
  }).catch((err) => {
    loading.hidden = true;
    errorEl.textContent = `Fehler: ${err.message}`;
    errorEl.hidden = false;
  });
}
