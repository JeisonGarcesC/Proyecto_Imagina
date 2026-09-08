// src/koncisaPlus/parts/ductos.js
import { resolveKoncisaDucto } from '../rules/koncisaDuctoRules';

function buildDuctoCode({ tipo, widthMm, heightMm }) {
  return `KPL-DUCT-${String(tipo).toUpperCase()}-${widthMm}x${heightMm}`;
}

export function createDucto({
  groupId = null,
  groupName = null,
  tipoPuesto = 'sencillo',
  tipoModulo = 'terminal',
  nominalWidthMm = 1200,
  moduleIndex = 0,
  baseX = 0,
  x = 0,
  y = 0,
  z = 0,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  side = 'RIGHT',
  accesoCableado = 'GROMMET',
}) {
  const resolved = resolveKoncisaDucto({
    tipoPuesto,
    tipoModulo,
    nominalWidthMm,
    accesoCableado,
  });

  const sideKey = String(side || 'RIGHT').toUpperCase();

  const isIndividual = String(tipoModulo || '').toUpperCase() === 'INDIVIDUAL';

  const modelSrc =
    sideKey === 'LEFT'
      ? resolved?.modelSrcLeft || resolved?.modelSrc
      : resolved?.modelSrcRight || resolved?.modelSrc;

  const useNativeModel = !isIndividual && !!resolved?.useNativeModel;
  const isSpecial = !isIndividual && !!resolved?.isSpecial;

  return {
    type: 'ducto',
    subtype: tipoModulo,
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,

    name: `${isSpecial && resolved?.descriptionPrefix ? `${resolved.descriptionPrefix} ` : ''}Ducto ${tipoPuesto} ${tipoModulo} ${isSpecial ? resolved?.billingWidthMm : nominalWidthMm}${isSpecial && resolved?.descriptionSuffix ? ` - ${resolved.descriptionSuffix}` : ''}`,

    dimMm: {
      widthMm: isSpecial ? resolved?.realWidthMm || nominalWidthMm : nominalWidthMm,
      billingWidthMm: resolved?.billingWidthMm || nominalWidthMm,
      heightMm: 203,
      depthMm: 104,
    },

    position: { x, y, z },
    rotation: { x: rotX, y: rotY, z: rotZ },

    model: {
      kind: useNativeModel ? 'native-koncisa-duct' : 'glb',
      src: useNativeModel ? null : modelSrc || null,
    },

    meta: {
      category: 'ductos',
      tipoPuesto,
      tipoModulo,
      nominalWidthMm,
      moduleIndex,
      // Centro geométrico del módulo, sin las correcciones visuales propias
      // de terminal/intermedio/individual; ancla estable para piezas dependientes.
      baseX,

      realWidthMm: isSpecial ? resolved?.realWidthMm || nominalWidthMm : nominalWidthMm,
      billingWidthMm: resolved?.billingWidthMm || nominalWidthMm,

      isSpecial,
      useNativeModel,

      descriptionPrefix: isSpecial ? resolved?.descriptionPrefix || '' : '',
      descriptionSuffix: isSpecial ? resolved?.descriptionSuffix || '' : '',

      side: sideKey,
      modelSrcLeft: resolved?.modelSrcLeft || null,
      modelSrcRight: resolved?.modelSrcRight || null,
      accesoCableado,
    },
  };
}

export function createDuctoPiso({
  heightMm = 700,
  widthMm = 120,
  depthMm = 80,
  x = 0,
  y = 0,
  z = 0,
  code,
}) {
  return createDucto({
    tipo: 'piso',
    widthMm,
    heightMm,
    depthMm,
    x,
    y,
    z,
    code: code || `KPL-DUCT-PISO-${widthMm}x${heightMm}`,
  });
}

export function createDuctoTecho({
  heightMm = 1200,
  widthMm = 120,
  depthMm = 80,
  x = 0,
  y = 720,
  z = 0,
  code,
}) {
  return createDucto({
    tipo: 'techo',
    widthMm,
    heightMm,
    depthMm,
    x,
    y,
    z,
    code: code || `KPL-DUCT-TECHO-${widthMm}x${heightMm}`,
  });
}
