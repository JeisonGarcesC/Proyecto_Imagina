export const VETRO_NATIVE_DIMENSION_APPROXIMATED = 'VETRO_NATIVE_DIMENSION_APPROXIMATED';

export const VETRO_NATIVE_APPROXIMATIONS = Object.freeze({
  F100_VISUAL_THICKNESS_MM: { value: 10, unit: 'mm', products: ['COMPACT_FORMICA_F100', 'COMPACT_BOARD_FORMICA_F100'], reason: 'Espesor no documentado; valor exclusivamente visual.', sourcePending: true },
  DOOR_VISUAL_PERIMETER_CLEARANCE_MM: { value: 10, unit: 'mm', products: ['DOOR_LEAF'], reason: 'Holgura de nave no documentada.', sourcePending: true },
  DOUBLE_DOOR_VISUAL_CENTER_GAP_MM: { value: 10, unit: 'mm', products: ['DOUBLE'], reason: 'Separacion entre hojas no documentada.', sourcePending: true },
  DOOR_HINGE_VISUAL_SIZE_MM: { value: [50, 80, 15], unit: 'mm', products: ['DOOR_LEAF'], reason: 'Dimensiones de bisagra no documentadas.', sourcePending: true },
  DOOR_LOCK_VISUAL_SIZE_MM: { value: [100, 50, 20], unit: 'mm', products: ['DOOR_LEAF', 'DOOR_LOCK_REPLACEMENT'], reason: 'Dimensiones de cerradura no documentadas.', sourcePending: true },
  FRAME_PROFILE_VISUAL_SECTION_MM: { value: [50, 30], unit: 'mm', products: ['DOOR_FRAME'], reason: 'La ficha solo documenta pared de aluminio de 1.5 mm.', sourcePending: true },
  FRAME_DUCT_VISUAL_SECTION_MM: { value: [80, 40], unit: 'mm', products: ['DOOR_FRAME'], reason: 'Seccion exterior del bajante no documentada.', sourcePending: true },
  LEVELING_KIT_VISUAL_SIZE_MM: { value: [40, 35, 20], unit: 'mm', products: ['GLASS_PANEL_LEVELING_LOCK_REPLACEMENT'], reason: 'Dimensiones no documentadas.', sourcePending: true },
});

export function mmToMeters(value) {
  return Number(value || 0) / 1000;
}

export function approximationValue(key) {
  return VETRO_NATIVE_APPROXIMATIONS[key]?.value;
}

export function approximationDiagnostics(flags = []) {
  return flags.length ? [{ code: VETRO_NATIVE_DIMENSION_APPROXIMATED, severity: 'WARNING', approximationFlags: [...flags] }] : [];
}
