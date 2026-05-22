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
import { NatalChartAuditTabs }                      from '../components/NatalChartAuditTabs.js';
import { SectionHeader }                            from '../components/SectionHeader.js';
import { LuxuryCard }                               from '../components/LuxuryCard.js';
import { renderSignatureHero }                      from '../components/SignatureHero.js';
import { renderMeaningBridge }                      from '../components/MeaningBridge.js';

// ── Public export ────────────────────────────────────────────────────────────

export function OverviewPage(root, input) {
  // Normalise input to a hero viewModel.
  const vm = resolveViewModel(input);
  root.replaceChildren(renderPage(vm));
  // OV-I3-T09: wire wheel:body:active → data-active on matching audit rows.
  // Idempotent — adding the same listener twice is a no-op.
  installWheelAuditLink(root);
}

// ── Input normalisation ──────────────────────────────────────────────────────

function resolveViewModel(input) {
  if (!input) return buildHeroViewModel(null);
  // Already a viewModel — has keyFacts property.
  if (input.keyFacts) return withSignatureHeroFallback(input);
  // Legacy mountWithProfile format: { profile, onNavigate, … }
  const raw = input.profile !== undefined ? input.profile : input;
  return buildHeroViewModel(raw);
}

// OV-I2: pre-mapped fixtures (test inputs) may not carry signatureHero /
// evidenceCards / meaningBridge. Provide sensible fallbacks derived from the
// fixture's own fusionNarrative + keyFacts so the SignatureHero can still render.
function withSignatureHeroFallback(vm) {
  const out = { ...vm };
  if (!out.signatureHero) {
    out.signatureHero = {
      essence: vm?.fusionNarrative?.headline || 'Signatur noch nicht vollständig geliefert.',
      ctas: [
        { label: 'Heute anwenden',   route: '/daily' },
        { label: 'In Beziehung sehen', route: '/synastry' },
      ],
    };
  }
  if (!out.evidenceCards) {
    const ev = Array.isArray(vm?.fusionNarrative?.evidence) ? vm.fusionNarrative.evidence : [];
    const find = (title) => ev.find((e) => (e?.title || '').toLowerCase().includes(title));
    const west   = find('west');
    const bazi   = find('bazi');
    const fusion = find('resonanz') || find('fusion');
    out.evidenceCards = {
      western: { title: 'Westliches Chart', body: west?.body   || 'Westliches Chart noch nicht geliefert.' },
      bazi:    { title: 'BaZi',             body: bazi?.body   || 'BaZi noch nicht geliefert.' },
      fusion:  { title: 'Fusion',           body: fusion?.body || 'Fusion-Layer noch nicht geliefert.' },
    };
  }
  if (!out.meaningBridge) {
    out.meaningBridge = {
      carries:    { title: 'Was dich trägt',   body: 'Tragende Achse wird angezeigt, sobald Sonne und Day Master geliefert sind.', source: 'fallback' },
      friction:   { title: 'Was reibt',        body: 'Reibungsachse wird angezeigt, sobald der Mond geliefert ist.',               source: 'fallback' },
      todayLever: { title: 'Was heute hilft',  body: 'Beginne den Tag mit einer kurzen, fokussierten Handlung statt mit Recherche.', source: 'fallback' },
    };
  }
  return out;
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
    // OV-I2: SignatureHero + MeaningBridge inputs from the ViewModel.
    signatureHero: existing.signatureHero,
    evidenceCards: existing.evidenceCards,
    meaningBridge: existing.meaningBridge,
    elementSummary: existing.elementSummary,
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

  // OV-I2 fix: SignatureHero owns the wheel directly via wheel-anchor.
  // The legacy data-section="hero" wrapper is dismantled — the key-facts strip
  // and the birthchart-wheel audit panel are now their own sibling sections
  // beneath signature-hero. The duplicated fusion-narrative block (which
  // repeated the essence headline + evidence cards already shown in the
  // signature panel) is removed entirely.
  wrap.append(
    renderSignatureHeroWithWheel(vm),
    renderKeyFacts(vm),
    renderBirthchartWheelDetail(vm),
    renderMeaningBridge(vm),
    renderBaziPillars(vm),
    renderWesternCore(vm),
    renderFusionCoherence(vm),
    renderElementEconomy(vm),
    renderDeepDive(vm),
  );
  return wrap;
}

// OV-I2 fix: build the wheel as a single node and inject it directly into the
// SignatureHero's wheel-anchor. No legacy hero wrapper.
function renderSignatureHeroWithWheel(vm) {
  let wheelNode = null;
  if (vm.wheel) {
    wheelNode = NatalChartWheel({ wheel: vm.wheel });
  }
  return renderSignatureHero(vm, { wheelNode });
}

// ── Birthchart wheel audit detail (data-section="birthchart-wheel") ─────────
// Kept as its own section for audit tooling + provenance verification. The
// actual wheel is rendered above inside signature-hero's wheel-anchor.
function renderBirthchartWheelDetail(vm) {
  const section = document.createElement('section');
  section.dataset.section = 'birthchart-wheel';
  section.className = 'overview-section overview-section--birthchart-wheel';
  if (vm.wheel) {
    // OV-I3-T09: AuditTabs skeleton — emits [data-audit-row="<key>"] targets
    // for every body + every axis so the wheel's hover/click linking has a
    // landing spot. Sits above the legacy NatalChartAudit which is kept for
    // backwards-compatible smoke tests.
    section.append(NatalChartAuditTabs({ wheel: vm.wheel }));
    section.append(NatalChartAudit({ wheel: vm.wheel }));
  }
  return section;
}

// OV-I3-T09: page-level event listener. The wheel dispatches
// `wheel:body:active` { kind, key, active } on planet circles + axis
// markers; we mirror it onto the matching [data-audit-row] node.
function installWheelAuditLink(root) {
  if (!root || typeof root.addEventListener !== 'function') return;
  if (root.__wheelAuditLinkInstalled) return;
  root.__wheelAuditLinkInstalled = true;
  root.addEventListener('wheel:body:active', (e) => {
    const detail = e && e.detail;
    if (!detail || !detail.key) return;
    // Clear any previously active row first. Exclude the inline SVG
    // <metadata data-audit-row> markers the wheel emits for screen readers —
    // their DOM order precedes the visible <li> audit rows, so a plain
    // querySelector would land data-active on an invisible node and the
    // <li> highlight would never appear. Scope to non-metadata nodes.
    const isVisibleRow = (n) => n && n.tagName && n.tagName.toLowerCase() !== 'metadata';
    const previouslyActive = Array.from(
      root.querySelectorAll('[data-audit-row][data-active="true"]'),
    ).filter(isVisibleRow);
    for (const node of previouslyActive) node.removeAttribute('data-active');
    if (detail.active === false) return;
    const candidates = Array.from(root.querySelectorAll(`[data-audit-row="${detail.key}"]`)).filter(isVisibleRow);
    if (candidates[0]) candidates[0].setAttribute('data-active', 'true');
  });
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

  const summary = vm.elementSummary;
  if (summary) {
    const wrap = document.createElement('div');
    wrap.className = 'element-summary';

    const sentence = document.createElement('p');
    sentence.className = 'element-summary-sentence';
    sentence.textContent = summary.sentence;
    wrap.append(sentence);

    if (summary.dominantElement || summary.underrepresentedElement) {
      const facts = document.createElement('dl');
      facts.className = 'element-summary-facts';
      if (summary.dominantElement) {
        const dt = document.createElement('dt'); dt.textContent = 'Tragendes Element';
        const dd = document.createElement('dd'); dd.textContent = summary.dominantElement;
        facts.append(dt, dd);
      }
      if (summary.underrepresentedElement) {
        const dt = document.createElement('dt'); dt.textContent = 'Unterrepräsentiert';
        const dd = document.createElement('dd'); dd.textContent = summary.underrepresentedElement;
        facts.append(dt, dd);
      }
      wrap.append(facts);
    }

    if (summary.leverToday) {
      const lever = document.createElement('p');
      lever.className = 'element-summary-lever';
      lever.textContent = `Heute: ${summary.leverToday}`;
      wrap.append(lever);
    }

    const cta = document.createElement('a');
    cta.className = 'element-summary-cta';
    cta.href = `#${summary.ctaRoute || '/wuxing'}`;
    cta.textContent = 'Wu-Xing vertiefen';
    wrap.append(cta);

    section.append(wrap);
  }
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
