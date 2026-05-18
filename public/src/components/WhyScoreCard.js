// Score-Card mit Bedeutung, Hebt/Senkt-Splits, Tagesaktion und Caveat.

export function whyScoreCardModel({
  label = '',
  score = 0,
  scoreLabel = '',
  meaning = '',
  raises = [],
  lowers = [],
  action = '',
  caveat = '',
} = {}) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  return { label, score: s, scoreLabel, meaning, raises, lowers, action, caveat };
}

export function WhyScoreCard(opts = {}) {
  const m = whyScoreCardModel(opts);
  const root = document.createElement('section');
  root.className = 'why-score-card';

  const header = document.createElement('header');
  header.className = 'why-score-card__header';
  const labelEl = document.createElement('span');
  labelEl.className = 'why-score-card__label';
  labelEl.textContent = m.label;
  const scoreEl = document.createElement('span');
  scoreEl.className = 'why-score-card__score';
  scoreEl.setAttribute('aria-label', m.scoreLabel);
  scoreEl.textContent = String(m.score);
  header.appendChild(labelEl);
  header.appendChild(scoreEl);
  root.appendChild(header);

  if (m.meaning) {
    const p = document.createElement('p');
    p.className = 'why-score-card__meaning';
    p.textContent = m.meaning;
    root.appendChild(p);
  }
  const cols = document.createElement('div');
  cols.className = 'why-score-card__cols';
  for (const [title, items] of [['Hebt', m.raises], ['Senkt', m.lowers]]) {
    if (!items.length) continue;
    const col = document.createElement('div');
    col.className = 'why-score-card__col';
    const h = document.createElement('h4');
    h.textContent = title;
    col.appendChild(h);
    const ul = document.createElement('ul');
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    col.appendChild(ul);
    cols.appendChild(col);
  }
  root.appendChild(cols);

  if (m.action) {
    const a = document.createElement('p');
    a.className = 'why-score-card__action';
    a.textContent = `Heute: ${m.action}`;
    root.appendChild(a);
  }
  if (m.caveat) {
    const c = document.createElement('p');
    c.className = 'why-score-card__caveat';
    c.textContent = m.caveat;
    root.appendChild(c);
  }
  return root;
}
