export const SNAP_TOLERANCE_MM = 50;
export const DEFAULT_MULTIPLE_LAYOUT = Object.freeze({ snapEnabled: true, snapToleranceMm: SNAP_TOLERANCE_MM });
export const MULTIPLE_CONNECTION_TYPES = Object.freeze(['LINEAR_START', 'LINEAR_END', 'CORNER_LEFT', 'CORNER_RIGHT', 'DOOR_CONNECTION']);

export function normalizeMultipleLayout(layout = {}) {
  const tolerance = Number(layout.snapToleranceMm);
  return {
    snapEnabled: layout.snapEnabled !== false,
    snapToleranceMm: Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : SNAP_TOLERANCE_MM,
  };
}
