// Geocode-Autocomplete mit Debounce, Tastaturnavigation, Fallback
import { geocodePlace } from '../api/client.js';

export function GeoInput({ onSelect }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'geo-input-wrapper';
  wrapper.innerHTML = `
    <input type="text" class="geo-input" placeholder="Geburtsort eingeben…"
      autocomplete="off" aria-label="Geburtsort" aria-autocomplete="list" aria-haspopup="listbox" />
    <div class="geo-dropdown" role="listbox" aria-label="Ortsvorschläge"></div>
    <div class="geo-selected" hidden>
      <span class="geo-selected-name"></span>
      <span class="geo-selected-coords"></span>
      <button class="geo-change-btn" type="button" aria-label="Ort ändern">Ändern</button>
    </div>
    <div class="geo-manual" hidden>
      <label>Lat <input type="number" class="geo-lat" step="0.001" /></label>
      <label>Lon <input type="number" class="geo-lon" step="0.001" /></label>
      <label>Zeitzone <input type="text" class="geo-tz" placeholder="Europe/Berlin" /></label>
    </div>
    <button class="geo-manual-toggle" type="button">Koordinaten manuell eingeben</button>
  `;

  const input      = wrapper.querySelector('.geo-input');
  const dropdown   = wrapper.querySelector('.geo-dropdown');
  const selected   = wrapper.querySelector('.geo-selected');
  const changeBtn  = wrapper.querySelector('.geo-change-btn');
  const manualDiv  = wrapper.querySelector('.geo-manual');
  const manualBtn  = wrapper.querySelector('.geo-manual-toggle');

  let debounceTimer = null;
  let results = [];
  let activeIdx = -1;

  function showDropdown(places) {
    results = places;
    activeIdx = -1;
    dropdown.innerHTML = '';
    if (!places.length) {
      dropdown.innerHTML = '<div class="geo-no-result">Kein Ort gefunden</div>';
      dropdown.hidden = false;
      return;
    }
    places.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'geo-option';
      item.setAttribute('role', 'option');
      item.setAttribute('data-idx', i);
      item.textContent = p.display;
      item.addEventListener('click', () => selectPlace(p));
      dropdown.appendChild(item);
    });
    dropdown.hidden = false;
  }

  function selectPlace(p) {
    dropdown.hidden = true;
    input.hidden = true;
    selected.hidden = false;
    wrapper.querySelector('.geo-selected-name').textContent = p.display.split(',')[0];
    wrapper.querySelector('.geo-selected-coords').textContent = `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)} · ${p.tz}`;
    onSelect?.({ display: p.display, lat: p.lat, lon: p.lon, tz: p.tz });
  }

  changeBtn.addEventListener('click', () => {
    selected.hidden = true;
    input.hidden = false;
    input.value = '';
    input.focus();
    onSelect?.(null);
  });

  manualBtn.addEventListener('click', () => {
    manualDiv.hidden = !manualDiv.hidden;
  });

  function syncManual() {
    const lat = Number(manualDiv.querySelector('.geo-lat').value);
    const lon = Number(manualDiv.querySelector('.geo-lon').value);
    const tz  = manualDiv.querySelector('.geo-tz').value.trim() || 'UTC';
    if (lat && lon) onSelect?.({ display: `${lat}, ${lon}`, lat, lon, tz });
  }

  manualDiv.querySelector('.geo-lat').addEventListener('change', syncManual);
  manualDiv.querySelector('.geo-lon').addEventListener('change', syncManual);
  manualDiv.querySelector('.geo-tz').addEventListener('change', syncManual);

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.geo-option');
    if (e.key === 'ArrowDown') { activeIdx = Math.min(activeIdx + 1, items.length - 1); }
    if (e.key === 'ArrowUp')   { activeIdx = Math.max(activeIdx - 1, 0); }
    if (e.key === 'Enter' && activeIdx >= 0) selectPlace(results[activeIdx]);
    if (e.key === 'Escape') dropdown.hidden = true;
    items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
  });

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.hidden = true; return; }
    debounceTimer = setTimeout(async () => {
      const res = await geocodePlace(q);
      if (res.ok && Array.isArray(res.data)) showDropdown(res.data);
      else showDropdown([]);
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) dropdown.hidden = true;
  });

  return wrapper;
}
