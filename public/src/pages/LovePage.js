import { createLoveProjection } from '../domain/projections.js';
import { SourceBadge }          from '../components/SourceBadge.js';
import { ConfidenceBar }        from '../components/ConfidenceBar.js';
import { UnavailableCard }      from '../components/UnavailableCard.js';

// Western sign → element group
const SIGN_ELEMENT = {
  Aries: 'Feuer', Leo: 'Feuer', Sagittarius: 'Feuer',
  Taurus: 'Erde', Virgo: 'Erde', Capricorn: 'Erde',
  Gemini: 'Luft', Libra: 'Luft', Aquarius: 'Luft',
  Cancer: 'Wasser', Scorpio: 'Wasser', Pisces: 'Wasser',
};

// Generative Wu-Xing cycle info per dominant element
const WUXING_LOVE = {
  Holz:   { cycle: 'Holz nährt Feuer', description: 'Wachsende Tiefe — Zuneigung entfaltet sich organisch, wie ein Baum, der langsam größer wird.' },
  Feuer:  { cycle: 'Feuer nährt Erde', description: 'Leidenschaftliche Wärme — magnetische Anziehung, spontane Funken und Begeisterung, die anderen Halt gibt.' },
  Erde:   { cycle: 'Erde nährt Metall', description: 'Beständige Tiefe — Verlässlichkeit und Zugehörigkeit als Fundament jeder Verbindung.' },
  Metall: { cycle: 'Metall nährt Wasser', description: 'Klare Aufrichtigkeit — präzise Gefühle, echte Worte und klare Grenzen als Liebessprache.' },
  Wasser: { cycle: 'Wasser nährt Holz', description: 'Stille Verbundenheit — intuitive Nähe, Fließen statt Festhalten, tiefe emotionale Resonanz.' },
};

// Cross-element tension commentary (western fire/earth/air/water)
const ELEMENT_TENSION = {
  'Feuer-Wasser': 'Venus und Mond in Feuer und Wasser tendieren zu einer intensiven Polarität: lodernde Anziehung trifft auf Tiefe und Rückzugsbedürfnis.',
  'Wasser-Feuer': 'Feuer und Wasser in deiner Liebeslandschaft — Leidenschaft und Schutzbedürfnis können einander herausfordern und bereichern.',
  'Luft-Erde': 'Luftige Freiheit und erdige Beständigkeit: dein Wunsch nach Leichtigkeit trifft auf das Bedürfnis nach Stabilität.',
  'Erde-Luft': 'Erde und Luft in deiner emotionalen Struktur — Sicherheitsbedürfnis und Freiheitsdrang suchen Balance.',
};

function getElementTension(venusSign, moonSign) {
  if (!venusSign || !moonSign) return null;
  const ve = SIGN_ELEMENT[venusSign];
  const me = SIGN_ELEMENT[moonSign];
  if (!ve || !me || ve === me) return null;
  return ELEMENT_TENSION[`${ve}-${me}`] || null;
}

function generateHeadline(proj) {
  const venus = proj.primaryFactors.find((f) => f.label.startsWith('Venus'));
  const moon  = proj.primaryFactors.find((f) => f.label.startsWith('Mond'));
  const day   = proj.primaryFactors.find((f) => f.label.startsWith('BaZi'));

  if (venus && moon) {
    return `${venus.value.split(' —')[0]} — und emotional suchst du: ${moon.value.replace('Emotionales Bedürfnis: ', '').split(';')[0]}.`;
  }
  if (venus) return `${venus.value}.`;
  if (day) return `Deine Liebeswelt ist geprägt durch ${day.label}: ${day.value}.`;
  return null;
}

function factorCard(factor) {
  const el = document.createElement('div');
  el.className = 'factor-card';

  const header = document.createElement('div');
  header.className = 'factor-card-header';

  const label = document.createElement('span');
  label.className = 'factor-label';
  label.textContent = factor.label;

  header.append(label, SourceBadge(factor.source));
  el.appendChild(header);

  const value = document.createElement('p');
  value.className = 'factor-value';
  value.textContent = factor.value;
  el.appendChild(value);

  if (factor.note) {
    const note = document.createElement('p');
    note.className = 'factor-note';
    note.textContent = factor.note;
    el.appendChild(note);
  }

  return el;
}

export function LovePage(app, { profile, onNavigate }) {
  const proj   = createLoveProjection(profile);
  const headline = generateHeadline(proj);

  const venusSign = profile?.western?.bodies?.Venus?.sign;
  const moonSign  = profile?.western?.bodies?.Moon?.sign;
  const tension   = getElementTension(venusSign, moonSign);

  const wxEl     = profile?.fusion?.wu_xing_vectors?.fusion
                || profile?.fusion?.wu_xing_vectors?.western_planets;
  let dominantEl = null;
  if (wxEl) {
    let max = -Infinity;
    for (const [k, v] of Object.entries(wxEl)) { if (v > max) { max = v; dominantEl = k; } }
  }
  const wxLove = dominantEl ? WUXING_LOVE[dominantEl] : null;

  app.innerHTML = `
    <main class="love-page">
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Übersicht</a>
        <a href="#/career-finance" class="nav-link">Karriere</a>
        <a href="#/personality" class="nav-link">Persönlichkeit</a>
      </nav>

      <header class="page-header">
        <h1>Liebe &amp; Beziehung</h1>
        <div class="headline-section" aria-label="Deine Liebeslandschaft"></div>
      </header>

      <div class="confidence-section"></div>

      <section class="factors-section flows-easily" aria-label="Was fließt leicht">
        <h2>Was fließt leicht</h2>
        <p class="section-intro">Diese Qualitäten kommen dir in Beziehungen natürlich — sie sind deine Stärken im Kontakt.</p>
        <div class="factors-grid primary-factors"></div>
      </section>

      <section class="factors-section needs-awareness" aria-label="Was braucht Bewusstsein">
        <h2>Was braucht Bewusstsein</h2>
        <p class="section-intro">Diese Dynamiken sind kein "schlechtes Zeichen" — sie laden zur bewussten Gestaltung ein.</p>
        <div class="factors-grid supporting-factors"></div>
      </section>

      <section class="missing-section" aria-label="Was fehlt noch" hidden></section>

      <section class="wuxing-section" aria-label="Wu-Xing Beziehungsmuster" hidden>
        <h2>Wu-Xing Beziehungsmuster</h2>
        <div class="wuxing-content"></div>
      </section>

      <footer class="page-footer">
        <button class="new-calc-btn">Neue Berechnung</button>
      </footer>
    </main>
  `;

  // Headline
  const headlineSection = app.querySelector('.headline-section');
  if (headline) {
    const p = document.createElement('p');
    p.className = 'love-headline';
    p.textContent = headline;
    headlineSection.appendChild(p);
  }

  // Confidence bar
  app.querySelector('.confidence-section').appendChild(
    ConfidenceBar(proj.confidence, { label: 'Datenvollständigkeit' })
  );

  // Primary factors → "Was fließt leicht"
  const primaryGrid = app.querySelector('.primary-factors');
  proj.primaryFactors.forEach((f) => primaryGrid.appendChild(factorCard(f)));

  // Supporting factors → "Was braucht Bewusstsein"
  const supportGrid = app.querySelector('.supporting-factors');

  if (tension) {
    const tensionCard = document.createElement('div');
    tensionCard.className = 'factor-card factor-card--tension';
    const h = document.createElement('span');
    h.className = 'factor-label';
    h.textContent = 'Venus ↔ Mond Elementspannung';
    const badge = SourceBadge('static_interpretation');
    const header = document.createElement('div');
    header.className = 'factor-card-header';
    header.append(h, badge);
    const p = document.createElement('p');
    p.className = 'factor-value';
    p.textContent = tension;
    tensionCard.append(header, p);
    supportGrid.appendChild(tensionCard);
  }

  proj.supportingFactors.forEach((f) => supportGrid.appendChild(factorCard(f)));

  if (!proj.supportingFactors.length && !tension) {
    const empty = document.createElement('p');
    empty.className = 'empty-hint';
    empty.textContent = 'Für diese Sektion wird Geburtszeit benötigt.';
    supportGrid.appendChild(empty);
  }

  // Missing factors
  if (proj.missingFactors.length) {
    const section = app.querySelector('.missing-section');
    section.hidden = false;

    const h2 = document.createElement('h2');
    h2.textContent = 'Was fehlt noch';
    section.appendChild(h2);

    const intro = document.createElement('p');
    intro.className = 'section-intro';
    intro.textContent = 'Diese Aspekte konnten nicht berechnet werden — hier ist warum und was du tun kannst.';
    section.appendChild(intro);

    proj.missingFactors.forEach((m) => {
      section.appendChild(UnavailableCard({
        title: m,
        reason: m.includes('Geburtszeit') || m.includes('Häuser')
          ? 'Für Häuser und einige Faktoren wird die genaue Geburtszeit benötigt.'
          : 'Dieser Faktor konnte vom API nicht geliefert werden.',
        action: m.includes('Geburtszeit')
          ? { label: 'Geburtszeit eingeben', handler: () => onNavigate?.('/') }
          : null,
      }));
    });
  }

  // Wu-Xing section
  if (wxLove) {
    const section = app.querySelector('.wuxing-section');
    section.hidden = false;
    const content = section.querySelector('.wuxing-content');

    const cycle = document.createElement('div');
    cycle.className = 'wuxing-cycle';

    const cycleLabel = document.createElement('span');
    cycleLabel.className = 'wuxing-cycle-label';
    cycleLabel.textContent = wxLove.cycle;
    cycle.appendChild(cycleLabel);
    cycle.appendChild(SourceBadge('api_aggregated'));

    const desc = document.createElement('p');
    desc.className = 'wuxing-desc';
    desc.textContent = wxLove.description;

    const disclaimer = document.createElement('p');
    disclaimer.className = 'wuxing-disclaimer';
    disclaimer.textContent = 'Diese Deutung ist symbolischer Natur und tendiert zu — sie ist kein Versprechen.';

    content.append(cycle, desc, disclaimer);
  }

  app.querySelector('.new-calc-btn').addEventListener('click', () => onNavigate?.('/'));
}
