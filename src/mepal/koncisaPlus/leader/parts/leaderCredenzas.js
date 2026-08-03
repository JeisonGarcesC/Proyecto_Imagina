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

  const profundidad = resolved.side === 'RIGHT' ? -lengthMm + 300 : mainDepthMm / 2;

  const credenzaX = 250 + (mainWidthMm - 1500) * 0.5;

  const credenzaXPosition = resolved.side === 'RIGHT' ? credenzaX : -credenzaX;

  //console.log('credenzaX ', credenzaX);

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
    //derecha x: 1500 : 250, para 1550: 275, para 1600: 300, para 1650 :  325 ,para 1700 : 350, para 1750: 375, para 1800 :400
    //izquierda x: 1500: 250,  para
    position: {
      x: credenzaXPosition,
      y: 0,
      z: profundidad, //-lengthMm + 300
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
