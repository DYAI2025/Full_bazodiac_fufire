export function SectionHeader({ eyebrow, headline, subline, anchor, lane } = {}) {
  const root = document.createElement('div');
  root.className = 'section-header';

  if (anchor) root.setAttribute('id', anchor);
  if (lane) root.setAttribute('data-lane', lane);

  if (eyebrow) {
    const ey = document.createElement('p');
    ey.className = 'layer-eyebrow bz-eyebrow';
    ey.setAttribute('data-section-eyebrow', '');
    ey.textContent = eyebrow;
    root.appendChild(ey);
  }

  const h2 = document.createElement('h2');
  h2.className = 'bz-h2 layer-title';
  h2.setAttribute('data-section-title', '');
  h2.textContent = headline ?? '';
  root.appendChild(h2);

  if (subline) {
    const sub = document.createElement('p');
    sub.className = 'section-subline bz-body-muted';
    sub.setAttribute('data-section-subline', '');
    sub.textContent = subline;
    root.appendChild(sub);
  }

  return root;
}
