// Wiederverwendbarer Erklärungs-Drawer für Education-First Cards.
// Pure model + DOM factory. Render-Pfad nie leer — Basisdeutung statt
// "Keine Beschreibung verfügbar".
//
// 6-Feld-Schema (Goal-Spec Akzeptanzkriterium):
//   what     — "Was ist das" (kurze Definition)
//   meaning  — "Bedeutung im Profil"
//   resource — "Ressource"
//   shadow   — "Schatten"
//   practice — "Praxis"
//   related  — "Verwandte Karten" (Liste von {label, href?})

export function meaningDrawerModel({
  title = '',
  subtitle = '',
  what = '',
  meaning = '',
  resource = '',
  shadow = '',
  practice = '',
  related = [],
  extras = [],
} = {}) {
  return {
    title,
    subtitle,
    what:     what     || '',
    meaning:  meaning  || subtitle || 'Klick zur ausgeklappten Detail-Erklärung der Karte oben.',
    resource: resource || '',
    shadow:   shadow   || '',
    practice: practice || '',
    related:  Array.isArray(related) ? related.filter(Boolean) : [],
    extras:   Array.isArray(extras)  ? extras  : [],
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
    ['Was ist das', m.what,     'meaning-drawer__what'],
    ['Bedeutung',   m.meaning,  'meaning-drawer__meaning'],
    ['Ressource',   m.resource, 'meaning-drawer__resource'],
    ['Schatten',    m.shadow,   'meaning-drawer__shadow'],
    ['Praxis',      m.practice, 'meaning-drawer__practice'],
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
  if (m.related.length) {
    const wrap = document.createElement('div');
    wrap.className = 'meaning-drawer__related';
    const lab = document.createElement('strong');
    lab.textContent = 'Verwandte Karten:';
    wrap.appendChild(lab);
    const ul = document.createElement('ul');
    ul.className = 'meaning-drawer__related-list';
    for (const r of m.related) {
      const li = document.createElement('li');
      const rel = (typeof r === 'string') ? { label: r } : (r || {});
      if (rel.href) {
        const a = document.createElement('a');
        a.href = rel.href;
        a.textContent = rel.label || rel.href;
        a.className = 'meaning-drawer__related-link';
        li.appendChild(a);
      } else {
        li.textContent = rel.label || '';
      }
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
    root.appendChild(wrap);
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
