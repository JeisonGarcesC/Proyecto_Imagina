import { normalizeShapeStyle } from './shapeStyles.js';

export const SHAPE_2D_TYPES = Object.freeze({
  RECTANGLE: 'rectangle',
  SQUARE: 'square',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  LINE: 'line',
  POLYGON: 'polygon',
});

const VALID_TYPES = new Set(Object.values(SHAPE_2D_TYPES));

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} debe ser un número finito.`);
  return number;
}

function positive(value, label) {
  const number = finite(value, label);
  if (number <= 0) throw new RangeError(`${label} debe ser mayor que cero.`);
  return number;
}

function centerGeometry(geometry) {
  return {
    x: finite(geometry?.x, 'geometry.x'),
    y: finite(geometry?.y, 'geometry.y'),
  };
}

function normalizeGeometry(type, geometry = {}) {
  if (type === SHAPE_2D_TYPES.RECTANGLE || type === SHAPE_2D_TYPES.TRIANGLE) {
    return {
      ...centerGeometry(geometry),
      width: positive(geometry.width, 'geometry.width'),
      height: positive(geometry.height, 'geometry.height'),
      rotation: finite(geometry.rotation ?? 0, 'geometry.rotation'),
    };
  }
  if (type === SHAPE_2D_TYPES.SQUARE) {
    return {
      ...centerGeometry(geometry),
      size: positive(geometry.size, 'geometry.size'),
      rotation: finite(geometry.rotation ?? 0, 'geometry.rotation'),
    };
  }
  if (type === SHAPE_2D_TYPES.CIRCLE) {
    return { ...centerGeometry(geometry), radius: positive(geometry.radius, 'geometry.radius') };
  }
  if (type === SHAPE_2D_TYPES.LINE) {
    return {
      x1: finite(geometry.x1, 'geometry.x1'),
      y1: finite(geometry.y1, 'geometry.y1'),
      x2: finite(geometry.x2, 'geometry.x2'),
      y2: finite(geometry.y2, 'geometry.y2'),
    };
  }
  if (type === SHAPE_2D_TYPES.POLYGON) {
    if (!Array.isArray(geometry.points) || geometry.points.length < 3) {
      throw new RangeError('geometry.points requiere al menos tres puntos.');
    }
    return {
      points: geometry.points.map((point, index) => ({
        x: finite(point?.x, `geometry.points[${index}].x`),
        y: finite(point?.y, `geometry.points[${index}].y`),
      })),
      rotation: finite(geometry.rotation ?? 0, 'geometry.rotation'),
    };
  }
  throw new TypeError(`Tipo de figura 2D no soportado: ${type}`);
}

export function createShape({ id = null, type, geometry, style, visible = true, semanticType } = {}) {
  if (!VALID_TYPES.has(type)) throw new TypeError(`Tipo de figura 2D no soportado: ${type}`);
  return {
    id,
    type,
    geometry: normalizeGeometry(type, geometry),
    style: normalizeShapeStyle(style),
    visible: visible !== false,
    ...(semanticType ? { semanticType } : {}),
  };
}
