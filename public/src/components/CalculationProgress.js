// Progressiver Lade-Flow: kein Spinner, sondern Schritte mit Text.
// Sechs Stufen, 750 ms pro Schritt, damit der Wechsel sich lebendig anfühlt.
export function CalculationProgress() {
  const steps = [
    { id: 'validate', label: 'Geburtsdaten werden geprüft…' },
    { id: 'geo',      label: 'Ort und Zeitzone werden aufgelöst…' },
    { id: 'western',  label: 'Westliches Chart wird berechnet…' },
    { id: 'bazi',     label: 'BaZi-Säulen werden ermittelt…' },
    { id: 'fusion',   label: 'WuXing-Fusion wird gebildet…' },
    { id: 'done',     label: 'Signatur wird vorbereitet.' },
  ];

  const el = document.createElement('div');
  el.className = 'calc-progress';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');

  let current = 0;
  el.innerHTML = `<p class="calc-step">${steps[0].label}</p>`;

  const interval = setInterval(() => {
    current++;
    if (current >= steps.length - 1) { clearInterval(interval); }
    el.querySelector('.calc-step').textContent = steps[Math.min(current, steps.length - 1)].label;
  }, 750);

  el.stop = () => clearInterval(interval);

  return el;
}
