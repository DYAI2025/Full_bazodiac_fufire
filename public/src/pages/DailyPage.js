// public/src/pages/DailyPage.js
import { getDailyExperience, getTransitNow, getTransitTimeline } from '../api/client.js';
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
      <header class="daily-header">
        <a href="#/" class="daily-back-link">← Zurück</a>
        <h1 class="daily-title">Tagespuls</h1>
        <p class="daily-date">${today}</p>
      </header>
      <div class="insight-hero-mount"></div>
      <p class="trust-microcopy" role="note">Der Tagespuls ist kein Urteil. Er ist ein Beobachtungsrahmen für 24 Stunden.</p>
      <div class="score-band-mount"></div>
      <div class="today-new-mount"></div>
      <div class="vm-cards-mount"></div>
      <div class="daily-focus-mount"></div>
      <div class="daily-loading" role="status" aria-live="polite">Tagespuls wird berechnet…</div>
      <div class="daily-content" hidden></div>
      <div class="daily-error" role="alert" hidden></div>
      <div class="daily-experiment-mount"></div>
      <div class="daily-checkin-mount"></div>
      <div class="daily-checkin-result-mount"></div>
      <div class="tomorrow-teaser-mount"></div>
      <div class="daily-three-doors-mount"></div>
    </main>
  `;

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

  let birthInput = null;
  try {
    const stored = sessionStorage.getItem('azodiac_birth_input');
    if (stored) birthInput = JSON.parse(stored);
  } catch { /* ignore */ }

  if (!birthInput) {
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
    const vmMount = app.querySelector('.vm-cards-mount');
    const vmWrap = document.createElement('div');
    vmWrap.className = 'vm-cards-stack';
    vmWrap.appendChild(WesternImpulseCard(dailyVM.western));
    vmWrap.appendChild(BaziImpulseCard(dailyVM.bazi));
    vmWrap.appendChild(FusionSynthesisCard(dailyVM.fusion));
    vmMount.replaceWith(vmWrap);
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

  getDailyExperience(birthInput).then((res) => {
    loading.hidden = true;

    if (!res.ok) {
      // Fallback path: synthetic focus + experiment + checkin still shown
      mountFallbackFocus();
      mountExperiment();
      mountCheckin();
      mountThreeDoors();
      errorEl.textContent = res.error || 'Tagespuls konnte nicht geladen werden — Fallback aktiv.';
      errorEl.hidden = false;
      return;
    }

    const data = res.data;
    [
      renderSection('Westlicher Impuls', data.western, 'western'),
      renderSection('BaZi — Östlicher Impuls', data.eastern, 'eastern'),
      renderFusion(data.fusion),
    ].forEach(el => { if (el) content.appendChild(el); });

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
    loading.hidden = true;
    mountFallbackFocus();
    mountExperiment();
    mountCheckin();
    mountThreeDoors();
    errorEl.textContent = `Fehler: ${err.message} — Fallback aktiv.`;
    errorEl.hidden = false;
  });
}
