import { Vector3 } from 'three';

export const CRITTERIUM_SNAP_DISTANCE_M = 0.3;
export const CRITTERIUM_SNAP_PREVIEW_DISTANCE_M = 0.45;
export const CRITTERIUM_ANGLE_TOLERANCE_DEG = 2;
export const CRITTERIUM_CONNECTED_TOLERANCE_M = 0.015;

export function classifyCritteriumConnection(source, target, { angleToleranceDeg = CRITTERIUM_ANGLE_TOLERANCE_DEG } = {}) {
  if (!source || !target || source.sequenceId === target.sequenceId) return { valid: false, reason: 'INVALID_SEQUENCE_PAIR' };
  if (source.frameMode !== target.frameMode || Math.abs(source.heightCm - target.heightCm) > 0.01 ||
    Math.abs(source.projectHeightCm - target.projectHeightCm) > 0.01 ||
    Math.abs(source.thicknessCm - target.thicknessCm) > 0.01) {
    return { valid: false, reason: 'INCOMPATIBLE_DIMENSIONS' };
  }
  const a = new Vector3(...source.direction).normalize();
  const b = new Vector3(...target.direction).normalize();
  const dot = Math.max(-1, Math.min(1, a.dot(b)));
  const angle = Math.acos(dot) * 180 / Math.PI;
  const normalA = new Vector3(...source.normal).normalize();
  const normalB = new Vector3(...target.normal).normalize();
  const normalAngle = Math.acos(Math.max(-1, Math.min(1, Math.abs(normalA.dot(normalB))))) * 180 / Math.PI;
  if (Math.abs(angle - 180) <= angleToleranceDeg && normalAngle <= angleToleranceDeg) {
    return { valid: true, type: 'LINEAR' };
  }
  if (Math.abs(angle - 90) <= angleToleranceDeg && Math.abs(normalAngle - 90) <= angleToleranceDeg) {
    return { valid: true, type: 'DEG_90' };
  }
  return { valid: false, reason: 'INCOMPATIBLE_ORIENTATION' };
}
