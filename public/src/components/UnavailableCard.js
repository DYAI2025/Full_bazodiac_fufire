// Zeigt einen Leer-Zustand an — immer motivierend, nie defensiv
export function UnavailableCard({ title, reason, action = null }) {
  const el = document.createElement('div');
  el.className = 'unavailable-card';
  el.innerHTML = `
    <span class="unavailable-icon">◌</span>
    <h3 class="unavailable-title">${title}</h3>
    <p class="unavailable-reason">${reason}</p>
    ${action ? `<button class="unavailable-action">${action.label}</button>` : ''}
  `;
  if (action) {
    el.querySelector('.unavailable-action').addEventListener('click', action.handler);
  }
  return el;
}
