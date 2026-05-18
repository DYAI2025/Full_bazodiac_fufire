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

// Zeichen im Hauskontext — Zeichenspezifische Deutung, die den Hausthema nennt
const SIGN_HOUSE_CONTEXT = {
  Aries:       (theme) => `Du gehst ${theme}-Themen mit Spontaneität und Direktheit an — du packst an, ohne lang abzuwägen. Eigeninitiative und der Mut, Dinge anzustoßen, prägen diesen Bereich.`,
  Taurus:      (theme) => `Im ${theme}-Bereich suchst du Beständigkeit und Verlässlichkeit. Du baust hier langsam, aber auf Dauer — Vertrauen in das Solide ist deine stärkste Qualität.`,
  Gemini:      (theme) => `${theme} lebt für dich durch Vielfalt, Wechsel und geistige Beweglichkeit. Du brauchst hier Abwechslung und geistige Anregung — Routine ermüdet dich schnell.`,
  Cancer:      (theme) => `Du bringst Fürsorge und emotionale Tiefe in deine ${theme}-Welt. Zugehörigkeit und innere Sicherheit spielen hier eine zentrale, oft unbewusste Rolle.`,
  Leo:         (theme) => `${theme} ist für dich ein Feld der Selbstentfaltung und Sichtbarkeit. Du willst hier Eindruck hinterlassen — nicht aus Eitelkeit, sondern weil Ausstrahlung dein natürlicher Ausdruck ist.`,
  Virgo:       (theme) => `Du nähert dich ${theme}-Themen mit Sorgfalt, Analyse und dem Wunsch nach Verbesserung. Perfektion ist dein Kompass — doch Hilfsbereitschaft und Dienst am Detail sind deine Stärke.`,
  Libra:       (theme) => `Im ${theme}-Bereich suchst du Ausgewogenheit und Harmonie. Du wägst ab, hörst zu, vermittelst — manchmal auf Kosten deiner eigenen Meinung, die du aber dennoch deutlich spürst.`,
  Scorpio:     (theme) => `${theme} bedeutet für dich Tiefe oder gar nichts. Du bringst intensive, transformierende Energie hierher — Oberfläche reicht dir nicht. Kontrolle, Intensität und Wandel sind deine Themen.`,
  Sagittarius: (theme) => `Du erlebst ${theme} als Raum für Wachstum, Abenteuer und Sinnsuche. Enge Grenzen erträgst du schlecht — du brauchst Weite, Vision und den Horizont vor Augen.`,
  Capricorn:   (theme) => `${theme} organisierst du mit Disziplin und langem Atem. Du baust hier auf Substanz und Ergebnis — kurzfristiger Applaus interessiert dich weniger als nachhaltige Wirkung.`,
  Aquarius:    (theme) => `Im ${theme}-Bereich denkst du unkonventionell und brichst Muster. Du bringst originelle Impulse und den Mut zur Eigenständigkeit — Zugehörigkeit ja, Gleichschaltung nein.`,
  Pisces:      (theme) => `${theme} erfährst du durch Intuition und Empathie. Grenzen lösen sich hier auf — du spürst Verborgenes, träumst über Definitionen hinaus und empfängst, was andere übersehen.`,
};

// Planeten in Häusern — kurze kontextuelle Bedeutung
const PLANET_IN_HOUSE_SHORT = {
  Sun:         'Die Sonne hier stellt diesen Bereich ins Zentrum deiner Lebensenergie — Selbstverwirklichung findet hier statt.',
  Moon:        'Der Mond verbindet diesen Bereich tief mit deiner Gefühlswelt — Stimmungen, Bedürfnisse und emotionale Muster wirken hier besonders stark.',
  Mercury:     'Merkur schärft dein Denken und Kommunizieren in diesem Bereich — du analysierst, vernetzt und sprichst hier mit besonderer Intensität.',
  Venus:       'Venus bringt Anziehung und ästhetischen Sinn hierher — dieser Bereich berührt, was du begehrst und wertschätzt.',
  Mars:        'Mars setzt hier Antrieb und Willenskraft frei — du handelst, kämpfst oder behauptest dich in diesem Bereich besonders direkt.',
  Jupiter:     'Jupiter weitet diesen Bereich aus — Wachstum, Chancen und Großzügigkeit fließen hier leichter als anderswo.',
  Saturn:      'Saturn legt Anforderungen und Struktur an — Ausdauer in diesem Bereich zahlt sich aus, Abkürzungen kosten mehr.',
  Uranus:      'Uranus bringt Überraschungen und Wandel — dieser Bereich widersetzt sich Routine und hält dich in Bewegung.',
  Neptune:     'Neptun verwebt diesen Bereich mit Intuition, Träumen und fließenden Grenzen — Inspiration und Auflösung gehen hier Hand in Hand.',
  Pluto:       'Pluto trägt Tiefentransformation hierher — wo er steht, gibt es kein Halbherziges. Macht, Wandel und das Unvermeidliche werden spürbar.',
  'North Node': 'Der Mondknoten markiert hier dein Wachstumspotenzial in diesem Leben — eine Richtung, die sich richtig anfühlt, auch wenn sie fordert.',
  Chiron:      'Chiron zeigt hier einen verletzlichen Bereich — und zugleich deine tiefste Fähigkeit zu heilen, sobald du dich ihm stellst.',
};

// Westliche Zeichen → Element (für Farbcodierung)
const SIGN_ELEMENT = {
  Aries: 'feuer', Leo: 'feuer', Sagittarius: 'feuer',
  Cancer: 'wasser', Scorpio: 'wasser', Pisces: 'wasser',
  Taurus: 'erde', Virgo: 'erde', Capricorn: 'erde',
  Gemini: 'luft', Libra: 'luft', Aquarius: 'luft',
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

  // Element-Legende
  const legend = document.createElement('div');
  legend.className = 'houses-element-legend';
  legend.innerHTML = `
    <span class="hel-item hel-item--feuer">🔴 Feuer: Widder, Löwe, Schütze</span>
    <span class="hel-item hel-item--erde">🟢 Erde: Stier, Jungfrau, Steinbock</span>
    <span class="hel-item hel-item--luft">⚪ Luft: Zwillinge, Waage, Wassermann</span>
    <span class="hel-item hel-item--wasser">🔵 Wasser: Krebs, Skorpion, Fische</span>
  `;
  section.appendChild(legend);

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
    const el = sign ? SIGN_ELEMENT[sign] : null;
    card.className = `house-card${el ? ` house-card--${el}` : ''}`;

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
    signBadge.className = `house-sign-badge${el ? ` house-sign-badge--${el}` : ''}${sign ? '' : ' house-sign-badge--empty'}`;
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

    // Quick context preview — visible without opening details
    if (sign) {
      const contextFn = SIGN_HOUSE_CONTEXT[sign];
      if (contextFn) {
        const preview = document.createElement('p');
        preview.className = 'house-card-preview';
        const fullText = contextFn(info?.theme || `Haus ${i}`);
        preview.textContent = fullText.length > 90 ? fullText.slice(0, 88) + '…' : fullText;
        card.appendChild(preview);
      }
    }

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
      const contextFn = SIGN_HOUSE_CONTEXT[sign];
      const interpText = document.createTextNode(
        contextFn ? contextFn(info?.theme || `Haus ${i}`) : `${signText} prägt deinen ${info?.theme || `${i}. Haus`}-Bereich auf charakteristische Weise.`
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

        // Contextual planet-in-house interpretation
        const pInterp = PLANET_IN_HOUSE_SHORT[name];
        const pInterpEl = pInterp ? document.createElement('p') : null;
        if (pInterpEl) {
          pInterpEl.className = 'house-planet-interp';
          pInterpEl.textContent = pInterp;
        }

        pRow.append(pName, pSign);
        if (pRetro) pRow.appendChild(pRetro);
        if (pInterpEl) pRow.appendChild(pInterpEl);
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
        <a href="#/fusion"         class="nav-link">WuXing Fusion</a>
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
