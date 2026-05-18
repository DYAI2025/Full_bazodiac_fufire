// Backwards-compatible alias for SourcePill. Existing callers keep working,
// but the rendered DOM now carries Nutzer-Labels ("Berechnet", "Fusioniert",
// "Gedeutet" …) instead of internal keys ("API", "Aggregiert", "KI-Text").
// See SourcePill.js for the canonical implementation.
export { SourcePill as SourceBadge } from './SourcePill.js';
