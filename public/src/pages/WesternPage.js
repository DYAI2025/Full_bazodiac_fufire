// public/src/pages/WesternPage.js
//
// Second Sprint E page. Reads `currentProfile` from app.js, enriches
// the western section via westernBodyEnrichment + aspectEnrichment,
// renders Page-Head + Cores (Sun/Moon/Asc/MC) + Planets-Grid (Mercury..Pluto
// + Chiron/Lilith/NorthNode) + Activations (top-3 salient aspects) + CTAs.
//
// Design reference: /tmp/fufire-spec/src/pages-1.jsx:514 (WesternPage).
// Enrichment contracts:
//   - westernBodyEnrichment.enrichWesternBodies → bodies VM
//   - aspectEnrichment.enrichWesternAspects → top-3 salient aspects
//
// MC + Asc come from `western.angles.{MC,Ascendant}` as raw longitudes —
// we synthesize body records (with sign derived via signFromLongitude)
// and route them through enrichBody for shape consistency.

import { enrichWesternBodies, enrichBody } from '../domain/westernBodyEnrichment.js';
import { enrichWesternAspects }            from '../domain/aspectEnrichment.js';
import { signFromLongitude }               from '../data/astro-mappings.js';
import { ExplainableCard }                 from '../components/ExplainableCard.js';
import { UnavailableCard }                 from '../components/UnavailableCard.js';
import { wireHeroRolling }                 from '../components/RollingText.js';

const CORE_ROLE_LABEL = {
  Sun:       'Sonne · Identität',
  Moon:      'Mond · Inneres Klima',
  Ascendant: 'Aszendent · Auftritt',
  MC:        'MC · Beruflicher Vektor',
};

const PLANET_ORDER = ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','Lilith','NorthNode'];

// Synthesize an enrichable body record from a raw angle longitude (Asc/MC).
function angleBody(key, longitude, houseCusps, signOverride = null) {
  if (longitude === null || longitude === undefined) return null;
  const sign = signOverride || signFromLongitude(longitude);
  if (!sign) return null;
  return enrichBody(key, {
    longitude,
    sign,
    degree_in_sign: ((Number(longitude) % 30) + 30) % 30,
    retrograde: false,
  }, houseCusps);
}

function bodyValueLine(b) {
  if (!b) return '—';
  const parts = [b.signDE || b.sign, b.degDisplay, (b.house ? `${b.house}. Haus` : null)];
  return parts.filter(Boolean).join(' · ');
}

function bodyHelperLine(b) {
  if (!b) return '';
  return [b.element, b.retrograde ? 'rückläufig ℞' : null].filter(Boolean).join(' · ');
}

function bodyDrawerMeaning(b) {
  if (!b) return null;
  return {
    title:    `${b.name || b.key} — ${b.signDE || b.sign || ''}`,
    subtitle: [b.element, b.degDisplay, b.house ? `${b.house}. Haus` : null].filter(Boolean).join(' · '),
    what:     b.glyph ? `${b.glyph} ${b.signDE || b.sign || ''}` : (b.signDE || b.sign || ''),
    meaning:  CORE_ROLE_LABEL[b.key] || '',
    resource: b.resource || '',
    shadow:   b.shadow || '',
    practice: b.practice || '',
    extras:   b.retrograde ? ['Rückläufig (℞) — wirkt nach innen, langsamer Ausdruck.'] : [],
  };
}

function bodyCard(b, roleLabel, isCore = false) {
  if (!b) {
    return UnavailableCard({
      title: roleLabel,
      reason: 'Faktor konnte nicht berechnet werden — Geburtszeit oder Ortskoordinaten prüfen.',
    });
  }
  return ExplainableCard({
    domain:      'west',
    label:       roleLabel,
    value:       bodyValueLine(b),
    helper:      bodyHelperLine(b),
    highlighted: false,
    meaning:     isCore ? bodyDrawerMeaning(b) : { title: b.name || b.key, meaning: `${b.signDE || b.sign} · ${b.degDisplay || ''}`.trim() },
  });
}

function aspectRow(asp) {
  const row = document.createElement('article');
  row.className = 'western-aspect-row';
  const head = document.createElement('header');
  head.className = 'western-aspect-row__head';
  const label = document.createElement('span');
  label.className = 'western-aspect-row__label';
  label.textContent = asp.label || `${asp.planet1DE || asp.planet1} ${asp.typeDE || asp.type} ${asp.planet2DE || asp.planet2}`;
  const orb = document.createElement('span');
  orb.className = 'western-aspect-row__orb';
  orb.textContent = (typeof asp.orb === 'number') ? `Orbis ${asp.orb.toFixed(2)}°` : '';
  head.append(label, orb);
  row.appendChild(head);
  return row;
}

export function WesternPage(app, { profile, onNavigate } = {}) {
  const enriched = enrichWesternBodies(profile?.western);
  const cusps    = profile?.western?.houses || {};

  // Asc + MC synthesized from raw angles. western.ascendant gives the
  // sign string already (Aries…); we still pass the longitude so house
  // computation lands on house 1 by definition (Asc = cusp 1).
  const ascSign = profile?.western?.ascendant || null;
  const ascLon  = profile?.western?.angles?.Ascendant ?? null;
  const mcLon   = profile?.western?.angles?.MC ?? null;
  const asc = angleBody('Ascendant', ascLon, cusps, ascSign);
  const mc  = angleBody('MC',        mcLon,  cusps);

  const aspects = enrichWesternAspects(profile?.western, 3);

  app.innerHTML = `
    <main class="western-page system-layer system-layer--west" data-lane="west">
      <div class="sig-bar-mount"></div>
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Signatur-Übersicht</a>
      </nav>

      <header class="page-head" data-section="hero">
        <p class="page-eyebrow">Westliche Astrologie</p>
        <h1 class="page-title bz-h1" data-page-title>Faktoren, Zeichen, Häuser</h1>
        <p class="page-intro">
          Ein westliches Geburtshoroskop ordnet jedem Planeten ein Zeichen und ein Haus zu.
          <strong>Planet</strong> = was zieht (Funktion). <strong>Zeichen</strong> = wie es sich zeigt (Stil).
          <strong>Haus</strong> = wo es im Leben wirkt (Bühne). Drei Schichten — keine Etiketten, sondern Bewegung.
        </p>
      </header>

      <section class="western-cores" aria-label="Kernfaktoren" data-section="cores">
        <p class="layer-eyebrow">Kernkarten</p>
        <h2 class="layer-title bz-h2">Sonne, Mond, Aszendent, MC</h2>
        <div class="western-cores-grid"></div>
      </section>

      <section class="western-planets" aria-label="Weitere Planeten" data-section="planets">
        <p class="layer-eyebrow">Weitere Faktoren</p>
        <h2 class="layer-title bz-h2">Wie sie ergänzen</h2>
        <div class="western-planets-grid"></div>
      </section>

      <section class="western-activations" aria-label="Aktivierungen" data-section="activations">
        <p class="layer-eyebrow">Lese-Schlüssel · Aktivierungen</p>
        <h2 class="layer-title bz-h2">Drei sprechende Bewegungen</h2>
        <div class="western-activations-list"></div>
      </section>

      <footer class="page-actions">
        <button type="button" class="cta-btn nav-houses">Häuser im Detail →</button>
        <button type="button" class="cta-btn cta-btn--ghost nav-fusion">Mit BaZi fusionieren →</button>
      </footer>
    </main>
  `;

  wireHeroRolling(app);

  // ── Cores: Sun, Moon, Asc, MC ──────────────────────────────────────────
  const coreGrid = app.querySelector('.western-cores-grid');
  for (const [key, body] of [['Sun', enriched.Sun], ['Moon', enriched.Moon], ['Ascendant', asc], ['MC', mc]]) {
    coreGrid.appendChild(bodyCard(body, CORE_ROLE_LABEL[key] || key, true));
  }

  // ── Planets grid ────────────────────────────────────────────────────────
  const planetGrid = app.querySelector('.western-planets-grid');
  for (const key of PLANET_ORDER) {
    const body = enriched[key];
    if (!body) continue; // skip silently — body absence is API-level concern
    planetGrid.appendChild(bodyCard(body, body.name || key, false));
  }

  // ── Activations ─────────────────────────────────────────────────────────
  const actList = app.querySelector('.western-activations-list');
  if (aspects.length === 0) {
    actList.appendChild(UnavailableCard({
      title: 'Aktivierungen',
      reason: 'Keine Aspekte im API-Profil — Geburtszeit oder Berechnung prüfen.',
    }));
  } else {
    for (const asp of aspects) actList.appendChild(aspectRow(asp));
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  app.querySelector('.nav-houses')?.addEventListener('click', () => onNavigate?.('/overview'));
  app.querySelector('.nav-fusion')?.addEventListener('click', () => onNavigate?.('/fusion'));
}
