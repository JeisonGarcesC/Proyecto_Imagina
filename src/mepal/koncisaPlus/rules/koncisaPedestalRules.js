export const KONCISA_PEDESTAL = {
  logicalCode: 'KONPLUSSPYMPED',
  code: '22000133941',
  modelCode: 'KONPLUSSPYMPED',
  modelSrc: '/assets/models/koncisaPlus/2KAL001000.glb',
  name: 'PEDESTAL FIJO METÁLICO 2S+1A 37X40X71CM FRENTE EMBEBIDO MEPAL',
};

/**
 * Offsets desde el costado reemplazado hacia el pedestal.
 * Todos los valores están en mm.
 *
 * Ejes:
 * x = largo del puesto
 * y = altura
 * z = profundidad
 *
 * Para DOBLE normalmente los dos pedestales deben separarse en Z.
 * rotationYDeg permite girar cada pedestal de forma independiente en grados.
 */
export const KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO = {
  sencillo: {
    LEFT: {
      LEFT: { x: 0, y: 0, z: 130 + 205, rotY: 0 },
      RIGHT: { x: 0, y: 0, z: 130 + 205, rotY: 0 },
    },

    RIGHT: {
      LEFT: { x: 0, y: 0, z: 0, rotY: 0 },
      RIGHT: { x: -368, y: 0, z: 333, rotY: Math.PI },
    },

    INTERMEDIO: {
      LEFT: { x: -368 + 25, y: 0, z: 333, rotY: 0 },
      RIGHT: { x: -25, y: 0, z: 333, rotY: 0 },
    },
  },

  doble: {
    /**
     * Costado terminal izquierdo de puesto doble.
     * Se crean 2 pedestales, separados en profundidad.
     */
    LEFT: {
      LEFT: { x: 368, y: 0, z: -634, rotationYDeg: 180 },
      RIGHT: { x: 0, y: 0, z: 634, rotationYDeg: 0 },
    },

    /**
     * Costado terminal derecho de puesto doble.
     */
    RIGHT: {
      LEFT: { x: -368, y: 0, z: 634, rotationYDeg: 180 },
      RIGHT: { x: 0, y: 0, z: -634, rotationYDeg: 0 },
    },

    /**
     * Costado intermedio de puesto doble.
     */
    INTERMEDIO: {
      LEFT: { x: 368 - 25, y: 0, z: -634, rotationYDeg: 180 },
      RIGHT: { x: -25, y: 0, z: 634, rotationYDeg: 0 },
    },
  },
};

// Ajuste adicional de Z por profundidad real. Cada signo se configura por separado
// para no asumir que ambos pedestales crecen hacia el mismo lado.
export const KONCISA_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM = {
  sencillo: {
    LEFT: {
      LEFT: { 600: 0, 700: 100, 750: 75 },
      RIGHT: { 600: 0, 700: 100, 750: 75 },
    },
    RIGHT: {
      LEFT: { 600: 0, 700: 0, 750: 0 },
      RIGHT: { 600: 0, 700: 100, 750: 75 },
    },
    INTERMEDIO: {
      LEFT: { 600: 0, 700: 0, 750: 0 },
      RIGHT: { 600: 0, 700: 100, 750: 75 },
    },
  },
  doble: {
    LEFT: {
      LEFT: { 1200: 0, 1300: -50, 1400: -100, 1500: -150 },
      RIGHT: { 1200: 0, 1300: 50, 1400: 100, 1500: 150 },
    },
    RIGHT: {
      LEFT: { 1200: 0, 1300: 50, 1400: 100, 1500: 150 },
      RIGHT: { 1200: 0, 1300: -50, 1400: -100, 1500: -150 },
    },
    INTERMEDIO: {
      LEFT: { 1200: 0, 1300: -50, 1400: -100, 1500: -150 },
      RIGHT: { 1200: 0, 1300: 50, 1400: 100, 1500: 150 },
    },
  },
};

// Configuración exclusiva de puestos líder. Se inicializa con los valores que los
// líderes usaban desde la tabla sencilla para conservar su posición actual.
// Modificar esta tabla no altera los puestos estándar.
export const KONCISA_LEADER_PEDESTAL_OFFSETS_FROM_COSTADO = {
  LEFT: {
    LEFT: { x: 333, y: 0, z: 370, rotY: Math.PI },
    RIGHT: { x: 333, y: 0, z: 370, rotY: Math.PI },
  },
  RIGHT: {
    LEFT: { x: -333, y: 0, z: 0, rotY: 0 },
    RIGHT: { x: -333, y: 0, z: 0, rotY: 0 },
  },
};

export const KONCISA_LEADER_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM = {
  LEFT: {
    LEFT: { 600: 0, 700: 0, 750: 0 },
    RIGHT: { 600: 0, 700: 100, 750: 75 },
  },
  RIGHT: {
    LEFT: { 600: 0, 700: 0, 750: 0 },
    RIGHT: { 600: 0, 700: 100, 750: 75 },
  },
};

export function normalizePedestalPlacementSide(value) {
  const text = String(value || '')
    .trim()
    .toUpperCase();

  if (['LEFT', 'IZQUIERDA', 'IZQ'].includes(text)) return 'LEFT';
  if (['RIGHT', 'DERECHA', 'DER'].includes(text)) return 'RIGHT';

  return 'RIGHT';
}

export function normalizeCostadoReplaceZone(value) {
  const text = String(value || '')
    .trim()
    .toUpperCase();

  if (['LEFT', 'IZQUIERDA', 'IZQ'].includes(text)) return 'LEFT';
  if (['RIGHT', 'DERECHA', 'DER'].includes(text)) return 'RIGHT';
  if (['INTERMEDIO', 'INTERMEDIA', 'CENTER', 'CENTRO'].includes(text)) return 'INTERMEDIO';

  return 'RIGHT';
}

export function normalizeTipoPuesto(value) {
  return String(value || '').toLowerCase() === 'doble' ? 'doble' : 'sencillo';
}

export function resolvePedestalFromCostado({ costado, placementSide = 'RIGHT' } = {}) {
  const tipoPuesto = normalizeTipoPuesto(
    costado?.userData?.meta?.tipoPuesto || costado?.userData?.tipoPuesto || 'sencillo'
  );

  const replaceZone = normalizeCostadoReplaceZone(
    costado?.userData?.meta?.replaceZone ||
      costado?.userData?.replaceZone ||
      costado?.userData?.meta?.side ||
      costado?.userData?.side ||
      'RIGHT'
  );

  const side = normalizePedestalPlacementSide(placementSide);
  const layoutType = String(
    costado?.userData?.meta?.layoutType || costado?.userData?.layoutType || ''
  ).toUpperCase();
  const isLeader = layoutType === 'LEADER';
  const leaderSide = normalizeCostadoReplaceZone(
    costado?.userData?.meta?.leaderSide || costado?.userData?.leaderSide || 'RIGHT'
  );

  const realDepthMm = Number(
    costado?.userData?.meta?.realDepthMm ??
      costado?.userData?.meta?.depthMm ??
      costado?.userData?.dimMm?.realDepthMm ??
      costado?.userData?.dimMm?.depthMm ??
      costado?.userData?.dim?.realDepthMm ??
      costado?.userData?.dim?.depthMm ??
      (tipoPuesto === 'doble' ? 1200 : 600)
  );

  const configuredOffset = (isLeader
    ? KONCISA_LEADER_PEDESTAL_OFFSETS_FROM_COSTADO?.[leaderSide]?.[side]
    : KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO?.[tipoPuesto]?.[replaceZone]?.[side]) || {
    x: 0,
    y: 0,
    z: 0,
    rotY: 0,
  };

  const depthZAdjustmentMm = Number(
    (isLeader
      ? KONCISA_LEADER_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM?.[leaderSide]?.[side]?.[realDepthMm]
      : KONCISA_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM?.[tipoPuesto]?.[replaceZone]?.[side]?.[
          realDepthMm
        ]) || 0
  );

  const rotationYDeg = Number(configuredOffset.rotationYDeg);
  const offset = {
    ...configuredOffset,
    z: Number(configuredOffset.z || 0) + depthZAdjustmentMm,
    rotY: Number.isFinite(rotationYDeg)
      ? (rotationYDeg * Math.PI) / 180
      : Number(configuredOffset.rotY || 0),
  };

  return {
    ...KONCISA_PEDESTAL,
    tipoPuesto,
    replaceZone,
    layoutType: isLeader ? 'LEADER' : 'STANDARD',
    leaderSide: isLeader ? leaderSide : null,
    placementSide: side,
    realDepthMm,
    depthZAdjustmentMm,
    offsetMm: offset,
  };
}

/*
export function getPedestalSidesForCostado({ costado, placementSide = 'RIGHT' } = {}) {
  const tipoPuesto = normalizeTipoPuesto(
    costado?.userData?.meta?.tipoPuesto || costado?.userData?.tipoPuesto || 'sencillo'
  );

  const replaceZone = normalizeCostadoReplaceZone(
    costado?.userData?.meta?.replaceZone || costado?.userData?.replaceZone || 'RIGHT'
  );

  /
   //Regla:
   // Puesto doble: siempre 2 pedestales.
   //Costado intermedio: 2 pedestales.
   //Terminal sencillo: 1 pedestal.
   //
  if (tipoPuesto === 'doble' || replaceZone === 'INTERMEDIO') {
    return ['LEFT', 'RIGHT'];
  }

  return [normalizePedestalPlacementSide(placementSide)];
}*/

export function getPedestalSidesForCostado({ costado, placementSide = 'RIGHT' } = {}) {
  const tipoPuesto = normalizeTipoPuesto(
    costado?.userData?.meta?.tipoPuesto || costado?.userData?.tipoPuesto || 'sencillo'
  );

  /**
   * Regla:
   * - Puesto doble: siempre 2 pedestales.
   * - Puesto sencillo: solo 1 pedestal, incluso si el costado es intermedio.
   */
  if (tipoPuesto === 'doble') {
    return ['LEFT', 'RIGHT'];
  }

  return [normalizePedestalPlacementSide(placementSide)];
}
