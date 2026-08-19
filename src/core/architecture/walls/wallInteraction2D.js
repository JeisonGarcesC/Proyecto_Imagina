import { isPointInPolygon2D } from './wallGeometry2D.js';
import { buildJoinedWallsGeometry2D, getJoinedWallGeometry } from './wallJoins2D.js';

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return Math.hypot(point.x - start.x, point.z - start.z);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

export function hitTestWall(point, walls, tolerance = 0) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z)) return null;
  const extraTolerance = Number.isFinite(Number(tolerance)) ? Math.max(0, Number(tolerance)) : 0;
  let closest = null;
  const joinedWallsGeometry = buildJoinedWallsGeometry2D(walls);

  for (const wall of walls || []) {
    if (!wall || wall.visible === false || !Array.isArray(wall.points)) continue;
    const geometry = getJoinedWallGeometry(joinedWallsGeometry, wall.id);
    if (!geometry) continue;
    for (const segment of geometry.segmentsGeometry) {
      const inside = isPointInPolygon2D(point, segment.polygon);
      const distance = inside ? 0 : distanceToSegment(point, segment.start, segment.end);
      if (!inside && distance > segment.halfThickness + extraTolerance) continue;
      if (!closest || distance < closest.distance) {
        closest = { wallId: wall.id, wall, segmentIndex: segment.segmentIndex, segmentId: segment.segmentId, distance };
      }
    }
    if (!closest) {
      const patchHit = geometry.joinedGeometry.patches.some((polygon) => isPointInPolygon2D(point, polygon));
      if (patchHit) closest = { wallId: wall.id, wall, segmentIndex: null, segmentId: null, distance: 0 };
    }
  }

  return closest;
}

export function selectWallAtPoint(point, walls, tolerance = 0) {
  return hitTestWall(point, walls, tolerance)?.wallId || null;
}

export function deleteWallById(walls, id) {
  const collection = Array.isArray(walls) ? walls : [];
  const target = collection.find((wall) => wall?.id === id);
  if (!target || target.locked === true) return collection;
  return collection.filter((wall) => wall?.id !== id);
}
