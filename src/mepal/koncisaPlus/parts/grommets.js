// src/koncisaPlus/parts/grommets.js
import { resolveKoncisaCableAccessCodigoPT } from '../rules/koncisaCableAccessRules';

export function createGrommet({
  groupId = null,
  groupName = null,
  finish = 'ALUMINIUM',
  layoutType = null,
  diameterMm = 80,
  x = 0,
  y = 740, //altura grommet
  z = 0,
  rotY = 0,
}) {
  const resolved = resolveKoncisaCableAccessCodigoPT({
    tipo: 'grommet',
    finish,
    layoutType,
  });
  const isLeader = String(layoutType || '').toUpperCase() === 'LEADER';

  return {
    type: 'grommet',
    subtype: '4-tomas',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: isLeader ? 'LKAC670000' : resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.rawCodigoPT,

    name: isLeader ? 'GROMMET LKAC670000' : `Grommet ${finish}`,
    dimMm: {
      diameterMm,
      widthMm: diameterMm,
      depthMm: diameterMm,
      thickMm: 5,
    },
    position: { x, y, z },
    rotation: { x: 0, y: rotY, z: 0 },
    model: {
      kind: 'glb',
      src: isLeader
        ? '/assets/models/koncisaPlus/LKAC670000.glb'
        : '/assets/models/koncisaPlus/LKAC250000.glb',
    },
    meta: {
      category: 'grommets',
      finish,
      ...(isLeader
        ? {
            layoutType: 'LEADER',
            baseCode: 'LKAC670000',
            commercialCode: resolved.codigoPT,
          }
        : {}),
    },
  };
}
