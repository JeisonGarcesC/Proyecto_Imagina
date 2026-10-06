export const SNAP_DISTANCE_MM = 300;
export const MAGNETIC_SNAP_DISTANCE_MM = 150;
export const SNAP_TOLERANCE_MM = SNAP_DISTANCE_MM;
export const DEFAULT_MULTIPLE_LAYOUT = Object.freeze({ snapEnabled: true, snapDistanceMm: SNAP_DISTANCE_MM, snapToleranceMm: SNAP_DISTANCE_MM });
export const MULTIPLE_CONNECTION_TYPES = Object.freeze(['LINEAR_START', 'LINEAR_END', 'CORNER_LEFT', 'CORNER_RIGHT', 'DOOR_CONNECTION']);

export function normalizeMultipleLayout(layout = {}) {
  // 50 mm was the previous default. Migrate existing systems while preserving
  // explicit distances stored under the new setting.
  const legacy = Number(layout.snapToleranceMm);
  const tolerance = Number(layout.snapDistanceMm ?? (legacy === 50 ? SNAP_DISTANCE_MM : layout.snapToleranceMm));
  const snapDistanceMm = Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : SNAP_DISTANCE_MM;
  return {
    snapEnabled: layout.snapEnabled !== false,
    snapDistanceMm,
    snapToleranceMm: snapDistanceMm,
  };
}
