// src/koncisaPlus/rules/koncisaCableAccessRules.js

export const KONCISA_CABLE_ACCESS_RULES = {
  'LKAC670000-PAINTED': '22000126725',
  'LKAC670000-ALUMINIUM': '22000126724',
  // Grommet 4 tomas
  'KONPLUSSGROMMET4TOMAS-ALUMINIUM': '22000023626',
  'KONPLUSSGROMMET4TOMAS-PAINTED': '22000116523',
  'KONPLUSSGROMMET4TOMAS-METALICO': '22000133769',
  'KONPLUSSGROMMET4TOMAS-ALUMINIUM_PINTADO': '22000116523',

  // Pasacable
  MPLCUTOUTNOPAL: '22000635',
  MPLCUTOUTGRIS: '22000648',
};

export function buildKoncisaCableAccessLogicalCode({
  tipo = 'grommet', // grommet | pasacable
  finish = 'ALUMINIUM',
}) {
  if (tipo === 'pasacable') {
    return 'MPLCUTOUTNOPAL';
  }

  if (tipo === 'grommet') {
    return `KONPLUSSGROMMET4TOMAS-${String(finish).toUpperCase()}`;
  }

  return null;
}

export function resolveKoncisaCableAccessCodigoPT(params) {
  if (params?.tipo === 'grommet' && String(params?.layoutType || '').toUpperCase() === 'LEADER') {
    const requestedFinish = String(params?.finish || '').toUpperCase();
    if (!requestedFinish) {
      return {
        logicalCode: 'LKAC670000',
        codigoPT: 'LKAC670000',
        exists: true,
        rawCodigoPT: 'LKAC670000',
      };
    }
    const finish = requestedFinish === 'PAINTED' ? 'PAINTED' : 'ALUMINIUM';
    const logicalCode = `LKAC670000-${finish}`;
    const rawCodigoPT = KONCISA_CABLE_ACCESS_RULES[logicalCode];
    return {
      logicalCode,
      codigoPT: rawCodigoPT,
      exists: true,
      rawCodigoPT,
    };
  }

  const logicalCode = buildKoncisaCableAccessLogicalCode(params);

  if (!logicalCode) {
    return {
      logicalCode: null,
      codigoPT: null,
      exists: false,
      rawCodigoPT: null,
    };
  }

  const rawCodigoPT = KONCISA_CABLE_ACCESS_RULES[logicalCode] || '00000000';

  return {
    logicalCode,
    codigoPT: rawCodigoPT !== '00000000' ? rawCodigoPT : null,
    exists: rawCodigoPT !== '00000000',
    rawCodigoPT,
  };
}
