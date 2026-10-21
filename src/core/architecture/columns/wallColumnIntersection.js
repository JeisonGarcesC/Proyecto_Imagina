import { buildColumnGeometry2D } from './columnGeometry2D.js';
import { COLUMN_SHAPES } from './columnDefinition.js';
import { buildResolvedWallFootprint, subtractWallPolygons } from '../walls/wallResolvedFootprint.js';

const CIRCLE_SEGMENTS = 32; // Coincide con CylinderGeometry de ThreeCanvas.

export function buildColumnSectionPolygon(column) {
  const geometry = buildColumnGeometry2D(column);
  if (geometry.shape !== COLUMN_SHAPES.CIRCLE) return geometry.polygon;
  return Array.from({ length: CIRCLE_SEGMENTS }, (_, index) => {
    const angle = 2 * Math.PI * index / CIRCLE_SEGMENTS - column.rotation;
    return {
      x: geometry.center.x + geometry.radius * Math.sin(angle),
      z: geometry.center.z + geometry.radius * Math.cos(angle),
    };
  });
}

function overlapsVertically(column, walls, elevation) {
  const bottom = column.baseElevation || 0;
  const top = bottom + column.height;
  if (elevation != null) return elevation >= bottom && elevation < top;
  return walls.some((wall) => {
    const wallBottom = wall.baseElevation || 0;
    return bottom < wallBottom + wall.height && wallBottom < top;
  });
}

export function buildResolvedWallColumnFootprint(walls, columns, options = {}) {
  const wallFootprint = buildResolvedWallFootprint(walls, options);
  const activeColumns = (columns || []).filter((column) =>
    column?.visible !== false && overlapsVertically(column, walls || [], options.elevation));
  const columnPolygons = activeColumns.map(buildColumnSectionPolygon);
  if (!columnPolygons.length) return wallFootprint;
  return {
    ...wallFootprint,
    rings: subtractWallPolygons(wallFootprint.polygons, columnPolygons),
  };
}
