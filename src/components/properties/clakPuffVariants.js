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
];

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

export function normalizeClakPuffCode(code) {
  return String(code || '')
    .trim()
    .replace(/_2$/, '');
}

export function getClakVariantOptionsByCode(code) {
  return CODE_TO_GROUP.get(normalizeClakPuffCode(code)) || null;
}

export function isClakPuffVariantPart(part) {
  if (part?.kind !== 'CLAK') return false;
  // either part of the grouped variants OR one of the seat codes
  const code = normalizeClakPuffCode(part?.code);
  return !!getClakVariantOptionsByCode(code) || !!SEAT_VARIANTS[code] || !!MODULE_VARIANTS[code];
}
export const CLAK_SWAP_ALLOWED_CODES = new Set([
  ...CODE_TO_GROUP.keys(),
  ...Object.keys(SEAT_VARIANTS),
  ...Object.keys(MODULE_VARIANTS),
]);
