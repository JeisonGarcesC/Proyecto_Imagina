// src/koncisaPlus/leader/parts/leaderSurfaces.js

import {
  resolveKoncisaLeaderMainSurface,
  resolveKoncisaLeaderReturnSurface,
} from '../rules/leaderSurfaceRules';

export function createLeaderMainSurface({
  groupId,
  groupName,

  widthMm = 1500,
  depthMm = 600,
  thickMm = 30,

  materialType = 'FORMICA',
  finishCode = '22008689',

  x = 0,
  y = 710,
  z = 0,
}) {
  const resolved = resolveKoncisaLeaderMainSurface({
    realWidthMm: widthMm,
    realDepthMm: depthMm,
    thicknessMm: thickMm,
    materialType,
  });

  const name = resolved.isSpecial
    ? `${resolved.descriptionPrefix} Superficie principal líder ${resolved.billingWidthMm}x${resolved.billingDepthMm} - ${resolved.descriptionSuffix}`
    : `Superficie principal líder ${resolved.billingWidthMm}x${resolved.billingDepthMm}`;

  return {
    type: 'superficie',
    subtype: 'leader-main',
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
      depthMm,
      thickMm,
    },

    billingDimMm: {
      widthMm: resolved.billingWidthMm,
      depthMm: resolved.billingDepthMm,
      thickMm,
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
      category: 'superficies',
      layoutType: 'LEADER',
      leaderRole: 'MAIN',

      realWidthMm: widthMm,
      realDepthMm: depthMm,

      billingWidthMm: resolved.billingWidthMm,
      billingDepthMm: resolved.billingDepthMm,

      materialType,
      finishCode,

      isSpecial: resolved.isSpecial,
      descriptionPrefix: resolved.descriptionPrefix,
      descriptionSuffix: resolved.descriptionSuffix,
    },
  };
}

export function createLeaderReturnSurface({
  groupId,
  groupName,

  side = 'RIGHT',

  lengthMm = 900,
  depthMm = 600,
  thickMm = 30,

  x = 0,
  y = 710,
  z = 0,

  rotY = Math.PI / 2,

  hasGrommetBox = false,
}) {
  const resolved = resolveKoncisaLeaderReturnSurface({
    side,
    realLengthMm: lengthMm,
  });

  const name = resolved.isSpecial
    ? `${resolved.descriptionPrefix} Superficie retorno líder ${resolved.side} ${resolved.billingLengthMm} - ${resolved.descriptionSuffix}`
    : `Superficie retorno líder ${resolved.side} ${resolved.billingLengthMm}`;

  return {
    type: 'superficie',
    subtype: 'leader-return',
    line: 'KONCISA.PLUS',

    groupId,
    groupName,

    code: resolved.codigoPT,
    logicalCode: resolved.logicalCode,
    existsInCatalog: resolved.exists,
    rawCodigoPT: resolved.codigoPT,

    name,

    dimMm: {
      widthMm: lengthMm,
      depthMm,
      thickMm,
    },

    billingDimMm: {
      widthMm: resolved.billingLengthMm,
      depthMm,
      thickMm,
    },

    position: {
      x,
      y,
      z,
    },

    rotation: {
      x: 0,
      y: rotY,
      z: 0,
    },

    meta: {
      category: 'superficies',
      layoutType: 'LEADER',
      leaderRole: 'RETURN',

      side: resolved.side,
      hasGrommetBox,

      realWidthMm: lengthMm,
      realDepthMm: depthMm,

      billingWidthMm: resolved.billingLengthMm,
      billingDepthMm: depthMm,

      isSpecial: resolved.isSpecial,
      descriptionPrefix: resolved.descriptionPrefix,
      descriptionSuffix: resolved.descriptionSuffix,
    },
  };
}
