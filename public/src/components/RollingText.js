// public/src/components/RollingText.js
// I2: Real scramble engine on top of TASK-008 entry-only split-flap.
// Vanilla ESM — no React, no innerHTML, no new runtime deps.
// Works statically in Node (capture-DOM stub) — RAF/cancelAnimationFrame optional.

const DEFAULT_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ·0123456789';
const PER_CHAR_DURATION_CAP_MS = 600; // hard ceiling per char before snap

function prefersReducedMotion() {
  if (typeof matchMedia !== 'function') return false;
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function hasRaf() {
  return typeof requestAnimationFrame === 'function';
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function pickPoolChar(pool, finalChar) {
  if (!pool || pool.length === 0) return finalChar;
  const i = Math.floor(Math.random() * pool.length);
  const c = pool[i];
  return c === finalChar && pool.length > 1 ? pool[(i + 1) % pool.length] : c;
}

/**
 * Build the rolling-text element.
 * Returns the element augmented with `startRolling()` and `stopRolling()`.
 */
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
  const animatable = !reduced && hasRaf();

  const charSpans = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const span = document.createElement('span');
    span.setAttribute('data-roll-char', '');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = char === ' ' ? ' ' : char;

    if (animatable) {
      span.dataset.rollFinal = char === ' ' ? ' ' : char;
      span.dataset.rollDelay = String(baseDelay + i * perChar);
    }

    el.appendChild(span);
    charSpans.push({ span, finalChar: char, delay: baseDelay + i * perChar });
  }

  let rafId = 0;
  let started = false;
  let completed = false;

  function settleAll() {
    for (const entry of charSpans) {
      entry.span.textContent = entry.finalChar === ' ' ? ' ' : entry.finalChar;
      entry.done = true;
    }
    completed = true;
    el.classList.remove('rolling-text--rolling');
    el.classList.add('rolling-text--settled');
  }

  function startRolling() {
    if (started || completed) return;
    if (!animatable) { settleAll(); started = true; return; }
    if (charSpans.length === 0) { completed = true; return; }

    started = true;
    el.classList.add('rolling-text--rolling');

    const startedAt = now();

    function tick(t) {
      // I6-fix: self-cancel when element is detached from DOM (router unmount).
      if (el.isConnected === false) {
        rafId = 0;
        el.classList.remove('rolling-text--rolling');
        return;
      }
      let allDone = true;
      for (const entry of charSpans) {
        if (entry.done) continue;
        const elapsed = t - startedAt;
        if (elapsed < entry.delay) { allDone = false; continue; }
        const localElapsed = elapsed - entry.delay;
        if (localElapsed >= PER_CHAR_DURATION_CAP_MS) {
          entry.span.textContent = entry.finalChar === ' ' ? ' ' : entry.finalChar;
          entry.done = true;
          continue;
        }
        entry.span.textContent = pickPoolChar(charPool, entry.finalChar);
        allDone = false;
      }

      if (allDone) {
        rafId = 0;
        completed = true;
        el.classList.remove('rolling-text--rolling');
        el.classList.add('rolling-text--settled');
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  }

  function stopRolling() {
    if (rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
    }
    rafId = 0;
    settleAll();
  }

  el.startRolling = startRolling;
  el.stopRolling = stopRolling;

  return el;
}

/**
 * Wire a page hero h1 (marked with `data-page-title`) as a RollingText.
 * Idempotent: returns null if no marker found, so callers don't need a guard.
 * Returns a `cleanup` callback that stops the RAF loop — call on page unmount.
 *
 * Replaces the marker element with a RollingText node that:
 *   - inherits all original classNames
 *   - keeps the `data-page-title` attribute (so re-wires are still findable)
 *   - sets `data-rolling-text="hero"` for Playwright/test anchors
 *   - uses the marker's textContent as hero text (fallback if empty)
 *
 * Used by every subpage to avoid duplicating the ~13-line wiring block.
 *
 * @param {Element} root — the page root element (app or main)
 * @param {string}  [fallbackText] — used if marker's textContent is empty
 * @returns {(() => void) | null}
 */
export function wireHeroRolling(root, fallbackText = '') {
  if (!root || typeof root.querySelector !== 'function') return null;
  const marker = root.querySelector('[data-page-title]');
  if (!marker) return null;

  const text      = (marker.textContent || '').trim() || fallbackText;
  const className = marker.getAttribute('class') || '';
  const tagName   = (marker.tagName || 'h1').toLowerCase();

  const roll = RollingText({ text, tagName, className });
  roll.setAttribute('data-rolling-text', 'hero');
  roll.setAttribute('data-page-title', '');
  marker.replaceWith(roll);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => roll.startRolling?.());
  } else {
    roll.startRolling?.();
  }

  return () => roll.stopRolling?.();
}

/**
 * Decorate existing nodes matching `selector`. Adds `startRolling()` to each
 * decorated node and returns the list so callers can mount/start in bulk.
 */
export function decorateRollingText(root, {
  selector = '[data-roll-text]',
  maxChars = 90,
  autoStart = true,
} = {}) {
  const decorated = [];
  const nodes = root.querySelectorAll(selector);
  for (const node of nodes) {
    const originalText = (node.textContent || '').trim();
    if (originalText.length > maxChars) continue;

    node.classList.add('rolling-text');
    node.setAttribute('aria-label', originalText);
    node.textContent = '';

    const reduced = prefersReducedMotion();
    const animatable = !reduced && hasRaf();
    const charSpans = [];

    for (let i = 0; i < originalText.length; i++) {
      const char = originalText[i];
      const span = document.createElement('span');
      span.setAttribute('data-roll-char', '');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = char === ' ' ? ' ' : char;
      if (animatable) {
        span.dataset.rollFinal = char === ' ' ? ' ' : char;
      }
      node.appendChild(span);
      charSpans.push({ span, finalChar: char, delay: 120 + i * 34 });
    }

    let rafId = 0;
    let started = false;
    let completed = false;

    node.startRolling = function startRolling() {
      if (started || completed) return;
      if (!animatable || charSpans.length === 0) {
        for (const entry of charSpans) {
          entry.span.textContent = entry.finalChar === ' ' ? ' ' : entry.finalChar;
        }
        completed = true;
        started = true;
        return;
      }
      started = true;
      node.classList.add('rolling-text--rolling');
      const startedAt = now();

      function tick(t) {
        // I6-fix: self-cancel when element is detached from DOM (router unmount).
        if (node.isConnected === false) {
          rafId = 0;
          node.classList.remove('rolling-text--rolling');
          return;
        }
        let allDone = true;
        for (const entry of charSpans) {
          if (entry.done) continue;
          const elapsed = t - startedAt;
          if (elapsed < entry.delay) { allDone = false; continue; }
          const localElapsed = elapsed - entry.delay;
          if (localElapsed >= PER_CHAR_DURATION_CAP_MS) {
            entry.span.textContent = entry.finalChar === ' ' ? ' ' : entry.finalChar;
            entry.done = true;
            continue;
          }
          entry.span.textContent = pickPoolChar(DEFAULT_POOL, entry.finalChar);
          allDone = false;
        }
        if (allDone) {
          rafId = 0;
          completed = true;
          node.classList.remove('rolling-text--rolling');
          node.classList.add('rolling-text--settled');
          return;
        }
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    };

    decorated.push(node);
    if (autoStart) node.startRolling();
  }
  return decorated;
}
