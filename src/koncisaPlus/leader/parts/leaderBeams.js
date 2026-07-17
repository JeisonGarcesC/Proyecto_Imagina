// leaderBeams.js

import { resolveKoncisaLeaderMainBeam } from '../rules/leaderBeamRules';

export function createLeaderMainBeam({
  groupId,
  groupName,

  realMainWidthMm = 1500,
  hasOutletBox = false,

  x = 0,
  y = 650,
  z = 0,
}) {
  const resolved = resolveKoncisaLeaderMainBeam({
    realMainWidthMm,
    hasOutletBox,
  });

  const isSpecial = !!resolved?.isSpecial;

  const outletBoxNote = hasOutletBox ? 'pag 19, nominal + 15' : '';

  const baseName = `Viga principal líder ${resolved?.billingWidthMm || realMainWidthMm}`;

  const specialName = isSpecial
    ? `${resolved?.descriptionPrefix || 'ESPECIAL -'} ${baseName}${
        resolved?.descriptionSuffix ? ` - ${resolved.descriptionSuffix}` : ''
      }`
    : baseName;

  const name = outletBoxNote ? `${specialName} - ${outletBoxNote}` : specialName;

  return {
    type: 'viga',

    subtype: hasOutletBox ? 'leader-main-outlet' : 'leader-main',

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

      realWidthMm: realMainWidthMm,
      billingWidthMm: resolved?.billingWidthMm || realMainWidthMm,

      isSpecial,

      descriptionPrefix: resolved?.descriptionPrefix || '',

      descriptionSuffix: resolved?.descriptionSuffix || '',

      descriptionNote: outletBoxNote,
    },
  };
}
