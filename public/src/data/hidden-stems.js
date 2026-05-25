// Hidden Stems Table (Zàng Gān 藏干) — classical BaZi literature, immutable.
//
// Source of truth for both server.js (normalizePillar) AND frontend
// BaZi enrichment. The table is keyed on the earthly-branch CHARACTER
// (子/丑/寅/.../亥); a Pinyin-keyed mirror is provided alongside so
// frontend code that receives API responses (which return Pinyin like
// "Mao", "Xu", "Chen") can resolve without converting first.
//
// Each entry: { stem (char), element (German), weight, polarity }
//
// Contract test in test/hidden-stems-contract.test.js asserts the two
// key views (BY_CHAR + BY_PINYIN) are exact mirrors.

export const HIDDEN_STEMS_BY_CHAR = {
  '子': [{ stem: '癸', element: 'Wasser', weight: 10.0, polarity: 'Yin'  }],
  '丑': [{ stem: '己', element: 'Erde',   weight:  6.0, polarity: 'Yin'  },
         { stem: '癸', element: 'Wasser', weight:  3.0, polarity: 'Yin'  },
         { stem: '辛', element: 'Metall', weight:  1.0, polarity: 'Yin'  }],
  '寅': [{ stem: '甲', element: 'Holz',   weight:  7.0, polarity: 'Yang' },
         { stem: '丙', element: 'Feuer',  weight:  2.0, polarity: 'Yang' },
         { stem: '戊', element: 'Erde',   weight:  1.0, polarity: 'Yang' }],
  '卯': [{ stem: '乙', element: 'Holz',   weight: 10.0, polarity: 'Yin'  }],
  '辰': [{ stem: '戊', element: 'Erde',   weight:  6.0, polarity: 'Yang' },
         { stem: '乙', element: 'Holz',   weight:  3.0, polarity: 'Yin'  },
         { stem: '癸', element: 'Wasser', weight:  1.0, polarity: 'Yin'  }],
  '巳': [{ stem: '丙', element: 'Feuer',  weight:  7.0, polarity: 'Yang' },
         { stem: '庚', element: 'Metall', weight:  2.0, polarity: 'Yang' },
         { stem: '戊', element: 'Erde',   weight:  1.0, polarity: 'Yang' }],
  '午': [{ stem: '丁', element: 'Feuer',  weight:  7.0, polarity: 'Yin'  },
         { stem: '己', element: 'Erde',   weight:  3.0, polarity: 'Yin'  }],
  '未': [{ stem: '己', element: 'Erde',   weight:  6.0, polarity: 'Yin'  },
         { stem: '丁', element: 'Feuer',  weight:  3.0, polarity: 'Yin'  },
         { stem: '乙', element: 'Holz',   weight:  1.0, polarity: 'Yin'  }],
  '申': [{ stem: '庚', element: 'Metall', weight:  7.0, polarity: 'Yang' },
         { stem: '壬', element: 'Wasser', weight:  2.0, polarity: 'Yang' },
         { stem: '戊', element: 'Erde',   weight:  1.0, polarity: 'Yang' }],
  '酉': [{ stem: '辛', element: 'Metall', weight: 10.0, polarity: 'Yin'  }],
  '戌': [{ stem: '戊', element: 'Erde',   weight:  6.0, polarity: 'Yang' },
         { stem: '辛', element: 'Metall', weight:  3.0, polarity: 'Yin'  },
         { stem: '丁', element: 'Feuer',  weight:  1.0, polarity: 'Yin'  }],
  '亥': [{ stem: '壬', element: 'Wasser', weight:  7.0, polarity: 'Yang' },
         { stem: '甲', element: 'Holz',   weight:  3.0, polarity: 'Yang' }],
};

// Earthly-branch Pinyin → CJK character. Canonical 12-branch transliteration.
export const BRANCH_PINYIN_TO_CHAR = {
  Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳',
  Wu: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥',
};

// Build Pinyin-keyed mirror at module load — single source of truth above.
export const HIDDEN_STEMS_BY_PINYIN = Object.fromEntries(
  Object.entries(BRANCH_PINYIN_TO_CHAR).map(([pinyin, char]) => [pinyin, HIDDEN_STEMS_BY_CHAR[char]]),
);

// Returns the hidden-stem array for either a CJK character or a Pinyin
// branch name. Empty array on unknown input — callers decide how to surface.
export function getHiddenStems(branch) {
  if (!branch) return [];
  if (HIDDEN_STEMS_BY_CHAR[branch])   return HIDDEN_STEMS_BY_CHAR[branch];
  if (HIDDEN_STEMS_BY_PINYIN[branch]) return HIDDEN_STEMS_BY_PINYIN[branch];
  return [];
}
