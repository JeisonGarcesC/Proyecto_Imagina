// src/mepal/compendio/builders/CompendioBuilder.js
import {
  COMPENDIO_DEFAULT_CONFIG,
  COMPENDIO_DIMENSIONS,
  COMPENDIO_EN_P_WIDTHS,
  COMPENDIO_CURVE_SAGITTA_MM,
  COMPENDIO_EN_D_WIDTHS,
  COMPENDIO_EN_D_CURVE_SAGITTA_MM,
  COMPENDIO_ORGANICA_CURVA_60_75_WIDTHS,
  COMPENDIO_ORGANICA_CURVA_2_WIDTHS,
  COMPENDIO_ORGANICA_CURVA_2_DEPTHS_FOR_1500,
  COMPENDIO_ORGANICA_CURVA_2_DEPTHS_DEFAULT,
  isCompendioCurva2,
  isCompendioCurva60a75,
} from '../definitions/compendioDefaults.js';

export function normalizeCompendioConfig(raw = {}) {
  const rawType = raw.surfaceType || raw.type || '';
  const isCurva2 = isCompendioCurva2(rawType);
  const isCurva60a75 = !isCurva2 && isCompendioCurva60a75(rawType);
  const isEnP = String(rawType).trim() === 'En P';
  const isEnD = String(rawType).trim() === 'En D';

  let surfaceCategory = raw.surfaceCategory;
  if (isCurva2 || isCurva60a75) {
    surfaceCategory = 'Superficies orgánicas';
  } else if (isEnP || isEnD || String(rawType).trim() === 'Rectangular') {
    surfaceCategory = 'Superficies principales';
  } else if (!surfaceCategory) {
    surfaceCategory = COMPENDIO_DEFAULT_CONFIG.surfaceCategory;
  }

  let surfaceType = rawType;
  if (isCurva2) {
    surfaceType = 'Curva de 60 a 75 - 2';
  } else if (isCurva60a75) {
    surfaceType = 'Curva de 60 a 75';
  } else if (!surfaceType) {
    surfaceType = COMPENDIO_DEFAULT_CONFIG.surfaceType;
  }

  // Ninguna orgánica ni figura En P o En D admite medida especial
  const modoEspecial = isEnP || isEnD || isCurva60a75 || isCurva2 ? false : Boolean(raw.modoEspecial);
  const inverted = Boolean(raw.inverted);

  let widthMm;
  const rawW = Number(raw.widthMm);
  if (isCurva2) {
    widthMm = COMPENDIO_ORGANICA_CURVA_2_WIDTHS.includes(rawW) ? rawW : 1500;
  } else if (isCurva60a75) {
    widthMm = COMPENDIO_ORGANICA_CURVA_60_75_WIDTHS.includes(rawW) ? rawW : 600;
  } else if (isEnP) {
    widthMm = COMPENDIO_EN_P_WIDTHS.includes(rawW) ? rawW : 1200;
  } else if (isEnD) {
    widthMm = COMPENDIO_EN_D_WIDTHS.includes(rawW) ? rawW : 900;
  } else {
    widthMm = Number.isFinite(rawW)
      ? Math.max(600, Math.min(1880, rawW))
      : 600;
  }

  let depthMm;
  if (isCurva2) {
    if (widthMm === 1500) {
      depthMm = Number(raw.depthMm) === 1200 ? 1200 : 900;
    } else {
      depthMm = 900;
    }
  } else if (isCurva60a75) {
    depthMm = 750;
  } else {
    depthMm = Number(raw.depthMm) === 750 ? 750 : 600;
  }

  const thickMm = Number.isFinite(Number(raw.thickMm))
    ? Number(raw.thickMm)
    : COMPENDIO_DIMENSIONS.surfaceThicknessMm;
  const supportHeightMm = COMPENDIO_DIMENSIONS.supportHeightMm;
  const surfaceColor = raw.surfaceColor || COMPENDIO_DEFAULT_CONFIG.surfaceColor;
  const finishId = raw.finishId || COMPENDIO_DEFAULT_CONFIG.finishId;

  return {
    ...COMPENDIO_DEFAULT_CONFIG,
    ...raw,
    surfaceCategory,
    surfaceType,
    modoEspecial,
    inverted,
    widthMm,
    depthMm,
    thickMm,
    supportHeightMm,
    surfaceColor,
    finishId,
  };
}

export function buildCompendio(config = {}) {
  const c = normalizeCompendioConfig(config);
  const isEnP = c.surfaceType === 'En P';
  const isEnD = c.surfaceType === 'En D';
  const isCurva60a75 = isCompendioCurva60a75(c.surfaceType);
  const isCurva2 = isCompendioCurva2(c.surfaceType);

  let shapeType = 'RECTANGULAR';
  if (isEnD) shapeType = 'EN_D';
  else if (isEnP) shapeType = 'EN_P';
  else if (isCurva2) shapeType = 'ORGANICA_CURVA_2';
  else if (isCurva60a75) shapeType = 'ORGANICA_CURVA_60_75';

  const typeCode = c.surfaceType.toUpperCase().replace(/\s+/g, '_');

  const totalDepthMm = isEnD
    ? c.depthMm + COMPENDIO_EN_D_CURVE_SAGITTA_MM
    : isCurva2
      ? c.depthMm
      : isCurva60a75
        ? 750
        : c.depthMm;

  const desc = isCurva2
    ? `Superficie orgánica curva 2 ${c.inverted ? '75 a ' + (c.depthMm / 10) : (c.depthMm / 10) + ' a 75'} Compendio ${c.widthMm} mm`
    : isCurva60a75
      ? `Superficie orgánica curva ${c.inverted ? '60 a 75 (inv.)' : '75 a 60'} Compendio ${c.widthMm} mm`
      : `${c.modoEspecial ? 'ESPECIAL · ' : ''}Superficie ${c.surfaceType} Compendio ${c.widthMm}x${c.depthMm} mm`;

  const surfacePart = {
    key: 'surface-0',
    role: 'SURFACE',
    type: 'SURFACE',
    shapeType,
    materialRole: 'surface',
    materialBase: 'FORMICA',
    dimensions: [c.widthMm, c.thickMm, totalDepthMm],
    position: [0, c.supportHeightMm + c.thickMm / 2, 0],
    rotationY: 0,
    code: `COMP_SUP_${typeCode}${c.inverted ? '_INV' : ''}_${c.widthMm}_${totalDepthMm}`,
    description: desc,
    moduleIndex: 0,
    meta: {
      category: isCurva60a75 || isCurva2 ? 'organicas' : 'superficies',
      surfaceCategory: c.surfaceCategory,
      surfaceType: c.surfaceType,
      shapeType,
      inverted: c.inverted,
      rectaLengthMm: isEnP ? c.widthMm - COMPENDIO_CURVE_SAGITTA_MM : c.widthMm,
      straightDepthMm: isCurva2 ? (c.inverted ? 750 : c.depthMm) : isCurva60a75 ? 600 : c.depthMm,
      leftDepthMm: isCurva2 ? (c.inverted ? 750 : c.depthMm) : isCurva60a75 ? (c.inverted ? 600 : 750) : c.depthMm,
      rightDepthMm: isCurva2 ? (c.inverted ? c.depthMm : 750) : isCurva60a75 ? (c.inverted ? 750 : 600) : c.depthMm,
      straightSegmentMm: isCurva2 ? (c.inverted ? 48 : 600) : isCurva60a75 ? 48 : 0,
      curveSagittaMm: isEnD
        ? COMPENDIO_EN_D_CURVE_SAGITTA_MM
        : isEnP
          ? COMPENDIO_CURVE_SAGITTA_MM
          : 0,
      line: 'COMPENDIO',
    },
  };

  return {
    config: c,
    parts: [surfacePart],
    bounds: {
      widthMm: c.widthMm,
      depthMm: totalDepthMm,
      heightMm: c.supportHeightMm + c.thickMm,
    },
    thickMm: c.thickMm,
    productKey: `COMPENDIO:${JSON.stringify(c)}`,
  };
}

