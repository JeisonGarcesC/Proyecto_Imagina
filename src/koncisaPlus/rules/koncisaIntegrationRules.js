// src/koncisaPlus/rules/koncisaIntegrationRules.js

/**
 * Reglas para Puesto de Integración Koncisa Plus.
 *
 * Importante:
 * El puesto de integración NO se crea como puesto independiente.
 * Se activa desde un costado terminal de un puesto doble.
 *
 * Al activar integración:
 * - El costado terminal normal del puesto doble se reemplaza por costado doble integración.
 * - Se agregan los componentes del puesto de integración al lado seleccionado.
 */

export const KONCISA_INTEGRATION_ALLOWED_WIDTHS = [1200, 1500];
export const KONCISA_INTEGRATION_ALLOWED_DEPTHS = [600, 750];

export const KONCISA_INTEGRATION_SIDE = {
  LEFT: 'left',
  RIGHT: 'right',
};

export const KONCISA_INTEGRATION_CABLE_ACCESS_TYPE = {
  GROMMET: 'grommet',
  PASACABLE: 'pasacable',
};

export const KONCISA_INTEGRATION_RULES = {
  // =========================
  // ACOPLES
  // =========================
  COUPLES: {
    KONPLUSSCOUPLETOWALL: {
      logicalCode: 'KONPLUSSCOUPLETOWALL',
      codigoPT: '22000132906',
      modelCode: '2KAC210000',
      modelSrc: '/assets/models/koncisaPlus/2KAC210000.glb',
      name: 'ACOPLE DUCTO A PARED PINTADO KONCISA PLUS 2KAC210000',
    },

    KONPLUSSCOUPLETODUCT: {
      logicalCode: 'KONPLUSSCOUPLETODUCT',
      codigoPT: '22000132905',
      modelCode: '2KAC268000',
      modelSrc: '/assets/models/koncisaPlus/2KAC268000.glb',
      name: 'ACOPLE DUCTO A DUCTO 25X10X9CM PINTADO KONCISA PLUS 2KAC268000',
    },
  },

  // =========================
  // COSTADO UNITARIO INTEGRACIÓN
  // Este costado solo se usa en el puesto de integración.
  // Cantidad por integración: 2
  // =========================
  UNIT_LEG: {
    KONPLUSSPYM100023: {
      logicalCode: 'KONPLUSSPYM100023',
      codigoPT: '22000103832',
      modelCode: 'PYM100023',
      modelSrc: '/assets/models/koncisaPlus/PYM100023.glb',
      name: 'COSTADO UNITARIO CUADRADO 2 PULG 71X33X19CM KONCISA PYM100023',
      qty: 2,
    },
  },

  // =========================
  // DUCTO INDIVIDUAL
  // En integración siempre se usa ducto individual sencillo.
  // No usa terminal ni intermedio.
  // Cantidad: 1
  // =========================
  INDIVIDUAL_DUCT: {
    KONPLUSSCABLEDUCT: {
      logicalCode: 'KONPLUSSCABLEDUCT',
      codigoPT: '22000132403',
      modelCode: '2KSO346000',
      modelSrc: '/assets/models/koncisaPlus/2KSO346000.glb',
      name: 'DUCTO CABLEADO SENCILLO INDIVIDUAL PINTADO KONCISA PLUS 2KSO346000',
      qty: 1,
    },
  },

  // =========================
  // GROMMET / PASACABLE
  // Cantidad: 1
  // =========================
  CABLE_ACCESS: {
    GROMMET_ALUMINIUM: {
      logicalCode: 'KONPLUSSGROMMET4TOMAS-ALUMINIUM',
      codigoPT: '22000023626',
      modelCode: 'LKAC250000',
      modelSrc: null,
      name: 'GROMMET ALUMINIO 4 TOMAS ACCESORIO LINK LKAC250000',
      qty: 1,
    },

    PASACABLE_GRIS: {
      logicalCode: 'MPLCUTOUTGRIS',
      codigoPT: '22000648',
      modelCode: 'MPR050004',
      modelSrc: null,
      name: 'TAPA PASACABLE SUPERFICIES VARIAS COLOR GRIS CLARO MPR050004',
      qty: 1,
    },
  },

  // =========================
  // REFUERZO SUPERFICIE A PEDESTAL O INTEGRACIÓN
  // Cantidad: 1
  // =========================
  REINFORCEMENTS: {
    1200: {
      logicalCode: 'KONPLUSSSUPCHANNEL_16_260_120',
      codigoPT: '22000132924',
      modelCode: '2KAC262000',
      modelSrc: '/assets/models/koncisaPlus/2KAC262000.glb',
      name: 'REFUERZO SUPERFICIE A PEDESTAL O INTEGRACION 120CM KONCISA PLUS 2KAC262000',
      qty: 1,
    },

    1500: {
      logicalCode: 'KONPLUSSSUPCHANNEL_16_260_150',
      codigoPT: '22000132925',
      modelCode: '2KAC262000',
      modelSrc: '/assets/models/koncisaPlus/2KAC262000.glb',
      name: 'REFUERZO SUPERFICIE A PEDESTAL O INTEGRACION 150CM KONCISA PLUS 2KAC262000',
      qty: 1,
    },
  },

  // =========================
  // COSTADO DOBLE INTEGRACIÓN
  // Reemplaza el costado terminal del puesto doble.
  // Cantidad: 1 por lado integrado.
  // =========================
  DOUBLE_INTEGRATION_LEGS: {
    1200: {
      logicalCode: 'KONPLUSSPAINTEDLEGINTERMEDIATE_16_120INTEGRACION',
      codigoPT: '22000132926',
      modelCode: '2KSO347000_120',
      modelSrc: '/assets/models/koncisaPlus/2KSO347000_120.glb',
      name: 'COSTADO DOBLE INTEGRACION 120CM PINTADO KONCISA PLUS 2KSO347000',
      qty: 1,
    },

    1500: {
      logicalCode: 'KONPLUSSPAINTEDLEGINTERMEDIATE_16_150INTEGRACION',
      codigoPT: '22000132927',
      modelCode: '2KSO347000_150',
      modelSrc: '/assets/models/koncisaPlus/2KSO347000_150.glb',
      name: 'COSTADO DOBLE INTEGRACION 150CM PINTADO KONCISA PLUS 2KSO347000',
      qty: 1,
    },
  },
};

export function normalizeIntegrationWidthMm(value = 1200) {
  const n = Number(value || 1200);

  if (n <= 1200) return 1200;
  return 1500;
}

export function normalizeIntegrationDepthMm(value = 600) {
  const n = Number(value || 600);

  if (n <= 600) return 600;
  return 750;
}

export function normalizeIntegrationSide(value = KONCISA_INTEGRATION_SIDE.RIGHT) {
  const v = String(value || '')
    .trim()
    .toLowerCase();

  if (['left', 'izq', 'izquierda', 'l'].includes(v)) {
    return KONCISA_INTEGRATION_SIDE.LEFT;
  }

  if (['right', 'der', 'derecha', 'r'].includes(v)) {
    return KONCISA_INTEGRATION_SIDE.RIGHT;
  }

  return KONCISA_INTEGRATION_SIDE.RIGHT;
}

export function normalizeIntegrationCableAccessType(
  value = KONCISA_INTEGRATION_CABLE_ACCESS_TYPE.GROMMET
) {
  const v = String(value || '')
    .trim()
    .toLowerCase();

  if (['pasacable', 'pasa cable', 'cutout', 'tapa'].includes(v)) {
    return KONCISA_INTEGRATION_CABLE_ACCESS_TYPE.PASACABLE;
  }

  return KONCISA_INTEGRATION_CABLE_ACCESS_TYPE.GROMMET;
}

export function resolveKoncisaIntegrationCouple({ type = 'duct' } = {}) {
  const normalizedType = String(type || 'duct')
    .trim()
    .toLowerCase();

  const key =
    normalizedType === 'wall' || normalizedType === 'pared'
      ? 'KONPLUSSCOUPLETOWALL'
      : 'KONPLUSSCOUPLETODUCT';

  const found = KONCISA_INTEGRATION_RULES.COUPLES[key];

  return {
    ...found,
    exists: !!found,
  };
}

export function resolveKoncisaIntegrationUnitLeg() {
  const found = KONCISA_INTEGRATION_RULES.UNIT_LEG.KONPLUSSPYM100023;

  return {
    ...found,
    exists: !!found,
  };
}

export function resolveKoncisaIntegrationIndividualDuct() {
  const found = KONCISA_INTEGRATION_RULES.INDIVIDUAL_DUCT.KONPLUSSCABLEDUCT;

  return {
    ...found,
    exists: !!found,
  };
}

export function resolveKoncisaIntegrationCableAccess({
  type = KONCISA_INTEGRATION_CABLE_ACCESS_TYPE.GROMMET,
} = {}) {
  const normalizedType = normalizeIntegrationCableAccessType(type);

  const key =
    normalizedType === KONCISA_INTEGRATION_CABLE_ACCESS_TYPE.PASACABLE
      ? 'PASACABLE_GRIS'
      : 'GROMMET_ALUMINIUM';

  const found = KONCISA_INTEGRATION_RULES.CABLE_ACCESS[key];

  return {
    ...found,
    type: normalizedType,
    exists: !!found,
  };
}

export function resolveKoncisaIntegrationReinforcement({ widthMm = 1200 } = {}) {
  const normalizedWidthMm = normalizeIntegrationWidthMm(widthMm);
  const found = KONCISA_INTEGRATION_RULES.REINFORCEMENTS[normalizedWidthMm];

  return {
    nominalWidthMm: normalizedWidthMm,
    ...found,
    exists: !!found,
  };
}

export function resolveKoncisaDoubleIntegrationLeg({ widthMm = 1200 } = {}) {
  const normalizedWidthMm = normalizeIntegrationWidthMm(widthMm);
  const found = KONCISA_INTEGRATION_RULES.DOUBLE_INTEGRATION_LEGS[normalizedWidthMm];

  return {
    nominalWidthMm: normalizedWidthMm,
    ...found,
    exists: !!found,
  };
}

/**
 * Retorna el paquete completo de componentes que debe crear una integración.
 *
 * Nota:
 * La superficie NO se resuelve aquí porque reutiliza las mismas reglas de superficie sencilla
 * que ya existen en koncisaSurfaceRules.js.
 */
export function resolveKoncisaIntegrationPackage({
  widthMm = 1200,
  depthMm = 600,
  side = KONCISA_INTEGRATION_SIDE.RIGHT,
  cableAccessType = KONCISA_INTEGRATION_CABLE_ACCESS_TYPE.GROMMET,
  coupleType = 'duct',
} = {}) {
  const normalizedWidthMm = normalizeIntegrationWidthMm(widthMm);
  const normalizedDepthMm = normalizeIntegrationDepthMm(depthMm);
  const normalizedSide = normalizeIntegrationSide(side);
  const normalizedCableAccessType = normalizeIntegrationCableAccessType(cableAccessType);

  return {
    type: 'koncisaIntegration',
    widthMm: normalizedWidthMm,
    depthMm: normalizedDepthMm,
    side: normalizedSide,
    cableAccessType: normalizedCableAccessType,

    doubleIntegrationLeg: resolveKoncisaDoubleIntegrationLeg({
      widthMm: normalizedWidthMm,
    }),

    unitLeg: resolveKoncisaIntegrationUnitLeg(),

    individualDuct: resolveKoncisaIntegrationIndividualDuct(),

    couple: resolveKoncisaIntegrationCouple({
      type: coupleType,
    }),

    cableAccess: resolveKoncisaIntegrationCableAccess({
      type: normalizedCableAccessType,
    }),

    reinforcement: resolveKoncisaIntegrationReinforcement({
      widthMm: normalizedWidthMm,
    }),
  };
}

/**
 * Valida si un costado/parte puede recibir integración.
 * La integración solo debe activarse sobre costados terminales de puestos dobles.
 */
/**
 * Valida si un costado/parte puede recibir integración.
 * La integración solo debe activarse sobre costados terminales de puestos dobles.
 */
export function canAttachKoncisaIntegrationToPart(part) {
  const userData = part?.userData || {};
  const meta = userData?.meta || {};

  const tipoPuesto = String(
    userData.tipoPuesto || meta.tipoPuesto || userData.deskType || meta.deskType || ''
  )
    .trim()
    .toLowerCase();

  const partType = String(
    userData.partType ||
      userData.type ||
      userData.kind ||
      meta.partType ||
      meta.type ||
      meta.category ||
      ''
  )
    .trim()
    .toLowerCase();

  const tipoModulo = String(userData.tipoModulo || meta.tipoModulo || meta.tipo || '')
    .trim()
    .toLowerCase();

  const replaceZone = String(userData.replaceZone || meta.replaceZone || meta.side || '')
    .trim()
    .toUpperCase();

  const isDouble =
    tipoPuesto === 'doble' ||
    tipoPuesto === 'double' ||
    userData.isDouble === true ||
    meta.isDouble === true;

  const isCostado =
    partType.includes('costado') ||
    partType.includes('leg') ||
    partType.includes('costados') ||
    userData.kind === 'costado' ||
    userData.isCostado === true ||
    meta.isCostado === true;

  const isTerminal =
    tipoModulo === 'terminal' ||
    replaceZone === 'LEFT' ||
    replaceZone === 'RIGHT' ||
    userData.isTerminal === true ||
    meta.isTerminal === true ||
    partType.includes('terminal');

  return Boolean(isDouble && isCostado && isTerminal);
}
