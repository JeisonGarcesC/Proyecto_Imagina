// src/koncisaPlus/leader/parts/leaderSkirts.js

import { resolveKoncisaLeaderSkirt } from '../rules/leaderSkirtRules';

export function createLeaderMainSkirt({
  groupId,
  groupName,

  realMainWidthMm = 1500,

  materialType = 'METALICA',
  finishCode = null,

  //posicion de la falda pantalla puesto lider, original.
  x = 0,
  y = 0,
  z = 0,

  rotationY = 0,
} = {}) {
  const resolved = resolveKoncisaLeaderSkirt({
    realMainWidthMm,
    materialType,
  });

  const baseName = `Falda puesto líder ${resolved.materialType} ${resolved.billingWidthMm}`;

  const name = resolved.isSpecial
    ? `${resolved.descriptionPrefix}${baseName} - ${resolved.descriptionSuffix}`
    : baseName;

  /*
   * Ubicación soportes
   * Aproximadamente 200 mm desde extremos
   */

  const preferredSupportInsetMm = 200;
  const maximumSupportInsetMm = Math.max(50, resolved.physicalLengthMm / 2 - 100);
  const supportInsetMm = Math.min(preferredSupportInsetMm, maximumSupportInsetMm);

  return {
    type: 'leaderSkirt',
    subtype: 'leader-main-skirt',
    line: 'KONCISA.PLUS',
    groupId,
    groupName,
    code: resolved.codigoPT,
    rawCodigoPT: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    name,
    dimMm: {
      widthMm: resolved.physicalLengthMm,
      heightMm: resolved.heightMm,
      depthMm: resolved.thicknessMm,
      realMainWidthMm,
      billingWidthMm: resolved.billingWidthMm,
      realLengthMm: resolved.physicalLengthMm,
    },
    position: {
      x,
      y,
      z,
    },
    rotation: {
      x: 0,
      y: rotationY,
      z: 0,
    },

    model: {
      kind: 'koncisa-leader-skirt-assembly',
      src: null,
    },

    useNativeModel: true,

    meta: {
      category: 'leader-skirts',
      layoutType: 'LEADER',
      leaderRole: 'MAIN_SKIRT',
      materialType: resolved.materialType,
      finishCode,
      edgeFinishCode: resolved.hasEdge ? '22008522' : null,
      realMainWidthMm,
      billingWidthMm: resolved.billingWidthMm,
      physicalLengthMm: resolved.physicalLengthMm,
      realLengthMm: resolved.physicalLengthMm,
      heightMm: resolved.heightMm,
      thicknessMm: resolved.thicknessMm,
      hasEdge: resolved.hasEdge,
      edgeThicknessMm: resolved.hasEdge ? resolved.thicknessMm : 0,
      isSpecial: resolved.isSpecial,
      descriptionPrefix: resolved.descriptionPrefix,
      descriptionSuffix: resolved.descriptionSuffix,
      supportModelSrc: '/assets/models/koncisaPlus/PYM100070.glb',
      supportCount: 2,
      supportInsetMm,
      skirtAssembly: {
        body: {
          lengthMm: resolved.physicalLengthMm,
          heightMm: resolved.heightMm,
          thicknessMm: resolved.thicknessMm,
          bottomCornerRadiusMm: 30,
        },

        edge: {
          enabled: resolved.hasEdge,
          thicknessMm: resolved.thicknessMm,
        },

        support: {
          src: '/assets/models/koncisaPlus/PYM100070.glb',
          count: 2,
          insetMm: supportInsetMm,
          offsetMm: {
            x: 50,
            y: 20,
            z: 0,
          },

          rotation: {
            x: 0,
            y: 0,
            z: 0,
          },

          scale: 1,
        },
      },
    },
  };
}
