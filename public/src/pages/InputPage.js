import { GeoInput } from '../components/GeoInput.js';
import { CalculationProgress } from '../components/CalculationProgress.js';
import { calculateProfile } from '../api/client.js';

export function InputPage(app, { onResult }) {
  app.innerHTML = `
    <main class="input-page">
      <header class="input-header">
        <h1 class="app-title">Azodiac</h1>
        <p class="app-subtitle">Westliche Astrologie · BaZi · Wu-Xing-Fusion</p>
      </header>
      <form class="birth-form" novalidate>
        <div class="form-group">
          <label for="birth-date">Geburtsdatum</label>
          <input type="date" id="birth-date" required aria-required="true" />
        </div>
        <div class="form-group">
          <label for="birth-time">Geburtszeit</label>
          <input type="time" id="birth-time" />
          <div class="time-certainty" role="group" aria-label="Geburtszeit-Genauigkeit">
            <label><input type="radio" name="time-cert" value="exact" checked /> Genau bekannt</label>
            <label><input type="radio" name="time-cert" value="approx" /> Ungefähr</label>
            <label><input type="radio" name="time-cert" value="unknown" /> Unbekannt</label>
          </div>
        </div>
        <div class="form-group" id="geo-group">
          <label>Geburtsort</label>
        </div>
        <div class="form-error" role="alert" aria-live="assertive" hidden></div>
        <button type="submit" class="cta-btn" disabled>Berechnen</button>
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
      // Show full diagnostic: base error + upstream_errors if present (helps debug 502)
      const upstreamErrs = res.data?._meta?.upstream_errors;
      const detail = upstreamErrs
        ? ' (' + Object.entries(upstreamErrs).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') + ')'
        : (res.data?.detail ? ` — ${res.data.detail}` : '');
      errorEl.textContent = (res.error || 'Berechnung nicht möglich') + detail + ' — bitte erneut versuchen.';
      errorEl.hidden = false;
      progress.replaceWith(form);
      return;
    }

    res.data._inputMeta = {
      timeCertainty: cert,
      location: selectedPlace.display,
    };

    sessionStorage.setItem('azodiac_birth_input', JSON.stringify(input));

    onResult?.(res.data);
  });
}
