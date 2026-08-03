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

export const KONCISA_FLOOR_DUCT_OFFSETS = {
  // =========================
  // CON GROMMET
  // =========================
  grommet: {
    sencillo: {
      TERMINAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INTERMEDIO: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INDIVIDUAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
    },

    doble: {
      TERMINAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INTERMEDIO: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INDIVIDUAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
    },
  },

  // =========================
  // CON PASACABLE
  // =========================
  pasacable: {
    sencillo: {
      TERMINAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INTERMEDIO: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INDIVIDUAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
    },

    doble: {
      TERMINAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INTERMEDIO: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
      },
      INDIVIDUAL: {
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
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

export function resolveKoncisaFloorDuct({
  tipoPuesto = 'sencillo',
  tipoPasoCable = 'grommet',
  referenceDuctType = 'TERMINAL',
} = {}) {
  const puestoKey = tipoPuesto === 'doble' ? 'doble' : 'sencillo';
  const cableKey = normalizeFloorDuctCableType(tipoPasoCable);
  const refKey = normalizeFloorDuctReferenceType(referenceDuctType);

  const duct = KONCISA_FLOOR_DUCTS?.[puestoKey]?.[cableKey];

  const offset = KONCISA_FLOOR_DUCT_OFFSETS?.[cableKey]?.[puestoKey]?.[refKey] || {
    x: 0,
    y: 0,
    z: 0,
    rotY: 0,
  };

  return {
    ...duct,
    tipoPuesto: puestoKey,
    cableType: cableKey,
    referenceDuctType: refKey,
    offsetFromReferenceMm: offset,
  };
}
