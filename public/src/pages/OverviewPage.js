import { generateCoreStatement } from '../domain/coreStatement.js';
import { renderBaziPillars }     from '../domain/baziRenderer.js';
import { SourceBadge }           from '../components/SourceBadge.js';
import { UnavailableCard }       from '../components/UnavailableCard.js';
import { ConfidenceBar }         from '../components/ConfidenceBar.js';

const SIGN_DE = {
  Aries:'Widder', Taurus:'Stier', Gemini:'Zwillinge', Cancer:'Krebs',
  Leo:'Löwe', Virgo:'Jungfrau', Libra:'Waage', Scorpio:'Skorpion',
  Sagittarius:'Schütze', Capricorn:'Steinbock', Aquarius:'Wassermann', Pisces:'Fische',
};

function signDE(s) { return s ? (SIGN_DE[s] || s) : null; }

export function OverviewPage(app, { profile, onNavigate }) {
  const timeCert = profile._inputMeta?.timeCertainty || 'exact';
  const coreStatement = generateCoreStatement(profile);

  const missing = [];
  if (timeCert === 'unknown') missing.push('Stundenhoroskop (Geburtszeit unbekannt)');
  if (!profile.western?.ascendant && timeCert !== 'unknown') missing.push('Aszendent');
  if (!profile.western?.bodies?.Sun?.sign) missing.push('Sonnenzeichen');

  const cards = [];

  const sun = profile.western?.bodies?.Sun;
  if (sun?.sign) cards.push({ title: 'Sonne', value: signDE(sun.sign), source: 'api', note: null });
  else cards.push(null);

  const moon = profile.western?.bodies?.Moon;
  if (moon?.sign) cards.push({ title: 'Mond', value: signDE(moon.sign), source: 'api' });

  if (profile.western?.ascendant) {
    cards.push({ title: 'Aszendent', value: signDE(profile.western.ascendant), source: 'api' });
  } else {
    cards.push({
      unavailable: true,
      title: 'Aszendent',
      reason: timeCert === 'unknown'
        ? 'Für den Aszendenten brauchst du deine genaue Geburtszeit. Weißt du sie?'
        : 'Aszendent wird vom API nicht geliefert.',
      action: timeCert === 'unknown'
        ? { label: 'Geburtszeit nachschlagen', handler: () => onNavigate?.('/') }
        : null,
    });
  }

  const dm = profile.bazi?.day_master;
  if (dm?.stem) {
    cards.push({ title: 'Day Master', value: `${dm.stem}${dm.element ? ' ' + dm.element : ''}`, source: 'api' });
  }

  const ci = profile.fusion?.coherence_index;
  if (ci !== null && ci !== undefined) {
    const pct = Math.round(ci * 100);
    cards.push({
      title: 'Fusion-Kohärenz',
      value: `${pct}%`,
      source: 'api_aggregated',
      note: 'Deckungsgleichheit deiner westlichen und östlichen Signatur',
    });
  }

  app.innerHTML = `
    <main class="overview-page">
      <nav class="page-nav">
        <a href="#/love" class="nav-link">Liebe</a>
        <a href="#/career-finance" class="nav-link">Karriere</a>
        <a href="#/personality" class="nav-link">Persönlichkeit</a>
        <a href="#/dashboard" class="nav-link">Dashboard</a>
        <a href="#/synastry" class="nav-link">Synastrie</a>
        <a href="#/transit-calendar" class="nav-link">Transitkalender</a>
        <a href="#/daily" class="nav-link">Tagespuls</a>
      </nav>
      <section class="core-statement-section" aria-label="Kernsatz"></section>
      <section class="bazi-section" aria-label="BaZi Vier Säulen">
        <h2>BaZi — Vier Säulen</h2>
        <div class="bazi-pillars-wrapper"></div>
      </section>
      <section class="signature-cards-section" aria-label="Signatur-Karten">
        <h2>Deine Signatur</h2>
        <div class="cards-grid"></div>
      </section>
      <footer class="overview-footer">
        <button class="new-calc-btn">Neue Berechnung</button>
      </footer>
    </main>
  `;

  // Core statement — textContent keeps API content safe
  const csSection = app.querySelector('.core-statement-section');
  if (coreStatement) {
    const p = document.createElement('p');
    p.className = 'core-statement';
    p.textContent = coreStatement;
    csSection.appendChild(p);
  } else {
    const p = document.createElement('p');
    p.className = 'core-statement--empty';
    p.textContent = 'Zu wenige Daten für einen Kernsatz.';
    csSection.appendChild(p);
  }

  if (missing.length) {
    const note = document.createElement('p');
    note.className = 'missing-note';
    note.textContent = `Hinweis: ${missing.join(', ')}`;
    app.querySelector('.bazi-section').appendChild(note);
  }

  app.querySelector('.bazi-pillars-wrapper')
    .appendChild(renderBaziPillars(profile.bazi, { timeCertainty: timeCert }));

  const grid = app.querySelector('.cards-grid');
  cards.forEach((card) => {
    if (!card) return;
    if (card.unavailable) {
      grid.appendChild(UnavailableCard({ title: card.title, reason: card.reason, action: card.action }));
      return;
    }
    const el = document.createElement('div');
    el.className = 'signature-card';

    const header = document.createElement('div');
    header.className = 'card-header';
    const h3 = document.createElement('h3');
    h3.className = 'card-title';
    h3.textContent = card.title;
    header.append(h3, SourceBadge(card.source));
    el.appendChild(header);

    const valueEl = document.createElement('div');
    valueEl.className = 'card-value';
    valueEl.textContent = card.value;
    el.appendChild(valueEl);

    if (card.note) {
      const noteEl = document.createElement('p');
      noteEl.className = 'card-note';
      noteEl.textContent = card.note;
      el.appendChild(noteEl);
    }

    grid.appendChild(el);
  });

  app.querySelector('.new-calc-btn').addEventListener('click', () => onNavigate?.('/'));
}
