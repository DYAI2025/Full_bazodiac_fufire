import { GeoInput }              from '../components/GeoInput.js';
import { CalculationProgress }   from '../components/CalculationProgress.js';
import { SourceBadge }           from '../components/SourceBadge.js';
import { InsightHero }           from '../components/InsightHero.js';
import { ActionExperimentCard }  from '../components/ActionExperimentCard.js';
import { calculateProfile, calculateSynastry } from '../api/client.js';
import { createSynastryProjection } from '../domain/projections.js';
import { computeDomainScores }    from '../synastry/domain-score.js';
import { HeatmapOverview }        from '../synastry/HeatmapOverview.js';
import { buildDynastyResonance }  from '../synastry/dynasty-resonance.js';
import { buildHouseComparisons, DOMAIN_HOUSES } from '../synastry/house-comparison.js';
import { ELEMENT_COLORS }         from '../data/astro-mappings.js';
import {
  buildExperienceProfile,
  buildActionExperiment,
} from '../domain/experienceCopy.js';
import { buildRelationshipResonance } from '../domain/relationshipResonance.js';
import { RelationshipSummaryHero }    from '../components/RelationshipSummaryHero.js';
import { ResonanceScoreBand }         from '../components/ResonanceScoreBand.js';
import { RelationshipSignalCard }     from '../components/RelationshipSignalCard.js';
import { ContactExperimentCard }      from '../components/ContactExperimentCard.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function SynastryPage(app) {
  app.innerHTML = `
    <main class="synastry-page">
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Übersicht</a>
      </nav>

      <header class="page-header">
        <h1>Synastrie</h1>
        <p class="page-subtitle">Zwei Energien im Vergleich</p>
      </header>

      <div class="synastry-input-grid">
        <section class="person-input person-a">
          <h2>Person A</h2>
          <form class="birth-form birth-form--a" novalidate>
            <div class="form-group">
              <label for="date-a">Datum</label>
              <input type="date" id="date-a" required />
            </div>
            <div class="form-group">
              <label for="time-a">Uhrzeit</label>
              <input type="time" id="time-a" />
            </div>
            <div class="form-group" id="geo-group-a">
              <label>Ort</label>
            </div>
          </form>
        </section>

        <section class="person-input person-b">
          <h2>Person B <span class="optional-hint">(optional)</span></h2>
          <form class="birth-form birth-form--b" novalidate>
            <div class="form-group">
              <label for="date-b">Datum</label>
              <input type="date" id="date-b" />
            </div>
            <div class="form-group">
              <label for="time-b">Uhrzeit</label>
              <input type="time" id="time-b" />
            </div>
            <div class="form-group" id="geo-group-b">
              <label>Ort</label>
            </div>
          </form>
        </section>
      </div>

      <div class="synastry-form-footer">
        <div class="form-error synastry-error" role="alert" hidden></div>
        <button class="cta-btn synastry-calc-btn" disabled>Berechnen</button>
      </div>

      <div class="synastry-result" hidden>
        <div class="synastry-hero-mount"></div>
        <div class="synastry-score-band-mount"></div>
        <div class="synastry-connection-mount"></div>
        <div class="synastry-tension-mount"></div>
        <div class="synastry-experiment-mount"></div>
        <details class="synastry-deepdive" open>
          <summary>Vollanalyse (Resonanz, BaZi, Aspekte, Häuser …)</summary>
          <div class="synastry-wuxing-section"></div>
          <div class="synastry-bazi-section"></div>
          <div class="synastry-aspects-section"></div>
          <div class="synastry-extension-placeholder"></div>
          <div class="synastry-heatmap-section"></div>
          <div class="synastry-dynasty-section"></div>
          <div class="synastry-houses-section"></div>
        </details>
      </div>
    </main>
  `;

  const dateA   = app.querySelector('#date-a');
  const timeA   = app.querySelector('#time-a');
  const dateB   = app.querySelector('#date-b');
  const timeB   = app.querySelector('#time-b');
  const calcBtn = app.querySelector('.synastry-calc-btn');
  const errorEl = app.querySelector('.synastry-error');
  const resultEl = app.querySelector('.synastry-result');

  let placeA = null;
  let placeB = null;

  const geoA = GeoInput({ onSelect: (p) => { placeA = p; validate(); } });
  const geoB = GeoInput({ onSelect: (p) => { placeB = p; validate(); } });
  app.querySelector('#geo-group-a').appendChild(geoA);
  app.querySelector('#geo-group-b').appendChild(geoB);

  function bFormStarted() {
    return !!(dateB.value || placeB);
  }

  function validate() {
    const aReady = !!(dateA.value && placeA);
    const bReady = !bFormStarted() || !!(dateB.value && placeB);
    calcBtn.disabled = !(aReady && bReady);
  }

  dateA.addEventListener('input', validate);
  dateB.addEventListener('input', validate);

  calcBtn.addEventListener('click', async () => {
    errorEl.hidden = true;
    calcBtn.disabled = true;

    const inputA = {
      date: dateA.value,
      time: timeA.value || '12:00',
      lat:  placeA.lat,
      lon:  placeA.lon,
      tz:   placeA.tz,
    };

    const progress = document.createElement('div');
    progress.className = 'synastry-progress';
    app.querySelector('.synastry-form-footer').after(progress);
    const pg = CalculationProgress();
    progress.appendChild(pg);

    try {
      let profileA, profileB, synastrySummary;

      if (dateB.value && placeB) {
        // Use combined synastry endpoint — one call, server does parallel fetch
        const inputB = {
          date: dateB.value,
          time: timeB.value || '12:00',
          lat:  placeB.lat,
          lon:  placeB.lon,
          tz:   placeB.tz,
        };
        const res = await calculateSynastry(inputA, inputB);
        pg.stop();
        progress.remove();
        calcBtn.disabled = false;
        if (!res.ok) {
          errorEl.textContent = res.error || `HTTP ${res.status}`;
          errorEl.hidden = false;
          return;
        }
        profileA       = res.data.personA;
        profileB       = res.data.personB;
        synastrySummary = res.data.synastry || null;
      } else {
        // Solo profile — no Person B
        const res = await calculateProfile(inputA);
        pg.stop();
        progress.remove();
        calcBtn.disabled = false;
        if (!res.ok) {
          errorEl.textContent = `Person A: ${res.error || `HTTP ${res.status}`}`;
          errorEl.hidden = false;
          return;
        }
        profileA       = res.data;
        profileB       = null;
        synastrySummary = null;
      }

      renderResult(profileA, profileB, synastrySummary);
    } catch (err) {
      pg.stop();
      progress.remove();
      calcBtn.disabled = false;
      errorEl.textContent = `Netzwerkfehler: ${err.message}`;
      errorEl.hidden = false;
    }
  });

  function renderResult(profileA, profileB, synastrySummary = null) {
    resultEl.hidden = false;
    resultEl.querySelector('.synastry-hero-mount').innerHTML = '';
    const sbMount = resultEl.querySelector('.synastry-score-band-mount');
    if (sbMount) sbMount.innerHTML = '';
    resultEl.querySelector('.synastry-connection-mount').innerHTML = '';
    resultEl.querySelector('.synastry-tension-mount').innerHTML = '';
    resultEl.querySelector('.synastry-experiment-mount').innerHTML = '';
    resultEl.querySelector('.synastry-wuxing-section').innerHTML = '';
    resultEl.querySelector('.synastry-bazi-section').innerHTML = '';
    resultEl.querySelector('.synastry-aspects-section').innerHTML = '';
    resultEl.querySelector('.synastry-extension-placeholder').innerHTML = '';
    resultEl.querySelector('.synastry-heatmap-section').innerHTML = '';
    resultEl.querySelector('.synastry-dynasty-section').innerHTML = '';
    resultEl.querySelector('.synastry-houses-section').innerHTML = '';

    const proj = createSynastryProjection(profileA, profileB);

    // ── Light summary first ────────────────────────────────────────────────
    renderLightSummary(profileA, profileB, proj, synastrySummary);

    // ── Deep dive below ────────────────────────────────────────────────────
    renderWuXing(resultEl.querySelector('.synastry-wuxing-section'), proj);
    renderBazi(resultEl.querySelector('.synastry-bazi-section'), proj);
    renderAspects(resultEl.querySelector('.synastry-aspects-section'), proj);
    renderExtensionPlaceholder(resultEl.querySelector('.synastry-extension-placeholder'), proj, synastrySummary);
    renderHeatmap(resultEl.querySelector('.synastry-heatmap-section'), profileA, profileB);
    renderDynasty(resultEl.querySelector('.synastry-dynasty-section'), profileA, profileB);
    renderHouses(resultEl.querySelector('.synastry-houses-section'), profileA, profileB);
  }

  // Variante C: Light Summary aus buildRelationshipResonance ableiten.
  // Bestehende Deep-Dive-Sections bleiben unverändert im Accordion erhalten.
  function renderLightSummary(profileA, profileB, proj, synastrySummary) {
    const heroMount       = resultEl.querySelector('.synastry-hero-mount');
    const scoreMount      = resultEl.querySelector('.synastry-score-band-mount');
    const connectionMount = resultEl.querySelector('.synastry-connection-mount');
    const tensionMount    = resultEl.querySelector('.synastry-tension-mount');
    const experimentMount = resultEl.querySelector('.synastry-experiment-mount');

    const analysis = buildRelationshipResonance({
      personAProfile: profileA,
      personBProfile: profileB,
      synastryRaw:    synastrySummary,
    });

    // Hero: 3 Sätze direkt aus analysis.summaryStatements
    heroMount.replaceWith(
      RelationshipSummaryHero({
        eyebrow: 'Eure Kontakt-Signatur',
        title:   profileB
          ? 'Resonanz mit klarer Reibungsachse'
          : 'Lege Person B an, um die Resonanz zu sehen',
        statements: analysis.summaryStatements,
        caveat:     analysis.safetyCaveat,
      }),
    );

    // Score Band — nur wenn Index berechnet wurde
    if (scoreMount) {
      if (analysis.resonanceIndex != null) {
        scoreMount.replaceWith(
          ResonanceScoreBand({ score: analysis.resonanceIndex, label: 'Resonanz-Index' }),
        );
      } else {
        scoreMount.remove();
      }
    }

    // Hauptverbindung
    if (profileB && analysis.mainConnection?.title) {
      connectionMount.replaceWith(
        RelationshipSignalCard({
          kind: 'connection',
          title:       analysis.mainConnection.title,
          summary:     analysis.mainConnection.summary,
          evidence:    analysis.mainConnection.evidence,
          sourceLayer: analysis.mainConnection.sourceLayer,
        }),
      );
    } else {
      connectionMount.remove();
    }

    // Hauptspannung
    if (profileB && analysis.mainFriction?.title) {
      tensionMount.replaceWith(
        RelationshipSignalCard({
          kind: 'friction',
          title:       analysis.mainFriction.title,
          summary:     analysis.mainFriction.summary,
          evidence:    analysis.mainFriction.evidence,
          sourceLayer: analysis.mainFriction.sourceLayer,
        }),
      );
    } else {
      tensionMount.remove();
    }

    // 24h Kontakt-Experiment
    if (profileB) {
      experimentMount.replaceWith(ContactExperimentCard(analysis.contactExperiment));
    } else {
      experimentMount.remove();
    }
  }

  function renderHarmonyGauge(score, label) {
    if (score == null) return null;
    const pct = Math.round(score * 100);
    const uid = Math.random().toString(36).slice(2, 7);

    // Gauge geometry — arc from 135° to 45° CW (270° sweep through the top)
    // 0% = 135° (lower-left / Spannung), 50% = 270° (top / Balance), 100% = 45° (lower-right / Harmonie)
    const cx = 100, cy = 100;
    const Rm = 70;      // midpoint radius of arc track
    const sw = 14;      // track stroke-width
    const START = 135;  // start angle in SVG degrees
    const SWEEP = 270;  // total sweep

    const toRad = d => d * Math.PI / 180;
    const px = (a, r = Rm) => (cx + r * Math.cos(toRad(a))).toFixed(2);
    const py = (a, r = Rm) => (cy + r * Math.sin(toRad(a))).toFixed(2);

    // CW arc path from f° to t°
    const arcD = (f, t) => {
      const sweep = ((t - f) % 360 + 360) % 360;
      if (sweep < 0.01) return '';
      const large = sweep > 180 ? 1 : 0;
      return `M ${px(f)},${py(f)} A ${Rm},${Rm} 0 ${large} 1 ${px(t)},${py(t)}`;
    };

    const a0  = START;
    const a40 = START + 0.4 * SWEEP;   // 243° → 40%
    const a60 = START + 0.6 * SWEEP;   // 297° → 60%
    const aE  = START + SWEEP;         // 405°=45° → 100%
    const aN  = START + score * SWEEP; // needle angle

    const nX = px(aN, 56);
    const nY = py(aN, 56);

    const col = pct >= 65 ? '#f87171' : pct >= 45 ? '#c084fc' : '#60a5fa';
    const status = pct >= 65 ? 'HARMONISCH' : pct >= 45 ? 'AUSGEWOGEN' : 'SPANNUNGSGELADEN';

    // Tick marks (outside the track at r=79-86)
    const ticks = Array.from({length: 11}, (_, i) => {
      const ta = START + (i / 10) * SWEEP;
      const major = i % 5 === 0;
      const tc = i < 4 ? '#60a5fa' : i === 5 ? '#c084fc' : '#f87171';
      return `<line x1="${px(ta, 79)}" y1="${py(ta, 79)}" x2="${px(ta, major ? 86 : 83)}" y2="${py(ta, major ? 86 : 83)}" stroke="${tc}" stroke-width="${major ? 1.5 : 0.8}" opacity="0.65"/>`;
    }).join('');

    // Spannung / Harmonie label positions (near arc endpoints)
    const lsx = (Number(px(START, 78)) + 2).toFixed(1);
    const lsy = (Number(py(START, 78)) + 16).toFixed(1);
    const lex = (Number(px(aE, 78)) - 2).toFixed(1);
    const ley = (Number(py(aE, 78)) + 16).toFixed(1);

    const activeD = score > 0.01 ? arcD(a0, aN) : '';

    const wrap = document.createElement('div');
    wrap.className = 'harmony-gauge-wrap';
    wrap.innerHTML = `
      <div class="harmony-gauge-label">${esc(label || 'Energie-Balance')}</div>
      <svg class="harmony-gauge-svg" viewBox="0 0 200 178"
           xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="${pct}% — ${esc(status)}">
        <defs>
          <filter id="${uid}-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="${uid}-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="${uid}-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#14142e"/>
            <stop offset="100%" stop-color="#070710"/>
          </radialGradient>
        </defs>

        <!-- Metallic frame -->
        <circle cx="${cx}" cy="${cy}" r="89" fill="url(#${uid}-bg)" stroke="#2a3060" stroke-width="3.5"/>
        <circle cx="${cx}" cy="${cy}" r="85.5" fill="none" stroke="#1a1e40" stroke-width="1"/>
        <circle cx="${cx}" cy="${cy}" r="60" fill="none" stroke="#1a1e40" stroke-width="0.5"/>

        <!-- Track background -->
        <path d="${arcD(a0, aE)}" fill="none" stroke="#0a0a1c" stroke-width="${sw + 4}" stroke-linecap="butt"/>

        <!-- Spannung segment — blue (0-40%) -->
        <path d="${arcD(a0, a40)}" fill="none" stroke="#1d4ed8" stroke-width="${sw}" stroke-linecap="butt" opacity="0.9"/>
        <path d="${arcD(a0, a40)}" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="butt" filter="url(#${uid}-glow)" opacity="0.55"/>

        <!-- Balance segment — purple (40-60%) -->
        <path d="${arcD(a40, a60)}" fill="none" stroke="#6d28d9" stroke-width="${sw}" stroke-linecap="butt" opacity="0.85"/>
        <path d="${arcD(a40, a60)}" fill="none" stroke="#c084fc" stroke-width="3" stroke-linecap="butt" opacity="0.4"/>

        <!-- Harmonie segment — red (60-100%) -->
        <path d="${arcD(a60, aE)}" fill="none" stroke="#b91c1c" stroke-width="${sw}" stroke-linecap="butt" opacity="0.9"/>
        <path d="${arcD(a60, aE)}" fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="butt" filter="url(#${uid}-glow)" opacity="0.55"/>

        <!-- Active shimmer from start to needle -->
        ${activeD ? `<path d="${activeD}" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="${sw + 2}" stroke-linecap="butt"/>` : ''}

        <!-- Tick marks -->
        ${ticks}

        <!-- Needle glow -->
        <line x1="${cx}" y1="${cy}" x2="${nX}" y2="${nY}"
              stroke="${col}" stroke-width="4" stroke-linecap="round"
              filter="url(#${uid}-glow)" opacity="0.45"/>
        <!-- Needle -->
        <line x1="${cx}" y1="${cy}" x2="${nX}" y2="${nY}"
              stroke="white" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Center hub -->
        <circle cx="${cx}" cy="${cy}" r="10" fill="#080814" stroke="#2a3060" stroke-width="1.5"/>
        <circle cx="${cx}" cy="${cy}" r="4" fill="${col}" filter="url(#${uid}-soft)"/>

        <!-- Digital readout -->
        <rect x="74" y="112" width="52" height="22" rx="3" fill="#05050e" stroke="#1e2248" stroke-width="1"/>
        <text x="${cx}" y="127.5" text-anchor="middle"
              fill="${col}" font-size="13" font-weight="bold"
              font-family="ui-monospace,monospace" letter-spacing="1">${pct}%</text>

        <!-- Status -->
        <text x="${cx}" y="148" text-anchor="middle"
              fill="${col}" font-size="6.5" opacity="0.75"
              font-family="ui-monospace,monospace" letter-spacing="0.5">${esc(status)}</text>

        <!-- Labels -->
        <text x="${lsx}" y="${lsy}" text-anchor="middle"
              fill="#60a5fa" font-size="7.5" font-family="system-ui,sans-serif">Spannung</text>
        <text x="${cx}" y="173" text-anchor="middle"
              fill="#c084fc" font-size="7.5" font-family="system-ui,sans-serif">Balance</text>
        <text x="${lex}" y="${ley}" text-anchor="middle"
              fill="#f87171" font-size="7.5" font-family="system-ui,sans-serif">Harmonie</text>
      </svg>
    `;
    return wrap;
  }

  function renderWuXing(container, proj) {
    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Wu-Xing-Resonanz';
    section.appendChild(h2);

    if (!proj.wuxing) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'BaZi Day Master fehlt — kein elementarer Vergleich möglich.';
      section.appendChild(p);
      container.appendChild(section);
      return;
    }

    const card = document.createElement('div');
    card.className = `synastry-compat-card synastry-compat--${proj.wuxing.relation.replace(/-/g, '')}`;

    const header = document.createElement('div');
    header.className = 'synastry-compat-header';
    header.innerHTML = `
      <span class="synastry-element element-a">${esc(proj.wuxing.elementA)}</span>
      <span class="synastry-relation-arrow">→</span>
      <span class="synastry-element element-b">${esc(proj.wuxing.elementB)}</span>
      <span class="synastry-cycle-label">${esc(proj.wuxing.cycle)}</span>
    `;
    header.appendChild(SourceBadge('static_interpretation'));

    const desc = document.createElement('p');
    desc.className = 'synastry-compat-desc';
    desc.textContent = proj.wuxing.description;

    card.append(header, desc);
    section.appendChild(card);
    if (proj.harmonyScore != null) {
      const gauge = renderHarmonyGauge(proj.harmonyScore, 'Elementare Energie-Balance');
      if (gauge) section.appendChild(gauge);
    }
    container.appendChild(section);
  }

  function renderBazi(container, proj) {
    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'BaZi-Resonanz';
    section.appendChild(h2);

    if (!proj.bazi) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'Day Master unvollständig — BaZi-Resonanz nicht verfügbar.';
      section.appendChild(p);
      container.appendChild(section);
      return;
    }

    const card = document.createElement('div');
    card.className = 'synastry-bazi-card';

    const stems = document.createElement('div');
    stems.className = 'synastry-bazi-stems';
    stems.innerHTML = `
      <span class="bazi-stem-a">${esc(proj.bazi.stemA)} ${esc(proj.bazi.elementA)}</span>
      <span class="bazi-stem-sep">×</span>
      <span class="bazi-stem-b">${esc(proj.bazi.stemB)} ${esc(proj.bazi.elementB)}</span>
    `;
    stems.appendChild(SourceBadge('static_interpretation'));

    const desc = document.createElement('p');
    desc.className = 'synastry-bazi-desc';
    desc.textContent = proj.bazi.description;

    card.append(stems, desc);
    section.appendChild(card);
    container.appendChild(section);
  }

  function renderAspects(container, proj) {
    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Westliche Aspekte';
    section.appendChild(h2);

    if (proj.aspects.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = proj.missing.some(m => m.includes('Aspekte'))
        ? 'Planetenpositionen nicht verfügbar — Aspekte konnten nicht berechnet werden.'
        : 'Keine klassischen Aspekte zwischen den Charts gefunden.';
      section.appendChild(p);
      container.appendChild(section);
      return;
    }

    const intro = document.createElement('p');
    intro.className = 'section-intro';
    intro.textContent = `${proj.aspects.length} Aspekt${proj.aspects.length !== 1 ? 'e' : ''} zwischen den Charts.`;
    section.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'synastry-aspects-grid';

    for (const asp of proj.aspects) {
      const card = document.createElement('div');
      card.className = 'synastry-aspect-card';

      const header = document.createElement('div');
      header.className = 'factor-card-header';

      const label = document.createElement('span');
      label.className = 'factor-label';
      label.textContent = `${asp.bodyA} ↔ ${asp.bodyB} — ${asp.aspect}`;

      header.append(label, SourceBadge('static_interpretation'));

      const orb = document.createElement('p');
      orb.className = 'synastry-orb';
      orb.textContent = `Orb: ${asp.orbDeg}°`;

      const desc = document.createElement('p');
      desc.className = 'factor-value';
      desc.textContent = asp.description;

      card.append(header, orb, desc);
      grid.appendChild(card);
    }

    section.appendChild(grid);
    if (proj.harmonyScore != null) {
      const gauge = renderHarmonyGauge(proj.harmonyScore, 'Gesamt-Aspekt-Balance');
      if (gauge) section.appendChild(gauge);
    }
    container.appendChild(section);
  }

  function renderExtensionPlaceholder(container, proj, synastrySummary = null) {
    if (!proj || (!proj.wuxing && !proj.aspects.length)) return;

    // Prefer server-computed combined_coherence if available, fall back to client-side harmonyScore
    const serverCoherence = typeof synastrySummary?.combined_coherence === 'number'
      ? synastrySummary.combined_coherence : null;
    const score = serverCoherence ?? proj.harmonyScore;

    // Element tension from server
    const tension = synastrySummary?.element_tension || null;

    // ── Was ist das Fusionschart? ──────────────────────────────────────────────
    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Fusions-Bewertung';
    section.appendChild(h2);

    // Erklärungs-Box: Was macht das Fusionschart einzigartig?
    const fusionExplBox = document.createElement('div');
    fusionExplBox.className = 'synastry-expl-box';
    fusionExplBox.innerHTML = `
      <p class="synastry-expl-title">Was ist ein Fusionschart?</p>
      <p class="synastry-expl-text">
        Das Fusionschart kreuzt zwei unabhängige astrologische Systeme:
        <strong>BaZi / Wu-Xing</strong> liest Zeitenergie — welche elementaren Grundkräfte
        jede Person in sich trägt (Holz, Feuer, Erde, Metall, Wasser) und wie diese im
        Erzeugungs- oder Kontrollzyklus zueinanderstehen.
        <strong>Westliche Aspekte</strong> lesen geometrische Frequenzmuster — in welchen
        Winkeln die Planeten beider Charts zueinander schwingen (Trigon, Quadrat,
        Konjunktion&nbsp;…).
      </p>
      <p class="synastry-expl-text">
        Die Fusionsbewertung zeigt, wo diese beiden Ebenen sich verstärken, ergänzen
        — oder in produktive Spannung geraten. Sie ist kein Urteil über Beziehungsqualität,
        sondern eine <em>Bewusstseins-Map</em>: Wo fließt Energie leicht? Wo braucht
        sie aktive Navigation?
      </p>
    `;
    section.appendChild(fusionExplBox);

    // ── Kohärenzindex-Erklärung ───────────────────────────────────────────────
    const kohBox = document.createElement('div');
    kohBox.className = 'synastry-koherenz-box';
    kohBox.innerHTML = `
      <p class="synastry-expl-title">Kohärenzindex — was bedeutet der Wert?</p>
      <div class="synastry-koherenz-rows">
        <div class="synastry-koherenz-row synastry-koherenz-row--high">
          <span class="skr-icon">▶▶</span>
          <div>
            <strong>Hoch (≥ 65 %)</strong> — Starke Deckungsgleichheit der Energiefelder.
            Die Grundströmung zwischen euch trägt leicht. Das bedeutet nicht Konfliktfreiheit,
            sondern: die Kräfte zeigen in die gleiche Richtung. Mögliche Kehrseite: Echoraum,
            der Wachstumsreibung fehlt.
          </div>
        </div>
        <div class="synastry-koherenz-row synastry-koherenz-row--mid">
          <span class="skr-icon">◀▶</span>
          <div>
            <strong>Ausgewogen (45–65 %)</strong> — Spannung und Fluss halten die Balance.
            Dieser Bereich ist oft der fruchtbarste Entwicklungsraum: genug Resonanz für
            Vertrauen, genug Reibung für Wachstum.
          </div>
        </div>
        <div class="synastry-koherenz-row synastry-koherenz-row--low">
          <span class="skr-icon">◀◀</span>
          <div>
            <strong>Spannungsgeladen (< 45 %)</strong> — Gegenpolarische Kräfte dominieren.
            Das ist keine Unverträglichkeit — es ist intensive, transformative Energie.
            Sie braucht Bewusstsein, um konstruktiv zu wirken statt zu erschöpfen.
          </div>
        </div>
      </div>
    `;
    section.appendChild(kohBox);

    // ── Kontextuelle Score-Interpretation ────────────────────────────────────
    const intro = document.createElement('p');
    intro.className = 'section-intro';
    if (score == null) {
      intro.textContent = 'Für eine vollständige Fusions-Bewertung werden Planetenpositionen beider Personen benötigt.';
    } else {
      const pct = Math.round(score * 100);
      if (score >= 0.65) {
        intro.innerHTML = `<strong>Kohärenzindex ${pct}%:</strong> Diese Verbindung zeigt eine hohe Deckungsgleichheit zwischen euren elementaren und aspektuellen Mustern — Anziehung und Fluss dominieren. Die elementaren Kräfte (Wu-Xing) und geometrischen Schwingungen (Aspekte) verstärken sich gegenseitig. Raum für gemeinsames Wachstum entsteht durch die geteilte Grundströmung.`;
      } else if (score >= 0.45) {
        intro.innerHTML = `<strong>Kohärenzindex ${pct}%:</strong> Diese Verbindung hält Spannung und Harmonie in einem lebendigen Gleichgewicht. Die Reibungspunkte zwischen euren Energiefeldern sind echte Wachstumsorte — sie fordern heraus und ermöglichen dadurch Tiefe und gegenseitige Reifung.`;
      } else {
        intro.innerHTML = `<strong>Kohärenzindex ${pct}%:</strong> Diese Verbindung ist geprägt von schöpferischer Spannung. Die elementaren und aspektuellen Kräfte wirken oft gegeneinander — das erzeugt Intensität und kann, wenn bewusst genutzt, eine besonders transformierende Tiefe schaffen.`;
      }
    }
    section.appendChild(intro);

    // ── Gauge ─────────────────────────────────────────────────────────────────
    if (score != null) {
      const gauge = renderHarmonyGauge(score, 'Gesamt-Fusions-Balance');
      if (gauge) section.appendChild(gauge);
    }

    // ── Element-Spannung (server-side) ────────────────────────────────────────
    if (tension) {
      const tensionBox = document.createElement('div');
      tensionBox.className = 'synastry-tension-box';

      const tensionTitle = document.createElement('p');
      tensionTitle.className = 'synastry-expl-title';
      tensionTitle.textContent = 'Elementare Spannung & Zyklus';
      tensionBox.appendChild(tensionTitle);

      const cycleMap = {
        generates: 'Erzeugungszyklus — A nährt B: fließende, unterstützende Energie.',
        controls:  'Kontrollzyklus — A begrenzt B: strukturierende, aber herausfordernde Kraft.',
        generated_by: 'Erzeugungszyklus — B nährt A: kann sich als gestärkt und genährt zeigen.',
        controlled_by: 'Kontrollzyklus — B begrenzt A: kann sich als herausgefordert und geformt zeigen.',
        same:      'Gleiches Element — Resonanz und Verstärkung eurer gemeinsamen Grundkraft.',
      };

      const cycleDesc = cycleMap[tension.cycle_relation] || tension.cycle_relation || '';
      const tensionPct = tension.tension_score != null ? Math.round(tension.tension_score * 100) : null;

      tensionBox.innerHTML += `
        <div class="synastry-tension-row">
          <span class="synastry-tension-elem synastry-tension-elem--a">${esc(tension.dominant_a || '—')}</span>
          <span class="synastry-tension-arrow">⟷</span>
          <span class="synastry-tension-elem synastry-tension-elem--b">${esc(tension.dominant_b || '—')}</span>
          ${tensionPct != null ? `<span class="synastry-tension-score">${tensionPct}% Intensität</span>` : ''}
        </div>
        <p class="synastry-tension-desc">${esc(cycleDesc)}</p>
      `;
      section.appendChild(tensionBox);
    }

    container.appendChild(section);
  }
  function renderHeatmap(container, profileA, profileB) {
    if (!profileB) return;

    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Eure Dynamik auf einen Blick';
    section.appendChild(h2);

    const scores = computeDomainScores(profileA, profileB);
    section.appendChild(HeatmapOverview(scores));

    const note = document.createElement('p');
    note.className = 'empty-hint';
    note.style.marginTop = '8px';
    note.textContent = 'Quelle: /api/azodiac/profile × 2 — alle Werte aus echten API-Daten';
    section.appendChild(note);

    container.appendChild(section);
  }

  function renderDynasty(container, profileA, profileB) {
    if (!profileB) return;

    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Dynastische Resonanz — Jahr-Pillar Paar';
    section.appendChild(h2);

    const dynasty = buildDynastyResonance(profileA, profileB);
    const elColorA = ELEMENT_COLORS[dynasty.elA] ?? '#888';
    const elColorB = ELEMENT_COLORS[dynasty.elB] ?? '#888';

    const card = document.createElement('div');
    card.className = 'synastry-bazi-card';
    card.innerHTML = `
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="flex:1;padding:10px;background:var(--surface-2,#111);border-radius:8px;text-align:center;">
          <p style="font-size:0.65rem;color:#666;font-family:monospace;margin-bottom:4px;">PARTNER A — JAHR</p>
          <p style="font-size:1.4rem;font-weight:bold;color:${elColorA};">${esc(dynasty.yearA.stem ?? '?')}</p>
          <p style="font-size:0.75rem;color:${elColorA}88;">${esc(dynasty.elA ?? '?')} · ${esc(dynasty.yearA.branch ?? '?')}</p>
        </div>
        <div style="flex:1;padding:10px;background:var(--surface-2,#111);border-radius:8px;text-align:center;">
          <p style="font-size:0.65rem;color:#666;font-family:monospace;margin-bottom:4px;">PARTNER B — JAHR</p>
          <p style="font-size:1.4rem;font-weight:bold;color:${elColorB};">${esc(dynasty.yearB.stem ?? '?')}</p>
          <p style="font-size:0.75rem;color:${elColorB}88;">${esc(dynasty.elB ?? '?')} · ${esc(dynasty.yearB.branch ?? '?')}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:1.2rem;">${esc(dynasty.tone)}</span>
        <span style="font-size:0.75rem;color:#666;font-family:monospace;">DYNASTISCHE RESONANZ</span>
      </div>
      <p class="synastry-compat-desc">${esc(dynasty.text)}</p>
    `;
    section.appendChild(card);
    container.appendChild(section);
  }

  function renderHouses(container, profileA, profileB) {
    if (!profileB) return;

    const section = document.createElement('section');
    section.className = 'synastry-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Alle 12 Häuser im Vergleich';
    section.appendChild(h2);

    const note = document.createElement('p');
    note.className = 'section-intro';
    note.textContent = 'Quelle: western.houses aus /calculate/western — zeichenbasierter Elementvergleich.';
    section.appendChild(note);

    const entries = buildHouseComparisons(profileA, profileB, DOMAIN_HOUSES.synastry);
    const grid = document.createElement('div');
    grid.className = 'synastry-aspects-grid';

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'synastry-aspect-card';
      card.innerHTML = `
        <div class="factor-card-header">
          <span class="factor-label">${entry.house}. Haus — ${esc(entry.label)}</span>
          <span>${esc(entry.tone)}</span>
        </div>
        <div class="synastry-orb">A: ${esc(entry.signA)} (${esc(entry.elemA)}) · B: ${esc(entry.signB)} (${esc(entry.elemB)})</div>
        <p class="factor-value">${esc(entry.text)}</p>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  }

}
