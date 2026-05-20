// public/src/pages/BaziPage.js
//
// First Sprint E page rendered from the enrichment layer.
// Reads `currentProfile` from app.js, enriches via baziPillarEnrichment,
// renders Page-Head + Day-Master tile + 4-pillar grid + Luck-Pillar
// UnavailableCard (deferred — not yet in upstream) + CTAs.
//
// Design reference: /tmp/fufire-spec/src/pages-1.jsx:437 (BaziPage).
// Enrichment contract: docs/contracts/2026-05-19-design-vs-real-gap.md §2.4 + §2.5.

import { enrichBaziPillars } from '../domain/baziPillarEnrichment.js';
import { ExplainableCard }    from '../components/ExplainableCard.js';
import { UnavailableCard }    from '../components/UnavailableCard.js';

const ROLE_LABEL = {
  year:  'Jahr · Wurzel',
  month: 'Monat · Soziale Saison',
  day:   'Tag · Day Master',
  hour:  'Stunde · Innen & Output',
};

const ROLE_AGE = {
  year:  'bis 16 prägend',
  month: '17–32 ausführungsstark',
  day:   'Lebenskern',
  hour:  'späte Lebensphase & Output',
};

function pillarDrawerMeaning(pillar, role) {
  if (!pillar) return null;
  const hiddenLabels = (pillar.hiddenStems || []).map((h) => {
    const stem = h.stem || '';
    const element = h.element || '';
    const polarity = h.polarity || '';
    return [stem, polarity, element].filter(Boolean).join(' ');
  });
  return {
    title:    `${ROLE_LABEL[role] || role} — ${pillar.stem ?? '?'}${pillar.branch ?? '?'}`,
    subtitle: [pillar.animal, pillar.polarity, pillar.stemElement].filter(Boolean).join(' · '),
    what:     [
      pillar.stemChar && `${pillar.stemChar} (${pillar.polarity || ''} ${pillar.stemElement || ''})`,
      pillar.branchChar && `auf ${pillar.branchChar} (${pillar.animal || ''}, ${pillar.branchElement || ''})`,
    ].filter(Boolean).join(' '),
    meaning:  pillar.roleDescription || '',
    resource: pillar.ressource || '',
    shadow:   pillar.schatten || '',
    practice: pillar.handlung || '',
    extras:   hiddenLabels.length
      ? [`Versteckte Stämme: ${hiddenLabels.join(', ')}`, `Alter: ${ROLE_AGE[role] || ''}`].filter(Boolean)
      : (ROLE_AGE[role] ? [`Alter: ${ROLE_AGE[role]}`] : []),
  };
}

function pillarCard(pillar, role) {
  if (!pillar) {
    return UnavailableCard({
      title: ROLE_LABEL[role] || role,
      reason: 'Säule konnte nicht berechnet werden.',
    });
  }
  const isDayMaster = (role === 'day');
  const labelLine = [pillar.stem, pillar.branch, pillar.animal].filter(Boolean).join(' · ');
  const helperBits = [pillar.stemElement, pillar.polarity].filter(Boolean).join(' · ');
  return ExplainableCard({
    domain:      'bazi',
    label:       ROLE_LABEL[role] || role,
    value:       labelLine || '—',
    helper:      helperBits,
    highlighted: isDayMaster,
    meaning:     pillarDrawerMeaning(pillar, role),
  });
}

export function BaziPage(app, { profile, onNavigate } = {}) {
  const enriched = enrichBaziPillars(profile?.bazi);
  const dm = enriched?.dayMaster;

  app.innerHTML = `
    <main class="bazi-page system-layer system-layer--bazi">
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Signatur-Übersicht</a>
      </nav>

      <header class="page-head">
        <p class="page-eyebrow">BaZi · Vier Säulen des Schicksals</p>
        <h1 class="page-title">Dein ostasiatischer Kern</h1>
        <p class="page-intro">
          BaZi beschreibt deine Geburtszeit als vier vertikale Säulen — Jahr, Monat, Tag, Stunde.
          Jede Säule trägt einen Himmelsstamm (天干 — die obere, klimatische Kraft) und einen
          Erdzweig (地支 — den verkörperten Bezug, hier als Tier). Der Tagesstamm (Day Master)
          ist dein Kern; alles andere wird in Bezug zu ihm gelesen.
        </p>
      </header>

      <section class="bazi-day-master" aria-label="Day Master">
        <p class="layer-eyebrow">Day Master · Kern</p>
        <div class="bazi-dm-mount"></div>
      </section>

      <section class="bazi-pillars" aria-label="Vier Säulen">
        <p class="layer-eyebrow">Vier Säulen</p>
        <p class="layer-hint">Tippe für Detail</p>
        <div class="bazi-pillars-grid"></div>
      </section>

      <section class="bazi-luck-pillar" aria-label="Glückssäule">
        <p class="layer-eyebrow">Aktuelle Glückssäule (Luck Pillar)</p>
        <div class="bazi-luck-mount"></div>
      </section>

      <footer class="page-actions">
        <button type="button" class="cta-btn nav-wuxing">Element-Ökonomie →</button>
        <button type="button" class="cta-btn cta-btn--ghost nav-fusion">Fusion verstehen →</button>
      </footer>
    </main>
  `;

  // ── Day Master tile ──────────────────────────────────────────────────────
  const dmMount = app.querySelector('.bazi-dm-mount');
  if (dm && dm.stem) {
    const tile = document.createElement('div');
    tile.className = 'bazi-dm-tile';
    const stemBlock = document.createElement('div');
    stemBlock.className = 'bazi-dm-stem-block';
    const cjk = document.createElement('div');
    cjk.className = 'bazi-dm-stemchar';
    cjk.textContent = dm.stemChar || dm.stem;
    const meta = document.createElement('div');
    meta.className = 'bazi-dm-meta';
    meta.textContent = [dm.polarity, dm.stemElement].filter(Boolean).join(' · ');
    stemBlock.append(cjk, meta);
    const textBlock = document.createElement('div');
    textBlock.className = 'bazi-dm-text';
    const label = document.createElement('h2');
    label.className = 'bazi-dm-label';
    label.textContent = [dm.stem, dm.stemElement].filter(Boolean).join(' ');
    const ressource = document.createElement('p');
    ressource.className = 'bazi-dm-ressource';
    ressource.textContent = dm.ressource || '';
    const shadow = document.createElement('p');
    shadow.className = 'bazi-dm-shadow';
    shadow.textContent = dm.schatten ? `Schatten: ${dm.schatten}` : '';
    textBlock.append(label, ressource);
    if (dm.schatten) textBlock.appendChild(shadow);
    tile.append(stemBlock, textBlock);
    dmMount.appendChild(tile);
  } else {
    dmMount.appendChild(UnavailableCard({
      title: 'Day Master',
      reason: 'BaZi-Tagesstamm konnte nicht berechnet werden — Geburtszeit oder Ortskoordinaten prüfen.',
    }));
  }

  // ── 4-Pillar grid ────────────────────────────────────────────────────────
  const grid = app.querySelector('.bazi-pillars-grid');
  for (const role of ['year', 'month', 'day', 'hour']) {
    grid.appendChild(pillarCard(enriched?.[role], role));
  }

  // ── Luck Pillar — deferred (not in current API) ──────────────────────────
  const luckMount = app.querySelector('.bazi-luck-mount');
  luckMount.appendChild(UnavailableCard({
    title:  'Glückssäule',
    reason: 'Wird in einer kommenden Version berechnet — derzeit nicht im API-Profil enthalten.',
  }));

  // ── Navigation ───────────────────────────────────────────────────────────
  app.querySelector('.nav-wuxing')?.addEventListener('click', () => onNavigate?.('/fusion'));
  app.querySelector('.nav-fusion')?.addEventListener('click', () => onNavigate?.('/fusion'));
}
