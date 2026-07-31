const REFERENCE_STATUS = Object.freeze({
  RESOLVED: 'RESOLVED',
  NO_REFERENCE: 'NO_REFERENCE',
  REFERENCE_INCOMPLETE: 'REFERENCE_INCOMPLETE',
  SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',
  FEATURE_NOT_FOUND: 'FEATURE_NOT_FOUND',
});

function clonePoint(point) {
  return { x: Number(point.x), z: Number(point.z) };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.z));
}

function findSegment(segments, sourceId, edgeIndex) {
  return segments.find(
    (segment) =>
      segment?.sourceId === sourceId &&
      segment?.feature?.kind === 'SEGMENT' &&
      segment.feature.edgeIndex === edgeIndex
  );
}

function projectPointToSegment(point, segment) {
  const dx = segment.b.x - segment.a.x;
  const dz = segment.b.z - segment.a.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return clonePoint(segment.a);

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segment.a.x) * dx + (point.z - segment.a.z) * dz) / lengthSquared
    )
  );
  return {
    x: segment.a.x + dx * t,
    z: segment.a.z + dz * t,
  };
}

function resolveReference(reference, fallbackPoint, snapGeometry) {
  const fallback = clonePoint(fallbackPoint);
  if (!reference) {
    return { point: fallback, resolved: false, status: REFERENCE_STATUS.NO_REFERENCE };
  }

  const sourceId = reference.sourceId;
  const feature = reference.feature;
  if (!sourceId || !feature?.kind) {
    return {
      point: fallback,
      resolved: false,
      status: REFERENCE_STATUS.REFERENCE_INCOMPLETE,
    };
  }

  const points = Array.isArray(snapGeometry?.points) ? snapGeometry.points : [];
  const segments = Array.isArray(snapGeometry?.segments) ? snapGeometry.segments : [];
  const sourceExists =
    points.some((candidate) => candidate?.sourceId === sourceId) ||
    segments.some((candidate) => candidate?.sourceId === sourceId);

  if (!sourceExists) {
    return {
      point: fallback,
      resolved: false,
      status: REFERENCE_STATUS.SOURCE_NOT_FOUND,
    };
  }

  let resolvedPoint = null;

  if (feature.kind === 'VERTEX') {
    resolvedPoint = points.find(
      (candidate) =>
        candidate?.sourceId === sourceId &&
        candidate?.feature?.kind === 'VERTEX' &&
        candidate.feature.index === feature.index
    )?.point;
  } else if (feature.kind === 'CENTER') {
    resolvedPoint = points.find(
      (candidate) =>
        candidate?.sourceId === sourceId && candidate?.feature?.kind === 'CENTER'
    )?.point;
  } else if (feature.kind === 'MIDPOINT') {
    const segment = findSegment(segments, sourceId, feature.edgeIndex);
    if (segment) {
      resolvedPoint = {
        x: (segment.a.x + segment.b.x) / 2,
        z: (segment.a.z + segment.b.z) / 2,
      };
    }
  } else if (feature.kind === 'ENDPOINT') {
    const segment = findSegment(segments, sourceId, feature.edgeIndex);
    if (segment && (feature.endpointIndex === 0 || feature.endpointIndex === 1)) {
      resolvedPoint = feature.endpointIndex === 0 ? segment.a : segment.b;
    }
  } else if (feature.kind === 'SEGMENT') {
    const segment = findSegment(segments, sourceId, feature.edgeIndex);
    if (segment) {
      // Temporal: proyectar el punto persistido. La referencia asociativa completa
      // conservará feature.t para reconstruir exactamente su posición sobre el borde.
      resolvedPoint = projectPointToSegment(fallback, segment);
    }
  }

  if (!isFinitePoint(resolvedPoint)) {
    return {
      point: fallback,
      resolved: false,
      status: REFERENCE_STATUS.FEATURE_NOT_FOUND,
    };
  }

  return {
    point: clonePoint(resolvedPoint),
    resolved: true,
    status: REFERENCE_STATUS.RESOLVED,
  };
}

export function resolveDimensionReferences({ dimension, snapGeometry } = {}) {
  if (!dimension || !isFinitePoint(dimension.startPoint) || !isFinitePoint(dimension.endPoint)) {
    throw new TypeError('resolveDimensionReferences requires a Dimension2D with valid points.');
  }

  const start = resolveReference(
    dimension.references?.start,
    dimension.startPoint,
    snapGeometry
  );
  const end = resolveReference(dimension.references?.end, dimension.endPoint, snapGeometry);

  return {
    startPoint: start.point,
    endPoint: end.point,
    startResolved: start.resolved,
    endResolved: end.resolved,
    startStatus: start.status,
    endStatus: end.status,
  };
}

export { REFERENCE_STATUS as DIMENSION_REFERENCE_STATUS };
