import { buildDoorGeometry2D } from './doorGeometry2D.js';

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x; const dz = b.z - a.z;
  const length2 = dx * dx + dz * dz;
  const t = length2 <= Number.EPSILON ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / length2));
  return Math.hypot(point.x - (a.x + dx * t), point.z - (a.z + dz * t));
}

export function hitTestOpening(point, openings, walls, tolerance = 0.08) {
  let best = null;
  for (const opening of openings || []) {
    if (opening?.visible === false) continue;
    const geometry = buildDoorGeometry2D(opening, walls, openings);
    if (!geometry) continue;
    const distance = Math.min(
      distanceToSegment(point, geometry.jambs[0], geometry.jambs[1]),
      distanceToSegment(point, geometry.leaf.a, geometry.leaf.b),
      Math.abs(Math.hypot(point.x - geometry.hinge.x, point.z - geometry.hinge.z) - geometry.arc.radius)
    );
    if (distance <= tolerance && (!best || distance < best.distance)) best = { openingId: opening.id, distance, geometry };
  }
  return best;
}

export function selectOpeningAtPoint(point, openings, walls, tolerance) {
  return hitTestOpening(point, openings, walls, tolerance)?.openingId || null;
}

export function deleteOpeningById(openings, id) {
  const target = (openings || []).find((opening) => opening.id === id);
  if (target?.locked) return openings || [];
  return (openings || []).filter((opening) => opening.id !== id);
}

export function deleteOpeningsForWall(openings, wallId) {
  return (openings || []).filter((opening) => opening.wallId !== wallId);
}
