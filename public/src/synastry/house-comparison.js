// public/src/synastry/house-comparison.js
import { signToElement, elementPairTone, HOUSE_TEMPLATES } from '../data/astro-mappings.js';

export const DOMAIN_HOUSES = {
  love:             [1, 4, 5, 7, 8],
  'career-finance': [2, 6, 8, 10],
  personality:      [1, 3, 9, 11, 12],
  synastry:         [1,2,3,4,5,6,7,8,9,10,11,12],
};

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function buildHouseComparisons(profileA, profileB, houseList) {
  return houseList.map(houseIndex => {
    const signA = profileA.western?.houses?.[houseIndex]?.sign ?? '?';
    const signB = profileB.western?.houses?.[houseIndex]?.sign ?? '?';
    const elemA = signToElement(signA) ?? '?';
    const elemB = signToElement(signB) ?? '?';
    const { tone, score } = elementPairTone(elemA, elemB);
    const tmpl = HOUSE_TEMPLATES[houseIndex];

    if (!tmpl) return { house: houseIndex, label:`Haus ${houseIndex}`, signA, signB, elemA, elemB, tone, text:`${signA} (${elemA}) trifft ${signB} (${elemB}).`, score };

    const vars = { signA, signB, elemA, elemB };

    let rawText;
    if (score >= 0.70)      rawText = tmpl.harmonizing;
    else if (score <= 0.45) rawText = tmpl.tension;
    else                    rawText = tmpl.neutral;

    return {
      house:  houseIndex,
      label:  tmpl.label,
      signA,  signB,
      elemA,  elemB,
      tone,   score,
      text:   interpolate(rawText, vars),
    };
  });
}
