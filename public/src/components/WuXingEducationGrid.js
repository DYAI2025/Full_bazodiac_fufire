// WuXing-Education-Grid: fünf ExplainableCards (Holz/Feuer/Erde/Metall/Wasser)
// mit Bedeutung, starker Auspraegung, Unterrepraesentation, Uebersteuerung
// und Ausgleich für heute / Woche / Gewohnheit.

import { ExplainableCard } from './ExplainableCard.js';
import { WUXING_MEANINGS } from '../domain/meanings.js';

const ORDER = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];

export function WuXingEducationGrid({ dominant = null, deficient = null } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'wuxing-education-grid';

  for (const key of ORDER) {
    const m = WUXING_MEANINGS[key];
    if (!m) continue;
    const isDominant  = (dominant === key);
    const isDeficient = (deficient === key);
    const highlight   = isDominant; // Day-Master-Badge ist Dominant-Marker
    const helperBits = [m.polarity];
    if (isDominant)  helperBits.push('aktuell dominant');
    if (isDeficient) helperBits.push('aktuell unterrepräsentiert');
    wrap.appendChild(ExplainableCard({
      domain: 'fusion',
      label: `${m.symbol || ''} ${m.label}`.trim(),
      value: m.meaning,
      helper: helperBits.join(' · '),
      highlighted: highlight,
      meaning: {
        title:    `${m.label} — ${m.polarity}`,
        subtitle: m.meaning,
        meaning:  isDominant
          ? `Bei dir aktuell dominant. ${m.strong}`
          : isDeficient
            ? `Bei dir aktuell unterrepräsentiert. ${m.weak}`
            : m.meaning,
        resource: `Stark: ${m.strong}`,
        shadow:   `Schwach/Über: ${m.weak} · ${m.over}`,
        practice: `Heute: ${m.balance.today}`,
        extras: [
          `Diese Woche: ${m.balance.week}`,
          `Gewohnheit: ${m.balance.habit}`,
        ],
      },
    }));
  }
  return wrap;
}
