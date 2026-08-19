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
