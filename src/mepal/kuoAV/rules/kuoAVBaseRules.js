// src/mepal/kuoAV/rules/kuoAVBaseRules.js
// ─────────────────────────────────────────────────────────────────────────────
// Reglas geométricas y estructurales para columnas y bases de KUO AV.
// Controla rango de elevación, offsets en Y y travesaño extensible.
// ─────────────────────────────────────────────────────────────────────────────

import { KUO_AV_TUNABLES } from '../config/kuoAVTunables.js';

/**
 * Matriz de mapeo para columnas motorizadas y travesaños.
 * TODO: Cargar matriz de Part Numbers para estructuras elevables de CET/SAP.
 */
export const KUO_AV_COLUMN_RULES = {
  // 'KUOAV_COL_MOTOR_730_1200': 'PART_NUMBER_CONFIRMADO',
};

/**
 * Restringe la altura solicitada dentro del rango físico seguro de elevación.
 */
export function clampKuoAVHeight(alturaMm) {
  const h = Number(alturaMm || KUO_AV_TUNABLES.ALTURA_DEFAULT_MM);
  return Math.max(KUO_AV_TUNABLES.ALTURA_MIN_MM, Math.min(KUO_AV_TUNABLES.ALTURA_MAX_MM, h));
}

/**
 * Resuelve los offsets de elevación vertical (eje Y) para todos los componentes.
 */
export function resolveKuoAVElevationOffsets(alturaMm, thickMm = 25) {
  const clampedHeight = clampKuoAVHeight(alturaMm);
  const thickness = Number(thickMm || 25);

  return {
    alturaMm: clampedHeight,
    // La superficie se ubica para que su cara superior coincida exactamente con la altura deseada
    surfaceYMm: clampedHeight - thickness / 2,
    // El travesaño se coloca inmediatamente debajo de la superficie
    crossbarYMm: clampedHeight - thickness - 20,
    // El patín/base de la columna se mantiene en el piso (Y = 0)
    baseYMm: 0,
    // Desplazamiento delta desde la altura mínima
    deltaElevationMm: clampedHeight - KUO_AV_TUNABLES.ALTURA_MIN_MM,
  };
}

/**
 * Resuelve la geometría y posiciones de las columnas y el travesaño.
 */
export function resolveKuoAVBaseRules({
  widthMm = 1400,
  depthMm = 700,
  alturaMm = 730,
  thickMm = 25,
  insetXMm = 60, // Sangría lateral estándar de las columnas respecto a la tapa
} = {}) {
  const realWidthMm = Number(widthMm || 1400);
  const realDepthMm = Number(depthMm || 700);
  const elevation = resolveKuoAVElevationOffsets(alturaMm, thickMm);

  // Posiciones en X de las columnas izquierda y derecha
  const leftColumnX = -realWidthMm / 2 + insetXMm;
  const rightColumnX = realWidthMm / 2 - insetXMm;

  // Largo físico real del travesaño telescópico entre columnas
  const crossbarWidthMm = Math.max(100, realWidthMm - insetXMm * 2);

  return {
    alturaMm: elevation.alturaMm,
    elevation,

    leftColumn: {
      x: leftColumnX,
      y: elevation.baseYMm,
      z: 0,
      depthMm: realDepthMm,
      alturaMm: elevation.alturaMm,
      // TODO: Confirmar si las columnas izquierda y derecha tienen Part Numbers diferentes o simétricos
      logicalCode: `KUOAV_COL_LEFT_H${elevation.alturaMm}`,
      codigoPT: KUO_AV_COLUMN_RULES[`KUOAV_COL_LEFT_H${elevation.alturaMm}`] || null,
    },

    rightColumn: {
      x: rightColumnX,
      y: elevation.baseYMm,
      z: 0,
      depthMm: realDepthMm,
      alturaMm: elevation.alturaMm,
      logicalCode: `KUOAV_COL_RIGHT_H${elevation.alturaMm}`,
      codigoPT: KUO_AV_COLUMN_RULES[`KUOAV_COL_RIGHT_H${elevation.alturaMm}`] || null,
    },

    crossbar: {
      x: 0,
      y: elevation.crossbarYMm,
      z: 0,
      widthMm: crossbarWidthMm,
      logicalCode: `KUOAV_CROSSBAR_${crossbarWidthMm}`,
      codigoPT: null,
    },
  };
}
