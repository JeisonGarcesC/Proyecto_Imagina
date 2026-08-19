// src/mepal/kuoAV/rules/kuoAVAccessoryRules.js
// ─────────────────────────────────────────────────────────────────────────────
// Reglas de accesorios y compatibilidad para KUO AV.
// Controla inclusión, posicionamiento y opciones de Kit Fuente, Vértebra y Grommet.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveKuoAVElevationOffsets } from './kuoAVBaseRules';

/**
 * Matriz de mapeo comercial de accesorios.
 * TODO: Cargar matriz de Part Numbers para kits eléctricos y pasacables de CET/SAP.
 */
export const KUO_AV_ACCESSORY_RULES = {
  // 'KUOAV_POWERKIT_ESTANDAR': 'PART_NUMBER_CONFIRMADO',
  // 'KUOAV_POWERKIT_ELEVADO': 'PART_NUMBER_CONFIRMADO',
  // 'KUOAV_VERTEBRA_IZQ': 'PART_NUMBER_CONFIRMADO',
  // 'KUOAV_GROMMET_ALUMINIUM': 'PART_NUMBER_CONFIRMADO',
};

/**
 * Resuelve la lista de accesorios que deben incluirse en la configuración de KUO AV.
 */
export function resolveKuoAVAccessories({
  widthMm = 1400,
  depthMm = 700,
  alturaMm = 730,
  thickMm = 25,
  kitFuente = false,
  elevarKitFIzquierdo = false,
  vertebraLateral = false,
  ladoVertebra = 'izq', // 'izq' | 'der'
  acabadoGrommet = 'ALUMINIUM', // 'NONE' | 'ALUMINIUM' | 'BLACK' | 'WHITE'
} = {}) {
  const realWidthMm = Number(widthMm || 1400);
  const realDepthMm = Number(depthMm || 700);
  const elevation = resolveKuoAVElevationOffsets(alturaMm, thickMm);

  const accessories = [];

  // 1. Kit Fuente de electrificación
  if (kitFuente) {
    const isElevado = !!elevarKitFIzquierdo;
    // Si es elevado se ubica sobre la superficie en el cuadrante izquierdo; si no, bajo la tapa
    const kitX = isElevado ? -realWidthMm / 2 + 150 : 0;
    const kitY = isElevado ? elevation.surfaceYMm + thickMm / 2 + 40 : elevation.surfaceYMm - 60;
    const kitZ = -realDepthMm / 2 + 100;

    const logicalCode = `KUOAV_POWERKIT_${isElevado ? 'ELEVADO' : 'ESTANDAR'}`;

    accessories.push({
      type: 'kit_fuente',
      elevado: isElevado,
      logicalCode,
      codigoPT: KUO_AV_ACCESSORY_RULES[logicalCode] || null,
      position: { x: kitX, y: kitY, z: kitZ },
      name: `Kit Fuente Kuo AV ${isElevado ? '(Elevado Izquierdo)' : '(Bajo Tapa)'}`,
      // TODO: Confirmar con ingeniería si el Kit Fuente elevado requiere mecanizado especial en la tapa
    });
  }

  // 2. Vértebra Lateral pasacables
  if (vertebraLateral) {
    const isLeft = ladoVertebra === 'izq';
    const vertX = isLeft ? -realWidthMm / 2 + 30 : realWidthMm / 2 - 30;
    const vertY = 0; // Base en el piso
    const vertZ = 0; // Centrada con la columna

    const logicalCode = `KUOAV_VERTEBRA_${isLeft ? 'IZQ' : 'DER'}`;

    accessories.push({
      type: 'vertebra',
      lado: ladoVertebra,
      alturaMm: elevation.alturaMm,
      logicalCode,
      codigoPT: KUO_AV_ACCESSORY_RULES[logicalCode] || null,
      position: { x: vertX, y: vertY, z: vertZ },
      name: `Vértebra Lateral Pasacables Kuo AV (${isLeft ? 'Izquierda' : 'Derecha'})`,
      // TODO: Confirmar si la vértebra se fija a la columna o a la estructura inferior de la tapa
    });
  }

  // 3. Grommet pasacables
  if (acabadoGrommet && acabadoGrommet !== 'NONE') {
    const grommetX = 0;
    const grommetY = elevation.surfaceYMm + thickMm / 2;
    const grommetZ = -realDepthMm / 2 + 60; // Cerca del borde posterior

    const logicalCode = `KUOAV_GROMMET_${String(acabadoGrommet).toUpperCase()}`;

    accessories.push({
      type: 'grommet',
      finish: acabadoGrommet,
      logicalCode,
      codigoPT: KUO_AV_ACCESSORY_RULES[logicalCode] || null,
      position: { x: grommetX, y: grommetY, z: grommetZ },
      name: `Grommet Kuo AV (${acabadoGrommet})`,
      // TODO: Confirmar si KUO AV lleva 1 o 2 grommets según el ancho de la mesa (ej: >= 1600mm)
    });
  }

  return {
    accessories,
    count: accessories.length,
  };
}
