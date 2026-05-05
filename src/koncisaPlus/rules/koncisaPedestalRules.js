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
 */
export const KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO = {
  sencillo: {
    LEFT: {
      LEFT: { x: 0, y: 0, z: 0, rotY: 0 },
      RIGHT: { x: 0, y: 0, z: 0, rotY: 0 },
    },

    RIGHT: {
      LEFT: { x: 0, y: 0, z: 0, rotY: 0 },
      RIGHT: { x: 0, y: 0, z: 0, rotY: 0 },
    },

    INTERMEDIO: {
      LEFT: { x: 0, y: 0, z: -220, rotY: 0 },
      RIGHT: { x: 0, y: 0, z: 220, rotY: 0 },
    },
  },

  doble: {
    /**
     * Costado terminal izquierdo de puesto doble.
     * Se crean 2 pedestales, separados en profundidad.
     */
    LEFT: {
      LEFT: { x: 0, y: 0, z: -300, rotY: 0 },
      RIGHT: { x: 0, y: 0, z: 300, rotY: 0 },
    },

    /**
     * Costado terminal derecho de puesto doble.
     */
    RIGHT: {
      LEFT: { x: 0, y: 0, z: -300, rotY: 0 },
      RIGHT: { x: 0, y: 0, z: 300, rotY: 0 },
    },

    /**
     * Costado intermedio de puesto doble.
     */
    INTERMEDIO: {
      LEFT: { x: 0, y: 0, z: -300, rotY: 0 },
      RIGHT: { x: 0, y: 0, z: 300, rotY: 0 },
    },
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

  const offset = KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO?.[tipoPuesto]?.[replaceZone]?.[side] || {
    x: 0,
    y: 0,
    z: 0,
    rotY: 0,
  };

  return {
    ...KONCISA_PEDESTAL,
    tipoPuesto,
    replaceZone,
    placementSide: side,
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
