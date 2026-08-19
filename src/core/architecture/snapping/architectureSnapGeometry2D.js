import { buildColumnGeometry2D } from '../columns/columnGeometry2D.js';
import { COLUMN_SHAPES } from '../columns/columnDefinition.js';
import { buildJoinedWallsGeometry2D, WALL_JOIN_TYPES } from '../walls/wallJoins2D.js';
import { buildSnapGeometry, SNAP_TYPES } from '../../../plan2d/geometrySnap2D.js';

export const ARCHITECTURE_SNAP_SOURCE_TYPES = Object.freeze({
  WALL: 'WALL',
  COLUMN: 'COLUMN',
  FURNITURE: 'FURNITURE',
});

export const ARCHITECTURE_SNAP_PRIORITIES = Object.freeze({
  [SNAP_TYPES.ENDPOINT]: 0,
  [SNAP_TYPES.CORNER]: 1,
  [SNAP_TYPES.INTERSECTION]: 2,
  [SNAP_TYPES.CENTER]: 3,
  [SNAP_TYPES.MIDPOINT]: 4,
  [SNAP_TYPES.FACE_MIDPOINT]: 5,
  [SNAP_TYPES.SEGMENT]: 6,
  [SNAP_TYPES.PERPENDICULAR]: 7,
});

function createPoint({ id, type, point, sourceType, sourceId, sourceSegmentId = null, metadata = null, feature = null }) {
  return {
    id,
    type,
    point: { x: point.x, z: point.z },
    sourceType,
    sourceId,
    sourceSegmentId,
    priority: ARCHITECTURE_SNAP_PRIORITIES[type] ?? Number.MAX_SAFE_INTEGER,
    metadata: metadata ? { ...metadata } : null,
    feature: feature ? { ...feature } : null,
  };
}

function createSegment({ id, a, b, sourceType, sourceId, sourceSegmentId, metadata = null, feature = null }) {
  return {
    id,
    type: SNAP_TYPES.SEGMENT,
    endpointType: false,
    a: { x: a.x, z: a.z },
    b: { x: b.x, z: b.z },
    sourceType,
    sourceId,
    sourceSegmentId,
    priority: ARCHITECTURE_SNAP_PRIORITIES[SNAP_TYPES.SEGMENT],
    metadata: metadata ? { ...metadata } : null,
    feature: feature ? { ...feature } : null,
  };
}

function appendWalls(points, segments, walls) {
  const joined = buildJoinedWallsGeometry2D(walls || []);
  joined.wallGeometries.forEach((wallGeometry) => {
    wallGeometry.segmentsGeometry.forEach((segment, edgeIndex) => {
      const metadata = { wallId: wallGeometry.wallId, edgeIndex };
      points.push(createPoint({
        id: `WALL:${wallGeometry.wallId}:${segment.segmentId}:START`,
        type: SNAP_TYPES.ENDPOINT,
        point: segment.start,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.WALL,
        sourceId: wallGeometry.wallId,
        sourceSegmentId: segment.segmentId,
        metadata,
        feature: { kind: SNAP_TYPES.ENDPOINT, edgeIndex, endpointIndex: 0 },
      }));
      points.push(createPoint({
        id: `WALL:${wallGeometry.wallId}:${segment.segmentId}:END`,
        type: SNAP_TYPES.ENDPOINT,
        point: segment.end,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.WALL,
        sourceId: wallGeometry.wallId,
        sourceSegmentId: segment.segmentId,
        metadata,
        feature: { kind: SNAP_TYPES.ENDPOINT, edgeIndex, endpointIndex: 1 },
      }));
      points.push(createPoint({
        id: `WALL:${wallGeometry.wallId}:${segment.segmentId}:MID`,
        type: SNAP_TYPES.MIDPOINT,
        point: segment.center,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.WALL,
        sourceId: wallGeometry.wallId,
        sourceSegmentId: segment.segmentId,
        metadata,
        feature: { kind: SNAP_TYPES.MIDPOINT, edgeIndex },
      }));
      segments.push(createSegment({
        id: `WALL:${wallGeometry.wallId}:${segment.segmentId}:AXIS`,
        a: segment.start,
        b: segment.end,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.WALL,
        sourceId: wallGeometry.wallId,
        sourceSegmentId: segment.segmentId,
        metadata,
        feature: { kind: SNAP_TYPES.SEGMENT, edgeIndex },
      }));
    });
  });

  joined.joins
    .filter((join) => join.type !== WALL_JOIN_TYPES.END && join.type !== WALL_JOIN_TYPES.STRAIGHT)
    .forEach((join) => {
      points.push(createPoint({
        id: `WALL_JOIN:${join.joinId}`,
        type: SNAP_TYPES.INTERSECTION,
        point: join.point,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.WALL,
        sourceId: join.wallIds.join('|'),
        sourceSegmentId: join.segmentIds.join('|'),
        metadata: { joinId: join.joinId, joinType: join.type, wallIds: [...join.wallIds] },
        feature: { kind: SNAP_TYPES.INTERSECTION },
      }));
    });
}

function appendColumns(points, segments, columns) {
  (columns || []).filter((column) => column?.visible !== false).forEach((column) => {
    const geometry = buildColumnGeometry2D(column);
    const metadata = { columnId: column.id, shape: geometry.shape, locked: column.locked === true };
    points.push(createPoint({
      id: `COLUMN:${column.id}:CENTER`,
      type: SNAP_TYPES.CENTER,
      point: geometry.center,
      sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.COLUMN,
      sourceId: column.id,
      metadata,
      feature: { kind: SNAP_TYPES.CENTER },
    }));

    if (geometry.shape === COLUMN_SHAPES.CIRCLE) {
      geometry.cardinalPoints.forEach((point, index) => {
        points.push(createPoint({
          id: `COLUMN:${column.id}:CARDINAL:${index}`,
          type: SNAP_TYPES.FACE_MIDPOINT,
          point,
          sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.COLUMN,
          sourceId: column.id,
          metadata,
          feature: { kind: SNAP_TYPES.FACE_MIDPOINT, edgeIndex: index },
        }));
      });
      return;
    }

    geometry.corners.forEach((point, index) => {
      points.push(createPoint({
        id: `COLUMN:${column.id}:CORNER:${index}`,
        type: SNAP_TYPES.CORNER,
        point,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.COLUMN,
        sourceId: column.id,
        metadata,
        feature: { kind: SNAP_TYPES.CORNER, index },
      }));
      const next = geometry.corners[(index + 1) % geometry.corners.length];
      segments.push(createSegment({
        id: `COLUMN:${column.id}:EDGE:${index}`,
        a: point,
        b: next,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.COLUMN,
        sourceId: column.id,
        sourceSegmentId: `EDGE_${index}`,
        metadata,
        feature: { kind: SNAP_TYPES.SEGMENT, edgeIndex: index },
      }));
    });
    geometry.midpoints.forEach((point, index) => {
      points.push(createPoint({
        id: `COLUMN:${column.id}:FACE_MIDPOINT:${index}`,
        type: SNAP_TYPES.FACE_MIDPOINT,
        point,
        sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.COLUMN,
        sourceId: column.id,
        sourceSegmentId: `EDGE_${index}`,
        metadata,
        feature: { kind: SNAP_TYPES.FACE_MIDPOINT, edgeIndex: index },
      }));
    });
  });
}

function appendFurniture(points, segments, furniture) {
  const geometry = buildSnapGeometry((furniture || []).filter((part) => part?.visible !== false));
  geometry.points.forEach((candidate, index) => {
    const type = candidate.type === SNAP_TYPES.VERTEX ? SNAP_TYPES.CORNER : candidate.type;
    points.push(createPoint({
      ...candidate,
      id: `FURNITURE:${candidate.sourceId || 'UNKNOWN'}:${type}:${index}`,
      type,
      sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.FURNITURE,
      metadata: { furnitureId: candidate.sourceId },
      feature: candidate.feature,
    }));
  });
  geometry.segments.forEach((segment, index) => {
    segments.push(createSegment({
      ...segment,
      id: `FURNITURE:${segment.sourceId || 'UNKNOWN'}:EDGE:${index}`,
      sourceType: ARCHITECTURE_SNAP_SOURCE_TYPES.FURNITURE,
      sourceSegmentId: `EDGE_${segment.feature?.edgeIndex ?? index}`,
      metadata: { furnitureId: segment.sourceId },
      feature: segment.feature,
    }));
  });
}

export function buildArchitectureSnapGeometry({ walls = [], columns = [], furniture = [] } = {}) {
  const points = [];
  const segments = [];
  appendWalls(points, segments, walls);
  appendColumns(points, segments, columns);
  appendFurniture(points, segments, furniture);
  return { points, segments };
}
