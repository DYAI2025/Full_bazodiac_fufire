// public/src/components/WuxingBar.js
// Renders a horizontal Wu-Xing element distribution bar with optional comparison overlay
import { ELEMENT_COLORS } from '../data/astro-mappings.js';

const ELEMENTS = ['Holz','Feuer','Erde','Metall','Wasser'];

/**
 * @param {object} vector     — { Holz:0.25, Feuer:0.30, ... } person A
 * @param {object} [vectorB]  — optional, person B for overlay
 * @param {string} domain     — 'love' | 'career' | 'general'
 */
export function WuxingBar(vector, vectorB = null, domain = 'general') {
  const wrap = document.createElement('div');
  wrap.className = 'wuxing-bar-wrap';
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  for (const el of ELEMENTS) {
    const valA = vector?.[el] ?? 0;
    const valB = vectorB?.[el] ?? null;
    const color = ELEMENT_COLORS[el] ?? '#888';
    const pctA = Math.round(valA * 100);
    const pctB = valB !== null ? Math.round(valB * 100) : null;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';
    row.innerHTML = `
      <span style="width:60px;font-size:0.75rem;color:${color};font-weight:600;">${el}</span>
      <div style="flex:1;position:relative;height:10px;background:#1e1e1e;border-radius:5px;overflow:visible;">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctA}%;
          background:${color};border-radius:5px;transition:width 0.6s ease;"></div>
        ${pctB !== null ? `<div style="position:absolute;left:0;top:-3px;height:16px;width:2px;
          background:${color}88;border-radius:1px;margin-left:${pctB}%;transform:translateX(-50%);"></div>` : ''}
      </div>
      <span style="width:32px;text-align:right;font-size:0.75rem;color:${color}99;">${pctA}%</span>
    `;
    wrap.appendChild(row);
  }

  if (vectorB) {
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;gap:12px;font-size:0.65rem;color:#666;margin-top:2px;';
    legend.innerHTML = `<span>── Partner A (Balken)</span><span>│ Partner B (Marker)</span>`;
    wrap.appendChild(legend);
  }

  return wrap;
}
