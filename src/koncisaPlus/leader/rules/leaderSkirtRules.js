// src/koncisaPlus/leader/rules/leaderSkirtRules.js

const LEADER_SKIRT_RULES = {
  1500: {
    nominalWidthMm: 1500,
    realLengthMm: 1210,

    codes: {
      FORMICA: '22000100968',
      MELAMINA: '22000103931',
      METALICA: '22000103841',
    },
  },

  1800: {
    nominalWidthMm: 1800,
    realLengthMm: 1510,

    codes: {
      FORMICA: '22000100969',
      MELAMINA: '22000103913',
      METALICA: '22000103842',
    },
  },
};

function normalizeMaterialType(value) {
  const normalized = String(value || 'METALICA')
    .trim()
    .toUpperCase();

  if (normalized === 'FORMICA') {
    return 'FORMICA';
  }

  if (normalized === 'MELAMINA') {
    return 'MELAMINA';
  }

  return 'METALICA';
}

/**
 * La falda es rematable entre 1500 y 1800 mm nominales.
 *
 * Medida física:
 * ancho nominal de la superficie - 290 mm.
 *
 * Ejemplos:
 * 1500 -> 1210 mm
 * 1800 -> 1510 mm
 */
function resolveBillingWidth(realMainWidthMm) {
  const width = Number(realMainWidthMm);

  if (!Number.isFinite(width) || width <= 0) {
    return 1500;
  }

  if (width <= 1500) {
    return 1500;
  }

  return 1800;
}

export function resolveKoncisaLeaderSkirt({
  realMainWidthMm = 1500,
  materialType = 'METALICA',
} = {}) {
  const normalizedRealWidthMm = Math.max(1, Number(realMainWidthMm) || 1500);

  const normalizedMaterialType = normalizeMaterialType(materialType);

  const billingWidthMm = resolveBillingWidth(normalizedRealWidthMm);

  const rule = LEADER_SKIRT_RULES[billingWidthMm] || null;

  /*
   * La medida real siempre corresponde al ancho real
   * de la superficie principal menos 290 mm.
   */
  const physicalLengthMm = Math.max(1, normalizedRealWidthMm - 290);

  const isSpecial = normalizedRealWidthMm !== billingWidthMm;

  const codigoPT = rule?.codes?.[normalizedMaterialType] || null;

  return {
    exists: !!codigoPT,

    codigoPT,

    logicalCode: `KONCISA_LEADER_SKIRT_${normalizedMaterialType}_${billingWidthMm}`,

    materialType: normalizedMaterialType,

    realMainWidthMm: normalizedRealWidthMm,

    billingWidthMm,

    physicalLengthMm,

    heightMm: 300,

    thicknessMm: 15,

    hasEdge: normalizedMaterialType === 'FORMICA' || normalizedMaterialType === 'MELAMINA',

    edgeThicknessMm:
      normalizedMaterialType === 'FORMICA' || normalizedMaterialType === 'MELAMINA' ? 15 : 0,

    isSpecial,

    descriptionPrefix: isSpecial ? 'ESPECIAL -' : '',

    descriptionSuffix: isSpecial ? `Medida real ${physicalLengthMm} x 300 x 15 mm` : '',
  };
}

export { LEADER_SKIRT_RULES };
