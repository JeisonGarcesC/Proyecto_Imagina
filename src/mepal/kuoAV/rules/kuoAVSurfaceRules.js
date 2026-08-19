// src/mepal/kuoAV/rules/kuoAVSurfaceRules.js
// ─────────────────────────────────────────────────────────────────────────────
// Reglas geométricas y de resolución de superficies para KUO AV.
// Determina dimensiones de cobro, logical codes y preparación para códigos SAP.
// ─────────────────────────────────────────────────────────────────────────────

import { KUO_AV_TUNABLES } from '../config/kuoAVTunables.js';

/**
 * Matriz de mapeo: Logical Code -> Part Number comercial SAP/CET.
 * TODO: Cargar matriz de Part Numbers confirmada por ingeniería/CET.
 */
export const KUO_AV_SURFACE_RULES = {
  // Ejemplos de estructura que se completará con datos reales:
  // 'KUOAV_SURF_1200x600_T25-22008689': 'PART_NUMBER_CONFIRMADO',
};

/**
 * Normaliza las medidas reales continuas a medidas estándar de cobro de catálogo.
 */
export function resolveKuoAVSurfaceBillingDimensions(realWidthMm, realDepthMm) {
  const width = Number(realWidthMm || 0);
  const depth = Number(realDepthMm || 0);

  // Ancho de cobro estándar más cercano (o techo)
  let billingWidthMm = KUO_AV_TUNABLES.ANCHOS_MM.find((w) => w >= width) || null;
  if (!billingWidthMm && width > 0) {
    billingWidthMm = Math.ceil(width / 100) * 100;
  }

  // Fondo de cobro estándar más cercano (o techo)
  let billingDepthMm = KUO_AV_TUNABLES.FONDOS_MM.find((d) => d >= depth) || null;
  if (!billingDepthMm && depth > 0) {
    billingDepthMm = Math.ceil(depth / 100) * 100;
  }

  return {
    billingWidthMm: billingWidthMm || width,
    billingDepthMm: billingDepthMm || depth,
  };
}

/**
 * Construye la clave lógica unificada para la superficie perimetral.
 */
export function buildKuoAVSurfaceLogicalCode({
  billingWidthMm,
  billingDepthMm,
  thickMm = 25,
  finishCode = 'STD',
}) {
  return `KUOAV_SURF_${billingWidthMm}x${billingDepthMm}_T${thickMm}-${finishCode || 'STD'}`;
}

/**
 * Resuelve la definición de la superficie según la configuración seleccionada.
 */
export function resolveKuoAVSurfaceRules({
  widthMm = 1400,
  depthMm = 700,
  thickMm = 25,
  finishCode = null,
  canto = 'PVC-2MM',
  especial = false,
} = {}) {
  const realWidthMm = Number(widthMm || 0);
  const realDepthMm = Number(depthMm || 0);

  const { billingWidthMm, billingDepthMm } = resolveKuoAVSurfaceBillingDimensions(
    realWidthMm,
    realDepthMm
  );

  const isSpecial =
    especial ||
    realWidthMm !== billingWidthMm ||
    realDepthMm !== billingDepthMm;

  const logicalCode = buildKuoAVSurfaceLogicalCode({
    billingWidthMm,
    billingDepthMm,
    thickMm,
    finishCode,
  });

  // Consulta en matriz comercial (si no existe, retorna null para resolver vía catálogo dinámico)
  const rawCodigoPT = KUO_AV_SURFACE_RULES[logicalCode] || null;

  const baseName = `Superficie Perimetral Kuo AV ${billingWidthMm}x${billingDepthMm} e=${thickMm}mm`;
  const name = isSpecial ? `ESPECIAL - ${baseName} (Medida Real ${realWidthMm}x${realDepthMm})` : baseName;

  return {
    logicalCode,
    codigoPT: rawCodigoPT,
    existsInCatalog: !!rawCodigoPT,
    rawCodigoPT,

    name,
    realWidthMm,
    realDepthMm,
    billingWidthMm,
    billingDepthMm,
    thickMm,
    canto,
    finishCode,
    isSpecial,

    // TODO: Confirmar con ingeniería si las superficies especiales llevan sufijo/prefijo SAP adicional
    descriptionPrefix: isSpecial ? 'ESPECIAL - ' : '',
    descriptionSuffix: isSpecial ? `Medida real ${realWidthMm / 10}x${realDepthMm / 10} cm` : '',
  };
}
