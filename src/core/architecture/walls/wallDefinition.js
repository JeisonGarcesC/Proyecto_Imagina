export const WALL_SCHEMA_VERSION = 1;
export const DEFAULT_WALL_HEIGHT = 2.4;
export const DEFAULT_WALL_THICKNESS = 0.1;
export const DEFAULT_WALL_BASE_ELEVATION = 0;

function createStableId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizePoints(points, previousPoints = []) {
  if (!Array.isArray(points)) return [];
  return points.flatMap((point, index) => {
    const x = Number(point?.x);
    const z = Number(point?.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return [];
    const previousId = previousPoints[index]?.id;
    const id = typeof point?.id === 'string' && point.id.trim()
      ? point.id
      : typeof previousId === 'string' && previousId.trim()
        ? previousId
        : createStableId('WP');
    return [{ id, x, z }];
  });
}

function cloneSerializable(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

export function normalizeWallDefinition(wall, options = {}) {
  if (!wall || typeof wall !== 'object') return null;
  const previousPoints = Array.isArray(options.previousPoints) ? options.previousPoints : [];
  const points = normalizePoints(wall.points, previousPoints);
  if (points.length < 2) return null;
  return {
    schemaVersion: WALL_SCHEMA_VERSION,
    id: typeof wall.id === 'string' && wall.id.trim() ? wall.id : createStableId('WALL'),
    type: 'WALL',
    points,
    height: positiveNumber(wall.height, DEFAULT_WALL_HEIGHT),
    thickness: positiveNumber(wall.thickness, DEFAULT_WALL_THICKNESS),
    baseElevation: nonNegativeNumber(wall.baseElevation, DEFAULT_WALL_BASE_ELEVATION),
    alignment: typeof wall.alignment === 'string' && wall.alignment ? wall.alignment : 'CENTER',
    joinStyle: typeof wall.joinStyle === 'string' && wall.joinStyle ? wall.joinStyle : 'MITER',
    materialCode: wall.materialCode == null ? null : String(wall.materialCode),
    visible: wall.visible !== false,
    locked: wall.locked === true,
    openings: Array.isArray(wall.openings) ? cloneSerializable(wall.openings, []) : [],
    metadata: wall.metadata && typeof wall.metadata === 'object' && !Array.isArray(wall.metadata)
      ? cloneSerializable(wall.metadata, {})
      : {},
  };
}

export function createWallDefinition(options = {}) {
  return normalizeWallDefinition(options);
}

export function updateWallDefinition(wall, patch = {}) {
  const current = normalizeWallDefinition(wall);
  if (!current) return null;
  const changes = patch && typeof patch === 'object' ? patch : {};
  if (current.locked) {
    if (changes.locked !== false) return current;
    return normalizeWallDefinition({ ...current, locked: false });
  }
  return normalizeWallDefinition(
    { ...current, ...changes, id: current.id },
    { previousPoints: current.points }
  );
}

// La longitud pertenece al par de puntos; nunca se guarda en la definición.
export function getWallSegmentLength(wall, segmentIndex = 0) {
  const start = wall?.points?.[segmentIndex];
  const end = wall?.points?.[segmentIndex + 1];
  if (!start || !end) return null;
  return Math.hypot(end.x - start.x, end.z - start.z);
}

export function updateWallPoint(wall, pointIndex, coordinates) {
  if (!wall || wall.locked || !Number.isInteger(pointIndex) || !wall.points?.[pointIndex]) return null;
  const x = Number(coordinates?.x);
  const z = Number(coordinates?.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const points = wall.points.map((point, index) => index === pointIndex ? { ...point, x, z } : point);
  if (points.some((point, index) => index > 0 &&
    Math.hypot(point.x - points[index - 1].x, point.z - points[index - 1].z) <= 0)) return null;
  return updateWallDefinition(wall, { points });
}

export function resizeWallSegment(wall, segmentIndex, length) {
  const nextLength = Number(length);
  const currentLength = getWallSegmentLength(wall, segmentIndex);
  if (!Number.isInteger(segmentIndex) || !Number.isFinite(nextLength) || nextLength <= 0 ||
      !Number.isFinite(currentLength) || currentLength <= 0) return null;
  const start = wall.points[segmentIndex];
  const end = wall.points[segmentIndex + 1];
  return updateWallPoint(wall, segmentIndex + 1, {
    x: start.x + (end.x - start.x) * nextLength / currentLength,
    z: start.z + (end.z - start.z) * nextLength / currentLength,
  });
}
