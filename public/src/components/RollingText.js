// public/src/components/RollingText.js
// TASK-008: Entry-only split-flap animation component.
// Vanilla ESM — no React, no innerHTML, no new runtime deps.
// Works statically in Node (capture-DOM stub) — no RAF/IntersectionObserver required.

const DEFAULT_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ·0123456789';

const SCRAMBLE_DURATION_MS = 380;

function prefersReducedMotion() {
  if (typeof matchMedia !== 'function') return false;
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function scheduleScramble(el, charPool) {
  if (typeof requestAnimationFrame !== 'function') return;
  if (typeof performance === 'undefined' || typeof performance.now !== 'function') return;
  const perf = performance;

  const spans = el.querySelectorAll('[data-roll-char]');
  for (const span of spans) {
    const finalChar = span.dataset?.rollFinal;
    if (finalChar === undefined) continue;
    const delay = Number(span.dataset?.rollDelay) || 0;
    const startTime = perf.now();

    function tick(ts) {
      const elapsed = ts - startTime;
      if (elapsed < delay) {
        span.textContent = charPool[Math.floor(Math.random() * charPool.length)];
        requestAnimationFrame(tick);
        return;
      }
      const progress = (elapsed - delay) / SCRAMBLE_DURATION_MS;
      if (progress < 1) {
        span.textContent = charPool[Math.floor(Math.random() * charPool.length)];
        requestAnimationFrame(tick);
      } else {
        span.textContent = finalChar === ' ' ? ' ' : finalChar;
      }
    }
    requestAnimationFrame(tick);
  }
}

export function RollingText({
  text = '',
  tagName = 'span',
  className = '',
  variant = 'inherit',
  mode = 'entry',
  baseDelay = 120,
  perChar = 34,
  charPool = DEFAULT_POOL,
} = {}) {
  const el = document.createElement(tagName);
  el.classList.add('rolling-text');
  if (className) {
    for (const c of className.split(/\s+/)) if (c) el.classList.add(c);
  }
  el.setAttribute('aria-label', text);

  const reduced = prefersReducedMotion();

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const span = document.createElement('span');
    span.setAttribute('data-roll-char', '');
    span.setAttribute('aria-hidden', 'true');
    // In reduced-motion or no-RAF (Node) env: show final char immediately.
    // Browser with RAF: scramble loop driven by requestAnimationFrame updates textContent.
    span.textContent = char === ' ' ? ' ' : char;

    if (!reduced && typeof requestAnimationFrame === 'function') {
      span.dataset.rollFinal = char === ' ' ? ' ' : char;
      span.dataset.rollDelay = String(baseDelay + i * perChar);
    }

    el.appendChild(span);
  }

  if (!reduced) scheduleScramble(el, charPool);

  return el;
}

export function decorateRollingText(root, {
  selector = '[data-roll-text]',
  maxChars = 90,
  charPool = DEFAULT_POOL,
} = {}) {
  const nodes = root.querySelectorAll(selector);
  for (const node of nodes) {
    const originalText = (node.textContent || '').trim();
    if (originalText.length > maxChars) continue;

    node.classList.add('rolling-text');
    node.setAttribute('aria-label', originalText);
    // Clear existing text content. In real DOM, textContent = '' removes ALL
    // child nodes including nested elements (icons, tooltips). Only decorate
    // elements whose entire content is plain text — no nested markup.
    node.textContent = '';

    const reduced = prefersReducedMotion();
    for (const char of originalText) {
      const span = document.createElement('span');
      span.setAttribute('data-roll-char', '');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = char === ' ' ? ' ' : char;
      if (!reduced && typeof requestAnimationFrame === 'function') {
        span.dataset.rollFinal = char === ' ' ? ' ' : char;
      }
      node.appendChild(span);
    }
    if (!reduced) scheduleScramble(node, charPool);
  }
}
