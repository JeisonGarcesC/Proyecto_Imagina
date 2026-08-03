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
