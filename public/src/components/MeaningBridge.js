// public/src/components/MeaningBridge.js — OV-I2-T05
//
// Renders the Meaning Bridge: three short cards that translate the chart
// signature into actionable language (was dich trägt / was reibt / was heute
// hilft). Each card carries a [data-card] kind, a [data-card-body] paragraph,
// and a [data-card-source] attribution pill so the user can audit *where* the
// statement comes from.
//
// renderMeaningBridge(viewModel) → HTMLElement (a <section>).

const ORDER = [
  ['carries',    'carries'],
  ['friction',   'friction'],
  ['todayLever', 'today-lever'],
];

const MAX_BODY_CHARS = 240;

function truncate(text) {
  const s = (text == null ? '' : String(text));
  if (s.length <= MAX_BODY_CHARS) return s;
  return s.slice(0, MAX_BODY_CHARS - 1).trimEnd() + '…';
}

export function renderMeaningBridge(viewModel) {
  const vm = viewModel || {};
  const bridge = vm.meaningBridge || null;

  const section = document.createElement('section');
  section.dataset.section = 'meaning-bridge';
  section.className = 'bz-meaning-bridge';

  if (!bridge) return section;

  for (const [vmKey, attr] of ORDER) {
    const card = bridge[vmKey];
    if (!card) continue;

    const article = document.createElement('article');
    article.className = 'bz-meaning-card';
    article.dataset.card = attr;

    const title = document.createElement('h4');
    title.className = 'bz-meaning-card__title';
    title.textContent = card.title || '';
    article.append(title);

    const body = document.createElement('p');
    body.className = 'bz-meaning-card__body';
    body.setAttribute('data-card-body', '');
    body.textContent = truncate(card.body || '');
    article.append(body);

    const source = document.createElement('p');
    source.className = 'bz-meaning-card__source';
    source.setAttribute('data-card-source', '');
    source.textContent = card.source || '';
    article.append(source);

    section.append(article);
  }

  return section;
}
