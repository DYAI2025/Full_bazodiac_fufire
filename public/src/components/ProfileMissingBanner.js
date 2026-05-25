// Inline-Banner für Routen, die ein berechnetes Profil erwarten.
// Ersetzt frühere router.navigate('/') Redirects: Nutzer bleibt auf der
// gewünschten Route, sieht Erklärung und kann gezielt zur Eingabe wechseln.

export function ProfileMissingBanner({ pageLabel = 'diese Ansicht', onOpenInput } = {}) {
  const el = document.createElement('section');
  el.className = 'profile-missing-banner';
  el.setAttribute('role', 'status');

  const title = document.createElement('h2');
  title.className = 'profile-missing-title';
  title.textContent = 'Profil fehlt';

  const text = document.createElement('p');
  text.className = 'profile-missing-text';
  text.textContent = `Für ${pageLabel} brauchen wir zuerst deine Geburtsdaten. ` +
    `Deine Eingaben gehen nicht verloren — sie werden lokal in deinem Browser gespeichert.`;

  const actions = document.createElement('div');
  actions.className = 'profile-missing-actions';

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'profile-missing-cta';
  cta.textContent = 'Eingabe öffnen';
  cta.addEventListener('click', () => {
    if (typeof onOpenInput === 'function') onOpenInput();
    else window.location.hash = '/';
  });

  actions.appendChild(cta);
  el.append(title, text, actions);
  return el;
}
