export const MILA_MODEL_SOURCES = {
  seat: '/assets/models/Mila/sillamila/TKSSI011000-W-SEAT.glb',
  tableSeat: '/assets/models/Mila/sillamila/TKSSU165000.glb',
  tableSeatGrommet: '/assets/models/Mila/sillamila/TKSSU165000_GROMMET.glb',
  legs: '/assets/models/Mila/sillamila/TKSSO080000.glb',
  beam: '/assets/models/Mila/sillamila/TKSSO090000_60.glb',
  centerSupportLeg: '/assets/models/Mila/sillamila/TKSSO100000.glb',
};

export const MILA_DOUBLE_MODEL_SOURCES = {
  seat: '/assets/models/Mila/sillamiladoble/TKSSI180000_W_SEAT.glb',
  legs: '/assets/models/Mila/sillamiladoble/TKSSO110000.glb',
  beam: '/assets/models/Mila/sillamiladoble/TKSSO090000_60.glb',
  centerSupportLeg: '/assets/models/Mila/sillamiladoble/TKSSO100000.glb',
};

export const MILA_BUILDER_TUNE = {
  // Distancia entre puestos consecutivos en X. Mayor valor = más separación.
  SEPARACION_ENTRE_PUESTOS_MM: 600,
  // Máximo de puestos permitidos.
  MAX_PUESTOS: 4,
  // Altura base de patas. Más negativo = más abajo.
  OFFSET_Y_PATAS_MM: -180,
  // Altura base de vigas. Más negativo = más abajo.
  OFFSET_Y_VIGAS_MM: -120,
  // Posición inicial Z de vigas. Ajuste fino final ocurre en la factory.
  // Sube este valor si quieres que las vigas se acerquen más al frente/trasera.
  OFFSET_Z_VIGAS_MM: 140,
};

export const MILA_DOUBLE_BUILDER_TUNE = {
  // Misma separación base que la Mila simple.
  SEPARACION_ENTRE_PUESTOS_MM: 600,
  // Máximo de puestos permitidos para la doble.
  MAX_PUESTOS: 4,
  // Altura base de patas.
  OFFSET_Y_PATAS_MM: -180,
  // Altura base de vigas.
  OFFSET_Y_VIGAS_MM: -120,
  // Posición inicial Z de vigas.
  OFFSET_Z_VIGAS_MM: 140,
};

export const MILA_ALIGN_TUNE = {
  // Patas: mayor valor = más hacia adentro (debajo de la silla).
  LEG_INSET_FACTOR: 0.46,
  // Patas: mayor valor = más abajo. Unidad: metros.
  LEG_DROP_M: 0.03,
  // Vigas: mayor valor = más hacia adentro (al centro del cuadrado).
  BEAM_INSET_FROM_LEG_Z_M: 0.177,
  // Vigas: mayor valor = más juntas entre sí (cierre frontal/trasero).
  BEAM_PAIR_CLOSER_M: 0.055,
  // Vigas del medio: mayor valor = más separadas entre sí.
  // Solo afecta a las vigas intermedias cuando hay 4 vigas.
  BEAM_MIDDLE_SPREAD_M: 0.040,
  // Patas intermedias de Mila doble (entre viga 1-2 y 3-4):
  // mayor valor = más separadas, menor valor = más juntas.
  DOUBLE_CENTER_SUPPORT_SPREAD_M: 0.004,
  // Vigas: mayor valor = más abajo en Y.
  BEAM_TOP_Y_OFFSET_M: -0.004,
  // Vigas: largo horizontal base. 1.0 ~= luz completa entre patas.
  // La factory usa este valor solo como referencia y lo ajusta por cantidad.
  BEAM_SPAN_RATIO: 2.7,
  // Vigas: ratio por cantidad de puestos.
  // Si subes un valor, esa cantidad queda más larga.
  // Si bajas un valor, esa cantidad queda más corta.
  BEAM_SPAN_RATIO_BY_QUANTITY: {
    1: 2.7,
    2: 1.30,
    3: 1.15,
    4: 1.10,
  },
  // Vigas: tope máximo de escala horizontal para permitir 3-4 sillas.
  BEAM_SCALE_X_MAX: 8,
};

export const MILA_SINGLE_SEAT_MODE_OFFSETS_MM = {
  chair: { x: 0, y: 0, z: 0 },
  // Mesa simple: bajar en Y y centrar en Z.
  table: { x: 0, y: -30, z: 0 },
  // Mesa con grommet: mismo ajuste de base para que quede alineada y centrada.
  tableGrommet: { x: 0, y: -30, z: 0 },
};

export function resolveMilaBeamSpanRatio(quantity) {
  const normalizedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
  const ratioByQuantity = MILA_ALIGN_TUNE.BEAM_SPAN_RATIO_BY_QUANTITY || {};

  return Number(ratioByQuantity[normalizedQuantity]) || MILA_ALIGN_TUNE.BEAM_SPAN_RATIO;
}

export function resolveMilaCenterSupportOffsetMm(quantity, moduleSpacingMm) {
  const normalizedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));

  // Con 1-2 sillas no existe apoyo central.
  if (normalizedQuantity < 3) return null;

  // Con 3 sillas: mitad de la silla 2 (centro de la segunda).
  if (normalizedQuantity === 3) return moduleSpacingMm;

  // Con 4 sillas: mitad entre silla 2 y silla 3.
  return moduleSpacingMm * 1.5;
}

export function resolveMilaDoubleCenterSupportOffsetMm(quantity, moduleSpacingMm) {
  return resolveMilaCenterSupportOffsetMm(quantity, moduleSpacingMm);
}
