export const WALL_ANGLE_TOLERANCE_RAD = 5 * Math.PI / 180;
export const WALL_ANGLE_MIN_DISTANCE_PX = 10;

// Se aplica solo al borrador de muros. Un snap a geometría existente tiene prioridad.
export function resolveWallAngularSnap(start, rawPoint, options = {}) {
  const point = { x: rawPoint?.x, z: rawPoint?.z };
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z) ||
      !Number.isFinite(start?.x) || !Number.isFinite(start?.z) || options.pointSnapped) {
    return { point, axis: null };
  }
  const dx = point.x - start.x;
  const dz = point.z - start.z;
  const distance = Math.hypot(dx, dz);
  const scale = Number(options.scale);
  if (!Number.isFinite(scale) || scale <= 0 || distance * scale < WALL_ANGLE_MIN_DISTANCE_PX) {
    return { point, axis: null };
  }
  const angle = Math.atan2(dz, dx);
  const tolerance = WALL_ANGLE_TOLERANCE_RAD;
  const horizontalError = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
  const horizontalReverseError = Math.abs(Math.atan2(Math.sin(angle - Math.PI), Math.cos(angle - Math.PI)));
  if (Math.min(horizontalError, horizontalReverseError) <= tolerance) {
    return { point: { x: start.x + Math.sign(dx) * distance, z: start.z }, axis: 'HORIZONTAL' };
  }
  const verticalError = Math.abs(Math.atan2(Math.sin(angle - Math.PI / 2), Math.cos(angle - Math.PI / 2)));
  const verticalReverseError = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
  if (Math.min(verticalError, verticalReverseError) <= tolerance) {
    return { point: { x: start.x, z: start.z + Math.sign(dz) * distance }, axis: 'VERTICAL' };
  }
  return { point, axis: null };
}
