// Single source of truth for the /daily page. Pure functions, no DOM.
// Consumed by DailyPage and its sub-components.

import { buildExperienceProfile, buildCoreIdentity } from './experienceCopy.js';
import { pickDailyExperiment } from './experimentEngine.js';

const HOUSE_LABELS = {
  1:  'Identität',           2:  'Ressourcen',
  3:  'Kommunikation',       4:  'Familie & Innenraum',
  5:  'Kreativität',         6:  'Alltag & Gesundheit',
  7:  'Partnerschaft',       8:  'Transformation',
  9:  'Sinn & Weite',        10: 'Sichtbarkeit & Arbeit',
  11: 'Gemeinschaft',        12: 'Rückzug',
};

const ELEMENT_LABELS_NUTZER = {
  Holz:   'Wachstum',
  Feuer:  'Ausdruck',
  Erde:   'Halten',
  Metall: 'Entscheiden',
  Wasser: 'Reflexion',
};

export function getCoherenceBand(score) {
  if (score === null || score === undefined) return 'unknown';
  const n = Number(score);
  if (!Number.isFinite(n)) return 'unknown';
  if (n < 40)  return 'low';
  if (n < 70)  return 'medium';
  if (n < 90)  return 'high';
  return 'very-high';
}

function formatDateLabel(date) {
  try {
    return new Date(date + 'T12:00:00Z').toLocaleDateString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return date || '';
  }
}

function activeHousesFromTransits(transits) {
  const sectors = transits?.today?.sector_intensity || [];
  return sectors
    .map((intensity, i) => ({ house: i + 1, label: HOUSE_LABELS[i + 1] || `Haus ${i + 1}`, intensity }))
    .filter((h) => h.intensity > 0.2)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 3);
}

function buildTodayNew(activeHouses, dominantElement, history) {
  const yesterday = history?.yesterday;
  if (!yesterday) {
    return {
      title: 'Heute im Fokus',
      isFirstDay: true,
      points: ['Dies ist dein erster gespeicherter Tagespuls. Ab morgen zeigen wir dir, was sich verändert hat.'],
    };
  }
  const points = [];
  const todayHouseSet = new Set(activeHouses.map((h) => h.house));
  const yHouses = new Set(yesterday.activeHouses || []);
  const newlyActive = [...todayHouseSet].filter((h) => !yHouses.has(h));
  const fadedHouses = [...yHouses].filter((h) => !todayHouseSet.has(h));
  if (newlyActive.length) points.push(`Neu aktiv: ${newlyActive.map((h) => HOUSE_LABELS[h] || `Haus ${h}`).join(', ')}.`);
  if (fadedHouses.length) points.push(`Ruhiger als gestern: ${fadedHouses.map((h) => HOUSE_LABELS[h] || `Haus ${h}`).join(', ')}.`);
  if (dominantElement && yesterday.dominantElement && dominantElement !== yesterday.dominantElement) {
    points.push(`Element-Achse wechselt von ${yesterday.dominantElement} zu ${dominantElement}.`);
  }
  if (!points.length) points.push('Heute trägt dieselbe Grundströmung wie gestern weiter.');
  return { title: 'Heute neu', isFirstDay: false, points: points.slice(0, 3) };
}

function buildWesternTheme(activeHouses) {
  if (!activeHouses.length) {
    return {
      theme: 'Ruhiger Tagespuls',
      activeHouses: [],
      chance: 'Heute kein dominantes Feld — guter Tag, um Innenraum zu pflegen.',
      caution: 'Ungerichtete Energie kann sich verzetteln.',
      microImpulse: 'Wähle eine kleine Sache und erledige sie heute fertig.',
    };
  }
  const primary = activeHouses[0];
  const secondary = activeHouses[1];
  const themeText = secondary
    ? `${primary.label} und ${secondary.label} aktiv`
    : `${primary.label} aktiv`;
  return {
    theme: themeText,
    activeHouses,
    chance: `Dein ${primary.label}-Feld trägt heute besonders.`,
    caution: 'Vermeide es, mehrere Felder gleichzeitig zu bedienen — eines zur Zeit.',
    microImpulse: `Bring heute eine konkrete Sache in das Thema ${primary.label}.`,
  };
}

function buildBaziImpulse(profile) {
  const dm = profile?.bazi?.day_master;
  if (!dm?.stem) {
    return {
      dayMaster: '—',
      coreEnergyLabel: 'Kernenergie nicht verfügbar',
      dailyRelation: 'Ohne Day Master kein Tages-Bezug; nutze westliche Aktivierung als Leitfaden.',
      resourceHint: 'Beobachte heute, welche Aktivität dich nährt.',
      riskHint: 'Vermeide, dich aus reiner Gewohnheit zu verausgaben.',
    };
  }
  const label = `${dm.stem} ${dm.element || ''}`.trim();
  return {
    dayMaster: label,
    coreEnergyLabel: `${dm.element || 'Element'} als Kernenergie`,
    dailyRelation: `Heute trifft die Tagesenergie auf deinen Day Master ${label}.`,
    resourceHint: `${ELEMENT_LABELS_NUTZER[dm.element] || 'Halten'} kann dich heute stützen.`,
    riskHint: 'Du könntest zu viel aufnehmen, bevor du sortierst — nimm nur eine Ressource aktiv in die Hand.',
  };
}

function buildFusionSynthesis(exp, activeHouses) {
  const dom = exp?.fusion?.dominantElement;
  const def = exp?.fusion?.deficientElement;
  const houseLabel = activeHouses[0]?.label || 'Tagesthema';
  if (!dom || !def) {
    return {
      synthesis: 'Beide Systeme tragen heute eine ausgeglichene Verteilung.',
      tension: 'Keine einzelne Spannung dominiert.',
      balancingAction: 'Nutze den Tag, um zu beobachten, was sich von selbst zeigt.',
    };
  }
  return {
    synthesis: `Westlich aktiviert ${houseLabel}, BaZi betont ${dom}-Modus.`,
    tension: `Spannung zwischen ${dom} (stark) und ${def} (schwach).`,
    balancingAction: `Bring heute bewusst eine ${def}-Qualität ein, statt nur ${dom}-Strategien laufen zu lassen.`,
  };
}

// Experiment-Auswahl liegt in experimentEngine.js (≥8 Regelpfade + Default).
// dailyCompanion delegiert hier nur den Aufruf.

function getTomorrowIsoDate(dateIso) {
  if (!dateIso) return null;
  const base = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString().slice(0, 10);
}

function pickTomorrowTimelineDay(transits, dateIso) {
  const days = transits?.timeline?.days || [];
  const tomorrowIso = getTomorrowIsoDate(dateIso);
  if (tomorrowIso) {
    const matchingDay = days.find((day) => {
      const dayIso = day?.dateIso || day?.date || null;
      return dayIso === tomorrowIso;
    });
    if (matchingDay) return matchingDay;
  }
  return days[0];
}

function buildTomorrowTeaser(transits, dateIso) {
  const next = pickTomorrowTimelineDay(transits, dateIso);
  if (!next) {
    return {
      teaser: 'Morgen zeigen wir dir, was sich gegenüber heute verändert hat.',
      linkLabel: 'Zur Wochenvorschau',
      href: '/transits',
    };
  }
  const sectors = next.sector_intensity || [];
  const peakIdx = sectors.indexOf(Math.max(...sectors));
  const peakHouse = peakIdx >= 0 ? HOUSE_LABELS[peakIdx + 1] : null;
  return {
    teaser: peakHouse
      ? `Morgen aktiviert sich besonders das ${peakHouse}-Feld. Prüfe, ob eine Entscheidung leichter fällt als heute.`
      : 'Morgen schaltet sich der Tagespuls weiter — sieh selbst in der Wochenvorschau.',
    linkLabel: 'Zur Wochenvorschau',
    href: '/transits',
  };
}

export function buildDailyCompanionViewModel({ profile = null, transits = null, date, history = null } = {}) {
  const exp        = profile ? buildExperienceProfile(profile) : { western: {}, bazi: { dayMaster: {} }, fusion: {} };
  const identity   = buildCoreIdentity(exp);
  const score      = exp?.fusion?.coherence;
  const activeHouses = activeHousesFromTransits(transits);
  const todayNew   = buildTodayNew(activeHouses, exp?.fusion?.dominantElement, history);
  const western    = buildWesternTheme(activeHouses);
  const bazi       = buildBaziImpulse(profile);
  const fusion     = buildFusionSynthesis(exp, activeHouses);
  const experiment = pickDailyExperiment({ activeHouses, exp });
  const tomorrow   = buildTomorrowTeaser(transits, date);

  return {
    date,
    dateLabel: formatDateLabel(date),
    signature: {
      dayMasterLabel:  identity.dayMaster,
      sunSignLabel:    identity.sun,
      coherenceScore:  (score == null) ? null : score,
      coherenceBand:   getCoherenceBand(score),
    },
    todayNew,
    western,
    bazi,
    fusion,
    experiment,
    tomorrow,
  };
}
