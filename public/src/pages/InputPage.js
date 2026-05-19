import { GeoInput } from '../components/GeoInput.js';
import { CalculationProgress } from '../components/CalculationProgress.js';
import { calculateProfile } from '../api/client.js';
import {
  readAlias, saveAlias,
  readPersonB, savePersonB,
  readRelationshipContext, saveRelationshipContext,
} from '../domain/personState.js';

export function InputPage(app, { onResult }) {
  const persistedAlias = readAlias();
  const persistedB     = readPersonB();
  const persistedCtx   = readRelationshipContext();

  app.innerHTML = `
    <main class="input-page">
      <header class="input-header">
        <h1 class="app-title">Berechne deine Fusion-Signatur</h1>
        <p class="app-subtitle">Westliche Astrologie · BaZi · WuXing-Fusion in einem Profil.</p>
        <p class="app-trust">Daten bleiben lokal in deinem Browser — wir speichern nichts dauerhaft.</p>
      </header>

      <form class="birth-form" novalidate>
        <fieldset class="form-section form-section--alias">
          <legend>Anzeigename</legend>
          <div class="form-group">
            <label for="alias">Wie möchtest du genannt werden?</label>
            <input type="text" id="alias" maxlength="80" placeholder="Optional · z. B. dein Vorname"
                   value="${escapeAttr(persistedAlias)}" />
            <p class="form-helper">Wird in Signatur, Tagespuls und Beziehungsansicht verwendet. Leer = "Dein Profil".</p>
          </div>
        </fieldset>

        <fieldset class="form-section form-section--person-a">
          <legend>Deine Geburtsdaten</legend>
          <div class="form-group">
            <label for="birth-date">Geburtsdatum</label>
            <input type="date" id="birth-date" required aria-required="true" />
            <p class="form-helper">Tag, Monat und Jahr deiner Geburt.</p>
          </div>
          <div class="form-group">
            <label for="birth-time">Geburtszeit</label>
            <input type="time" id="birth-time" />
            <p class="form-helper">Wenn unsicher, wähle unten "Ungefähr" oder "Unbekannt" — die Berechnung läuft trotzdem.</p>
            <div class="time-certainty" role="group" aria-label="Geburtszeit-Genauigkeit">
              <label><input type="radio" name="time-cert" value="exact" checked /> Auf die Minute</label>
              <label><input type="radio" name="time-cert" value="approx" /> Auf 1–2 Stunden</label>
              <label><input type="radio" name="time-cert" value="unknown" /> Unbekannt</label>
            </div>
            <p class="form-notice form-notice--unknown" hidden>Ohne Geburtszeit fehlen Aszendent und Häuser. Tagesthemen, BaZi und WuXing-Fusion bleiben verfügbar.</p>
          </div>
          <div class="form-group" id="geo-group-a">
            <label>Geburtsort</label>
            <p class="form-helper">Tippe die Stadt — wir lösen Zeitzone und Koordinaten automatisch. Alternativ Koordinaten manuell eingeben.</p>
          </div>
        </fieldset>

        <details class="form-section form-section--person-b">
          <summary>Partnerprofil / Person B <span class="optional-hint">(optional)</span></summary>
          <p class="form-helper">Nur ausfüllen, wenn du den Partnervergleich nutzen möchtest. Bleibt lokal gespeichert, bis du sie löschst.</p>
          <div class="form-group">
            <label for="alias-b">Name oder Alias</label>
            <input type="text" id="alias-b" maxlength="80" value="${escapeAttr(persistedB?.alias)}" />
          </div>
          <div class="form-group">
            <label for="date-b">Geburtsdatum Person B</label>
            <input type="date" id="date-b" value="${escapeAttr(persistedB?.date)}" />
          </div>
          <div class="form-group">
            <label for="time-b">Geburtszeit Person B</label>
            <input type="time" id="time-b" value="${escapeAttr(persistedB?.time)}" />
            <div class="time-certainty" role="group" aria-label="Person B — Geburtszeit-Genauigkeit">
              <label><input type="radio" name="time-cert-b" value="exact" ${certChecked(persistedB?.certainty, 'exact')} /> Auf die Minute</label>
              <label><input type="radio" name="time-cert-b" value="approx" ${certChecked(persistedB?.certainty, 'approx')} /> Auf 1–2 Stunden</label>
              <label><input type="radio" name="time-cert-b" value="unknown" ${certChecked(persistedB?.certainty, 'unknown')} /> Unbekannt</label>
            </div>
          </div>
          <div class="form-group" id="geo-group-b">
            <label>Geburtsort Person B</label>
          </div>
          <div class="form-group">
            <label>Beziehungskontext</label>
            <div class="relationship-context" role="group" aria-label="Beziehungskontext">
              <label><input type="radio" name="rel-ctx" value="romantic" ${ctxChecked(persistedCtx, 'romantic')} /> Romantisch</label>
              <label><input type="radio" name="rel-ctx" value="friend"   ${ctxChecked(persistedCtx, 'friend')} /> Freundschaft</label>
              <label><input type="radio" name="rel-ctx" value="work"     ${ctxChecked(persistedCtx, 'work')} /> Arbeit / Team</label>
              <label><input type="radio" name="rel-ctx" value="open"     ${ctxChecked(persistedCtx, 'open')} /> Unklar / offen</label>
            </div>
          </div>
          <div class="form-error person-b-error" role="alert" hidden></div>
          <button type="button" class="person-b-clear-btn">Partnerdaten löschen</button>
        </details>

        <section class="category-preview" aria-label="Was dich nach der Berechnung erwartet">
          <h2 class="category-preview-title">Was dich erwartet</h2>
          <ul class="category-preview-list">
            <li><strong>Signatur lernen</strong> — BaZi, WuXing, westliche Faktoren, Kohärenz.</li>
            <li><strong>Heute anwenden</strong> — Tagespuls, Lernimpuls, 24h-Experiment, Check-in.</li>
            <li><strong>Beziehung reflektieren</strong> — Kontakt-Signatur, Hauptverbindung, Hauptspannung (nur mit Person B).</li>
            <li><strong>Arbeit & Ressourcen</strong> — Arbeitsmodus, Ressourcenmuster, Ausgleichsimpulse.</li>
          </ul>
        </section>

        <div class="form-error" role="alert" aria-live="assertive" hidden></div>
        <button type="submit" class="cta-btn" disabled>Fusion-Signatur berechnen</button>
      </form>
    </main>
  `;

  const form       = app.querySelector('.birth-form');
  const aliasInput = form.querySelector('#alias');
  const dateInput  = form.querySelector('#birth-date');
  const timeInput  = form.querySelector('#birth-time');
  const submitBtn  = form.querySelector('.cta-btn');
  const errorEl    = form.querySelector('.form-error[aria-live]');
  const unknownNotice = form.querySelector('.form-notice--unknown');

  let selectedPlace = null;
  const geoInput = GeoInput({
    onSelect: (place) => { selectedPlace = place; validate(); },
  });
  form.querySelector('#geo-group-a').appendChild(geoInput);

  // ── Person B ────────────────────────────────────────────────────────────────
  const aliasB = form.querySelector('#alias-b');
  const dateB  = form.querySelector('#date-b');
  const timeB  = form.querySelector('#time-b');
  const errBEl = form.querySelector('.person-b-error');
  const clearBBtn = form.querySelector('.person-b-clear-btn');

  let placeB = persistedB?.place || null;
  const geoB = GeoInput({
    onSelect: (place) => { placeB = place; validate(); },
  });
  form.querySelector('#geo-group-b').appendChild(geoB);

  clearBBtn.addEventListener('click', () => {
    aliasB.value = '';
    dateB.value  = '';
    timeB.value  = '';
    placeB = null;
    savePersonB(null);
    saveRelationshipContext('');
    form.querySelectorAll('input[name=rel-ctx]').forEach((el) => { el.checked = false; });
    validate();
  });

  function readPersonBFromForm() {
    if (!dateB.value || !placeB) return null;
    const cert = form.querySelector('input[name=time-cert-b]:checked')?.value || 'exact';
    return {
      alias: aliasB.value.trim(),
      date:  dateB.value,
      time:  cert !== 'unknown' ? (timeB.value || '12:00') : '12:00',
      certainty: cert,
      place: placeB,
    };
  }

  function relCtxFromForm() {
    return form.querySelector('input[name=rel-ctx]:checked')?.value || '';
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const hasDate  = !!dateInput.value;
    const hasPlace = !!selectedPlace;
    submitBtn.disabled = !(hasDate && hasPlace);
    // Person B is optional: started = partial inputs present
    const bStarted = !!(dateB.value || placeB || aliasB.value);
    const bComplete = !!(dateB.value && placeB);
    if (bStarted && !bComplete) {
      errBEl.textContent = 'Für Partnervergleich Datum und Ort eintragen, oder Partnerdaten löschen.';
      errBEl.hidden = false;
    } else {
      errBEl.hidden = true;
    }
  }

  dateInput.addEventListener('input', validate);
  dateB.addEventListener('input', validate);
  aliasB.addEventListener('input', validate);

  form.querySelectorAll('input[name=time-cert]').forEach((el) => {
    el.addEventListener('change', () => {
      const cert = form.querySelector('input[name=time-cert]:checked').value;
      unknownNotice.hidden = (cert !== 'unknown');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    // Persist alias + Person-B + relationship context before triggering API call.
    saveAlias(aliasInput.value.trim());
    const personB = readPersonBFromForm();
    if (personB) savePersonB(personB);
    saveRelationshipContext(relCtxFromForm());

    const cert    = form.querySelector('input[name=time-cert]:checked').value;
    const timeVal = cert !== 'unknown' ? (timeInput.value || '12:00') : '12:00';

    const input = {
      date: dateInput.value,
      time: timeVal,
      lat:  selectedPlace.lat,
      lon:  selectedPlace.lon,
      tz:   selectedPlace.tz,
    };

    const progress = CalculationProgress();
    form.replaceWith(progress);

    const res = await calculateProfile(input);
    progress.stop();

    if (!res.ok || !res.data) {
      errorEl.textContent = res.error || 'Berechnung fehlgeschlagen. Bitte versuche es erneut.';
      progress.replaceWith(form);
      errorEl.hidden = false;
      return;
    }

    res.data._inputMeta = {
      alias: aliasInput.value.trim(),
      timeCertainty: cert,
      location: selectedPlace.display,
    };

    try { sessionStorage.setItem('azodiac_birth_input', JSON.stringify(input)); }
    catch { /* storage unavailable — DailyPage falls back to re-entry */ }

    onResult?.(res.data);
  });
}

function escapeAttr(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function certChecked(actual, expected) {
  return (actual || 'exact') === expected ? 'checked' : '';
}

function ctxChecked(actual, expected) {
  return actual === expected ? 'checked' : '';
}
