export const KONCISA_LEADER_MAIN_BEAM_RULES = {
  WITHOUT_OUTLET_BOX: {
    1500: {
      logicalCode: 'KONCISA_LEADER_MAIN_BEAM_1500',
      codigoPT: '22000132416',
      physicalLengthMm: 1410,
    },

    1650: {
      logicalCode: 'KONCISA_LEADER_MAIN_BEAM_1650',
      codigoPT: '22000136966',
      physicalLengthMm: 1560,
    },

    1800: {
      logicalCode: 'KONCISA_LEADER_MAIN_BEAM_1800',
      codigoPT: '22000136965',
      physicalLengthMm: 1710,
    },
  },

  WITH_OUTLET_BOX: {
    1500: {
      logicalCode: 'KONCISA_LEADER_MAIN_BEAM_OUTLET_1500',
      codigoPT: '22000137117',
      physicalLengthMm: 1260,
    },

    1650: {
      logicalCode: 'KONCISA_LEADER_MAIN_BEAM_OUTLET_1650',
      codigoPT: '22000132416',
      physicalLengthMm: 1410,
    },

    1800: {
      logicalCode: 'KONCISA_LEADER_MAIN_BEAM_OUTLET_1800',
      codigoPT: '22000136966',
      physicalLengthMm: 1560,
    },
  },
};

function ceilLeaderMainWidth(realWidthMm) {
  const width = Number(realWidthMm || 0);

  if (!Number.isFinite(width) || width <= 0) return null;
  if (width <= 1500) return 1500;
  if (width <= 1650) return 1650;
  if (width <= 1800) return 1800;

  return null;
}

export function resolveKoncisaLeaderMainBeam({ realMainWidthMm = 1500, hasOutletBox = false }) {
  const billingWidthMm = ceilLeaderMainWidth(realMainWidthMm);

  const groupKey = hasOutletBox ? 'WITH_OUTLET_BOX' : 'WITHOUT_OUTLET_BOX';

  const found = billingWidthMm
    ? KONCISA_LEADER_MAIN_BEAM_RULES[groupKey]?.[billingWidthMm] || null
    : null;

  const isSpecial = !!billingWidthMm && Number(realMainWidthMm) !== billingWidthMm;

  return {
    logicalCode: found?.logicalCode || null,
    codigoPT: found?.codigoPT || null,
    exists: !!found,

    realMainWidthMm: Number(realMainWidthMm),
    billingWidthMm,

    physicalLengthMm: found?.physicalLengthMm || null,

    isSpecial,

    descriptionPrefix: isSpecial ? 'ESPECIAL -' : '',

    descriptionSuffix: isSpecial ? `Medida real ${Number(realMainWidthMm) / 10} cm` : '',
  };
}
