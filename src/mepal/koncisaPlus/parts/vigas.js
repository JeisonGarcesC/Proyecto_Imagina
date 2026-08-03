// src/koncisaPlus/parts/vigas.js
import { resolveKoncisaViga } from '../rules/koncisaVigaRules';

export function createViga({
  groupId = null,
  groupName = null,
  tipoPuesto = 'sencillo',
  moduleIndex = 0,
  side = 'CENTER',
  nominalWidthMm = 1200,
  x = 0,
  y = 650,
  z = 0,
}) {
  const resolved = resolveKoncisaViga({ nominalWidthMm });

  const realWidthMm = resolved?.realWidthMm || nominalWidthMm;

  // Medida física de la viga:
  // se calcula con la medida real, no con la medida de cobro.
  const widthMm = Math.max(1, realWidthMm - 87);
  const heightMm = 50.8;
  const depthMm = 25.4;

  const isSpecial = !!resolved?.isSpecial;

  const baseName = `Viga ${resolved?.billingWidthMm || nominalWidthMm}`;

  const name = `${
    isSpecial && resolved?.descriptionPrefix ? resolved.descriptionPrefix : ''
  }${baseName}${
    isSpecial && resolved?.descriptionSuffix ? ` - ${resolved.descriptionSuffix}` : ''
  }`;

  return {
    type: 'viga',
    subtype: 'soporte',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.codigoPT,

    name,

    dimMm: {
      widthMm,
      heightMm,
      depthMm,

      nominalWidthMm: realWidthMm,
      realWidthMm,
      billingWidthMm: resolved?.billingWidthMm || realWidthMm,
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

    meta: {
      category: 'vigas',

      tipoPuesto,
      moduleIndex,
      side,

      nominalWidthMm: realWidthMm,
      realWidthMm,
      billingWidthMm: resolved?.billingWidthMm || realWidthMm,

      isSpecial,
      descriptionPrefix: isSpecial ? resolved?.descriptionPrefix || '' : '',
      descriptionSuffix: isSpecial ? resolved?.descriptionSuffix || '' : '',
    },
  };
}
