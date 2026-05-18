// Eine Karte für mainConnection ODER mainFriction. Kind unterscheidet Styling.

export function relationshipSignalCardModel({
  kind = 'connection',
  title = '',
  summary = '',
  evidence = [],
  sourceLayer = '',
  confidence = null,
  practice = '',
} = {}) {
  return {
    kind: (kind === 'friction') ? 'friction' : 'connection',
    title,
    summary,
    evidence: Array.isArray(evidence) ? evidence : [],
    sourceLayer,
    confidence,
    practice,
  };
}

export function RelationshipSignalCard(opts = {}) {
  const m = relationshipSignalCardModel(opts);
  const root = document.createElement('section');
  root.className = `relationship-signal-card relationship-signal-card--${m.kind}`;

  if (m.title) {
    const h = document.createElement('h3');
    h.className = 'relationship-signal-card__title';
    h.textContent = m.title;
    root.appendChild(h);
  }
  if (m.summary) {
    const p = document.createElement('p');
    p.className = 'relationship-signal-card__summary';
    p.textContent = m.summary;
    root.appendChild(p);
  }
  if (m.evidence.length) {
    const ul = document.createElement('ul');
    ul.className = 'relationship-signal-card__evidence';
    for (const item of m.evidence) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    root.appendChild(ul);
  }
  if (m.practice) {
    const p = document.createElement('p');
    p.className = 'relationship-signal-card__practice';
    p.innerHTML = `<strong>Praktisch:</strong> ${m.practice}`;
    root.appendChild(p);
  }
  if (m.sourceLayer) {
    const tag = document.createElement('span');
    tag.className = 'relationship-signal-card__layer';
    tag.textContent = `Quelle: ${m.sourceLayer}`;
    root.appendChild(tag);
  }
  return root;
}
