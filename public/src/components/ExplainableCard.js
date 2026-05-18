// Klickbare Karte mit optionalem MeaningDrawer als <details>.
// Nutzt MeaningDrawer für den expand-Bereich; die Karte selbst zeigt
// Hauptwert + Zusatzinfo + Domain-Tag (bazi/west/fusion/house).

import { MeaningDrawer } from './MeaningDrawer.js';

export function explainableCardModel({
  domain = 'bazi',   // 'bazi' | 'west' | 'fusion' | 'house'
  label = '',
  value = '',
  helper = '',
  meaning = {},
  highlighted = false,
} = {}) {
  return {
    domain: ['bazi','west','fusion','house'].includes(domain) ? domain : 'bazi',
    label, value, helper, meaning, highlighted,
  };
}

export function ExplainableCard(opts = {}) {
  const m = explainableCardModel(opts);
  const root = document.createElement('section');
  root.className = `explainable-card explainable-card--${m.domain}${m.highlighted ? ' explainable-card--highlight' : ''}`;
  root.setAttribute('role', 'group');

  const head = document.createElement('header');
  head.className = 'explainable-card__head';
  const lab = document.createElement('span');
  lab.className = 'explainable-card__label';
  lab.textContent = m.label;
  head.appendChild(lab);
  if (m.highlighted) {
    const badge = document.createElement('span');
    badge.className = 'explainable-card__badge';
    badge.textContent = 'Day Master';
    head.appendChild(badge);
  }
  root.appendChild(head);

  const val = document.createElement('p');
  val.className = 'explainable-card__value';
  val.textContent = m.value;
  root.appendChild(val);

  if (m.helper) {
    const h = document.createElement('p');
    h.className = 'explainable-card__helper';
    h.textContent = m.helper;
    root.appendChild(h);
  }

  // Drawer als <details> — klickbar
  const details = document.createElement('details');
  details.className = 'explainable-card__details';
  const summary = document.createElement('summary');
  summary.textContent = 'Erklärung öffnen';
  details.appendChild(summary);
  details.appendChild(MeaningDrawer(m.meaning));
  root.appendChild(details);

  return root;
}
