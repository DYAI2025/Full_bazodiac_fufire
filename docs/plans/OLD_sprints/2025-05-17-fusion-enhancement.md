# Fusion Enhancement Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dedicated fusion endpoints and extend projection usage to provide deeper fusion interpretation capabilities.

**Architecture:** Extend existing Node.js proxy server with new fusion-specific endpoints that call FuFirE backend, then update frontend projection functions to consume additional fusion data fields (aspects, house_overlay, dominant_patterns). Maintain existing TDD patterns with unit tests for new endpoints and integration tests for full flows.

**Tech Stack:** Node.js ESM, vanilla HTTP server, FuFirE backend API, no build step, existing test framework (node --test)

---

## Task 1: Add `/api/azodiac/fusion` endpoint

**Files:**
- Modify: `server.js:1-695` (add new route handler)
- Test: `test/server.test.js` (add integration test)

**Step 1: Write failing integration test**

```javascript
// Add to test/server.test.js
test('POST /api/azodiac/fusion returns fusion data', async (t) => {
  const payload = {
    date: '1990-06-15',
    time: '14:30',
    latitude: 52.52,
    longitude: 13.405,
    timezone: 'Europe/Berlin'
  };

  const res = await fetch(`${origin}/api/azodiac/fusion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  t.assert(res.ok, 'response should be OK');
  const data = await res.json();
  t.assert('coherence_index' in data, 'should have coherence_index');
  t.assert('wu_xing_vectors' in data, 'should have wu_xing_vectors');
  t.assert('view_model_version' in data, 'should have version stamp');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/server.test.js`
Expected: FAIL with "404 Not Found"

**Step 3: Add route handler in server.js**

Add to `handleRequest` function in `server.js` after existing `/api/azodiac` routes:

```javascript
if (pathname === '/api/azodiac/fusion' && req.method === 'POST') {
  const validation = validatePayload(await getJson(req));
  if (!validation.valid) {
    return sendJson(res, 400, { error: 'Invalid payload', details: validation.errors });
  }
  
  const normalized = translatePayload(validation.data);
  const result = await callFuFire('calculate/fusion', normalized);
  const viewModel = normalizeAzodiacResult(result);
  return sendJson(res, result.status, viewModel);
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/server.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add server.js test/server.test.js
git commit -m "feat: add /api/azodiac/fusion endpoint for independent fusion calculation"
```

---

## Task 2: Extend projections to use fusion.aspects

**Files:**
- Modify: `public/src/domain/projections.js:1-763` (update projection functions)
- Test: `test/view_model.test.js` (add unit tests for new fields)

**Step 1: Write failing unit test for fusion aspects**

```javascript
// Add to test/view_model.test.js
test('createPersonalityProjection includes fusion aspects when available', (t) => {
  const profile = {
    western: { bodies: { Sun: { sign: 'Leo' }, Moon: { sign: 'Cancer' } } },
    bazi: { day_master: { stem: 'Bing', element: 'Feuer' } },
    fusion: { 
      coherence_index: 0.75,
      wu_xing_vectors: { fusion: { Feuer: 0.8 } },
      aspects: [
        { body: 'Sun', type: 'strengthening', description: 'Solar identity reinforced by BaZi fire' }
      ]
    }
  };
  
  const result = createPersonalityProjection(profile);
  const aspectFactor = result.supportingFactors.find(f => f.label.includes('Fusion-Aspekt'));
  t.assert(aspectFactor, 'should include fusion aspects as supporting factor');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/view_model.test.js`
Expected: FAIL with "aspectFactor is undefined"

**Step 3: Extend createPersonalityProjection to use fusion.aspects**

Add after coherence index handling in `createPersonalityProjection`:

```javascript
const fusionAspects = profile?.fusion?.aspects || [];
if (fusionAspects.length > 0) {
  fusionAspects.slice(0, 2).forEach(aspect => {
    proj.supportingFactors.push({
      label: `Fusion-Aspekt: ${aspect.body}`,
      value: aspect.description || aspect.type,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/fusion',
      note: 'Planet-level fusion interaction between subsystems'
    });
    proj.sourceTrace.push('fusion.aspects');
  });
} else {
  proj.sourceTrace.push('fusion.aspects — nicht verfügbar');
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/view_model.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add public/src/domain/projections.js test/view_model.test.js
git commit -m "feat: extend personality projection to use fusion.aspects"
```

---

## Task 3: Extend projections to use fusion.house_overlay

**Files:**
- Modify: `public/src/domain/projections.js:1-763` (update projection functions)
- Test: `test/view_model.test.js` (add unit tests)

**Step 1: Write failing unit test for fusion house overlay**

```javascript
test('createCareerProjection includes fusion house overlay when available', (t) => {
  const profile = {
    western: { 
      bodies: { Sun: { sign: 'Leo' }, Saturn: { sign: 'Capricorn' } },
      houses: [{ sign: 'Leo' }, { sign: 'Capricorn' }] 
    },
    bazi: { pillars: { month: { element: 'Erde' } } },
    fusion: { 
      coherence_index: 0.65,
      wu_xing_vectors: { fusion: { Erde: 0.7 } },
      house_overlay: {
        10: { dominant_element: 'Feuer', fusion_note: 'Career house energized by solar identity' }
      }
    }
  };
  
  const result = createCareerProjection(profile);
  const houseFactor = result.supportingFactors.find(f => f.label.includes('Fusion-Haus'));
  t.assert(houseFactor, 'should include fusion house overlay');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/view_model.test.js`
Expected: FAIL with "houseFactor is undefined"

**Step 3: Extend createCareerProjection to use fusion.house_overlay**

Add after Wu-Xing dominance handling in `createCareerProjection`:

```javascript
const houseOverlay = profile?.fusion?.house_overlay || {};
const mcOverlay = houseOverlay[10];
if (mcOverlay?.fusion_note) {
  proj.supportingFactors.push({
    label: `Fusion-Haus (10. Haus)`,
    value: mcOverlay.fusion_note,
    source: 'api_aggregated',
    endpoint: '/api/azodiac/fusion',
    note: `Dominantes Element: ${mcOverlay.dominant_element || 'unbekannt'}`,
  });
  proj.sourceTrace.push('fusion.house_overlay[10]');
} else {
  proj.sourceTrace.push('fusion.house_overlay[10] — nicht verfügbar');
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/view_model.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add public/src/domain/projections.js test/view_model.test.js
git commit -m "feat: extend career projection to use fusion.house_overlay"
```

---

## Task 4: Extend love and finance projections with fusion aspects

**Files:**
- Modify: `public/src/domain/projections.js:1-763` (update createLoveProjection and createFinanceProjection)
- Test: `test/view_model.test.js` (add unit tests)

**Step 1: Write failing test for love projection fusion aspects**

```javascript
test('createLoveProjection includes fusion aspects', (t) => {
  const profile = {
    western: { bodies: { Venus: { sign: 'Libra' }, Moon: { sign: 'Cancer' } } },
    bazi: { pillars: { day: { element: 'Wasser' } } },
    fusion: { 
      aspects: [
        { body: 'Venus', type: 'harmonizing', description: 'Love energy flows between systems' }
      ]
    }
  };
  
  const result = createLoveProjection(profile);
  const aspectFactor = result.supportingFactors.find(f => f.label.includes('Fusion-Aspekt'));
  t.assert(aspectFactor, 'should include fusion aspects in love projection');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/view_model.test.js`
Expected: FAIL

**Step 3: Add fusion aspects to createLoveProjection**

Add after Wu-Xing dominance in `createLoveProjection`:

```javascript
const fusionAspects = profile?.fusion?.aspects?.filter(a => 
  ['Venus', 'Moon'].includes(a.body)
) || [];
if (fusionAspects.length > 0) {
  fusionAspects.forEach(aspect => {
    proj.supportingFactors.push({
      label: `Fusion-Aspekt: ${aspect.body}`,
      value: aspect.description || aspect.type,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/fusion',
      note: 'Love-relevant fusion interaction'
    });
    proj.sourceTrace.push('fusion.aspects (love-filtered)');
  });
}
```

**Step 4: Add similar pattern to createFinanceProjection**

Add after Wu-Xing dominance in `createFinanceProjection`:

```javascript
const fusionAspects = profile?.fusion?.aspects?.filter(a => 
  ['Venus', 'Jupiter'].includes(a.body)
) || [];
if (fusionAspects.length > 0) {
  fusionAspects.forEach(aspect => {
    proj.supportingFactors.push({
      label: `Fusion-Aspekt: ${aspect.body}`,
      value: aspect.description || aspect.type,
      source: 'api_aggregated',
      endpoint: '/api/azodiac/fusion',
      note: 'Value-relevant fusion interaction'
    });
    proj.sourceTrace.push('fusion.aspects (finance-filtered)');
  });
}
```

**Step 5: Run tests to verify they pass**

Run: `node --test test/view_model.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add public/src/domain/projections.js test/view_model.test.js
git commit -m "feat: extend love and finance projections with filtered fusion aspects"
```

---

## Task 5: Add `/api/azodiac/synastry/fusion` endpoint

**Files:**
- Modify: `server.js:1-695` (add new route handler)
- Test: `test/server.test.js` (add integration test)

**Step 1: Write failing integration test**

```javascript
test('POST /api/azodiac/synastry/fusion returns combined fusion data', async (t) => {
  const payload = {
    person_a: {
      date: '1990-06-15',
      time: '14:30',
      latitude: 52.52,
      longitude: 13.405,
      timezone: 'Europe/Berlin'
    },
    person_b: {
      date: '1992-03-20',
      time: '10:00',
      latitude: 48.8566,
      longitude: 2.3522,
      timezone: 'Europe/Paris'
    }
  };

  const res = await fetch(`${origin}/api/azodiac/synastry/fusion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  t.assert(res.ok, 'response should be OK');
  const data = await res.json();
  t.assert('combined_coherence_index' in data, 'should have combined coherence');
  t.assert('shared_wu_xing_patterns' in data, 'should have shared patterns');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/server.test.js`
Expected: FAIL with "404 Not Found"

**Step 3: Add route handler for synastry fusion in server.js**

Add after existing `/api/azodiac/fusion` route:

```javascript
if (pathname === '/api/azodiac/synastry/fusion' && req.method === 'POST') {
  const payload = await getJson(req);
  
  // Validate both person profiles
  const validationA = validatePayload(payload.person_a);
  const validationB = validatePayload(payload.person_b);
  
  if (!validationA.valid || !validationB.valid) {
    const errors = [
      ...(validationA.valid ? [] : validationA.errors.map(e => `Person A: ${e}`)),
      ...(validationB.valid ? [] : validationB.errors.map(e => `Person B: ${e}`))
    ];
    return sendJson(res, 400, { error: 'Invalid payload', details: errors });
  }
  
  const normalizedA = translatePayload(validationA.data);
  const normalizedB = translatePayload(validationB.data);
  
  // Call FuFirE synastry fusion endpoint
  const result = await callFuFire('calculate/synastry/fusion', {
    person_a: normalizedA,
    person_b: normalizedB
  });
  
  const viewModel = normalizeAzodiacResult(result);
  return sendJson(res, result.status, viewModel);
}
```

**Step 4: Run test to verify it passes**

Run: `node --test test/server.test.js`
Expected: PASS (may need to mock FuFirE response if endpoint not yet available)

**Step 5: Commit**

```bash
git add server.js test/server.test.js
git commit -m "feat: add /api/azodiac/synastry/fusion endpoint for combined fusion analysis"
```

---

## Task 6: Update SynastryPage to use synastry fusion endpoint

**Files:**
- Modify: `public/src/pages/SynastryPage.js:1-543` (update to call new endpoint)
- Test: Manual testing in browser

**Step 1: Add new API client function in client.js**

```javascript
// Add to public/src/api/client.js
export async function calculateSynastryFusion(personA, personB) {
  const res = await fetch('/api/azodiac/synastry/fusion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_a: personA, person_b: person_b })
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null, error: !res.ok ? await res.text() : null };
}
```

**Step 2: Update SynastryPage import and usage**

Add import at top of SynastryPage.js:
```javascript
import { calculateSynastryFusion } from '../api/client.js';
```

Add call after existing synastry calculation in SynastryPage:
```javascript
// After existing synastry calculation
const synastryFusionRes = await calculateSynastryFusion(birthInputA, birthInputB);
if (synastryFusionRes.ok && synastryFusionRes.data) {
  // Render fusion compatibility section
  const fusionSection = document.createElement('section');
  fusionSection.className = 'synastry-fusion-section';
  fusionSection.innerHTML = `
    <h2>Fusion-Verträglichkeit</h2>
    <p>Kombinierte Kohärenz: ${Math.round((synastryFusionRes.data.combined_coherence_index || 0) * 100)}%</p>
    ${synastryFusionRes.data.shared_wu_xing_patterns ? 
      `<p>Gemeinsame Wu-Xing-Muster: ${Object.keys(synastryFusionRes.data.shared_wu_xing_patterns).join(', ')}</p>` : ''
    }
  `;
  content.appendChild(fusionSection);
}
```

**Step 3: Test in browser**

Run: Open application, navigate to Synastry page, enter two birth dates
Expected: New fusion compatibility section appears

**Step 4: Commit**

```bash
git add public/src/api/client.js public/src/pages/SynastryPage.js
git commit -m "feat: update SynastryPage to use synastry fusion endpoint"
```

---

## Task 7: Add fusion dominant patterns to projections

**Files:**
- Modify: `public/src/domain/projections.js:1-763` (update all projection functions)
- Test: `test/view_model.test.js` (add unit tests)

**Step 1: Write failing test for dominant patterns**

```javascript
test('createPersonalityProjection includes fusion dominant patterns', (t) => {
  const profile = {
    western: { bodies: { Sun: { sign: 'Leo' } } },
    bazi: { day_master: { stem: 'Bing', element: 'Feuer' } },
    fusion: { 
      dominant_patterns: [
        { pattern: 'Solar-Fire', frequency: 0.8, description: 'Strong solar expression across systems' }
      ]
    }
  };
  
  const result = createPersonalityProjection(profile);
  const patternFactor = result.supportingFactors.find(f => f.label.includes('Dominantes Muster'));
  t.assert(patternFactor, 'should include dominant patterns');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/view_model.test.js`
Expected: FAIL

**Step 3: Add dominant patterns handling to all projection functions**

Add helper function and apply to each projection:

```javascript
function addDominantPatterns(proj, profile) {
  const patterns = profile?.fusion?.dominant_patterns || [];
  if (patterns.length > 0) {
    patterns.slice(0, 2).forEach(p => {
      proj.supportingFactors.push({
        label: `Dominantes Muster: ${p.pattern}`,
        value: `${p.description} (${Math.round(p.frequency * 100)}% Häufigkeit)`,
        source: 'api_aggregated',
        endpoint: '/api/azodiac/fusion',
      });
      proj.sourceTrace.push('fusion.dominant_patterns');
    });
  } else {
    proj.sourceTrace.push('fusion.dominant_patterns — nicht verfügbar');
  }
}
```

Call this function in each projection before `finalize()`.

**Step 4: Run tests to verify they pass**

Run: `node --test test/view_model.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add public/src/domain/projections.js test/view_model.test.js
git commit -m "feat: add fusion dominant patterns to all projections"
```

---

## Task 8: Update FUFIRE_ENDPOINTS order in test

**Files:**
- Modify: `test/server.test.js` (update endpoint array order)
- Modify: `server.js:1-695` (update FUFIRE_ENDPOINTS array if needed)

**Step 1: Check current endpoint order in server.js**

Run: `grep -n "FUFIRE_ENDPOINTS" server.js -A 20`

**Step 2: Update test to include new fusion endpoints**

Add new endpoints to FUFIRE_ENDPOINTS array in test:
```javascript
const FUFIRE_ENDPOINTS = [
  'calculate/western',
  'calculate/bazi',
  'calculate/fusion',
  'calculate/synastry/fusion',
  // ... existing endpoints
];
```

**Step 3: Run tests to verify they pass**

Run: `node --test test/server.test.js`
Expected: PASS

**Step 4: Commit**

```bash
git add test/server.test.js
git commit -m "test: update FUFIRE_ENDPOINTS order for new fusion endpoints"
```

---

Plan complete and saved to `docs/plans/2025-05-17-fusion-enhancement.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?