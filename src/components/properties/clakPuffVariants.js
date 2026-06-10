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
  return !!getClakVariantOptionsByCode(part?.code);
}

export const CLAK_SWAP_ALLOWED_CODES = new Set(CODE_TO_GROUP.keys());
