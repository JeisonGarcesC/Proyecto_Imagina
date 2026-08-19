import { buildWallGeometry2D } from '../walls/wallGeometry2D.js';
import { OPENING_SCHEMA_VERSION, OPENING_TYPES, cloneOpeningData, createOpeningId } from './openingDefinition.js';

export const DOOR_SWING_DIRECTIONS = Object.freeze({ LEFT: 'LEFT', RIGHT: 'RIGHT' });
export const DOOR_SWING_SIDES = Object.freeze({ INSIDE: 'INSIDE', OUTSIDE: 'OUTSIDE' });
export const DEFAULT_DOOR_WIDTH = 0.9;
export const DEFAULT_DOOR_HEIGHT = 2.1;
export const DEFAULT_DOOR_OPENING_ANGLE = Math.PI / 2;
export const DOOR_END_MARGIN = 0.05;

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => finite(value, fallback) > 0 ? finite(value, fallback) : fallback;

export function normalizeDoorDefinition(door) {
  if (!door || typeof door !== 'object') return null;
  const wallId = typeof door.wallId === 'string' ? door.wallId : '';
  const segmentId = typeof door.segmentId === 'string' ? door.segmentId : '';
  if (!wallId || !segmentId) return null;
  return {
    schemaVersion: OPENING_SCHEMA_VERSION,
    id: typeof door.id === 'string' && door.id ? door.id : createOpeningId('DOOR'),
    type: OPENING_TYPES.DOOR,
    wallId,
    segmentId,
    offset: Math.max(0, finite(door.offset, 0)),
    width: positive(door.width, DEFAULT_DOOR_WIDTH),
    height: positive(door.height, DEFAULT_DOOR_HEIGHT),
    sillHeight: Math.max(0, finite(door.sillHeight, 0)),
    swingDirection: door.swingDirection === DOOR_SWING_DIRECTIONS.RIGHT ? DOOR_SWING_DIRECTIONS.RIGHT : DOOR_SWING_DIRECTIONS.LEFT,
    swingSide: door.swingSide === DOOR_SWING_SIDES.OUTSIDE ? DOOR_SWING_SIDES.OUTSIDE : DOOR_SWING_SIDES.INSIDE,
    openingAngle: Math.max(0, Math.min(Math.PI, finite(door.openingAngle, DEFAULT_DOOR_OPENING_ANGLE))),
    visible: door.visible !== false,
    locked: door.locked === true,
    materialCode: door.materialCode == null ? null : String(door.materialCode),
    metadata: cloneOpeningData(door.metadata, {}),
  };
}

export const createDoorDefinition = normalizeDoorDefinition;

export function getDoorHostSegment(door, walls) {
  const wall = (walls || []).find((item) => item?.id === door?.wallId);
  if (!wall) return null;
  const segment = buildWallGeometry2D(wall).segmentsGeometry.find((item) => item.segmentId === door.segmentId);
  return segment ? { wall, segment } : null;
}

export function getDoorInterval(door) {
  return { start: door.offset - door.width / 2, end: door.offset + door.width / 2 };
}

export function validateDoorPlacement(door, walls, openings = [], options = {}) {
  const normalized = normalizeDoorDefinition(door);
  if (!normalized) return { valid: false, reason: 'INVALID_DEFINITION', door: null };
  const host = getDoorHostSegment(normalized, walls);
  if (!host) return { valid: false, reason: 'SEGMENT_NOT_FOUND', door: normalized };
  const margin = Number.isFinite(Number(options.margin)) ? Math.max(0, Number(options.margin)) : DOOR_END_MARGIN;
  const interval = getDoorInterval(normalized);
  if (interval.start < margin || interval.end > host.segment.length - margin) {
    return { valid: false, reason: 'DOES_NOT_FIT', door: normalized, segment: host.segment };
  }
  if (normalized.sillHeight + normalized.height > host.wall.height) {
    return { valid: false, reason: 'HEIGHT_EXCEEDS_WALL', door: normalized, segment: host.segment };
  }
  const overlap = (openings || []).map(normalizeDoorDefinition).filter(Boolean).find((other) => {
    if (other.id === normalized.id || other.wallId !== normalized.wallId || other.segmentId !== normalized.segmentId) return false;
    const otherInterval = getDoorInterval(other);
    return interval.start < otherInterval.end && interval.end > otherInterval.start;
  });
  if (overlap) return { valid: false, reason: 'OVERLAP', door: normalized, conflictingId: overlap.id, segment: host.segment };
  return { valid: true, reason: null, door: normalized, wall: host.wall, segment: host.segment };
}

export function updateDoorDefinition(door, patch, context = {}) {
  const current = normalizeDoorDefinition(door);
  if (!current) return null;
  const changes = patch && typeof patch === 'object' ? patch : {};
  if (current.locked && changes.locked !== false) return current;
  const next = normalizeDoorDefinition({ ...current, ...changes, id: current.id });
  if (!next) return current;
  if (context.walls) return validateDoorPlacement(next, context.walls, context.openings || []).valid ? next : current;
  return next;
}
