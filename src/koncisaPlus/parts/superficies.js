// src/koncisaPlus/parts/superficies.js
import { resolveKoncisaSurfaceCodigoPT } from '../rules/koncisaSurfaceRules';

export function createSuperficie({
  groupId = null,
  groupName = null,

  tipoPuesto = 'sencillo',

  widthMm = 1200,
  depthMm = 600,

  // Se conservan por compatibilidad.
  billingWidthMm = null,
  billingDepthMm = null,

  thickMm = 25,
  shape = 'RECT',
  finishCode = '22008689',
  variant = '',
  perforada = false,
  canto = 'PVC-2MM',

  x = 0,
  y = 710,
  z = 0,
  index = 0,
}) {
  const realWidthMm = Number(widthMm || 0);
  const realDepthMm = Number(depthMm || 0);

  const resolved = resolveKoncisaSurfaceCodigoPT({
    tipoPuesto,

    // Las reglas de techo parten de la medida física real.
    realWidthMm,
    realDepthMm,

    // Se envían para conservar compatibilidad y trazabilidad.
    billingWidthMm: billingWidthMm ?? realWidthMm,
    billingDepthMm: billingDepthMm ?? realDepthMm,

    shape,
    thicknessMm: thickMm,
    finishCode,
    variant,
  });

  const resolvedBillingWidthMm = resolved?.billingWidthMm || billingWidthMm || realWidthMm;

  const resolvedBillingDepthMm = resolved?.billingDepthMm || billingDepthMm || realDepthMm;

  const isSpecial = !!resolved?.isSpecial;

  const baseName = `Superficie ${resolvedBillingWidthMm}x${resolvedBillingDepthMm}`;

  const name = isSpecial
    ? `${resolved.descriptionPrefix} ${baseName} - ${resolved.descriptionSuffix}`
    : baseName;

  return {
    type: 'superficie',
    subtype: perforada ? 'con-perforacion' : 'sin-perforacion',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,

    name,

    // Dimensiones físicas del objeto 3D.
    dimMm: {
      widthMm: realWidthMm,
      depthMm: realDepthMm,
      thickMm,
    },

    // Dimensiones usadas para código, precio y BOM.
    billingDimMm: {
      widthMm: resolvedBillingWidthMm,
      depthMm: resolvedBillingDepthMm,
      thickMm,
    },

    position: { x, y, z },

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    meta: {
      index,
      moduleIndex: index,

      category: 'superficies',
      tipoPuesto,

      perforada,
      canto,
      shape,
      finishCode,
      variant,
      alturaTrabajoMm: y,

      realWidthMm,
      realDepthMm,

      billingWidthMm: resolvedBillingWidthMm,
      billingDepthMm: resolvedBillingDepthMm,

      isSpecial,

      descriptionPrefix: isSpecial ? resolved?.descriptionPrefix || '' : '',

      descriptionSuffix: isSpecial ? resolved?.descriptionSuffix || '' : '',
    },
  };
}
