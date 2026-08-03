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
      y: 710,
      z: 0,
      rotY: 0,
    },

    RIGHT: {
      x: 0,
      y: 710,
      z: 0,
      rotY: 0,
    },

    INTERMEDIO: {
      x: 0,
      y: 710,
      z: 0,
      rotY: 0,
    },
  },

  doble: {
    LEFT: {
      x: 0,
      y: 710,
      z: 0,
      rotY: 0,
    },

    RIGHT: {
      x: 0,
      y: 710,
      z: 0,
      rotY: 0,
    },

    INTERMEDIO: {
      x: 0,
      y: 710,
      z: 0,
      rotY: 0,
    },
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

export function resolveKoncisaDuctSupport({ tipoPuesto = 'sencillo', replaceZone = 'RIGHT' } = {}) {
  const puestoKey = normalizeDuctSupportTipoPuesto(tipoPuesto);
  const zoneKey = normalizeDuctSupportZone(replaceZone);

  const support = KONCISA_DUCT_SUPPORTS[puestoKey];

  const offset = KONCISA_DUCT_SUPPORT_OFFSETS_FROM_PEDESTAL?.[puestoKey]?.[zoneKey] || {
    x: 0,
    y: 710,
    z: 0,
    rotY: 0,
  };

  return {
    ...support,
    tipoPuesto: puestoKey,
    replaceZone: zoneKey,
    offsetMm: offset,
  };
}
