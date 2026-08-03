const CREDENZA_VARIANTS = Object.freeze({
  RIGHT: Object.freeze({
    1500: Object.freeze({
      code: '22000137110',
      modelSrc: '/assets/models/koncisaPlus/22000137110.glb',
    }),
    1800: Object.freeze({
      code: '22000137111',
      modelSrc: '/assets/models/koncisaPlus/22000137111.glb',
    }),
  }),
  LEFT: Object.freeze({
    1500: Object.freeze({
      code: '22000137112',
      modelSrc: '/assets/models/koncisaPlus/22000137112.glb',
    }),
    1800: Object.freeze({
      code: '22000137113',
      modelSrc: '/assets/models/koncisaPlus/22000137113.glb',
    }),
  }),
});

function normalizeSide(side) {
  return String(side || '').trim().toUpperCase() === 'LEFT' ? 'LEFT' : 'RIGHT';
}

export function resolveLeaderCredenza({ side = 'RIGHT', lengthMm = 1500 } = {}) {
  const normalizedSide = normalizeSide(side);
  const requestedLengthMm = Math.min(1800, Math.max(1500, Number(lengthMm) || 1500));
  const billingLengthMm = requestedLengthMm <= 1500 ? 1500 : 1800;
  const found = CREDENZA_VARIANTS[normalizedSide][billingLengthMm];
  const sideLabel = normalizedSide === 'LEFT' ? 'izquierda' : 'derecha';

  return {
    side: normalizedSide,
    code: found.code,
    codigoPT: found.code,
    logicalCode: found.code,
    modelSrc: found.modelSrc,
    name: `Credenza puesto líder ${sideLabel} ${billingLengthMm / 10} x 50 x 64 cm`,
    requestedLengthMm,
    billingLengthMm,
    depthMm: 500,
    heightMm: 640,
    scaleAlongLength: requestedLengthMm / billingLengthMm,
    isSpecial: requestedLengthMm !== billingLengthMm,
  };
}
