import { createShape } from './shapes2D.js';

const ROTATABLE_TYPES = new Set(['rectangle', 'square', 'triangle', 'polygon']);

export function getShapeCenter2D(shape) {
  const g = shape.geometry;
  if (shape.type === 'line') return { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2 };
  if (shape.type === 'polygon') {
    return g.points.reduce(
      (sum, point) => ({ x: sum.x + point.x / g.points.length, y: sum.y + point.y / g.points.length }),
      { x: 0, y: 0 }
    );
  }
  return { x: g.x, y: g.y };
}

export function rotatePoint2D(point, center, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

function centeredSize(shape) {
  if (shape.type === 'square') return { width: shape.geometry.size, height: shape.geometry.size };
  if (shape.type === 'circle') return { width: shape.geometry.radius * 2, height: shape.geometry.radius * 2 };
  return { width: shape.geometry.width, height: shape.geometry.height };
}

export function moveShape2D(shape, delta) {
  const g = shape.geometry;
  let geometry;
  if (shape.type === 'line') {
    geometry = { x1: g.x1 + delta.x, y1: g.y1 + delta.y, x2: g.x2 + delta.x, y2: g.y2 + delta.y };
  } else if (shape.type === 'polygon') {
    geometry = { ...g, points: g.points.map((point) => ({ x: point.x + delta.x, y: point.y + delta.y })) };
  } else {
    geometry = { ...g, x: g.x + delta.x, y: g.y + delta.y };
  }
  return createShape({ ...shape, geometry });
}

export function rotateShape2D(shape, rotation) {
  if (!ROTATABLE_TYPES.has(shape.type)) return shape;
  return createShape({ ...shape, geometry: { ...shape.geometry, rotation } });
}

export function getShapeHandles2D(shape, rotationOffset = 0.35) {
  if (!shape || shape.semanticType === 'cimbra') return [];
  const g = shape.geometry;
  if (shape.type === 'line') {
    return [
      { id: 'start', kind: 'resize', x: g.x1, y: g.y1 },
      { id: 'end', kind: 'resize', x: g.x2, y: g.y2 },
    ];
  }
  if (shape.type === 'polygon') {
    const center = getShapeCenter2D(shape);
    const rotation = g.rotation || 0;
    const vertices = g.points.map((point, index) => ({
      id: `vertex:${index}`,
      kind: 'resize',
      ...rotatePoint2D(point, center, rotation),
    }));
    const top = Math.min(...vertices.map((point) => point.y));
    return [...vertices, { id: 'rotate', kind: 'rotate', x: center.x, y: top - rotationOffset }];
  }
  if (shape.type === 'circle') {
    return [{ id: 'radius', kind: 'resize', x: g.x + g.radius, y: g.y }];
  }
  const { width, height } = centeredSize(shape);
  const center = getShapeCenter2D(shape);
  const rotation = g.rotation || 0;
  const corners = [
    ['nw', -1, -1], ['ne', 1, -1], ['se', 1, 1], ['sw', -1, 1],
  ].map(([id, sx, sy]) => ({
    id,
    kind: 'resize',
    ...rotatePoint2D({ x: center.x + sx * width / 2, y: center.y + sy * height / 2 }, center, rotation),
  }));
  const rotate = rotatePoint2D(
    { x: center.x, y: center.y - height / 2 - rotationOffset },
    center,
    rotation
  );
  return [...corners, { id: 'rotate', kind: 'rotate', ...rotate }];
}

export function getShapeBounds2D(shape) {
  const points = getShapeHandles2D(shape).filter((handle) => handle.kind === 'resize');
  return {
    points,
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
    rotation: shape.geometry.rotation || 0,
  };
}

export function resizeShape2D(shape, handleId, worldPoint, minimumSize = 0.01) {
  const g = shape.geometry;
  if (shape.type === 'line') {
    return createShape({
      ...shape,
      geometry: handleId === 'start'
        ? { ...g, x1: worldPoint.x, y1: worldPoint.y }
        : { ...g, x2: worldPoint.x, y2: worldPoint.y },
    });
  }
  if (shape.type === 'polygon') {
    const index = Number(handleId.split(':')[1]);
    if (!Number.isInteger(index) || !g.points[index]) return shape;
    const center = getShapeCenter2D(shape);
    const localPoint = rotatePoint2D(worldPoint, center, -(g.rotation || 0));
    return createShape({
      ...shape,
      geometry: { ...g, points: g.points.map((point, pointIndex) => pointIndex === index ? localPoint : point) },
    });
  }
  if (shape.type === 'circle') {
    const radius = Math.max(minimumSize, Math.hypot(worldPoint.x - g.x, worldPoint.y - g.y));
    return createShape({ ...shape, geometry: { ...g, radius } });
  }
  const signs = { nw: [-1, -1], ne: [1, -1], se: [1, 1], sw: [-1, 1] }[handleId];
  if (!signs) return shape;
  const { width, height } = centeredSize(shape);
  const center = getShapeCenter2D(shape);
  const localPointer = rotatePoint2D(worldPoint, center, -(g.rotation || 0));
  const opposite = { x: center.x - signs[0] * width / 2, y: center.y - signs[1] * height / 2 };
  let nextWidth = Math.max(minimumSize, Math.abs(localPointer.x - opposite.x));
  let nextHeight = Math.max(minimumSize, Math.abs(localPointer.y - opposite.y));
  if (shape.type === 'square') nextWidth = nextHeight = Math.max(nextWidth, nextHeight);
  const localCenter = {
    x: opposite.x + signs[0] * nextWidth / 2,
    y: opposite.y + signs[1] * nextHeight / 2,
  };
  const nextCenter = rotatePoint2D(localCenter, center, g.rotation || 0);
  const geometry = shape.type === 'square'
    ? { ...g, ...nextCenter, size: nextWidth }
    : { ...g, ...nextCenter, width: nextWidth, height: nextHeight };
  return createShape({ ...shape, geometry });
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
    : 0;
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function hitTestInteractiveShape2D(shape, point, tolerance = 0.08) {
  if (!shape || shape.visible === false || shape.semanticType === 'cimbra') return false;
  const g = shape.geometry;
  if (shape.type === 'line') {
    return distanceToSegment(point, { x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 }) <= tolerance;
  }
  if (shape.type === 'circle') return Math.hypot(point.x - g.x, point.y - g.y) <= g.radius + tolerance;
  if (shape.type === 'polygon') {
    const center = getShapeCenter2D(shape);
    const local = rotatePoint2D(point, center, -(g.rotation || 0));
    const nearEdge = g.points.some((vertex, index) =>
      distanceToSegment(local, vertex, g.points[(index + 1) % g.points.length]) <= tolerance
    );
    const inside = g.points.reduce((result, vertex, index, points) => {
      const previous = points[(index + points.length - 1) % points.length];
      return (vertex.y > local.y) !== (previous.y > local.y) &&
        local.x < ((previous.x - vertex.x) * (local.y - vertex.y)) / (previous.y - vertex.y) + vertex.x
        ? !result : result;
    }, false);
    return nearEdge || inside;
  }
  const { width, height } = centeredSize(shape);
  const local = rotatePoint2D(point, { x: g.x, y: g.y }, -(g.rotation || 0));
  const localPoint = { x: local.x - g.x, y: local.y - g.y };
  if (shape.type !== 'triangle') {
    return Math.abs(localPoint.x) <= width / 2 + tolerance &&
      Math.abs(localPoint.y) <= height / 2 + tolerance;
  }
  const vertices = [{ x: 0, y: -height / 2 }, { x: width / 2, y: height / 2 }, { x: -width / 2, y: height / 2 }];
  const sign = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(localPoint, vertices[0], vertices[1]);
  const d2 = sign(localPoint, vertices[1], vertices[2]);
  const d3 = sign(localPoint, vertices[2], vertices[0]);
  return !((d1 < -tolerance || d2 < -tolerance || d3 < -tolerance) &&
    (d1 > tolerance || d2 > tolerance || d3 > tolerance));
}

export function pickShapeHandle2D(shape, point, tolerance, rotationOffset = 0.35) {
  return getShapeHandles2D(shape, rotationOffset).find((handle) =>
    Math.hypot(point.x - handle.x, point.y - handle.y) <= tolerance
  ) || null;
}

export function selectInteractiveShapeAtPoint(shapes, point, tolerance) {
  return [...shapes].reverse().find((shape) => hitTestInteractiveShape2D(shape, point, tolerance)) || null;
}

export function worldToCanvas2D(point, view) {
  const sign = view.invertY === false ? 1 : -1;
  const dx = point.x - view.centerX;
  const dy = point.y - view.centerY;
  const cos = Math.cos(view.rotation || 0);
  const sin = Math.sin(view.rotation || 0);
  return {
    x: (dx * cos - dy * sin) * view.scale + view.width / 2,
    y: sign * (dx * sin + dy * cos) * view.scale + view.height / 2,
  };
}

export function canvasToWorld2D(point, view) {
  const sign = view.invertY === false ? 1 : -1;
  const dx = (point.x - view.width / 2) / view.scale;
  const dy = sign * (point.y - view.height / 2) / view.scale;
  const cos = Math.cos(-(view.rotation || 0));
  const sin = Math.sin(-(view.rotation || 0));
  return {
    x: view.centerX + dx * cos - dy * sin,
    y: view.centerY + dx * sin + dy * cos,
  };
}
