import { buildWallGeometry2D } from './wallGeometry2D.js';
import { buildJoinedWallsGeometry2D } from './wallJoins2D.js';
import { buildWallSegmentPieces3D } from '../openings/doorGeometry3D.js';
import { buildResolvedWallFootprint } from './wallResolvedFootprint.js';
import { buildResolvedWallColumnFootprint } from '../columns/wallColumnIntersection.js';

export function buildWallGeometry3D(wall) {
  const geometry2D = buildWallGeometry2D(wall);
  const height = Number.isFinite(Number(wall?.height)) ? Number(wall.height) : 2.4;
  const thickness = Number.isFinite(Number(wall?.thickness)) ? Number(wall.thickness) : 0.1;
  const baseElevation = Number.isFinite(Number(wall?.baseElevation)) ? Number(wall.baseElevation) : 0;

  return {
    wallId: wall?.id || null,
    segmentsGeometry: geometry2D.segmentsGeometry.map((segment) => ({
      segmentId: segment.segmentId,
      segmentIndex: segment.segmentIndex,
      startPointId: segment.startPointId,
      endPointId: segment.endPointId,
      length: segment.length,
      height,
      thickness,
      baseElevation,
      center: {
        x: segment.center.x,
        y: baseElevation + height / 2,
        z: segment.center.z,
      },
      rotationY: segment.angle,
    })),
  };
}

export function buildWallsGeometry3D(walls, options = {}) {
  const joined = buildJoinedWallsGeometry2D(walls, options);
  const openings = Array.isArray(options.openings) ? options.openings : [];
  return {
    joins: joined.joins,
    segmentsGeometry: joined.wallGeometries.flatMap((wallGeometry) => {
      const wall = wallGeometry.wall;
      const height = Number.isFinite(Number(wall?.height)) ? Number(wall.height) : 2.4;
      const thickness = Number.isFinite(Number(wall?.thickness)) ? Number(wall.thickness) : 0.1;
      const baseElevation = Number.isFinite(Number(wall?.baseElevation)) ? Number(wall.baseElevation) : 0;
      return wallGeometry.segmentsGeometry.flatMap((segment) => {
        const segmentOpenings = openings.filter((opening) => opening?.wallId === wall.id && opening?.segmentId === segment.segmentId);
        if (segmentOpenings.length) return buildWallSegmentPieces3D(wall, segment, segmentOpenings, walls);
        const start = segment.resolvedStart || segment.start;
        const end = segment.resolvedEnd || segment.end;
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        return [{
          wallId: wall.id,
          segmentId: segment.segmentId,
          segmentIndex: segment.segmentIndex,
          startPointId: segment.startPointId,
          endPointId: segment.endPointId,
          length: Math.hypot(dx, dz),
          height,
          thickness,
          baseElevation,
          center: {
            x: (start.x + end.x) / 2,
            y: baseElevation + height / 2,
            z: (start.z + end.z) / 2,
          },
          rotationY: Math.atan2(dz, dx),
        }];
      });
    }),
  };
}

// Volúmenes por estratos verticales: cada estrato usa la misma unión de huellas que Canvas.
export function buildResolvedWallVolumes3D(walls, options = {}) {
  const visibleWalls = (walls || []).filter((wall) => wall?.visible !== false);
  const openings = Array.isArray(options.openings) ? options.openings : [];
  const columns = Array.isArray(options.columns) ? options.columns.filter((column) => column?.visible !== false) : [];
  const levels = new Set();
  visibleWalls.forEach((wall) => {
    const base = wall.baseElevation || 0;
    levels.add(base);
    levels.add(base + wall.height);
    openings.filter((opening) => opening.wallId === wall.id && opening.visible !== false).forEach((opening) => {
      levels.add(base + opening.sillHeight);
      levels.add(base + opening.sillHeight + opening.height);
    });
  });
  columns.forEach((column) => {
    const base = column.baseElevation || 0;
    const top = base + column.height;
    if (visibleWalls.some((wall) => {
      const wallBase = wall.baseElevation || 0;
      return base < wallBase + wall.height && wallBase < top;
    })) {
      levels.add(base);
      levels.add(top);
    }
  });
  const sorted = [...levels].filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.slice(0, -1).flatMap((baseElevation, index) => {
    const height = sorted[index + 1] - baseElevation;
    if (height <= 0) return [];
    const midpoint = baseElevation + height / 2;
    const footprint = columns.length
      ? buildResolvedWallColumnFootprint(visibleWalls, columns, { openings, elevation: midpoint })
      : buildResolvedWallFootprint(visibleWalls, { openings, elevation: midpoint });
    if (!footprint.rings.length) return [];
    const wallIds = visibleWalls.filter((wall) =>
      midpoint >= (wall.baseElevation || 0) && midpoint < (wall.baseElevation || 0) + wall.height
    ).map((wall) => wall.id);
    return [{ baseElevation, height, rings: footprint.rings, wallIds, sources: footprint.sources }];
  });
}
