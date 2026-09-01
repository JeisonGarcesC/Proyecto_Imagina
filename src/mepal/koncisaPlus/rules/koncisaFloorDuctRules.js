//src/mepal/koncisaPlus/rules/koncisaFloorDuctRules.js
export const KONCISA_FLOOR_DUCTS = {
  sencillo: {
    grommet: {
      logicalCode: 'KONPLUSSINDIVIDUALDUCT',
      code: '22000132406',
      modelCode: '2KSO333000',
      modelSrc: '/assets/models/koncisaPlus/2KSO333000.glb',
      name: 'DUCTO BAJANTE SENCILLO CABLEADO A PISO',
    },

    pasacable: {
      logicalCode: 'KONPLUSSINDIVIDUALDUCTOCABLEADO',
      code: '22000136094',
      modelCode: '2KSO370000',
      modelSrc: '/assets/models/koncisaPlus/2KSO370000.glb',
      name: 'DUCTO BAJANTE SENCILLO A PISO PASACABLE',
    },
  },

  doble: {
    grommet: {
      logicalCode: 'KONPLUSSDOUBLEFLOORDUCT',
      code: '22000132828',
      modelCode: '2KSO325000',
      modelSrc: '/assets/models/koncisaPlus/2KSO325000.glb',
      name: 'DUCTO BAJANTE DOBLE CABLEADO A PISO',
    },

    pasacable: {
      logicalCode: 'KONPLUSSDOUBLEFLOORDUCTOCABLEADO',
      code: '22000136093',
      modelCode: '2KSO369000',
      modelSrc: '/assets/models/koncisaPlus/2KSO369000.glb',
      name: 'DUCTO BAJANTE DOBLE A PISO PASACABLE',
    },
  },
};

// Offset por tipo de módulo de referencia (TERMINAL/INTERMEDIO/INDIVIDUAL) y
// por posición elegida (LEFT/RIGHT/CENTER). INDIVIDUAL solo admite CENTER,
// ya que el ducto individual solo tiene un lugar posible para el bajante.
//
// Cada entrada es una función (ecuación) que recibe el largo y la profundidad
// reales del puesto/superficie, porque el ducto horizontal cambia de tamaño
// (1000/1200/1500...) y el bajante debe reubicarse según esa medida.
const zeroOffset = () => ({ x: 0, y: 0, z: 0, rotY: 0 });

const offsetTerminalGrommetIzquierdo = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetTerminalGrommetDerecho = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetTerminalGrommetCentro = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374,
  y: -510,
  z: -38,
  rotY: 0,
});

const offsetIntermedioGrommetIzquierdo = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetIntermedioGrommetDerecho = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetIntermedioGrommetCentro = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374,
  y: -510,
  z: -38,
  rotY: 0,
});

export const KONCISA_FLOOR_DUCT_OFFSETS = {
  // =========================
  // CON GROMMET
  // =========================

  // Posicion Ducto a piso: fn({ largoRealMm, anchoRealMm }) => { x, y, z, rotY }
  grommet: {
    sencillo: {
      TERMINAL: {
        LEFT: offsetTerminalGrommetIzquierdo,
        CENTER: offsetTerminalGrommetCentro,
        RIGHT: offsetTerminalGrommetDerecho,
      },
      INTERMEDIO: {
        LEFT: offsetIntermedioGrommetIzquierdo,
        CENTER: offsetIntermedioGrommetCentro,
        RIGHT: offsetIntermedioGrommetDerecho,
      },
      INDIVIDUAL: {
        CENTER: zeroOffset,
      },
    },

    doble: {
      TERMINAL: {
        LEFT: zeroOffset,
        CENTER: zeroOffset,
        RIGHT: zeroOffset,
      },
      INTERMEDIO: {
        LEFT: zeroOffset,
        CENTER: zeroOffset,
        RIGHT: zeroOffset,
      },
      INDIVIDUAL: {
        CENTER: zeroOffset,
      },
    },
  },

  // =========================
  // CON PASACABLE
  // =========================
  pasacable: {
    sencillo: {
      TERMINAL: {
        LEFT: zeroOffset,
        CENTER: zeroOffset,
        RIGHT: zeroOffset,
      },
      INTERMEDIO: {
        LEFT: zeroOffset,
        CENTER: zeroOffset,
        RIGHT: zeroOffset,
      },
      INDIVIDUAL: {
        CENTER: zeroOffset,
      },
    },

    doble: {
      TERMINAL: {
        LEFT: zeroOffset,
        CENTER: zeroOffset,
        RIGHT: zeroOffset,
      },
      INTERMEDIO: {
        LEFT: zeroOffset,
        CENTER: zeroOffset,
        RIGHT: zeroOffset,
      },
      INDIVIDUAL: {
        CENTER: zeroOffset,
      },
    },
  },
};

export function normalizeFloorDuctCableType(tipoPasoCable) {
  const value = String(tipoPasoCable || '').toLowerCase();

  if (value === 'pasacable') return 'pasacable';

  // Por defecto lo tratamos como grommet/cableado normal.
  return 'grommet';
}

export function normalizeFloorDuctReferenceType(tipoModulo) {
  const value = String(tipoModulo || '').toUpperCase();

  if (value === 'INTERMEDIO') return 'INTERMEDIO';
  if (value === 'INDIVIDUAL') return 'INDIVIDUAL';

  return 'TERMINAL';
}

// El ducto individual solo tiene una ubicación posible para el bajante.
export function normalizeFloorDuctPosition(referenceDuctType, position) {
  const refKey = normalizeFloorDuctReferenceType(referenceDuctType);

  if (refKey === 'INDIVIDUAL') return 'CENTER';

  const value = String(position || 'CENTER').toUpperCase();
  if (value === 'LEFT' || value === 'RIGHT') return value;

  return 'CENTER';
}

export function resolveKoncisaFloorDuct({
  tipoPuesto = 'sencillo',
  tipoPasoCable = 'grommet',
  referenceDuctType = 'TERMINAL',
  position = 'CENTER',
  largoRealMm = 1200,
  anchoRealMm = 600,
} = {}) {
  const puestoKey = tipoPuesto === 'doble' ? 'doble' : 'sencillo';
  const cableKey = normalizeFloorDuctCableType(tipoPasoCable);
  const refKey = normalizeFloorDuctReferenceType(referenceDuctType);
  const positionKey = normalizeFloorDuctPosition(refKey, position);

  const duct = KONCISA_FLOOR_DUCTS?.[puestoKey]?.[cableKey];

  const offsetFn = KONCISA_FLOOR_DUCT_OFFSETS?.[cableKey]?.[puestoKey]?.[refKey]?.[positionKey];
  const offset =
    typeof offsetFn === 'function'
      ? offsetFn({ largoRealMm, anchoRealMm })
      : offsetFn || { x: 0, y: 0, z: 0, rotY: 0 };

  return {
    ...duct,
    tipoPuesto: puestoKey,
    cableType: cableKey,
    referenceDuctType: refKey,
    position: positionKey,
    dimsMm: { largoRealMm, anchoRealMm },
    offsetFromReferenceMm: offset,
  };
}
