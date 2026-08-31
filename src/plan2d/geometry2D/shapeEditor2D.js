import { createShape } from './shapes2D.js';

export const SHAPE_TOOL_DEFINITIONS = Object.freeze({
  wall: { type: 'rectangle', semanticType: 'wall', geometry: { width: 2, height: 0.1 } },
  door: { type: 'rectangle', semanticType: 'door', geometry: { width: 0.9, height: 0.08 } },
  window: { type: 'rectangle', semanticType: 'window', geometry: { width: 1.2, height: 0.08 } },
  rectangle: { type: 'rectangle', semanticType: 'shape', geometry: { width: 1, height: 0.6 } },
  square: { type: 'square', semanticType: 'shape', geometry: { size: 0.75 } },
  circle: { type: 'circle', semanticType: 'shape', geometry: { radius: 0.4 } },
  triangle: { type: 'triangle', semanticType: 'shape', geometry: { width: 0.8, height: 0.7 } },
  line: { type: 'line', semanticType: 'shape', geometry: { length: 1 } },
  polygon: { type: 'polygon', semanticType: 'shape', geometry: { radius: 0.5 } },
});

const DEFAULT_STYLE = Object.freeze({
  stroke: '#2563eb', strokeWidth: 2, fill: false, fillColor: '#93c5fd', fillOpacity: 0.35,
});

function nextId() {
  return `SHAPE_2D_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function createShapeFromTool(tool, point, { id = nextId() } = {}) {
  const definition = SHAPE_TOOL_DEFINITIONS[tool];
  if (!definition) throw new TypeError(`Herramienta 2D no soportada: ${tool}`);
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Punto 2D inválido.');

  let geometry;
  if (definition.type === 'line') {
    geometry = { x1: x - 0.5, y1: y, x2: x + 0.5, y2: y };
  } else if (definition.type === 'polygon') {
    geometry = {
      points: Array.from({ length: 6 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 6;
        return { x: x + Math.cos(angle) * 0.5, y: y + Math.sin(angle) * 0.5 };
      }),
    };
  } else {
    geometry = { x, y, ...definition.geometry, rotation: 0 };
  }
  return createShape({ id, type: definition.type, semanticType: definition.semanticType, geometry, style: DEFAULT_STYLE });
}

export function updateShape2D(shapes, id, patch = {}) {
  return shapes.map((shape) => {
    if (shape.id !== id) return shape;
    return createShape({
      ...shape,
      ...patch,
      geometry: { ...shape.geometry, ...(patch.geometry || {}) },
      style: { ...shape.style, ...(patch.style || {}) },
    });
  });
}

export function deleteShape2D(shapes, id) {
  return shapes.filter((shape) => shape.id !== id);
}

export function translateShape2D(shapes, id, delta = {}) {
  const dx = Number(delta.x);
  const dy = Number(delta.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return shapes;
  return shapes.map((shape) => {
    if (shape.id !== id) return shape;
    let geometry;
    if (shape.type === 'line') {
      geometry = { x1: shape.geometry.x1 + dx, y1: shape.geometry.y1 + dy, x2: shape.geometry.x2 + dx, y2: shape.geometry.y2 + dy };
    } else if (shape.type === 'polygon') {
      geometry = { points: shape.geometry.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
    } else {
      geometry = { ...shape.geometry, x: shape.geometry.x + dx, y: shape.geometry.y + dy };
    }
    return createShape({ ...shape, geometry });
  });
}

export function hitTestShape2D(shape, point, tolerance = 0.08) {
  if (!shape || shape.visible === false) return false;
  const g = shape.geometry;
  if (shape.type === 'circle') return Math.hypot(point.x - g.x, point.y - g.y) <= g.radius + tolerance;
  if (shape.type === 'line') {
    const dx = g.x2 - g.x1; const dy = g.y2 - g.y1;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? Math.max(0, Math.min(1, ((point.x - g.x1) * dx + (point.y - g.y1) * dy) / lengthSq)) : 0;
    return Math.hypot(point.x - (g.x1 + t * dx), point.y - (g.y1 + t * dy)) <= tolerance;
  }
  if (shape.type === 'polygon') {
    return g.points.some((vertex) => Math.hypot(point.x - vertex.x, point.y - vertex.y) <= tolerance) ||
      g.points.reduce((inside, vertex, index, points) => {
        const previous = points[(index + points.length - 1) % points.length];
        return ((vertex.y > point.y) !== (previous.y > point.y) && point.x < ((previous.x - vertex.x) * (point.y - vertex.y)) / (previous.y - vertex.y) + vertex.x) ? !inside : inside;
      }, false);
  }
  const width = shape.type === 'square' ? g.size : g.width;
  const height = shape.type === 'square' ? g.size : g.height;
  const cos = Math.cos(-g.rotation); const sin = Math.sin(-g.rotation);
  const dx = point.x - g.x; const dy = point.y - g.y;
  return Math.abs(dx * cos - dy * sin) <= width / 2 + tolerance && Math.abs(dx * sin + dy * cos) <= height / 2 + tolerance;
}

export function selectShapeAtPoint(shapes, point) {
  return [...shapes].reverse().find((shape) => hitTestShape2D(shape, point)) || null;
}
