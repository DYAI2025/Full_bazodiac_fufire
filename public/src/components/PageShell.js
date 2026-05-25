export function PageShell({ eyebrow, headline, subline } = {}) {
  const root = document.createElement('div');
  root.className = 'page-shell';
  root.setAttribute('role', 'main');

  if (eyebrow) {
    const ey = document.createElement('p');
    ey.className = 'page-eyebrow bz-eyebrow';
    ey.setAttribute('data-page-eyebrow', '');
    ey.textContent = eyebrow;
    root.appendChild(ey);
  }

  const h1 = document.createElement('h1');
  h1.className = 'bz-h1 page-title';
  h1.setAttribute('data-page-title', '');
  h1.textContent = headline ?? '';
  root.appendChild(h1);

  if (subline) {
    const sub = document.createElement('p');
    sub.className = 'page-subline bz-body-muted';
    sub.setAttribute('data-page-subline', '');
    sub.textContent = subline;
    root.appendChild(sub);
  }

  const body = document.createElement('div');
  body.className = 'page-body';
  root.appendChild(body);

  root.body = body;
  return root;
}
