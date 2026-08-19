import { getDoorHostSegment, getDoorInterval, normalizeDoorDefinition, validateDoorPlacement } from './doorDefinition.js';

function pointAt(segment, distance, normalOffset = 0) {
  return {
    x: segment.start.x + segment.direction.x * distance + segment.normal.x * normalOffset,
    z: segment.start.z + segment.direction.z * distance + segment.normal.z * normalOffset,
  };
}

export function projectPointToWallSegment(point, segment) {
  const dx = point.x - segment.start.x;
  const dz = point.z - segment.start.z;
  const offset = Math.max(0, Math.min(segment.length, dx * segment.direction.x + dz * segment.direction.z));
  return { offset, point: pointAt(segment, offset), distance: Math.hypot(point.x - pointAt(segment, offset).x, point.z - pointAt(segment, offset).z) };
}

export function buildDoorGeometry2D(door, walls, openings = []) {
  const normalized = normalizeDoorDefinition(door);
  const host = normalized && getDoorHostSegment(normalized, walls);
  if (!normalized || !host) return null;
  const validation = validateDoorPlacement(normalized, walls, openings);
  const interval = getDoorInterval(normalized);
  const sideSign = normalized.swingSide === 'OUTSIDE' ? -1 : 1;
  const hingeOffset = normalized.swingDirection === 'LEFT' ? interval.start : interval.end;
  const leafDirection = normalized.swingDirection === 'LEFT' ? 1 : -1;
  const hinge = pointAt(host.segment, hingeOffset);
  const closedEnd = pointAt(host.segment, hingeOffset + normalized.width * leafDirection);
  const angle = normalized.openingAngle * sideSign * leafDirection;
  const closedVector = { x: closedEnd.x - hinge.x, z: closedEnd.z - hinge.z };
  const openEnd = {
    x: hinge.x + closedVector.x * Math.cos(angle) - closedVector.z * Math.sin(angle),
    z: hinge.z + closedVector.x * Math.sin(angle) + closedVector.z * Math.cos(angle),
  };
  return {
    doorId: normalized.id,
    wallId: normalized.wallId,
    segmentId: normalized.segmentId,
    valid: validation.valid,
    invalidReason: validation.reason,
    interval,
    center: pointAt(host.segment, normalized.offset),
    jambs: [pointAt(host.segment, interval.start), pointAt(host.segment, interval.end)],
    hinge,
    closedEnd,
    openEnd,
    leaf: { a: hinge, b: openEnd },
    arc: { center: hinge, radius: normalized.width, startAngle: host.segment.angle + (leafDirection < 0 ? Math.PI : 0), endAngle: host.segment.angle + (leafDirection < 0 ? Math.PI : 0) + angle, counterClockwise: angle < 0 },
    direction: host.segment.direction,
    normal: host.segment.normal,
    thickness: host.wall.thickness,
  };
}

export function splitWallSegmentIntervals(segment, openings = []) {
  const intervals = openings.map(normalizeDoorDefinition).filter((door) => door?.visible !== false && door.segmentId === segment.segmentId).map(getDoorInterval).sort((a, b) => a.start - b.start);
  const pieces = [];
  let cursor = 0;
  intervals.forEach((interval) => {
    if (interval.start > cursor) pieces.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  });
  if (cursor < segment.length) pieces.push({ start: cursor, end: segment.length });
  return pieces.filter((piece) => piece.end - piece.start > Number.EPSILON).map((piece) => ({ ...piece, a: pointAt(segment, piece.start), b: pointAt(segment, piece.end) }));
}

export function buildWallSegmentPolygons2D(segment, openings = []) {
  const intervals = splitWallSegmentIntervals(segment, openings);
  return intervals.map(({ a, b }) => {
    const ox = segment.normal.x * segment.halfThickness;
    const oz = segment.normal.z * segment.halfThickness;
    return [
      { x: a.x + ox, z: a.z + oz }, { x: b.x + ox, z: b.z + oz },
      { x: b.x - ox, z: b.z - oz }, { x: a.x - ox, z: a.z - oz },
    ];
  });
}
