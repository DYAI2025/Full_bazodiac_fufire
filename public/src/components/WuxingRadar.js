// public/src/components/WuxingRadar.js
//
// Sprint H3 — thin DOM wrapper around the pure-function buildRadarSVG()
// in domain/wuxingRadar.js. Returns a <section> with the SVG inside
// plus a legend strip below. Used by FusionPage (replaces inline
// ElementWheel) and WuxingPage (new visual anchor above the bars).

import { buildRadarSVG } from '../domain/wuxingRadar.js';

export function WuxingRadar(distribution, opts = {}) {
  const {
    size = 360,
    ariaLabel = 'WuXing Element-Rad',
    legend = true,
  } = opts;

  const wrap = document.createElement('section');
  wrap.className = 'wuxing-radar-wrap';
  wrap.setAttribute('aria-label', 'WuXing Element-Rad mit Sheng- und Ke-Zyklus');

  const svgHost = document.createElement('div');
  svgHost.className = 'wuxing-radar-svg';
  svgHost.innerHTML = buildRadarSVG(distribution, { size, ariaLabel });
  wrap.appendChild(svgHost);

  if (legend) {
    const legendEl = document.createElement('div');
    legendEl.className = 'wuxing-radar-legend';
    legendEl.innerHTML = `
      <span class="legend-item"><span class="legend-swatch legend-swatch--sheng"></span> Sheng (生) — nährt</span>
      <span class="legend-item"><span class="legend-swatch legend-swatch--ke"></span> Ke (克) — kontrolliert</span>
    `;
    wrap.appendChild(legendEl);
  }

  return wrap;
}
