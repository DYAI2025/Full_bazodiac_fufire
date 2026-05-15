// Progressiver Lade-Flow: kein Spinner, sondern Schritte mit Text
export function CalculationProgress() {
  const steps = [
    { id: 'western', label: 'Westliches Chart wird berechnet…' },
    { id: 'bazi',    label: 'BaZi-Säulen werden ermittelt…' },
    { id: 'fusion',  label: 'Wu-Xing-Fusion wird berechnet…' },
    { id: 'done',    label: 'Dein Profil ist fertig.' },
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
  }, 900);

  el.stop = () => clearInterval(interval);

  return el;
}
