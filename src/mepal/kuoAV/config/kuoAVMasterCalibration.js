// src/mepal/kuoAV/config/kuoAVMasterCalibration.js
// ─────────────────────────────────────────────────────────────────────────────
// CALIBRACIÓN CANÓNICA MASTER CET → IMAGINA: KUO AV - SUPERFICIE PERIMETRAL
// ─────────────────────────────────────────────────────────────────────────────
// Fuente de verdad extraída directamente del modelo maestro CET:
// "c:/Users/fermalhe/OneDrive - Carvajal S.A/Documentos 2021/Escritorio/Kuo Altura Variable/KuoGo_prueba_01.glb"
//
// SISTEMA DE COORDENADAS MASTER CET:
// - Centro de mesa en X: -0.9264 m (-926.4 mm)
// - Nivel de piso en Y: 0.0000 m (0.0 mm)
// - Centro de fondo en Z: +0.6869 m (+686.9 mm)
// - Altura de trabajo en Y: 0.7455 m (745.5 mm)
//
// SISTEMA DE COORDENADAS CANÓNICO IMAGINA:
// - Mesa centrada en X = 0.0 mm
// - Nivel de piso en Y = 0.0 mm
// - Mesa centrada en Z = 0.0 mm (Frente en +Z, Posterior en -Z)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. DATOS DE REFERENCIA DE LA MESA PATRÓN MASTER CET
 */
export const MASTER_REFERENCE = Object.freeze({
  archivoOrigen: 'KuoGo_prueba_01.glb',
  anchoMm: 1200,
  fondoMm: 600,
  alturaComercialMm: 730,
  alturaRealTopMm: 745.5,
  espesorSuperficieMm: 31.4,
  descripcion: 'Configuración de referencia canónica KUO AV Perimetral exportada desde CET',
});

/**
 * 2. ORIGEN Y VECTOR DE TRASLACIÓN CET → IMAGINA
 */
export const MASTER_ORIGIN = Object.freeze({
  worldCenterXMm: -926.4,
  worldFloorYMm: 0.0,
  worldCenterZMm: 686.9,
  traslacionImaginaMm: {
    deltaX: 926.4,
    deltaY: 0.0,
    deltaZ: -686.9,
  },
});

/**
 * 3. SUPERFICIE MASTER DE REFERENCIA
 */
export const MASTER_SURFACE = Object.freeze({
  codigo: 'LKSU010010',
  dimensionesMm: {
    ancho: 1200.0,
    espesor: 31.4,
    fondo: 600.0,
  },
  posicionMasterWorldMm: {
    x: -926.4,
    y: 729.7,
    z: 686.9,
  },
  posicionImaginaMm: {
    x: 0.0,
    y: 729.7,
    z: 0.0,
  },
  cotaSuperiorYMm: 745.5,
  cotaInferiorYMm: 714.0,
});

/**
 * 4. COMPONENTES EXTRAÍDOS DEL MASTER CET
 */
export const MASTER_COMPONENTS = Object.freeze({
  // ── Costado / Pata Izquierda con Base ──
  costadoIzquierdo: {
    codigo: 'KUSO800000',
    glb: 'KUSO800000_IZQ.glb',
    nodoMaster: 64,
    identificationStatus: 'CONFIRMED_100_PERCENT',
    positionMasterWorldMm: { x: -1488.4, y: 355.0, z: 686.9 },
    positionImaginaMm: { x: -562.0, y: 355.0, z: 0.0 },
    dimensionsMasterMm: { x: 76.0, y: 710.0, z: 600.0 },
    insetLateralMm: 38.0, // Distancia del borde exterior (X=-600) al centro de la pata
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Apoyado en piso Y=0, soporte superior bajo tapa Y=710.0',
  },

  // ── Costado / Pata Derecha con Base ──
  costadoDerecho: {
    codigo: 'KUSO800000',
    glb: 'KUSO800000_DER.glb',
    nodoMaster: 82,
    identificationStatus: 'CONFIRMED_100_PERCENT',
    positionMasterWorldMm: { x: -364.4, y: 355.0, z: 686.9 },
    positionImaginaMm: { x: 562.0, y: 355.0, z: 0.0 },
    dimensionsMasterMm: { x: 76.0, y: 710.0, z: 600.0 },
    insetLateralMm: 38.0, // Distancia del borde exterior (X=+600) al centro de la pata
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Apoyado en piso Y=0, soporte superior bajo tapa Y=710.0',
  },

  // ── Viga Soporte de Superficie ──
  vigaSoporte: {
    codigo: 'KUSO420000',
    glb: 'KUSO420000_150.glb',
    nodoMaster: 42,
    identificationStatus: 'NOMINAL_VARIANT_1200_IN_MASTER',
    positionMasterWorldMm: { x: -926.4, y: 684.5, z: 686.9 },
    positionImaginaMm: { x: 0.0, y: 684.5, z: 0.0 },
    dimensionsMasterMm: { x: 1200.0, y: 51.0, z: 500.0 },
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Centrada longitudinalmente y en fondo, bajo superficie en Y=710.0',
  },

  // ── Ducto de Cableado ──
  ductoCableado: {
    codigo: 'KUSO860000',
    glb: 'KUSO860000_165.glb',
    nodoMaster: 3,
    identificationStatus: 'NOMINAL_VARIANT_1109_IN_MASTER',
    positionMasterWorldMm: { x: -926.9, y: 376.0, z: 467.9 },
    positionImaginaMm: { x: -0.5, y: 376.0, z: -219.0 },
    dimensionsMasterMm: { x: 1109.0, y: 145.9, z: 140.0 },
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Ubicado a 219.0 mm hacia el borde posterior bajo viga',
  },

  // ── Vértebra Metálica Pasacables ──
  vertebra: {
    codigo: 'KUAC650000',
    glb: 'KUAC650000.glb',
    nodoMaster: 7,
    identificationStatus: 'CONFIRMED_100_PERCENT',
    positionMasterWorldMm: { x: -926.4, y: 338.4, z: 517.5 },
    positionImaginaMm: { x: 0.0, y: 338.4, z: -169.4 },
    dimensionsMasterMm: { x: 70.0, y: 626.6, z: 161.3 },
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Base en piso Y=25.2, cúspide en Y=651.7 bajo viga',
  },

  // ── Kit Fuente Alimentación (En Columna) ──
  kitFuente: {
    codigo: 'KUAC1040000',
    glb: 'KUAC1040000_74.glb',
    nodoMaster: 79,
    identificationStatus: 'CONFIRMED_100_PERCENT',
    positionMasterWorldMm: { x: -1506.4, y: 15.0, z: 727.9 },
    positionImaginaMm: { x: -580.0, y: 15.0, z: 41.0 },
    dimensionsMasterMm: { x: 58.7, y: 695.0, z: 96.5 },
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Alojado dentro del perfil vertical de columna',
  },

  // ── Kit Soporte de Tomas ──
  soporteTomas: {
    codigo: 'KUAC680000',
    glb: 'KUAC680000.glb',
    nodoMaster: 37,
    identificationStatus: 'CONFIRMED_100_PERCENT',
    positionMasterWorldMm: { x: -926.4, y: 655.0, z: 500.7 },
    positionImaginaMm: { x: 0.0, y: 655.0, z: -186.2 },
    dimensionsMasterMm: { x: 607.0, y: 166.0, z: 232.3 },
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Centrado en X, ubicado en Z=-186.2 mm bajo tapa',
  },

  // ── Grommet Aluminio 4 Tomas ──
  grommet: {
    codigo: 'LKAC250000',
    glb: 'LKAC250000.glb',
    nodoMaster: 28,
    identificationStatus: 'CONFIRMED_100_PERCENT',
    positionMasterWorldMm: { x: -926.2, y: 728.8, z: 444.6 },
    positionImaginaMm: { x: 0.2, y: 728.8, z: -242.3 },
    dimensionsMasterMm: { x: 512.0, y: 33.5, z: 115.6 },
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Empotrado en superficie posterior (Z=-242.3 mm, a 57.7 mm del borde)',
  },

  // ── Botonera LINAK de Control ──
  botonera: {
    codigo: 'DPBK06',
    glb: null,
    nodoMaster: 55,
    identificationStatus: 'GEOMETRY_CONFIRMED_IN_MASTER_GLB',
    positionMasterWorldMm: { x: -416.4, y: 706.6, z: 960.9 },
    positionImaginaMm: { x: 510.0, y: 706.6, z: 274.0 },
    dimensionsMasterMm: { x: 60.0, y: 15.8, z: 87.1 },
    rotationMasterDeg: { x: 0, y: 0, z: 0 },
    scaleMaster: { x: 1, y: 1, z: 1 },
    relacionConSuperficie: 'Bajo borde frontal derecho (a 90 mm del borde lateral y 26 mm del frente)',
  },
});

/**
 * 5. FUNCIONES PURAS DE TRANSFORMACIÓN MASTER CET → IMAGINA
 */

/**
 * Transforma una posición del espacio Master World de CET al espacio canónico de IMAGINA.
 *
 * @param {Object} masterPosMm - { x, y, z } en milímetros
 * @returns {Object} { x, y, z } en milímetros centrado en el origen de IMAGINA
 */
export function masterToImaginaPosition(masterPosMm = {}) {
  const x = Number(masterPosMm.x ?? 0);
  const y = Number(masterPosMm.y ?? 0);
  const z = Number(masterPosMm.z ?? 0);

  return {
    x: x + MASTER_ORIGIN.traslacionImaginaMm.deltaX,
    y: y + MASTER_ORIGIN.traslacionImaginaMm.deltaY,
    z: z + MASTER_ORIGIN.traslacionImaginaMm.deltaZ,
  };
}

/**
 * Transforma una rotación en grados del espacio Master CET a IMAGINA.
 *
 * @param {Object} masterRotDeg - { x, y, z } en grados sexagesimales
 * @returns {Object} { x, y, z } en grados para IMAGINA
 */
export function masterToImaginaRotation(masterRotDeg = {}) {
  return {
    x: Number(masterRotDeg.x ?? 0),
    y: Number(masterRotDeg.y ?? 0),
    z: Number(masterRotDeg.z ?? 0),
  };
}

export default MASTER_COMPONENTS;
