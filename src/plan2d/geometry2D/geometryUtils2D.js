import { SHAPE_2D_TYPES } from './shapes2D.js';

export function transformShapeToCanvas(
  shape,
  { toCanvas, scale = 1, rotationSign = -1 } = {}
) {
  if (!shape || typeof toCanvas !== 'function') return null;
  const normalizedScale = Number(scale);
  if (!Number.isFinite(normalizedScale) || normalizedScale <= 0) return null;
  const geometry = shape.geometry;

  if (shape.type === SHAPE_2D_TYPES.LINE) {
    const [x1, y1] = toCanvas(geometry.x1, geometry.y1);
    const [x2, y2] = toCanvas(geometry.x2, geometry.y2);
    return { x1, y1, x2, y2 };
  }
  if (shape.type === SHAPE_2D_TYPES.POLYGON) {
    const center = geometry.points.reduce(
      (sum, point) => ({ x: sum.x + point.x / geometry.points.length, y: sum.y + point.y / geometry.points.length }),
      { x: 0, y: 0 }
    );
    const cos = Math.cos(geometry.rotation || 0);
    const sin = Math.sin(geometry.rotation || 0);
    return {
      points: geometry.points.map((point) => {
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return toCanvas(center.x + dx * cos - dy * sin, center.y + dx * sin + dy * cos);
      }),
    };
  }

  const [x, y] = toCanvas(geometry.x, geometry.y);
  if (shape.type === SHAPE_2D_TYPES.CIRCLE) {
    return { x, y, radius: geometry.radius * normalizedScale };
  }
  if (shape.type === SHAPE_2D_TYPES.SQUARE) {
    return {
      x,
      y,
      width: geometry.size * normalizedScale,
      height: geometry.size * normalizedScale,
      rotation: geometry.rotation * rotationSign,
    };
  }
  return {
    x,
    y,
    width: geometry.width * normalizedScale,
    height: geometry.height * normalizedScale,
    rotation: geometry.rotation * rotationSign,
  };
}
