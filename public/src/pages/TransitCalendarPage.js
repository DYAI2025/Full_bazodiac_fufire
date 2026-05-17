// public/src/pages/TransitCalendarPage.js
import { getTransitNow, getTransitTimeline } from '../api/client.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

const PLANET_ORDER = Object.keys(PLANET_SYMBOLS);

// Transit-Planet → Lebensbereiche (für Tooltip-Kontext)
const TRANSIT_CONTEXT = {
  sun:     'Vitalität, Identität, Lebensrichtung',
  moon:    'Emotionen, Stimmungen, Intuition',
  mercury: 'Denken, Kommunikation, Entscheidungen',
  venus:   'Beziehungen, Werte, Schönheit',
  mars:    'Antrieb, Energie, Konflikte',
  jupiter: 'Wachstum, Chancen, Expansion',
  saturn:  'Struktur, Grenzen, Reife',
  uranus:  'Wandel, Überraschungen, Befreiung',
  neptune: 'Intuition, Auflösung, Spiritualität',
  pluto:   'Tiefe Transformation, Macht, Erneuerung',
};

// Aspekt-Check: welche Natal-Planeten ist ein Transit-Planet nahe?
function findNatalAspects(transitLon, natalBodies, orbDeg = 8) {
  if (!natalBodies || transitLon == null) return [];
  const hits = [];
  for (const [name, body] of Object.entries(natalBodies)) {
    if (body?.longitude == null) continue;
    const diff = Math.abs(((transitLon - body.longitude + 540) % 360) - 180);
    if (diff <= orbDeg) {
      hits.push({ name, orb: Math.round(diff * 10) / 10 });
    }
  }
  return hits.sort((a, b) => a.orb - b.orb);
}

function signDE(s) {
  return s ? (SIGN_DE[s.toLowerCase()] || esc(s)) : '—';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderNow(planets, sectorIntensity, profile) {
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
  PLANET_ORDER.forEach((name) => {
    const p = planets[name];
    if (!p) return;
    const card = document.createElement('div');
    card.className = 'transit-planet-card';
    const isRetro = p.speed < 0;
    const natalBodies = profile?.western?.bodies || {};
    const natalHits = findNatalAspects(p.longitude, natalBodies);
    const hitText = natalHits.length > 0
      ? `Nahe deinem Natal-${natalHits[0].name} (${natalHits[0].orb}°)`
      : '';
    const context = TRANSIT_CONTEXT[name] || '';
    const tooltip = [context, hitText].filter(Boolean).join(' · ');

    card.setAttribute('title', tooltip);
    card.innerHTML = `
      <span class="transit-planet-symbol" title="${PLANET_LABELS_DE[name] || name}">${PLANET_SYMBOLS[name] || name}</span>
      <span class="transit-planet-name">${PLANET_LABELS_DE[name] || name}</span>
      <span class="transit-planet-sign">${signDE(p.sign)}</span>
      ${isRetro ? '<span class="transit-retro" title="Rückläufig">℞</span>' : ''}
      <span class="transit-planet-deg">${p.longitude != null ? p.longitude.toFixed(1) + '°' : '—'}</span>
      ${hitText ? `<span class="transit-natal-hit" title="${esc(tooltip)}">${esc(hitText)}</span>` : ''}
    `;
    grid.appendChild(card);
  });

  return el;
}

function intensityClass(v) {
  const n = Number(v);
  if (!isFinite(n)) return 'tdi-bar--low';
  if (n >= 0.67) return 'tdi-bar--high';
  if (n >= 0.34) return 'tdi-bar--mid';
  return 'tdi-bar--low';
}

function renderTimeline(days, profile) {
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

    const natalBodies = profile?.western?.bodies || {};
    const activePlanets = Object.entries(day.planets || {})
      .map(([name, p]) => {
        const hits = findNatalAspects(p.longitude, natalBodies, 6);
        const hitNote = hits.length > 0 ? ` · nahe Natal-${hits[0].name}` : '';
        const ctx = TRANSIT_CONTEXT[name] || '';
        return {
          name, sign: p.sign,
          speed: Math.abs(p.speed || 0),
          retro: (p.speed || 0) < 0,
          tooltip: ctx + hitNote,
        };
      })
      .sort((a, b) => b.speed - a.speed)
      .slice(0, 3);

    col.innerHTML = `
      <div class="transit-day-date">${formatDate(day.date)}</div>
      <div class="transit-day-planets">
        ${activePlanets.map(p => `
          <div class="transit-day-planet" title="${esc(p.tooltip)}">
            <span class="tdp-sym">${PLANET_SYMBOLS[p.name] || esc(p.name)}</span>
            <span class="tdp-sign">${signDE(p.sign)}</span>
            ${p.retro ? '<span class="tdp-retro">℞</span>' : ''}
          </div>
        `).join('')}
      </div>
      <div class="transit-day-intensity">
        ${(day.sector_intensity || []).map((v, i) =>
          v > 0.15
            ? `<span class="tdi-bar ${intensityClass(v)}" title="${i + 1}. Haus"></span>`
            : '<span class="tdi-bar tdi-bar--empty"></span>'
        ).join('')}
      </div>
    `;
    strip.appendChild(col);
  });

  return el;
}

export function TransitCalendarPage(app, { profile } = {}) {
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

    content.appendChild(renderNow(nowRes.data.planets, nowRes.data.sector_intensity || [], profile));
    content.appendChild(renderTimeline(timelineRes.data.days || [], profile));
    content.hidden = false;
  }).catch((err) => {
    loading.hidden = true;
    errorEl.textContent = `Fehler: ${err.message}`;
    errorEl.hidden = false;
  });
}
