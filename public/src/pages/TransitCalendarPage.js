// public/src/pages/TransitCalendarPage.js
import { getTransitNow, getTransitTimeline } from '../api/client.js';
import { InsightHero }              from '../components/InsightHero.js';
import { PersistentSignatureBar }   from '../components/PersistentSignatureBar.js';
import {
  buildExperienceProfile,
  buildCoreIdentity,
  buildWeeklyThemes,
} from '../domain/experienceCopy.js';

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
  el.innerHTML = `<h2 class="transit-section-title">7-Tage-Strip mit Tagesthemen</h2><div class="transit-week-strip"></div>`;

  const strip = el.querySelector('.transit-week-strip');
  const today = new Date().toISOString().split('T')[0];
  const themes = buildWeeklyThemes(days || []);

  days.forEach((day, idx) => {
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

    const theme = themes[idx];
    col.innerHTML = `
      <div class="transit-day-date">${formatDate(day.date)}</div>
      ${theme ? `<div class="transit-day-theme">${esc(theme.theme)}</div>` : ''}
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

function findNextPeak(days) {
  let best = null;
  for (const d of days || []) {
    const max = (d.sector_intensity || []).reduce((a, b) => Math.max(a, b), 0);
    const houseIdx = (d.sector_intensity || []).indexOf(max);
    if (!best || max > best.intensity) best = { date: d.date, intensity: max, house: houseIdx + 1 };
  }
  return best;
}

function renderTodayActive(planets, sectorIntensity) {
  const top = (sectorIntensity || [])
    .map((v, i) => ({ house: i + 1, intensity: v }))
    .filter(s => s.intensity > 0.2)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 2);
  const el = document.createElement('section');
  el.className = 'transit-today-card';
  const h = document.createElement('h3'); h.textContent = 'Heute aktiv';
  el.appendChild(h);
  const p = document.createElement('p');
  p.textContent = top.length
    ? `Aktivste Häuser: ${top.map(s => `${s.house}. Haus (${Math.round(s.intensity * 100)})`).join(', ')}.`
    : 'Heute kein dominantes Haus — ruhiger Tagespuls.';
  el.appendChild(p);
  return el;
}

function renderNextPeakCard(days) {
  const peak = findNextPeak(days);
  if (!peak || peak.intensity < 0.25) return null;
  const el = document.createElement('section');
  el.className = 'transit-peak-card';
  const h = document.createElement('h3'); h.textContent = 'Nächster Peak';
  el.appendChild(h);
  const p = document.createElement('p');
  p.textContent = `Am ${formatDate(peak.date)} liegt der Wochen-Höhepunkt auf dem ${peak.house}. Haus.`;
  el.appendChild(p);
  return el;
}

export function TransitCalendarPage(app, { profile } = {}) {
  const expProfile = profile ? buildExperienceProfile(profile) : null;
  const identity   = expProfile ? buildCoreIdentity(expProfile) : null;

  app.innerHTML = `
    <main class="transit-calendar-page">
      <div class="sig-bar-mount"></div>
      <header class="transit-header">
        <a href="#/" class="transit-back-link">← Zurück</a>
      </header>
      <div class="insight-hero-mount"></div>
      <div class="transit-today-mount"></div>
      <div class="transit-peak-mount"></div>
      <div class="transit-loading" role="status" aria-live="polite">Transits werden geladen…</div>
      <div class="transit-content" hidden></div>
      <details class="transit-planet-details">
        <summary>Planetendetails — alle aktuellen Positionen</summary>
        <div class="transit-planet-details-content"></div>
      </details>
      <aside class="transit-legend">
        <p><strong>Legende:</strong> Themen folgen einer wochentag-stabilen Heuristik. Sektor-Intensität misst, wie stark die 12 Häuser im aktuellen Transit-Bild aktiviert sind.</p>
      </aside>
      <div class="transit-error" role="alert" hidden></div>
    </main>
  `;

  if (expProfile) {
    app.querySelector('.sig-bar-mount').replaceWith(
      PersistentSignatureBar({
        dayMaster: identity.dayMaster,
        sun:       identity.sun,
        coherence: expProfile.fusion.coherence,
      })
    );
  } else {
    app.querySelector('.sig-bar-mount').remove();
  }

  app.querySelector('.insight-hero-mount').replaceWith(
    InsightHero({
      eyebrow:   'Transit',
      title:     'Diese Woche in deiner Signatur',
      statement: 'Welche Felder gerade aktiviert sind und wo der nächste Peak liegt.',
    })
  );

  const loading = app.querySelector('.transit-loading');
  const content = app.querySelector('.transit-content');
  const errorEl = app.querySelector('.transit-error');
  const planetDetailsContent = app.querySelector('.transit-planet-details-content');

  Promise.all([getTransitNow(), getTransitTimeline()]).then(([nowRes, timelineRes]) => {
    loading.hidden = true;

    if (!nowRes.ok || !timelineRes.ok) {
      errorEl.textContent = 'Transitdaten konnten nicht geladen werden. Bitte später erneut versuchen.';
      errorEl.hidden = false;
      return;
    }

    const days = timelineRes.data.days || [];

    // Today active + next peak (top of page)
    app.querySelector('.transit-today-mount').replaceWith(
      renderTodayActive(nowRes.data.planets, nowRes.data.sector_intensity || [])
    );
    const peakEl = renderNextPeakCard(days);
    if (peakEl) {
      app.querySelector('.transit-peak-mount').replaceWith(peakEl);
    } else {
      app.querySelector('.transit-peak-mount').remove();
    }

    // 7-day strip with daily themes
    content.appendChild(renderTimeline(days, profile));
    content.hidden = false;

    // Planet details deep-dive
    planetDetailsContent.appendChild(renderNow(nowRes.data.planets, nowRes.data.sector_intensity || [], profile));
  }).catch((err) => {
    loading.hidden = true;
    errorEl.textContent = `Fehler: ${err.message}`;
    errorEl.hidden = false;
  });
}
