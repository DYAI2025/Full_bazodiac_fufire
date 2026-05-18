// Antizipation ohne manipulative Push-Mechanik. Verlinkt zu /transits.

const DEFAULT_TEASER = 'Morgen zeigen wir dir, was sich gegenüber heute verändert hat.';

export function tomorrowTeaserModel(input) {
  const src = input || {};
  const teaser = (typeof src.teaser === 'string' && src.teaser.trim()) ? src.teaser.trim() : DEFAULT_TEASER;
  return {
    teaser,
    href:      src.href      || '/transits',
    linkLabel: src.linkLabel || 'Zur Wochenvorschau',
  };
}

export function TomorrowTeaserCard(opts) {
  const m = tomorrowTeaserModel(opts);
  const root = document.createElement('section');
  root.className = 'tomorrow-teaser-card';

  const h = document.createElement('h3');
  h.className = 'tomorrow-teaser-card__title';
  h.textContent = 'Morgen';
  root.appendChild(h);

  const p = document.createElement('p');
  p.className = 'tomorrow-teaser-card__body';
  p.textContent = m.teaser;
  root.appendChild(p);

  const a = document.createElement('a');
  a.className = 'tomorrow-teaser-card__link';
  a.href = `#${m.href}`;
  a.textContent = `${m.linkLabel} →`;
  root.appendChild(a);

  return root;
}
