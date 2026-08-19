export const CRITTERIUM8_JUNCTION_TYPES = Object.freeze([
  'TERMINAL',
  'DEG_90',
  'DEG_180',
  'DEG_180_TYPE_B',
  'DEG_45_135',
  'DEG_120',
  'T',
  'X',
]);

export const CRITTERIUM8_DUCT_REPLACEMENT_RULE = Object.freeze({
  replacementTypes: Object.freeze(['TERMINAL', 'UPRIGHT', 'T', 'X']),
  replacesMatchingJunctionKit: true,
  uprightMinimumHeightCm: 204,
});

export function isCritterium8JunctionType(type) {
  return CRITTERIUM8_JUNCTION_TYPES.includes(String(type || '').trim().toUpperCase());
}

export function canCritterium8DuctReplaceJunction({ ductType, heightCm } = {}) {
  const normalizedType = String(ductType || '').trim().toUpperCase();
  if (!CRITTERIUM8_DUCT_REPLACEMENT_RULE.replacementTypes.includes(normalizedType)) return false;
  if (normalizedType === 'UPRIGHT') return Number(heightCm) >= 204;
  return true;
}
