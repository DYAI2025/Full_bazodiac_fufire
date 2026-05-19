import { createCareerProjection, createFinanceProjection } from '../domain/projections.js';
import { InsightHero }              from '../components/InsightHero.js';
import { ActionExperimentCard }     from '../components/ActionExperimentCard.js';
import { PersistentSignatureBar }   from '../components/PersistentSignatureBar.js';
import {
  buildExperienceProfile,
  buildCoreIdentity,
  buildActionExperiment,
} from '../domain/experienceCopy.js';
import { SourceBadge }   from '../components/SourceBadge.js';
import { ConfidenceBar } from '../components/ConfidenceBar.js';
import { UnavailableCard } from '../components/UnavailableCard.js';
import { lookupStem as lookupStemFromMeanings } from '../domain/meanings.js';
import { WuxingBar } from '../components/WuxingBar.js';
import { buildHouseComparisons, DOMAIN_HOUSES } from '../synastry/house-comparison.js';
import { calculateProfile, geocodePlace } from '../api/client.js';
import { readPersonB, savePersonB }       from '../domain/personState.js';

// ── Fusion-Layer constants ────────────────────────────────────────────────────

const CAREER_QUALITIES = {
  Holz:   'Strategie, Expansion, Vision',
  Feuer:  'Führung, Sichtbarkeit, Kreativität',
  Erde:   'Struktur, Geduld, Aufbau',
  Metall: 'Präzision, Standards, Qualität',
  Wasser: 'Anpassung, Kommunikation, Intuition',
};

const DAY_MASTER_CAREER = {
  '甲': 'Yang Holz — Stratege und Visionär. Freiraum ist keine Bitte, sondern Voraussetzung.',
  '乙': 'Yin Holz — Du wächst in Netzwerken. Kollaboration ist deine natürliche Arbeitsform.',
  '丙': 'Yang Feuer — Sichtbarkeit, Führung, Energie. Du motivierst durch Präsenz.',
  '丁': 'Yin Feuer — Tiefe Konzentration, hohe Qualität. Deine besten Leistungen entstehen im Fokus.',
  '戊': 'Yang Erde — Aufbau, Verlässlichkeit, Struktur. Du bist das Rückgrat von Teams.',
  '己': 'Yin Erde — Fürsorge als Beruf. Nachhaltige Wirkung über Zeit statt schnellen Ruhm.',
  '庚': 'Yang Metall — Präzision und Klarheit. Du setzt Standards — und hältst sie ein.',
  '辛': 'Yin Metall — Ästhetisches Urteilsvermögen, hoher Anspruch. Deine Qualität spricht für sich.',
  '壬': 'Yang Wasser — Anpassung und Kommunikation. Du findest in jedem Umfeld einen Weg.',
  '癸': 'Yin Wasser — Intuition und Tiefgang. Deine stärksten Entscheidungen kommen aus dem Innern.',
};

// ── helpers ───────────────────────────────────────────────────────────────────

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

function buildTab(proj, { onNavigate }) {
  const section = document.createElement('div');
  section.className = 'tab-content';

  section.appendChild(ConfidenceBar(proj.confidence, { label: 'Datenvollständigkeit' }));

  if (proj.primaryFactors.length) {
    const h = document.createElement('h3');
    h.textContent = 'Kernfaktoren';
    const grid = document.createElement('div');
    grid.className = 'factors-grid';
    proj.primaryFactors.forEach((f) => grid.appendChild(factorCard(f)));
    section.append(h, grid);
  }

  if (proj.supportingFactors.length) {
    const h = document.createElement('h3');
    h.textContent = 'Ergänzende Faktoren';
    const grid = document.createElement('div');
    grid.className = 'factors-grid';
    proj.supportingFactors.forEach((f) => grid.appendChild(factorCard(f)));
    section.append(h, grid);
  }

  if (proj.missingFactors.length) {
    const h = document.createElement('h3');
    h.textContent = 'Fehlende Daten';
    section.appendChild(h);
    proj.missingFactors.forEach((m) => {
      section.appendChild(UnavailableCard({
        title: m,
        reason: m.includes('Geburtszeit') || m.includes('Häuser')
          ? 'Für Häuser wird die genaue Geburtszeit benötigt.'
          : 'Dieser Faktor ist über das API nicht verfügbar.',
        action: m.includes('Geburtszeit')
          ? { label: 'Geburtszeit eingeben', handler: () => onNavigate?.('/') }
          : null,
      }));
    });
  }

  return section;
}

// ── Fusion-Layer ──────────────────────────────────────────────────────────────

function buildFusionLayer(profile) {
  const wrap = document.createElement('div');
  wrap.className = 'fusion-layer';
  wrap.style.cssText = 'margin-top:2rem;display:flex;flex-direction:column;gap:1.5rem;';

  const divider = document.createElement('hr');
  divider.style.cssText = 'border:none;border-top:1px solid #333;';
  wrap.appendChild(divider);

  const heading = document.createElement('h3');
  heading.textContent = 'Fusion-Analyse (BaZi + West)';
  heading.style.cssText = 'margin:0;';
  wrap.appendChild(heading);

  // ── a) WuxingBar ──────────────────────────────────────────────────────────
  const vector = profile.fusion?.wu_xing_vectors?.bazi_pillars ?? null;

  const wuxingSection = document.createElement('div');
  wuxingSection.className = 'factor-card';

  const wuxingHeading = document.createElement('div');
  wuxingHeading.className = 'factor-card-header';
  const wuxingLabel = document.createElement('span');
  wuxingLabel.className = 'factor-label';
  wuxingLabel.textContent = 'Element-Verteilung (Arbeit)';
  wuxingHeading.appendChild(wuxingLabel);
  wuxingSection.appendChild(wuxingHeading);

  // WuxingBar gets an id so Partner B can update it
  const wuxingBarContainer = document.createElement('div');
  wuxingBarContainer.id = 'wuxing-bar-career';
  wuxingBarContainer.style.cssText = 'margin-top:0.5rem;';

  if (vector) {
    wuxingBarContainer.appendChild(WuxingBar(vector, null, 'career'));

    // dominant element quality
    const dominant = Object.entries(vector).sort((a, b) => b[1] - a[1])[0];
    if (dominant) {
      const [elemName] = dominant;
      const quality = CAREER_QUALITIES[elemName] ?? '';
      const qualityP = document.createElement('p');
      qualityP.className = 'factor-value';
      qualityP.style.cssText = 'margin-top:0.5rem;';
      qualityP.textContent = `Dominantes Element: ${elemName} — ${quality}`;
      wuxingSection.appendChild(wuxingBarContainer);
      wuxingSection.appendChild(qualityP);
    } else {
      wuxingSection.appendChild(wuxingBarContainer);
    }
  } else {
    wuxingSection.appendChild(wuxingBarContainer);
    const unavail = document.createElement('p');
    unavail.className = 'factor-note';
    unavail.textContent = 'Wu-Xing-Daten nicht verfügbar.';
    wuxingSection.appendChild(unavail);
  }

  wrap.appendChild(wuxingSection);

  // ── b) Day-Master career archetype ───────────────────────────────────────
  const stem = profile.bazi?.day_master?.stem ?? null;
  const archetypeCard = document.createElement('div');
  archetypeCard.className = 'factor-card';

  const archetypeHeader = document.createElement('div');
  archetypeHeader.className = 'factor-card-header';
  const archetypeLabel = document.createElement('span');
  archetypeLabel.className = 'factor-label';
  archetypeLabel.textContent = 'Day-Master-Archetyp (Arbeit)';
  archetypeHeader.appendChild(archetypeLabel);
  archetypeCard.appendChild(archetypeHeader);

  const archetypeValue = document.createElement('p');
  archetypeValue.className = 'factor-value';
  // Profilnaher Render — keine leeren Karten, keine Platzhaltertexte.
  // Wenn weder spezifischer Archetyp noch Registry-Resource verfügbar sind,
  // wird die Karte NICHT in das DOM eingehängt.
  let archetypeRendered = false;
  if (stem && DAY_MASTER_CAREER[stem]) {
    archetypeValue.textContent = `${stem} — ${DAY_MASTER_CAREER[stem]}`;
    archetypeRendered = true;
  } else if (stem) {
    const stemInfo = lookupStemFromMeanings(stem);
    if (stemInfo?.resource && stemInfo?.element) {
      archetypeValue.textContent = `${stem} (${stemInfo.element}) — Arbeitsmodus: ${stemInfo.resource}`;
      archetypeRendered = true;
    } else if (stemInfo?.resource) {
      archetypeValue.textContent = `${stem} — Arbeitsmodus: ${stemInfo.resource}`;
      archetypeRendered = true;
    }
  }
  if (archetypeRendered) {
    archetypeCard.appendChild(archetypeValue);
    wrap.appendChild(archetypeCard);
  }

  // ── c) Kohärenz-Brücke ───────────────────────────────────────────────────
  const coherence = profile.fusion?.coherence_index ?? null;
  if (coherence !== null) {
    const kohCard = document.createElement('div');
    kohCard.className = 'factor-card';

    const kohHeader = document.createElement('div');
    kohHeader.className = 'factor-card-header';
    const kohLabel = document.createElement('span');
    kohLabel.className = 'factor-label';
    kohLabel.textContent = 'Arbeit-Kohärenz';
    kohHeader.appendChild(kohLabel);
    kohCard.appendChild(kohHeader);

    const pct = Math.round(coherence * 100);
    let kohText;
    if (coherence >= 0.75) {
      kohText = `Arbeit-Kohärenz (${pct}%): Dein westliches und BaZi-Arbeitsmuster arbeiten Hand in Hand.`;
    } else if (coherence >= 0.50) {
      kohText = `Arbeit-Kohärenz (${pct}%): Leichte Spannung zwischen deinen astrologischen Arbeitssystemen — kreatives Potenzial.`;
    } else {
      kohText = `Arbeit-Kohärenz (${pct}%): Schöpferische Spannung — deine Arbeits-Energien zeigen in verschiedene Richtungen.`;
    }

    const kohP = document.createElement('p');
    kohP.className = 'factor-value';
    kohP.textContent = kohText;
    kohCard.appendChild(kohP);

    kohCard.appendChild(ConfidenceBar(coherence, { label: 'Kohärenz (West ↔ BaZi)' }));
    wrap.appendChild(kohCard);
  }

  return wrap;
}

// ── Partner B section ─────────────────────────────────────────────────────────

function buildPartnerBSection(profile, wuxingVecA) {
  const section = document.createElement('div');
  section.className = 'partner-b-section';
  section.style.cssText = 'margin-top:1.5rem;';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'tab-btn';
  toggleBtn.textContent = 'Partner B für Haus-Vergleich';
  toggleBtn.style.cssText = 'margin-bottom:1rem;';
  section.appendChild(toggleBtn);

  const formWrap = document.createElement('div');
  formWrap.style.cssText = 'display:none;flex-direction:column;gap:0.75rem;';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'factor-card';
  dateInput.style.cssText = 'padding:0.5rem;color:#fff;background:#1a1a1a;border:1px solid #333;border-radius:6px;';

  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.className = 'factor-card';
  timeInput.style.cssText = 'padding:0.5rem;color:#fff;background:#1a1a1a;border:1px solid #333;border-radius:6px;';

  const placeInput = document.createElement('input');
  placeInput.type = 'text';
  placeInput.placeholder = 'Geburtsort';
  placeInput.className = 'factor-card';
  placeInput.style.cssText = 'padding:0.5rem;color:#fff;background:#1a1a1a;border:1px solid #333;border-radius:6px;';

  const calcBtn = document.createElement('button');
  calcBtn.className = 'new-calc-btn';
  calcBtn.textContent = 'Berechnen';

  const statusMsg = document.createElement('p');
  statusMsg.className = 'factor-note';
  statusMsg.style.cssText = 'display:none;';

  const resultsWrap = document.createElement('div');
  resultsWrap.style.cssText = 'display:flex;flex-direction:column;gap:1rem;margin-top:1rem;';

  formWrap.append(dateInput, timeInput, placeInput, calcBtn, statusMsg, resultsWrap);
  section.appendChild(formWrap);

  // Prefill from persisted Person-B if available.
  const persistedB = readPersonB();
  if (persistedB) {
    dateInput.value = persistedB.date || '';
    timeInput.value = persistedB.time || '';
    placeInput.value = persistedB.place?.display || '';
    formWrap.style.display = 'flex';
    toggleBtn.textContent = 'Partner B ausblenden';
  }

  // Toggle visibility
  toggleBtn.addEventListener('click', () => {
    const isVisible = formWrap.style.display === 'flex';
    formWrap.style.display = isVisible ? 'none' : 'flex';
    toggleBtn.textContent = isVisible
      ? 'Partner B für Haus-Vergleich'
      : 'Partner B ausblenden';
  });

  // Calculate handler
  calcBtn.addEventListener('click', async () => {
    const date  = dateInput.value.trim();
    const time  = timeInput.value.trim();
    const place = placeInput.value.trim();

    if (!date || !place) {
      statusMsg.textContent = 'Bitte Geburtsdatum und Geburtsort angeben.';
      statusMsg.style.display = 'block';
      return;
    }

    calcBtn.disabled = true;
    statusMsg.textContent = 'Berechne…';
    statusMsg.style.display = 'block';
    resultsWrap.innerHTML = '';

    try {
      // 1. Geocode
      const geoRes = await geocodePlace(place);
      if (!geoRes.ok || !geoRes.data) {
        statusMsg.textContent = `Geocoding fehlgeschlagen: ${geoRes.error ?? 'Unbekannter Fehler'}`;
        calcBtn.disabled = false;
        return;
      }

      const { lat, lon, tz } = geoRes.data;

      // 2. Calculate profile B
      const profRes = await calculateProfile({ date, time: time || '12:00', lat, lon, tz });
      if (!profRes.ok || !profRes.data) {
        statusMsg.textContent = `Profilberechnung fehlgeschlagen: ${profRes.error ?? 'Unbekannter Fehler'}`;
        calcBtn.disabled = false;
        return;
      }

      const profileB = profRes.data;

      // 3. Persist valid Person B for reuse across pages.
      savePersonB({
        alias: '',
        date,
        time: time || '12:00',
        certainty: 'exact',
        place: { display: place, lat, lon, tz },
      });

      // 3. House comparisons
      const comparisons = buildHouseComparisons(profile, profileB, DOMAIN_HOUSES['career-finance']);

      statusMsg.style.display = 'none';

      const gridHeading = document.createElement('h3');
      gridHeading.textContent = 'Haus-Vergleich (Arbeit & Ressourcen)';
      resultsWrap.appendChild(gridHeading);

      const grid = document.createElement('div');
      grid.className = 'factors-grid';
      comparisons.forEach((entry) => grid.appendChild(renderHouseEntry(entry)));
      resultsWrap.appendChild(grid);

      // 4. Update WuxingBar with Partner B overlay
      const wuxingContainer = document.getElementById('wuxing-bar-career');
      if (wuxingContainer) {
        const vecB = profileB.fusion?.wu_xing_vectors?.bazi_pillars ?? null;
        // Clear and re-render with overlay
        const existingBar = wuxingContainer.querySelector('.wuxing-bar-wrap');
        if (existingBar) {
          wuxingContainer.removeChild(existingBar);
        }
        wuxingContainer.appendChild(WuxingBar(wuxingVecA, vecB, 'career'));
      }

    } catch (err) {
      statusMsg.textContent = `Fehler: ${err.message}`;
      statusMsg.style.display = 'block';
    } finally {
      calcBtn.disabled = false;
    }
  });

  return section;
}

function renderHouseEntry(entry) {
  const div = document.createElement('div');
  div.className = 'factor-card';
  div.innerHTML = `
    <div class="factor-card-header">
      <span class="factor-label">${entry.house}. Haus — ${entry.label}</span>
      <span>${entry.tone}</span>
    </div>
    <div style="font-size:0.8rem;color:#999;margin:4px 0;">
      A: ${entry.signA} (${entry.elemA}) · B: ${entry.signB} (${entry.elemB})
    </div>
    <p class="factor-value">${entry.text}</p>
  `;
  return div;
}

// ── Page entry point ──────────────────────────────────────────────────────────

export function CareerFinancePage(app, { profile, onNavigate }) {
  const careerProj  = createCareerProjection(profile);
  const financeProj = createFinanceProjection(profile);
  const expProfile  = buildExperienceProfile(profile);
  const identity    = buildCoreIdentity(expProfile);
  const experiment  = buildActionExperiment('career', expProfile);

  app.innerHTML = `
    <main class="career-finance-page">
      <div class="sig-bar-mount"></div>
      <nav class="page-nav">
        <a href="#/overview"    class="nav-link">← Übersicht</a>
        <a href="#/love"        class="nav-link">Liebe</a>
        <a href="#/personality" class="nav-link">Persönlichkeit</a>
        <a href="#/daily"       class="nav-link">Tagespuls</a>
      </nav>

      <div class="insight-hero-mount"></div>

      <div class="tab-bar" role="tablist">
        <button class="tab-btn tab-btn--active" role="tab" aria-selected="true"  data-tab="career">Arbeitsmodus</button>
        <button class="tab-btn"                 role="tab" aria-selected="false" data-tab="finance">Ressourcen</button>
      </div>

      <div class="tab-panels">
        <div class="tab-panel" data-panel="career"></div>
        <div class="tab-panel tab-panel--hidden" data-panel="finance"></div>
      </div>

      <div class="career-experiment-mount"></div>

      <aside class="finance-disclaimer" aria-label="Hinweis">
        <p>Diese Seite ist eine symbolische Reflexion deiner Arbeitsenergie — keine Berufs- oder Finanzberatung. Für konkrete Entscheidungen frage Menschen, die deine Lage kennen.</p>
      </aside>

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
      eyebrow:   'Arbeit & Ressourcen',
      title:     'Wie du Substanz verteilst',
      statement: 'Symbolische Reflexion deiner Arbeitsenergie und Ressourcenmuster — keine Berufs- oder Finanzberatung.',
      evidence:  [
        identity.dayMaster !== '—' ? `Day Master ${identity.dayMaster}` : null,
        expProfile.fusion.dominantElement ? `Dominantes Element ${expProfile.fusion.dominantElement}` : null,
      ].filter(Boolean),
      primaryAction:   { label: 'Tagespuls ansehen',  path: '/daily' },
      secondaryAction: { label: 'In Beziehung sehen', path: '/love'  },
    })
  );

  const careerPanel = app.querySelector('[data-panel="career"]');

  careerPanel.appendChild(buildTab(careerProj, { onNavigate }));

  // Append fusion layer below career tab content
  const fusionLayer = buildFusionLayer(profile);
  careerPanel.appendChild(fusionLayer);

  // Append 24h-Arbeitsimpuls below fusion layer (Partner-B comparison moved to opt-in section below)
  app.querySelector('[data-panel="finance"]').appendChild(
    buildTab(financeProj, { onNavigate })
  );

  // 24h Arbeitsimpuls (always visible)
  app.querySelector('.career-experiment-mount').replaceWith(ActionExperimentCard(experiment));

  // Partner B section deferred under details (team comparison beta)
  const wuxingVecA = profile.fusion?.wu_xing_vectors?.bazi_pillars ?? null;
  const partnerDetails = document.createElement('details');
  partnerDetails.className = 'career-partner-b-details';
  const summary = document.createElement('summary');
  summary.textContent = 'Teamvergleich (Beta) — Partner-B Hausvergleich';
  partnerDetails.appendChild(summary);
  partnerDetails.appendChild(buildPartnerBSection(profile, wuxingVecA));
  app.querySelector('.finance-disclaimer').before(partnerDetails);

  // Tab switching
  app.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Only apply tab switching for tab-bar buttons (not Partner B toggle)
      if (!btn.closest('.tab-bar')) return;

      app.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.remove('tab-btn--active');
        b.setAttribute('aria-selected', 'false');
      });
      app.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('tab-panel--hidden'));

      btn.classList.add('tab-btn--active');
      btn.setAttribute('aria-selected', 'true');
      app.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.remove('tab-panel--hidden');
    });
  });

  app.querySelector('.new-calc-btn').addEventListener('click', () => onNavigate?.('/'));
}
