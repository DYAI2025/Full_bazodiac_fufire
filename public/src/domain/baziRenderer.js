import { SourceBadge } from '../components/SourceBadge.js';

const PILLAR_LABELS = { year: 'Jahr', month: 'Monat', day: 'Tag', hour: 'Stunde' };

// Erdzweig → Tierzeichen
const BRANCH_ANIMAL = {
  '子': { animal: 'Ratte',    romanized: 'Zǐ',  element: 'Wasser', polarity: 'Yang' },
  '丑': { animal: 'Büffel',   romanized: 'Chǒu', element: 'Erde',   polarity: 'Yin'  },
  '寅': { animal: 'Tiger',    romanized: 'Yín',  element: 'Holz',   polarity: 'Yang' },
  '卯': { animal: 'Hase',     romanized: 'Mǎo',  element: 'Holz',   polarity: 'Yin'  },
  '辰': { animal: 'Drache',   romanized: 'Chén', element: 'Erde',   polarity: 'Yang' },
  '巳': { animal: 'Schlange', romanized: 'Sì',   element: 'Feuer',  polarity: 'Yin'  },
  '午': { animal: 'Pferd',    romanized: 'Wǔ',   element: 'Feuer',  polarity: 'Yang' },
  '未': { animal: 'Ziege',    romanized: 'Wèi',  element: 'Erde',   polarity: 'Yin'  },
  '申': { animal: 'Affe',     romanized: 'Shēn', element: 'Metall', polarity: 'Yang' },
  '酉': { animal: 'Hahn',     romanized: 'Yǒu',  element: 'Metall', polarity: 'Yin'  },
  '戌': { animal: 'Hund',     romanized: 'Xū',   element: 'Erde',   polarity: 'Yang' },
  '亥': { animal: 'Schwein',  romanized: 'Hài',  element: 'Wasser', polarity: 'Yang' },
};

// Fallback: romanisiert → Tierzeichen (wenn API romanisiert statt chinesisch liefert)
const BRANCH_ANIMAL_ROMANIZED = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};

function lookupBranch(branch) {
  if (!branch) return {};
  // Try direct Chinese char lookup first
  if (BRANCH_ANIMAL[branch]) return BRANCH_ANIMAL[branch];
  // Try romanized (case-insensitive, strip tones)
  const normalized = branch.toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, c => {
    const map = {ā:'a',á:'a',ǎ:'a',à:'a',ē:'e',é:'e',ě:'e',è:'e',ī:'i',í:'i',ǐ:'i',ì:'i',ō:'o',ó:'o',ǒ:'o',ò:'o',ū:'u',ú:'u',ǔ:'u',ù:'u',ǖ:'u',ǘ:'u',ǚ:'u',ǜ:'u'};
    return map[c] || c;
  });
  const chineseChar = BRANCH_ANIMAL_ROMANIZED[normalized];
  if (chineseChar && BRANCH_ANIMAL[chineseChar]) return BRANCH_ANIMAL[chineseChar];
  return {};
}

// Himmelsstamm → Details
const STEM_INFO = {
  '甲': { romanized: 'Jiǎ',  element: 'Holz',   polarity: 'Yang', desc: 'Aufwärtsstrebend wie ein großer Baum — Pioniergeist, Direktheit, Führungswille' },
  '乙': { romanized: 'Yǐ',   element: 'Holz',   polarity: 'Yin',  desc: 'Anpassungsfähig wie rankende Pflanzen — Flexibilität, Diplomatie, stille Beharrlichkeit' },
  '丙': { romanized: 'Bǐng', element: 'Feuer',  polarity: 'Yang', desc: 'Strahlend wie die Sonne — Wärme, Sichtbarkeit, natürliche Ausstrahlung' },
  '丁': { romanized: 'Dīng', element: 'Feuer',  polarity: 'Yin',  desc: 'Fokussiert wie eine Kerze — innere Tiefe, feines Gespür, konzentrierte Kraft' },
  '戊': { romanized: 'Wù',   element: 'Erde',   polarity: 'Yang', desc: 'Massiv wie ein Berg — Stabilität, Zuverlässigkeit, geerdet und beständig' },
  '己': { romanized: 'Jǐ',   element: 'Erde',   polarity: 'Yin',  desc: 'Aufnehmend wie fruchtbare Gartenerde — Nährung, Feingefühl, praktische Klugheit' },
  '庚': { romanized: 'Gēng', element: 'Metall', polarity: 'Yang', desc: 'Scharf wie Stahl — Entschlossenheit, Klarheit, konsequente Stärke' },
  '辛': { romanized: 'Xīn', element: 'Metall',  polarity: 'Yin',  desc: 'Raffiniert wie Schmuck — Präzision, Ästhetik, verfeinerte Wahrnehmung' },
  '壬': { romanized: 'Rén',  element: 'Wasser', polarity: 'Yang', desc: 'Ausdehnend wie das Meer — Beweglichkeit, Intelligenz, große Tiefe' },
  '癸': { romanized: 'Guǐ', element: 'Wasser',  polarity: 'Yin',  desc: 'Nährend wie stiller Regen — Intuition, Empathie, verborgenem Wissen' },
};

// Verborgene Stämme: kurze Deutung
const HS_DESC = {
  '甲': 'Yang-Holz — Pioniergeist und Aufwärtsdrang',
  '乙': 'Yin-Holz — Anpassungsfähigkeit und stilles Wachstum',
  '丙': 'Yang-Feuer — Sichtbarkeit, Wärme und Ausstrahlung',
  '丁': 'Yin-Feuer — Fokus, innere Tiefe und Empfindsamkeit',
  '戊': 'Yang-Erde — Erdung, Stabilität und Verlässlichkeit',
  '己': 'Yin-Erde — Nährung, Aufnahme und Feingefühl',
  '庚': 'Yang-Metall — Entschlossenheit und klare Struktur',
  '辛': 'Yin-Metall — Verfeinerung, Klarheit und Präzision',
  '壬': 'Yang-Wasser — Weitsicht, Intelligenz und Beweglichkeit',
  '癸': 'Yin-Wasser — Intuition, Stille und verborgene Tiefe',
};

const ELEMENT_COLOR = {
  Holz:   'element--holz',
  Feuer:  'element--feuer',
  Erde:   'element--erde',
  Metall: 'element--metall',
  Wasser: 'element--wasser',
};

export function renderBaziPillars(bazi, { timeCertainty = 'exact' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bazi-pillars';

  const pillars = bazi?.pillars || {};

  ['year', 'month', 'day', 'hour'].forEach((key) => {
    const p   = pillars[key];
    const col = document.createElement('div');
    col.className = `bazi-pillar bazi-pillar--${key}`;

    // ── Pillar-Label ─────────────────────────────────────────────────────────
    const labelSpan = document.createElement('span');
    labelSpan.className = 'pillar-label';
    labelSpan.textContent = PILLAR_LABELS[key];

    // ── Fehlend / unsicher ───────────────────────────────────────────────────
    if (!p || !p.stem) {
      const emptySpan = document.createElement('span');
      emptySpan.className = 'pillar-empty';
      if (key === 'hour' && timeCertainty === 'unknown') {
        emptySpan.textContent = 'Geburtszeit unbekannt';
        col.classList.add('bazi-pillar--uncertain');
      } else {
        emptySpan.textContent = '—';
      }
      col.append(labelSpan, emptySpan);
      wrapper.appendChild(col);
      return;
    }

    // ── Himmelsstamm ─────────────────────────────────────────────────────────
    const stemInfo = STEM_INFO[p.stem] || {};
    const stemBlock = document.createElement('div');
    stemBlock.className = 'pillar-stem-block';

    const stemChar = document.createElement('span');
    stemChar.className = `pillar-stem ${ELEMENT_COLOR[stemInfo.element] || ''}`;
    stemChar.title = stemInfo.romanized ? `${stemInfo.romanized} — ${stemInfo.element} ${stemInfo.polarity}` : 'Himmelsstamm';
    stemChar.textContent = p.stem || '—';

    const stemMeta = document.createElement('span');
    stemMeta.className = 'pillar-stem-meta';
    stemMeta.textContent = stemInfo.romanized
      ? `${stemInfo.romanized} · ${stemInfo.element} ${stemInfo.polarity}`
      : (p.element || '');

    const stemDesc = document.createElement('p');
    stemDesc.className = 'pillar-stem-desc';
    stemDesc.textContent = stemInfo.desc || '';

    stemBlock.append(stemChar, stemMeta, stemDesc);

    // ── Erdzweig + Tierzeichen ────────────────────────────────────────────────
    const branchInfo = lookupBranch(p.branch);
    const branchBlock = document.createElement('div');
    branchBlock.className = 'pillar-branch-block';

    const branchChar = document.createElement('span');
    branchChar.className = `pillar-branch ${ELEMENT_COLOR[branchInfo.element] || ''}`;
    branchChar.title = branchInfo.romanized ? `${branchInfo.romanized} — ${branchInfo.animal}` : 'Erdzweig';
    branchChar.textContent = p.branch || '—';

    // ── Tierzeichen (Name, eigene Zeile) ─────────────────────────
    const animalSpan = document.createElement('span');
    animalSpan.className = 'pillar-animal';
    animalSpan.textContent = branchInfo.animal || '';

    // ── Element + Polarität des Zweigs (zweite Zeile, klein) ─────
    const animalElementSpan = document.createElement('span');
    animalElementSpan.className = `pillar-animal-element ${ELEMENT_COLOR[branchInfo.element] || ''}`;
    animalElementSpan.textContent = branchInfo.element && branchInfo.polarity
      ? `${branchInfo.element} · ${branchInfo.polarity}`
      : '';

    branchBlock.append(branchChar, animalSpan, animalElementSpan);

    // ── Verborgene Stämme (藏干) ──────────────────────────────────────────────
    const details = document.createElement('details');
    details.className = 'pillar-hidden-stems';

    const stems = p.hidden_stems || [];

    const hsBadge = stems.length
      ? (stems[0].source === 'derived_from_branch_table'
          ? SourceBadge('derived_mapping')
          : SourceBadge('api'))
      : null;

    const summary = document.createElement('summary');
    summary.className = 'hs-summary';
    const summaryText = document.createElement('span');
    summaryText.textContent = `Verborgene Stämme · ${stems.length > 0 ? stems.map(s => s.stem).join(' ') : ''}`;
    summary.appendChild(summaryText);
    if (hsBadge) summary.appendChild(hsBadge);
    details.appendChild(summary);

    const hsExpl = document.createElement('p');
    hsExpl.className = 'hs-concept-expl';
    hsExpl.textContent = 'Jeder Erdzweig trägt verborgene Himmelsstämme in sich — unsichtbare Kräfte, die erst in bestimmten Lebensabschnitten oder Beziehungen aktiviert werden. Der Hauptstamm (ca. 60–70%) prägt den Charakter am stärksten; Mittel- und Residualstamm wirken subtil, aber messbar.';
    details.appendChild(hsExpl);

    const hsList = document.createElement('div');
    hsList.className = 'hs-list';
    if (stems.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hs-empty';
      empty.textContent = 'Keine Daten verfügbar.';
      hsList.appendChild(empty);
    } else {
      stems.forEach((hs, idx) => {
        const row = document.createElement('div');
        row.className = 'hs-row';

        const stemEl = document.createElement('span');
        stemEl.className = `hs-stem ${ELEMENT_COLOR[hs.element] || ''}`;
        stemEl.textContent = hs.stem || '—';

        const infoEl = document.createElement('div');
        infoEl.className = 'hs-info';

        const label = document.createElement('span');
        label.className = 'hs-label';
        label.textContent = HS_DESC[hs.stem] || `${hs.element || ''} ${hs.polarity || ''}`;

        const weight = document.createElement('span');
        weight.className = 'hs-weight';
        const pct = hs.weight ? Math.round(hs.weight * 10) : null;
        weight.textContent = pct ? `${pct}% Einfluss` : '';

        // Hauptstamm / Mittelstamm / Restnergstamm
        const rank = idx === 0 ? 'Hauptstamm' : idx === 1 ? 'Mittelstamm' : 'Residualstamm';
        const rankEl = document.createElement('span');
        rankEl.className = 'hs-rank';
        rankEl.textContent = rank;

        infoEl.append(label, weight, rankEl);
        row.append(stemEl, infoEl);
        hsList.appendChild(row);
      });
    }

    details.appendChild(hsList);

    col.append(labelSpan, stemBlock, branchBlock, details);
    wrapper.appendChild(col);
  });

  return wrapper;
}
