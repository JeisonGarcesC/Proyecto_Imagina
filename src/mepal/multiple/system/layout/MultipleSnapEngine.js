import { getMultipleConnectionPoints, resolveMultipleConnection } from './MultipleConnectionResolver.js';
import { normalizeMultipleLayout } from './multipleLayoutTypes.js';
import { detectMultipleCollisions } from './MultipleCollisionEngine.js';

export function previewMultipleSnap(moving, others = [], layout = {}) {
  const settings = normalizeMultipleLayout(layout);
  if (!settings.snapEnabled) return null;
  const neighbors = others.filter((module) => module.moduleId !== moving.moduleId);
  let best = null;
  for (const target of neighbors) {
    for (const a of getMultipleConnectionPoints(target)) for (const b of getMultipleConnectionPoints(moving)) {
      const connection = resolveMultipleConnection(target, a.id, moving, b.id);
      const offset = a.position.map((value, index) => value - b.position[index]);
      const distanceMm = Math.hypot(...offset) * 1000;
      if (distanceMm > Math.max(settings.snapToleranceMm * 3, 150)) continue;
      const position = { x: moving.position.x + offset[0], y: moving.position.y + offset[1], z: moving.position.z + offset[2] };
      const sameSection = Number(target.config?.heightCm) === Number(moving.config?.heightCm) && Number(target.config?.thicknessCm) === Number(moving.config?.thicknessCm);
      const wouldCollide = connection && detectMultipleCollisions([...neighbors, { ...moving, position }]).some((item) => item.type === 'COLLISION_REAL' && (item.moduleA === moving.moduleId || item.moduleB === moving.moduleId));
      const status = !connection || wouldCollide ? 'RED' : distanceMm <= settings.snapToleranceMm && sameSection ? 'GREEN' : 'YELLOW';
      const candidate = { status, connection, distanceMm, position, origin: b.position, destination: a.position, targetModuleId: target.moduleId };
      const rank = { GREEN: 0, YELLOW: 1, RED: 2 };
      if (!best || rank[status] < rank[best.status] || (rank[status] === rank[best.status] && distanceMm < best.distanceMm)) best = candidate;
    }
  }
  return best;
}

export function findMultipleSnap(moving, others = [], layout = {}) {
  const candidate = previewMultipleSnap(moving, others, layout);
  return candidate?.status === 'GREEN' ? candidate : null;
}
