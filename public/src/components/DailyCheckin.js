// Lokaler Check-in für den Tagespuls. Speichert per Default in sessionStorage,
// erlaubt Storage-Injection für Tests. Keine Backend-Kommunikation.

export function dailyCheckinKey(isoDate) {
  return `azodiac_daily_checkin_${isoDate}`;
}

export function readCheckin(storage, isoDate) {
  try {
    return JSON.parse(storage.getItem(dailyCheckinKey(isoDate))) ?? null;
  } catch {
    return null;
  }
}

export function writeCheckin(storage, isoDate, payload) {
  storage.setItem(dailyCheckinKey(isoDate), JSON.stringify(payload));
}

const FIELDS = [
  { id: 'clarity', label: 'Klarheit', options: ['niedrig', 'mittel', 'hoch'] },
  { id: 'energy',  label: 'Energie',  options: ['ruhig', 'aktiv', 'erschöpft'] },
  { id: 'contact', label: 'Kontakt',  options: ['offen', 'zurückgezogen', 'gemischt'] },
];

function getDefaultStorage() {
  if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
  // No-op fallback so the DOM factory never throws in non-browser harnesses.
  return { getItem: () => null, setItem: () => undefined };
}

export function DailyCheckin({ isoDate, storage = getDefaultStorage() } = {}) {
  const date = isoDate || new Date().toISOString().slice(0, 10);
  const root = document.createElement('section');
  root.className = 'daily-checkin';

  const existing = readCheckin(storage, date) || {};

  const header = document.createElement('header');
  header.className = 'daily-checkin__header';
  const title = document.createElement('h3');
  title.className = 'daily-checkin__title';
  title.textContent = 'Tages-Check-in';
  const hint = document.createElement('p');
  hint.className = 'daily-checkin__hint';
  hint.textContent = 'Wo stehst du heute? Drei kurze Fragen — nur lokal gespeichert.';
  header.append(title, hint);
  root.appendChild(header);

  const form = document.createElement('div');
  form.className = 'daily-checkin__form';

  function persist() {
    const payload = {};
    for (const field of FIELDS) {
      const selected = form.querySelector(`[data-field="${field.id}"][aria-pressed="true"]`);
      if (selected) payload[field.id] = selected.dataset.value;
    }
    writeCheckin(storage, date, payload);
    saved.textContent = 'Gespeichert.';
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
      btn.dataset.value = opt;
      btn.setAttribute('aria-pressed', existing[field.id] === opt ? 'true' : 'false');
      btn.textContent = opt;
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
  saved.textContent = Object.keys(existing).length ? 'Gespeichert.' : '';
  root.appendChild(saved);

  return root;
}
