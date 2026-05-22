// public/src/pages/HousesPage.js
//
// Sprint E #4 — 12 houses overview. Reads profile.western.houses (cusp +
// sign per house) + profile.western.bodies (assigned body house via
// computeBodyHouse from westernBodyEnrichment). HOUSE_MEANINGS provides
// bedeutung + label.

import { computeBodyHouse } from '../domain/westernBodyEnrichment.js';
import { HOUSE_MEANINGS } from '../domain/meanings.js';
import { SIGN_DE } from '../data/astro-mappings.js';
import { UnavailableCard } from '../components/UnavailableCard.js';
import { RollingText } from '../components/RollingText.js';

function bodiesPerHouse(bodies, houseCusps) {
  const out = Array.from({ length: 13 }, () => []);
  if (!bodies || typeof bodies !== 'object') return out;
  for (const [name, body] of Object.entries(bodies)) {
    const h = body?.house ?? computeBodyHouse(body?.longitude, houseCusps);
    if (h >= 1 && h <= 12) out[h].push(name);
  }
  return out;
}

function houseCard(num, houseData, activeBodies) {
  const card = document.createElement('article');
  card.className = `house-card house-card--h${num}`;
  card.setAttribute('aria-label', `${num}. Haus`);

  const head = document.createElement('header');
  head.className = 'house-card__head';
  const meaning = HOUSE_MEANINGS[num] || {};
  const numEl = document.createElement('span');
  numEl.className = 'house-card__num';
  numEl.textContent = `${num}.`;
  const titleEl = document.createElement('h3');
  titleEl.className = 'house-card__title';
  titleEl.textContent = meaning.label || `Haus ${num}`;
  const glyphEl = document.createElement('span');
  glyphEl.className = 'house-card__glyph';
  glyphEl.textContent = meaning.glyph || '';
  head.append(numEl, titleEl, glyphEl);
  card.appendChild(head);

  if (houseData?.sign) {
    const sign = document.createElement('p');
    sign.className = 'house-card__sign';
    sign.textContent = SIGN_DE[houseData.sign] || houseData.sign;
    card.appendChild(sign);
  }

  if (meaning.context) {
    const ctx = document.createElement('p');
    ctx.className = 'house-card__context';
    ctx.textContent = meaning.context;
    card.appendChild(ctx);
  }

  if (activeBodies?.length) {
    const list = document.createElement('p');
    list.className = 'house-card__active';
    list.textContent = `Aktiv: ${activeBodies.join(' · ')}`;
    card.appendChild(list);
  }
  return card;
}

export function HousesPage(app, { profile, onNavigate } = {}) {
  const houses = profile?.western?.houses || null;
  const bodies = profile?.western?.bodies || {};

  app.innerHTML = `
    <main class="houses-page system-layer system-layer--house" data-lane="fusion">
      <div class="sig-bar-mount"></div>
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Signatur-Übersicht</a>
      </nav>

      <header class="page-head" data-section="hero">
        <p class="page-eyebrow">Häuser · Lebensbereiche</p>
        <h1 class="page-title bz-h1" data-page-title>Wo deine Energien wirken</h1>
        <p class="page-intro">
          Die 12 Häuser eines Geburtshoroskops sind keine Schubladen, sondern Bühnen.
          Jedes Haus ist ein Lebensbereich — der erste das Selbst, der zehnte das Werk,
          der zwölfte der Rückzug. Welche Planeten in welchem Haus stehen, zeigt wo
          deine Energien sich entfalten.
        </p>
      </header>

      <section class="houses-grid-section" aria-label="12 Häuser" data-section="content">
        <div class="houses-grid"></div>
      </section>

      <footer class="page-actions">
        <button type="button" class="cta-btn cta-btn--ghost nav-western">← Western-Karte</button>
        <button type="button" class="cta-btn nav-fusion">Fusion-Synthese →</button>
      </footer>
    </main>
  `;

  // I6: wire hero title as RollingText for visual consistency across subpages.
  const houseH1 = app.querySelector('[data-page-title]');
  if (houseH1) {
    const heroRoll = RollingText({ text: 'Wo deine Energien wirken', tagName: 'h1', className: 'page-title bz-h1' });
    heroRoll.setAttribute('data-rolling-text', 'hero');
    heroRoll.setAttribute('data-page-title', '');
    houseH1.replaceWith(heroRoll);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => heroRoll.startRolling?.());
    } else {
      heroRoll.startRolling?.();
    }
  }

  const grid = app.querySelector('.houses-grid');
  if (!houses) {
    grid.appendChild(UnavailableCard({
      title: 'Häuser',
      reason: 'Häuser-Daten nicht verfügbar — Geburtszeit erforderlich. Ohne Uhrzeit kann der Aszendent nicht bestimmt werden.',
      action: { label: 'Geburtszeit nachtragen', handler: () => onNavigate?.('/') },
    }));
  } else {
    const perHouse = bodiesPerHouse(bodies, houses);
    for (let n = 1; n <= 12; n++) {
      grid.appendChild(houseCard(n, houses[n], perHouse[n]));
    }
  }

  app.querySelector('.nav-western')?.addEventListener('click', () => onNavigate?.('/western'));
  app.querySelector('.nav-fusion')?.addEventListener('click',  () => onNavigate?.('/fusion'));
}
