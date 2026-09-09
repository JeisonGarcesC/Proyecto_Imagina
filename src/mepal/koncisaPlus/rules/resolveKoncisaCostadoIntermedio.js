// src/koncisaPlus/rules/resolveKoncisaCostadoIntermedio.js

import { createCostadoAssembly } from './koncisaCostadoRules.js';

function createKoncisaCostadoIntermedioAssembly(tipoPuesto) {
  const isDouble = tipoPuesto === 'doble';

  return createCostadoAssembly({
    positioningMode: 'measured-intermediate-v1',
    leftLegSrc: isDouble
      ? '/assets/models/koncisaPlus/LEFT_2KSO329000_Generico.glb'
      : '/assets/models/koncisaPlus/LEFT_2KSO331000_Generico.glb',
    rightLegSrc: isDouble
      ? '/assets/models/koncisaPlus/RIGHT_2KSO329000_Generico.glb'
      : '/assets/models/koncisaPlus/RIGHT_2KSO331000_Generico.glb',
    // El bracket doble ya forma parte de los bloques genéricos 2KSO329000.
    leftOffsetMm: {
      z: isDouble ? 101 : 34,
    },

    rightOffsetMm: {
      z: isDouble ? -101 : -34,
    },
    centerBracketSrc: isDouble
      ? null
      : '/assets/models/koncisaPlus/CENTER_BRACKET_INTERMEDIO_SENCILLO.glb',
    leftStructuralDepthMm: 50,
    rightStructuralDepthMm: 50,

    centerBracketOffsetMm: {
      x: isDouble ? 0 : 0,
      y: isDouble ? 0 : 658,
      z: 0,
    },
    crossbar: {
      heightMm: 25.4,
      depthMm: 50.8,
      lengthFactor: 0.5,
      lengthOffsetMm: 125.8,
      // En sencillo, el extremo del lado del grommet empieza 25 mm dentro
      // del borde negativo de la superficie. El doble permanece centrado.
      negativeDepthInsetMm: isDouble ? null : 25,
      offsetMm: {
        x: 0,
        y: 685,
        z: 0,
      },
    },
  });
}

export const KONCISA_COSTADO_INTERMEDIO_RULES = {
  // Intermedio sencillo
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_060: {
    codigoPT: '22000132394',
    modelSrc: '/assets/models/koncisaPlus/2KSO331000_60.glb',
    assembly: createKoncisaCostadoIntermedioAssembly('sencillo'),
  },
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_075: {
    codigoPT: '22000132395',
    modelSrc: '/assets/models/koncisaPlus/2KSO331000_75.glb',
    assembly: createKoncisaCostadoIntermedioAssembly('sencillo'),
  },

  // Intermedio doble
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_120: {
    codigoPT: '22000132390',
    modelSrc: '/assets/models/koncisaPlus/2KSO329000_120.glb',
    assembly: createKoncisaCostadoIntermedioAssembly('doble'),
  },
  KONPLUSSPAINTEDLEGINTERMEDIATE_16_150: {
    codigoPT: '22000132391',
    modelSrc: '/assets/models/koncisaPlus/2KSO329000_150.glb',
    assembly: createKoncisaCostadoIntermedioAssembly('doble'),
  },
};

function resolveIntermediateBillingDepth(tipoPuesto, realDepthMm) {
  if (!Number.isFinite(realDepthMm) || realDepthMm <= 0) return null;

  if (tipoPuesto === 'doble') {
    if (realDepthMm <= 1200) return 1200;
    if (realDepthMm <= 1500) return 1500;
    return null;
  }

  if (realDepthMm <= 600) return 600;
  if (realDepthMm <= 750) return 750;
  return null;
}

function depthTokenFromMm(depthMm) {
  if (depthMm === 600) return '060';
  if (depthMm === 750) return '075';
  if (depthMm === 1200) return '120';
  if (depthMm === 1500) return '150';
  return null;
}

export function resolveKoncisaCostadoIntermedio({ tipoPuesto = 'sencillo', depthMm = 600 }) {
  const tipoPuestoKey = String(tipoPuesto || 'sencillo')
    .trim()
    .toLowerCase();
  const realDepthMm = Number(depthMm || 0);
  const billingDepthMm = resolveIntermediateBillingDepth(tipoPuestoKey, realDepthMm);
  const depthToken = depthTokenFromMm(billingDepthMm);
  const isSpecial = !!billingDepthMm && billingDepthMm !== realDepthMm;

  if (!depthToken) {
    return {
      logicalCode: null,
      codigoPT: null,
      modelSrc: null,
      assembly: null,
      exists: false,
      realDepthMm,
      billingDepthMm: null,
      isSpecial: false,
      descriptionPrefix: '',
      descriptionSuffix: '',
    };
  }

  const logicalCode = `KONPLUSSPAINTEDLEGINTERMEDIATE_16_${depthToken}`;
  const found = KONCISA_COSTADO_INTERMEDIO_RULES[logicalCode] || null;
  const depthProgress = Math.max(0, Math.min(1, (realDepthMm - 600) / 150));
  const centerBracketOffsetZMm =
    tipoPuestoKey === 'sencillo'
      ? 62 + depthProgress * 75
      : found?.assembly?.centerBracketOffsetMm?.z || 0;
  const resolvedAssembly = found?.assembly
    ? {
        ...found.assembly,
        centerBracketOffsetMm: {
          ...found.assembly.centerBracketOffsetMm,
          z: centerBracketOffsetZMm,
        },
      }
    : null;

  return {
    logicalCode,
    codigoPT: found?.codigoPT || null,
    modelSrc: found?.modelSrc || null,

    assembly: resolvedAssembly,

    exists: !!found,
    realDepthMm,
    billingDepthMm,
    isSpecial,
    descriptionPrefix: isSpecial ? 'ESPECIAL -' : '',
    descriptionSuffix: isSpecial ? `Medida real ${realDepthMm / 10} cm` : '',
  };
}
