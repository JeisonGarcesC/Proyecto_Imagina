import { getDoorInterval, normalizeDoorDefinition, validateDoorPlacement } from './doorDefinition.js';

function descriptor(segment, wall, start, end, height, baseElevation, kind, doorId = null) {
  const length = end - start;
  const centerDistance = (start + end) / 2;
  return {
    wallId: wall.id, segmentId: segment.segmentId, doorId, pieceKind: kind,
    length, height, thickness: wall.thickness, baseElevation,
    center: {
      x: segment.start.x + segment.direction.x * centerDistance,
      y: baseElevation + height / 2,
      z: segment.start.z + segment.direction.z * centerDistance,
    },
    rotationY: segment.angle,
  };
}

export function buildWallSegmentPieces3D(wall, segment, openings = [], walls = [wall]) {
  const doors = openings.map(normalizeDoorDefinition).filter((door) => door?.visible !== false && door.wallId === wall.id && door.segmentId === segment.segmentId && validateDoorPlacement(door, walls, openings).valid).sort((a, b) => a.offset - b.offset);
  if (!doors.length) return [descriptor(segment, wall, 0, segment.length, wall.height, wall.baseElevation, 'FULL')];
  const pieces = [];
  let cursor = 0;
  doors.forEach((door) => {
    const interval = getDoorInterval(door);
    if (interval.start > cursor) pieces.push(descriptor(segment, wall, cursor, interval.start, wall.height, wall.baseElevation, 'SIDE'));
    if (door.sillHeight > 0) pieces.push(descriptor(segment, wall, interval.start, interval.end, door.sillHeight, wall.baseElevation, 'SILL', door.id));
    const lintelHeight = wall.height - door.sillHeight - door.height;
    if (lintelHeight > Number.EPSILON) pieces.push(descriptor(segment, wall, interval.start, interval.end, lintelHeight, wall.baseElevation + door.sillHeight + door.height, 'LINTEL', door.id));
    cursor = interval.end;
  });
  if (cursor < segment.length) pieces.push(descriptor(segment, wall, cursor, segment.length, wall.height, wall.baseElevation, 'SIDE'));
  return pieces;
}
