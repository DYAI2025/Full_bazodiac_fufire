// First-viewport Hero für Variante C. Drei Sätze + Eyebrow + Caveat.
// Spricht NIE Match/Garantie/Schicksal aus — Defensive Copy via relationshipCopy.

import { RELATIONSHIP_SAFETY_CAVEAT } from '../domain/relationshipCopy.js';

const DEFAULT_PAD = [
  'Was euch verbindet: noch keine Aussage möglich.',
  'Wo Reibung entsteht: noch keine Aussage möglich.',
  'Was hilft: lege beide Profile an, um eine Auswertung zu sehen.',
];

export function relationshipSummaryHeroModel({
  eyebrow = 'Eure Kontakt-Signatur',
  title = 'Resonanz mit klarer Reibungsachse',
  statements = [],
  caveat = RELATIONSHIP_SAFETY_CAVEAT,
} = {}) {
  const padded = Array.from({ length: 3 }, (_, i) =>
    (typeof statements[i] === 'string' && statements[i].trim()) ? statements[i] : DEFAULT_PAD[i]);
  return { eyebrow, title, statements: padded, caveat };
}

export function RelationshipSummaryHero(opts = {}) {
  const m = relationshipSummaryHeroModel(opts);
  const root = document.createElement('section');
  root.className = 'relationship-hero';

  const eb = document.createElement('p');
  eb.className = 'relationship-hero__eyebrow';
  eb.textContent = m.eyebrow;
  root.appendChild(eb);

  const h = document.createElement('h1');
  h.className = 'relationship-hero__title';
  h.textContent = m.title;
  root.appendChild(h);

  const list = document.createElement('ol');
  list.className = 'relationship-hero__statements';
  for (const s of m.statements) {
    const li = document.createElement('li');
    li.textContent = s;
    list.appendChild(li);
  }
  root.appendChild(list);

  const cav = document.createElement('p');
  cav.className = 'relationship-hero__caveat';
  cav.textContent = m.caveat;
  root.appendChild(cav);

  return root;
}
