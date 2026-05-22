// public/src/pages/OverviewPage.js — I4: Premium-Hero Composition
//
// Accepts three input formats transparently:
//   (root, viewModel)         — has keyFacts, used directly (tests, future callers)
//   (root, { profile, … })   — legacy mountWithProfile format
//   (root, rawProfile)        — raw API profile
//
// No astrology calculations. All data from buildHeroViewModel (page-local) or
// from profileToOverviewModel via overviewModel.js.

import { profileToOverviewModel }                  from '../domain/overviewModel.js';
import { NatalChartWheel }                          from '../components/NatalChartWheel.js';
import { NatalChartAudit }                          from '../components/NatalChartAudit.js';
import { RollingText }                              from '../components/RollingText.js';
import { SectionHeader }                            from '../components/SectionHeader.js';
import { LuxuryCard }                               from '../components/LuxuryCard.js';

// ── Public export ────────────────────────────────────────────────────────────

export function OverviewPage(root, input) {
  // Normalise input to a hero viewModel.
  const vm = resolveViewModel(input);
  root.replaceChildren(renderPage(vm));
}

// ── Input normalisation ──────────────────────────────────────────────────────

function resolveViewModel(input) {
  if (!input) return buildHeroViewModel(null);
  // Already a viewModel — has keyFacts property.
  if (input.keyFacts) return input;
  // Legacy mountWithProfile format: { profile, onNavigate, … }
  const raw = input.profile !== undefined ? input.profile : input;
  return buildHeroViewModel(raw);
}

// Maps a raw API profile to the hero viewModel shape.
function buildHeroViewModel(profile) {
  const safe     = profile || {};
  const existing = profileToOverviewModel(safe);

  const fusionHeadline = safe?.fusion?.headline
    ?? safe?.fusion?.summary
    ?? 'Deine Fusion-Signatur';

  const sun    = safe?.western?.bodies?.Sun;
  const moon   = safe?.western?.bodies?.Moon;
  const ascRaw = safe?.western?.ascendant;
  const dm     = safe?.bazi?.day_master;
  const ci     = safe?.fusion?.coherence_index ?? safe?.fusion?.coherence;

  const SIGN_DE = {
    Aries:'Widder', Taurus:'Stier', Gemini:'Zwillinge', Cancer:'Krebs',
    Leo:'Löwe', Virgo:'Jungfrau', Libra:'Waage', Scorpio:'Skorpion',
    Sagittarius:'Schütze', Capricorn:'Steinbock', Aquarius:'Wassermann',
    Pisces:'Fische',
  };
  const de = (s) => s ? (SIGN_DE[s] || s) : null;

  const ascSign = typeof ascRaw === 'string' ? ascRaw : ascRaw?.sign;

  const keyFacts = [
    sun?.sign   ? { label: 'Sonne',        value: de(sun.sign)  }   : null,
    moon?.sign  ? { label: 'Mond',         value: de(moon.sign) }   : null,
    ascSign     ? { label: 'AC',           value: de(ascSign)   }   : null,
    dm?.stem    ? { label: 'Tagesmeister', value: `${dm.stem}${dm.element ? ' ' + dm.element : ''}`.trim() } : null,
    ci != null  ? { label: 'Kohärenz',     value: `${Math.round(ci * 100)} %` } : null,
  ].filter(Boolean);

  const westernEvidence = [
    sun?.sign ? `Sonne ${de(sun.sign)}` : null,
    moon?.sign ? `Mond ${de(moon.sign)}` : null,
    ascSign ? `AC ${de(ascSign)}` : null,
  ].filter(Boolean).join(' · ');

  const baziEvidence = dm?.stem
    ? `${dm.stem}${dm.element ? ' ' + dm.element : ''} Tagesmeister`.trim()
    : null;

  const evidence = [
    westernEvidence ? { title: 'Westen',   body: westernEvidence } : null,
    baziEvidence    ? { title: 'BaZi',     body: baziEvidence }    : null,
    ci != null      ? { title: 'Fusion',   body: `Kohärenz ${Math.round(ci * 100)} %` } : null,
  ].filter(Boolean);

  return {
    identity:    { name: safe?.meta?.alias || '' },
    keyFacts:    keyFacts.length ? keyFacts : [],
    wheel:       existing.chartWheel,
    fusionNarrative: {
      headline: fusionHeadline,
      rotations: [],
      evidence:  evidence.slice(0, 3),
    },
    baziPillars:      existing.baziPillars,
    westernCore:      { bodies: existing.westernFactors },
    fusionCoherence:  existing.fusionSummary,
    elementEconomy:   existing.elementEconomy,
    deepDive: [
      { id: 'bazi',    title: 'BaZi — Vier Säulen',   href: '#/bazi'    },
      { id: 'western', title: 'Westliche Signatur',    href: '#/western' },
      { id: 'wuxing',  title: 'WuXing — Elemente',    href: '#/wuxing'  },
      { id: 'fusion',  title: 'Fusion-Synthese',       href: '#/fusion'  },
      { id: 'houses',  title: 'Häuser',                href: '#/houses'  },
      { id: 'daily',   title: 'Tagespuls',             href: '#/daily'   },
    ],
  };
}

// ── Page composition ─────────────────────────────────────────────────────────

function renderPage(vm) {
  const wrap = document.createElement('div');
  wrap.className = 'overview-page';

  wrap.append(
    renderHero(vm),
    renderBaziPillars(vm),
    renderWesternCore(vm),
    renderFusionCoherence(vm),
    renderElementEconomy(vm),
    renderDeepDive(vm),
  );
  return wrap;
}

// ── Hero section (data-section="hero")
// Contains: key-facts strip, then a CSS-grid with wheel (left) and narrative (right).
// key-facts comes first in DOM → document order: hero → key-facts → birthchart-wheel → fusion-narrative.

function renderHero(vm) {
  const hero = document.createElement('section');
  hero.dataset.section = 'hero';
  hero.className = 'overview-hero';

  // 1. Key-facts strip inside hero (first in source order so it appears first in querySelectorAll).
  hero.append(renderKeyFacts(vm));

  // 2. Two-column grid.
  const grid = document.createElement('div');
  grid.className = 'overview-hero__grid';

  // Left — birthchart wheel.
  const wheelSlot = document.createElement('div');
  wheelSlot.dataset.heroSlot = 'wheel';
  wheelSlot.className = 'overview-hero__wheel';

  const wheelSection = document.createElement('div');
  wheelSection.dataset.section = 'birthchart-wheel';
  if (vm.wheel) {
    wheelSection.append(NatalChartWheel({ wheel: vm.wheel }));
    wheelSection.append(NatalChartAudit({ wheel: vm.wheel }));
  }
  wheelSlot.append(wheelSection);

  // Right — fusion narrative.
  const narrativeSlot = document.createElement('div');
  narrativeSlot.dataset.heroSlot = 'narrative';
  narrativeSlot.className = 'overview-hero__narrative';

  const narrativeSection = document.createElement('div');
  narrativeSection.dataset.section = 'fusion-narrative';

  const rollingEl = RollingText({
    text:    vm.fusionNarrative.headline,
    tagName: 'h2',
    className: 'overview-hero__headline',
  });
  rollingEl.setAttribute('data-rolling-text', 'hero-headline');

  narrativeSection.append(rollingEl);

  const evidenceGrid = document.createElement('div');
  evidenceGrid.className = 'overview-hero__evidence';
  for (const ev of vm.fusionNarrative.evidence.slice(0, 3)) {
    const card = LuxuryCard({ lane: 'west' });
    card.dataset.evidenceCard = ev.title.toLowerCase();
    const header = document.createElement('strong');
    header.textContent = ev.title;
    const body = document.createElement('p');
    body.textContent = ev.body;
    card.body.append(header, body);
    evidenceGrid.append(card);
  }
  narrativeSection.append(evidenceGrid);
  narrativeSlot.append(narrativeSection);

  grid.append(wheelSlot, narrativeSlot);
  hero.append(grid);

  return hero;
}

// ── Key facts strip (data-section="key-facts") ──────────────────────────────

function renderKeyFacts(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'key-facts';
  section.className = 'key-facts-strip';

  for (const fact of vm.keyFacts) {
    const pill = document.createElement('span');
    pill.className = 'key-fact-pill';
    pill.dataset.keyFact = '';
    const lbl = document.createElement('span');
    lbl.className = 'key-fact-pill__label';
    lbl.textContent = fact.label;
    const val = document.createElement('span');
    val.className = 'key-fact-pill__value';
    val.textContent = fact.value;
    pill.append(lbl, val);
    section.append(pill);
  }

  return section;
}

// ── Thematic sections ────────────────────────────────────────────────────────

function renderBaziPillars(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'bazi-pillars';
  section.className = 'overview-section';
  section.append(SectionHeader({ eyebrow: 'Östliche Achse', headline: 'BaZi · Vier Säulen', anchor: 'bazi-pillars', lane: 'bazi' }));
  section.append(renderProgressiveDetails('Säulen-Details', renderPillarContent(vm.baziPillars)));
  return section;
}

function renderWesternCore(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'western-core';
  section.className = 'overview-section';
  section.append(SectionHeader({ eyebrow: 'Sonne · Mond · AC', headline: 'Westliche Kernachsen', anchor: 'western-core', lane: 'west' }));
  section.append(renderProgressiveDetails('Aspekte & Häuser', renderWesternContent(vm.westernCore)));
  return section;
}

function renderFusionCoherence(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'fusion-coherence';
  section.className = 'overview-section';
  section.append(SectionHeader({ eyebrow: 'Wo Ost und West sich tragen', headline: 'Fusion · Kohärenz', anchor: 'fusion-coherence', lane: 'fusion' }));

  const card = LuxuryCard({ lane: 'fusion' });
  const coherence = vm.fusionCoherence;
  if (coherence?.coherence != null) {
    const p = document.createElement('p');
    p.textContent = `Kohärenz: ${Math.round(coherence.coherence * 100)} %`;
    card.body.append(p);
  }
  if (coherence?.statement) {
    const p = document.createElement('p');
    p.textContent = coherence.statement;
    card.body.append(p);
  }
  section.append(card);
  return section;
}

function renderElementEconomy(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'element-economy';
  section.className = 'overview-section';
  section.append(SectionHeader({ eyebrow: 'Holz · Feuer · Erde · Metall · Wasser', headline: 'Element-Ökonomie', anchor: 'element-economy', lane: 'fusion' }));

  const bars = document.createElement('div');
  bars.className = 'element-bars';
  if (vm.elementEconomy) {
    for (const [key, value] of Object.entries(vm.elementEconomy)) {
      const row = document.createElement('div');
      row.className = 'element-bar-row';
      const label = document.createElement('span');
      label.className = 'element-bar-label';
      label.textContent = key;
      const bar = document.createElement('span');
      bar.className = 'element-bar-fill';
      bar.style.width = `${Math.round((value ?? 0) * 100)}%`;
      row.append(label, bar);
      bars.append(row);
    }
  }
  section.append(bars);
  return section;
}

// ── Deep Dive ────────────────────────────────────────────────────────────────

function renderDeepDive(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'deep-dive';
  section.className = 'overview-section';
  section.append(SectionHeader({ eyebrow: 'Wo geht es weiter?', headline: 'Vertiefung', anchor: 'deep-dive', lane: 'west' }));

  const grid = document.createElement('div');
  grid.className = 'deep-dive-grid';

  for (const tile of vm.deepDive) {
    const a = document.createElement('a');
    a.dataset.deepDiveTile = tile.id;
    a.className = 'deep-dive-tile';
    a.href = tile.href;
    const title = document.createElement('span');
    title.className = 'deep-dive-tile__title';
    title.textContent = tile.title;
    const arrow = document.createElement('span');
    arrow.className = 'deep-dive-tile__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    a.append(title, arrow);
    grid.append(a);
  }
  section.append(grid);
  return section;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderProgressiveDetails(summaryText, content) {
  const d = document.createElement('details');
  d.dataset.progressive = '';
  const s = document.createElement('summary');
  s.textContent = summaryText;
  d.append(s, content);
  return d;
}

function renderPillarContent(pillars) {
  const div = document.createElement('div');
  div.className = 'pillar-longform';
  if (pillars) {
    for (const [key, pillar] of Object.entries(pillars)) {
      if (!pillar?.stem) continue;
      const row = document.createElement('p');
      row.textContent = `${key}: ${pillar.stem}${pillar.branch ? ' / ' + pillar.branch : ''}`;
      div.append(row);
    }
  }
  return div;
}

function renderWesternContent(westernCore) {
  const div = document.createElement('div');
  div.className = 'western-longform';
  if (westernCore?.bodies) {
    for (const body of westernCore.bodies) {
      if (!body?.labelDE) continue;
      const row = document.createElement('p');
      row.textContent = body.source === 'missing'
        ? `${body.labelDE}: Daten fehlen`
        : `${body.labelDE}: ${body.signDE ?? '—'} ${body.degreeDisplay ? body.degreeDisplay + '°' : ''}`.trim();
      div.append(row);
    }
  }
  return div;
}
