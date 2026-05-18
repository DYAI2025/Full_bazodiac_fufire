// Variante C — Privacy-safe Share Card.
// Enthält NIEMALS Geburtsdatum, -zeit, -ort, Rohchart oder exakte Koordinaten.
// Pure Builder produzieren ein redaktiertes Modell, das die DOM-Factory rendert.

import { RELATIONSHIP_SAFETY_CAVEAT } from '../domain/relationshipCopy.js';

export const SHARE_CARD_FORBIDDEN_KEYS = [
  'birthDate', 'birthTime', 'birthPlace',
  'rawChart', 'chart', 'positions',
  'lat', 'lon', 'longitude', 'latitude',
  'address', 'place',
];

const MAX_ALIAS_LEN   = 40;
const MAX_SUMMARY_LEN = 220;
const DEFAULT_TITLE   = 'Eure Kontakt-Resonanz';

function safeAlias(input, fallback) {
  if (typeof input !== 'string' || !input.trim()) return fallback;
  return input.trim().slice(0, MAX_ALIAS_LEN);
}

function buildSummary(analysis) {
  const sentences = (analysis?.summaryStatements || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (!sentences.length) return 'Kontaktmuster, kein Urteil.';
  // Try full join, fall back to compact join if it exceeds budget.
  let joined = sentences.join(' ');
  if (joined.length <= MAX_SUMMARY_LEN) return joined;
  // Truncate per-sentence, leave ellipsis if needed.
  const budget = Math.floor(MAX_SUMMARY_LEN / sentences.length) - 1;
  const trimmed = sentences.map((s) => (s.length > budget ? s.slice(0, budget - 1) + '…' : s)).join(' ');
  return trimmed.slice(0, MAX_SUMMARY_LEN);
}

export function shareCardModel({ analysis = null, aliasA = '', aliasB = '' } = {}) {
  const title = DEFAULT_TITLE;
  const aliases = [
    safeAlias(aliasA, 'Person A'),
    safeAlias(aliasB, 'Person B'),
  ];
  const summary = buildSummary(analysis);
  return {
    title,
    aliases,
    summary,
    resonanceBand: analysis?.resonanceBand && analysis.resonanceBand !== 'unknown' ? analysis.resonanceBand : null,
    caveat:        analysis?.safetyCaveat || RELATIONSHIP_SAFETY_CAVEAT,
    createdAt:     new Date().toISOString(),
  };
}

export function buildShareCardText(opts) {
  const m = shareCardModel(opts);
  const lines = [
    m.title,
    `${m.aliases[0]} ⟷ ${m.aliases[1]}`,
    '',
    m.summary,
    '',
    m.resonanceBand ? `Resonanz-Band: ${m.resonanceBand} (Index, kein Urteil).` : null,
    m.caveat,
  ].filter((l) => l !== null);
  return lines.join('\n');
}

export function PrivacySafeShareCard({ analysis = null, aliasA = '', aliasB = '', onCopy = null } = {}) {
  const m = shareCardModel({ analysis, aliasA, aliasB });
  const root = document.createElement('section');
  root.className = 'privacy-share-card';

  const head = document.createElement('header');
  head.className = 'privacy-share-card__head';
  const t = document.createElement('h3');
  t.className = 'privacy-share-card__title';
  t.textContent = m.title;
  head.appendChild(t);
  root.appendChild(head);

  const aliases = document.createElement('p');
  aliases.className = 'privacy-share-card__aliases';
  aliases.textContent = `${m.aliases[0]} ⟷ ${m.aliases[1]}`;
  root.appendChild(aliases);

  const sum = document.createElement('p');
  sum.className = 'privacy-share-card__summary';
  sum.textContent = m.summary;
  root.appendChild(sum);

  if (m.resonanceBand) {
    const band = document.createElement('p');
    band.className = 'privacy-share-card__band';
    band.textContent = `Resonanz-Band: ${m.resonanceBand} (Index, kein Urteil).`;
    root.appendChild(band);
  }

  const cav = document.createElement('p');
  cav.className = 'privacy-share-card__caveat';
  cav.textContent = m.caveat;
  root.appendChild(cav);

  const privacy = document.createElement('p');
  privacy.className = 'privacy-share-card__privacy-note';
  privacy.textContent = 'Diese Karte enthält keine Geburtsdaten, keine Zeit, keinen Ort und keine Rohdaten.';
  root.appendChild(privacy);

  const actions = document.createElement('div');
  actions.className = 'privacy-share-card__actions';
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'privacy-share-card__copy';
  copyBtn.textContent = 'Text kopieren';
  copyBtn.addEventListener('click', async () => {
    const text = buildShareCardText({ analysis, aliasA, aliasB });
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Kopiert ✓';
      } else {
        copyBtn.textContent = 'Kopieren nicht verfügbar';
      }
    } catch {
      copyBtn.textContent = 'Kopieren fehlgeschlagen';
    }
    if (typeof onCopy === 'function') onCopy(text);
  });
  actions.appendChild(copyBtn);
  root.appendChild(actions);

  return root;
}
