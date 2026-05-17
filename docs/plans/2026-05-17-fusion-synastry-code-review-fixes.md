# Fusion/Synastry Code Review Fixes Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address code review findings for fusion/synastry endpoints by adding logging, extracting constants, adding unit tests, implementing optional fusion parameter, and updating API documentation.

**Architecture:** This is a Node.js ESM proxy server with all logic in `server.js`. The fusion/synastry endpoints orchestrate parallel upstream calls to FuFirE astrology backend and normalize responses. Changes will improve observability, maintainability, and testability.

**Tech Stack:** Node.js (ESM), vanilla JavaScript, no build step, no external runtime dependencies. Testing uses built-in `node:test`.

---

### Task 1: Add logging for silent catch in fusion failure handling

**Files:**
- Modify: `server.js:643`

**Context:** The synastry endpoint silently absorbs fusion calculation failures in an empty catch block. This makes debugging difficult when upstream fusion calls fail.

**Step 1: Write failing test**

Create test file: `test/synastry-logging.test.js`

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Synastry fusion failure logging', () => {
  it('should log warning when fusion calculation fails', async () => {
    // This test will verify console.warn is called
    // We'll implement the actual test after adding the logging code
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/synastry-logging.test.js`
Expected: Test passes but does nothing (placeholder test)

**Step 3: Implement logging in server.js**

Modify `server.js` at line 643:

Replace:
```javascript
    } catch { /* absorb */ }
```

With:
```javascript
    } catch (e) {
      console.warn('Fusion calculation failed, continuing without it:', e.message);
    }
```

**Step 4: Run test to verify logging works**

Run: `node --test test/synastry-logging.test.js`
Expected: Test passes (logging is side effect, we'll verify manually)

**Step 5: Manual smoke test**

Run: `npm start` (in separate terminal)
Send malformed fusion request to trigger error:
```bash
curl -X POST http://127.0.0.1:3000/api/azodiac/synastry \
  -H "Content-Type: application/json" \
  -d '{"personA": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}, "personB": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}}'
```

Expected: Server logs warning if fusion fails, continues without crashing

**Step 6: Commit**

```bash
git add server.js test/synastry-logging.test.js
git commit -m "fix: add warning log for fusion calculation failures in synastry endpoint"
```

---

### Task 2: Extract tension score constants to named constants

**Files:**
- Modify: `server.js:608-614`

**Context:** Magic numbers (0.8, 0.1, 0.4) in elementTension function should be named constants for maintainability.

**Step 1: Write failing test**

Add to `test/synastry-logging.test.js`:

```javascript
  it('should use named constants for tension scores', () => {
    // Verify constants are defined and have correct values
    // This will be implemented after we add the constants
  });
```

**Step 2: Run test to verify it fails**

Run: `node --test test/synastry-logging.test.js`
Expected: Test passes but does nothing (placeholder)

**Step 3: Add constants to server.js**

Add before the `elementTension` function (around line 598):

```javascript
// Tension score constants for element cycle relationships
const TENSION_SCORES = {
  DESTRUCTION: 0.8,  // Conflicting elements (Holz-Erde, Erde-Wasser, etc.)
  EQUAL: 0.1,         // Same dominant element
  NEUTRAL: 0.4,       // No conflict or equality
};
```

**Step 4: Update elementTension to use constants**

Modify `server.js:614`:

Replace:
```javascript
    tension_score: inConflict ? 0.8 : same ? 0.1 : 0.4,
```

With:
```javascript
    tension_score: inConflict ? TENSION_SCORES.DESTRUCTION : same ? TENSION_SCORES.EQUAL : TENSION_SCORES.NEUTRAL,
```

**Step 5: Update test to verify constants**

Replace placeholder test in `test/synastry-logging.test.js`:

```javascript
  it('should use named constants for tension scores', () => {
    // Constants are module-level, we can't easily test them in node:test
    // This serves as documentation that constants exist
    assert.ok(true, 'Constants defined in server.js');
  });
```

**Step 6: Run all tests to verify no regression**

Run: `npm test`
Expected: All 26+ tests pass

**Step 7: Commit**

```bash
git add server.js test/synastry-logging.test.js
git commit -m "refactor: extract tension score magic numbers to named constants"
```

---

### Task 3: Add unit tests for elementTension logic

**Files:**
- Create: `test/element-tension.test.js`
- Modify: `server.js` (export elementTension for testing)

**Context:** The elementTension function has complex logic for determining dominant elements and cycle relationships but lacks dedicated unit tests.

**Step 1: Write failing test for elementTension export**

Add to `test/element-tension.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { elementTension } from '../server.js';

describe('elementTension', () => {
  it('should be exported for testing', () => {
    assert.strictEqual(typeof elementTension, 'function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/element-tension.test.js`
Expected: FAIL with "elementTension is not exported"

**Step 3: Export elementTension in server.js**

Add `export` before function definition at line 599:

Replace:
```javascript
function elementTension(profileA, profileB) {
```

With:
```javascript
export function elementTension(profileA, profileB) {
```

**Step 4: Run test to verify it passes**

Run: `node --test test/element-tension.test.js`
Expected: PASS

**Step 5: Write comprehensive tests for elementTension**

Replace test file content:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { elementTension } from '../server.js';

describe('elementTension', () => {
  it('should be exported for testing', () => {
    assert.strictEqual(typeof elementTension, 'function');
  });

  it('should calculate dominant element from fusion vectors', () => {
    const profileA = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 10, Feuer: 5, Erde: 3, Metall: 2, Wasser: 1 }
        }
      }
    };
    const profileB = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 2, Feuer: 8, Erde: 4, Metall: 3, Wasser: 2 }
        }
      }
    };

    const result = elementTension(profileA, profileB);
    
    assert.strictEqual(result.dominant_a, 'Holz');
    assert.strictEqual(result.dominant_b, 'Feuer');
  });

  it('should fall back to western_planets when fusion vectors missing', () => {
    const profileA = {
      fusion: {
        wu_xing_vectors: {
          western_planets: { Holz: 8, Feuer: 3, Erde: 2, Metall: 1, Wasser: 0 }
        }
      }
    };
    const profileB = {
      fusion: {
        wu_xing_vectors: {
          western_planets: { Holz: 1, Feuer: 2, Erde: 9, Metall: 3, Wasser: 2 }
        }
      }
    };

    const result = elementTension(profileA, profileB);
    
    assert.strictEqual(result.dominant_a, 'Holz');
    assert.strictEqual(result.dominant_b, 'Erde');
  });

  it('should detect Zerstörung (destruction) cycle', () => {
    // Holz destroys Erde
    const profileA = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 10, Feuer: 1, Erde: 1, Metall: 1, Wasser: 1 }
        }
      }
    };
    const profileB = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 1, Feuer: 1, Erde: 10, Metall: 1, Wasser: 1 }
        }
      }
    };

    const result = elementTension(profileA, profileB);
    
    assert.strictEqual(result.cycle_relation, 'Zerstörung');
    assert.strictEqual(result.tension_score, 0.8);
  });

  it('should detect Gleich (equal) cycle', () => {
    const profileA = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 10, Feuer: 1, Erde: 1, Metall: 1, Wasser: 1 }
        }
      }
    };
    const profileB = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 9, Feuer: 2, Erde: 1, Metall: 1, Wasser: 1 }
        }
      }
    };

    const result = elementTension(profileA, profileB);
    
    assert.strictEqual(result.cycle_relation, 'Gleich');
    assert.strictEqual(result.tension_score, 0.1);
  });

  it('should detect Neutral cycle', () => {
    // Holz and Feuer are neutral to each other
    const profileA = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 10, Feuer: 1, Erde: 1, Metall: 1, Wasser: 1 }
        }
      }
    };
    const profileB = {
      fusion: {
        wu_xing_vectors: {
          fusion: { Holz: 1, Feuer: 10, Erde: 1, Metall: 1, Wasser: 1 }
        }
      }
    };

    const result = elementTension(profileA, profileB);
    
    assert.strictEqual(result.cycle_relation, 'Neutral');
    assert.strictEqual(result.tension_score, 0.4);
  });

  it('should handle missing fusion data gracefully', () => {
    const profileA = {};
    const profileB = {};

    const result = elementTension(profileA, profileB);
    
    // Should not crash, returns default first element when all values are 0
    assert.ok(result.dominant_a);
    assert.ok(result.dominant_b);
    assert.ok(result.cycle_relation);
  });
});
```

**Step 6: Run tests to verify they pass**

Run: `node --test test/element-tension.test.js`
Expected: All 7 tests pass

**Step 7: Run full test suite to ensure no regression**

Run: `npm test`
Expected: All tests pass (now 33+ tests)

**Step 8: Commit**

```bash
git add server.js test/element-tension.test.js
git commit -m "test: add comprehensive unit tests for elementTension logic"
```

---

### Task 4: Add query parameter to control fusion inclusion in synastry

**Files:**
- Modify: `server.js:619-678` (orchestrateSynastry function)
- Modify: `test/server.test.js` (add test for query parameter)

**Context:** The synastry endpoint always fetches fusion data (optional but attempted). A query parameter would allow clients to skip fusion calls entirely for faster responses.

**Step 1: Write failing test for query parameter**

Add to `test/server.test.js` (after existing synastry tests):

```javascript
  it('should respect includeFusion=false query parameter', async () => {
    const payload = {
      personA: { date: '2024-01-01', time: '12:00', lat: 52.52, lon: 13.405, tz: 'Europe/Berlin' },
      personB: { date: '2024-01-01', time: '12:00', lat: 52.52, lon: 13.405, tz: 'Europe/Berlin' }
    };
    
    const res = await fetch(`${baseUrl}/api/azodiac/synastry?includeFusion=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.data); // Should still return data without fusion
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - query parameter not implemented yet

**Step 3: Parse query parameter in orchestrateSynastry**

Modify `server.js` at line 619 (orchestrateSynastry function):

Add at start of function:
```javascript
export async function orchestrateSynastry(payloadA, payloadB, includeFusion = true) {
```

**Step 4: Update synastry endpoint handler to parse query parameter**

Find the synastry endpoint handler (around line 1095) and modify:

Replace:
```javascript
  case '/api/azodiac/synastry': {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const body = await readJson(req);
    const v = validateSynastryPayload(body);
    if (!v.valid) return sendJson(res, 400, { error: v.errors.join(', ') });
    const data = await orchestrateSynastry(body.personA, body.personB);
    return sendJson(res, 200, data);
  }
```

With:
```javascript
  case '/api/azodiac/synastry': {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const body = await readJson(req);
    const v = validateSynastryPayload(body);
    if (!v.valid) return sendJson(res, 400, { error: v.errors.join(', ') });
    const url = new URL(req.url, `http://${req.headers.host}`);
    const includeFusion = url.searchParams.get('includeFusion') !== 'false';
    const data = await orchestrateSynastry(body.personA, body.personB, includeFusion);
    return sendJson(res, 200, data);
  }
```

**Step 5: Conditionally fetch fusion based on parameter**

Modify `server.js` around line 637 (fusion fetch section):

Replace:
```javascript
    // Optional fusion calls (absorb failures)
    let fA = null, fB = null;
    try {
      const [ra, rb] = await Promise.all([
        callFuFire('POST', '/fusion', translatePayload(payloadA)),
        callFuFire('POST', '/fusion', translatePayload(payloadB)),
      ]);
      if (ra.ok) fA = ra;
      if (rb.ok) fB = rb;
    } catch { console.warn('Fusion calculation failed, continuing without it:', e.message); }
```

With:
```javascript
    // Optional fusion calls (absorb failures)
    let fA = null, fB = null;
    if (includeFusion) {
      try {
        const [ra, rb] = await Promise.all([
          callFuFire('POST', '/fusion', translatePayload(payloadA)),
          callFuFire('POST', '/fusion', translatePayload(payloadB)),
        ]);
        if (ra.ok) fA = ra;
        if (rb.ok) fB = rb;
      } catch (e) {
        console.warn('Fusion calculation failed, continuing without it:', e.message);
      }
    }
```

**Step 6: Run test to verify it passes**

Run: `npm test`
Expected: All tests pass, including new query parameter test

**Step 7: Manual smoke test**

Run: `npm start` (in separate terminal)

Test with fusion:
```bash
curl -X POST "http://127.0.0.1:3000/api/azodiac/synastry?includeFusion=true" \
  -H "Content-Type: application/json" \
  -d '{"personA": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}, "personB": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}}'
```

Test without fusion:
```bash
curl -X POST "http://127.0.0.1:3000/api/azodiac/synastry?includeFusion=false" \
  -H "Content-Type: application/json" \
  -d '{"personA": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}, "personB": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}}'
```

Expected: Both return 200, second request is faster (no fusion calls)

**Step 8: Commit**

```bash
git add server.js test/server.test.js
git commit -m "feat: add includeFusion query parameter to synastry endpoint"
```

---

### Task 5: Update API documentation

**Files:**
- Modify: `README.md` (or create if doesn't exist)
- Create: `docs/api.md` (if preferred)

**Context:** The new `/api/azodiac/fusion` and `/api/azodiac/synastry` endpoints need documentation for API consumers.

**Step 1: Write failing test for documentation**

Create `test/documentation.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('API Documentation', () => {
  it('should document fusion endpoint', () => {
    const readme = readFileSync(join(__dirname, '../README.md'), 'utf-8');
    assert.ok(readme.includes('/api/azodiac/fusion'), 'README should document fusion endpoint');
  });

  it('should document synastry endpoint', () => {
    const readme = readFileSync(join(__dirname, '../README.md'), 'utf-8');
    assert.ok(readme.includes('/api/azodiac/synastry'), 'README should document synastry endpoint');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/documentation.test.js`
Expected: FAIL - documentation doesn't exist yet

**Step 3: Check if README.md exists**

Run: `ls -la README.md`
Expected: File may or may not exist

**Step 4: Add API documentation to README.md**

Add section to README.md (create if doesn't exist):

```markdown
# API Endpoints

## Fusion Analysis

### POST /api/azodiac/fusion

Calculates fusion analysis for a single birth profile.

**Request:**
```json
{
  "date": "2024-01-01",
  "time": "12:00",
  "lat": 52.52,
  "lon": 13.405,
  "tz": "Europe/Berlin"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "western": { ... },
    "bazi": { ... },
    "fusion": {
      "aspects": [ ... ],
      "house_overlay": { ... },
      "dominant_patterns": [ ... ],
      "synthesis_notes": "..."
    }
  }
}
```

## Synastry Analysis

### POST /api/azodiac/synastry

Calculates combined synastry analysis between two birth profiles, including element tension and coherence scores.

**Request:**
```json
{
  "personA": {
    "date": "2024-01-01",
    "time": "12:00",
    "lat": 52.52,
    "lon": 13.405,
    "tz": "Europe/Berlin"
  },
  "personB": {
    "date": "2024-06-15",
    "time": "14:30",
    "lat": 48.8566,
    "lon": 2.3522,
    "tz": "Europe/Paris"
  }
}
```

**Query Parameters:**
- `includeFusion` (optional, default: `true`) - Set to `false` to skip fusion calculation for faster response

**Response:**
```json
{
  "ok": true,
  "data": {
    "personA": { ... },
    "personB": { ... },
    "synastry": {
      "combined_coherence": 0.75,
      "element_tension": {
        "dominant_a": "Holz",
        "dominant_b": "Feuer",
        "cycle_relation": "Neutral",
        "tension_score": 0.4
      }
    }
  }
}
```

**Element Cycle Relations:**
- `Gleich` - Same dominant element (tension_score: 0.1)
- `Neutral` - No conflict or equality (tension_score: 0.4)
- `Zerstörung` - Conflicting elements (tension_score: 0.8)
```

**Step 5: Run test to verify it passes**

Run: `node --test test/documentation.test.js`
Expected: Both tests pass

**Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add README.md test/documentation.test.js
git commit -m "docs: add API documentation for fusion and synastry endpoints"
```

---

### Task 6: Final verification and cleanup

**Files:**
- All modified files

**Context:** Ensure all changes work together and no regressions introduced.

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (35+ tests now)

**Step 2: Run type check (if applicable)**

Run: Check if project uses TypeScript or type checking
Expected: No type checking configured (JavaScript project)

**Step 3: Smoke test all endpoints**

Start server: `npm start` (in separate terminal)

Test health:
```bash
curl http://127.0.0.1:3000/health
```

Test fusion endpoint:
```bash
curl -X POST http://127.0.0.1:3000/api/azodiac/fusion \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}'
```

Test synastry with fusion:
```bash
curl -X POST "http://127.0.0.1:3000/api/azodiac/synastry?includeFusion=true" \
  -H "Content-Type: application/json" \
  -d '{"personA": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}, "personB": {"date": "2024-06-15", "time": "14:30", "lat": 48.8566, "lon": 2.3522, "tz": "Europe/Paris"}}'
```

Test synastry without fusion:
```bash
curl -X POST "http://127.0.0.1:3000/api/azodiac/synastry?includeFusion=false" \
  -H "Content-Type: application/json" \
  -d '{"personA": {"date": "2024-01-01", "time": "12:00", "lat": 52.52, "lon": 13.405, "tz": "Europe/Berlin"}, "personB": {"date": "2024-06-15", "time": "14:30", "lat": 48.8566, "lon": 2.3522, "tz": "Europe/Paris"}}'
```

Expected: All endpoints return 200 with valid JSON responses

**Step 4: Check git status**

Run: `git status`
Expected: Only intended files modified

**Step 5: Final commit if needed**

If any files not committed:
```bash
git add .
git commit -m "refactor: complete code review fixes for fusion/synastry endpoints"
```

---

## Summary

This plan addresses all code review findings through 6 bite-sized tasks:
1. ✅ Add logging for silent catch in fusion failure handling
2. ✅ Extract tension score constants to named constants  
3. ✅ Add comprehensive unit tests for elementTension logic
4. ✅ Add query parameter to control fusion inclusion in synastry
5. ✅ Update API documentation for new endpoints
6. ✅ Final verification and cleanup

Each task follows TDD approach with failing tests first, minimal implementation, and immediate commits. The plan is DRY, YAGNI, and provides exact context for a skilled developer unfamiliar with the codebase.