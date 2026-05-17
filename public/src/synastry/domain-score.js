// public/src/synastry/domain-score.js
import { signToElement, elementPairTone } from '../data/astro-mappings.js';

function signHarmony(signA, signB) {
  if (!signA || !signB) return 0.5;
  const elA = signToElement(signA);
  const elB = signToElement(signB);
  if (!elA || !elB) return 0.5;
  return elementPairTone(elA, elB).score;
}

function houseHarmony(profileA, profileB, houseIndex) {
  const hA = profileA.western?.houses?.[houseIndex]?.sign;
  const hB = profileB.western?.houses?.[houseIndex]?.sign;
  return signHarmony(hA, hB);
}

function pillarHarmony(pillarA, pillarB) {
  if (!pillarA?.element || !pillarB?.element) return 0.5;
  return elementPairTone(pillarA.element, pillarB.element).score;
}

function avg(...values) {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return 0.5;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function toScores(harmonyScore) {
  const harmony = Math.round(harmonyScore * 100);
  const tension = Math.round((1 - harmonyScore) * 100);
  return { harmony, tension };
}

export function computeDomainScores(profileA, profileB) {
  const pA = profileA;
  const pB = profileB;

  // LOVE
  const venusTone   = signHarmony(pA.western?.bodies?.Venus?.sign, pB.western?.bodies?.Venus?.sign);
  const moonTone    = signHarmony(pA.western?.bodies?.Moon?.sign,  pB.western?.bodies?.Moon?.sign);
  const dayMasterTone = pillarHarmony(pA.bazi?.day_master, pB.bazi?.day_master);
  const h5Tone      = houseHarmony(pA, pB, 5);
  const h7Tone      = houseHarmony(pA, pB, 7);
  const loveHarmony = avg(venusTone, moonTone, dayMasterTone, h5Tone, h7Tone);

  // COMMUNICATION
  const mercuryTone   = signHarmony(pA.western?.bodies?.Mercury?.sign, pB.western?.bodies?.Mercury?.sign);
  const h3Tone        = houseHarmony(pA, pB, 3);
  const airDeltaA     = pA.wuxing?.vector?.Luft ?? pA.fusion?.wu_xing_vectors?.bazi_pillars?.Luft ?? 0;
  const airDeltaB     = pB.wuxing?.vector?.Luft ?? pB.fusion?.wu_xing_vectors?.bazi_pillars?.Luft ?? 0;
  const airComplement = Math.max(0, 1 - Math.abs(airDeltaA - airDeltaB) * 2);
  const commHarmony   = avg(mercuryTone, h3Tone, airComplement);

  // FINANCE
  const h2Tone       = houseHarmony(pA, pB, 2);
  const h8Tone       = houseHarmony(pA, pB, 8);
  const yearTone     = pillarHarmony(pA.bazi?.pillars?.year, pB.bazi?.pillars?.year);
  const earthMetalA  = (pA.wuxing?.vector?.Erde??0) + (pA.wuxing?.vector?.Metall??0);
  const earthMetalB  = (pB.wuxing?.vector?.Erde??0) + (pB.wuxing?.vector?.Metall??0);
  const earthComplement = 1 - Math.abs(earthMetalA - earthMetalB);
  const financeHarmony  = avg(h2Tone, h8Tone, yearTone, earthComplement);

  // CAREER
  const h10Tone      = houseHarmony(pA, pB, 10);
  const h6Tone       = houseHarmony(pA, pB, 6);
  const monthTone    = pillarHarmony(pA.bazi?.pillars?.month, pB.bazi?.pillars?.month);
  const cohA         = pA.fusion?.coherence_index ?? 0.5;
  const cohB         = pB.fusion?.coherence_index ?? 0.5;
  const cohAlignment = Math.max(0, 1 - Math.abs(cohA - cohB));
  const careerHarmony = avg(h10Tone, h6Tone, monthTone, cohAlignment);

  // GROWTH
  const h9Tone        = houseHarmony(pA, pB, 9);
  const hourTone      = pillarHarmony(pA.bazi?.pillars?.hour, pB.bazi?.pillars?.hour);
  const growthHarmony = avg(cohAlignment, h9Tone, hourTone);

  // FOUNDATION
  const h4Tone          = houseHarmony(pA, pB, 4);
  const h1Tone          = houseHarmony(pA, pB, 1);
  const earthA          = pA.wuxing?.vector?.Erde ?? 0;
  const earthB          = pB.wuxing?.vector?.Erde ?? 0;
  const earthAlign      = 1 - Math.abs(earthA - earthB);
  const foundationHarmony = avg(yearTone, h4Tone, h1Tone, earthAlign);

  return {
    love:          { ...toScores(loveHarmony),         sources:['Venus','Moon','DayMaster','H5','H7'] },
    communication: { ...toScores(commHarmony),         sources:['Mercury','H3','WuxingLuft'] },
    finance:       { ...toScores(financeHarmony),      sources:['H2','H8','YearPillar','WuxingErde/Metall'] },
    career:        { ...toScores(careerHarmony),       sources:['H10','H6','MonthPillar','CoherenceIndex'] },
    growth:        { ...toScores(growthHarmony),       sources:['CoherenceDelta','H9','HourPillar'] },
    foundation:    { ...toScores(foundationHarmony),   sources:['YearPillar','H4','H1','WuxingErde'] },
  };
}
