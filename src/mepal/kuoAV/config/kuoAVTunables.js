// src/mepal/kuoAV/config/kuoAVTunables.js
// ─────────────────────────────────────────────────────────────────────────────
// FUENTE CENTRAL DE CONFIGURACIÓN Y CALIBRACIÓN: KUO AV - SUPERFICIE PERIMETRAL
// ─────────────────────────────────────────────────────────────────────────────
// Contiene la configuración canónica, códigos CET, rutas de assets GLB,
// rangos dimensionales y la tabla de calibración paramétrica por componente
// derivada directamente del modelo maestro CET "KuoGo_prueba_01.glb" (1200 x 600 mm).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. CONFIGURACIÓN DE REFERENCIA CANÓNICA MASTER CET (Mesa Patrón)
 */
export const KUO_AV_REFERENCE = Object.freeze({
  archivoOrigen: 'KuoGo_prueba_01.glb',
  anchoMm: 1200,
  profundidadMm: 600,
  alturaMm: 730,
  thickMm: 30,
  alturaRealTopMm: 745.5,
  espesorRealMm: 31.4,
  descripcion: 'Mesa Patrón Canónica validada contra CET (1200 x 600 x 730 mm)',
});

export const KUO_AV_MASTER_REFERENCE = KUO_AV_REFERENCE;

/**
 * 2. ORIGEN Y TRASLACIÓN MATEMÁTICA CET → IMAGINA
 */
export const KUO_AV_MASTER_ORIGIN = Object.freeze({
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
 * 3. ARCHIVOS GLB Y CÓDIGOS COMERCIALES CET
 */
export const KUO_AV_GLB_FILES = Object.freeze({
  COSTADO_IZQ: 'KUSO800000_IZQ.glb',
  COSTADO_DER: 'KUSO800000_DER.glb',
  // Variantes de Viga Soporte KUSO420000
  VIGA_120: 'KUSO420000_120.glb',
  VIGA_150: 'KUSO420000_150.glb',
  VIGA_165: 'KUSO420000_165.glb',
  VIGA_SOPORTE: 'KUSO420000_120.glb', // Default para mesa patrón 1200
  // Variantes de Ducto de Cableado KUSO860000
  DUCTO_120: 'KUSO860000_120.glb',
  DUCTO_150: 'KUSO860000_150.glb',
  DUCTO_165: 'KUSO860000_165.glb',
  DUCTO_CABLEADO: 'KUSO860000_120.glb', // Default para mesa patrón 1200
  // Mecanismos y Accesorios
  KIT_FUENTE: 'KUAC1040000_74.glb',
  SOPORTE_TOMAS: 'KUAC680000.glb',
  GROMMET: 'LKAC250000.glb',
  GROMMET_SIMPLE: 'LKAC250000.glb',
  GROMMET_DOBLE: 'LKAC250000_DOBLE.glb',
  VERTEBRA: 'KUAC650000.glb',
});

/**
 * Catálogo centralizado de variantes físicas GLB según ancho nominal de mesa o subtipo.
 */
export const KUO_AV_VARIANTS = Object.freeze({
  vigaSoporte: {
    1200: 'KUSO420000_120.glb',
    1500: 'KUSO420000_150.glb',
    1650: 'KUSO420000_165.glb',
  },
  ductoCableado: {
    1200: 'KUSO860000_120.glb',
    1500: 'KUSO860000_150.glb',
    1650: 'KUSO860000_165.glb',
  },
  grommet: {
    simple: 'LKAC250000.glb',
    normal: 'LKAC250000.glb',
    doble: 'LKAC250000_DOBLE.glb',
  },
});

/**
 * Dimensiones físicas medidas de cada variante GLB (en mm).
 */
export const KUO_AV_VARIANT_METRICS = Object.freeze({
  vigaSoporte: {
    1200: { glb: 'KUSO420000_120.glb', widthRealMm: 1196.0, heightRealMm: 50.0, depthRealMm: 500.0, posX: -598.0 },
    1500: { glb: 'KUSO420000_150.glb', widthRealMm: 1496.0, heightRealMm: 50.0, depthRealMm: 500.0, posX: -748.0 },
    1650: { glb: 'KUSO420000_165.glb', widthRealMm: 1646.0, heightRealMm: 50.0, depthRealMm: 500.0, posX: -823.0 },
  },
  ductoCableado: {
    1200: { glb: 'KUSO860000_120.glb', widthRealMm: 1109.0, heightRealMm: 145.9, depthRealMm: 140.0, posX: -554.5 },
    1500: { glb: 'KUSO860000_150.glb', widthRealMm: 1409.0, heightRealMm: 145.9, depthRealMm: 140.0, posX: -704.5 },
    1650: { glb: 'KUSO860000_165.glb', widthRealMm: 1559.0, heightRealMm: 145.9, depthRealMm: 140.0, posX: -779.5 },
  },
  grommet: {
    simple: { glb: 'LKAC250000.glb', widthRealMm: 512.0, heightRealMm: 33.6, depthRealMm: 115.5, posX: -256.0, posY: 696.44, posZ: -184.62 },
    normal: { glb: 'LKAC250000.glb', widthRealMm: 512.0, heightRealMm: 33.6, depthRealMm: 115.5, posX: -256.0, posY: 696.44, posZ: -184.62 },
    doble: { glb: 'LKAC250000_DOBLE.glb', widthRealMm: 512.0, heightRealMm: 33.5, depthRealMm: 257.0, posX: -256.0, posY: 696.44, posZ: -128.5 },
  },
});

/**
 * Resuelve el nombre del archivo GLB correcto para un componente, ancho o tipo dado.
 *
 * @param {Object} params
 * @param {string} params.component - 'vigaSoporte' | 'ductoCableado' | 'grommet'
 * @param {number} [params.anchoMm] - Ancho nominal de la mesa (ej. 1200, 1500, 1650)
 * @param {string} [params.tipoGrommet] - 'simple' | 'doble'
 * @param {Object} [params.config] - Configuración completa opcional
 * @returns {string|null} Nombre del archivo GLB
 */
export function resolveKuoAVVariantAsset({ component, anchoMm, tipoGrommet, config } = {}) {
  const variants = KUO_AV_VARIANTS[component];
  if (!variants) return null;

  if (component === 'grommet') {
    const isDoble = tipoGrommet === 'doble' || config?.tipoGrommet === 'doble' || !!config?.grommetDoble;
    return isDoble ? variants.doble : variants.simple;
  }

  const width = Number(anchoMm || config?.anchoMm || 1200);
  if (variants[width]) return variants[width];
  if (width <= 1350) return variants[1200];
  if (width <= 1550) return variants[1500];
  return variants[1650] || variants[1500] || variants[1200];
}

/**
 * Resuelve las métricas y posición base para una variante dada.
 */
export function resolveKuoAVVariantMetrics({ component, anchoMm, tipoGrommet, config } = {}) {
  const metrics = KUO_AV_VARIANT_METRICS[component];
  if (!metrics) return null;

  if (component === 'grommet') {
    const isDoble = tipoGrommet === 'doble' || config?.tipoGrommet === 'doble' || !!config?.grommetDoble;
    return isDoble ? metrics.doble : metrics.simple;
  }

  const width = Number(anchoMm || config?.anchoMm || 1200);
  if (metrics[width]) return metrics[width];
  if (width <= 1350) return metrics[1200];
  if (width <= 1550) return metrics[1500];
  return metrics[1650] || metrics[1500] || metrics[1200];
}

export const KUO_AV_CET_CODES = Object.freeze({
  SUPERFICIE: 'LKSU010010',
  COSTADO_MOTORIZADO: 'KUSO800000',
  VIGA_SOPORTE: 'KUSO420000',
  KIT_FUENTE: 'KUAC1040000',
  SOPORTE_TOMAS: 'KUAC680000',
  GROMMET: 'LKAC250000',
  DUCTO_CABLEADO: 'KUSO860000',
  VERTEBRA: 'KUAC650000',
  BOTONERA_LINAK: 'DPBK06',
});

/**
 * 4. TABLA CENTRALIZADA DE CALIBRACIÓN GEOMÉTRICA POR COMPONENTE (Mesa Patrón 1200 x 600 x 730)
 * Fuente: KuoGo_prueba_01.glb
 */
export const KUO_AV_CALIBRATION = {
  // ── 1. Costado / Pata Izquierda con Base (KUSO800000_IZQ.glb) ──
  costadoIzquierdo: {
    codigo: KUO_AV_CET_CODES.COSTADO_MOTORIZADO,
    glb: KUO_AV_GLB_FILES.COSTADO_IZQ,
    lado: 'izq',
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 64,

    // Posición canónica en Three.js para alinear con el modelo maestro
    posicionMm: {
      x: -600.0,
      y: 0.0,
      z: 300.0,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 2. Costado / Pata Derecha con Base (KUSO800000_DER.glb) ──
  costadoDerecho: {
    codigo: KUO_AV_CET_CODES.COSTADO_MOTORIZADO,
    glb: KUO_AV_GLB_FILES.COSTADO_DER,
    lado: 'der',
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 82,

    posicionMm: {
      x: 524.0,
      y: 0.0,
      z: 300.0,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 3. Viga Soporte de Superficie (KUSO420000) ──
  // Selecciona automáticamente KUSO420000_120.glb (1196mm), _150.glb (1496mm) o _165.glb (1646mm)
  vigaSoporte: {
    codigo: KUO_AV_CET_CODES.VIGA_SOPORTE,
    glb: KUO_AV_GLB_FILES.VIGA_120,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 42,

    posicionMm: {
      x: -598.0,
      y: 660.0,
      z: 250.0,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 4. Ducto de Cableado (KUSO860000) ──
  // Selecciona automáticamente KUSO860000_120.glb (1109mm), _150.glb (1409mm) o _165.glb (1559mm)
  ductoCableado: {
    codigo: KUO_AV_CET_CODES.DUCTO_CABLEADO,
    glb: KUO_AV_GLB_FILES.DUCTO_120,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 3,

    posicionMm: {
      x: -554.5,
      y: 303.0,
      z: -149.0,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 5. Vértebra Metálica Pasacables (KUAC650000.glb) ──
  // Solo se incluye si vertebraLateral === true
  // Orientación corregida según Master CET (RotY 180°)
  vertebra: {
    codigo: KUO_AV_CET_CODES.VERTEBRA,
    glb: KUO_AV_GLB_FILES.VERTEBRA,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 7,

    posicionMm: {
      x: 35.0,
      y: 25.0,
      z: -250.0,
    },

    rotacionDeg: {
      x: 0,
      y: 180,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 6a. Columna Motorizada Izquierda (KUAC1040000_74.glb) ──
  kitFuenteIzq: {
    codigo: KUO_AV_CET_CODES.KIT_FUENTE,
    glb: KUO_AV_GLB_FILES.KIT_FUENTE,
    lado: 'izq',
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 79,

    posicionMm: {
      x: -584.4,
      y: 15.0,
      z: 32.7,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 6b. Columna Motorizada Derecha (KUAC1040000_74.glb) ──
  kitFuenteDer: {
    codigo: KUO_AV_CET_CODES.KIT_FUENTE,
    glb: KUO_AV_GLB_FILES.KIT_FUENTE,
    lado: 'der',
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 97,

    posicionMm: {
      x: 530.6,
      y: 15.0,
      z: 32.7,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // Fallback de compatibilidad
  kitFuente: {
    codigo: KUO_AV_CET_CODES.KIT_FUENTE,
    glb: KUO_AV_GLB_FILES.KIT_FUENTE,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 79,

    posicionMm: {
      x: -584.4,
      y: 15.0,
      z: 32.7,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 7. Kit Soporte de Tomas (KUAC680000.glb) ──
  soporteTomas: {
    codigo: KUO_AV_CET_CODES.SOPORTE_TOMAS,
    glb: KUO_AV_GLB_FILES.SOPORTE_TOMAS,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 37,

    posicionImaginaCanonicaMm: {
      x: -303.51,
      y: 558.00,
      z: -70.07,
    },

    posicionMm: {
      x: -303.51,
      y: 558.00,
      z: -70.07,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 8. Grommet Aluminio 4 Tomas (LKAC250000.glb) ──
  grommet: {
    codigo: KUO_AV_CET_CODES.GROMMET,
    glb: KUO_AV_GLB_FILES.GROMMET,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 28,

    posicionImaginaCanonicaMm: {
      x: -256.0,
      y: 696.44,
      z: -184.62,
    },

    posicionMm: {
      x: -256.0,
      y: 696.44,
      z: -184.62,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },

  // ── 9. Botonera LINAK de Control (DPBK06) ──
  botonera: {
    codigo: KUO_AV_CET_CODES.BOTONERA_LINAK,
    glb: null,
    visual: false,
    bomOnly: true,
    fuente: 'KuoGo_prueba_01.glb',
    nodoMaster: 55,

    posicionMm: {
      x: 510.0,
      y: 706.6,
      z: 274.0,
    },

    rotacionDeg: {
      x: 0,
      y: 0,
      z: 0,
    },

    offsetMm: {
      x: 0,
      y: 0,
      z: 0,
    },

    escala: {
      x: 1,
      y: 1,
      z: 1,
    },
  },
};

/**
 * 5. OBJETO PRINCIPAL KUO_AV_TUNABLES
 */
export const KUO_AV_TUNABLES = {
  /** Ruta base de los modelos 3D y accesorios GLB */
  GLB_BASE: '/assets/models/Kuo AV/Puesto Perimetral/',

  /** Archivos GLB de componentes CET */
  GLB_FILES: KUO_AV_GLB_FILES,

  /** Códigos CET oficiales */
  CET_CODES: KUO_AV_CET_CODES,

  /** Referencia maestra CET */
  REFERENCE: KUO_AV_REFERENCE,
  MASTER_REFERENCE: KUO_AV_MASTER_REFERENCE,

  /** Origen maestro CET */
  MASTER_ORIGIN: KUO_AV_MASTER_ORIGIN,

  /** Calibración individual de componentes */
  CALIBRATION: KUO_AV_CALIBRATION,

  /** Rango de elevación de altura motorizada en milímetros */
  ALTURA_MIN_MM: 730,
  ALTURA_MAX_MM: 1200,
  ALTURA_DEFAULT_MM: 730,

  /** Anchos estándar verificados de CET en milímetros */
  ANCHOS_MM: [1200, 1500, 1650],

  /** Fondos estándar iniciales en milímetros */
  FONDOS_MM: [600, 700, 800],

  /** Espesores disponibles para la superficie en milímetros */
  ESPESORES_MM: [18, 25, 30],

  /** Etiquetas de espesor para compatibilidad con el catálogo */
  ESPESORES_LABELS: [
    'Espesor Formica 18',
    'Espesor Formica 25',
    'Espesor Formica 30',
  ],

  /** Identificadores de accesorios opcionales */
  ACCESSORIES: {
    KIT_FUENTE: 'KIT_FUENTE',
    VERTEBRA: 'VERTEBRA',
  },

  /** Escala visual base */
  escalaBase: 1,
};

export default KUO_AV_TUNABLES;
