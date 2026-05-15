import { createCareerProjection, createFinanceProjection } from '../domain/projections.js';
import { SourceBadge }   from '../components/SourceBadge.js';
import { ConfidenceBar } from '../components/ConfidenceBar.js';
import { UnavailableCard } from '../components/UnavailableCard.js';

function factorCard(factor) {
  const el = document.createElement('div');
  el.className = 'factor-card';

  const header = document.createElement('div');
  header.className = 'factor-card-header';
  const label = document.createElement('span');
  label.className = 'factor-label';
  label.textContent = factor.label;
  header.append(label, SourceBadge(factor.source));
  el.appendChild(header);

  const value = document.createElement('p');
  value.className = 'factor-value';
  value.textContent = factor.value;
  el.appendChild(value);

  if (factor.note) {
    const note = document.createElement('p');
    note.className = 'factor-note';
    note.textContent = factor.note;
    el.appendChild(note);
  }

  return el;
}

function buildTab(proj, { onNavigate }) {
  const section = document.createElement('div');
  section.className = 'tab-content';

  section.appendChild(ConfidenceBar(proj.confidence, { label: 'Datenvollständigkeit' }));

  if (proj.primaryFactors.length) {
    const h = document.createElement('h3');
    h.textContent = 'Kernfaktoren';
    const grid = document.createElement('div');
    grid.className = 'factors-grid';
    proj.primaryFactors.forEach((f) => grid.appendChild(factorCard(f)));
    section.append(h, grid);
  }

  if (proj.supportingFactors.length) {
    const h = document.createElement('h3');
    h.textContent = 'Ergänzende Faktoren';
    const grid = document.createElement('div');
    grid.className = 'factors-grid';
    proj.supportingFactors.forEach((f) => grid.appendChild(factorCard(f)));
    section.append(h, grid);
  }

  if (proj.missingFactors.length) {
    const h = document.createElement('h3');
    h.textContent = 'Fehlende Daten';
    section.appendChild(h);
    proj.missingFactors.forEach((m) => {
      section.appendChild(UnavailableCard({
        title: m,
        reason: m.includes('Geburtszeit') || m.includes('Häuser')
          ? 'Für Häuser wird die genaue Geburtszeit benötigt.'
          : 'Dieser Faktor ist über das API nicht verfügbar.',
        action: m.includes('Geburtszeit')
          ? { label: 'Geburtszeit eingeben', handler: () => onNavigate?.('/') }
          : null,
      }));
    });
  }

  return section;
}

export function CareerFinancePage(app, { profile, onNavigate }) {
  const careerProj  = createCareerProjection(profile);
  const financeProj = createFinanceProjection(profile);

  app.innerHTML = `
    <main class="career-finance-page">
      <nav class="page-nav">
        <a href="#/overview" class="nav-link">← Übersicht</a>
        <a href="#/love" class="nav-link">Liebe</a>
        <a href="#/personality" class="nav-link">Persönlichkeit</a>
      </nav>

      <header class="page-header">
        <h1>Karriere &amp; Finanzen</h1>
        <p class="page-subtitle">Symbolische Einordnung — kein Karriere- oder Finanzratschlag.</p>
      </header>

      <div class="tab-bar" role="tablist">
        <button class="tab-btn tab-btn--active" role="tab" aria-selected="true"  data-tab="career">Karriere</button>
        <button class="tab-btn"                 role="tab" aria-selected="false" data-tab="finance">Finanzen</button>
      </div>

      <div class="tab-panels">
        <div class="tab-panel" data-panel="career"></div>
        <div class="tab-panel tab-panel--hidden" data-panel="finance"></div>
      </div>

      <aside class="finance-disclaimer" aria-label="Hinweis">
        <p>⚠ Diese Seite enthält keine Finanzberatung und keine Empfehlungen für Investitionen oder Zeitpunkte.
        Alle Aussagen sind symbolischer Natur. Für finanzielle Entscheidungen wende dich an qualifizierte Fachleute.</p>
      </aside>

      <footer class="page-footer">
        <button class="new-calc-btn">Neue Berechnung</button>
      </footer>
    </main>
  `;

  app.querySelector('[data-panel="career"]').appendChild(
    buildTab(careerProj,  { onNavigate })
  );
  app.querySelector('[data-panel="finance"]').appendChild(
    buildTab(financeProj, { onNavigate })
  );

  // Tab switching
  app.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      app.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.remove('tab-btn--active');
        b.setAttribute('aria-selected', 'false');
      });
      app.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('tab-panel--hidden'));

      btn.classList.add('tab-btn--active');
      btn.setAttribute('aria-selected', 'true');
      app.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.remove('tab-panel--hidden');
    });
  });

  app.querySelector('.new-calc-btn').addEventListener('click', () => onNavigate?.('/'));
}
