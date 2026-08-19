import { COLUMN_SHAPES } from './columnDefinition.js';

export function buildColumnGeometry3D(column) {
  return {
    columnId: column.id,
    geometryType: column.shape === COLUMN_SHAPES.CIRCLE ? 'CYLINDER' : 'BOX',
    shape: column.shape,
    width: column.width,
    depth: column.depth,
    diameter: column.diameter,
    height: column.height,
    baseElevation: column.baseElevation,
    center: {
      x: column.position.x,
      y: column.baseElevation + column.height / 2,
      z: column.position.z,
    },
    rotationY: column.rotation,
  };
}
