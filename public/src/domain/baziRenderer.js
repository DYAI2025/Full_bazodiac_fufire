import { SourceBadge } from '../components/SourceBadge.js';

const PILLAR_LABELS = { year: 'Jahr', month: 'Monat', day: 'Tag', hour: 'Stunde' };

export function renderBaziPillars(bazi, { timeCertainty = 'exact' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bazi-pillars';

  const pillars = bazi?.pillars || {};

  ['year', 'month', 'day', 'hour'].forEach((key) => {
    const p   = pillars[key];
    const col = document.createElement('div');
    col.className = `bazi-pillar bazi-pillar--${key}`;

    if (!p || !p.stem) {
      const labelSpan = document.createElement('span');
      labelSpan.className = 'pillar-label';
      labelSpan.textContent = PILLAR_LABELS[key];

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

    const hsBadge = p.hidden_stems?.length
      ? p.hidden_stems[0].source === 'derived_from_branch_table'
        ? SourceBadge('derived_mapping')
        : SourceBadge('api')
      : null;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pillar-label';
    labelSpan.textContent = PILLAR_LABELS[key];
    if (hsBadge) labelSpan.appendChild(hsBadge);

    const stemSpan = document.createElement('span');
    stemSpan.className = 'pillar-stem';
    stemSpan.title = 'Himmelsstamm';
    stemSpan.textContent = p.stem || '—';

    const branchSpan = document.createElement('span');
    branchSpan.className = 'pillar-branch';
    branchSpan.title = 'Erdzweig';
    branchSpan.textContent = p.branch || '—';

    const elementSpan = document.createElement('span');
    elementSpan.className = 'pillar-element';
    elementSpan.textContent = p.element || '';

    const details = document.createElement('details');
    details.className = 'pillar-hidden-stems';

    const summary = document.createElement('summary');
    summary.textContent = '藏干 Verborgene Stämme';
    details.appendChild(summary);

    const hsList = document.createElement('div');
    hsList.className = 'hs-list';
    (p.hidden_stems || []).forEach((hs) => {
      const row = document.createElement('div');
      row.className = 'hs-row';

      const stemEl   = document.createElement('span'); stemEl.className = 'hs-stem';    stemEl.textContent   = hs.stem;
      const elEl     = document.createElement('span'); elEl.className   = 'hs-el';     elEl.textContent     = hs.element;
      const polEl    = document.createElement('span'); polEl.className  = 'hs-pol';    polEl.textContent    = hs.polarity;
      const weightEl = document.createElement('span'); weightEl.className = 'hs-weight'; weightEl.textContent = hs.weight;

      row.append(stemEl, elEl, polEl, weightEl);
      hsList.appendChild(row);
    });
    details.appendChild(hsList);

    col.append(labelSpan, stemSpan, branchSpan, elementSpan, details);
    wrapper.appendChild(col);
  });

  return wrapper;
}
