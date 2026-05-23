// public/src/pages/BaziPage.js

import { enrichBaziPillars } from '../domain/baziPillarEnrichment.js';
import { UnavailableCard }    from '../components/UnavailableCard.js';
import { wireHeroRolling }    from '../components/RollingText.js';

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

// Determine provenance of hidden stems from the raw pillar object.
// The raw API shape is: hidden_stems: { source: 'api'|'derived', stems: [...] }
// or hidden_stems: [...] (legacy array shape).
function hiddenStemsSource(rawPillar) {
  if (!rawPillar) return 'aus Branch-Tabelle abgeleitet';
  const hs = rawPillar.hidden_stems;
  if (!hs) return 'aus Branch-Tabelle abgeleitet';
  // Object shape with .source field
  if (typeof hs === 'object' && !Array.isArray(hs)) {
    return hs.source === 'api' ? 'API' : 'aus Branch-Tabelle abgeleitet';
  }
  // Array shape — treat as API-supplied
  if (Array.isArray(hs) && hs.length > 0) return 'API';
  return 'aus Branch-Tabelle abgeleitet';
}

function buildPillarCard(pillar, role, rawPillar) {
  const li = document.createElement('li');
  li.setAttribute('data-bazi-pillar', role);
  li.className = `bazi-pillar-card bazi-pillar-card--${role}${role === 'day' ? ' bazi-pillar-card--day-master' : ''}`;
  li.setAttribute('role', 'button');
  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-expanded', 'false');

  if (!pillar) {
    const ua = UnavailableCard({ title: ROLE_LABEL[role] || role, reason: 'Säule konnte nicht berechnet werden.' });
    li.appendChild(ua);
    // Still need source label even for unavailable pillars
    const hsSource = document.createElement('div');
    hsSource.setAttribute('data-bazi-hidden-stems-source', role);
    hsSource.className = 'bazi-pillar-hs-source';
    hsSource.textContent = hiddenStemsSource(rawPillar);
    li.appendChild(hsSource);
    return li;
  }

  const stemChar = document.createElement('div');
  stemChar.className = 'bazi-pillar-stemchar';
  stemChar.textContent = pillar.stemChar || pillar.stem || '';
  stemChar.setAttribute('aria-hidden', 'true');

  const label = document.createElement('div');
  label.className = 'bazi-pillar-label';
  label.textContent = ROLE_LABEL[role];

  const value = document.createElement('div');
  value.className = 'bazi-pillar-value';
  value.textContent = [pillar.stem, pillar.branch].filter(Boolean).join(' · ');

  const animal = document.createElement('div');
  animal.className = 'bazi-pillar-animal';
  animal.textContent = [pillar.animal, pillar.branchElement].filter(Boolean).join(' · ');

  // Hidden stems source label
  const hsSource = document.createElement('div');
  hsSource.setAttribute('data-bazi-hidden-stems-source', role);
  hsSource.className = 'bazi-pillar-hs-source';
  hsSource.textContent = hiddenStemsSource(rawPillar);

  li.append(stemChar, label, value, animal, hsSource);
  return li;
}

function buildSharedDetail() {
  const panel = document.createElement('section');
  panel.setAttribute('data-bazi-shared-detail', '');
  panel.setAttribute('data-expanded', 'false');
  panel.setAttribute('aria-live', 'polite');
  panel.className = 'bazi-shared-detail';
  panel.setAttribute('hidden', '');
  return panel;
}

function populateDetail(panel, pillar, role, enriched) {
  panel.innerHTML = '';

  if (!pillar) {
    const msg = document.createElement('p');
    msg.textContent = 'Keine Daten für diese Säule.';
    panel.appendChild(msg);
    return;
  }

  const title = document.createElement('h3');
  title.className = 'bazi-detail-title';
  title.textContent = `${ROLE_LABEL[role] || role} — ${pillar.stem ?? '?'} ${pillar.branch ?? '?'}`;

  const age = document.createElement('p');
  age.className = 'bazi-detail-age';
  age.textContent = `Lebensphase: ${ROLE_AGE[role] || ''}`;

  const elements = document.createElement('p');
  elements.className = 'bazi-detail-elements';
  elements.textContent = [
    pillar.stemElement  && `Stamm-Element: ${pillar.stemElement}`,
    pillar.branchElement && `Zweig-Element: ${pillar.branchElement}`,
    pillar.polarity     && `Polarität: ${pillar.polarity}`,
  ].filter(Boolean).join(' · ');

  // Provenance row
  const prov = document.createElement('p');
  prov.className = 'bazi-detail-prov';
  const apiVal = pillar.stemChar || pillar.stem || '—';
  const provLabel = document.createElement('strong');
  provLabel.textContent = 'Quelle:';
  // Avoid claiming a specific source when the value may be derived or missing
  prov.append(provLabel, ` ${apiVal}`);

  // Hidden stems section
  const hs = pillar.hiddenStems || [];
  const hsSection = document.createElement('div');
  hsSection.className = 'bazi-detail-hs';
  const hsTitle = document.createElement('strong');
  hsTitle.textContent = 'Versteckte Stämme';
  hsSection.appendChild(hsTitle);
  if (hs.length > 0) {
    const hsList = document.createElement('ul');
    hsList.className = 'bazi-detail-hs-list';
    for (const h of hs) {
      const item = document.createElement('li');
      item.textContent = [h.stem, h.polarity, h.element].filter(Boolean).join(' · ');
      hsList.appendChild(item);
    }
    hsSection.appendChild(hsList);
  } else {
    const none = document.createElement('span');
    none.textContent = ' — keine';
    hsSection.appendChild(none);
  }

  // Narrative texts — marked as Leseschluessel
  const narrativeParts = [
    enriched?.[role]?.roleDescription && { label: 'Bedeutung', text: enriched[role].roleDescription },
    enriched?.[role]?.ressource        && { label: 'Ressource', text: enriched[role].ressource },
    enriched?.[role]?.schatten         && { label: 'Schatten',  text: enriched[role].schatten },
    enriched?.[role]?.handlung         && { label: 'Impulse',   text: enriched[role].handlung },
  ].filter(Boolean);

  panel.append(title, age, elements, prov, hsSection);

  if (narrativeParts.length > 0) {
    const narrative = document.createElement('div');
    narrative.setAttribute('data-bazi-narrative-marker', 'Leseschluessel');
    narrative.className = 'bazi-detail-narrative';
    const narTitle = document.createElement('p');
    narTitle.className = 'bazi-detail-narrative-label';
    narTitle.textContent = 'Leseschluessel — interpretative Hinweise, kein Urteil';
    narrative.appendChild(narTitle);
    for (const { label: nl, text } of narrativeParts) {
      const p = document.createElement('p');
      p.className = 'bazi-detail-narrative-item';
      p.innerHTML = `<strong>${nl}:</strong> ${text}`;
      narrative.appendChild(p);
    }
    panel.appendChild(narrative);
  }
}

export function BaziPage(app, { profile, onNavigate } = {}) {
  const enriched = enrichBaziPillars(profile?.bazi);
  const dm = enriched?.dayMaster;
  const rawPillars = profile?.bazi?.pillars || {};

  app.innerHTML = `
    <main class="bazi-page system-layer system-layer--bazi" data-lane="bazi">
      <div class="sig-bar-mount"></div>
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Signatur-Übersicht</a>
      </nav>

      <header class="page-head" data-section="hero">
        <p class="page-eyebrow">BaZi · Vier Säulen des Schicksals</p>
        <h1 class="page-title bz-h1" data-page-title>Dein ostasiatischer Kern</h1>
        <p class="page-intro" data-bazi-narrative-marker="Leseschluessel">
          Leseschluessel: BaZi beschreibt deine Geburtszeit als vier vertikale Säulen.
          Alle Texte sind Interpretationsangebote, keine Festlegungen.
          Der Tagesstamm (Day Master) ist dein Kern; alles andere wird in Bezug zu ihm gelesen.
        </p>
      </header>

      <section class="bazi-day-master" aria-label="Day Master" data-section="day-master" data-bazi-role="day-master-kern">
        <p class="layer-eyebrow">Day Master · Kern</p>
        <div class="bazi-dm-mount"></div>
      </section>

      <section class="bazi-pillars" aria-label="Vier Säulen" data-section="pillars">
        <p class="layer-eyebrow">Vier Säulen — klicken für Details</p>
        <ul class="bazi-pillars-list" role="list"></ul>
        <div class="bazi-shared-detail-mount"></div>
      </section>

      <section class="bazi-luck-pillar" aria-label="Glückssäule" data-section="luck-pillar" data-bazi-lucky-pillar>
        <p class="layer-eyebrow">Aktuelle Glückssäule (Luck Pillar)</p>
        <p class="bazi-luck-note">nicht von API geliefert — wird in einer kommenden Version ergänzt.</p>
      </section>

      <footer class="page-actions">
        <button type="button" class="cta-btn nav-wuxing">Element-Ökonomie →</button>
        <button type="button" class="cta-btn cta-btn--ghost nav-fusion">Fusion verstehen →</button>
      </footer>
    </main>
  `;

  const heroCleanup = wireHeroRolling(app);

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
    const labelEl = document.createElement('h2');
    labelEl.className = 'bazi-dm-label';
    labelEl.textContent = [dm.stem, dm.stemElement].filter(Boolean).join(' ');
    const ressource = document.createElement('p');
    ressource.className = 'bazi-dm-ressource';
    ressource.textContent = dm.ressource || '';
    textBlock.append(labelEl, ressource);
    if (dm.schatten) {
      const shadow = document.createElement('p');
      shadow.className = 'bazi-dm-shadow';
      shadow.textContent = `Schatten: ${dm.schatten}`;
      textBlock.appendChild(shadow);
    }
    tile.append(stemBlock, textBlock);
    dmMount.appendChild(tile);
  } else {
    dmMount.appendChild(UnavailableCard({
      title: 'Day Master',
      reason: 'BaZi-Tagesstamm konnte nicht berechnet werden.',
    }));
  }

  // ── 4-Pillar cards ───────────────────────────────────────────────────────
  const list = app.querySelector('.bazi-pillars-list');
  const detailMount = app.querySelector('.bazi-shared-detail-mount');
  const sharedDetail = buildSharedDetail();
  detailMount.appendChild(sharedDetail);

  for (const role of ['year', 'month', 'day', 'hour']) {
    const rawPillar = rawPillars[role] || null;
    const li = buildPillarCard(enriched?.[role], role, rawPillar);

    const activate = () => {
      // Deactivate all pillars
      list.querySelectorAll('li[data-bazi-pillar]').forEach(el => {
        el.setAttribute('aria-expanded', 'false');
        el.classList.remove('bazi-pillar-card--active');
      });
      // Activate clicked pillar
      li.setAttribute('aria-expanded', 'true');
      li.classList.add('bazi-pillar-card--active');
      // Show and populate shared detail
      sharedDetail.removeAttribute('hidden');
      sharedDetail.setAttribute('data-expanded', 'true');
      populateDetail(sharedDetail, enriched?.[role], role, enriched);
    };

    li.addEventListener('click', activate);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
    list.appendChild(li);
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  app.querySelector('.nav-wuxing')?.addEventListener('click', () => onNavigate?.('/fusion'));
  app.querySelector('.nav-fusion')?.addEventListener('click', () => onNavigate?.('/fusion'));

  return heroCleanup;
}
