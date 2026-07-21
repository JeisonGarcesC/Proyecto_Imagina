// src/koncisaPlus/rules/koncisaCostadoRules.js
// src/koncisaPlus/rules/koncisaCostadoRules.js

function createCostadoAssembly({
  leftLegSrc,
  rightLegSrc,
  leftOffsetMm = {},
  rightOffsetMm = {},
  centerBracketOffsetMm = {},
  crossbar = {},
}) {
  return {
    leftLegSrc,
    rightLegSrc,

    centerBracketSrc: '/assets/models/koncisaPlus/CENTER_BRACKET.glb',

    leftOffsetMm: {
      x: 0,
      y: 0,
      z: 0,
      ...leftOffsetMm,
    },

    rightOffsetMm: {
      x: 0,
      y: 0,
      z: 0,
      ...rightOffsetMm,
    },

    centerBracketOffsetMm: {
      x: 0,
      y: 0,
      z: 0,
      ...centerBracketOffsetMm,
    },

    crossbar: {
      heightMm: 25.4,
      depthMm: 50.8,
      endClearanceMm: 0,

      offsetMm: {
        x: 0,
        y: 685,
        z: 0,
        ...(crossbar?.offsetMm || {}),
      },

      ...crossbar,
    },
  };
}

export const KONCISA_COSTADO_RULES = {
  // =========================
  // SENCILLO - RECT
  // =========================
  // Se conserva por compatibilidad.

  KONPLUSSPAINTEDLEGTERMINAL_16_060_RECT: {
    modelSrc: '/assets/models/koncisaPlus/2KSO330000_60.glb',
    codigoPT: '22000132392',

    assembly: {
      positioningMode: 'bounded-depth-v1',

      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO330000_60.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO330000_60.glb',

      centerBracketSrc: '/assets/models/koncisaPlus/CENTER_BRACKET.glb',

      leftMinZFromPivotMm: -50.869405,
      leftMaxZFromPivotMm: 0,
      rightMinZFromPivotMm: -50.800003,
      rightMaxZFromPivotMm: 0,
      centerBracketMinZFromPivotMm: -126,
      centerBracketMaxZFromPivotMm: 0,
      crossbarInsetXMm: 12.7 + 13.0, //posicion del travesaño

      rootOffsetMm: {
        x: 0,
        y: 0,
        z: -300,
      },

      // Correcciones independientes de cada pieza.
      leftOffsetMm: {
        x: 0,
        y: 0,
        z: 0,
      },

      rightOffsetMm: {
        x: 0,
        y: 0,
        z: 51,
      },

      centerBracketOffsetMm: {
        x: 40,
        y: 0,
        z: 0,
      },

      crossbar: {
        heightMm: 25.4,
        depthMm: 50.8,

        // Se resta a la profundidad real para no invadir las patas.
        endClearanceMm: 51,

        offsetMm: {
          x: 0,
          y: 685,
          z: -25.5,
        },
      },
    },
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_RECT: {
    codigoPT: '22000132393',

    modelSrc: '/assets/models/koncisaPlus/2KSO330000_75.glb',

    assembly: {
      positioningMode: 'bounded-depth-v1',

      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO330000_75.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO330000_75.glb',

      centerBracketSrc: '/assets/models/koncisaPlus/CENTER_BRACKET.glb',

      leftMinZFromPivotMm: -50.869405,
      leftMaxZFromPivotMm: 0,
      rightMinZFromPivotMm: -50.800003,
      rightMaxZFromPivotMm: 0,
      centerBracketMinZFromPivotMm: -126,
      centerBracketMaxZFromPivotMm: 0,
      crossbarInsetXMm: 12.7 + 13.0, //posicion del travesaño

      leftOffsetMm: {
        x: 0,
        y: 0,
        z: 0,
      },

      rightOffsetMm: {
        x: 0,
        y: 0,
        z: 0,
      },

      centerBracketOffsetMm: {
        x: 40,
        y: 0,
        z: 0,
      },

      crossbar: {
        heightMm: 25.4,
        depthMm: 50.8,
        endClearanceMm: 0,

        offsetMm: {
          x: 0,
          y: 685,
          z: 0,
        },
      },
    },
  },

  // =========================
  // SENCILLO - TEK
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TEK_DER: {
    codigoPT: '22000133995',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_60_DER.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_TEK_DER: {
    codigoPT: '22000133996',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_75_DER.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TEK_IZQ: {
    codigoPT: '22000134102',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_60_IZQ.glb',
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_TEK_IZQ: {
    codigoPT: '22000134103',
    modelSrc: '/assets/models/koncisaPlus/2KSO359000_75_IZQ.glb',
  },

  // =========================
  // SENCILLO - ORTOGONAL
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_ORTOGONAL_DER: {
    codigoPT: '22000136064',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_ORTOGONAL_DER: {
    codigoPT: '22000136065',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_ORTOGONAL_IZQ: {
    codigoPT: '22000136064',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_ORTOGONAL_IZQ: {
    codigoPT: '22000136065',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - O
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_O: {
    codigoPT: '22000133828',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_O: {
    codigoPT: '22000133829',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - CURVO
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_CURVO_DER: {
    codigoPT: '22000133830',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_CURVO_DER: {
    codigoPT: '22000133831',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_060_CURVO_IZQ: {
    codigoPT: '22000134104',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_075_CURVO_IZQ: {
    codigoPT: '22000134105',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - TRAP
  // =========================
  // =========================
  // SENCILLO - TRAP
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_TRAP_DER: {
    codigoPT: '22000132396',
    modelSrc: '/assets/models/koncisaPlus/2KSO340000_120.glb',

    assembly: createCostadoAssembly({
      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO340000_TRAP.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO340000_TRAP.glb',

      rightOffsetMm: {
        z: -35,
      },

      crossbar: {
        endClearanceMm: 35,

        offsetMm: {
          z: -17.5,
        },
      },
    }),
  },

  KONPLUSSPAINTEDLEGTERMINAL_16_075_TRAP_DER: {
    codigoPT: '22000132398',
    modelSrc: '/assets/models/koncisaPlus/2KSO340000_150.glb',

    assembly: createCostadoAssembly({
      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO340000_TRAP.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO340000_TRAP.glb',

      rightOffsetMm: {
        z: -35,
      },

      crossbar: {
        endClearanceMm: 35,

        offsetMm: {
          z: -17.5,
        },
      },
    }),
  },

  KONPLUSSPAINTEDLEGTERMINAL_16_060_TRAP_IZQ: {
    codigoPT: '22000132397',
    modelSrc: '/assets/models/koncisaPlus/2KSO340000_120.glb',

    assembly: createCostadoAssembly({
      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO340000_TRAP.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO340000_TRAP.glb',

      leftOffsetMm: {
        z: 35,
      },

      crossbar: {
        endClearanceMm: 35,

        offsetMm: {
          z: 17.5,
        },
      },
    }),
  },

  KONPLUSSPAINTEDLEGTERMINAL_16_075_TRAP_IZQ: {
    codigoPT: '22000132399',
    modelSrc: '/assets/models/koncisaPlus/2KSO340000_150.glb',

    assembly: createCostadoAssembly({
      leftLegSrc: '/assets/models/koncisaPlus/LEFT_KSO340000_TRAP.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_KSO340000_TRAP.glb',
      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO340000_TRAP.glb',
      leftOffsetMm: {
        z: 35,
      },

      crossbar: {
        endClearanceMm: 35,

        offsetMm: {
          z: 17.5,
        },
      },
    }),
  },

  // =========================
  // DOBLE - RECT
  // =========================
  // =========================
  // DOBLE - RECT
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_RECT: {
    codigoPT: '22000132388',
    modelSrc: '/assets/models/koncisaPlus/2KSO328000_120.glb',

    assembly: createCostadoAssembly({
      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO330000_60.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO330000_60.glb',
    }),
  },

  KONPLUSSPAINTEDLEGTERMINAL_16_150_RECT: {
    codigoPT: '22000132389',
    modelSrc: '/assets/models/koncisaPlus/2KSO328000_150.glb',

    assembly: createCostadoAssembly({
      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO330000_60.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO330000_60.glb',
    }),
  },

  // =========================
  // DOBLE - TEK
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_TEK: {
    codigoPT: '22000133822',
    modelSrc: '/assets/models/koncisaPlus/2KSO340000_120.glb',
    assembly: createCostadoAssembly({
      leftLegSrc: '/assets/models/koncisaPlus/LEFT_2KSO340000_120.glb',

      rightLegSrc: '/assets/models/koncisaPlus/RIGHT_2KSO359000_120.glb',
      leftOffsetMm: {
        z: 35,
      },

      crossbar: {
        endClearanceMm: 35,

        offsetMm: {
          z: 17.5,
        },
      },
    }),
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_TEK: {
    codigoPT: '22000133823',
    modelSrc: null,
    assembly: null,
  },

  // =========================
  // DOBLE - ORTOGONAL
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_ORTOGONAL: {
    codigoPT: '22000136066',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_ORTOGONAL: {
    codigoPT: '22000136067',
    modelSrc: null,
  },

  // =========================
  // DOBLE - O
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_O: {
    codigoPT: '22000133826',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_O: {
    codigoPT: '22000133827',
    modelSrc: null,
  },

  // =========================
  // DOBLE - CURVO
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_CURVO: {
    codigoPT: '22000133832',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_CURVO: {
    codigoPT: '22000133833',
    modelSrc: null,
  },

  // =========================
  // DOBLE - TRAP
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_120_TRAP: {
    codigoPT: '22000132404',
    modelSrc: null,
  },
  KONPLUSSPAINTEDLEGTERMINAL_16_150_TRAP: {
    codigoPT: '22000132405',
    modelSrc: null,
  },

  // =========================
  // SENCILLO - RECT CON CAJA TOMAS
  // =========================
  KONPLUSSPAINTEDLEGTERMINAL_16_060_RECT_CAJA_TOMAS: {
    codigoPT: '22000135194',

    modelSrc: '/assets/models/koncisaPlus/2KSO362000.glb',

    /*
     * Por ahora se usa el GLB completo.
     * Más adelante se puede separar en patas,
     * travesaño y caja, igual que el RECT normal.
     */
    assembly: null,
  },
};

function resolveCostadoBillingDepth({ tipoPuesto, realDepthMm }) {
  const depth = Number(realDepthMm || 0);

  if (!Number.isFinite(depth) || depth <= 0) {
    return null;
  }

  if (tipoPuesto === 'doble') {
    if (depth <= 1200) return 1200;
    if (depth <= 1500) return 1500;

    return null;
  }

  if (depth <= 600) return 600;
  if (depth <= 750) return 750;

  return null;
}

function depthTokenFromMm(depthMm) {
  if (depthMm === 600) return '060';
  if (depthMm === 750) return '075';
  if (depthMm === 1200) return '120';
  if (depthMm === 1500) return '150';

  return null;
}

export function resolveKoncisaCostadoTerminal({
  tipoPuesto = 'sencillo',
  depthMm = 600,
  forma = 'RECT',
  lado = 'izq',
}) {
  const tipoPuestoKey = String(tipoPuesto || 'sencillo')
    .trim()
    .toLowerCase();

  const formaKey = String(forma || 'RECT')
    .trim()
    .toUpperCase();

  const ladoKey = String(lado || 'izq')
    .trim()
    .toLowerCase();

  const realDepthMm = Number(depthMm || 0);

  const billingDepthMm = resolveCostadoBillingDepth({
    tipoPuesto: tipoPuestoKey,
    realDepthMm,
  });

  const depthToken = depthTokenFromMm(billingDepthMm);

  const isSpecial = !!billingDepthMm && billingDepthMm !== realDepthMm;

  if (!depthToken) {
    return {
      logicalCode: null,
      codigoPT: null,
      modelSrc: null,
      assembly: null,
      exists: false,

      realDepthMm,
      billingDepthMm: null,
      isSpecial: false,

      descriptionPrefix: '',
      descriptionSuffix: '',
    };
  }

  let logicalCode = null;

  if (tipoPuestoKey === 'sencillo') {
    const formasConLado = ['TEK', 'ORTOGONAL', 'CURVO', 'TRAP'];

    if (formasConLado.includes(formaKey)) {
      const ladoToken = ladoKey === 'der' ? 'DER' : 'IZQ';

      logicalCode = `KONPLUSSPAINTEDLEGTERMINAL_16_${depthToken}_${formaKey}_${ladoToken}`;
    } else {
      logicalCode = `KONPLUSSPAINTEDLEGTERMINAL_16_${depthToken}_${formaKey}`;
    }
  }

  if (tipoPuestoKey === 'doble') {
    logicalCode = `KONPLUSSPAINTEDLEGTERMINAL_16_${depthToken}_${formaKey}`;
  }

  const found = logicalCode ? KONCISA_COSTADO_RULES[logicalCode] || null : null;

  return {
    logicalCode,

    codigoPT: found?.codigoPT || null,
    modelSrc: found?.modelSrc || null,
    assembly: found?.assembly || null,

    exists: !!found,

    realDepthMm,
    billingDepthMm,
    isSpecial,

    descriptionPrefix: isSpecial ? 'ESPECIAL -' : '',

    descriptionSuffix: isSpecial ? `Medida real ${realDepthMm / 10} cm` : '',
  };
}
