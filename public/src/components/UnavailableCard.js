export function UnavailableCard({ title, reason, action = null }) {
  const el = document.createElement('div');
  el.className = 'unavailable-card';

  const icon = document.createElement('span');
  icon.className = 'unavailable-icon';
  icon.textContent = '◌';

  const h3 = document.createElement('h3');
  h3.className = 'unavailable-title';
  h3.textContent = title;

  const p = document.createElement('p');
  p.className = 'unavailable-reason';
  p.textContent = reason;

  el.append(icon, h3, p);

  if (action) {
    const btn = document.createElement('button');
    btn.className = 'unavailable-action';
    btn.textContent = action.label;
    btn.addEventListener('click', action.handler);
    el.appendChild(btn);
  }

  return el;
}
