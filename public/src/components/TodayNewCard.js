// Variable Belohnung: Was ist heute anders als gestern?
// Wird komplett aus vm.todayNew gefüttert; fällt nie auf einen leeren Zustand.

const ERSTTAG_DEFAULT = [
  'Dies ist dein erster gespeicherter Tagespuls. Ab morgen zeigen wir dir, was sich verändert hat.',
];

export function todayNewCardModel(input) {
  const src = input || {};
  const isFirstDay = !!src.isFirstDay || !Array.isArray(src.points) || src.points.length === 0;
  let title = src.title;
  let points = Array.isArray(src.points) ? src.points.slice(0, 3) : [];
  if (isFirstDay) {
    title = title || 'Heute im Fokus';
    if (!points.length) points = [...ERSTTAG_DEFAULT];
  } else {
    title = title || 'Heute neu';
  }
  return { title, isFirstDay, points };
}

export function TodayNewCard(opts) {
  const m = todayNewCardModel(opts);
  const root = document.createElement('section');
  root.className = 'today-new-card';

  const h = document.createElement('h3');
  h.className = 'today-new-card__title';
  h.textContent = m.title;
  root.appendChild(h);

  const ul = document.createElement('ul');
  ul.className = 'today-new-card__list';
  for (const p of m.points) {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  }
  root.appendChild(ul);
  return root;
}
