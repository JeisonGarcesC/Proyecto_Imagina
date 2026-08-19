import { COLUMN_SHAPES } from './columnDefinition.js';
import { buildColumnGeometry2D, isPointInColumnPolygon } from './columnGeometry2D.js';

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return Math.hypot(point.x - start.x, point.z - start.z);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

export function hitTestColumn(point, columns, tolerance = 0) {
  const extra = Number.isFinite(Number(tolerance)) ? Math.max(0, Number(tolerance)) : 0;
  let closest = null;
  for (const column of columns || []) {
    if (!column || column.visible === false) continue;
    const geometry = buildColumnGeometry2D(column);
    let hit = false;
    let distance = Infinity;
    if (geometry.shape === COLUMN_SHAPES.CIRCLE) {
      distance = Math.hypot(point.x - geometry.center.x, point.z - geometry.center.z);
      hit = distance <= geometry.radius + extra;
    } else {
      hit = isPointInColumnPolygon(point, geometry.polygon);
      distance = Math.hypot(point.x - geometry.center.x, point.z - geometry.center.z);
      if (!hit && extra > 0) {
        hit = geometry.polygon.some((start, index) =>
          distanceToSegment(point, start, geometry.polygon[(index + 1) % geometry.polygon.length]) <= extra
        );
      }
    }
    if (hit && (!closest || distance < closest.distance)) closest = { columnId: column.id, column, distance };
  }
  return closest;
}

export function selectColumnAtPoint(point, columns, tolerance = 0) {
  return hitTestColumn(point, columns, tolerance)?.columnId || null;
}

export function deleteColumnById(columns, id) {
  const collection = Array.isArray(columns) ? columns : [];
  const target = collection.find((column) => column?.id === id);
  if (!target || target.locked) return collection;
  return collection.filter((column) => column.id !== id);
}
