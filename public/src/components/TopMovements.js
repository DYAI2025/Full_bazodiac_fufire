// public/src/components/TopMovements.js
//
// OV-I4-T10: progressive disclosure of natal aspects.
//
// Default visible: at most 3 entries (across all tone groups), chosen by
// smallest orb first because tighter orbs are usually the most relevant
// "movements" in a chart. Remaining entries are tucked into a
// <details data-progressive> accordion so users can opt into the full list.
//
// Entries are grouped into:
//   - Spannung  ← tone === 'hard'
//   - Harmonie  ← tone === 'soft'
//   - Neutral   ← tone === 'neutral' (or any unknown tone)
//
// Pure factory — no fetch, no state. Builds DOM via createElement +
// appendChild only (no innerHTML strings), so it stays safe even when the
// inputs flow from upstream payloads.
//
// REQ-F-OV-005, REQ-F-OV-006.

const TONE_GROUPS = [
  { tone: 'hard',    label: 'Spannung'  },
  { tone: 'soft',    label: 'Harmonie'  },
  { tone: 'neutral', label: 'Neutral'   },
];

const VISIBLE_LIMIT = 3;

function classifyTone(t) {
  if (t === 'hard' || t === 'soft' || t === 'neutral') return t;
  return 'neutral';
}

function orbRank(m) {
  const o = typeof m.orb === 'number' && Number.isFinite(m.orb) ? m.orb : 9999;
  return o;
}

function movementArticle(m, collapsed) {
  const tone = classifyTone(m.tone);
  const article = document.createElement('article');
  article.className = `bz-movement bz-movement--${tone}`;
  article.dataset.movement = '';
  article.setAttribute('data-tone', tone);
  if (collapsed) article.setAttribute('data-collapsed', '');

  const head = document.createElement('header');
  head.className = 'bz-movement__head';

  const pair = document.createElement('span');
  pair.className = 'bz-movement__pair';
  pair.textContent = `${m.sourceKey || '?'} ↔ ${m.targetKey || '?'}`;

  const type = document.createElement('span');
  type.className = 'bz-movement__type';
  type.textContent = m.typeDE || 'Aspekt';

  head.append(pair, type);

  const meta = document.createElement('p');
  meta.className = 'bz-movement__meta';
  meta.textContent = (typeof m.orb === 'number' && Number.isFinite(m.orb))
    ? `Orb ${m.orb.toFixed(1)}°`
    : 'Orb unbekannt';

  article.append(head, meta);
  return article;
}

function groupNode(label, tone) {
  const sec = document.createElement('section');
  sec.className = `bz-movement-group bz-movement-group--${tone}`;
  sec.setAttribute('data-tone-group', tone);

  const h = document.createElement('h4');
  h.className = 'bz-movement-group__label';
  h.textContent = label;
  sec.append(h);

  return sec;
}

/**
 * Render the TopMovements section.
 *
 * @param {{ topMovements?: Array<{ sourceKey?: string, targetKey?: string, typeDE?: string, tone?: string, orb?: number }> }} viewModel
 * @returns {HTMLElement}
 */
export function renderTopMovements(viewModel) {
  const list = Array.isArray(viewModel && viewModel.topMovements)
    ? viewModel.topMovements.slice()
    : [];

  const root = document.createElement('section');
  root.className = 'bz-top-movements';
  root.dataset.section = 'top-movements';
  root.setAttribute('aria-labelledby', 'bz-top-movements-title');

  const heading = document.createElement('h3');
  heading.className = 'bz-top-movements__title';
  heading.id = 'bz-top-movements-title';
  heading.textContent = 'Bewegungen im Chart';
  root.append(heading);

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bz-top-movements__empty';
    empty.textContent = 'Aspektdaten noch nicht geliefert.';
    root.append(empty);
    return root;
  }

  // Sort all entries by orb ascending so tighter orbs surface first.
  list.sort((a, b) => orbRank(a) - orbRank(b));

  // Distribute the visible budget across all entries.
  const visible  = list.slice(0, VISIBLE_LIMIT);
  const collapsed = list.slice(VISIBLE_LIMIT);

  // Build by tone group so the visual grouping is preserved.
  const visibleByTone   = { hard: [], soft: [], neutral: [] };
  const collapsedByTone = { hard: [], soft: [], neutral: [] };
  for (const m of visible)   visibleByTone[classifyTone(m.tone)].push(m);
  for (const m of collapsed) collapsedByTone[classifyTone(m.tone)].push(m);

  const visibleWrap = document.createElement('div');
  visibleWrap.className = 'bz-top-movements__visible';

  for (const g of TONE_GROUPS) {
    const groupEntries = visibleByTone[g.tone];
    const sec = groupNode(g.label, g.tone);
    if (groupEntries.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'bz-movement-group__empty';
      placeholder.textContent = '—';
      sec.append(placeholder);
    } else {
      for (const m of groupEntries) sec.append(movementArticle(m, false));
    }
    visibleWrap.append(sec);
  }
  root.append(visibleWrap);

  if (collapsed.length > 0) {
    const details = document.createElement('details');
    details.className = 'bz-top-movements__details';
    details.dataset.progressive = '';

    const summary = document.createElement('summary');
    summary.className = 'bz-top-movements__summary';
    summary.textContent = 'Alle Bewegungen';
    details.append(summary);

    for (const g of TONE_GROUPS) {
      const groupEntries = collapsedByTone[g.tone];
      if (groupEntries.length === 0) continue;
      const sec = groupNode(g.label, g.tone);
      for (const m of groupEntries) sec.append(movementArticle(m, true));
      details.append(sec);
    }
    root.append(details);
  }

  return root;
}

export default renderTopMovements;
