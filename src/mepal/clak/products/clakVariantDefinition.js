const CLAK_VARIANT_GROUPS = [
  [
    { code: '22000034855', label: '60cm' },
    { code: '22000035387', label: '120cm' },
    { code: '22000035388', label: '180cm' },
  ],
  [
    { code: '22000035912', label: '120cm' },
    { code: '22000035913', label: '180cm' },
  ],
  [
    { code: '22000035909', label: '60cm' },
    { code: '22000035910', label: '120cm' },
    { code: '22000035911', label: '180cm' },
  ],
  [
    { code: '22000035996', label: '120cm' },
    { code: '22000035997', label: '180cm' },
  ],
  [
    { code: 'BP', label: 'Modulo Clak 1.50 x 0.71 m' },
    { code: 'BP_grommet', label: 'Modulo Clak 1.50 x 0.71 m con grommet' },
    { code: 'BA', label: 'Modulo Clak 1.80 x 0.71 m' },
    { code: 'BA_grommet', label: 'Modulo Clak 1.80 x 0.71 m con grommet' },
    { code: 'AP', label: 'Modulo Clak 1.50 x 0.97 m' },
    { code: 'AP_grommet', label: 'Modulo Clak 1.50 x 0.97 m con grommet' },
    { code: 'AA', label: 'Modulo Clak 1.80 x 0.97 m' },
    { code: 'AA_grommet', label: 'Modulo Clak 1.80 x 0.97 m con grommet' },
  ],
];

const MATRIX_VARIANTS = {
  BP: {
    code: 'BP',
    height: '0.71',
    width: '1.5',
    grommet: false,
    label: 'Modulo Clak 1.50 x 0.71 m',
  },
  BP_grommet: {
    code: 'BP_grommet',
    height: '0.71',
    width: '1.5',
    grommet: true,
    label: 'Modulo Clak 1.50 x 0.71 m con grommet',
  },
  BA: {
    code: 'BA',
    height: '0.71',
    width: '1.8',
    grommet: false,
    label: 'Modulo Clak 1.80 x 0.71 m',
  },
  BA_grommet: {
    code: 'BA_grommet',
    height: '0.71',
    width: '1.8',
    grommet: true,
    label: 'Modulo Clak 1.80 x 0.71 m con grommet',
  },
  AP: {
    code: 'AP',
    height: '0.97',
    width: '1.5',
    grommet: false,
    label: 'Modulo Clak 1.50 x 0.97 m',
  },
  AP_grommet: {
    code: 'AP_grommet',
    height: '0.97',
    width: '1.5',
    grommet: true,
    label: 'Modulo Clak 1.50 x 0.97 m con grommet',
  },
  AA: {
    code: 'AA',
    height: '0.97',
    width: '1.8',
    grommet: false,
    label: 'Modulo Clak 1.80 x 0.97 m',
  },
  AA_grommet: {
    code: 'AA_grommet',
    height: '0.97',
    width: '1.8',
    grommet: true,
    label: 'Modulo Clak 1.80 x 0.97 m con grommet',
  },
};

const CODE_TO_GROUP = new Map();
for (const group of CLAK_VARIANT_GROUPS) {
  for (const item of group) {
    CODE_TO_GROUP.set(item.code, group);
  }
}

// Seat variants (grommet / size combinations)
const SEAT_VARIANTS = {
  // corrected: 150cm -> 22000036129, 180cm -> 22000036131 (with grommet)
  '22000036131': { code: '22000036131', grommet: true, size: '180', label: '180cm' },
  '22000036129': { code: '22000036129', grommet: true, size: '150', label: '150cm' },
  // corrected: 150cm -> 22000036072, 180cm -> 22000036074 (without grommet)
  '22000036074': { code: '22000036074', grommet: false, size: '180', label: '180cm' },
  '22000036072': { code: '22000036072', grommet: false, size: '150', label: '150cm' },
};

export function isSeatCode(code) {
  return !!SEAT_VARIANTS[normalizeClakPuffCode(code)];
}

export function getSeatVariantByCode(code) {
  return SEAT_VARIANTS[normalizeClakPuffCode(code)] || null;
}

export function getSeatCodeFor(grommet, size) {
  for (const k of Object.keys(SEAT_VARIANTS)) {
    const v = SEAT_VARIANTS[k];
    if (v.grommet === !!grommet && String(v.size) === String(size)) return v.code;
  }
  return null;
}

// Module variants (width x height)
const MODULE_VARIANTS = {
  '22000036396': { code: '22000036396', width: 174, height: 120, label: '174cm x 120cm' },
  '22000036397': { code: '22000036397', width: 174, height: 180, label: '174cm x 180cm' },
  '22000036398': { code: '22000036398', width: 200, height: 120, label: '200cm x 120cm' },
  '22000036399': { code: '22000036399', width: 200, height: 180, label: '200cm x 180cm' },
};

export function isModuleCode(code) {
  return !!MODULE_VARIANTS[normalizeClakPuffCode(code)];
}

export function getModuleVariantByCode(code) {
  return MODULE_VARIANTS[normalizeClakPuffCode(code)] || null;
}

export function getModuleCodeFor(width, height) {
  for (const k of Object.keys(MODULE_VARIANTS)) {
    const v = MODULE_VARIANTS[k];
    if (Number(v.width) === Number(width) && Number(v.height) === Number(height)) return v.code;
  }
  return null;
}

export function getSeatGroupCodesByCode(code) {
  const normalized = normalizeClakPuffCode(code);
  const seat = SEAT_VARIANTS[normalized];
  if (!seat) return [];
  const res = [];
  // Group seats by size only (ignore grommet) so a single representative shows per size
  for (const k of Object.keys(SEAT_VARIANTS)) {
    const v = SEAT_VARIANTS[k];
    if (String(v.size) === String(seat.size)) res.push(k);
  }
  return res;
}

export function getModuleGroupCodesByCode(code) {
  const normalized = normalizeClakPuffCode(code);
  const mod = MODULE_VARIANTS[normalized];
  if (!mod) return [];
  const res = [];
  for (const k of Object.keys(MODULE_VARIANTS)) {
    const v = MODULE_VARIANTS[k];
    if (Number(v.width) === Number(mod.width) && Number(v.height) === Number(mod.height)) res.push(k);
  }
  return res;
}

export function isMatrixCode(code) {
  return !!MATRIX_VARIANTS[normalizeClakPuffCode(code)];
}

export function getMatrixVariantByCode(code) {
  return MATRIX_VARIANTS[normalizeClakPuffCode(code)] || null;
}

export function getMatrixCodeFor(height, width, grommet) {
  const heightKey = String(height || '').trim();
  const widthKey = String(width || '').trim();
  const grommetKey = !!grommet;

  for (const variantCode of Object.keys(MATRIX_VARIANTS)) {
    const variant = MATRIX_VARIANTS[variantCode];
    if (
      String(variant.height) === heightKey &&
      String(variant.width) === widthKey &&
      variant.grommet === grommetKey
    ) {
      return variant.code;
    }
  }

  return null;
}

export function normalizeClakPuffCode(code) {
  const normalized = String(code || '')
    .trim()
    .replace(/_2$/, '');

  if (/_grommet$/i.test(normalized)) {
    return `${normalized.replace(/_grommet$/i, '').toUpperCase()}_grommet`;
  }

  return normalized.toUpperCase();
}

export function getClakVariantOptionsByCode(code) {
  return CODE_TO_GROUP.get(normalizeClakPuffCode(code)) || null;
}

export function isClakPuffVariantPart(part) {
  if (part?.kind !== 'CLAK') return false;
  // grouped variants, matrix variants, seat variants or module variants
  const code = normalizeClakPuffCode(part?.code);
  return (
    !!getClakVariantOptionsByCode(code) ||
    !!MATRIX_VARIANTS[code] ||
    !!SEAT_VARIANTS[code] ||
    !!MODULE_VARIANTS[code]
  );
}
export const CLAK_SWAP_ALLOWED_CODES = new Set([
  ...CODE_TO_GROUP.keys(),
  ...Object.keys(MATRIX_VARIANTS),
  ...Object.keys(SEAT_VARIANTS),
  ...Object.keys(MODULE_VARIANTS),
]);
