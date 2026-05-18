// 24h Kontakt-Experiment-Karte für Variante C. Eigenes Komponenten-Modul
// gemäß Plan §14 (auch wenn die DOM-Form ActionExperimentCard sehr nah ist —
// Variante C trackt einen anderen Tag-/Source-Reason-Kontext).

export function contactExperimentCardModel({
  title = '24h Kontakt-Experiment',
  duration = '24 Stunden',
  instruction = 'Sprecht heute eine Sache direkter aus, als ihr es sonst tut.',
  reflectionQuestion = 'Was wurde leichter, als ihr klarer wurdet?',
  tags = [],
  sourceReason = 'Default',
} = {}) {
  return { title, duration, instruction, reflectionQuestion, tags: Array.isArray(tags) ? tags : [], sourceReason };
}

export function ContactExperimentCard(opts = {}) {
  const m = contactExperimentCardModel(opts);
  const root = document.createElement('section');
  root.className = 'contact-experiment-card';

  const head = document.createElement('header');
  head.className = 'contact-experiment-card__head';
  const t = document.createElement('h3');
  t.className = 'contact-experiment-card__title';
  t.textContent = m.title;
  const d = document.createElement('span');
  d.className = 'contact-experiment-card__duration';
  d.textContent = m.duration;
  head.append(t, d);
  root.appendChild(head);

  const instr = document.createElement('p');
  instr.className = 'contact-experiment-card__instruction';
  instr.textContent = m.instruction;
  root.appendChild(instr);

  const refl = document.createElement('p');
  refl.className = 'contact-experiment-card__reflection';
  refl.innerHTML = `<strong>Reflexion:</strong> ${m.reflectionQuestion}`;
  root.appendChild(refl);

  if (m.tags.length) {
    const tagBar = document.createElement('div');
    tagBar.className = 'contact-experiment-card__tags';
    for (const tag of m.tags) {
      const t = document.createElement('span');
      t.className = 'contact-experiment-card__tag';
      t.textContent = tag;
      tagBar.appendChild(t);
    }
    root.appendChild(tagBar);
  }

  const reason = document.createElement('p');
  reason.className = 'contact-experiment-card__reason';
  reason.textContent = `Grund: ${m.sourceReason}`;
  root.appendChild(reason);

  return root;
}
