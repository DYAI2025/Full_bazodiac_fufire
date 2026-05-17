import test from 'node:test';
import assert from 'node:assert/strict';
import { elementTension } from '../server.js';

test('elementTension is exported for testing', () => {
  assert.strictEqual(typeof elementTension, 'function');
});

test('elementTension calculates destruction cycle (Zerstörung) with DESTRUCTION score', () => {
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

  assert.strictEqual(result.dominant_a, 'Holz');
  assert.strictEqual(result.dominant_b, 'Erde');
  assert.strictEqual(result.cycle_relation, 'Zerstörung');
  assert.strictEqual(result.tension_score, 0.8);
});

test('elementTension detects same element (Gleich) with SAME score', () => {
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

  assert.strictEqual(result.dominant_a, 'Holz');
  assert.strictEqual(result.dominant_b, 'Holz');
  assert.strictEqual(result.cycle_relation, 'Gleich');
  assert.strictEqual(result.tension_score, 0.1);
});

test('elementTension detects neutral relation with NEUTRAL score', () => {
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

  assert.strictEqual(result.dominant_a, 'Holz');
  assert.strictEqual(result.dominant_b, 'Feuer');
  assert.strictEqual(result.cycle_relation, 'Neutral');
  assert.strictEqual(result.tension_score, 0.4);
});

test('elementTension falls back to western_planets when fusion vectors missing', () => {
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
  assert.strictEqual(result.cycle_relation, 'Zerstörung'); // Holz destroys Erde
  assert.strictEqual(result.tension_score, 0.8);
});

test('elementTension handles missing fusion data gracefully', () => {
  const profileA = {};
  const profileB = {};

  const result = elementTension(profileA, profileB);

  // Should not crash, returns default first element when all values are 0
  assert.strictEqual(result.dominant_a, 'Holz');
  assert.strictEqual(result.dominant_b, 'Holz');
  assert.strictEqual(result.cycle_relation, 'Gleich');
  assert.strictEqual(result.tension_score, 0.1);
});

test('elementTension handles missing wu_xing_vectors gracefully', () => {
  const profileA = {
    fusion: {}
  };
  const profileB = {
    fusion: {}
  };

  const result = elementTension(profileA, profileB);

  // Should not crash, returns default first element when all values are 0
  assert.strictEqual(result.dominant_a, 'Holz');
  assert.strictEqual(result.dominant_b, 'Holz');
  assert.strictEqual(result.cycle_relation, 'Gleich');
  assert.strictEqual(result.tension_score, 0.1);
});

test('elementTension handles all zero vectors (edge case)', () => {
  const profileA = {
    fusion: {
      wu_xing_vectors: {
        fusion: { Holz: 0, Feuer: 0, Erde: 0, Metall: 0, Wasser: 0 }
      }
    }
  };
  const profileB = {
    fusion: {
      wu_xing_vectors: {
        fusion: { Holz: 0, Feuer: 0, Erde: 0, Metall: 0, Wasser: 0 }
      }
    }
  };

  const result = elementTension(profileA, profileB);

  // When all values are 0, should return first element (Holz) for both
  assert.strictEqual(result.dominant_a, 'Holz');
  assert.strictEqual(result.dominant_b, 'Holz');
  assert.strictEqual(result.cycle_relation, 'Gleich');
  assert.strictEqual(result.tension_score, 0.1);
});

test('elementTension calculates destruction cycle (Erde destroys Wasser)', () => {
  // Erde destroys Wasser (bidirectional validation)
  const profileA = {
    fusion: {
      wu_xing_vectors: {
        fusion: { Holz: 1, Feuer: 1, Erde: 10, Metall: 1, Wasser: 1 }
      }
    }
  };
  const profileB = {
    fusion: {
      wu_xing_vectors: {
        fusion: { Holz: 1, Feuer: 1, Erde: 1, Metall: 1, Wasser: 10 }
      }
    }
  };

  const result = elementTension(profileA, profileB);

  assert.strictEqual(result.dominant_a, 'Erde');
  assert.strictEqual(result.dominant_b, 'Wasser');
  assert.strictEqual(result.cycle_relation, 'Zerstörung');
  assert.strictEqual(result.tension_score, 0.8);
});

