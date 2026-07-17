// src/koncisaPlus/parts/costados.js
import { resolveKoncisaCostadoTerminal } from '../rules/koncisaCostadoRules';
import { resolveKoncisaCostadoIntermedio } from '../rules/resolveKoncisaCostadoIntermedio';

export function createCostado({
  groupId = null,
  groupName = null,

  tipo = 'terminal', // terminal | intermedio
  tipoPuesto = 'sencillo', // sencillo | doble

  depthMm = 600,
  forma = 'RECT',
  lado = 'izq', // izq | der | center

  x = 0,
  y = 0,
  z = 0,
}) {
  let resolved = null;

  if (tipo === 'terminal') {
    resolved = resolveKoncisaCostadoTerminal({
      tipoPuesto,
      depthMm,
      forma,
      lado,
    });
  } else if (tipo === 'intermedio') {
    resolved = resolveKoncisaCostadoIntermedio({
      tipoPuesto,
      depthMm,
    });
  }

  const rotationY = tipo === 'terminal' && lado === 'der' ? Math.PI : 0;

  const hasAssembly = !!resolved?.assembly;
  const isSpecial = !!resolved?.isSpecial;

  const realDepthMm = Number(resolved?.realDepthMm ?? depthMm);

  const billingDepthMm = Number(resolved?.billingDepthMm ?? depthMm);

  const baseName =
    tipo === 'intermedio'
      ? `Costado intermedio ${billingDepthMm}`
      : `Costado terminal ${lado} ${forma} ${billingDepthMm}`;

  const name = isSpecial
    ? `${resolved?.descriptionPrefix || 'ESPECIAL -'} ${baseName}${
        resolved?.descriptionSuffix ? ` - ${resolved.descriptionSuffix}` : ''
      }`
    : baseName;

  return {
    type: 'costado',
    subtype: tipo,
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved?.codigoPT || null,
    logicalCode: resolved?.logicalCode || null,
    existsInCatalog: !!resolved?.exists,
    rawCodigoPT: resolved?.codigoPT || null,

    name,

    dimMm: {
      depthMm: realDepthMm,
      realDepthMm,
      billingDepthMm,
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
      kind: hasAssembly ? 'koncisa-costado-assembly' : 'glb',

      src: hasAssembly ? null : resolved?.modelSrc || null,
    },

    meta: {
      category: 'costados',

      tipo,
      lado,
      forma,
      tipoPuesto,

      depthMm: realDepthMm,
      realDepthMm,
      billingDepthMm,

      isSpecial,

      descriptionPrefix: isSpecial ? resolved?.descriptionPrefix || '' : '',

      descriptionSuffix: isSpecial ? resolved?.descriptionSuffix || '' : '',

      costadoAssembly: resolved?.assembly || null,

      // Se conserva el GLB completo como respaldo.
      fallbackModelSrc: resolved?.modelSrc || null,
    },
  };
}
