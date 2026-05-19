// WuXing-Education-Grid: fünf ExplainableCards (Holz/Feuer/Erde/Metall/Wasser)
// mit Was-ist-das, Bedeutung im Profil, Ressource, Schatten/Übersteuerung,
// Praxis und Ausgleich für heute / Woche / Gewohnheit + Sheng/Ke-Beziehungen
// als "Verwandte Karten".

import { ExplainableCard } from './ExplainableCard.js';
import { WUXING_MEANINGS } from '../domain/meanings.js';

const ORDER = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];

// Klassische Zyklen (生 erzeugt, 克 kontrolliert) — für "Verwandte Karten"
const SHENG_NEXT  = { Holz: 'Feuer', Feuer: 'Erde', Erde: 'Metall', Metall: 'Wasser', Wasser: 'Holz' };
const KE_NEXT     = { Holz: 'Erde',  Feuer: 'Metall', Erde: 'Wasser', Metall: 'Holz', Wasser: 'Feuer' };

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

    const origin = isDominant
      ? `Bei dir aktuell dominant. ${m.strong}`
      : isDeficient
        ? `Bei dir aktuell unterrepräsentiert. ${m.weak}`
        : `Bei dir aktuell ausgewogen. ${m.meaning}`;

    const shengNext = SHENG_NEXT[key];
    const keNext    = KE_NEXT[key];
    const related = [
      shengNext && { label: `${m.label} → erzeugt ${shengNext} (生)` },
      keNext    && { label: `${m.label} → kontrolliert ${keNext} (克)` },
    ].filter(Boolean);

    wrap.appendChild(ExplainableCard({
      domain: 'fusion',
      label: `${m.symbol || ''} ${m.label}`.trim(),
      value: m.meaning,
      helper: helperBits.join(' · '),
      highlighted: highlight,
      meaning: {
        title:    `${m.label} — ${m.polarity}`,
        subtitle: m.meaning,
        what:     m.meaning,
        meaning:  origin,
        resource: `Starke Auspraegung: ${m.strong}`,
        shadow:   `Unterrepraesentation: ${m.weak} · Übersteuerung: ${m.over}`,
        practice: `Heute: ${m.balance.today}`,
        related,
        extras: [
          `Diese Woche: ${m.balance.week}`,
          `Gewohnheit: ${m.balance.habit}`,
        ],
      },
    }));
  }
  return wrap;
}
