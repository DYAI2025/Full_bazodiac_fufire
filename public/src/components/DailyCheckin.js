// Tages-Check-in. Schreibt alle Einträge in EINEN localStorage-Eintrag
// `fufire.dailyCheckins` als Record<dateIso, Entry>, damit TodayNewCard
// und Verlaufslogik morgen darauf zugreifen können.
//
// Storage ist injectable, damit Tests ohne window.localStorage laufen.

export const DAILY_CHECKINS_KEY = 'fufire.dailyCheckins';

function getDefaultStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return { getItem: () => null, setItem: () => undefined };
}

export function readAllCheckins(storage = getDefaultStorage()) {
  try {
    const raw = storage.getItem(DAILY_CHECKINS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

export function readDailyCheckin(storage, isoDate) {
  const all = readAllCheckins(storage);
  return all[isoDate] || null;
}

export function writeDailyCheckin(storage, isoDate, partial) {
  const all = readAllCheckins(storage);
  const prev = all[isoDate] || {};
  const merged = { ...prev, ...partial, createdAt: prev.createdAt || new Date().toISOString() };
  all[isoDate] = merged;
  storage.setItem(DAILY_CHECKINS_KEY, JSON.stringify(all));
  return merged;
}

const FIELDS = [
  { id: 'clarity', label: 'Klarheit', options: [
      { value: 'niedrig', label: 'niedrig' },
      { value: 'mittel',  label: 'mittel'  },
      { value: 'hoch',    label: 'hoch'    },
    ] },
  { id: 'energy', label: 'Energie', options: [
      { value: 'ruhig',     label: 'ruhig' },
      { value: 'aktiv',     label: 'aktiv' },
      { value: 'erschoepft',label: 'erschöpft' },
    ] },
  { id: 'contact', label: 'Kontakt', options: [
      { value: 'offen',          label: 'offen' },
      { value: 'zurueckgezogen', label: 'zurückgezogen' },
      { value: 'gemischt',       label: 'gemischt' },
    ] },
];

function isComplete(entry) {
  return !!(entry && entry.clarity && entry.energy && entry.contact);
}

export function DailyCheckin({ isoDate, storage = getDefaultStorage(), onComplete = null } = {}) {
  const date = isoDate || new Date().toISOString().slice(0, 10);
  const root = document.createElement('section');
  root.className = 'daily-checkin';

  const existing = readDailyCheckin(storage, date) || {};

  const header = document.createElement('header');
  header.className = 'daily-checkin__header';
  const title = document.createElement('h3');
  title.className = 'daily-checkin__title';
  title.textContent = 'Tages-Check-in';
  const hint = document.createElement('p');
  hint.className = 'daily-checkin__hint';
  hint.textContent = 'Wo stehst du heute? Drei kurze Fragen — nur lokal gespeichert. Dein Check-in verändert nicht deinen Geburtskern.';
  header.append(title, hint);
  root.appendChild(header);

  const form = document.createElement('div');
  form.className = 'daily-checkin__form';

  function currentSelection() {
    const payload = {};
    for (const field of FIELDS) {
      const selected = form.querySelector(`[data-field="${field.id}"][aria-pressed="true"]`);
      if (selected) payload[field.id] = selected.dataset.value;
    }
    return payload;
  }

  function persist() {
    const sel = currentSelection();
    const merged = writeDailyCheckin(storage, date, sel);
    saved.textContent = 'Gespeichert.';
    if (isComplete(merged) && typeof onComplete === 'function') onComplete(merged);
  }

  for (const field of FIELDS) {
    const row = document.createElement('div');
    row.className = 'daily-checkin__row';
    const lab = document.createElement('span');
    lab.className = 'daily-checkin__label';
    lab.textContent = field.label;
    row.appendChild(lab);

    const group = document.createElement('div');
    group.className = 'daily-checkin__options';
    for (const opt of field.options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'daily-checkin__option';
      btn.dataset.field = field.id;
      btn.dataset.value = opt.value;
      btn.setAttribute('aria-pressed', existing[field.id] === opt.value ? 'true' : 'false');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        persist();
      });
      group.appendChild(btn);
    }
    row.appendChild(group);
    form.appendChild(row);
  }
  root.appendChild(form);

  const saved = document.createElement('p');
  saved.className = 'daily-checkin__saved';
  saved.textContent = isComplete(existing) ? 'Gespeichert.' : '';
  root.appendChild(saved);

  return root;
}
