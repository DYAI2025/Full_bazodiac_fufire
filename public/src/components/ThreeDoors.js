// Drei Wege ins Erlebnis: Heute / Kontakt / Arbeit. Wird auf Overview, Daily-Footer,
// Synastry-Result und ggf. anderen signatur-bewussten Pages eingesetzt.

const DEFAULT_DOORS = [
  { path: '/daily',          eyebrow: 'Heute',   title: 'Tagespuls',            hint: 'Was heute aus deiner Signatur lebt' },
  { path: '/love',           eyebrow: 'Kontakt', title: 'In Beziehung',         hint: 'Wie du in Nähe reagierst' },
  { path: '/career-finance', eyebrow: 'Arbeit',  title: 'Arbeit & Ressourcen',  hint: 'Wie du Substanz verteilst' },
];

export function threeDoorsModel({ doors = DEFAULT_DOORS } = {}) {
  return { doors: doors.map((d) => ({ ...d })) };
}

export function ThreeDoors(opts = {}) {
  const { doors } = threeDoorsModel(opts);
  const wrap = document.createElement('section');
  wrap.className = 'three-doors';
  wrap.setAttribute('aria-label', 'Drei Wege');
  for (const d of doors) {
    const a = document.createElement('a');
    a.href = `#${d.path}`;
    a.className = 'three-doors__door';
    const eb = document.createElement('span'); eb.className = 'three-doors__eyebrow'; eb.textContent = d.eyebrow;
    const t  = document.createElement('h3');   t.className  = 'three-doors__title';   t.textContent  = d.title;
    const h  = document.createElement('p');    h.className  = 'three-doors__hint';    h.textContent  = d.hint;
    a.append(eb, t, h);
    wrap.appendChild(a);
  }
  return wrap;
}
