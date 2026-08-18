import { FOOTPRINT2D_TYPES } from './footprint2D.js';

export const DEFAULT_CURVE_SEGMENTS_2D = 32;

const EPSILON = 1e-9;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function rectangleVertices(width, depth) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ];
}

function buildSegments(vertices) {
  return vertices.map((a, index) => ({ a, b: vertices[(index + 1) % vertices.length] }));
}

function buildFallbackGeometry(width, depth) {
  const vertices = rectangleVertices(width, depth);
  return {
    type: FOOTPRINT2D_TYPES.RECTANGLE,
    vertices,
    segments: buildSegments(vertices),
    snapVertices: vertices,
    snapSegments: buildSegments(vertices),
    center: { x: 0, z: 0 },
    fallback: true,
    curved: false,
  };
}

function resolveFootprintScale(part, footprint) {
  const width = Math.abs(finiteNumber(part?.w));
  const depth = Math.abs(finiteNumber(part?.d));
  const footprintWidth = Math.abs(finiteNumber(footprint?.bounds?.w));
  const footprintDepth = Math.abs(finiteNumber(footprint?.bounds?.d));
  if (width <= EPSILON || depth <= EPSILON || footprintWidth <= EPSILON || footprintDepth <= EPSILON) {
    return null;
  }
  return { x: width / footprintWidth, z: depth / footprintDepth };
}

function resolvePolygonVertices(footprint, scale) {
  if (!Array.isArray(footprint?.points) || footprint.points.length < 3) return null;
  const centerX = finiteNumber(footprint?.center?.x);
  const centerZ = finiteNumber(footprint?.center?.z);
  const vertices = footprint.points.map((point) => {
    const x = Number(point?.x);
    const z = Number(point?.z);
    return Number.isFinite(x) && Number.isFinite(z)
      ? { x: (x - centerX) * scale.x, z: (z - centerZ) * scale.z }
      : null;
  });
  return vertices.every(Boolean) ? vertices : null;
}

function resolveCurveSegments(value) {
  const requested = Math.round(Number(value));
  return Number.isFinite(requested) ? Math.max(12, Math.min(64, requested)) : DEFAULT_CURVE_SEGMENTS_2D;
}

function buildCurveVertices(radiusX, radiusZ, segmentCount) {
  return Array.from({ length: segmentCount }, (_, index) => {
    const angle = (index / segmentCount) * Math.PI * 2;
    return { x: Math.cos(angle) * radiusX, z: Math.sin(angle) * radiusZ };
  });
}

export function buildFootprintLocalGeometry(part, { curveSegments } = {}) {
  const width = Math.abs(finiteNumber(part?.w));
  const depth = Math.abs(finiteNumber(part?.d));
  if (width <= EPSILON || depth <= EPSILON) return null;

  const footprint = part?.footprint;
  const scale = resolveFootprintScale(part, footprint);
  if (!footprint || !scale) return buildFallbackGeometry(width, depth);

  try {
    if (footprint.type === FOOTPRINT2D_TYPES.RECTANGLE) {
      const geometry = buildFallbackGeometry(width, depth);
      return { ...geometry, fallback: false };
    }

    if (
      footprint.type === FOOTPRINT2D_TYPES.POLYGON ||
      footprint.type === FOOTPRINT2D_TYPES.TRIANGLE
    ) {
      const vertices = resolvePolygonVertices(footprint, scale);
      if (!vertices) return buildFallbackGeometry(width, depth);
      const segments = buildSegments(vertices);
      return {
        type: footprint.type,
        vertices,
        segments,
        snapVertices: vertices,
        snapSegments: segments,
        center: { x: 0, z: 0 },
        fallback: false,
        curved: false,
      };
    }

    if (
      footprint.type === FOOTPRINT2D_TYPES.CIRCLE ||
      footprint.type === FOOTPRINT2D_TYPES.ELLIPSE
    ) {
      const radiusX = Math.abs(
        finiteNumber(footprint.radiusX, footprint.bounds.w / 2) * scale.x
      );
      const radiusZ = Math.abs(
        finiteNumber(footprint.radiusZ, footprint.bounds.d / 2) * scale.z
      );
      if (radiusX <= EPSILON || radiusZ <= EPSILON) return buildFallbackGeometry(width, depth);
      const vertices = buildCurveVertices(radiusX, radiusZ, resolveCurveSegments(curveSegments));
      const snapVertices = [
        { x: radiusX, z: 0 },
        { x: 0, z: radiusZ },
        { x: -radiusX, z: 0 },
        { x: 0, z: -radiusZ },
      ];
      return {
        type: footprint.type,
        vertices,
        segments: buildSegments(vertices),
        snapVertices,
        snapSegments: [],
        center: { x: 0, z: 0 },
        radii: { x: radiusX, z: radiusZ },
        fallback: false,
        curved: true,
      };
    }
  } catch {
    return buildFallbackGeometry(width, depth);
  }

  return buildFallbackGeometry(width, depth);
}

function transformPoint(point, centerX, centerZ, cosine, sine) {
  return {
    x: centerX + point.x * cosine - point.z * sine,
    z: centerZ + point.x * sine + point.z * cosine,
  };
}

export function buildFootprintWorldGeometry(part, options) {
  const centerX = Number(part?.x);
  const centerZ = Number(part?.z);
  if (!Number.isFinite(centerX) || !Number.isFinite(centerZ)) return null;
  const local = buildFootprintLocalGeometry(part, options);
  if (!local) return null;
  const rotation = finiteNumber(part?.rotY);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const mapPoint = (point) => transformPoint(point, centerX, centerZ, cosine, sine);
  const vertices = local.vertices.map(mapPoint);
  const snapVertices = local.snapVertices.map(mapPoint);
  return {
    ...local,
    vertices,
    segments: buildSegments(vertices),
    snapVertices,
    snapSegments: local.curved ? [] : buildSegments(snapVertices),
    center: { x: centerX, z: centerZ },
  };
}

function orientation(a, b, point) {
  return (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x);
}

export function pointOnSegment2D(point, a, b, epsilon = EPSILON) {
  return (
    Math.abs(orientation(a, b, point)) <= epsilon &&
    point.x >= Math.min(a.x, b.x) - epsilon &&
    point.x <= Math.max(a.x, b.x) + epsilon &&
    point.z >= Math.min(a.z, b.z) - epsilon &&
    point.z <= Math.max(a.z, b.z) + epsilon
  );
}

export function pointInPolygon2D(point, vertices) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z) || vertices?.length < 3) {
    return false;
  }
  let inside = false;
  for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index++) {
    const a = vertices[index];
    const b = vertices[previous];
    if (pointOnSegment2D(point, a, b)) return true;
    if (
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function hitTestFootprint2D(part, worldPoint, options) {
  const geometry = buildFootprintWorldGeometry(part, options);
  return Boolean(geometry && pointInPolygon2D(worldPoint, geometry.vertices));
}
