function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function createWallSegmentId(startPointId, endPointId) {
  return `WS_${String(startPointId)}_${String(endPointId)}`;
}

export function buildWallSegmentGeometry2D(start, end, thickness = 0.1) {
  const dx = finiteNumber(end?.x) - finiteNumber(start?.x);
  const dz = finiteNumber(end?.z) - finiteNumber(start?.z);
  const length = Math.hypot(dx, dz);
  if (length <= Number.EPSILON) return null;

  const direction = { x: dx / length, z: dz / length };
  const normal = { x: -direction.z, z: direction.x };
  const halfThickness = Math.max(0, finiteNumber(thickness, 0.1)) / 2;
  const offset = { x: normal.x * halfThickness, z: normal.z * halfThickness };

  return {
    segmentId: createWallSegmentId(start.id, end.id),
    startPointId: start.id,
    endPointId: end.id,
    start: { x: finiteNumber(start.x), z: finiteNumber(start.z) },
    end: { x: finiteNumber(end.x), z: finiteNumber(end.z) },
    length,
    angle: Math.atan2(dz, dx),
    center: {
      x: (finiteNumber(start.x) + finiteNumber(end.x)) / 2,
      z: (finiteNumber(start.z) + finiteNumber(end.z)) / 2,
    },
    direction,
    normal,
    halfThickness,
    polygon: [
      { x: finiteNumber(start.x) + offset.x, z: finiteNumber(start.z) + offset.z },
      { x: finiteNumber(end.x) + offset.x, z: finiteNumber(end.z) + offset.z },
      { x: finiteNumber(end.x) - offset.x, z: finiteNumber(end.z) - offset.z },
      { x: finiteNumber(start.x) - offset.x, z: finiteNumber(start.z) - offset.z },
    ],
  };
}

function getSegmentsBounds(segments) {
  if (!segments.length) return null;
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  segments.forEach((segment) => {
    segment.polygon.forEach((point) => {
      minX = Math.min(minX, point.x);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxZ = Math.max(maxZ, point.z);
    });
  });
  return { minX, minZ, maxX, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

export function buildWallGeometry2D(wall) {
  const points = Array.isArray(wall?.points) ? wall.points : [];
  const segmentsGeometry = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const segment = buildWallSegmentGeometry2D(points[index], points[index + 1], wall?.thickness);
    if (segment) segmentsGeometry.push({ ...segment, segmentIndex: index });
  }
  return {
    wallId: wall?.id || null,
    alignment: wall?.alignment || 'CENTER',
    joinStyle: wall?.joinStyle || 'MITER',
    segmentsGeometry,
    bounds: getSegmentsBounds(segmentsGeometry),
  };
}

export function getWallBounds2D(wall) {
  return buildWallGeometry2D(wall).bounds;
}

export function isPointInPolygon2D(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = (a.z > point.z) !== (b.z > point.z)
      && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
