// src/koncisaPlus/rules/koncisaDuctCoverRules.js

const DUCT_COVER_CATALOG = {
  sencillo: {
    cableado: {
      code: '22000132407',
      modelSrc: '/assets/models/koncisaPlus/2KAC269000_100.glb',
    },
    pasacable: {
      code: '22000136080',
      modelSrc: '/assets/models/koncisaPlus/2KAC269000_100.glb',
    },
  },
  doble: {
    cableado: {
      code: '22000132827',
      modelSrc: '/assets/models/koncisaPlus/2KAC250000_200.glb',
    },
    pasacable: {
      code: '22000136079',
      modelSrc: '/assets/models/koncisaPlus/2KAC277000_200.glb',
    },
  },
};

export function normalizeDuctSeatType(value = '') {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  if (v.includes('doble')) return 'doble';
  return 'sencillo';
}

export function normalizeDuctModuleType(value = '') {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  if (v.includes('intermedio')) return 'intermedio';
  if (v.includes('individual')) return 'individual';
  return 'terminal';
}

export function inferDuctChannelType(source) {
  const raw =
    typeof source === 'string'
      ? source
      : [
          source?.tipoCanal,
          source?.logicalCode,
          source?.description,
          source?.codigoPT,
          source?.code,
        ]
          .filter(Boolean)
          .join(' ');

  const v = String(raw || '').toLowerCase();

  if (v.includes('pasacable')) return 'pasacable';
  return 'cableado';
}

export function resolveDuctCoverAsset({ tipoPuesto, tipoCanal }) {
  const seat = normalizeDuctSeatType(tipoPuesto);
  const channel = inferDuctChannelType(tipoCanal);

  return DUCT_COVER_CATALOG?.[seat]?.[channel] || null;
}

export function defaultDuctCoverState(tipoModulo) {
  const mod = normalizeDuctModuleType(tipoModulo);

  if (mod === 'intermedio') {
    return { left: false, right: false };
  }

  return { single: false };
}

export function normalizeDuctCoverState(tipoModulo, value = {}) {
  const mod = normalizeDuctModuleType(tipoModulo);

  if (mod === 'intermedio') {
    return {
      left: !!value.left,
      right: !!value.right,
    };
  }

  return {
    single: !!value.single,
  };
}

export function getDuctCoverSides(tipoModulo, state = {}) {
  const mod = normalizeDuctModuleType(tipoModulo);

  if (mod === 'intermedio') {
    const out = [];
    if (state.left) out.push('left');
    if (state.right) out.push('right');
    return out;
  }

  return state.single ? ['single'] : [];
}
