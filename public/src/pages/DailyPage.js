// public/src/pages/DailyPage.js
import { getDailyExperience, getTransitNow, getTransitTimeline } from '../api/client.js';
import { wireHeroRolling } from '../components/RollingText.js';
import { InsightHero }           from '../components/InsightHero.js';
import { ActionExperimentCard }  from '../components/ActionExperimentCard.js';
import { PersistentSignatureBar } from '../components/PersistentSignatureBar.js';
import { ThreeDoors }            from '../components/ThreeDoors.js';
import { DailyCheckin, readDailyCheckin, writeDailyCheckin } from '../components/DailyCheckin.js';
import { CheckInResultCard }     from '../components/CheckInResultCard.js';
import { TodayNewCard }          from '../components/TodayNewCard.js';
import { TomorrowTeaserCard }    from '../components/TomorrowTeaserCard.js';
import { ScoreBandCard }         from '../components/ScoreBandCard.js';
import { WesternImpulseCard }    from '../components/WesternImpulseCard.js';
import { BaziImpulseCard }       from '../components/BaziImpulseCard.js';
import { FusionSynthesisCard }   from '../components/FusionSynthesisCard.js';
import {
  buildExperienceProfile,
  buildCoreIdentity,
  buildDailyFallback,
  buildActionExperiment,
} from '../domain/experienceCopy.js';
import { buildDailyCompanionViewModel } from '../domain/dailyCompanion.js';
import { buildDailyLearnImpulse } from '../domain/meanings.js';
import { DailyLearnImpulseCard } from '../components/DailyLearnImpulseCard.js';

// ── State-Machine (Sprint J) ────────────────────────────────────────────────
// /daily's data-flow is driven by two parallel fetches: getDailyExperience
// (primary) and the two transit calls (auxiliary, render-enhancing).
// Primary signal decides the state; transit failures degrade gracefully.
//
// Transitions:
//   IDLE → LOADING   on mount, after shell template applied
//   LOADING → READY  daily-experience ok + data has at least one of
//                    { western, eastern, fusion }
//   LOADING → EMPTY  daily-experience ok but data is structurally empty
//                    → explicit fallback copy is rendered, no half-cards
//   LOADING → ERROR  daily-experience returns ok:false OR fetch envelope
//                    surfaces an error (request() wraps thrown fetches)
//
// Each state writes `data-state="<state>"` on the `.daily-page` root so
// tests + CSS can react to the transition.
export const STATE_IDLE    = 'idle';
export const STATE_LOADING = 'loading';
export const STATE_READY   = 'ready';
export const STATE_EMPTY   = 'empty';
export const STATE_ERROR   = 'error';

const EMPTY_COPY =
  'Tagespuls heute noch nicht verfügbar. Versuch es in einigen Minuten erneut.';
const ERROR_COPY =
  'Wir konnten den Tagespuls nicht laden. Deine Eingaben sind nicht verloren — versuche es erneut, sobald du wieder online bist.';

function hasDailyContent(data) {
  if (!data || typeof data !== 'object') return false;
  return !!(data.western || data.eastern || data.fusion);
}

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyPage(app, { profile = null } = {}) {
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const expProfile = profile ? buildExperienceProfile(profile) : null;
  const identity   = expProfile ? buildCoreIdentity(expProfile) : null;

  app.innerHTML = `
    <main class="daily-page">
      <div class="sig-bar-mount"></div>
      <header class="daily-header" data-section="hero">
        <a href="#/" class="daily-back-link">← Zurück</a>
        <h1 class="daily-title bz-h1" data-page-title>Tagespuls</h1>
        <p class="daily-date">${today}</p>
      </header>
      <p class="trust-microcopy" role="note">Der Tagespuls ist kein Urteil. Er ist ein Beobachtungsrahmen für 24 Stunden.</p>

      <section class="daily-step daily-step--heute-aktiv" aria-labelledby="step-heute-aktiv-h">
        <header class="daily-step__head">
          <span class="daily-step__badge">1</span>
          <h2 class="daily-step__title" id="step-heute-aktiv-h">Heute aktiv</h2>
        </header>
        <div class="insight-hero-mount"></div>
        <div class="score-band-mount"></div>
        <div class="today-new-mount"></div>
      </section>

      <section class="daily-step daily-step--bedeutung" aria-labelledby="step-bedeutung-h">
        <header class="daily-step__head">
          <span class="daily-step__badge">2</span>
          <h2 class="daily-step__title" id="step-bedeutung-h">Bedeutung</h2>
          <p class="daily-step__lede">Was dieser Tag aus deiner Signatur trägt.</p>
        </header>
        <div class="daily-learn-impulse-mount"></div>
        <div class="vm-cards-mount"></div>
      </section>

      <section class="daily-step daily-step--spannung" aria-labelledby="step-spannung-h">
        <header class="daily-step__head">
          <span class="daily-step__badge">3</span>
          <h2 class="daily-step__title" id="step-spannung-h">Spannung</h2>
          <p class="daily-step__lede">Wo heute Reibung sitzt.</p>
        </header>
        <div class="daily-spannung-mount"></div>
      </section>

      <section class="daily-step daily-step--handlung" aria-labelledby="step-handlung-h">
        <header class="daily-step__head">
          <span class="daily-step__badge">4</span>
          <h2 class="daily-step__title" id="step-handlung-h">Handlung</h2>
          <p class="daily-step__lede">Konkrete Bewegung für heute.</p>
        </header>
        <div class="daily-handlung-mount"></div>
        <div class="daily-focus-mount"></div>
        <div class="daily-experiment-mount"></div>
      </section>

      <section class="daily-step daily-step--checkin" aria-labelledby="step-checkin-h">
        <header class="daily-step__head">
          <span class="daily-step__badge">5</span>
          <h2 class="daily-step__title" id="step-checkin-h">Check-in</h2>
          <p class="daily-step__lede">Wie war heute wirklich?</p>
        </header>
        <div class="daily-checkin-mount"></div>
        <div class="daily-checkin-result-mount"></div>
      </section>

      <section class="daily-step daily-step--beziehung" aria-labelledby="step-beziehung-h">
        <header class="daily-step__head">
          <span class="daily-step__badge">6</span>
          <h2 class="daily-step__title" id="step-beziehung-h">Beziehung</h2>
        </header>
        <section class="daily-contact-link" aria-label="Heute in Beziehung">
          <h3 class="daily-contact-link__title">Heute in Beziehung</h3>
          <p class="daily-contact-link__body">Aus deinem Tagespuls in den Kontakt mit anderen — wie wirkt sich dein heutiges Element auf eine zweite Person aus?</p>
          <a class="daily-contact-link__cta" href="#/synastry">Zur Beziehungsauswertung →</a>
        </section>
      </section>

      <section class="daily-step daily-step--morgen" aria-labelledby="step-morgen-h">
        <header class="daily-step__head">
          <span class="daily-step__badge">7</span>
          <h2 class="daily-step__title" id="step-morgen-h">Morgen</h2>
        </header>
        <div class="tomorrow-teaser-mount"></div>
      </section>

      <div class="daily-loading" role="status" aria-live="polite">Tagespuls wird berechnet…</div>
      <div class="daily-content" hidden></div>
      <div class="daily-error" role="alert" hidden></div>
      <div class="daily-three-doors-mount"></div>
    </main>
  `;

  wireHeroRolling(app);

  if (expProfile) {
    app.querySelector('.sig-bar-mount').replaceWith(
      PersistentSignatureBar({
        dayMaster: identity.dayMaster,
        sun:       identity.sun,
        coherence: expProfile.fusion.coherence,
      })
    );
  } else {
    app.querySelector('.sig-bar-mount').remove();
  }

  const loading = app.querySelector('.daily-loading');
  const content = app.querySelector('.daily-content');
  const errorEl = app.querySelector('.daily-error');

  // Sprint J: explicit state-machine. Initial state is LOADING — birth-input
  // gate below transitions to ERROR if missing; the fetch chain then transitions
  // to READY/EMPTY/ERROR. setState writes data-state on the .daily-page root.
  let currentState = STATE_IDLE;
  function setState(next) {
    currentState = next;
    const root = app.querySelector('.daily-page');
    if (root && typeof root.setAttribute === 'function') {
      root.setAttribute('data-state', next);
    }
  }
  setState(STATE_LOADING);

  let birthInput = null;
  try {
    const stored = sessionStorage.getItem('azodiac_birth_input');
    if (stored) birthInput = JSON.parse(stored);
  } catch { /* ignore */ }

  if (!birthInput) {
    setState(STATE_ERROR);
    loading.hidden = true;
    errorEl.textContent = 'Kein Geburts-Datensatz gefunden. ';
    const link = document.createElement('a');
    link.href = '#/';
    link.textContent = 'Bitte zuerst ein Profil berechnen.';
    errorEl.appendChild(link);
    errorEl.hidden = false;
    return;
  }

  // Hero/ViewModel mount happens AFTER transit data arrives (no "gleich verfügbar" placeholder).
  let dailyVM = null;
  function mountHeroFromVM(vm) {
    if (!vm) {
      app.querySelector('.insight-hero-mount').remove();
      return;
    }
    const evidence = [];
    if (vm.signature.dayMasterLabel && vm.signature.dayMasterLabel !== '—') evidence.push(`Day Master ${vm.signature.dayMasterLabel}`);
    if (vm.signature.coherenceScore != null) evidence.push(`Kohärenz-Index ${vm.signature.coherenceScore}`);
    if (vm.western.activeHouses?.length) evidence.push(vm.western.theme);
    app.querySelector('.insight-hero-mount').replaceWith(
      InsightHero({
        eyebrow:   'Heute',
        title:     'Dein Tagespuls',
        statement: vm.fusion.synthesis || vm.western.chance || vm.experiment.instruction,
        evidence,
        primaryAction:   { label: 'Zur Wochenvorschau', path: '/transit-calendar' },
        secondaryAction: { label: 'In Beziehung sehen', path: '/love' },
      })
    );
  }

  // Kick off transit fetches in parallel so the Hero can render real data.
  const transitsPromise = Promise.allSettled([getTransitNow(), getTransitTimeline()]).then(([nowRes, tlRes]) => {
    const todayData = (nowRes.status === 'fulfilled' && nowRes.value?.ok) ? nowRes.value.data : null;
    const timeline  = (tlRes.status  === 'fulfilled' && tlRes.value?.ok)  ? tlRes.value.data  : null;
    return { today: todayData, timeline };
  });

  function yesterdayIso() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function readHistory() {
    const storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;
    if (!storage) return { yesterday: null };
    const y = readDailyCheckin(storage, yesterdayIso());
    if (!y) return { yesterday: null };
    return {
      yesterday: {
        activeHouses:    Array.isArray(y.activeHouses) ? y.activeHouses : [],
        dominantElement: y.dominantElement || null,
        checkIn:         { clarity: y.clarity, energy: y.energy, contact: y.contact },
      },
    };
  }

  function persistTodayState(vm) {
    const storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;
    if (!storage || !vm) return;
    const activeHouses = (vm.western.activeHouses || []).map((h) => h.house);
    const dominantElement = vm.fusion?.dominantElement || null;
    writeDailyCheckin(storage, vm.date, { activeHouses, dominantElement });
  }

  function mountTodayNew(vm) {
    app.querySelector('.today-new-mount').replaceWith(TodayNewCard(vm.todayNew));
  }

  function mountTomorrow(vm) {
    app.querySelector('.tomorrow-teaser-mount').replaceWith(TomorrowTeaserCard(vm.tomorrow));
  }

  function mountSpannung(vm) {
    const mount = app.querySelector('.daily-spannung-mount');
    if (!mount) return;
    const items = [
      vm.fusion?.tension && { label: 'Hauptspannung', text: vm.fusion.tension, tone: 'tension' },
      vm.western?.caution && { label: 'Achtung (westlich)', text: vm.western.caution, tone: 'caution' },
      vm.bazi?.riskHint && { label: 'Risiko (BaZi)', text: vm.bazi.riskHint, tone: 'risk' },
    ].filter(Boolean);
    if (!items.length) {
      mount.remove();
      return;
    }
    const root = document.createElement('div');
    root.className = 'daily-spannung-card';
    for (const it of items) {
      const row = document.createElement('p');
      row.className = `daily-spannung-row daily-spannung-row--${it.tone}`;
      const strong = document.createElement('strong');
      strong.textContent = `${it.label}:`;
      row.append(strong, document.createTextNode(` ${it.text}`));
      root.appendChild(row);
    }
    mount.replaceWith(root);
  }

  function mountHandlung(vm) {
    const mount = app.querySelector('.daily-handlung-mount');
    if (!mount) return;
    const items = [
      vm.fusion?.balancingAction && { label: 'Ausgleich', text: vm.fusion.balancingAction },
      vm.western?.microImpulse && { label: 'Mikro-Impuls', text: vm.western.microImpulse },
    ].filter(Boolean);
    if (!items.length) {
      mount.remove();
      return;
    }
    const root = document.createElement('div');
    root.className = 'daily-handlung-card';
    for (const it of items) {
      const row = document.createElement('p');
      row.className = 'daily-handlung-row';
      const strong = document.createElement('strong');
      strong.textContent = `${it.label}:`;
      row.append(strong, document.createTextNode(` ${it.text}`));
      root.appendChild(row);
    }
    mount.replaceWith(root);
  }

  transitsPromise.then((transits) => {
    dailyVM = buildDailyCompanionViewModel({
      profile,
      transits,
      date: todayIso(),
      history: readHistory(),
    });
    if (expProfile) mountHeroFromVM(dailyVM);
    else app.querySelector('.insight-hero-mount').remove();
    const scoreMount = app.querySelector('.score-band-mount');
    if (dailyVM.signature.coherenceScore != null) {
      scoreMount.replaceWith(ScoreBandCard({ score: dailyVM.signature.coherenceScore, label: 'Kohärenz-Index' }));
    } else {
      scoreMount.remove();
    }
    mountTodayNew(dailyVM);

    // Education-First Daily Learn Impuls
    const learnMount = app.querySelector('.daily-learn-impulse-mount');
    if (learnMount) {
      const activeHouse = dailyVM.western?.activeHouses?.[0]?.house ?? null;
      const dom = dailyVM.fusion?.synthesis?.match(/\b(Holz|Feuer|Erde|Metall|Wasser)\b/)?.[1] || null;
      const dm = profile?.bazi?.day_master?.stem || null;
      const imp = buildDailyLearnImpulse({
        dominantElement: dom,
        activeHouse,
        dayMasterStem: dm,
        fallbackExperiment: dailyVM.experiment,
      });
      learnMount.replaceWith(DailyLearnImpulseCard(imp));
    }

    const vmMount = app.querySelector('.vm-cards-mount');
    const vmWrap = document.createElement('div');
    vmWrap.className = 'vm-cards-stack';
    vmWrap.appendChild(WesternImpulseCard(dailyVM.western));
    vmWrap.appendChild(BaziImpulseCard(dailyVM.bazi));
    vmWrap.appendChild(FusionSynthesisCard(dailyVM.fusion));
    vmMount.replaceWith(vmWrap);
    mountSpannung(dailyVM);
    mountHandlung(dailyVM);
    mountTomorrow(dailyVM);
    persistTodayState(dailyVM);
  });

  function mountFallbackFocus() {
    if (!expProfile) return;
    const fb = buildDailyFallback(expProfile);
    const focusEl = document.createElement('section');
    focusEl.className = 'daily-section daily-section--focus';
    const h = document.createElement('h2');
    h.className = 'daily-section-title';
    h.textContent = 'Tagesfokus';
    const summary = document.createElement('p');
    summary.className = 'daily-summary';
    summary.textContent = fb.focus;
    const impulse = document.createElement('p');
    impulse.className = 'daily-impulse';
    impulse.textContent = fb.impulse;
    focusEl.append(h, summary, impulse);
    app.querySelector('.daily-focus-mount').replaceWith(focusEl);
  }

  function mountExperiment() {
    if (!expProfile) {
      app.querySelector('.daily-experiment-mount').remove();
      return;
    }
    const exp = buildActionExperiment('daily', expProfile);
    app.querySelector('.daily-experiment-mount').replaceWith(ActionExperimentCard(exp));
  }

  function renderCheckinResult(entry) {
    const mount = app.querySelector('.daily-checkin-result-mount');
    const existingCard = app.querySelector('.checkin-result-card');
    const card = CheckInResultCard({ entry, vm: dailyVM });

    if (mount) {
      mount.replaceChildren(card);
      return;
    }

    if (existingCard) {
      existingCard.replaceWith(card);
    }
  }

  function mountCheckin() {
    const date = todayIso();
    const storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;
    app.querySelector('.daily-checkin-mount').replaceWith(
      DailyCheckin({
        isoDate: date,
        onComplete: (entry) => renderCheckinResult(entry),
      })
    );
    if (storage) {
      const existing = readDailyCheckin(storage, date);
      if (existing && existing.clarity && existing.energy && existing.contact) renderCheckinResult(existing);
    }
  }

  function mountThreeDoors() {
    app.querySelector('.daily-three-doors-mount').replaceWith(ThreeDoors());
  }

  // Sprint J: ERROR state — single fallback path with explicit user-framing.
  function mountFallbackWithError(message) {
    setState(STATE_ERROR);
    loading.hidden = true;
    mountFallbackFocus();
    mountExperiment();
    mountCheckin();
    mountThreeDoors();
    errorEl.textContent = message
      ? `${ERROR_COPY} (${message})`
      : ERROR_COPY;
    errorEl.hidden = false;
  }

  // Sprint J: EMPTY state — fetch resolved ok but no usable payload.
  // Render the framing copy so users see "noch nicht verfügbar" not blank cards.
  function mountEmptyFallback() {
    setState(STATE_EMPTY);
    loading.hidden = true;
    const note = document.createElement('p');
    note.className = 'daily-empty-note';
    note.setAttribute('role', 'status');
    note.textContent = EMPTY_COPY;
    content.appendChild(note);
    content.hidden = false;
    // Checkin + threedoors still useful — user can mark today even without API.
    mountCheckin();
    mountThreeDoors();
  }

  getDailyExperience(birthInput).then((res) => {
    loading.hidden = true;

    if (!res.ok) {
      mountFallbackWithError(res.error || 'Tagespuls konnte nicht geladen werden — Fallback aktiv.');
      return;
    }

    if (!hasDailyContent(res.data)) {
      mountEmptyFallback();
      return;
    }

    setState(STATE_READY);

    const data = res.data;
    // Iteration 1A: VM-Cards (WesternImpulseCard/BaziImpulseCard/FusionSynthesisCard)
    // sind bereits oben gerendert. API-Sections kommen in einen Drawer, damit
    // die Tagespuls-Blöcke nicht doppelt erscheinen.
    const apiDetails = document.createElement('details');
    apiDetails.className = 'daily-api-details';
    const apiSummary = document.createElement('summary');
    apiSummary.textContent = 'Tagespuls-Rohdaten (API) — Westlich · BaZi · Fusion';
    apiDetails.appendChild(apiSummary);
    [
      renderSection('Westlicher Impuls (API)',       data.western, 'western'),
      renderSection('BaZi — Östlicher Impuls (API)', data.eastern, 'eastern'),
      renderFusion(data.fusion),
    ].forEach(el => { if (el) apiDetails.appendChild(el); });
    content.appendChild(apiDetails);

    if (data._meta?.bootstrap_profile) {
      const meta = data._meta.bootstrap_profile;
      const metaEl = document.createElement('p');
      metaEl.className = 'daily-meta';
      metaEl.textContent = `Profil: ${meta.sun_sign || ''} · ${meta.day_master || ''}`;
      content.appendChild(metaEl);
    }

    content.hidden = false;
    mountExperiment();
    mountCheckin();
    mountThreeDoors();
    app.querySelector('.daily-focus-mount').remove();
  }).catch((err) => {
    mountFallbackWithError(`Fehler: ${err.message} — Fallback aktiv.`);
  });
}
