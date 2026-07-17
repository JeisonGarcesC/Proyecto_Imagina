// src/koncisaPlus/leader/rules/leaderSurfaceRules.js

export const KONCISA_LEADER_MAIN_SURFACE_RULES = {
  // FORMICA 30 MM
  '1500x600x30-FORMICA': {
    codigoPT: '22000136831',
  },
  '1500x750x30-FORMICA': {
    codigoPT: '22000136832',
  },
  '1650x600x30-FORMICA': {
    codigoPT: '22000136833',
  },
  '1650x750x30-FORMICA': {
    codigoPT: '22000136834',
  },
  '1800x600x30-FORMICA': {
    codigoPT: '22000136835',
  },
  '1800x750x30-FORMICA': {
    codigoPT: '22000136836',
  },

  // MELAMINA 25 MM
  '1500x600x25-MELAMINA': {
    codigoPT: '22000136670',
  },
  '1500x750x25-MELAMINA': {
    codigoPT: '22000136671',
  },
  '1650x600x25-MELAMINA': {
    codigoPT: '22000136672',
  },
  '1650x750x25-MELAMINA': {
    codigoPT: '22000136673',
  },
  '1800x600x25-MELAMINA': {
    codigoPT: '22000136674',
  },
  '1800x750x25-MELAMINA': {
    codigoPT: '22000136675',
  },
};

export const KONCISA_LEADER_RETURN_SURFACE_RULES = {
  RIGHT: {
    900: {
      codigoPT: '22000135017',
    },
    1000: {
      codigoPT: '22000135018',
    },
  },

  LEFT: {
    900: {
      codigoPT: '22000135019',
    },
    1000: {
      codigoPT: '22000135020',
    },
  },
};

function ceilFromList(realValue, allowedValues) {
  const value = Number(realValue || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return [...allowedValues].sort((a, b) => a - b).find((allowed) => value <= allowed) || null;
}

export function resolveLeaderMainWidthMm(realWidthMm) {
  return ceilFromList(realWidthMm, [1500, 1650, 1800]);
}

export function resolveLeaderMainDepthMm(realDepthMm) {
  return ceilFromList(realDepthMm, [600, 750]);
}

export function resolveLeaderReturnLengthMm(realLengthMm) {
  return ceilFromList(realLengthMm, [900, 1000]);
}

export function resolveKoncisaLeaderMainSurface({
  realWidthMm = 1500,
  realDepthMm = 600,
  thicknessMm = 30,
  materialType = 'FORMICA',
}) {
  const billingWidthMm = resolveLeaderMainWidthMm(realWidthMm);
  const billingDepthMm = resolveLeaderMainDepthMm(realDepthMm);

  const materialKey = String(materialType || 'FORMICA')
    .trim()
    .toUpperCase();

  if (!billingWidthMm || !billingDepthMm) {
    return {
      logicalCode: null,
      codigoPT: null,
      exists: false,
      realWidthMm,
      realDepthMm,
      billingWidthMm,
      billingDepthMm,
      isSpecial: false,
      descriptionPrefix: '',
      descriptionSuffix: '',
    };
  }

  const logicalCode = `${billingWidthMm}x${billingDepthMm}x${thicknessMm}-${materialKey}`;

  const found = KONCISA_LEADER_MAIN_SURFACE_RULES[logicalCode] || null;

  const isSpecial =
    Number(realWidthMm) !== billingWidthMm || Number(realDepthMm) !== billingDepthMm;

  return {
    logicalCode,
    codigoPT: found?.codigoPT || null,
    exists: !!found,

    realWidthMm: Number(realWidthMm),
    realDepthMm: Number(realDepthMm),

    billingWidthMm,
    billingDepthMm,

    isSpecial,

    descriptionPrefix: isSpecial ? 'ESPECIAL -' : '',

    descriptionSuffix: isSpecial
      ? `Medida real: Profundidad ${Number(realDepthMm) / 10} cm, Largo ${Number(realWidthMm) / 10} cm`
      : '',
  };
}

export function resolveKoncisaLeaderReturnSurface({ side = 'RIGHT', realLengthMm = 900 }) {
  const sideKey =
    String(side || 'RIGHT')
      .trim()
      .toUpperCase() === 'LEFT'
      ? 'LEFT'
      : 'RIGHT';

  const billingLengthMm = resolveLeaderReturnLengthMm(realLengthMm);

  const found = billingLengthMm
    ? KONCISA_LEADER_RETURN_SURFACE_RULES?.[sideKey]?.[billingLengthMm] || null
    : null;

  const isSpecial = !!billingLengthMm && Number(realLengthMm) !== billingLengthMm;

  return {
    logicalCode: billingLengthMm ? `KONCISA_LEADER_RETURN_${sideKey}_${billingLengthMm}` : null,

    codigoPT: found?.codigoPT || null,
    exists: !!found,

    side: sideKey,

    realLengthMm: Number(realLengthMm),
    billingLengthMm,

    isSpecial,

    descriptionPrefix: isSpecial ? 'ESPECIAL -' : '',

    descriptionSuffix: isSpecial ? `Medida real: Largo ${Number(realLengthMm) / 10} cm` : '',
  };
}
