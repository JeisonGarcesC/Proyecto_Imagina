export const KONCISA_CEILING_DUCTS = {
  sencillo: {
    logicalCode: 'KONPLUSSSINGLECEILINGDUCT',
    code: '22000132908',
    modelCode: '2KSO334000',
    modelSrc: '/assets/models/koncisaPlus/2KSO334000.glb',
    name: 'DUCTO BAJANTE SENCILLO A TECHO',
  },

  doble: {
    logicalCode: 'KONPLUSSDOUBLECEILINGDUCT',
    code: '22000132907',
    modelCode: '2KSO327000',
    modelSrc: '/assets/models/koncisaPlus/2KSO327000.glb',
    name: 'DUCTO BAJANTE DOBLE A TECHO',
  },
};

export const KONCISA_CEILING_DUCT_OFFSETS = {
  sencillo: {
    LEFT: {
      x: 0,
      y: 0,
      z: 0,
      rotY: 0,
    },
    RIGHT: {
      x: 0,
      y: 0,
      z: 0,
      rotY: Math.PI,
    },
  },

  doble: {
    LEFT: {
      x: 0,
      y: 0,
      z: 0,
      rotY: 0,
    },
    RIGHT: {
      x: 0,
      y: 0,
      z: 0,
      rotY: Math.PI,
    },
  },
};

export function normalizeCeilingDuctSide(side) {
  const value = String(side || '').toUpperCase();

  if (value === 'RIGHT') return 'RIGHT';

  return 'LEFT';
}

export function resolveKoncisaCeilingDuct({ tipoPuesto = 'sencillo', side = 'LEFT' } = {}) {
  const puestoKey = tipoPuesto === 'doble' ? 'doble' : 'sencillo';
  const sideKey = normalizeCeilingDuctSide(side);

  const duct = KONCISA_CEILING_DUCTS[puestoKey];

  const offset = KONCISA_CEILING_DUCT_OFFSETS?.[puestoKey]?.[sideKey] || {
    x: 0,
    y: 0,
    z: 0,
    rotY: 0,
  };

  return {
    ...duct,
    tipoPuesto: puestoKey,
    side: sideKey,
    offsetFromReferenceMm: offset,
  };
}
