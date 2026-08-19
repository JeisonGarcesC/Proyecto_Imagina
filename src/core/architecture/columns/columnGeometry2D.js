import { COLUMN_SHAPES } from './columnDefinition.js';

function rotatePoint(x, z, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return { x: x * cosine - z * sine, z: x * sine + z * cosine };
}

export function buildColumnGeometry2D(column) {
  const center = { x: column.position.x, z: column.position.z };
  if (column.shape === COLUMN_SHAPES.CIRCLE) {
    const radius = column.diameter / 2;
    return {
      columnId: column.id,
      shape: COLUMN_SHAPES.CIRCLE,
      center,
      radius,
      cardinalPoints: [
        { x: center.x + radius, z: center.z },
        { x: center.x, z: center.z + radius },
        { x: center.x - radius, z: center.z },
        { x: center.x, z: center.z - radius },
      ],
      bounds: { minX: center.x - radius, maxX: center.x + radius, minZ: center.z - radius, maxZ: center.z + radius, width: column.diameter, depth: column.diameter },
    };
  }

  const halfWidth = column.width / 2;
  const halfDepth = column.depth / 2;
  const polygon = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ].map((point) => {
    const rotated = rotatePoint(point.x, point.z, column.rotation);
    return { x: center.x + rotated.x, z: center.z + rotated.z };
  });
  const xs = polygon.map((point) => point.x);
  const zs = polygon.map((point) => point.z);
  return {
    columnId: column.id,
    shape: COLUMN_SHAPES.RECTANGLE,
    center,
    polygon,
    corners: polygon,
    midpoints: polygon.map((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return { x: (point.x + next.x) / 2, z: (point.z + next.z) / 2 };
    }),
    bounds: {
      minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs),
      width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs),
    },
  };
}

export function isPointInColumnPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.z > point.z) !== (b.z > point.z)
      && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
