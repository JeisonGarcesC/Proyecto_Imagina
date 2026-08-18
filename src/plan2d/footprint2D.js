export const FOOTPRINT2D_VERSION = 1;

export const FOOTPRINT2D_TYPES = Object.freeze({
  RECTANGLE: 'RECTANGLE',
  CIRCLE: 'CIRCLE',
  ELLIPSE: 'ELLIPSE',
  TRIANGLE: 'TRIANGLE',
  POLYGON: 'POLYGON',
});

const DEFAULT_EPSILON = 1e-9;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePoint(point) {
  const x = Number(point?.x);
  const z = Number(point?.z);
  return Number.isFinite(x) && Number.isFinite(z) ? { x, z } : null;
}

function pointDistanceSquared(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function cross(origin, a, b) {
  return (a.x - origin.x) * (b.z - origin.z) - (a.z - origin.z) * (b.x - origin.x);
}

function resolvePointCollection(points = []) {
  return (Array.isArray(points) ? points : []).map(normalizePoint).filter(Boolean);
}

function resolveBoundsFromPoints(points = []) {
  if (!points.length) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  points.forEach(({ x, z }) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  return {
    center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
    bounds: { w: Math.max(0, maxX - minX), d: Math.max(0, maxZ - minZ) },
  };
}

function freezeFootprint(footprint) {
  footprint.points.forEach(Object.freeze);
  Object.freeze(footprint.points);
  Object.freeze(footprint.center);
  Object.freeze(footprint.bounds);
  return Object.freeze(footprint);
}

export function createFootprint2D({
  type = FOOTPRINT2D_TYPES.POLYGON,
  points = [],
  center = null,
  bounds = null,
  radiusX,
  radiusZ,
} = {}) {
  const normalizedPoints = resolvePointCollection(points);
  const derived = resolveBoundsFromPoints(normalizedPoints) || {
    center: { x: 0, z: 0 },
    bounds: { w: 0, d: 0 },
  };
  const normalizedType = Object.values(FOOTPRINT2D_TYPES).includes(type)
    ? type
    : FOOTPRINT2D_TYPES.POLYGON;

  const footprint = {
    version: FOOTPRINT2D_VERSION,
    type: normalizedType,
    points: normalizedPoints,
    center: {
      x: finiteNumber(center?.x, derived.center.x),
      z: finiteNumber(center?.z, derived.center.z),
    },
    bounds: {
      w: Math.max(0, finiteNumber(bounds?.w, derived.bounds.w)),
      d: Math.max(0, finiteNumber(bounds?.d, derived.bounds.d)),
    },
  };

  const normalizedRadiusX = Number(radiusX);
  const normalizedRadiusZ = Number(radiusZ);
  if (Number.isFinite(normalizedRadiusX)) footprint.radiusX = Math.max(0, normalizedRadiusX);
  if (Number.isFinite(normalizedRadiusZ)) footprint.radiusZ = Math.max(0, normalizedRadiusZ);

  return freezeFootprint(footprint);
}

function readXZ(value, xIndex = 'x', zIndex = 'z') {
  if (Array.isArray(value)) {
    return { x: finiteNumber(value[0]), z: finiteNumber(value[2]) };
  }
  return {
    x: finiteNumber(value?.[xIndex]),
    z: finiteNumber(value?.[zIndex]),
  };
}

export function createRectangleFootprint(bounds2d = {}) {
  const center = bounds2d.localCenter
    ? readXZ(bounds2d.localCenter)
    : readXZ(bounds2d.center);
  const size = bounds2d.sizeLocal
    ? readXZ(bounds2d.sizeLocal)
    : {
        x: finiteNumber(bounds2d.bounds?.w ?? bounds2d.w),
        z: finiteNumber(bounds2d.bounds?.d ?? bounds2d.d),
      };
  const width = Math.max(0, Math.abs(size.x));
  const depth = Math.max(0, Math.abs(size.z));
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return createFootprint2D({
    type: FOOTPRINT2D_TYPES.RECTANGLE,
    center,
    bounds: { w: width, d: depth },
    points: [
      { x: center.x - halfWidth, z: center.z - halfDepth },
      { x: center.x + halfWidth, z: center.z - halfDepth },
      { x: center.x + halfWidth, z: center.z + halfDepth },
      { x: center.x - halfWidth, z: center.z + halfDepth },
    ],
  });
}

export function deduplicatePoints2D(points = [], tolerance = DEFAULT_EPSILON) {
  const epsilon = Math.max(DEFAULT_EPSILON, Math.abs(Number(tolerance) || 0));
  const epsilonSquared = epsilon * epsilon;
  const normalized = resolvePointCollection(points);
  const unique = [];
  const buckets = new Map();

  normalized.forEach((point) => {
    const bucketX = Math.floor(point.x / epsilon);
    const bucketZ = Math.floor(point.z / epsilon);
    let duplicate = false;

    for (let offsetX = -1; offsetX <= 1 && !duplicate; offsetX += 1) {
      for (let offsetZ = -1; offsetZ <= 1 && !duplicate; offsetZ += 1) {
        const candidates = buckets.get(`${bucketX + offsetX}:${bucketZ + offsetZ}`) || [];
        duplicate = candidates.some(
          (candidate) => pointDistanceSquared(point, candidate) <= epsilonSquared
        );
      }
    }

    if (!duplicate) {
      unique.push(point);
      const key = `${bucketX}:${bucketZ}`;
      const bucket = buckets.get(key) || [];
      bucket.push(point);
      buckets.set(key, bucket);
    }
  });

  return unique;
}

export function convexHull2D(points = [], tolerance = DEFAULT_EPSILON) {
  const epsilon = Math.max(DEFAULT_EPSILON, Math.abs(Number(tolerance) || 0));
  const sorted = deduplicatePoints2D(points, epsilon).sort((a, b) => a.x - b.x || a.z - b.z);
  if (sorted.length <= 2) return sorted;

  const lower = [];
  sorted.forEach((point) => {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= epsilon
    ) {
      lower.pop();
    }
    lower.push(point);
  });

  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= epsilon
    ) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return Math.sqrt(pointDistanceSquared(point, start));
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared)
  );
  const projected = { x: start.x + dx * t, z: start.z + dz * t };
  return Math.sqrt(pointDistanceSquared(point, projected));
}

export function simplifyPolygon2D(points = [], tolerance = 0) {
  const normalized = resolvePointCollection(points).filter((point, index, collection) => {
    if (index === 0) return true;
    return pointDistanceSquared(point, collection[index - 1]) > DEFAULT_EPSILON ** 2;
  });
  if (
    normalized.length > 1 &&
    pointDistanceSquared(normalized[0], normalized[normalized.length - 1]) <=
      DEFAULT_EPSILON ** 2
  ) {
    normalized.pop();
  }
  const epsilon = Math.max(0, Number(tolerance) || 0);
  if (normalized.length <= 3 || epsilon <= 0) return normalized;

  const extrema = normalized.reduce(
    (result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minZ: Math.min(result.minZ, point.z),
      maxZ: Math.max(result.maxZ, point.z),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  );
  const isExtremum = (point) =>
    Math.abs(point.x - extrema.minX) <= DEFAULT_EPSILON ||
    Math.abs(point.x - extrema.maxX) <= DEFAULT_EPSILON ||
    Math.abs(point.z - extrema.minZ) <= DEFAULT_EPSILON ||
    Math.abs(point.z - extrema.maxZ) <= DEFAULT_EPSILON;

  const simplified = [...normalized];
  let changed = true;
  while (changed && simplified.length > 3) {
    changed = false;
    for (let index = 0; index < simplified.length; index += 1) {
      const previous = simplified[(index - 1 + simplified.length) % simplified.length];
      const current = simplified[index];
      const next = simplified[(index + 1) % simplified.length];
      if (!isExtremum(current) && distanceToSegment(current, previous, next) <= epsilon) {
        simplified.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return simplified;
}

export function createPolygonFootprint(points = [], { tolerance } = {}) {
  const finitePoints = resolvePointCollection(points);
  if (finitePoints.length < 3) return null;
  const rawBounds = resolveBoundsFromPoints(finitePoints);
  const diagonal = Math.hypot(rawBounds?.bounds.w || 0, rawBounds?.bounds.d || 0);
  const simplificationTolerance = Number.isFinite(Number(tolerance))
    ? Math.max(0, Number(tolerance))
    : diagonal * 0.001;
  const hull = convexHull2D(finitePoints, Math.max(DEFAULT_EPSILON, diagonal * 1e-10));
  if (hull.length < 3) return null;
  const simplified = simplifyPolygon2D(hull, simplificationTolerance);

  return createFootprint2D({
    type: FOOTPRINT2D_TYPES.POLYGON,
    points: simplified,
  });
}
