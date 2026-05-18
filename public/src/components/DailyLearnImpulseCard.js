// Daily Learn-Impuls: Heute verstehen + Heute anwenden + 24h Experiment.

export function dailyLearnImpulseModel({ anchor = '', understand = '', apply = '', experiment = '' } = {}) {
  return { anchor, understand, apply, experiment };
}

export function DailyLearnImpulseCard(opts = {}) {
  const m = dailyLearnImpulseModel(opts);
  const root = document.createElement('section');
  root.className = 'daily-learn-impulse';

  const head = document.createElement('header');
  head.className = 'daily-learn-impulse__head';
  const eb = document.createElement('span');
  eb.className = 'daily-learn-impulse__eyebrow';
  eb.textContent = 'Heute lernen';
  const an = document.createElement('span');
  an.className = 'daily-learn-impulse__anchor';
  an.textContent = m.anchor;
  head.append(eb, an);
  root.appendChild(head);

  for (const [labelKey, val, cls] of [
    ['Heute verstehen', m.understand, 'daily-learn-impulse__understand'],
    ['Heute anwenden',  m.apply,      'daily-learn-impulse__apply'],
    ['24h Experiment',  m.experiment, 'daily-learn-impulse__experiment'],
  ]) {
    if (!val) continue;
    const p = document.createElement('p');
    p.className = cls;
    const strong = document.createElement('strong');
    strong.textContent = `${labelKey}:`;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(` ${val}`));
    root.appendChild(p);
  }
  return root;
}

export const JSDOM_TEXT_CONTENT_ONLY = true;
