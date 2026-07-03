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
  x = 0,
  y = 0,
  z = 0,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  side = 'RIGHT',
}) {
  const resolved = resolveKoncisaDucto({
    tipoPuesto,
    tipoModulo,
    nominalWidthMm,
  });

  const sideKey = String(side || 'RIGHT').toUpperCase();

  const modelSrc =
    sideKey === 'LEFT'
      ? resolved?.modelSrcLeft || resolved?.modelSrc
      : resolved?.modelSrcRight || resolved?.modelSrc;

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

    name: `Ducto ${tipoPuesto} ${tipoModulo} ${nominalWidthMm}`,

    position: { x, y, z },
    rotation: { x: rotX, y: rotY, z: rotZ },

    model: {
      kind: 'glb',
      //src: resolved?.modelSrc || null,
      src: modelSrc || null,
    },

    meta: {
      category: 'ductos',
      tipoPuesto,
      tipoModulo,
      nominalWidthMm,
      side: sideKey,
      modelSrcLeft: resolved?.modelSrcLeft || null,
      modelSrcRight: resolved?.modelSrcRight || null,
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
