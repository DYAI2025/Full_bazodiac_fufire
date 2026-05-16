// public/src/pages/DailyPage.js
import { getDailyExperience } from '../api/client.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderThemes(themes) {
  if (!themes?.length) return '';
  return `<div class="daily-themes">${themes.map(t => `<span class="daily-theme-tag">${esc(t)}</span>`).join('')}</div>`;
}

function renderPillar(pillar) {
  if (!pillar) return '';
  return `<span class="daily-pillar">${esc(pillar.stem)}${esc(pillar.branch)}</span>`;
}

function renderSection(label, data, variant) {
  if (!data) return null;
  const el = document.createElement('div');
  el.className = `daily-section daily-section--${variant}`;
  el.innerHTML = `
    <h2 class="daily-section-title">${label}</h2>
    <p class="daily-summary">${esc(data.summary)}</p>
    ${renderThemes(data.themes)}
    ${data.opportunity ? `<div class="daily-callout daily-callout--opportunity"><strong>Chance:</strong> ${esc(data.opportunity)}</div>` : ''}
    ${data.caution ? `<div class="daily-callout daily-callout--caution"><strong>Achtung:</strong> ${esc(data.caution)}</div>` : ''}
    ${data.jieqi_note ? `<p class="daily-note daily-note--jieqi">${esc(data.jieqi_note)}</p>` : ''}
    ${data.weekday_note ? `<p class="daily-note">${esc(data.weekday_note)}</p>` : ''}
    ${data.evidence?.daily_pillar ? `<p class="daily-note">Tagessäule: ${renderPillar(data.evidence.daily_pillar)}</p>` : ''}
  `;
  return el;
}

function renderFusion(fusion) {
  if (!fusion) return null;
  const el = document.createElement('div');
  el.className = 'daily-section daily-section--fusion';
  el.innerHTML = `
    <h2 class="daily-section-title">Fusion — Synthese</h2>
    <p class="daily-summary">${esc(fusion.summary)}</p>
    <p class="daily-synthesis">${esc(fusion.synthesis)}</p>
    ${fusion.action ? `<div class="daily-action">${esc(fusion.action)}</div>` : ''}
    ${fusion.pushworthy ? '<div class="daily-pushworthy">Heute ist ein besonders aktiver Tag — nutze ihn.</div>' : ''}
  `;
  return el;
}

export function DailyPage(app) {
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  app.innerHTML = `
    <main class="daily-page">
      <header class="daily-header">
        <a href="#/" class="daily-back-link">← Zurück</a>
        <h1 class="daily-title">Tagespuls</h1>
        <p class="daily-date">${today}</p>
      </header>
      <div class="daily-loading" role="status" aria-live="polite">Tagespuls wird berechnet…</div>
      <div class="daily-content" hidden></div>
      <div class="daily-error" role="alert" hidden></div>
    </main>
  `;

  const loading = app.querySelector('.daily-loading');
  const content = app.querySelector('.daily-content');
  const errorEl = app.querySelector('.daily-error');

  let birthInput = null;
  try {
    const stored = sessionStorage.getItem('azodiac_birth_input');
    if (stored) birthInput = JSON.parse(stored);
  } catch { /* ignore */ }

  if (!birthInput) {
    loading.hidden = true;
    errorEl.textContent = 'Kein Geburts-Datensatz gefunden. ';
    const link = document.createElement('a');
    link.href = '#/';
    link.textContent = 'Bitte zuerst ein Profil berechnen.';
    errorEl.appendChild(link);
    errorEl.hidden = false;
    return;
  }

  getDailyExperience(birthInput).then((res) => {
    loading.hidden = true;

    if (!res.ok) {
      errorEl.textContent = res.error || 'Tagespuls konnte nicht geladen werden.';
      errorEl.hidden = false;
      return;
    }

    const data = res.data;
    [
      renderSection('Westlicher Impuls', data.western, 'western'),
      renderSection('BaZi — Östlicher Impuls', data.eastern, 'eastern'),
      renderFusion(data.fusion),
    ].forEach(el => { if (el) content.appendChild(el); });

    if (data._meta?.bootstrap_profile) {
      const meta = data._meta.bootstrap_profile;
      const metaEl = document.createElement('p');
      metaEl.className = 'daily-meta';
      metaEl.textContent = `Profil: ${meta.sun_sign || ''} · ${meta.day_master || ''}`;
      content.appendChild(metaEl);
    }

    content.hidden = false;
  }).catch((err) => {
    loading.hidden = true;
    errorEl.textContent = `Fehler: ${err.message}`;
    errorEl.hidden = false;
  });
}
