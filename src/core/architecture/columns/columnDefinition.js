export const COLUMN_SCHEMA_VERSION = 1;
export const COLUMN_SHAPES = Object.freeze({ RECTANGLE: 'RECTANGLE', CIRCLE: 'CIRCLE' });
export const DEFAULT_COLUMN_WIDTH = 0.3;
export const DEFAULT_COLUMN_DEPTH = 0.3;
export const DEFAULT_COLUMN_DIAMETER = 0.3;
export const DEFAULT_COLUMN_HEIGHT = 2.4;
export const DEFAULT_COLUMN_BASE_ELEVATION = 0;

function createId() {
  if (globalThis.crypto?.randomUUID) return `COLUMN_${globalThis.crypto.randomUUID()}`;
  return `COLUMN_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => finite(value, fallback) > 0 ? finite(value, fallback) : fallback;
const nonNegative = (value, fallback) => finite(value, fallback) >= 0 ? finite(value, fallback) : fallback;

function cloneSerializable(value, fallback) {
  try { return value == null ? fallback : JSON.parse(JSON.stringify(value)); } catch { return fallback; }
}

export function normalizeColumnDefinition(column) {
  if (!column || typeof column !== 'object') return null;
  const shape = column.shape === COLUMN_SHAPES.CIRCLE ? COLUMN_SHAPES.CIRCLE : COLUMN_SHAPES.RECTANGLE;
  return {
    schemaVersion: COLUMN_SCHEMA_VERSION,
    id: typeof column.id === 'string' && column.id.trim() ? column.id : createId(),
    type: 'COLUMN',
    shape,
    position: {
      x: finite(column.position?.x, 0),
      z: finite(column.position?.z, 0),
    },
    width: positive(column.width, DEFAULT_COLUMN_WIDTH),
    depth: positive(column.depth, DEFAULT_COLUMN_DEPTH),
    diameter: positive(column.diameter, DEFAULT_COLUMN_DIAMETER),
    rotation: finite(column.rotation, 0),
    height: positive(column.height, DEFAULT_COLUMN_HEIGHT),
    baseElevation: nonNegative(column.baseElevation, DEFAULT_COLUMN_BASE_ELEVATION),
    materialCode: column.materialCode == null ? null : String(column.materialCode),
    visible: column.visible !== false,
    locked: column.locked === true,
    metadata: column.metadata && typeof column.metadata === 'object' && !Array.isArray(column.metadata)
      ? cloneSerializable(column.metadata, {})
      : {},
  };
}

export function createColumnDefinition(options = {}) {
  return normalizeColumnDefinition(options);
}

export function updateColumnDefinition(column, patch = {}) {
  const current = normalizeColumnDefinition(column);
  if (!current) return null;
  const changes = patch && typeof patch === 'object' ? patch : {};
  if (current.locked) {
    if (changes.locked !== false) return current;
    return normalizeColumnDefinition({ ...current, locked: false });
  }
  return normalizeColumnDefinition({ ...current, ...changes, id: current.id });
}
