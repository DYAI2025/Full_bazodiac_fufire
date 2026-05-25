// Card mit konkreter, zeitlich begrenzter Handlung pro Page.
import { SourcePill } from './SourcePill.js';

export function actionExperimentCardModel({
  title = '',
  duration = '24 Stunden',
  instruction = '',
  reflectPrompt = '',
  source = 'static_interpretation',
} = {}) {
  return { title, duration, instruction, reflectPrompt, source };
}

export function ActionExperimentCard(opts = {}) {
  const m = actionExperimentCardModel(opts);
  const root = document.createElement('section');
  root.className = 'action-experiment-card';

  const header = document.createElement('header');
  header.className = 'action-experiment-card__header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'action-experiment-card__title';
  titleEl.textContent = m.title;
  header.appendChild(titleEl);

  const durEl = document.createElement('span');
  durEl.className = 'action-experiment-card__duration';
  durEl.textContent = m.duration;
  header.appendChild(durEl);

  header.appendChild(SourcePill(m.source));
  root.appendChild(header);

  if (m.instruction) {
    const p = document.createElement('p');
    p.className = 'action-experiment-card__instruction';
    p.textContent = m.instruction;
    root.appendChild(p);
  }
  if (m.reflectPrompt) {
    const r = document.createElement('p');
    r.className = 'action-experiment-card__reflect';
    r.textContent = m.reflectPrompt;
    root.appendChild(r);
  }
  return root;
}
