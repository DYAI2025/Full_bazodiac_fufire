// public/src/components/FusionSignaturePanel.js — OV-I2-T04
//
// Renders the Signature Hero section with two slots:
//   [data-hero-slot="wheel-anchor"]            — left, callee injects the wheel DOM
//   [data-hero-slot="fusion-signature-panel"]  — right, essence text + evidence + CTAs
//
// Returns an HTMLElement (DOM-style, not a string), matching codebase convention.

export function renderFusionSignaturePanel({ signatureHero, evidenceCards } = {}) {
  const safeHero = signatureHero || { essence: '', ctas: [] };
  const safeCards = evidenceCards || {};

  const section = document.createElement('section');
  section.dataset.section = 'signature-hero';
  section.className = 'bz-signature-hero';

  // ── Left slot: wheel anchor (callee injects the wheel node) ────────────────
  const wheelAnchor = document.createElement('div');
  wheelAnchor.dataset.heroSlot = 'wheel-anchor';
  wheelAnchor.className = 'bz-hero__wheel';

  // ── Right slot: fusion signature panel ─────────────────────────────────────
  const panel = document.createElement('div');
  panel.dataset.heroSlot = 'fusion-signature-panel';
  panel.className = 'bz-hero__panel';

  if (safeHero.essence) {
    const essence = document.createElement('p');
    essence.className = 'bz-hero__essence';
    essence.textContent = safeHero.essence;
    panel.append(essence);
  }

  const evidenceGrid = document.createElement('div');
  evidenceGrid.className = 'bz-evidence-grid';
  for (const key of ['western', 'bazi', 'fusion']) {
    const card = safeCards[key];
    if (!card) continue;
    const article = document.createElement('article');
    article.className = 'bz-evidence-card';
    article.dataset.evidence = key;
    const h4 = document.createElement('h4');
    h4.textContent = card.title || '';
    const p = document.createElement('p');
    p.textContent = card.body || '';
    article.append(h4, p);
    evidenceGrid.append(article);
  }
  panel.append(evidenceGrid);

  const ctas = Array.isArray(safeHero.ctas) ? safeHero.ctas : [];
  if (ctas.length > 0) {
    const nav = document.createElement('nav');
    nav.className = 'bz-hero__ctas';
    for (const cta of ctas) {
      const a = document.createElement('a');
      a.className = 'bz-cta';
      a.href = `#${cta.route || ''}`;
      a.textContent = cta.label || '';
      nav.append(a);
    }
    panel.append(nav);
  }

  section.append(wheelAnchor, panel);
  return section;
}
