// public/src/pages/WuxingPage.js
//
// Third Sprint E page. Renders the 5-element WuXing economy from
// fusion.remediation.distribution + WUXING_MEANINGS — no new endpoint
// calls, pure composition of existing API facts and frontend narrative.
//
// Design reference: /tmp/fufire-spec/src/pages-1.jsx:632 (WuxingPage).
// Enrichment contract: wuxingEnrichment.enrichWuxing(profile) returns
//   { distribution, dominant, deficient, plan, properties, todayLever }.
//
// Pentagonal radar SVG from the design is deferred to Sprint G — for MVP
// we render the 5 elements as labeled intensity bars instead.

import { enrichWuxing } from '../domain/wuxingEnrichment.js';
import { UnavailableCard } from '../components/UnavailableCard.js';
import { WuxingRadar } from '../components/WuxingRadar.js';

function elementBar(entry) {
  const row = document.createElement('article');
  row.className = `wuxing-row wuxing-row--${entry.key}`;

  const head = document.createElement('header');
  head.className = 'wuxing-row__head';

  const glyph = document.createElement('span');
  glyph.className = 'wuxing-row__glyph';
  glyph.textContent = entry.glyph;

  const label = document.createElement('span');
  label.className = 'wuxing-row__label';
  label.textContent = entry.label;

  const pct = document.createElement('span');
  pct.className = 'wuxing-row__pct';
  pct.textContent = `${entry.intensity}%`;

  const roleEl = document.createElement('span');
  roleEl.className = `wuxing-row__role wuxing-row__role--${entry.role}`;
  roleEl.textContent = entry.role;

  head.append(glyph, label, pct, roleEl);

  const bar = document.createElement('div');
  bar.className = 'wuxing-bar-track';
  const fill = document.createElement('div');
  fill.className = 'wuxing-bar-fill';
  fill.style.width = `${entry.intensity}%`;
  bar.appendChild(fill);

  const desc = document.createElement('p');
  desc.className = 'wuxing-row__desc';
  desc.textContent = entry.desc;

  row.append(head, bar, desc);
  return row;
}

function propertyCard(label, entry, props) {
  const wrap = document.createElement('article');
  wrap.className = `wuxing-prop wuxing-prop--${entry.key}`;

  const head = document.createElement('header');
  head.className = 'wuxing-prop__head';
  const glyph = document.createElement('span');
  glyph.className = 'wuxing-prop__glyph';
  glyph.textContent = entry.glyph;
  const title = document.createElement('h3');
  title.className = 'wuxing-prop__title';
  title.textContent = `${label} · ${entry.intensity}%`;
  head.append(glyph, title);

  const rows = [
    ['Wesen',     props.wesen,     ''],
    ['Stärke',    props.staerke,   ''],
    ['Übermass',  props.uebermass, 'wuxing-prop-row--warn'],
    ['Mangel',    props.mangel,    'wuxing-prop-row--warn'],
    ['Ausgleich', props.ausgleich, 'wuxing-prop-row--accent'],
  ];

  const body = document.createElement('dl');
  body.className = 'wuxing-prop__body';
  for (const [k, v, cls] of rows) {
    if (!v) continue;
    const dt = document.createElement('dt');
    dt.className = `wuxing-prop-row__key ${cls}`.trim();
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.className = 'wuxing-prop-row__val';
    dd.textContent = v;
    body.append(dt, dd);
  }

  wrap.append(head, body);
  return wrap;
}

function planTile(eyebrow, text, accent = false) {
  const tile = document.createElement('article');
  tile.className = `wuxing-plan-tile${accent ? ' wuxing-plan-tile--accent' : ''}`;
  const eb = document.createElement('p');
  eb.className = 'wuxing-plan-tile__eyebrow';
  eb.textContent = eyebrow;
  const body = document.createElement('p');
  body.className = 'wuxing-plan-tile__body';
  body.textContent = text;
  tile.append(eb, body);
  return tile;
}

export function WuxingPage(app, { profile, onNavigate } = {}) {
  const vm = enrichWuxing(profile);

  app.innerHTML = `
    <main class="wuxing-page system-layer system-layer--fusion" data-lane="wuxing">
      <div class="sig-bar-mount"></div>
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Signatur-Übersicht</a>
      </nav>

      <header class="page-head">
        <p class="page-eyebrow">Wu-Xing · Element-Ökonomie</p>
        <h1 class="page-title">Was zirkuliert, was staut</h1>
        <p class="page-intro">
          Wu-Xing zeigt fünf Bewegungsformen — Holz wächst, Feuer strahlt, Erde sammelt,
          Metall klärt, Wasser fließt. Die Prozente sind <strong>Intensitäten im System</strong>,
          keine Persönlichkeitsanteile. Eine niedrige Zahl bedeutet keinen Mangel an Eigenschaft,
          sondern fehlende Zirkulation.
        </p>
      </header>

      <section class="wuxing-distribution" aria-label="Element-Verteilung">
        <p class="layer-eyebrow">Verteilung</p>
        <h2 class="layer-title wuxing-headline"></h2>
        <div class="wuxing-radar-mount"></div>
        <div class="wuxing-bars"></div>
        <p class="wuxing-today-lever"></p>
      </section>

      <section class="wuxing-properties" aria-label="Element-Eigenschaften">
        <p class="layer-eyebrow">Fünf Bewegungsformen</p>
        <h2 class="layer-title">Was jedes Element trägt</h2>
        <div class="wuxing-prop-grid"></div>
      </section>

      <section class="wuxing-plan" aria-label="Drei-Stufen-Plan">
        <p class="layer-eyebrow">Drei-Stufen-Plan</p>
        <h2 class="layer-title">Heute · diese Woche · 30 Tage</h2>
        <div class="wuxing-plan-grid"></div>
      </section>

      <footer class="page-actions">
        <button type="button" class="cta-btn cta-btn--ghost nav-bazi">BaZi-Säulen ansehen →</button>
        <button type="button" class="cta-btn nav-fusion">Element ↔ Fusion →</button>
      </footer>
    </main>
  `;

  // Empty state: no fusion section at all
  if (!vm || vm.distribution.length === 0) {
    const distSection = app.querySelector('.wuxing-distribution');
    distSection.innerHTML = '';
    distSection.appendChild(UnavailableCard({
      title:  'Element-Verteilung',
      reason: 'Fusion-Berechnung nicht verfügbar — Geburtszeit oder API-Profil prüfen.',
    }));
  } else {
    // ── Headline + distribution bars ────────────────────────────────────────
    const headline = app.querySelector('.wuxing-headline');
    const domLabel = vm.dominant?.label || '—';
    const defLabel = vm.deficient?.label || '—';
    headline.textContent = `${domLabel} dominant · ${defLabel} unterrepräsentiert`;

    // Sprint H3: pentagonal radar (Sheng/Ke) above the bars — shared
    // component with FusionPage so the same wheel renders on both routes.
    const radarMount = app.querySelector('.wuxing-radar-mount');
    if (radarMount) {
      radarMount.appendChild(WuxingRadar(vm.distribution, { size: 360 }));
    }

    const bars = app.querySelector('.wuxing-bars');
    for (const entry of vm.distribution) bars.appendChild(elementBar(entry));

    // ── todayLever line ────────────────────────────────────────────────────
    const lever = app.querySelector('.wuxing-today-lever');
    if (vm.todayLever) {
      lever.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = 'Heutiger Hebel: ';
      const body = document.createElement('span');
      body.textContent = vm.todayLever;
      lever.append(strong, body);
    }

    // ── 5 property cards ───────────────────────────────────────────────────
    const propGrid = app.querySelector('.wuxing-prop-grid');
    for (const entry of vm.distribution) {
      const p = vm.properties?.[entry.label];
      if (!p) continue;
      propGrid.appendChild(propertyCard(entry.label, entry, p));
    }

    // ── Plan grid: today / week / 30d ──────────────────────────────────────
    const planGrid = app.querySelector('.wuxing-plan-grid');
    if (vm.plan) {
      planGrid.appendChild(planTile('Heute',       vm.plan.heute, /* accent */ true));
      planGrid.appendChild(planTile('Diese Woche', vm.plan.woche));
      planGrid.appendChild(planTile('30 Tage',     vm.plan.monat));
    } else {
      planGrid.appendChild(UnavailableCard({
        title:  'Drei-Stufen-Plan',
        reason: 'Dominantes Element konnte nicht ermittelt werden — Plan wird übersprungen.',
      }));
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  app.querySelector('.nav-bazi')?.addEventListener('click',   () => onNavigate?.('/bazi'));
  app.querySelector('.nav-fusion')?.addEventListener('click', () => onNavigate?.('/fusion'));
}
