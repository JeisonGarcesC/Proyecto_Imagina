import { resolveLeaderCredenza } from '../rules/leaderCredenzaRules';

export function createLeaderCredenza({
  groupId,
  groupName,
  side = 'RIGHT',
  lengthMm = 1500,
  mainWidthMm = 1500,
  mainDepthMm = 600,
} = {}) {
  const resolved = resolveLeaderCredenza({ side, lengthMm });
  const sideSign = resolved.side === 'RIGHT' ? 1 : -1;

  return {
    type: 'leaderCredenza',
    subtype: `leader-credenza-${resolved.side.toLowerCase()}`,
    line: 'KONCISA.PLUS',
    groupId,
    groupName,
    code: resolved.codigoPT,
    rawCodigoPT: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: true,
    name: resolved.name,
    dimMm: {
      widthMm: resolved.requestedLengthMm,
      depthMm: resolved.depthMm,
      heightMm: resolved.heightMm,
      billingLengthMm: resolved.billingLengthMm,
    },
    position: {
      x: sideSign * (mainWidthMm / 2 - resolved.depthMm / 2 + 260),
      y: 0,
      z: -(mainDepthMm / 2 + resolved.requestedLengthMm / 2) + 1350,
    },
    rotation: {
      x: 0,
      y: resolved.side === 'RIGHT' ? -Math.PI / 2 : Math.PI / 2,
      z: 0,
    },
    scale: {
      x: resolved.scaleAlongLength,
      y: 1,
      z: 1,
    },
    model: {
      kind: 'koncisa-leader-credenza-assembly',
      src: resolved.modelSrc,
    },
    meta: {
      category: 'leader-credenzas',
      layoutType: 'LEADER',
      leaderRole: 'CREDENZA',
      side: resolved.side,
      requestedLengthMm: resolved.requestedLengthMm,
      billingLengthMm: resolved.billingLengthMm,
      mainWidthMm,
      mainDepthMm,
      positionAdjustmentMm: {
        towardMainSurfaceZ: 1350,
        horizontalX: sideSign * 260,
      },
      isSpecial: resolved.isSpecial,
    },
  };
}
