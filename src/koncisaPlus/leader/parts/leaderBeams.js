// leaderBeams.js

import { resolveKoncisaLeaderMainBeam } from '../rules/leaderBeamRules';

export function createLeaderMainBeam({
  groupId,
  groupName,

  realMainWidthMm = 1500,
  hasOutletBox = false,
  hasCredenza = false,

  x = 0,
  y = 650,
  z = 0,
}) {
  const resolved = resolveKoncisaLeaderMainBeam({
    realMainWidthMm,
    hasOutletBox,
    hasCredenza,
  });

  const isSpecial = !!resolved?.isSpecial;

  const outletBoxNote = hasOutletBox && !hasCredenza ? 'pag 19, nominal + 15' : '';

  const baseName = `Viga principal líder ${resolved?.billingWidthMm || realMainWidthMm}`;

  const specialName = isSpecial
    ? `${resolved?.descriptionPrefix || 'ESPECIAL -'} ${baseName}${
        resolved?.descriptionSuffix ? ` - ${resolved.descriptionSuffix}` : ''
      }`
    : baseName;

  const name = outletBoxNote ? `${specialName} - ${outletBoxNote}` : specialName;

  return {
    type: 'viga',

    subtype: hasCredenza
      ? 'leader-main-credenza'
      : hasOutletBox
        ? 'leader-main-outlet'
        : 'leader-main',

    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved?.codigoPT || null,
    logicalCode: resolved?.logicalCode || null,
    existsInCatalog: !!resolved?.exists,
    rawCodigoPT: resolved?.codigoPT || null,

    name,

    dimMm: {
      widthMm: resolved?.physicalLengthMm || Math.max(1, realMainWidthMm - 90),

      heightMm: 50,
      depthMm: 25.4,

      realWidthMm: realMainWidthMm,
      billingWidthMm: resolved?.billingWidthMm || realMainWidthMm,
    },

    position: {
      x,
      y,
      z,
    },

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    model: {
      kind: 'native-block',
      src: null,
    },

    meta: {
      category: 'vigas',
      layoutType: 'LEADER',
      leaderRole: 'MAIN_BEAM',

      hasOutletBox,
      hasCredenza,

      realWidthMm: realMainWidthMm,
      billingWidthMm: resolved?.billingWidthMm || realMainWidthMm,

      isSpecial,

      descriptionPrefix: resolved?.descriptionPrefix || '',

      descriptionSuffix: resolved?.descriptionSuffix || '',

      descriptionNote: outletBoxNote,
    },
  };
}

export function createLeaderCredenzaBeamDecoration({
  groupId,
  groupName,
  side = 'RIGHT',
  beamLengthMm = 1260,
  leaderMainWidthMm = 1500,
  x = 0,
  y = 685,
  z = 0,
} = {}) {
  const normalizedSide =
    String(side || '')
      .trim()
      .toUpperCase() === 'LEFT'
      ? 'LEFT'
      : 'RIGHT';
  const sideSign = normalizedSide === 'RIGHT' ? 1 : -1;
  const rotationY = normalizedSide === 'RIGHT' ? -Math.PI / 2 : Math.PI / 2;
  const modelCenterMm = {
    x: 266.8028,
    y: -1103.6225,
    z: -1115.6536,
  };
  //const rotatedCenterX = modelCenterMm.x * Math.cos(rotationY) + modelCenterMm.z * Math.sin(rotationY);
  const rotatedCenterZ =
    -modelCenterMm.x * Math.sin(rotationY) + modelCenterMm.z * Math.cos(rotationY);
  const targetX = x + sideSign * (beamLengthMm / 2 + 75);

  const beamDecorationX = {
    1500: 700,
    1550: 680,
    1600: 650,
    1650: 630,
    1700: 600,
    1750: 580,
    1800: 555,
  };

  //console.log('leaderMainWidthMm ', leaderMainWidthMm);

  const baseX = beamDecorationX[leaderMainWidthMm] ?? 700;

  const xPosition = normalizedSide === 'RIGHT' ? -baseX : baseX;

  //console.log('xPosition ', xPosition);

  //console.log('targetX ', targetX);
  //console.log('rotatedCenterX ', rotatedCenterX);
  return {
    type: 'leaderCredenzaBeamDecoration',
    subtype: 'leader-credenza-beam-decoration',
    line: 'KONCISA.PLUS',
    groupId,
    groupName,
    code: null,
    logicalCode: null,
    existsInCatalog: false,
    name: 'Conector visual de viga a credenza',
    dimMm: {
      widthMm: 150,
      heightMm: 50,
      depthMm: 25.4,
    },
    position: {
      //para 1500 = 700, 1550:680, 1600: 650, para 1650: 630, 1700: 600, 1750: 580,para 1800: 550 ,
      x: xPosition,
      y: y - modelCenterMm.y - 3,
      z: z - rotatedCenterZ,
    },
    rotation: {
      x: 0,
      y: rotationY,
      z: 0,
    },
    model: {
      kind: 'glb',
      src: '/assets/models/koncisaPlus/2KSO382000_VigaConectora.glb',
    },
    meta: {
      category: 'leader-beam-components',
      layoutType: 'LEADER',
      leaderRole: 'CREDENZA_BEAM',
      side: normalizedSide,
      decorative: true,
      excludeFromBOM: true,
      modelCenterMm,
      targetPositionMm: { x: targetX, y, z },
    },
  };
}
