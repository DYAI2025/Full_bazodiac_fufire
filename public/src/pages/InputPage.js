import { GeoInput } from '../components/GeoInput.js';
import { CalculationProgress } from '../components/CalculationProgress.js';
import { calculateProfile } from '../api/client.js';

export function InputPage(app, { onResult }) {
  app.innerHTML = `
    <main class="input-page">
      <header class="input-header">
        <h1 class="app-title">Berechne deine Fusion-Signatur</h1>
        <p class="app-subtitle">Westliche Astrologie · BaZi · WuXing-Fusion in einem Profil.</p>
        <p class="app-trust">Daten bleiben lokal in deinem Browser — wir speichern nichts dauerhaft.</p>
      </header>
      <form class="birth-form" novalidate>
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
        <div class="form-group" id="geo-group">
          <label>Geburtsort</label>
          <p class="form-helper">Tippe die Stadt — wir lösen Zeitzone und Koordinaten automatisch.</p>
        </div>
        <div class="form-error" role="alert" aria-live="assertive" hidden></div>
        <button type="submit" class="cta-btn" disabled>Fusion-Signatur berechnen</button>
      </form>
    </main>
  `;

  const form      = app.querySelector('.birth-form');
  const dateInput = form.querySelector('#birth-date');
  const timeInput = form.querySelector('#birth-time');
  const geoGroup  = form.querySelector('#geo-group');
  const submitBtn = form.querySelector('.cta-btn');
  const errorEl   = form.querySelector('.form-error');

  let selectedPlace = null;

  const geoInput = GeoInput({
    onSelect: (place) => {
      selectedPlace = place;
      validate();
    },
  });
  geoGroup.appendChild(geoInput);

  function validate() {
    const hasDate  = !!dateInput.value;
    const hasPlace = !!selectedPlace;
    submitBtn.disabled = !(hasDate && hasPlace);
  }

  dateInput.addEventListener('input', validate);

  const unknownNotice = form.querySelector('.form-notice--unknown');
  form.querySelectorAll('input[name=time-cert]').forEach((el) => {
    el.addEventListener('change', () => {
      const cert = form.querySelector('input[name=time-cert]:checked').value;
      unknownNotice.hidden = (cert !== 'unknown');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

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
      timeCertainty: cert,
      location: selectedPlace.display,
    };

    try { sessionStorage.setItem('azodiac_birth_input', JSON.stringify(input)); } catch { /* storage unavailable — DailyPage falls back to re-entry */ }

    onResult?.(res.data);
  });
}
