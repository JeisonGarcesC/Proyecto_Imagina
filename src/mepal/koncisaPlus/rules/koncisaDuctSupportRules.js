export const KONCISA_DUCT_SUPPORTS = {
  sencillo: {
    logicalCode: 'KONPLUSS2KSO351000',
    code: '22000132992',
    modelCode: '2KSO351000',
    modelSrc: '/assets/models/koncisaPlus/2KSO351000.glb',
    name: 'SOPORTE DUCTO SENCILLO 9X14X10CM PINTADO KONCISA 2KSO351000',
  },

  doble: {
    logicalCode: 'KONPLUSS2KSO342000',
    code: '22000132904',
    modelCode: '2KSO342000',
    modelSrc: '/assets/models/koncisaPlus/2KSO342000.glb',
    name: 'SOPORTE DUCTO DOBLE 18X12X10CM PINTADO KONCISA 2KSO342000',
  },
};

/**
 * Offsets en milímetros desde el pedestal hacia el soporte ducto.
 *
 * x = largo del puesto
 * y = altura
 * z = profundidad
 *
 * Estos valores son iniciales para calibración visual.
 */
export const KONCISA_DUCT_SUPPORT_OFFSETS_FROM_PEDESTAL = {
  sencillo: {
    LEFT: {
      x: 0,
      y: 710 - 100,
      z: -290 - 180,
      rotY: 0,
    },

    RIGHT: {
      x: 230,
      y: 710 - 100,
      z: -470,
      rotY: 0,
    },

    INTERMEDIO: {
      x: -44, //ojo toca tener un condiciona para cuando sea izquierdo
      y: 710 - 100,
      z: -475,
      rotY: 0,
    },
  },

  doble: {
    LEFT: {
      x: -250,
      y: 710 - 100,
      z: 549,
      rotY: 0,
    },

    RIGHT: {
      x: 250,
      y: 710 - 100,
      z: -549,
      rotY: 0,
    },

    INTERMEDIO: {
      x: -284,
      y: 710 - 100,
      z: 549,
      rotY: 0,
    },
  },
};

// El soporte ya hereda el desplazamiento del pedestal porque su posición se calcula
// desde este. Esta tabla suma únicamente una calibración relativa adicional.
export const KONCISA_DUCT_SUPPORT_DEPTH_Z_ADJUSTMENTS_MM = {
  sencillo: {
    LEFT: { 600: 0, 700: 0, 750: 75 },
    RIGHT: { 600: 0, 700: 0, 750: 75 },
    INTERMEDIO: { 600: 0, 700: 0, 750: 75 },
  },
  doble: {
    LEFT: { 1200: 0, 1300: 0, 1400: 0, 1500: 150 },
    RIGHT: { 1200: 0, 1300: 0, 1400: 0, 1500: 150 },
    INTERMEDIO: { 1200: 0, 1300: 0, 1400: 0, 1500: 150 },
  },
};

export function normalizeDuctSupportTipoPuesto(value) {
  return String(value || '').toLowerCase() === 'doble' ? 'doble' : 'sencillo';
}

export function normalizeDuctSupportZone(value) {
  const text = String(value || '')
    .trim()
    .toUpperCase();

  if (['LEFT', 'IZQUIERDA', 'IZQ'].includes(text)) return 'LEFT';
  if (['RIGHT', 'DERECHA', 'DER'].includes(text)) return 'RIGHT';
  if (['INTERMEDIO', 'INTERMEDIA', 'CENTER', 'CENTRO'].includes(text)) return 'INTERMEDIO';

  return 'RIGHT';
}

export function shouldCreateKoncisaPedestalDuctSupport({ layoutType } = {}) {
  return String(layoutType || '').trim().toUpperCase() !== 'LEADER';
}

export function resolveKoncisaDuctSupport({
  tipoPuesto = 'sencillo',
  replaceZone = 'RIGHT',
  realDepthMm,
} = {}) {
  const puestoKey = normalizeDuctSupportTipoPuesto(tipoPuesto);
  const zoneKey = normalizeDuctSupportZone(replaceZone);
  const resolvedDepthMm = Number(realDepthMm || (puestoKey === 'doble' ? 1200 : 600));

  const support = KONCISA_DUCT_SUPPORTS[puestoKey];

  const configuredOffset = KONCISA_DUCT_SUPPORT_OFFSETS_FROM_PEDESTAL?.[puestoKey]?.[zoneKey] || {
    x: 0,
    y: 710,
    z: 0,
    rotY: 0,
  };
  const depthZAdjustmentMm = Number(
    KONCISA_DUCT_SUPPORT_DEPTH_Z_ADJUSTMENTS_MM?.[puestoKey]?.[zoneKey]?.[resolvedDepthMm] || 0
  );
  const offset = {
    ...configuredOffset,
    z: Number(configuredOffset.z || 0) + depthZAdjustmentMm,
  };

  return {
    ...support,
    tipoPuesto: puestoKey,
    replaceZone: zoneKey,
    realDepthMm: resolvedDepthMm,
    depthZAdjustmentMm,
    offsetMm: offset,
  };
}
