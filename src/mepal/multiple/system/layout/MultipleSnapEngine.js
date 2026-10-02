import { Vector3 } from 'three';
import { getMultipleConnectionPoints, resolveMultipleConnection } from './MultipleConnectionResolver.js';
import { normalizeMultipleLayout } from './multipleLayoutTypes.js';
import { detectMultipleCollisions } from './MultipleCollisionEngine.js';
import { toWorldUnitsFromMm, toMmFromWorldUnits } from '../../connections/multipleSpatialUnits.js';

const sameDimension = (a, b, key) => Number(a.config?.[key]) === Number(b.config?.[key]);

export function previewMultipleSnap(moving, others = [], layout = {}, { worldMatrix, allowedPointIds = null } = {}) {
  const settings = normalizeMultipleLayout(layout);
  if (!settings.snapEnabled) return null;
  const neighbors = others.filter((module) => module.moduleId !== moving.moduleId);
  let best = null;
  for (const target of neighbors) {
    for (const a of getMultipleConnectionPoints(target)) for (const b of getMultipleConnectionPoints(moving)) {
      if (allowedPointIds && (!allowedPointIds.includes(a.id) || !allowedPointIds.includes(b.id))) continue;
      const sourceWorld = new Vector3(...b.position);
      const targetWorld = new Vector3(...a.position);
      if (worldMatrix) { sourceWorld.applyMatrix4(worldMatrix); targetWorld.applyMatrix4(worldMatrix); }
      const offset = a.position.map((value, index) => value - b.position[index]);
      const distanceWorld = sourceWorld.distanceTo(targetWorld);
      if (distanceWorld > toWorldUnitsFromMm(settings.snapDistanceMm)) continue;
      const distanceMm = toMmFromWorldUnits(distanceWorld);
      const position = { x: moving.position.x + offset[0], y: moving.position.y + offset[1], z: moving.position.z + offset[2] };
      const sameType = a.compatibleWith.includes(b.type) && b.compatibleWith.includes(a.type);
      const dot = a.direction.reduce((sum, value, index) => sum + value * b.direction[index], 0);
      const sameOrientation = dot <= -0.99;
      const sameHeight = sameDimension(target, moving, 'heightCm');
      const sameThickness = sameDimension(target, moving, 'thicknessCm');
      const wouldCollide = sameType && sameOrientation && sameHeight && sameThickness &&
        detectMultipleCollisions([...neighbors, { ...moving, position }]).some((item) => item.type === 'COLLISION_REAL' && (item.moduleA === moving.moduleId || item.moduleB === moving.moduleId));
      const reason = !sameType ? 'MULTIPLE_SNAP_CONNECTION_TYPE_MISMATCH'
        : !sameOrientation ? 'MULTIPLE_SNAP_ORIENTATION_MISMATCH'
          : !sameHeight ? 'MULTIPLE_SNAP_HEIGHT_MISMATCH'
            : !sameThickness ? 'MULTIPLE_SNAP_THICKNESS_MISMATCH'
              : wouldCollide ? 'COLLISION_REAL' : null;
      const connection = reason ? null : resolveMultipleConnection(target, a.id, moving, b.id);
      const status = !sameType || wouldCollide ? 'RED' : reason ? 'YELLOW' : 'GREEN';
      const score = [Number(!sameType), Number(!sameOrientation), Number(!sameHeight), Number(!sameThickness), Number(wouldCollide), distanceMm];
      const candidate = { status, reason, connection, distanceMm, position, origin: b.position, destination: a.position, sourcePoint: b.id, targetPoint: a.id, targetModuleId: target.moduleId, score };
      const difference = best && score.findIndex((value, index) => value !== best.score[index]);
      if (!best || difference >= 0 && score[difference] < best.score[difference]) best = candidate;
    }
  }
  return best;
}

export function findMultipleSnap(moving, others = [], layout = {}, options = {}) {
  const candidate = previewMultipleSnap(moving, others, layout, options);
  return candidate?.status === 'GREEN' ? candidate : null;
}
