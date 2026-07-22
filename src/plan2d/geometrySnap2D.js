export const SNAP_TYPES = Object.freeze({
  VERTEX: 'VERTEX',
  ENDPOINT: 'ENDPOINT',
  MIDPOINT: 'MIDPOINT',
  CENTER: 'CENTER',
  SEGMENT: 'SEGMENT',
});

const SNAP_PRIORITY = Object.freeze({
  [SNAP_TYPES.VERTEX]: 0,
  [SNAP_TYPES.ENDPOINT]: 1,
  [SNAP_TYPES.MIDPOINT]: 2,
  [SNAP_TYPES.CENTER]: 3,
  [SNAP_TYPES.SEGMENT]: 4,
});

function isFinitePoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.z);
}

function rotateLocalPoint(localX, localZ, centerX, centerZ, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: centerX + localX * cos - localZ * sin,
    z: centerZ + localX * sin + localZ * cos,
  };
}

export function buildSnapGeometry(snapshot = []) {
  const points = [];
  const segments = [];

  snapshot.filter(Boolean).forEach((part) => {
    const centerX = Number(part.x);
    const centerZ = Number(part.z);
    const width = Math.abs(Number(part.w));
    const depth = Math.abs(Number(part.d));
    const angle = Number(part.rotY) || 0;
    if (![centerX, centerZ, width, depth].every(Number.isFinite)) return;
    if (width <= 0 || depth <= 0) return;

    const sourceId = part.id || null;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const vertices = [
      rotateLocalPoint(-halfWidth, -halfDepth, centerX, centerZ, angle),
      rotateLocalPoint(halfWidth, -halfDepth, centerX, centerZ, angle),
      rotateLocalPoint(halfWidth, halfDepth, centerX, centerZ, angle),
      rotateLocalPoint(-halfWidth, halfDepth, centerX, centerZ, angle),
    ];

    vertices.forEach((point) => {
      points.push({ type: SNAP_TYPES.VERTEX, point, sourceId });
    });

    for (let index = 0; index < vertices.length; index += 1) {
      const a = vertices[index];
      const b = vertices[(index + 1) % vertices.length];
      const midpoint = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      points.push({ type: SNAP_TYPES.MIDPOINT, point: midpoint, sourceId });
      segments.push({
        type: SNAP_TYPES.SEGMENT,
        a,
        b,
        sourceId,
        endpointType: SNAP_TYPES.ENDPOINT,
      });
    }

    points.push({
      type: SNAP_TYPES.CENTER,
      point: { x: centerX, z: centerZ },
      sourceId,
    });
  });

  return { points, segments };
}

function projectPointToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return { ...a };
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared)
  );
  return { x: a.x + dx * t, z: a.z + dz * t };
}

export function resolveSnapPoint({
  worldPoint,
  screenPoint,
  scale,
  geometry,
  tolerancePx = 10,
} = {}) {
  const normalizedScale = Number(scale);
  const normalizedTolerance = Math.max(0, Number(tolerancePx) || 0);
  if (!isFinitePoint(worldPoint) || !Number.isFinite(normalizedScale) || normalizedScale <= 0) {
    throw new TypeError('resolveSnapPoint requires a world point and a positive scale.');
  }

  const worldTolerance = normalizedTolerance / normalizedScale;
  let best = null;

  const consider = (type, point, sourceId) => {
    if (!isFinitePoint(point)) return;
    const worldDistance = Math.hypot(point.x - worldPoint.x, point.z - worldPoint.z);
    if (worldDistance > worldTolerance) return;
    const distancePx = worldDistance * normalizedScale;
    const priority = SNAP_PRIORITY[type] ?? Number.MAX_SAFE_INTEGER;
    if (
      !best ||
      priority < best.priority ||
      (priority === best.priority && distancePx < best.distancePx)
    ) {
      best = { type, point: { x: point.x, z: point.z }, sourceId, distancePx, priority };
    }
  };

  (geometry?.points || []).forEach((candidate) => {
    consider(candidate.type, candidate.point, candidate.sourceId);
  });
  (geometry?.segments || []).forEach((segment) => {
    consider(segment.endpointType || SNAP_TYPES.ENDPOINT, segment.a, segment.sourceId);
    consider(segment.endpointType || SNAP_TYPES.ENDPOINT, segment.b, segment.sourceId);
    consider(
      segment.type || SNAP_TYPES.SEGMENT,
      projectPointToSegment(worldPoint, segment.a, segment.b),
      segment.sourceId
    );
  });

  if (!best) {
    return {
      snapped: false,
      type: null,
      point: { x: worldPoint.x, z: worldPoint.z },
      sourceId: null,
      distancePx: null,
      screenPoint: screenPoint || null,
    };
  }

  const { priority: _priority, ...resolved } = best;
  return { snapped: true, ...resolved, screenPoint: screenPoint || null };
}
