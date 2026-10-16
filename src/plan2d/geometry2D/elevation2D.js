import { SNAP_TYPES } from '../geometrySnap2D.js';

export const ELEVATION_DIRECTIONS = Object.freeze(['front', 'back', 'left', 'right']);

export function buildElevationSnapGeometry(shapes, { invertZ = false } = {}) {
  const points = [];
  const segments = [];
  const verticalSign = invertZ ? -1 : 1;
  for (const shape of shapes || []) {
    if (shape?.type !== 'elevation' || shape.visible === false) continue;
    const geometry = shape.geometry;
    const boxes = [
      { id: 'outer', x: 0, y: 0, width: geometry.width, height: geometry.height },
      ...(geometry.components || []).map((component, index) => ({ ...component, id: `component:${index}` })),
    ];
    boxes.forEach((box, boxIndex) => {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      const corners = [
        [-halfWidth, -halfHeight], [halfWidth, -halfHeight],
        [halfWidth, halfHeight], [-halfWidth, halfHeight],
      ].map(([dx, dy]) => ({ x: geometry.x + box.x + dx, z: geometry.y + verticalSign * (box.y + dy) }));
      corners.forEach((point, featureIndex) => points.push({
        type: SNAP_TYPES.VERTEX, point, sourceType: 'elevation', sourceId: shape.id,
        feature: { kind: SNAP_TYPES.VERTEX, index: boxIndex * 4 + featureIndex, componentId: box.id, featureIndex },
      }));
      corners.forEach((a, featureIndex) => {
        const b = corners[(featureIndex + 1) % 4];
        const edgeIndex = boxIndex * 4 + featureIndex;
        const feature = { kind: SNAP_TYPES.SEGMENT, edgeIndex, componentId: box.id, featureIndex };
        segments.push({ type: SNAP_TYPES.SEGMENT, a, b, sourceType: 'elevation', sourceId: shape.id, feature, endpointType: SNAP_TYPES.ENDPOINT });
        points.push({
          type: SNAP_TYPES.MIDPOINT, point: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
          sourceType: 'elevation', sourceId: shape.id,
          feature: { kind: SNAP_TYPES.MIDPOINT, edgeIndex, componentId: box.id, featureIndex },
        });
      });
      if (boxIndex === 0) points.push({
        type: SNAP_TYPES.CENTER, point: { x: geometry.x, z: geometry.y },
        sourceType: 'elevation', sourceId: shape.id,
        feature: { kind: SNAP_TYPES.CENTER, componentId: box.id },
      });
    });
  }
  return { points, segments };
}

export function projectElevationBounds(sourceBoxes, direction) {
  if (!ELEVATION_DIRECTIONS.includes(direction) || !Array.isArray(sourceBoxes) || !sourceBoxes.length) return null;
  const projected = sourceBoxes.map((box) => {
    const [u0, u1] = direction === 'front' ? [box.min.x, box.max.x]
      : direction === 'back' ? [-box.max.x, -box.min.x]
        : direction === 'left' ? [box.min.z, box.max.z]
          : [-box.max.z, -box.min.z];
    return { minU: u0, maxU: u1, minV: box.min.y, maxV: box.max.y };
  });
  const minU = Math.min(...projected.map((box) => box.minU));
  const maxU = Math.max(...projected.map((box) => box.maxU));
  const minV = Math.min(...projected.map((box) => box.minV));
  const maxV = Math.max(...projected.map((box) => box.maxV));
  const width = Math.max(0.001, maxU - minU);
  const height = Math.max(0.001, maxV - minV);
  return {
    width, height,
    components: projected.map((box) => ({
      x: (box.minU + box.maxU - minU - maxU) / 2,
      y: (minV + maxV - box.minV - box.maxV) / 2,
      width: Math.max(0.001, box.maxU - box.minU),
      height: Math.max(0.001, box.maxV - box.minV),
    })),
  };
}
