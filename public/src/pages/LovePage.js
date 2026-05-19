import { createLoveProjection }                    from '../domain/projections.js';
import { SourceBadge }                             from '../components/SourceBadge.js';
import { ConfidenceBar }                           from '../components/ConfidenceBar.js';
import { UnavailableCard }                         from '../components/UnavailableCard.js';
import { WuxingBar }                               from '../components/WuxingBar.js';
import { InsightHero }                             from '../components/InsightHero.js';
import { ActionExperimentCard }                    from '../components/ActionExperimentCard.js';
import { PersistentSignatureBar }                  from '../components/PersistentSignatureBar.js';
import {
  buildExperienceProfile,
  buildCoreIdentity,
  buildRelationshipSummary,
  buildActionExperiment,
}                                                  from '../domain/experienceCopy.js';
import { calculateProfile }                        from '../api/client.js';
import { readPersonB, savePersonB }                 from '../domain/personState.js';
import { GeoInput }                                 from '../components/GeoInput.js';
import { buildHouseComparisons, DOMAIN_HOUSES }    from '../synastry/house-comparison.js';

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

// Dominant element love qualities
const LOVE_QUALITIES = {
  Holz:   'Wachstum, Aufbruch, Idealismus',
  Feuer:  'Leidenschaft, Spontanität, Direktheit',
  Erde:   'Verlässlichkeit, Sinnlichkeit, Beständigkeit',
  Metall: 'Klarheit, Anspruch, Präzision',
  Wasser: 'Tiefe, Intuition, Empathie',
};

// Day-Master love archetypes (10 stems)
const DAY_MASTER_LOVE = {
  '甲': 'Yang Holz — Du liebst mit Aufbruch und Wachstum. Wer an deiner Seite ist, muss dir Raum lassen — und bekommt dafür einen Partner, der aufblüht.',
  '乙': 'Yin Holz — Deine Liebe rankt sich behutsam um wen, dem du vertraust. Du gibst viel, wenn du dich sicher fühlst.',
  '丙': 'Yang Feuer — Leidenschaft, Direktheit, Wärme. Du entzündest, was dich berührt — und willst gesehen werden.',
  '丁': 'Yin Feuer — Die stille Flamme. Du liebst tief und konstant, weniger laut. Wer deine Temperatur kennt, kommt nie mehr in die Kälte.',
  '戊': 'Yang Erde — Du bist das Fundament. Verlässlich, geduldig, stabil. Deine Liebe ist ein Ort, kein Ereignis.',
  '己': 'Yin Erde — Fürsorge mit Tiefgang. Du nährst, was dir wichtig ist — und weißt genau, was du brauchst, auch wenn du es selten sagst.',
  '庚': 'Yang Metall — Klarheit und Anspruch. Du liebst präzise, erwartest Aufrichtigkeit — und gibst sie auch.',
  '辛': 'Yin Metall — Feine Wahrnehmung, hohe Sensibilität. Deine Liebe ist selektiv und tief zugleich.',
  '壬': 'Yang Wasser — Fluss und Tiefe. Du verbindest dich leicht, aber vollständige Intimität braucht Zeit und Vertrauen.',
  '癸': 'Yin Wasser — Der stille Tieftaucher. Du liebst in Resonanz, nicht in Projektion. Wer dich wirklich kennt, wird von dir treu begleitet.',
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

function renderHouseEntry(entry) {
  const div = document.createElement('div');
  div.className = 'factor-card';
  div.innerHTML = `
    <div class="factor-card-header">
      <span class="factor-label">${entry.house}. Haus — ${entry.label}</span>
      <span>${entry.tone}</span>
    </div>
    <div style="display:flex;gap:8px;margin:6px 0;font-size:0.8rem;color:#999;">
      <span>A: ${entry.signA} (${entry.elemA})</span>
      <span>·</span>
      <span>B: ${entry.signB} (${entry.elemB})</span>
    </div>
    <p class="factor-value">${entry.text}</p>
  `;
  return div;
}

export function LovePage(app, { profile, onNavigate }) {
  const proj      = createLoveProjection(profile);
  const headline  = generateHeadline(proj);
  const expProfile = buildExperienceProfile(profile);
  const identity   = buildCoreIdentity(expProfile);
  const summary    = buildRelationshipSummary(expProfile);
  const experiment = buildActionExperiment('love', expProfile);

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

  // BaZi pillar vector and Day-Master stem for fusion layer
  const fusionVec = profile?.fusion?.wu_xing_vectors?.bazi_pillars ?? null;
  const dayMasterStem = profile?.bazi?.day_master?.stem ?? null;
  const dayMasterText = dayMasterStem ? DAY_MASTER_LOVE[dayMasterStem] ?? null : null;
  const coherenceIndex = profile?.fusion?.coherence_index ?? null;

  app.innerHTML = `
    <main class="love-page">
      <div class="sig-bar-mount"></div>
      <nav class="page-nav">
        <a href="#/overview"         class="nav-link">← Übersicht</a>
        <a href="#/career-finance"   class="nav-link">Arbeit &amp; Ressourcen</a>
        <a href="#/personality"      class="nav-link">Persönlichkeit</a>
        <a href="#/synastry"         class="nav-link">Synastrie</a>
      </nav>

      <div class="insight-hero-mount"></div>

      <section class="relationship-summary" aria-label="Drei Sätze zu deiner Beziehung">
        <h2>In drei Sätzen</h2>
        <p class="rs-line"><strong>Was leicht fließt:</strong> <span class="rs-easy"></span></p>
        <p class="rs-line"><strong>Wo Reibung entsteht:</strong> <span class="rs-friction"></span></p>
        <p class="rs-line"><strong>Was hilft:</strong> <span class="rs-helps"></span></p>
      </section>

      <header class="page-header">
        <div class="headline-section" aria-label="Deine Liebeslandschaft"></div>
      </header>

      <div class="confidence-section"></div>

      <section class="factors-section flows-easily" aria-label="Was fließt leicht">
        <h2>Was fließt leicht</h2>
        <p class="section-intro">Diese Qualitäten kommen dir in Beziehungen natürlich — sie sind deine Stärken im Kontakt.</p>
        <div class="factors-grid primary-factors"></div>
      </section>

      <section class="factors-section needs-awareness" aria-label="Wo du dich verhedderst">
        <h2>Wo du dich verhedderst</h2>
        <p class="section-intro">Diese Dynamiken sind kein "schlechtes Zeichen" — sie laden zur bewussten Gestaltung ein.</p>
        <div class="factors-grid supporting-factors"></div>
      </section>

      <div class="love-experiment-mount"></div>

      <section class="missing-section" aria-label="Was fehlt noch" hidden></section>

      <section class="wuxing-section" aria-label="Wu-Xing Beziehungsmuster" hidden>
        <h2>Wu-Xing Beziehungsmuster</h2>
        <div class="wuxing-content"></div>
      </section>

      <section class="fusion-layer-section" aria-label="Fusion-Layer"></section>

      <section class="partner-b-cta" aria-label="Partnervergleich">
        <h2>Partnerprofil berechnen</h2>
        <p class="section-intro">Wenn du eine zweite Person mit eigenen Geburtsdaten vergleichen willst, geht es entweder direkt zur Synastrie oder bleib hier für den Hausvergleich.</p>
        <a class="partner-b-cta__synastry" href="#/synastry">Zur Synastrie →</a>
      </section>

      <section class="partner-b-section" aria-label="Partner B Hausvergleich (Detail)"></section>

      <footer class="page-footer">
        <button class="new-calc-btn">Neue Berechnung</button>
      </footer>
    </main>
  `;

  // PersistentSignatureBar
  app.querySelector('.sig-bar-mount').replaceWith(
    PersistentSignatureBar({
      dayMaster: identity.dayMaster,
      sun:       identity.sun,
      coherence: expProfile.fusion.coherence,
    })
  );

  // InsightHero
  app.querySelector('.insight-hero-mount').replaceWith(
    InsightHero({
      eyebrow:   'Liebe & Beziehung',
      title:     'Dein Beziehungsmodus',
      statement: summary.easyFlow,
      evidence:  [
        identity.ascendant !== '—' ? `Aszendent ${identity.ascendant}` : null,
        identity.moon !== '—' ? `Mond ${identity.moon}` : null,
      ].filter(Boolean),
      primaryAction:   { label: 'Tagespuls ansehen', path: '/daily' },
      secondaryAction: { label: 'Partner vergleichen', path: '/synastry' },
    })
  );

  // Relationship summary (3 sentences)
  app.querySelector('.rs-easy').textContent     = summary.easyFlow;
  app.querySelector('.rs-friction').textContent = summary.friction;
  app.querySelector('.rs-helps').textContent    = summary.helps;

  // Love experiment
  app.querySelector('.love-experiment-mount').replaceWith(ActionExperimentCard(experiment));

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

  // ── Fusion-Layer section ─────────────────────────────────────────────────
  const fusionSection = app.querySelector('.fusion-layer-section');

  // a) WuxingBar — Element-Resonanz
  const wuxingContainer = document.createElement('div');
  wuxingContainer.className = 'fusion-wuxing-container';

  if (fusionVec) {
    const wuxingHeading = document.createElement('h2');
    wuxingHeading.textContent = 'Element-Resonanz';
    fusionSection.appendChild(wuxingHeading);

    wuxingContainer.appendChild(WuxingBar(fusionVec, null, 'love'));
    fusionSection.appendChild(wuxingContainer);

    if (dominantEl && LOVE_QUALITIES[dominantEl]) {
      const elQuality = document.createElement('p');
      elQuality.className = 'fusion-element-quality';
      elQuality.style.cssText = 'font-size:0.85rem;color:#aaa;margin-top:8px;';
      elQuality.textContent = `Dein dominantes Liebeselement: ${dominantEl} — ${LOVE_QUALITIES[dominantEl]}`;
      fusionSection.appendChild(elQuality);
    }
  }

  // b) Day-Master love archetype
  if (dayMasterText) {
    const dmHeading = document.createElement('h2');
    dmHeading.textContent = 'Day-Master-Archetyp';
    dmHeading.style.marginTop = '24px';
    fusionSection.appendChild(dmHeading);

    const dmCard = document.createElement('div');
    dmCard.className = 'factor-card';

    const dmHeader = document.createElement('div');
    dmHeader.className = 'factor-card-header';

    const dmLabel = document.createElement('span');
    dmLabel.className = 'factor-label';
    dmLabel.textContent = `Day-Master: ${dayMasterStem}`;
    dmHeader.appendChild(dmLabel);
    dmCard.appendChild(dmHeader);

    const dmText = document.createElement('p');
    dmText.className = 'factor-value';
    dmText.textContent = dayMasterText;
    dmCard.appendChild(dmText);

    fusionSection.appendChild(dmCard);
  }

  // c) Kohärenz-Brücke
  if (coherenceIndex !== null) {
    const pct = Math.round(coherenceIndex * 100);

    const kohHeading = document.createElement('h2');
    kohHeading.textContent = 'Kohärenz-Brücke';
    kohHeading.style.marginTop = '24px';
    fusionSection.appendChild(kohHeading);

    const kohText = document.createElement('p');
    kohText.className = 'factor-value';
    kohText.style.marginBottom = '8px';
    if (coherenceIndex >= 0.75) {
      kohText.textContent = `Dein Kohärenzwert (${pct}%) zeigt: Dein westliches und dein BaZi-Profil sprechen in der Liebe dieselbe Sprache.`;
    } else if (coherenceIndex >= 0.50) {
      kohText.textContent = `Dein Kohärenzwert (${pct}%) zeigt eine leichte innere Spannung — dein westliches und BaZi-Liebesmuster sind nicht deckungsgleich.`;
    } else {
      kohText.textContent = `Dein Kohärenzwert (${pct}%) zeigt schöpferische Spannung: dein westliches Liebes-Profil und dein BaZi-Muster ziehen in verschiedene Richtungen.`;
    }
    fusionSection.appendChild(kohText);
    fusionSection.appendChild(ConfidenceBar(coherenceIndex, { label: 'Kohärenz (West ↔ BaZi)' }));
  }

  // ── Partner B section ────────────────────────────────────────────────────
  const partnerBSection = app.querySelector('.partner-b-section');

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'partner-b-toggle-btn';
  toggleBtn.style.cssText = 'margin-top:32px;padding:10px 18px;cursor:pointer;border-radius:6px;';
  toggleBtn.textContent = 'Partner B für Haus-Vergleich hinzufügen';
  partnerBSection.appendChild(toggleBtn);

  const partnerBForm = document.createElement('div');
  partnerBForm.className = 'partner-b-form';
  partnerBForm.hidden = true;
  partnerBForm.style.cssText = 'margin-top:16px;display:flex;flex-direction:column;gap:10px;max-width:360px;';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'partner-b-date';
  dateInput.style.cssText = 'padding:8px;border-radius:4px;';

  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.className = 'partner-b-time';
  timeInput.style.cssText = 'padding:8px;border-radius:4px;';

  // GeoInput handles autocomplete + manual coords + range validation.
  // selectedPlace contains { display, lat, lon, tz } once a result is chosen.
  let selectedPlace = null;
  const geoInput = GeoInput({ onSelect: (p) => { selectedPlace = p; } });
  geoInput.classList.add('partner-b-place');

  const calcBtn = document.createElement('button');
  calcBtn.type = 'button';
  calcBtn.textContent = 'Berechnen';
  calcBtn.className = 'partner-b-calc-btn';
  calcBtn.style.cssText = 'padding:10px 18px;cursor:pointer;border-radius:6px;';

  const partnerBError = document.createElement('p');
  partnerBError.className = 'partner-b-error';
  partnerBError.style.cssText = 'color:#e55;font-size:0.85rem;';
  partnerBError.hidden = true;

  const partnerBLoading = document.createElement('p');
  partnerBLoading.className = 'partner-b-loading';
  partnerBLoading.textContent = 'Wird berechnet…';
  partnerBLoading.hidden = true;

  partnerBForm.append(dateInput, timeInput, geoInput, calcBtn, partnerBError, partnerBLoading);
  partnerBSection.appendChild(partnerBForm);

  // Prefill from persisted Person-B if available.
  const persistedB = readPersonB();
  if (persistedB) {
    dateInput.value = persistedB.date || '';
    timeInput.value = persistedB.time || '';
    selectedPlace   = persistedB.place || null;
    partnerBForm.hidden = false;
    toggleBtn.textContent = 'Partner B ausblenden';
  }

  const houseResultSection = document.createElement('section');
  houseResultSection.className = 'house-comparison-section';
  houseResultSection.hidden = true;
  partnerBSection.appendChild(houseResultSection);

  toggleBtn.addEventListener('click', () => {
    partnerBForm.hidden = !partnerBForm.hidden;
  });

  calcBtn.addEventListener('click', async () => {
    partnerBError.hidden = true;
    partnerBLoading.hidden = false;
    calcBtn.disabled = true;

    const date = dateInput.value;
    const time = timeInput.value;

    if (!date || !selectedPlace) {
      partnerBError.textContent = 'Bitte Geburtsdatum und Geburtsort eingeben.';
      partnerBError.hidden = false;
      partnerBLoading.hidden = true;
      calcBtn.disabled = false;
      return;
    }

    try {
      const { lat, lon, tz, display } = selectedPlace;

      // Calculate profile for partner B (GeoInput already resolved coords + tz).
      const profileResult = await calculateProfile({ date, time, lat, lon, tz });
      if (!profileResult.ok || !profileResult.data) {
        throw new Error(profileResult.error || 'Profilberechnung fehlgeschlagen.');
      }
      const profileB = profileResult.data;

      // Persist valid Person B for reuse on next visit / in Synastry.
      savePersonB({
        alias: '',
        date,
        time: time || '12:00',
        certainty: 'exact',
        place: { display, lat, lon, tz },
      });

      // 3. Update WuxingBar with partner B overlay
      const vecB = profileB?.fusion?.wu_xing_vectors?.bazi_pillars ?? null;
      if (fusionVec && vecB) {
        wuxingContainer.innerHTML = '';
        wuxingContainer.appendChild(WuxingBar(fusionVec, vecB, 'love'));
      }

      // 4. Build house comparisons
      const comparisons = buildHouseComparisons(profile, profileB, DOMAIN_HOUSES.love);

      // 5. Render house comparison results
      houseResultSection.innerHTML = '';
      houseResultSection.hidden = false;

      const houseHeading = document.createElement('h2');
      houseHeading.textContent = 'Eure Häuser im Vergleich';
      houseHeading.style.marginTop = '24px';
      houseResultSection.appendChild(houseHeading);

      const houseGrid = document.createElement('div');
      houseGrid.className = 'factors-grid';
      comparisons.forEach((entry) => houseGrid.appendChild(renderHouseEntry(entry)));
      houseResultSection.appendChild(houseGrid);

    } catch (err) {
      partnerBError.textContent = err.message || 'Ein Fehler ist aufgetreten.';
      partnerBError.hidden = false;
    } finally {
      partnerBLoading.hidden = true;
      calcBtn.disabled = false;
    }
  });

  app.querySelector('.new-calc-btn').addEventListener('click', () => onNavigate?.('/'));
}
