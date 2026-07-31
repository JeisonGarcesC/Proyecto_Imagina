export const SNAP_TYPES = Object.freeze({
  VERTEX: 'VERTEX',
  ENDPOINT: 'ENDPOINT',
  MIDPOINT: 'MIDPOINT',
  CENTER: 'CENTER',
  SEGMENT: 'SEGMENT',
});

export const PLACEMENT_SNAP_TYPES = Object.freeze({
  VERTEX_TO_VERTEX: 'VERTEX_TO_VERTEX',
  EDGE_TO_EDGE: 'EDGE_TO_EDGE',
  CENTER_TO_CENTER: 'CENTER_TO_CENTER',
  MIDPOINT_ALIGNMENT: 'MIDPOINT_ALIGNMENT',
  DISTANCE_SNAP: 'DISTANCE_SNAP',
});

export const SNAP_LABELS = Object.freeze({
  [SNAP_TYPES.VERTEX]: 'Vértice detectado',
  [SNAP_TYPES.ENDPOINT]: 'Extremo detectado',
  [SNAP_TYPES.MIDPOINT]: 'Punto medio detectado',
  [SNAP_TYPES.CENTER]: 'Centro detectado',
  [SNAP_TYPES.SEGMENT]: 'Segmento detectado',
  [PLACEMENT_SNAP_TYPES.VERTEX_TO_VERTEX]: 'Vértices coincidentes',
  [PLACEMENT_SNAP_TYPES.EDGE_TO_EDGE]: 'Borde coincidente',
  [PLACEMENT_SNAP_TYPES.CENTER_TO_CENTER]: 'Centro alineado',
  [PLACEMENT_SNAP_TYPES.MIDPOINT_ALIGNMENT]: 'Puntos medios alineados',
  [PLACEMENT_SNAP_TYPES.DISTANCE_SNAP]: 'Distancia ajustada',
});

export const DEFAULT_SNAP_CONFIG = Object.freeze({
  vertex: true,
  endpoint: true,
  midpoint: true,
  center: true,
  segment: true,
  edgeAlignment: true,
  vertexToVertex: true,
  centerToCenter: true,
  midpointAlignment: true,
  distanceSnap: false,
  distances: Object.freeze([]),
});

export function normalizeSnapConfig(config = {}) {
  return {
    ...DEFAULT_SNAP_CONFIG,
    ...(config || {}),
    distances: Array.isArray(config?.distances)
      ? config.distances.map(Number).filter((distance) => Number.isFinite(distance) && distance >= 0)
      : [],
  };
}

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

function isSnapTypeEnabled(type, config) {
  const settingByType = {
    [SNAP_TYPES.VERTEX]: 'vertex',
    [SNAP_TYPES.ENDPOINT]: 'endpoint',
    [SNAP_TYPES.MIDPOINT]: 'midpoint',
    [SNAP_TYPES.CENTER]: 'center',
    [SNAP_TYPES.SEGMENT]: 'segment',
  };
  return config[settingByType[type]] !== false;
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

    vertices.forEach((point, index) => {
      points.push({
        type: SNAP_TYPES.VERTEX,
        point,
        sourceId,
        feature: { kind: SNAP_TYPES.VERTEX, index },
      });
    });

    for (let index = 0; index < vertices.length; index += 1) {
      const a = vertices[index];
      const b = vertices[(index + 1) % vertices.length];
      const midpoint = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      points.push({
        type: SNAP_TYPES.MIDPOINT,
        point: midpoint,
        sourceId,
        feature: { kind: SNAP_TYPES.MIDPOINT, edgeIndex: index },
      });
      segments.push({
        type: SNAP_TYPES.SEGMENT,
        a,
        b,
        sourceId,
        feature: { kind: SNAP_TYPES.SEGMENT, edgeIndex: index },
        endpointType: SNAP_TYPES.ENDPOINT,
      });
    }

    points.push({
      type: SNAP_TYPES.CENTER,
      point: { x: centerX, z: centerZ },
      sourceId,
      feature: { kind: SNAP_TYPES.CENTER },
    });
  });

  return { points, segments };
}

function projectPointToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return { ...a };
  const t = resolveSegmentParameter(point, a, b);
  return { x: a.x + dx * t, z: a.z + dz * t };
}

function resolveSegmentParameter(point, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return 0;
  return Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared)
  );
}

export function resolveSnapPoint({
  worldPoint,
  screenPoint,
  scale,
  geometry,
  tolerancePx = 10,
  config: requestedConfig,
} = {}) {
  const normalizedScale = Number(scale);
  const normalizedTolerance = Math.max(0, Number(tolerancePx) || 0);
  if (!isFinitePoint(worldPoint) || !Number.isFinite(normalizedScale) || normalizedScale <= 0) {
    throw new TypeError('resolveSnapPoint requires a world point and a positive scale.');
  }

  const worldTolerance = normalizedTolerance / normalizedScale;
  const config = normalizeSnapConfig(requestedConfig);
  let best = null;

  const consider = (type, point, sourceId, feature = null) => {
    if (!isSnapTypeEnabled(type, config)) return;
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
      best = {
        type,
        point: { x: point.x, z: point.z },
        sourceId,
        feature: feature ? { ...feature } : null,
        distancePx,
        priority,
      };
    }
  };

  (geometry?.points || []).forEach((candidate) => {
    consider(candidate.type, candidate.point, candidate.sourceId, candidate.feature);
  });
  (geometry?.segments || []).forEach((segment) => {
    const edgeIndex = segment.feature?.edgeIndex;
    consider(segment.endpointType || SNAP_TYPES.ENDPOINT, segment.a, segment.sourceId, {
      kind: SNAP_TYPES.ENDPOINT,
      edgeIndex,
      endpointIndex: 0,
    });
    consider(segment.endpointType || SNAP_TYPES.ENDPOINT, segment.b, segment.sourceId, {
      kind: SNAP_TYPES.ENDPOINT,
      edgeIndex,
      endpointIndex: 1,
    });
    const segmentPoint = projectPointToSegment(worldPoint, segment.a, segment.b);
    consider(segment.type || SNAP_TYPES.SEGMENT, segmentPoint, segment.sourceId, {
      ...(segment.feature || {}),
      kind: SNAP_TYPES.SEGMENT,
      t: resolveSegmentParameter(segmentPoint, segment.a, segment.b),
    });
  });

  if (!best) {
    return {
      snapped: false,
      type: null,
      point: { x: worldPoint.x, z: worldPoint.z },
      sourceId: null,
      feature: null,
      distancePx: null,
      screenPoint: screenPoint || null,
    };
  }

  const { priority: _priority, ...resolved } = best;
  return { snapped: true, ...resolved, screenPoint: screenPoint || null };
}

const PLACEMENT_PRIORITY = Object.freeze({
  [PLACEMENT_SNAP_TYPES.VERTEX_TO_VERTEX]: 0,
  [PLACEMENT_SNAP_TYPES.CENTER_TO_CENTER]: 1,
  [PLACEMENT_SNAP_TYPES.MIDPOINT_ALIGNMENT]: 2,
  [PLACEMENT_SNAP_TYPES.EDGE_TO_EDGE]: 3,
  [PLACEMENT_SNAP_TYPES.DISTANCE_SNAP]: 4,
});

function translatedBounds(objectBounds, targetPoint) {
  const currentX = Number(objectBounds?.x);
  const currentZ = Number(objectBounds?.z);
  return {
    ...objectBounds,
    id: objectBounds?.id || '__PLACEMENT_SOURCE__',
    x: Number.isFinite(targetPoint?.x) ? Number(targetPoint.x) : currentX,
    z: Number.isFinite(targetPoint?.z) ? Number(targetPoint.z) : currentZ,
  };
}

function segmentDirection(segment) {
  const dx = segment.b.x - segment.a.x;
  const dz = segment.b.z - segment.a.z;
  const length = Math.hypot(dx, dz);
  if (length <= Number.EPSILON) return null;
  return { x: dx / length, z: dz / length };
}

function projectPointToLine(point, segment) {
  const direction = segmentDirection(segment);
  if (!direction) return null;
  const along =
    (point.x - segment.a.x) * direction.x + (point.z - segment.a.z) * direction.z;
  return {
    x: segment.a.x + direction.x * along,
    z: segment.a.z + direction.z * along,
  };
}

export function resolvePlacementSnap({
  objectBounds,
  targetPoint,
  geometry,
  scale,
  tolerancePx = 10,
  config: requestedConfig,
} = {}) {
  const normalizedScale = Number(scale);
  const normalizedTolerance = Math.max(0, Number(tolerancePx) || 0);
  if (!objectBounds || !isFinitePoint(targetPoint)) {
    throw new TypeError('resolvePlacementSnap requires objectBounds and a target point.');
  }
  if (!Number.isFinite(normalizedScale) || normalizedScale <= 0) {
    throw new TypeError('resolvePlacementSnap requires a positive scale.');
  }

  const config = normalizeSnapConfig(requestedConfig);
  const sourceGeometry = buildSnapGeometry([translatedBounds(objectBounds, targetPoint)]);
  const worldTolerance = normalizedTolerance / normalizedScale;
  const excludedSourceId = objectBounds.id || null;
  let best = null;

  const consider = (type, sourcePoint, targetSnapPoint, targetSourceId) => {
    if (!isFinitePoint(sourcePoint) || !isFinitePoint(targetSnapPoint)) return;
    if (excludedSourceId && targetSourceId === excludedSourceId) return;
    const translation = {
      x: targetSnapPoint.x - sourcePoint.x,
      z: targetSnapPoint.z - sourcePoint.z,
    };
    const worldDistance = Math.hypot(translation.x, translation.z);
    if (worldDistance > worldTolerance) return;
    const distancePx = worldDistance * normalizedScale;
    const priority = PLACEMENT_PRIORITY[type] ?? Number.MAX_SAFE_INTEGER;
    if (
      !best ||
      priority < best.priority ||
      (priority === best.priority && distancePx < best.distancePx)
    ) {
      best = {
        snapped: true,
        type,
        point: { x: targetPoint.x + translation.x, z: targetPoint.z + translation.z },
        sourcePoint: { ...sourcePoint },
        targetSnapPoint: { ...targetSnapPoint },
        sourceId: excludedSourceId,
        targetSourceId: targetSourceId || null,
        translation,
        distancePx,
        priority,
      };
    }
  };

  const matchPoints = (sourceType, targetType, placementType) => {
    sourceGeometry.points
      .filter((candidate) => candidate.type === sourceType)
      .forEach((source) => {
        (geometry?.points || [])
          .filter((candidate) => candidate.type === targetType)
          .forEach((target) => {
            consider(placementType, source.point, target.point, target.sourceId);
          });
      });
  };

  if (config.vertexToVertex && config.vertex) {
    matchPoints(SNAP_TYPES.VERTEX, SNAP_TYPES.VERTEX, PLACEMENT_SNAP_TYPES.VERTEX_TO_VERTEX);
  }
  if (config.centerToCenter && config.center) {
    matchPoints(SNAP_TYPES.CENTER, SNAP_TYPES.CENTER, PLACEMENT_SNAP_TYPES.CENTER_TO_CENTER);
  }
  if (config.midpointAlignment && config.midpoint) {
    matchPoints(
      SNAP_TYPES.MIDPOINT,
      SNAP_TYPES.MIDPOINT,
      PLACEMENT_SNAP_TYPES.MIDPOINT_ALIGNMENT
    );
  }

  if (config.edgeAlignment && config.segment) {
    sourceGeometry.segments.forEach((sourceSegment) => {
      const sourceDirection = segmentDirection(sourceSegment);
      if (!sourceDirection) return;
      const sourceMidpoint = {
        x: (sourceSegment.a.x + sourceSegment.b.x) / 2,
        z: (sourceSegment.a.z + sourceSegment.b.z) / 2,
      };
      (geometry?.segments || []).forEach((targetSegment) => {
        if (excludedSourceId && targetSegment.sourceId === excludedSourceId) return;
        const targetDirection = segmentDirection(targetSegment);
        if (!targetDirection) return;
        const parallelDot = Math.abs(
          sourceDirection.x * targetDirection.x + sourceDirection.z * targetDirection.z
        );
        if (parallelDot < 0.999) return;
        const projection = projectPointToLine(sourceMidpoint, targetSegment);
        if (projection) {
          consider(
            PLACEMENT_SNAP_TYPES.EDGE_TO_EDGE,
            sourceMidpoint,
            projection,
            targetSegment.sourceId
          );
        }
      });
    });
  }

  if (!best) {
    return {
      snapped: false,
      type: null,
      point: { x: targetPoint.x, z: targetPoint.z },
      sourcePoint: null,
      targetSnapPoint: null,
      sourceId: excludedSourceId,
      targetSourceId: null,
      translation: { x: 0, z: 0 },
      distancePx: null,
    };
  }

  const { priority: _priority, ...resolved } = best;
  return resolved;
}
