// src/mepal/kuoAV/parts/kuoAVParts.js
// ─────────────────────────────────────────────────────────────────────────────
// Definición de componentes abstractos para KUO AV - Superficie Perimetral.
// Asigna a cada pieza su código comercial CET, nombre, tipo, rol,
// ruta de GLB real o generador procedural, y metadata de ensamble.
// ─────────────────────────────────────────────────────────────────────────────

import { KUO_AV_SAP_CODES, KUO_AV_TUNABLES } from '../config/kuoAVTunables.js';

/**
 * Roles estructurales y funcionales de las piezas de KUO AV.
 */
export const KUO_AV_PART_ROLES = Object.freeze({
  SURFACE: 'SURFACE',
  LEFT_COLUMN: 'LEFT_COLUMN',
  RIGHT_COLUMN: 'RIGHT_COLUMN',
  CROSSBAR: 'CROSSBAR',
  POWER_KIT: 'POWER_KIT',
  SOCKET_SUPPORT: 'SOCKET_SUPPORT',
  VERTEBRA: 'VERTEBRA',
  GROMMET: 'GROMMET',
  DUCT: 'DUCT',
  CONTROL_PAD: 'CONTROL_PAD',
});

/**
 * Tipos de piezas para categorización en BOM y escena.
 */
export const KUO_AV_PART_TYPES = Object.freeze({
  SUPERFICIE: 'superficie',
  COLUMNA: 'columna',
  VIGA: 'viga',
  KIT_FUENTE: 'kit_fuente',
  SOPORTE_TOMAS: 'soporte_tomas',
  VERTEBRA: 'vertebra',
  GROMMET: 'grommet',
  DUCTO: 'ducto',
  CONTROL: 'control',
});

/**
 * 1. Superficie perimetral paramétrica (LKSU010010).
 * Procedural BoxGeometry + Cantos. No utiliza GLB.
 */
export function createKuoAVSurfacePart({
  groupId = null,
  groupName = null,
  widthMm = 1200,
  depthMm = 600,
  thickMm = 30,
  finishCode = null,
  canto = 'PVC-2MM',
  perforada = false,
  x = 0,
  y = 730,
  z = 0,
} = {}) {
  const realWidthMm = Number(widthMm || 0);
  const realDepthMm = Number(depthMm || 0);

  return {
    type: KUO_AV_PART_TYPES.SUPERFICIE,
    subtype: 'perimetral',
    role: KUO_AV_PART_ROLES.SURFACE,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.SUPERFICIE,
    logicalCode: `LKSU010010_${realWidthMm}x${realDepthMm}_T${thickMm}`,
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.SUPERFICIE,

    name: `Superficie Perimetral Kuo AV LKSU010010 ${realWidthMm}x${realDepthMm} e=${thickMm}mm`,

    dimMm: {
      widthMm: realWidthMm,
      depthMm: realDepthMm,
      thickMm,
    },

    billingDimMm: {
      widthMm: realWidthMm,
      depthMm: realDepthMm,
      thickMm,
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'procedural',
      src: null,
    },

    meta: {
      category: 'superficies',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.SUPERFICIE,
      perforada,
      canto,
      finishCode,
      alturaTrabajoMm: y,
      realWidthMm,
      realDepthMm,
      thickMm,
    },
  };
}

/**
 * 2. Costados terminales con base motorizados izquierdo y derecho (KUSO800000).
 * Carga KUSO800000_IZQ.glb para izquierda y KUSO800000_DER.glb para derecha.
 * Escala 1,1,1 y rotación 0,0,0 (sin espejar manualmente).
 */
export function createKuoAVColumnPart({
  groupId = null,
  groupName = null,
  side = 'left', // 'left' | 'right'
  alturaMm = 730,
  depthMm = 600,
  x = 0,
  y = 0,
  z = 0,
  modelSrc = null,
} = {}) {
  const isLeft = side === 'left';
  const role = isLeft ? KUO_AV_PART_ROLES.LEFT_COLUMN : KUO_AV_PART_ROLES.RIGHT_COLUMN;
  const glbFilename = isLeft
    ? KUO_AV_TUNABLES.GLB_FILES.COSTADO_IZQ
    : KUO_AV_TUNABLES.GLB_FILES.COSTADO_DER;

  return {
    type: KUO_AV_PART_TYPES.COLUMNA,
    subtype: 'motorizada_telescopica',
    role,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.COSTADO_MOTORIZADO,
    logicalCode: `KUSO800000_${side.toUpperCase()}`,
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.COSTADO_MOTORIZADO,

    name: `Costado Terminal con Base Kuo AV (${isLeft ? 'Izquierdo' : 'Derecho'}) KUSO800000`,

    dimMm: {
      widthMm: 80,
      depthMm: Number(depthMm || 600),
      heightMm: Number(alturaMm || 730),
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'glb',
      src: modelSrc || `${KUO_AV_TUNABLES.GLB_BASE}${glbFilename}`,
    },

    meta: {
      category: 'columnas',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.COSTADO_MOTORIZADO,
      side,
      alturaMm,
      depthMm,
    },
  };
}

/**
 * 3. Viga soporte de superficie (KUSO420000).
 * Carga KUSO420000_150.glb como referencia visual fija (sin deformar).
 * TODO: Evaluar si para anchos variables requiere geometría procedural extensible.
 */
export function createKuoAVCrossbarPart({
  groupId = null,
  groupName = null,
  widthMm = 1200,
  x = 0,
  y = 700,
  z = 0,
  modelSrc = null,
} = {}) {
  const realWidthMm = Number(widthMm || 0);

  return {
    type: KUO_AV_PART_TYPES.VIGA,
    subtype: 'viga_soporte',
    role: KUO_AV_PART_ROLES.CROSSBAR,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.VIGA_SOPORTE,
    logicalCode: `KUSO420000_${realWidthMm}`,
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.VIGA_SOPORTE,

    name: `Viga Soporte Superficie Kuo AV KUSO420000`,

    dimMm: {
      widthMm: realWidthMm,
      heightMm: 40,
      depthMm: 40,
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'glb',
      src: modelSrc || `${KUO_AV_TUNABLES.GLB_BASE}${KUO_AV_TUNABLES.GLB_FILES.VIGA_SOPORTE}`,
    },

    meta: {
      category: 'vigas',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.VIGA_SOPORTE,
      widthMm: realWidthMm,
    },
  };
}

/**
 * 4. Kit fuente alimentación (KUAC1040000).
 * Carga KUAC1040000_74.glb como modelo fijo.
 */
export function createKuoAVPowerKitPart({
  groupId = null,
  groupName = null,
  side = 'left',
  elevado = false,
  x = 0,
  y = 710,
  z = 0,
  modelSrc = null,
} = {}) {
  const sideLabel = side === 'right' ? 'Derecho' : 'Izquierdo';
  return {
    type: KUO_AV_PART_TYPES.KIT_FUENTE,
    subtype: `columna_motorizada_${side}`,
    role: KUO_AV_PART_ROLES.POWER_KIT,
    line: 'KUO.AV',
    side,

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.KIT_FUENTE,
    logicalCode: `KUAC1040000_${side.toUpperCase()}`,
    lookupTag: 'KUAC1040000',
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.KIT_FUENTE,

    name: `Columna Motorizada / Kit Fuente Kuo AV KUAC1040000 (${sideLabel})`,

    dimMm: {
      widthMm: 58.7,
      depthMm: 96.5,
      heightMm: 695.0,
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'glb',
      src: modelSrc || `${KUO_AV_TUNABLES.GLB_BASE}${KUO_AV_TUNABLES.GLB_FILES.KIT_FUENTE}`,
    },

    meta: {
      category: 'mecanismos',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.KIT_FUENTE,
      side,
      elevado,
    },
  };
}

/**
 * 5. Kit soporte tomas (KUAC680000).
 * Carga KUAC680000.glb como modelo fijo.
 */
export function createKuoAVSocketSupportPart({
  groupId = null,
  groupName = null,
  x = 0,
  y = 710,
  z = 0,
  modelSrc = null,
} = {}) {
  return {
    type: KUO_AV_PART_TYPES.SOPORTE_TOMAS,
    subtype: 'soporte_tomas',
    role: KUO_AV_PART_ROLES.SOCKET_SUPPORT,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.SOPORTE_TOMAS,
    logicalCode: 'KUAC680000',
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.SOPORTE_TOMAS,

    name: 'Kit Soporte Tomas Kuo AV KUAC680000',

    dimMm: {
      widthMm: 150,
      depthMm: 80,
      heightMm: 60,
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'glb',
      src: modelSrc || `${KUO_AV_TUNABLES.GLB_BASE}${KUO_AV_TUNABLES.GLB_FILES.SOPORTE_TOMAS}`,
    },

    meta: {
      category: 'electrificacion',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.SOPORTE_TOMAS,
    },
  };
}

/**
 * 6. Vértebra metálica altura variable (KUAC650000).
 * Carga KUAC650000.glb como modelo fijo inicialmente (sin scale.y automático).
 */
export function createKuoAVVertebraPart({
  groupId = null,
  groupName = null,
  alturaMm = 730,
  lado = 'izq', // 'izq' | 'der'
  isLateral = false,
  x = 0,
  y = 0,
  z = 0,
  modelSrc = null,
} = {}) {
  const lookupTag = isLateral ? 'KUAC650000_ALT_LAT' : 'KUAC650000';
  const glbFilename = isLateral
    ? KUO_AV_TUNABLES.GLB_FILES.VERTEBRA_LATERAL
    : KUO_AV_TUNABLES.GLB_FILES.VERTEBRA;

  return {
    type: KUO_AV_PART_TYPES.VERTEBRA,
    subtype: 'pasacables_articulado',
    role: KUO_AV_PART_ROLES.VERTEBRA,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_SAP_CODES.VERTEBRA,
    logicalCode: lookupTag,
    lookupTag,
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_SAP_CODES.VERTEBRA,

    name: `Vértebra Pasacables Kuo AV ${isLateral ? 'Lateral' : 'Central'} (${lado.toUpperCase()})`,

    dimMm: {
      widthMm: 60,
      depthMm: 60,
      heightMm: Number(alturaMm || 730),
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'glb',
      src: modelSrc || `${KUO_AV_TUNABLES.GLB_BASE}${glbFilename}`,
    },

    meta: {
      category: 'pasacables',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.VERTEBRA,
      codigoSAP: KUO_AV_SAP_CODES.VERTEBRA,
      lookupTag,
      isLateral,
      lado,
      alturaMm,
    },
  };
}

/**
 * 7. Grommet aluminio 4 tomas (LKAC250000).
 * Carga LKAC250000.glb como modelo fijo.
 */
export function createKuoAVGrommetPart({
  groupId = null,
  groupName = null,
  finish = 'ALUMINIUM',
  tipo = 'simple',
  diameterMm = 80,
  x = 0,
  y = 735,
  z = 0,
  modelSrc = null,
} = {}) {
  const isDoble = tipo === 'doble';
  return {
    type: KUO_AV_PART_TYPES.GROMMET,
    subtype: isDoble ? 'pasatapas_doble_8tomas' : 'pasatapas_simple_4tomas',
    role: KUO_AV_PART_ROLES.GROMMET,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.GROMMET,
    logicalCode: isDoble ? `LKAC250000_DOBLE_${finish.toUpperCase()}` : `LKAC250000_${finish.toUpperCase()}`,
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.GROMMET,

    name: isDoble
      ? `Grommet Aluminio Doble LKAC250000_DOBLE (${finish})`
      : `Grommet Aluminio 4 Tomas LKAC250000 (${finish})`,

    dimMm: {
      widthMm: 512,
      heightMm: 33.6,
      depthMm: isDoble ? 257 : 115.5,
      thickMm: 5,
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'glb',
      src: modelSrc || `${KUO_AV_TUNABLES.GLB_BASE}${isDoble ? KUO_AV_TUNABLES.GLB_FILES.GROMMET_DOBLE : KUO_AV_TUNABLES.GLB_FILES.GROMMET}`,
    },

    meta: {
      category: 'grommets',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.GROMMET,
      finish,
      tipoGrommet: tipo,
    },
  };
}

/**
 * 8. Ducto cableado (KUSO860000).
 * Carga KUSO860000_165.glb como modelo fijo.
 */
export function createKuoAVDuctPart({
  groupId = null,
  groupName = null,
  x = 0,
  y = 680,
  z = 0,
  modelSrc = null,
} = {}) {
  return {
    type: KUO_AV_PART_TYPES.DUCTO,
    subtype: 'ducto_cableado',
    role: KUO_AV_PART_ROLES.DUCT,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.DUCTO_CABLEADO,
    logicalCode: 'KUSO860000',
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.DUCTO_CABLEADO,

    name: 'Ducto Cableado Kuo AV KUSO860000',

    dimMm: {
      widthMm: 1200,
      heightMm: 50,
      depthMm: 100,
    },

    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'glb',
      src: modelSrc || `${KUO_AV_TUNABLES.GLB_BASE}${KUO_AV_TUNABLES.GLB_FILES.DUCTO_CABLEADO}`,
    },

    meta: {
      category: 'ductos',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.DUCTO_CABLEADO,
    },
  };
}

/**
 * 9. Botonera LINAK (DPBK06).
 * Componente lógico/BOM sin GLB. No crea proxy ni malla 3D.
 */
export function createKuoAVControlPadPart({
  groupId = null,
  groupName = null,
} = {}) {
  return {
    type: KUO_AV_PART_TYPES.CONTROL,
    subtype: 'botonera_linak',
    role: KUO_AV_PART_ROLES.CONTROL_PAD,
    line: 'KUO.AV',

    groupId,
    groupName,

    code: KUO_AV_TUNABLES.CET_CODES.BOTONERA_LINAK,
    logicalCode: 'DPBK06',
    existsInCatalog: true,
    rawCodigoPT: KUO_AV_TUNABLES.CET_CODES.BOTONERA_LINAK,

    name: 'Botonera LINAK Control Altura DPBK06',

    dimMm: {
      widthMm: 60,
      heightMm: 20,
      depthMm: 40,
    },

    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },

    model: {
      kind: 'logical', // Lógico / BOM Only (sin representación 3D)
      src: null,
    },

    meta: {
      category: 'controles',
      codigoCET: KUO_AV_TUNABLES.CET_CODES.BOTONERA_LINAK,
    },
  };
}
