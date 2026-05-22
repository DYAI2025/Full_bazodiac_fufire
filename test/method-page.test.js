// test/method-page.test.js — I5: MethodPage pure renderer unit tests
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderHero,
  renderProvenanceTable,
  renderLiveStatus,
  renderUsage,
  renderRawData,
  statusPillClass,
} from '../public/src/pages/MethodPage.js';

test('statusPillClass: maps each status to a stable class', () => {
  assert.equal(statusPillClass('reachable'), 'pill pill--ok');
  assert.equal(statusPillClass('fallback'),  'pill pill--warn');
  assert.equal(statusPillClass('unused'),    'pill pill--muted');
  assert.equal(statusPillClass('unknown'),   'pill pill--unknown');
  assert.equal(statusPillClass('known'),     'pill pill--neutral');
});

test('renderHero: returns string with hero markers and rolling-text hook', () => {
  const html = renderHero();
  assert.match(html, /method-hero/);
  assert.match(html, /data-rolling-text/);
  assert.match(html, /API-?\s?\/?\s?Daten-?Provenienz/i);
});

test('renderProvenanceTable: renders one row per entry with status pill + consumers', () => {
  const entries = [
    { endpoint: '/api/azodiac/profile', method: 'POST', source: 'health', status: 'reachable', consumers: ['OverviewPage'] },
    { endpoint: '/api/azodiac/ghost',   method: 'UNKNOWN', source: 'frontend-use', status: 'unknown', consumers: ['GhostPage'] },
  ];
  const html = renderProvenanceTable(entries);
  assert.match(html, /<table[^>]*provenance-table/);
  assert.match(html, /\/api\/azodiac\/profile/);
  assert.match(html, /\/api\/azodiac\/ghost/);
  assert.match(html, /pill--ok/);
  assert.match(html, /pill--unknown/);
  assert.match(html, /OverviewPage/);
  assert.match(html, /GhostPage/);
});

test('renderProvenanceTable: empty input still renders table head (no crash)', () => {
  const html = renderProvenanceTable([]);
  assert.match(html, /<table[^>]*provenance-table/);
  assert.match(html, /Endpoint/);
});

test('renderLiveStatus: shows upstream_ok pill and base url', () => {
  const html = renderLiveStatus({ ok: true, upstream_ok: true, fufire_base_url: 'https://example.test/' });
  assert.match(html, /pill--ok/);
  assert.match(html, /example\.test/);
});

test('renderLiveStatus: warn pill when upstream_ok=false', () => {
  const html = renderLiveStatus({ ok: true, upstream_ok: false, fufire_base_url: 'https://example.test/' });
  assert.match(html, /pill--warn/);
});

test('renderLiveStatus: gracefully handles null health', () => {
  const html = renderLiveStatus(null);
  assert.match(html, /pill--unknown/);
  assert.match(html, /nicht erreichbar|unbekannt/i);
});

test('renderUsage: groups by page name', () => {
  const entries = [
    { endpoint: '/api/azodiac/profile', method: 'POST', source: 'health', status: 'reachable', consumers: ['OverviewPage', 'PersonalityPage'] },
    { endpoint: '/api/azodiac/fusion',  method: 'POST', source: 'health', status: 'reachable', consumers: ['LovePage'] },
  ];
  const html = renderUsage(entries);
  assert.match(html, /OverviewPage/);
  assert.match(html, /PersonalityPage/);
  assert.match(html, /LovePage/);
  assert.match(html, /\/api\/azodiac\/profile/);
});

test('renderRawData: wraps in <details> with closed default and redacts secrets', () => {
  const raw = { api_key: 'sk-secret', fufire_base_url: 'https://x.test/' };
  const html = renderRawData(raw);
  assert.match(html, /<details(?![^>]*\bopen\b)/);
  assert.match(html, /\[REDACTED\]/);
  assert.doesNotMatch(html, /sk-secret/);
});
