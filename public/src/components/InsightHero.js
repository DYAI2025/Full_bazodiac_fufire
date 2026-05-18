// Hero-Card am Seitenanfang: 1–3 Sätze Insight, optionale Evidence-Chips, bis zu zwei CTAs.

export function insightHeroModel({
  eyebrow = '',
  title = '',
  statement = '',
  evidence = [],
  primaryAction = null,
  secondaryAction = null,
  tone = 'neutral',
} = {}) {
  return { eyebrow, title, statement, evidence, primaryAction, secondaryAction, tone };
}

export function InsightHero(opts = {}) {
  const m = insightHeroModel(opts);
  const root = document.createElement('section');
  root.className = `insight-hero insight-hero--${m.tone}`;

  if (m.eyebrow) {
    const e = document.createElement('p');
    e.className = 'insight-hero__eyebrow';
    e.textContent = m.eyebrow;
    root.appendChild(e);
  }
  if (m.title) {
    const h = document.createElement('h1');
    h.className = 'insight-hero__title';
    h.textContent = m.title;
    root.appendChild(h);
  }
  if (m.statement) {
    const p = document.createElement('p');
    p.className = 'insight-hero__statement';
    p.textContent = m.statement;
    root.appendChild(p);
  }
  if (m.evidence.length) {
    const ev = document.createElement('ul');
    ev.className = 'insight-hero__evidence';
    for (const item of m.evidence) {
      const li = document.createElement('li');
      li.textContent = item;
      ev.appendChild(li);
    }
    root.appendChild(ev);
  }
  if (m.primaryAction || m.secondaryAction) {
    const bar = document.createElement('div');
    bar.className = 'insight-hero__actions';
    for (const a of [m.primaryAction, m.secondaryAction].filter(Boolean)) {
      const btn = document.createElement('a');
      btn.className = 'insight-hero__cta';
      btn.href = `#${a.path}`;
      btn.textContent = a.label;
      bar.appendChild(btn);
    }
    root.appendChild(bar);
  }
  return root;
}
