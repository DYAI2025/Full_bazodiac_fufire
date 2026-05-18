// Pillen-Leiste, die auf signatur-bewussten Pages immer sichtbar ist.

export function persistentSignatureBarModel({
  dayMaster = '',
  sun = '',
  coherence = null,
  todayActive = '',
} = {}) {
  const items = [];
  if (dayMaster)   items.push({ label: 'Kern',        value: String(dayMaster) });
  if (sun)         items.push({ label: 'Sonne',       value: String(sun) });
  if (coherence !== null && coherence !== undefined && coherence !== '') {
    items.push({ label: 'Kohärenz', value: String(coherence) });
  }
  if (todayActive) items.push({ label: 'Heute aktiv', value: String(todayActive) });
  return { items };
}

export function PersistentSignatureBar(opts = {}) {
  const m = persistentSignatureBarModel(opts);
  const root = document.createElement('aside');
  root.className = 'sig-bar';
  root.setAttribute('role', 'complementary');
  root.setAttribute('aria-label', 'Persönliche Signatur');

  for (const item of m.items) {
    const pill = document.createElement('span');
    pill.className = 'sig-bar__pill';
    const lab = document.createElement('span');
    lab.className = 'sig-bar__label';
    lab.textContent = item.label;
    const val = document.createElement('span');
    val.className = 'sig-bar__value';
    val.textContent = item.value;
    pill.appendChild(lab);
    pill.appendChild(val);
    root.appendChild(pill);
  }
  return root;
}
