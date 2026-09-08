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
//
// El punto de partida (baseX) es el centro geométrico del módulo, igual para
// TERMINAL/INTERMEDIO/INDIVIDUAL, por eso TERMINAL e INTERMEDIO comparten las
// mismas fórmulas: para una misma largoRealMm deben caer en el mismo sitio.
const zeroOffset = () => ({ x: 0, y: 0, z: 0, rotY: 0 });

const offsetGrommetIzquierdoTerminal = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetGrommetDerechoTerminal = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetGrommetCentroTerminal = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});

const offsetGrommetIzquierdoIntermedio = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335 - 280,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetGrommetDerechoIntermedio = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetGrommetCentroIntermedio = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});

const offsetGrommetCentroIndividual = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 660,
  y: -510,
  z: -38,
  rotY: 0,
});

// Doble

const offsetGrommetIzquierdoTerminalDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335,
  y: -510,
  z: -38 + 83,
  rotY: 0,
});
const offsetGrommetDerechoTerminalDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38 + 83,
  rotY: 0,
});
const offsetGrommetCentroTerminalDoble = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38 + 83,
  rotY: 0,
});

const offsetGrommetIzquierdoIntermedioDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335 - 280,
  y: -510,
  z: -38 - 7,
  rotY: 0,
});
const offsetGrommetDerechoIntermedioDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38 - 7,
  rotY: 0,
});
const offsetGrommetCentroIntermedioDoble = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38 - 7,
  rotY: 0,
});

const offsetGrommetCentroIndividualDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 660,
  y: -510,
  z: -38 - 7,
  rotY: 0,
});

//Pasacable

//sencillo

const offsetPasacableIzquierdoTerminal = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableDerechoTerminal = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableCentroTerminal = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});

const offsetPasacableIzquierdoIntermedio = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335 - 280,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableDerechoIntermedio = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableCentroIntermedio = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});

const offsetPasacableCentroIndividual = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 660,
  y: -510,
  z: -38,
  rotY: 0,
});

// Doble

const offsetPasacableIzquierdoTerminalDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableDerechoTerminalDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableCentroTerminalDoble = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});

const offsetPasacableIzquierdoIntermedioDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 205 + 95 / 2 - 374 - 335 - 280,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableDerechoIntermedioDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 + 205 - 95 / 2 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});
const offsetPasacableCentroIntermedioDoble = ({ largoRealMm }) => ({
  x: largoRealMm + 95 / 2 - 374 - 335,
  y: -510,
  z: -38,
  rotY: 0,
});

const offsetPasacableCentroIndividualDoble = ({ largoRealMm }) => ({
  x: largoRealMm / 2 - 660,
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
        LEFT: offsetGrommetIzquierdoTerminal,
        CENTER: offsetGrommetCentroTerminal,
        RIGHT: offsetGrommetDerechoTerminal,
      },
      INTERMEDIO: {
        LEFT: offsetGrommetIzquierdoIntermedio,
        CENTER: offsetGrommetCentroIntermedio,
        RIGHT: offsetGrommetDerechoIntermedio,
      },
      INDIVIDUAL: {
        CENTER: offsetGrommetCentroIndividual,
      },
    },

    doble: {
      TERMINAL: {
        LEFT: offsetGrommetIzquierdoTerminalDoble,
        CENTER: offsetGrommetCentroTerminalDoble,
        RIGHT: offsetGrommetDerechoTerminalDoble,
      },
      INTERMEDIO: {
        LEFT: offsetGrommetIzquierdoIntermedioDoble,
        CENTER: offsetGrommetCentroIntermedioDoble,
        RIGHT: offsetGrommetDerechoIntermedioDoble,
      },
      INDIVIDUAL: {
        CENTER: offsetGrommetCentroIndividualDoble,
      },
    },
  },

  // =========================
  // CON PASACABLE
  // =========================
  pasacable: {
    sencillo: {
      TERMINAL: {
        LEFT: offsetPasacableIzquierdoTerminal,
        CENTER: offsetPasacableCentroTerminal,
        RIGHT: offsetPasacableDerechoTerminal,
      },
      INTERMEDIO: {
        LEFT: offsetPasacableIzquierdoIntermedio,
        CENTER: offsetPasacableCentroIntermedio,
        RIGHT: offsetPasacableDerechoIntermedio,
      },
      INDIVIDUAL: {
        CENTER: offsetPasacableCentroIndividual,
      },
    },

    doble: {
      TERMINAL: {
        LEFT: offsetPasacableIzquierdoTerminalDoble,
        CENTER: offsetPasacableCentroTerminalDoble,
        RIGHT: offsetPasacableDerechoTerminalDoble,
      },
      INTERMEDIO: {
        LEFT: offsetPasacableIzquierdoIntermedioDoble,
        CENTER: offsetPasacableCentroIntermedioDoble,
        RIGHT: offsetPasacableDerechoIntermedioDoble,
      },
      INDIVIDUAL: {
        CENTER: offsetPasacableCentroIndividualDoble,
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
