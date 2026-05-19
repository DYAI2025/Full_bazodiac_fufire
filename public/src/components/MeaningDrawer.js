// Wiederverwendbarer Erklärungs-Drawer für Education-First Cards.
// Pure model + DOM factory. Render-Pfad nie leer — Basisdeutung statt
// "Keine Beschreibung verfügbar".

export function meaningDrawerModel({
  title = '',
  subtitle = '',
  meaning = '',
  resource = '',
  shadow = '',
  practice = '',
  extras = [],
} = {}) {
  return {
    title,
    subtitle,
    meaning:  meaning  || 'Basisdeutung folgt — Element- und Pol-Beschreibung weiter oben in der Karte.',
    resource: resource || '',
    shadow:   shadow   || '',
    practice: practice || '',
    extras:   Array.isArray(extras) ? extras : [],
  };
}

export function MeaningDrawer(opts = {}) {
  const m = meaningDrawerModel(opts);
  const root = document.createElement('section');
  root.className = 'meaning-drawer';

  if (m.title) {
    const h = document.createElement('h3');
    h.className = 'meaning-drawer__title';
    h.textContent = m.title;
    root.appendChild(h);
  }
  if (m.subtitle) {
    const s = document.createElement('p');
    s.className = 'meaning-drawer__subtitle';
    s.textContent = m.subtitle;
    root.appendChild(s);
  }
  for (const [label, val, cls] of [
    ['Bedeutung', m.meaning,  'meaning-drawer__meaning'],
    ['Ressource', m.resource, 'meaning-drawer__resource'],
    ['Schatten',  m.shadow,   'meaning-drawer__shadow'],
    ['Praxis',    m.practice, 'meaning-drawer__practice'],
  ]) {
    if (!val) continue;
    const p = document.createElement('p');
    p.className = cls;
    const strong = document.createElement('strong');
    strong.textContent = `${label}:`;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(` ${val}`));
    root.appendChild(p);
  }
  if (m.extras.length) {
    const ul = document.createElement('ul');
    ul.className = 'meaning-drawer__extras';
    for (const item of m.extras) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    root.appendChild(ul);
  }
  return root;
}

export const JSDOM_TEXT_CONTENT_ONLY = true;
