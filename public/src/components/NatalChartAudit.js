// public/src/components/NatalChartAudit.js
//
// I3 — Data-audit panel rendered beneath the NatalChartWheel.
//
// Every canonical body gets a row, including source='missing' ones that the
// wheel skips. Every aspect lands in its hard/soft/neutral bucket. Each row
// carries a provenance pill (api | derived | missing) so the user and PO
// can verify data completeness without touching dev tools.
//
// Pure factory — no state, no side-effects beyond DOM construction.

const SOURCE_LABEL = {
  api:     'Quelle: API',
  derived: 'abgeleitet',
  missing: 'fehlt',
};

const BUCKET_LABEL = {
  hard:    'Spannungsaspekte',
  soft:    'Harmonische Aspekte',
  neutral: 'Neutrale Aspekte',
};

const BUCKET_DESC = {
  hard:    'Reibung, Wachstumsdruck (Quadrat, Opposition).',
  soft:    'Fluss, leichter Zugang (Trigon, Sextil).',
  neutral: 'Verdichtung ohne Vorzeichen (Konjunktion, Quinkunx).',
};

// Cross-environment element factory using HTML (not SVG namespace).
function el(tag, attrs = {}, textContent = null, children = []) {
  let node;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'class') node.className = String(v);
      else node.setAttribute(k, String(v));
    }
    if (textContent != null && textContent !== '') {
      node.textContent = String(textContent);
    }
    for (const c of children) if (c != null) node.appendChild(c);
    return node;
  }
  // Stub-fallback.
  node = {
    tag, _attrs: {}, _children: [], _text: '',
    setAttribute(k, v) { this._attrs[k] = String(v); },
    appendChild(c) { if (c != null) this._children.push(c); },
  };
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    node._attrs[k] = String(v);
  }
  if (textContent != null && textContent !== '') node._text = String(textContent);
  for (const c of children) if (c != null) node._children.push(c);
  return node;
}

function renderBodyRow(body) {
  const isMissing = body.source === 'missing';
  const row = el('li', {
    'data-audit-row': body.key,
    'data-source': body.source,
    class: `audit-row audit-row--${body.source}`,
  });

  row.appendChild(el('span', { class: 'audit-glyph', 'data-body-glyph': body.glyph || '·' },
    body.glyph || '·'));
  row.appendChild(el('span', { class: 'audit-name' }, body.labelDE || body.key));

  if (isMissing) {
    row.appendChild(el('span', { class: 'audit-missing' }, 'Daten fehlen'));
  } else {
    row.appendChild(el('span', { class: 'audit-sign' }, body.signDE || '—'));
    row.appendChild(el('span', { class: 'audit-degree' }, body.degreeDisplay || '—'));
    row.appendChild(el('span', { class: 'audit-house' },
      body.house != null ? `Haus ${body.house}` : '—'));
  }

  row.appendChild(el('span', {
    class: `audit-source-pill audit-source-pill--${body.source}`,
    'data-source-pill': body.source,
  }, SOURCE_LABEL[body.source] || body.source));

  return row;
}

function renderBucket(bucket, aspects) {
  const wrap = el('div', {
    class: `audit-bucket audit-bucket--${bucket}`,
    'data-aspect-bucket': bucket,
  });
  wrap.appendChild(el('h4', { class: 'audit-bucket-title' }, BUCKET_LABEL[bucket] || bucket));
  wrap.appendChild(el('p',  { class: 'audit-bucket-desc'  }, BUCKET_DESC[bucket]  || ''));
  const list = el('ul', { class: 'audit-bucket-list' });
  if (!aspects.length) {
    list.appendChild(el('li', { class: 'audit-bucket-empty' }, '—'));
  } else {
    for (const a of aspects) {
      list.appendChild(el('li', {
        class: 'audit-aspect',
        'data-aspect-row': `${a.sourceKey}-${a.type}-${a.targetKey}`,
      }, `${a.sourceKey} ${a.typeDE || a.type} ${a.targetKey}` +
         (typeof a.orb === 'number' ? ` (Orb ${a.orb.toFixed(2)}°)` : '')));
    }
  }
  wrap.appendChild(list);
  return wrap;
}

export function NatalChartAudit({ wheel }) {
  const w = wheel || { bodies: [], angles: {}, aspects: [] };
  const root = el('section', {
    'data-component': 'natal-chart-audit',
    class: 'natal-chart-audit',
    'aria-label': 'Geburtsrad Daten-Audit',
  });

  root.appendChild(el('h3', { class: 'audit-section-title' }, 'Planeten & Punkte'));

  if (!w.bodies || w.bodies.length === 0) {
    root.appendChild(el('p', { class: 'audit-empty' }, 'Keine Daten.'));
    return root;
  }

  const list = el('ol', { class: 'audit-body-list' });
  for (const b of w.bodies) list.appendChild(renderBodyRow(b));
  root.appendChild(list);

  root.appendChild(el('h3', { class: 'audit-section-title' }, 'Aspekt-Legende'));

  const buckets = { hard: [], soft: [], neutral: [] };
  for (const a of (w.aspects || [])) {
    const tone = ['hard', 'soft', 'neutral'].includes(a.tone) ? a.tone : 'neutral';
    buckets[tone].push(a);
  }
  const legend = el('div', { class: 'audit-legend' });
  legend.appendChild(renderBucket('hard',    buckets.hard));
  legend.appendChild(renderBucket('soft',    buckets.soft));
  legend.appendChild(renderBucket('neutral', buckets.neutral));
  root.appendChild(legend);

  const missing = w.bodies.filter((b) => b.source === 'missing');
  if (missing.length) {
    root.appendChild(el('p', {
      class: 'audit-warning',
      'data-audit-warning': 'missing-bodies',
    }, `${missing.length} Körper ohne Daten: ${missing.map((b) => b.labelDE || b.key).join(', ')}.`));
  }

  return root;
}
