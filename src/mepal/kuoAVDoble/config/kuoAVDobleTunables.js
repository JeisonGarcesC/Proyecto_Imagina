// src/mepal/kuoAVDoble/config/kuoAVDobleTunables.js
// ─────────────────────────────────────────────────────────────────────────────
// FUENTE CENTRAL DE CONFIGURACIÓN Y CALIBRACIÓN: PUESTO DOBLE KUO AV
// ─────────────────────────────────────────────────────────────────────────────

export const KUO_AV_DOBLE_REFERENCE = Object.freeze({
  anchoMm: 1200,
  profundidadMm: 600, // Profundidad nominal por puesto (Fondo total = 1200 mm)
  alturaMm: 730,
  thickMm: 30,
  descripcion: 'Puesto Doble Kuo AV (Estación de trabajo 2 puestos cara a cara)',
});

export const KUO_AV_DOBLE_GLB_FILES = Object.freeze({
  // Vigas longitudinales
  VIGA_120: 'KUSO420000_120.glb',
  VIGA_150: 'KUSO420000_150.glb',
  VIGA_165: 'KUSO420000_165.glb',

  // Ductos centrales dobles
  DUCTO_120: 'KUSO830000_120.glb',
  DUCTO_150: 'KUSO830000_150.glb',
  DUCTO_165: 'KUSO830000_165.glb',

  // Costados / Patas dobles cara a cara
  COSTADO_DOBLE_120: 'KUSO820000_120.glb',
  COSTADO_DOBLE_150: 'KUSO820000_150.glb',

  // Accesorios
  GROMMET_DOBLE: 'LKAC250000_DOBLE.glb',
  GROMMET_SIMPLE: 'LKAC250000.glb',
  KIT_FUENTE_74_DOBLE: 'KUAC1040000_74Doble.glb',
  KIT_FUENTE_74: 'KUAC1040000_74.glb',
  KIT_FUENTE_120: 'KUAC1040000_120.glb',
  SOPORTE_TOMAS: 'KUAC680000.glb',
  VERTEBRA: 'KUAC650000.glb',
});

export const KUO_AV_DOBLE_VARIANTS = Object.freeze({
  vigaSoporte: {
    1200: 'KUSO420000_120.glb',
    1500: 'KUSO420000_150.glb',
    1650: 'KUSO420000_165.glb',
  },
  ductoCentral: {
    1200: 'KUSO830000_120.glb',
    1500: 'KUSO830000_150.glb',
    1650: 'KUSO830000_165.glb',
  },
  costadoDoble: {
    1200: 'KUSO820000_120.glb',
    1500: 'KUSO820000_150.glb',
  },
  grommet: {
    doble: 'LKAC250000_DOBLE.glb',
    simple: 'LKAC250000.glb',
  },
  kitFuente: {
    '74Doble': 'KUAC1040000_74Doble.glb',
    '74': 'KUAC1040000_74.glb',
    '120': 'KUAC1040000_120.glb',
  },
});

export const KUO_AV_DOBLE_RANGOS = Object.freeze({
  anchosPermitidos: [1200, 1500, 1650],
  profundidadesPermitidas: [600, 750],
  espesoresPermitidos: [18, 25, 30],
  alturasPermitidas: [730, 750],
});

export const KUO_AV_DOBLE_CALIBRATION = Object.freeze({
  // Costados dobles izquierdo y derecho
  costados: {
    izqOffsetXMm: 41.15,
    derOffsetXMm: -41.15,
    yMm: 220.0,
    zMm: -613.0,
  },
  // Vigas
  vigas: {
    yOffsetUnderSurfaceMm: -50.0,
    zOffsetFrontMm: 250.0,
    zOffsetBackMm: -250.0,
  },
  // Ducto
  ducto: {
    yOffsetUnderSurfaceMm: -145.0,
    zMm: -122.5,
  },
  // Grommet
  grommet: {
    yEmbeddingDepthMm: 32.0,
    zMm: 0.0,
  },
  // Soportes de tomas
  soporteTomas: {
    yOffsetUnderSurfaceMm: -155.0,
    zOffsetFrontMm: 60.0,
    zOffsetBackMm: -60.0,
  },
  // Kit fuente
  kitFuente: {
    yStandardMm: -130.0,
    yElevadoMm: -50.0,
    zMm: 0.0,
  },
  // Vértebra
  vertebra: {
    yMm: 2.0,
    zOffsetFrontMm: 105.0,
    zOffsetBackMm: -105.0,
  },
});

export const KUO_AV_DOBLE_TUNABLES = {
  reference: KUO_AV_DOBLE_REFERENCE,
  glbFiles: KUO_AV_DOBLE_GLB_FILES,
  variants: KUO_AV_DOBLE_VARIANTS,
  rangos: KUO_AV_DOBLE_RANGOS,
  calibration: KUO_AV_DOBLE_CALIBRATION,
};

export default KUO_AV_DOBLE_TUNABLES;
