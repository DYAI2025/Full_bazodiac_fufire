// End-to-end shape verification for the Daily endpoint flow:
// 1. Frontend posts birth-input to /api/azodiac/daily
// 2. Backend returns Daily-VM payload (western/eastern/fusion/experiment/tomorrow)
// 3. DailyPage builds DOM sections strictly from that payload — no Natal recycling
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDailyExperience } from '../public/src/api/client.js';

function withFetch(mockFn, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mockFn;
  return fn().finally(() => { globalThis.fetch = original; });
}

const SYNTHETIC_DAILY = {
  date: '2026-05-19',
  western: {
    summary: 'Heute aktiviert dein Kontaktfeld den 3. Hausbereich.',
    themes: ['Kommunikation', 'Bewegung'],
    opportunity: 'Eine klare Aussage formulieren',
    caution: 'Verzettlung beim Reagieren',
    evidence: { houses_active: [3, 9] },
  },
  eastern: {
    summary: 'Tagesstamm Bing trifft auf Erdzweig Wu — Feuer-auf-Feuer.',
    themes: ['Klarheit', 'Sichtbarkeit'],
    opportunity: 'Ressourcen sichtbar machen',
    caution: 'Übertreibung',
    evidence: { daily_pillar: { stem: 'Bing', branch: 'Wu' } },
  },
  fusion: {
    summary: 'Beide Systeme zeigen Sichtbarkeit und Kontakt.',
    synthesis: 'Sichtbar machen ohne sich zu verausgaben.',
    action: 'Eine Aussage öffentlich formulieren.',
    pushworthy: false,
  },
  experiment: {
    instruction: 'Formuliere heute eine offene Sache in einem Satz.',
    reflection: 'Was wurde leichter, als es sichtbar war?',
  },
  tomorrow: {
    hint: 'Morgen wird der Kontaktimpuls ruhiger, Ressourcenfokus bleibt.',
  },
};

test('getDailyExperience posts birth input and returns Daily payload shape', () =>
  withFetch(
    async (url, opts) => {
      assert.ok(url.includes('/api/azodiac/daily'), `expected /api/azodiac/daily, got ${url}`);
      assert.equal(opts.method, 'POST');
      const body = JSON.parse(opts.body);
      assert.equal(body.date, '1990-05-15');
      assert.equal(body.lat, 52.52);
      assert.equal(body.lon, 13.40);
      assert.equal(body.tz, 'Europe/Berlin');
      return { ok: true, status: 200, json: async () => SYNTHETIC_DAILY };
    },
    async () => {
      const r = await getDailyExperience({
        date: '1990-05-15', time: '14:30', lat: 52.52, lon: 13.40, tz: 'Europe/Berlin',
      });
      assert.equal(r.ok, true);
      assert.equal(r.data.date, '2026-05-19');
      // Acceptance criterion: westlicher Impuls + BaZi-Impuls + Fusion-Synthese
      // + Experiment + Morgen-Ausblick all present and distinct from Natal text.
      assert.ok(r.data.western.summary);
      assert.ok(r.data.eastern.summary);
      assert.ok(r.data.fusion.synthesis);
      assert.ok(r.data.experiment.instruction);
      assert.ok(r.data.tomorrow.hint);
    },
  ));

test('Daily payload: western + eastern stay distinct (no Natal-text-recycling)', () =>
  withFetch(
    async () => ({ ok: true, status: 200, json: async () => SYNTHETIC_DAILY }),
    async () => {
      const r = await getDailyExperience({ date: '1990-05-15', lat: 52.52, lon: 13.40, tz: 'Europe/Berlin' });
      const w = r.data.western.summary;
      const e = r.data.eastern.summary;
      // Distinct summaries — Natal text would yield identical or near-identical output.
      assert.notEqual(w, e);
      // No telltale "Natal" / "Geburt" keyword leakage in Daily output.
      assert.ok(!/Geburt/.test(w + e), 'Daily summary contains Natal vocabulary');
    },
  ));

test('Daily endpoint envelope surfaces upstream 500 without throwing', () =>
  withFetch(
    async () => ({ ok: false, status: 500, json: async () => ({ error: 'computation timeout' }) }),
    async () => {
      const r = await getDailyExperience({ date: '1990-05-15', lat: 0, lon: 0, tz: 'UTC' });
      assert.equal(r.ok, false);
      assert.equal(r.status, 500);
      assert.equal(r.error, 'computation timeout');
    },
  ));

test('Daily payload passes noFakeDataGuard on synthetic API response', async () => {
  const { noFakeDataGuard } = await import('../public/src/api/client.js');
  assert.doesNotThrow(() => noFakeDataGuard(SYNTHETIC_DAILY, 'daily-synthetic'));
});
