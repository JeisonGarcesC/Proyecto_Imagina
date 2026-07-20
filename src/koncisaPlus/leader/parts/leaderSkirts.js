// src/koncisaPlus/leader/parts/leaderSkirts.js

import { resolveKoncisaLeaderSkirt } from '../rules/leaderSkirtRules';

export function createLeaderMainSkirt({
  groupId,
  groupName,

  realMainWidthMm = 1500,

  materialType = 'METALICA',
  finishCode = null,

  x = 0,
  y = 545,
  z = 0,

  rotationY = 0,
} = {}) {
  const resolved = resolveKoncisaLeaderSkirt({
    realMainWidthMm,
    materialType,
  });

  const baseName = `Falda puesto líder ${resolved.materialType} ` + `${resolved.billingWidthMm}`;

  const name = resolved.isSpecial
    ? `${resolved.descriptionPrefix} ${baseName} - ${resolved.descriptionSuffix}`
    : baseName;

  /*
   * Los soportes se ubican aproximadamente a 500 mm
   * de cada extremo de la falda.
   *
   * En las faldas más cortas se limita la distancia
   * para impedir que ambos soportes se crucen.
   */
  const preferredSupportInsetMm = 500;

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

    meta: {
      category: 'leader-skirts',

      layoutType: 'LEADER',
      leaderRole: 'MAIN_SKIRT',

      materialType: resolved.materialType,
      finishCode,

      realMainWidthMm,
      billingWidthMm: resolved.billingWidthMm,

      physicalLengthMm: resolved.physicalLengthMm,
      heightMm: resolved.heightMm,
      thicknessMm: resolved.thicknessMm,

      /*
       * La falda metálica no lleva un canto
       * independiente.
       */
      hasEdge: resolved.hasEdge,
      edgeThicknessMm: resolved.hasEdge ? resolved.thicknessMm : 0,

      /*
       * Un solo GLB se carga y se clona.
       */
      supportModelSrc: '/assets/models/koncisaPlus/PYM100070.glb',

      supportCount: 2,
      supportInsetMm,

      isSpecial: resolved.isSpecial,

      descriptionPrefix: resolved.descriptionPrefix,

      descriptionSuffix: resolved.descriptionSuffix,

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

          insetMm: supportInsetMm,

          offsetMm: {
            x: 0,
            y: 145,
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
