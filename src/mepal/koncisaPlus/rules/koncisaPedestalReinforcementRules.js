export const KONCISA_PEDESTAL_REINFORCEMENT_RULES = {
  1000: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_260_100',
    code: '22000132923',
    modelCode: '2KAC262000',
    name: 'REFUERZO SUPERFICIE A PEDESTAL O INTEGRACION 100CM KONCISA PLUS 2KAC262000',
    dimMm: {
      widthMm: 440,
      depthMm: 155,
      heightMm: 35,
    },
  },

  1200: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_260_120',
    code: '22000132924',
    modelCode: '2KAC262000',
    name: 'REFUERZO SUPERFICIE A PEDESTAL O INTEGRACION 120CM KONCISA PLUS 2KAC262000',
    dimMm: {
      widthMm: 640,
      depthMm: 155,
      heightMm: 35,
    },
  },

  1500: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_260_150',
    code: '22000132925',
    modelCode: '2KAC262000',
    name: 'REFUERZO SUPERFICIE A PEDESTAL O INTEGRACION 150CM KONCISA PLUS 2KAC262000',
    dimMm: {
      widthMm: 940,
      depthMm: 155,
      heightMm: 35,
    },
  },
};

export function normalizePedestalReinforcementNominalWidth(nominalWidthMm) {
  const n = Number(nominalWidthMm || 0);

  if (n <= 1000) return 1000;
  if (n <= 1200) return 1200;
  return 1500;
}

export function resolveKoncisaPedestalReinforcement({ nominalWidthMm = 1200 } = {}) {
  const key = normalizePedestalReinforcementNominalWidth(nominalWidthMm);
  const found = KONCISA_PEDESTAL_REINFORCEMENT_RULES[key];

  return {
    nominalWidthMm: key,
    ...found,
  };
}

export function shouldReplaceKoncisaBeamWithPedestalReinforcement({ layoutType } = {}) {
  return String(layoutType || '').trim().toUpperCase() !== 'LEADER';
}

export function resolveKoncisaPedestalReinforcementPosition({
  reinforcementPositionMm,
  costadoPositionMm,
  towardCostadoMm = 0, //ubicacion de refuerzo hacia el costado
} = {}) {
  const reinforcement = reinforcementPositionMm || {};
  const costado = costadoPositionMm || {};
  const dx = Number(costado.x || 0) - Number(reinforcement.x || 0);
  const dz = Number(costado.z || 0) - Number(reinforcement.z || 0);
  const horizontalDistance = Math.hypot(dx, dz);
  const travelMm = Number(towardCostadoMm || 0);

  if (!horizontalDistance || !travelMm) {
    return {
      x: Number(reinforcement.x || 0),
      y: Number(reinforcement.y || 0),
      z: Number(reinforcement.z || 0),
    };
  }

  return {
    x: Number(reinforcement.x || 0) + (dx / horizontalDistance) * travelMm,
    y: Number(reinforcement.y || 0),
    z: Number(reinforcement.z || 0) + (dz / horizontalDistance) * travelMm,
  };
}
