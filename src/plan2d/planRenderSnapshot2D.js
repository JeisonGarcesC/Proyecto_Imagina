import { buildSnapGeometry } from './geometrySnap2D.js';
import { buildElevationSnapGeometry, projectElevationBounds } from './geometry2D/elevation2D.js';
import { getResolvedDimension2D } from './dimensionReferenceResolver.js';

export function resolvePlanShapes2D(shapes = [], getElevationSource) {
  return shapes.map((shape) => {
    if (shape?.type !== 'elevation') return shape;
    const sourceBoxes = getElevationSource?.(shape.sourceSelection)?.sourceBoxes || shape.sourceBoxes;
    const projection = projectElevationBounds(sourceBoxes, shape.viewDirection);
    return projection ? { ...shape, geometry: { ...shape.geometry, ...projection } } : shape;
  });
}

export function resolvePlanDimensions2D(parts = [], shapes = [], dimensions = [], invertZ = true) {
  const plant = buildSnapGeometry(parts);
  const elevations = buildElevationSnapGeometry(shapes, { invertZ });
  const snapGeometry = {
    points: [...plant.points.map((candidate) => ({ ...candidate, sourceType: candidate.sourceType || 'plant' })), ...elevations.points],
    segments: [...plant.segments.map((candidate) => ({ ...candidate, sourceType: candidate.sourceType || 'plant' })), ...elevations.segments],
  };
  return { snapGeometry, dimensions: dimensions.map((dimension) => getResolvedDimension2D({ dimension, snapGeometry })) };
}
