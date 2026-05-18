// Erscheint nach vollständigem Check-in. Verbindet die drei Chip-Antworten
// mit dem aktuellen Daily ViewModel und gibt einen konkreten nächsten Schritt.

const STATE_LABELS = {
  'niedrig|aktiv':        'Aktive Energie ohne klare Richtung',
  'niedrig|ruhig':        'Stiller Modus mit leiser Unsicherheit',
  'niedrig|erschoepft':   'Erschöpfung mit wenig Klarheit',
  'mittel|aktiv':         'Beweglich, aber noch sortierend',
  'mittel|ruhig':         'Balanciert und beobachtend',
  'mittel|erschoepft':    'Mittlere Klarheit, niedrige Energie',
  'hoch|aktiv':           'Klare, gerichtete Energie',
  'hoch|ruhig':           'Klar und ruhig — guter Reflexionsstand',
  'hoch|erschoepft':      'Klar, aber leer — Pause als Ressource',
};

const CONTACT_NOTE = {
  offen:           'mit offener Kontaktbereitschaft',
  zurueckgezogen:  'mit Bedürfnis nach Rückzug',
  gemischt:        'mit gemischter Kontakthaltung',
};

function isComplete(entry) {
  return !!(entry && entry.clarity && entry.energy && entry.contact);
}

export function checkInResultModel({ entry, vm }) {
  if (!isComplete(entry)) return null;
  const stateKey = `${entry.clarity}|${entry.energy}`;
  const baseLabel = STATE_LABELS[stateKey] || 'Heutige Mischung aus Klarheit und Energie';
  const stateLabel = `${baseLabel}, ${CONTACT_NOTE[entry.contact] || 'unklarer Kontaktstil'}.`;

  const houseLabel = vm?.western?.activeHouses?.[0]?.label;
  const dm         = vm?.signature?.dayMasterLabel;
  const reason     = vm?.experiment?.sourceReason;

  const interpretation = houseLabel
    ? `Dein Tagespuls aktiviert ${houseLabel}, ${reason || 'die Tagesenergie'} wirkt mit. Das kann sich heute zeigen als Drang, zu reagieren, bevor du sortierst.`
    : `Die Tagesenergie wirkt eher diffus${reason ? ` (${reason})` : ''}; nutze den Check-in als Beobachtungsrahmen, nicht als Urteil.`;

  const nextStep = entry.clarity === 'niedrig'
    ? 'Wähle eine offene Sache und entscheide: tun, verschieben oder beenden.'
    : (entry.energy === 'erschoepft'
        ? 'Pausiere bewusst 20 Minuten, bevor du die nächste Sache anfasst.'
        : `Bring heute eine Sache in das Thema ${houseLabel || (dm ? dm + '-Modus' : 'Tagesfokus')} — nur eine.`);

  const tomorrowUse = vm?.tomorrow?.teaser
    ? `Morgen vergleichen wir: ${vm.tomorrow.teaser}`
    : 'Morgen zeigen wir dir, was sich gegenüber heute verändert hat.';

  return { stateLabel, interpretation, nextStep, tomorrowUse };
}

export function CheckInResultCard({ entry, vm } = {}) {
  const model = checkInResultModel({ entry, vm });
  const root = document.createElement('section');
  root.className = 'checkin-result-card';
  if (!model) {
    root.hidden = true;
    return root;
  }

  const h = document.createElement('h3');
  h.className = 'checkin-result-card__title';
  h.textContent = 'Dein Zustand heute';
  root.appendChild(h);

  const state = document.createElement('p');
  state.className = 'checkin-result-card__state';
  state.textContent = model.stateLabel;
  root.appendChild(state);

  const interp = document.createElement('p');
  interp.className = 'checkin-result-card__interpretation';
  interp.innerHTML = `<strong>Fusion-Deutung:</strong> ${model.interpretation}`;
  root.appendChild(interp);

  const step = document.createElement('p');
  step.className = 'checkin-result-card__nextstep';
  const stepLabel = document.createElement('strong');
  stepLabel.textContent = 'Nächster Schritt:';
  step.appendChild(stepLabel);
  step.appendChild(document.createTextNode(` ${model.nextStep}`));
  root.appendChild(step);

  const tomorrow = document.createElement('p');
  tomorrow.className = 'checkin-result-card__tomorrow';
  tomorrow.innerHTML = `<strong>Morgen:</strong> ${model.tomorrowUse}`;
  root.appendChild(tomorrow);

  return root;
}
