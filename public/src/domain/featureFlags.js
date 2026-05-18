// Lightweight feature-flag layer. Overrides via window.__FUFIRE_FLAGS or
// localStorage `fufire.flags`. Pure read — no remote fetch in MVP.

export const FEATURE_FLAGS_KEY = 'fufire.flags';

export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  relationshipResonanceV1: true,
  relationshipShareCardV1: true,
});

function getDefaultStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return { getItem: () => null, setItem: () => undefined };
}

function getDefaultWindow() {
  return (typeof window !== 'undefined') ? window : {};
}

function safeParse(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

export function readFeatureFlags({ storage = getDefaultStorage(), win = getDefaultWindow() } = {}) {
  const fromStorage = safeParse(storage.getItem(FEATURE_FLAGS_KEY));
  const fromWindow  = (win && typeof win.__FUFIRE_FLAGS === 'object' && win.__FUFIRE_FLAGS) ? win.__FUFIRE_FLAGS : {};
  return { ...DEFAULT_FEATURE_FLAGS, ...fromStorage, ...fromWindow };
}

export function featureFlag(name, opts) {
  const flags = readFeatureFlags(opts);
  return Boolean(flags[name]);
}
