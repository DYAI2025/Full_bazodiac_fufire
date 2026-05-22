export function LuxuryCard({ title, lane, variant, withFooter } = {}) {
  const root = document.createElement('article');
  root.className = 'luxury-card' + (variant ? ` luxury-card--${variant}` : '');

  if (lane) root.setAttribute('data-lane', lane);

  if (title) {
    const h3 = document.createElement('h3');
    h3.className = 'bz-h3 luxury-card__title';
    h3.setAttribute('data-card-title', '');
    h3.textContent = title;
    root.appendChild(h3);
  }

  const body = document.createElement('div');
  body.className = 'luxury-card__body';
  root.appendChild(body);
  root.body = body;

  if (withFooter) {
    const footer = document.createElement('footer');
    footer.className = 'luxury-card__footer';
    root.appendChild(footer);
    root.footer = footer;
  }

  return root;
}
