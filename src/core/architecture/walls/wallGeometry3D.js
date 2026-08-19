import { buildWallGeometry2D } from './wallGeometry2D.js';
import { buildJoinedWallsGeometry2D } from './wallJoins2D.js';
import { buildWallSegmentPieces3D } from '../openings/doorGeometry3D.js';

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
