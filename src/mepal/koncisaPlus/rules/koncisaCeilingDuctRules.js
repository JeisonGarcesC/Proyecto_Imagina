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

export function defaultCeilingDuctState(tipoModulo) {
  return String(tipoModulo || '').toUpperCase() === 'INTERMEDIO'
    ? { left: false, right: false }
    : { single: false };
}

export function normalizeCeilingDuctState(tipoModulo, state = {}) {
  if (String(tipoModulo || '').toUpperCase() === 'INTERMEDIO') {
    const left = !!state.left;
    return { left, right: !left && !!state.right };
  }
  return { single: !!state.single };
}

export function selectKoncisaCeilingDuctReference(ducts = [], side = 'LEFT') {
  const sideKey = normalizeCeilingDuctSide(side);
  const candidates = ducts.filter((duct) => {
    const moduleType = String(duct?.meta?.tipoModulo || '')
      .trim()
      .toUpperCase();
    return moduleType === 'TERMINAL' || moduleType === 'INTERMEDIO';
  });

  if (!candidates.length) return null;

  return candidates.reduce((selected, duct) => {
    if (!selected) return duct;
    const selectedX = Number(selected?.position?.x || 0);
    const ductX = Number(duct?.position?.x || 0);
    return sideKey === 'RIGHT'
      ? ductX > selectedX
        ? duct
        : selected
      : ductX < selectedX
        ? duct
        : selected;
  }, null);
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
