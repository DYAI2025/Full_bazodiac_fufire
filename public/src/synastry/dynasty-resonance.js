// public/src/synastry/dynasty-resonance.js
import { elementPairTone } from '../data/astro-mappings.js';

const DYNASTY_TEXTS = {
  '✨':  (elA, elB) =>
    `${elA} nährt ${elB} — eure Herkunftsenergien fließen in dieselbe Richtung. Was ihr von zuhause mitgebracht habt, ergänzt sich, anstatt zu konkurrieren.`,
  '⚡+': (elA, elB) =>
    `Beide kommt ihr aus einem ${elA}-geprägten Erbe. Das gibt euch viel gemeinsame Energie — und auch die gleichen blinden Flecken. Bewusst eingesetzt ist das eine starke Kraft.`,
  '⚡':  (elA, elB) =>
    `${elA} und ${elB} aus euren Dynastien erzeugen Spannung. Das bedeutet: ihr habt unterschiedliche Prägungen mitgebracht. Diese Differenz ist kein Fehler — sie ist euer Entwicklungsraum.`,
  '〰':  (elA, elB) =>
    `${elA} und ${elB} — eure familiären Hintergründe laufen ruhig nebeneinander. Kein starker Zug, kein starker Widerstand.`,
  '〰+': (elA, elB) =>
    `Ähnliche Dynastieenergie (${elA}/${elB}) — ihr versteht eure jeweiligen Herkunftsgeschichten oft ohne viele Worte.`,
};

export function buildDynastyResonance(profileA, profileB) {
  const yearA = profileA.bazi?.pillars?.year ?? {};
  const yearB = profileB.bazi?.pillars?.year ?? {};
  const elA = yearA.element ?? null;
  const elB = yearB.element ?? null;

  const { tone, score } = (elA && elB) ? elementPairTone(elA, elB) : { tone:'〰', score:0.5 };

  const textFn = DYNASTY_TEXTS[tone] ?? ((a,b) => `${a} trifft ${b} im Dynastieraum.`);
  const text = textFn(elA ?? '?', elB ?? '?');

  return { yearA, yearB, elA, elB, tone, score, text };
}
