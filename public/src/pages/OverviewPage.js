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

// ── Häuser-Metadaten ──────────────────────────────────────────────────────────
const HOUSE_INFO = [
  null, // Index 0 ungenutzt
  { name: '1. Haus — Aszendent', theme: 'Identität & Außenwirkung',
    desc: 'Das 1. Haus zeigt, wie du auf andere wirkst — dein Erscheinungsbild, dein Körper und den ersten Eindruck, den du hinterlässt. Es ist das Haus des Selbst.' },
  { name: '2. Haus', theme: 'Ressourcen & Werte',
    desc: 'Das 2. Haus steht für dein Verhältnis zu Besitz, Geld und allem, was du als wertvoll empfindest — materiell wie immateriell.' },
  { name: '3. Haus', theme: 'Kommunikation & Denken',
    desc: 'Das 3. Haus regiert Sprache, Denken, kurze Reisen und die unmittelbare Umgebung. Wie du kommunizierst und lernst, zeigt sich hier.' },
  { name: '4. Haus — IC', theme: 'Familie & Herkunft',
    desc: 'Das 4. Haus ist das Fundament — deine Wurzeln, Herkunftsfamilie, Heimat und innere emotionale Basis.' },
  { name: '5. Haus', theme: 'Kreativität & Freude',
    desc: 'Das 5. Haus steht für Selbstausdruck, schöpferische Energie, Spiel, Liebe und Freude. Hier lebt das Kind in dir.' },
  { name: '6. Haus', theme: 'Arbeit & Gesundheit',
    desc: 'Das 6. Haus regiert Alltag, Routine, Körperpflege und den Dienst an anderen. Es zeigt, wie du deine Energie in der Praxis organisierst.' },
  { name: '7. Haus — Deszendent', theme: 'Partnerschaft & Begegnung',
    desc: 'Das 7. Haus steht für bedeutsame Gegenüber — Liebespartner, enge Freundschaften, Geschäftspartner. Es zeigt, was du im anderen suchst.' },
  { name: '8. Haus', theme: 'Transformation & Tiefe',
    desc: 'Das 8. Haus berührt das Verborgene — Wandlung, Intimität, gemeinsame Ressourcen und den Umgang mit dem Unausweichlichen.' },
  { name: '9. Haus', theme: 'Philosophie & Wachstum',
    desc: 'Das 9. Haus steht für Weltanschauung, Glaube, Fernreisen und höheres Lernen. Hier suchst du nach Sinn und Weite.' },
  { name: '10. Haus — MC', theme: 'Karriere & öffentliche Rolle',
    desc: 'Das 10. Haus zeigt deine gesellschaftliche Wirkung, Berufung und den Platz, den du in der Welt einnimmst.' },
  { name: '11. Haus', theme: 'Gemeinschaft & Zukunft',
    desc: 'Das 11. Haus steht für Freundschaften, Netzwerke, kollektive Zugehörigkeit und deine Visionen für die Zukunft.' },
  { name: '12. Haus', theme: 'Verborgenes & Rückzug',
    desc: 'Das 12. Haus berührt das Unbewusste, die Stille und den Rückzug. Hier liegen verborgene Stärken — und verdrängte Muster.' },
];

// Zeichen im Hauskontext — kurze Deutung
const SIGN_IN_HOUSE = {
  Aries:       'Widder bringt Direktheit, Eigeninitiative und Durchsetzungskraft',
  Taurus:      'Stier bringt Beständigkeit, Sinnlichkeit und Ausdauer',
  Gemini:      'Zwillinge bringen Beweglichkeit, Neugier und Kommunikationsstärke',
  Cancer:      'Krebs bringt Tiefe, Fürsorge und emotionale Sensibilität',
  Leo:         'Löwe bringt Ausstrahlung, Großzügigkeit und Selbstbewusstsein',
  Virgo:       'Jungfrau bringt Präzision, Dienst und analytisches Feingefühl',
  Libra:       'Waage bringt Balance, Harmonie und Beziehungsbewusstsein',
  Scorpio:     'Skorpion bringt Tiefe, Transformation und magnetische Intensität',
  Sagittarius: 'Schütze bringt Freiheitsdrang, Weitsicht und Begeisterungsfähigkeit',
  Capricorn:   'Steinbock bringt Struktur, Ausdauer und zielorientierte Disziplin',
  Aquarius:    'Wassermann bringt Originalität, Unabhängigkeit und Gemeinschaftssinn',
  Pisces:      'Fische bringen Empathie, Intuition und spirituelle Tiefe',
};

// ── Planeten-Namen (DE) ───────────────────────────────────────────────────────
const PLANET_DE = {
  Sun: 'Sonne ☉', Moon: 'Mond ☽', Mercury: 'Merkur ☿', Venus: 'Venus ♀',
  Mars: 'Mars ♂', Jupiter: 'Jupiter ♃', Saturn: 'Saturn ♄',
  Uranus: 'Uranus ♅', Neptune: 'Neptun ♆', Pluto: 'Pluto ♇',
  'North Node': 'Mondknoten ☊', Chiron: 'Chiron ⚷',
};

// ── Häuser-Section rendern ────────────────────────────────────────────────────
function renderWesternHouses(profile) {
  const section = document.createElement('section');
  section.className = 'western-houses-section';
  section.setAttribute('aria-label', 'Häusersystem');

  const h2 = document.createElement('h2');
  h2.textContent = 'Häusersystem';
  section.appendChild(h2);

  const intro = document.createElement('p');
  intro.className = 'section-intro';
  intro.textContent = 'Die 12 Häuser zeigen, in welchen Lebensbereichen deine Planetenenergien wirken. Jedes Haus beginnt im Zeichen des Hauskuspids.';
  section.appendChild(intro);

  const houses = profile?.western?.houses;
  const bodies  = profile?.western?.bodies || {};

  // Planeten nach Hausnummer gruppieren
  const planetsByHouse = {};
  for (const [name, body] of Object.entries(bodies)) {
    const h = body?.house;
    if (h == null) continue;
    const key = String(h);
    if (!planetsByHouse[key]) planetsByHouse[key] = [];
    planetsByHouse[key].push({ name, body });
  }

  // Einzelnes Haus auflösen (Object- oder Array-Form)
  function getHouseEntry(num) {
    if (!houses) return null;
    if (Array.isArray(houses)) return houses[num - 1] || null;
    return houses[String(num)] || null;
  }

  const list = document.createElement('div');
  list.className = 'houses-list';

  for (let i = 1; i <= 12; i++) {
    const entry    = getHouseEntry(i);
    const sign     = entry?.sign || null;
    const signText = sign ? signDE(sign) : null;
    const info     = HOUSE_INFO[i];
    const planetsHere = planetsByHouse[String(i)] || [];

    const card = document.createElement('div');
    card.className = `house-card${sign ? ' house-card--has-sign' : ' house-card--no-sign'}`;

    // ── Header: Nummer + Zeichen + Planeten-Chips ─────────────────────────
    const header = document.createElement('div');
    header.className = 'house-card-header';

    const numBadge = document.createElement('span');
    numBadge.className = 'house-num';
    numBadge.textContent = `${i}.`;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'house-title';
    titleSpan.textContent = info?.theme || `Haus ${i}`;

    const signBadge = document.createElement('span');
    signBadge.className = `house-sign-badge${sign ? '' : ' house-sign-badge--empty'}`;
    signBadge.textContent = signText || '—';

    header.append(numBadge, titleSpan, signBadge);

    // Planeten-Chips
    if (planetsHere.length) {
      const chips = document.createElement('div');
      chips.className = 'house-planets';
      planetsHere.forEach(({ name, body }) => {
        const chip = document.createElement('span');
        chip.className = `planet-chip${body.retrograde ? ' planet-chip--retro' : ''}`;
        const label = PLANET_DE[name] || name;
        chip.textContent = body.retrograde ? `${label} ℞` : label;
        if (body.sign) chip.title = `${SIGN_DE[body.sign] || body.sign}`;
        chips.appendChild(chip);
      });
      header.appendChild(chips);
    }

    card.appendChild(header);

    // ── Aufklappbare Deutung ───────────────────────────────────────────────
    const details = document.createElement('details');
    details.className = 'house-details';

    const summary = document.createElement('summary');
    summary.className = 'house-summary';
    summary.textContent = 'Bedeutung & individuelle Deutung';
    details.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'house-details-content';

    // Allgemeine Bedeutung
    const meaningP = document.createElement('p');
    meaningP.className = 'house-meaning';
    meaningP.textContent = info?.desc || '';
    content.appendChild(meaningP);

    // Individuelle Deutung (Zeichen in diesem Haus)
    if (sign) {
      const interpDiv = document.createElement('div');
      interpDiv.className = 'house-interp';
      const interpLabel = document.createElement('strong');
      interpLabel.textContent = `${signText} im ${i}. Haus: `;
      const interpText = document.createTextNode(
        `${SIGN_IN_HOUSE[sign] || signText} in den Bereich „${info?.theme || `Haus ${i}`}".`
      );
      interpDiv.append(interpLabel, interpText);
      content.appendChild(interpDiv);
    } else {
      const noSign = document.createElement('p');
      noSign.className = 'house-no-sign';
      noSign.textContent = 'Für die Zeichenzuordnung wird die genaue Geburtszeit benötigt.';
      content.appendChild(noSign);
    }

    // Planeten in diesem Haus — Details
    if (planetsHere.length) {
      const planetsDiv = document.createElement('div');
      planetsDiv.className = 'house-planets-detail';
      const plLabel = document.createElement('p');
      plLabel.className = 'house-planets-label';
      plLabel.textContent = 'Planeten in diesem Haus:';
      planetsDiv.appendChild(plLabel);

      planetsHere.forEach(({ name, body }) => {
        const pRow = document.createElement('div');
        pRow.className = 'house-planet-row';
        const pName = document.createElement('span');
        pName.className = 'house-planet-name';
        pName.textContent = PLANET_DE[name] || name;
        const pSign = document.createElement('span');
        pSign.className = 'house-planet-sign';
        pSign.textContent = body.sign ? `im ${signDE(body.sign)}` : '';
        const pRetro = body.retrograde ? document.createElement('span') : null;
        if (pRetro) { pRetro.className = 'house-planet-retro'; pRetro.textContent = '℞ rückläufig'; }
        pRow.append(pName, pSign);
        if (pRetro) pRow.appendChild(pRetro);
        planetsDiv.appendChild(pRow);
      });
      content.appendChild(planetsDiv);
    }

    details.appendChild(content);
    card.appendChild(details);
    list.appendChild(card);
  }

  section.appendChild(list);
  return section;
}

// ── OverviewPage ──────────────────────────────────────────────────────────────
export function OverviewPage(app, { profile, onNavigate }) {
  const timeCert = profile._inputMeta?.timeCertainty || 'exact';
  const coreStatement = generateCoreStatement(profile);

  const missing = [];
  if (timeCert === 'unknown') missing.push('Stundenhoroskop (Geburtszeit unbekannt)');
  if (!profile.western?.ascendant && timeCert !== 'unknown') missing.push('Aszendent');
  if (!profile.western?.bodies?.Sun?.sign) missing.push('Sonnenzeichen');

  const cards = [];

  const sun = profile.western?.bodies?.Sun;
  if (sun?.sign) cards.push({ title: 'Sonne', value: signDE(sun.sign), source: 'api' });
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
        ? 'Für den Aszendenten brauchst du deine genaue Geburtszeit.'
        : 'Aszendent wird vom API nicht geliefert.',
      action: timeCert === 'unknown'
        ? { label: 'Geburtszeit nachschlagen', handler: () => onNavigate?.('/') }
        : null,
    });
  }

  const dm = profile.bazi?.day_master;
  if (dm?.stem) {
    cards.push({
      title: 'Day Master',
      value: `${dm.stem}${dm.element ? ' · ' + dm.element : ''}`,
      source: 'api',
    });
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
        <a href="#/love"           class="nav-link">Liebe</a>
        <a href="#/career-finance" class="nav-link">Karriere</a>
        <a href="#/personality"    class="nav-link">Persönlichkeit</a>
        <a href="#/dashboard"      class="nav-link">Dashboard</a>
        <a href="#/synastry"       class="nav-link">Synastrie</a>
        <a href="#/transit-calendar" class="nav-link">Transitkalender</a>
        <a href="#/daily"          class="nav-link">Tagespuls</a>
      </nav>
      <section class="core-statement-section" aria-label="Kernsatz"></section>
      <section class="bazi-section" aria-label="BaZi Vier Säulen">
        <h2>BaZi — Vier Säulen</h2>
        <div class="bazi-pillars-wrapper"></div>
      </section>
      <div class="western-houses-placeholder"></div>
      <section class="signature-cards-section" aria-label="Signatur-Karten">
        <h2>Deine Signatur</h2>
        <div class="cards-grid"></div>
      </section>
      <footer class="overview-footer">
        <button class="new-calc-btn">Neue Berechnung</button>
      </footer>
    </main>
  `;

  // Core statement
  const csSection = app.querySelector('.core-statement-section');
  const csText = coreStatement || 'Zu wenige Daten für einen Kernsatz.';
  const csP = document.createElement('p');
  csP.className = coreStatement ? 'core-statement' : 'core-statement--empty';
  csP.textContent = csText;
  csSection.appendChild(csP);

  // Hinweis fehlende Daten
  if (missing.length) {
    const note = document.createElement('p');
    note.className = 'missing-note';
    note.textContent = `Hinweis: ${missing.join(', ')}`;
    app.querySelector('.bazi-section').appendChild(note);
  }

  // BaZi Vier Säulen
  app.querySelector('.bazi-pillars-wrapper')
    .appendChild(renderBaziPillars(profile.bazi, { timeCertainty: timeCert }));

  // Westliche Häuser
  const housesPlaceholder = app.querySelector('.western-houses-placeholder');
  housesPlaceholder.replaceWith(renderWesternHouses(profile));

  // Signatur-Karten
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
