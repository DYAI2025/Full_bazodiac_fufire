import { createPersonalityProjection, COHERENCE_FACTOR_LABEL } from '../domain/projections.js';
import { SourceBadge }   from '../components/SourceBadge.js';
import { ConfidenceBar } from '../components/ConfidenceBar.js';
import { UnavailableCard } from '../components/UnavailableCard.js';
import { InsightHero }            from '../components/InsightHero.js';
import { PersistentSignatureBar } from '../components/PersistentSignatureBar.js';
import { buildExperienceProfile, buildCoreIdentity } from '../domain/experienceCopy.js';

const COHERENCE_HEADLINE = {
  high:   'Östliches und westliches Selbstbild ergänzen sich in hoher Deckungsgleichheit.',
  medium: 'Östliche und westliche Perspektive mischen sich zu einer individuellen Balance.',
  low:    'BaZi und westliches Chart zeigen eine kreative Spannung — zwei Blickwinkel, die zur Integration einladen.',
};

function generatePersonalityHeadline(profile, proj) {
  const ci = profile?.fusion?.coherence_index;
  const sun = proj.primaryFactors.find((f) => f.label.startsWith('Sonne'));
  const dm  = proj.primaryFactors.find((f) => f.label.startsWith('Day Master'));

  const cohText = ci !== null && ci !== undefined
    ? (ci >= 0.7 ? COHERENCE_HEADLINE.high : ci <= 0.35 ? COHERENCE_HEADLINE.low : COHERENCE_HEADLINE.medium)
    : null;

  if (sun && dm) {
    return `${sun.label} trifft auf ${dm.label}. ${cohText || ''}`.trim();
  }
  if (sun) return `${sun.value}. ${cohText || ''}`.trim();
  return cohText || 'Dein Profil in allen Schichten.';
}

function factorCard(factor, { highlight = false } = {}) {
  const el = document.createElement('div');
  el.className = `factor-card${highlight ? ' factor-card--highlight' : ''}`;

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

export function PersonalityPage(app, { profile, onNavigate }) {
  const proj     = createPersonalityProjection(profile);
  const headline = generatePersonalityHeadline(profile, proj);

  const ci           = profile?.fusion?.coherence_index;
  const hasLowCoh    = ci !== null && ci !== undefined && ci <= 0.35;
  const coherenceFactor = proj.supportingFactors.find((f) => f.label === COHERENCE_FACTOR_LABEL);

  const expProfile = buildExperienceProfile(profile);
  const identity   = buildCoreIdentity(expProfile);

  app.innerHTML = `
    <main class="personality-page">
      <div class="sig-bar-mount"></div>
      <nav class="page-nav">
        <a href="#/overview"       class="nav-link">← Signatur-Übersicht</a>
        <a href="#/love"           class="nav-link">Liebe</a>
        <a href="#/career-finance" class="nav-link">Arbeit &amp; Ressourcen</a>
        <a href="#/fusion"         class="nav-link">WuXing Fusion</a>
      </nav>

      <div class="insight-hero-mount"></div>

      <div class="confidence-section"></div>

      <section class="primary-layer" aria-label="Kernschicht">
        <h2>Kernschicht — Wer du bist</h2>
        <p class="section-intro">Sonne, Mond und Day Master bilden das Fundament deiner Persönlichkeit aus drei Systemen.</p>
        <div class="factors-grid primary-factors"></div>
      </section>

      <section class="coherence-layer" aria-label="Resonanzbrücke" hidden>
        <h2>Resonanzbrücke (Ost ↔ West)</h2>
        <div class="coherence-content"></div>
      </section>

      <section class="supporting-layer" aria-label="Ausdrucksschichten">
        <h2>Ausdrucksschichten</h2>
        <p class="section-intro">Planeten und Wu-Xing ergänzen das Bild. Diese Seite ist eine vertiefende Sicht — die alltagstauglichen Hebel liegen auf der Signatur-Übersicht.</p>
        <div class="factors-grid supporting-factors"></div>
      </section>

      <section class="integration-hint" aria-label="Integrationshinweis">
        <h3>Integrationshinweis</h3>
        <p>Persönlichkeit ist mehrschichtig — kein einzelner Wert hier erklärt dich. Nutze die Signatur-Übersicht für Handlung, diese Seite für Verstehen.</p>
        <a class="integration-hint__link" href="#/overview">Zur Signatur-Übersicht →</a>
      </section>

      <section class="missing-layer" aria-label="Lücken im Profil" hidden>
        <h2>Lücken im Profil</h2>
        <p class="section-intro">Diese Bereiche konnten nicht vollständig berechnet werden — sie werden offen benannt.</p>
        <div class="missing-content"></div>
      </section>

      <footer class="page-footer">
        <button class="new-calc-btn">Neue Berechnung</button>
      </footer>
    </main>
  `;

  app.querySelector('.sig-bar-mount').replaceWith(
    PersistentSignatureBar({
      dayMaster: identity.dayMaster,
      sun:       identity.sun,
      coherence: expProfile.fusion.coherence,
    })
  );

  app.querySelector('.insight-hero-mount').replaceWith(
    InsightHero({
      eyebrow:   'Tiefe Analyse',
      title:     'Deine Schichten',
      statement: headline,
      evidence:  [
        identity.sun !== '—' ? `Sonne ${identity.sun}` : null,
        identity.moon !== '—' ? `Mond ${identity.moon}` : null,
        identity.dayMaster !== '—' ? `Day Master ${identity.dayMaster}` : null,
      ].filter(Boolean),
      primaryAction:   { label: 'Zur Signatur-Übersicht', path: '/overview' },
    })
  );

  app.querySelector('.confidence-section').appendChild(
    ConfidenceBar(proj.confidence, { label: 'Profiltiefe' })
  );

  // Primary factors (Sun, Moon, Day Master)
  const primaryGrid = app.querySelector('.primary-factors');
  proj.primaryFactors.forEach((f) => primaryGrid.appendChild(factorCard(f, { highlight: true })));

  // Coherence / contradiction section
  if (coherenceFactor) {
    const section = app.querySelector('.coherence-layer');
    section.hidden = false;
    const content = section.querySelector('.coherence-content');

    content.appendChild(factorCard(coherenceFactor));

    if (hasLowCoh) {
      const note = document.createElement('div');
      note.className = 'contradiction-note';
      note.innerHTML = '';
      const h4 = document.createElement('h4');
      h4.textContent = 'Ein Widerspruch als Einladung';
      const p = document.createElement('p');
      p.textContent = 'Dass östliches und westliches System so unterschiedlich klingen, ist kein Fehler — ' +
        'es ist eine Einladung, beide Perspektiven zu integrieren. ' +
        'Die Spannung zwischen ihnen kann eine Quelle von Kreativität und Tiefe sein.';
      note.append(h4, p);
      content.appendChild(note);
    }
  }

  // Supporting factors (excluding coherence, already shown above)
  const supportGrid = app.querySelector('.supporting-factors');
  proj.supportingFactors
    .filter((f) => f.label !== COHERENCE_FACTOR_LABEL)
    .forEach((f) => supportGrid.appendChild(factorCard(f)));

  // Missing factors
  if (proj.missingFactors.length) {
    const section = app.querySelector('.missing-layer');
    section.hidden = false;
    const content = section.querySelector('.missing-content');
    proj.missingFactors.forEach((m) => {
      content.appendChild(UnavailableCard({
        title: m,
        reason: m.includes('Geburtszeit') || m.includes('Häuser')
          ? 'Geburtszeit für Häuser und einige Faktoren erforderlich.'
          : 'Dieser Faktor ist über das API nicht verfügbar.',
        action: m.includes('Geburtszeit')
          ? { label: 'Geburtszeit eingeben', handler: () => onNavigate?.('/') }
          : null,
      }));
    });
  }

  app.querySelector('.new-calc-btn').addEventListener('click', () => onNavigate?.('/'));
}
