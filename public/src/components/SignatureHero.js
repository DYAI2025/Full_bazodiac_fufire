// public/src/components/SignatureHero.js — OV-I2-T04
//
// Composes the SignatureHero section: wheel on the left, fusion signature panel on
// the right. Wheel injection is performed by the callee (the page) which passes the
// already-rendered wheel node.
//
// renderSignatureHero(viewModel, { wheelNode }) → HTMLElement (a <section>)

import { renderFusionSignaturePanel } from './FusionSignaturePanel.js';

export function renderSignatureHero(viewModel, { wheelNode } = {}) {
  const vm = viewModel || {};
  const section = renderFusionSignaturePanel({
    signatureHero: vm.signatureHero,
    evidenceCards: vm.evidenceCards,
  });

  if (wheelNode) {
    const anchor = section.querySelector('[data-hero-slot="wheel-anchor"]');
    if (anchor) anchor.append(wheelNode);
  }

  return section;
}
