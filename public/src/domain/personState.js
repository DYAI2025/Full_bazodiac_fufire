// Lokale Persistenz für Anzeigename + Person-B-Profil + Beziehungskontext.
// Alle Werte bleiben im Browser (localStorage) — kein Backend, keine Cloud.

const KEY_ALIAS    = 'azodiac_alias';
const KEY_PERSON_B = 'azodiac_person_b';
const KEY_REL_CTX  = 'azodiac_relationship_context';

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeJSON(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export function readAlias() {
  try { return localStorage.getItem(KEY_ALIAS) || ''; } catch { return ''; }
}

export function saveAlias(alias) {
  try {
    if (!alias) localStorage.removeItem(KEY_ALIAS);
    else localStorage.setItem(KEY_ALIAS, String(alias).slice(0, 80));
    return true;
  } catch { return false; }
}

// Person-B shape: { alias, date, time, certainty, place: { display, lat, lon, tz } }
export function readPersonB() {
  const raw = readJSON(KEY_PERSON_B);
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.date || !raw.place || typeof raw.place.lat !== 'number' || typeof raw.place.lon !== 'number') return null;
  return raw;
}

export function savePersonB(personB) {
  if (personB === null) return writeJSON(KEY_PERSON_B, null);
  // Validate minimum shape — silently reject incomplete records.
  if (!personB?.date || !personB?.place || typeof personB.place.lat !== 'number' || typeof personB.place.lon !== 'number') {
    return false;
  }
  const sanitized = {
    alias: String(personB.alias || '').slice(0, 80),
    date: personB.date,
    time: personB.time || '',
    certainty: personB.certainty || 'exact',
    place: {
      display: String(personB.place.display || ''),
      lat: Number(personB.place.lat),
      lon: Number(personB.place.lon),
      tz: String(personB.place.tz || 'UTC'),
    },
  };
  return writeJSON(KEY_PERSON_B, sanitized);
}

// Relationship context: 'romantic' | 'friend' | 'work' | 'open'
const REL_CONTEXTS = ['romantic', 'friend', 'work', 'open'];
export function readRelationshipContext() {
  try {
    const v = localStorage.getItem(KEY_REL_CTX);
    return REL_CONTEXTS.includes(v) ? v : '';
  } catch { return ''; }
}

export function saveRelationshipContext(ctx) {
  try {
    if (!ctx) { localStorage.removeItem(KEY_REL_CTX); return true; }
    if (!REL_CONTEXTS.includes(ctx)) return false;
    localStorage.setItem(KEY_REL_CTX, ctx);
    return true;
  } catch { return false; }
}

export function clearAllPersonState() {
  try {
    localStorage.removeItem(KEY_ALIAS);
    localStorage.removeItem(KEY_PERSON_B);
    localStorage.removeItem(KEY_REL_CTX);
    return true;
  } catch { return false; }
}

// Validates a coordinate pair against WGS84 ranges.
// Returns { ok, error } for inline form validation.
export function validateCoordinates(lat, lon) {
  const n = (v) => Number(v);
  const la = n(lat);
  const lo = n(lon);
  if (Number.isNaN(la) || Number.isNaN(lo)) return { ok: false, error: 'Bitte Zahlen eingeben' };
  if (la < -90 || la > 90)  return { ok: false, error: 'Breitengrad muss zwischen -90 und 90 liegen' };
  if (lo < -180 || lo > 180) return { ok: false, error: 'Längengrad muss zwischen -180 und 180 liegen' };
  return { ok: true, lat: la, lon: lo };
}
