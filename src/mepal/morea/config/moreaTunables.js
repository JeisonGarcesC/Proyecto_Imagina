export const MOREA_MODEL_SOURCES = {
  seat: '/assets/models/Morea/sillaMorea/HSI010000_W_SEAT.glb',
  seatCushion: '/assets/models/Morea/sillaMorea/HSI040000.glb',
  seatTable: '/assets/models/Morea/sillaMorea/HSU050000.glb',
  seatTableGrommet: '/assets/models/Morea/sillaMorea/HSU050000_GROMMET.glb',
  side: '/assets/models/Morea/sillaMorea/HSO010000.glb',
  sideWood: '/assets/models/Morea/sillaMorea/HSO100000.glb',
  sideMetal: '/assets/models/Morea/sillaMorea/HSO070000.glb',
  sideCenter: '/assets/models/Morea/sillaMorea/HSO040000.glb',
  beam: '/assets/models/Morea/sillaMorea/HSO020000_1P.glb',
};

export const MOREA_DOUBLE_MODEL_SOURCES = {
  seat: '/assets/models/Morea/sillaMoreaDoble/HSI010000_DOBLE_SEAT.glb',
  seatCushion: '/assets/models/Morea/sillaMoreaDoble/HSI040000_W_DOBLE_SEAT.glb',
  seatTable: '/assets/models/Morea/sillaMoreaDoble/HSU040000.glb',
  seatTableGrommet: '/assets/models/Morea/sillaMoreaDoble/HSU040000_GROMMET.glb',
  side: '/assets/models/Morea/sillaMoreaDoble/HSO050000.glb',
  sideWood: '/assets/models/Morea/sillaMoreaDoble/HSO110000.glb',
  sideMetal: '/assets/models/Morea/sillaMoreaDoble/HSO090000.glb',
  sideCenter: '/assets/models/Morea/sillaMoreaDoble/HSO060000.glb',
  beam: '/assets/models/Morea/sillaMoreaDoble/HSO020000_1P.glb',
};

const MOREA_SINGLE_PEDESTAL_MODE_DEFS = {
  normal: {
    code: 'HSO010000',
    modelSrc: MOREA_MODEL_SOURCES.side,
    label: 'normal',
  },
  wood: {
    code: 'HSO100000',
    modelSrc: MOREA_MODEL_SOURCES.sideWood,
    label: 'madera',
  },
  metal: {
    code: 'HSO070000',
    modelSrc: MOREA_MODEL_SOURCES.sideMetal,
    label: 'metalico',
  },
};

const MOREA_DOUBLE_PEDESTAL_MODE_DEFS = {
  normal: {
    code: 'HSO050000',
    modelSrc: MOREA_DOUBLE_MODEL_SOURCES.side,
    label: 'normal',
  },
  wood: {
    code: 'HSO110000',
    modelSrc: MOREA_DOUBLE_MODEL_SOURCES.sideWood,
    label: 'madera',
  },
  metal: {
    code: 'HSO090000',
    modelSrc: MOREA_DOUBLE_MODEL_SOURCES.sideMetal,
    label: 'metalico',
  },
};

export const MOREA_PEDESTAL_MODE_DEFS = MOREA_SINGLE_PEDESTAL_MODE_DEFS;

export function normalizeMoreaPedestalMode(mode) {
  return String(mode || '').trim().toLowerCase();
}

export function resolveMoreaPedestalModeByCode(code, variant = 'single') {
  const normalizedVariant = String(variant || '').trim().toLowerCase();
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (normalizedVariant === 'double') {
    if (normalizedCode === 'HSO110000') return 'wood';
    if (normalizedCode === 'HSO090000') return 'metal';
    return 'normal';
  }
  if (normalizedCode === 'HSO100000') return 'wood';
  if (normalizedCode === 'HSO070000' || normalizedCode === 'HSO70000') return 'metal';
  return 'normal';
}

export function resolveMoreaPedestalVariantByMode(mode, variant = 'single') {
  const normalizedVariant = String(variant || '').trim().toLowerCase();
  const defs = normalizedVariant === 'double' ? MOREA_DOUBLE_PEDESTAL_MODE_DEFS : MOREA_SINGLE_PEDESTAL_MODE_DEFS;
  const normalizedMode = normalizeMoreaPedestalMode(mode);
  return defs[normalizedMode] || defs.normal;
}

const MOREA_SINGLE_SEAT_MODE_DEFS = {
  chair: {
    code: 'HSI010000_W_SEAT',
    modelSrc: MOREA_MODEL_SOURCES.seat,
    label: 'silla',
  },
  cushion: {
    code: 'HSI040000',
    modelSrc: MOREA_MODEL_SOURCES.seatCushion,
    label: 'cojin',
  },
  table: {
    code: 'HSU050000',
    modelSrc: MOREA_MODEL_SOURCES.seatTable,
    label: 'mesa',
  },
  tableGrommet: {
    code: 'HSU050000_GROMMET',
    modelSrc: MOREA_MODEL_SOURCES.seatTableGrommet,
    label: 'mesa con grommet',
  },
};

const MOREA_DOUBLE_SEAT_MODE_DEFS = {
  chair: {
    code: 'HSI010000_DOBLE_SEAT',
    modelSrc: MOREA_DOUBLE_MODEL_SOURCES.seat,
    label: 'silla doble',
  },
  cushion: {
    code: 'HSI040000_W_DOBLE_SEAT',
    modelSrc: MOREA_DOUBLE_MODEL_SOURCES.seatCushion,
    label: 'cojin doble',
  },
  table: {
    code: 'HSU040000',
    modelSrc: MOREA_DOUBLE_MODEL_SOURCES.seatTable,
    label: 'mesa doble',
  },
  tableGrommet: {
    code: 'HSU040000_GROMMET',
    modelSrc: MOREA_DOUBLE_MODEL_SOURCES.seatTableGrommet,
    label: 'mesa doble con grommet',
  },
};

export const MOREA_SEAT_MODE_DEFS = MOREA_SINGLE_SEAT_MODE_DEFS;

export const MOREA_SINGLE_SEAT_MODE_OFFSETS_MM = {
  chair: { x: 0, y: 0, z: 0 },
  cushion: { x: 0, y: 0, z: 0 },
  table: { x: 0, y: 8, z: 0 },
  tableGrommet: { x: 0, y: 8, z: 0 },
};

export const MOREA_DOUBLE_SEAT_MODE_OFFSETS_MM = {
  chair: { x: 0, y: 0, z: 0 },
  cushion: { x: 0, y: 0, z: 0 },
  table: { x: 0, y: 8, z: 0 },
  tableGrommet: { x: 0, y: 8, z: 0 },
};

export function normalizeMoreaSeatMode(mode) {
  return String(mode || '').trim();
}

export function resolveMoreaSeatModeByCode(code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (normalizedCode === 'HSI040000_W_DOBLE_SEAT') return 'cushion';
  if (normalizedCode === 'HSU040000') return 'table';
  if (normalizedCode === 'HSU040000_GROMMET') return 'tableGrommet';
  if (normalizedCode === 'HSI040000') return 'cushion';
  if (normalizedCode === 'HSU050000') return 'table';
  if (normalizedCode === 'HSU050000_GROMMET') return 'tableGrommet';
  return 'chair';
}

export function resolveMoreaSeatVariantByMode(mode, variant = 'single') {
  const normalizedVariant = String(variant || '').trim().toLowerCase();
  const defs = normalizedVariant === 'double' ? MOREA_DOUBLE_SEAT_MODE_DEFS : MOREA_SINGLE_SEAT_MODE_DEFS;
  const normalizedMode = normalizeMoreaSeatMode(mode);
  return defs[normalizedMode] || defs.chair;
}

export function resolveMoreaSeatOffsetMmByMode(mode, variant = 'single') {
  const normalizedVariant = String(variant || '').trim().toLowerCase();
  const offsetMap =
    normalizedVariant === 'double'
      ? MOREA_DOUBLE_SEAT_MODE_OFFSETS_MM
      : MOREA_SINGLE_SEAT_MODE_OFFSETS_MM;
  const normalizedMode = normalizeMoreaSeatMode(mode);
  return offsetMap[normalizedMode] || offsetMap.chair;
}

export const MOREA_BUILDER_TUNE = {
  SEPARACION_ENTRE_PUESTOS_MM: 600,
  MAX_PUESTOS: 8,
  OFFSET_Y_LATERALES_MM: -180,
  WOOD_PEDESTAL_OUTWARD_OFFSET_MM: 40,
  OFFSET_Y_VIGAS_MM: -120,
  OFFSET_Z_VIGAS_MM: 140,
  DISABLED_BEAM_ROLES: ['beam-back-inner'],
};

export const MOREA_DOUBLE_BUILDER_TUNE = {
  SEPARACION_ENTRE_PUESTOS_MM: 610,
  MAX_PUESTOS: 8,
  OFFSET_Y_LATERALES_MM: -180,
  WOOD_PEDESTAL_OUTWARD_OFFSET_MM: 40,
  OFFSET_Y_VIGAS_MM: -120,
  OFFSET_Z_VIGAS_MM: 320,
  DISABLED_BEAM_ROLES: [],
  BEAM_ROLES: [
    'beam-front-outer',
    'beam-front-mid',
    'beam-front-inner',
    'beam-back-inner',
    'beam-back-mid',
    'beam-back-outer',
  ],
};

export const MOREA_ALIGN_TUNE = {
  SIDE_INSET_FACTOR: 0.62,
  SIDE_DROP_M: 0.03,
  SEAT_RAISE_M: 0.117,
  BEAM_INSET_FROM_SIDE_Z_M: 0.145,
  BEAM_PAIR_CLOSER_M: 0.03,
  BEAM_SUPPORT_PAIR_GAP_M: 0.026,
  BEAM_FRONT_SUPPORT_INSET_M: 0.085,
  BEAM_BACK_SUPPORT_INSET_M: 0.085,
  // Ajustes manuales para ordenar vigas a ojo (especialmente Morea doble).
  // Mueve la primera/ultima viga visible hacia el centro del conjunto en eje Z.
  BEAM_FIRST_VISIBLE_TO_CENTER_SHIFT_M: 0.03,
  BEAM_LAST_VISIBLE_TO_CENTER_SHIFT_M: 0.03,
  // Mueve las 4 vigas centrales como bloque.
  // > 0 las acerca al centro, < 0 las aleja del centro.
  BEAM_MIDDLE_BAND_TO_CENTER_SHIFT_M: 0.03,
  // Escala la separacion interna de las 4 vigas centrales.
  // 1 = igual separacion, < 1 las junta, > 1 las separa.
  BEAM_MIDDLE_BAND_SPACING_SCALE: 0.20,
  // Compatibilidad con ajustes antiguos.
  BEAM_MIDDLE_CLUSTER_SCALE: 1,
  // Desplazamiento fino por indice visible en eje X (mm).
  // Util para centrar una viga puntual sin afectar las demas.
  BEAM_X_OFFSET_BY_VISIBLE_INDEX_MM: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  },
  // Ajuste independiente por variante (si existe, tiene prioridad sobre el mapa global).
  // Mantener ambos iguales evita cambios de comportamiento al introducir esta separación.
  BEAM_X_OFFSET_BY_VISIBLE_INDEX_MM_SINGLE: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  },
  BEAM_X_OFFSET_BY_VISIBLE_INDEX_MM_DOUBLE: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  },
  // Escala de entrada para desplazamientos directos en Z.
  // 1 = 1 cm, 2 = 2 cm, etc.
  BEAM_VISIBLE_Z_OFFSET_STEP_M: 0.01,
  BEAM_VISIBLE_Z_OFFSET_STEP_M_SINGLE: 0.01,
  BEAM_VISIBLE_Z_OFFSET_STEP_M_DOUBLE: 0.01,
  // Ajustes por viga visible, ordenadas de adelante hacia atras.
  // Valor positivo mueve la viga hacia atras; valor negativo la mueve hacia adelante.
  // 1 = viga frontal visible, 2 = viga central visible, 3 = viga trasera visible.
  BEAM_Z_OFFSET_BY_VISIBLE_INDEX: {
    1: 0,
    2: -2,
    3: -2,
    4: 2,
    5: 2,
    6: 0,
  },
  BEAM_Z_OFFSET_BY_VISIBLE_INDEX_SINGLE: {
    1: 0,
    2: -2,
    3: -2,
    4: 2,
    5: 2,
    6: 0,
  },
  BEAM_Z_OFFSET_BY_VISIBLE_INDEX_DOUBLE: {
    1: 0,
    2: -2,
    3: -2,
    4: 2,
    5: 2,
    6: 0,
  },
  // Baja todas las vigas en vertical.
  BEAM_VERTICAL_DROP_M: -0.002,
  BEAM_TOP_Y_OFFSET_M: 0.004,
  // Multiplicador global del largo de viga para todos los puestos.
  BEAM_LENGTH_MULTIPLIER: 1.35,
  BEAM_SPAN_RATIO: 1.14,
  BEAM_SPAN_RATIO_BY_QUANTITY: {
    1: 1.00,
    2: 0.85,
    3: 0.80,
    4: 0.80,
    5: 0.78,
    6: 0.77,
    7: 0.77,
    8: 0.76,
  },
  BEAM_SCALE_X_MAX: 12,
};

export function resolveMoreaBeamSpanRatio(quantity) {
  const normalizedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
  const ratioByQuantity = MOREA_ALIGN_TUNE.BEAM_SPAN_RATIO_BY_QUANTITY || {};
  const baseRatio = Number(ratioByQuantity[normalizedQuantity]) || MOREA_ALIGN_TUNE.BEAM_SPAN_RATIO;
  const lengthMultiplier = Math.max(0.8, Number(MOREA_ALIGN_TUNE.BEAM_LENGTH_MULTIPLIER) || 1);

  return baseRatio * lengthMultiplier;
}

export function resolveMoreaCenterSupportOffsetsMm(quantity, moduleSpacingMm) {
  const normalizedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
  const spanStepMm = Number(moduleSpacingMm) || MOREA_BUILDER_TUNE.SEPARACION_ENTRE_PUESTOS_MM;

  if (normalizedQuantity < 3) return [];

  // 3: mitad de silla 2.
  if (normalizedQuantity === 3) return [spanStepMm * 1];

  // 4: mitad entre silla 2 y 3.
  if (normalizedQuantity === 4) return [spanStepMm * 1.5];

  // 5: silla 2 y silla 4.
  if (normalizedQuantity === 5) return [spanStepMm * 1, spanStepMm * 3];

  // 6: mitad entre 2-3 y mitad entre 4-5.
  if (normalizedQuantity === 6) return [spanStepMm * 1.5, spanStepMm * 3.5];

  // 7: silla 2, silla 4, silla 6.
  if (normalizedQuantity === 7) return [spanStepMm * 1, spanStepMm * 3, spanStepMm * 5];

  // 8: mitad entre 2-3, 4-5, 6-7.
  if (normalizedQuantity === 8) return [spanStepMm * 1.5, spanStepMm * 3.5, spanStepMm * 5.5];

  const supportCount = Math.max(1, Math.floor((normalizedQuantity - 1) / 2));
  const values = [];
  for (let index = 0; index < supportCount; index += 1) {
    values.push(
      normalizedQuantity % 2 === 1
        ? spanStepMm * (1 + index * 2)
        : spanStepMm * (1.5 + index * 2)
    );
  }
  return values;
}

export function resolveMoreaDoubleCenterSupportOffsetsMm(quantity, moduleSpacingMm) {
  const spanStepMm = Number(moduleSpacingMm) || MOREA_DOUBLE_BUILDER_TUNE.SEPARACION_ENTRE_PUESTOS_MM;
  const baseOffsets = resolveMoreaCenterSupportOffsetsMm(quantity, spanStepMm);
  if (!baseOffsets.length) return [];

  // En Morea doble la referencia del asiento esta corrida medio modulo respecto al simple.
  // Se conserva el mismo patron de cantidades y se desplaza +0.5 * separacion.
  return baseOffsets.map((offsetMm) => Number(offsetMm) + spanStepMm * 0.5);
}

export function resolveMoreaCenterSupportOffsetMm(quantity, moduleSpacingMm) {
  const offsets = resolveMoreaCenterSupportOffsetsMm(quantity, moduleSpacingMm);
  return offsets.length ? offsets[Math.floor(offsets.length / 2)] : null;
}
