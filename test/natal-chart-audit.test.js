// I3 — NatalChartAudit component tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installCaptureDom } from './_helpers/dom-capture-stub.js';

const cap = installCaptureDom();
const { NatalChartAudit } = await import('../public/src/components/NatalChartAudit.js');

function serializeFakeTree(node, out = []) {
  if (!node) return out;
  if (node.tag) {
    const attrPairs = Object.entries(node._attrs || {})
      .map(([k, v]) => `${k}="${v}"`).join(' ');
    out.push(`<${node.tag}${attrPairs ? ' ' + attrPairs : ''}>${node._text || ''}`);
  }
  for (const c of (node._children || [])) serializeFakeTree(c, out);
  return out.join('\n');
}

const WHEEL = {
  bodies: [
    { key: 'Sun',   labelDE: 'Sonne', glyph: '☉', longitude: 353.15,
      signDE: 'Fische',   degreeDisplay: "23°09'", house: 12, source: 'api' },
    { key: 'Moon',  labelDE: 'Mond',  glyph: '☽', longitude: 158.23,
      signDE: 'Jungfrau', degreeDisplay: "8°14'",  house: 6,  source: 'api' },
    { key: 'Pluto', labelDE: 'Pluto', glyph: '♇', longitude: null,
      signDE: null, degreeDisplay: null, house: null, source: 'missing' },
  ],
  angles: { asc: 27.71, mc: 280.66, dsc: 207.71, ic: 100.66, source: 'api' },
  aspects: [
    { sourceKey: 'Sun',  targetKey: 'Moon',    type: 'square', typeDE: 'Quadrat',
      tone: 'hard', orb: 4.92 },
    { sourceKey: 'Moon', targetKey: 'Neptune', type: 'trine',  typeDE: 'Trigon',
      tone: 'soft', orb: 0.42 },
  ],
};

test('NatalChartAudit: returns node with data-component="natal-chart-audit"', () => {
  cap.reset();
  const node = NatalChartAudit({ wheel: WHEEL });
  assert.ok(node, 'must return a node');
  assert.equal(node._attrs['data-component'], 'natal-chart-audit');
});

test('NatalChartAudit: emits one audit-row per body (including missing)', () => {
  cap.reset();
  const s = serializeFakeTree(NatalChartAudit({ wheel: WHEEL }));
  assert.ok(s.includes('data-audit-row="Sun"'),   'Sun audit row missing');
  assert.ok(s.includes('data-audit-row="Moon"'),  'Moon audit row missing');
  assert.ok(s.includes('data-audit-row="Pluto"'), 'Pluto audit row missing');
});

test('NatalChartAudit: missing body carries data-source="missing" and "Daten fehlen"', () => {
  cap.reset();
  const s = serializeFakeTree(NatalChartAudit({ wheel: WHEEL }));
  assert.ok(s.includes('data-source="missing"'),  'Pluto row must carry data-source="missing"');
  assert.ok(s.includes('Daten fehlen'),            'Missing rows must render "Daten fehlen" copy');
});

test('NatalChartAudit: present body shows sign, degree, house, source pill', () => {
  cap.reset();
  const s = serializeFakeTree(NatalChartAudit({ wheel: WHEEL }));
  assert.ok(s.includes('Sonne'),    'labelDE "Sonne" must render');
  assert.ok(s.includes('Fische'),   'signDE must render');
  assert.ok(s.includes("23°09'"),   'degreeDisplay must render');
  assert.ok(s.includes('Haus 12'), 'house must render');
  assert.ok(s.match(/data-source="api"/), 'api source pill must render');
});

test('NatalChartAudit: aspect legend renders hard / soft / neutral buckets', () => {
  cap.reset();
  const s = serializeFakeTree(NatalChartAudit({ wheel: WHEEL }));
  assert.ok(s.includes('data-aspect-bucket="hard"'),    'hard bucket missing');
  assert.ok(s.includes('data-aspect-bucket="soft"'),    'soft bucket missing');
  assert.ok(s.includes('data-aspect-bucket="neutral"'), 'neutral bucket missing');
});

test('NatalChartAudit: hard bucket lists aspect typeDE', () => {
  cap.reset();
  const s = serializeFakeTree(NatalChartAudit({ wheel: WHEEL }));
  assert.ok(s.includes('Quadrat'), 'aspect typeDE label must render in legend');
});

test('NatalChartAudit: tolerates entirely empty wheel', () => {
  cap.reset();
  let node;
  assert.doesNotThrow(() => {
    node = NatalChartAudit({ wheel: { bodies: [], angles: {}, aspects: [] } });
  });
  const s = serializeFakeTree(node);
  assert.ok(s.includes('Keine Daten'), 'empty wheel must render "Keine Daten" placeholder');
});
