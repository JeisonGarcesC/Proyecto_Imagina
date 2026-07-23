import {
  pointToSegmentDistance,
  resolveDimensionScreenGeometry,
} from './dimensionGeometry2D.js';
import { formatDimensionValue } from './dimensionFormat.js';

export const DIMENSION_TYPES = Object.freeze({
  LINEAR_HORIZONTAL: 'LINEAR_HORIZONTAL',
  LINEAR_VERTICAL: 'LINEAR_VERTICAL',
  ALIGNED: 'ALIGNED',
});

const DIMENSION_TYPE_VALUES = new Set(Object.values(DIMENSION_TYPES));
let dimensionSequence = 0;

function normalizePoint(point, name) {
  const x = Number(point?.x);
  const z = Number(point?.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new TypeError(`${name} must contain finite x and z coordinates.`);
  }
  return Object.freeze({ x, z });
}
export function calculateDimensionValue(type, startPoint, endPoint) {
  if (type === DIMENSION_TYPES.LINEAR_HORIZONTAL) {
    return Math.abs(endPoint.x - startPoint.x);
  }
  if (type === DIMENSION_TYPES.LINEAR_VERTICAL) {
    return Math.abs(endPoint.z - startPoint.z);
  }
  return Math.hypot(endPoint.x - startPoint.x, endPoint.z - startPoint.z);
}

export function createDimension2D({
  id,
  type = DIMENSION_TYPES.ALIGNED,
  startPoint,
  endPoint,
  unit = 'm',
  label = null,
  offset = 18,
  references = null,
} = {}) {
  if (!DIMENSION_TYPE_VALUES.has(type)) {
    throw new RangeError(`Unsupported Dimension2D type: ${type}.`);
  }

  const start = normalizePoint(startPoint, 'startPoint');
  const end = normalizePoint(endPoint, 'endPoint');
  const value = calculateDimensionValue(type, start, end);
  if (value <= Number.EPSILON) return null;

  dimensionSequence += 1;
  return Object.freeze({
    id: id || `DIMENSION_${Date.now()}_${dimensionSequence}`,
    type,
    startPoint: start,
    endPoint: end,
    value,
    unit: String(unit || 'm'),
    label: label == null ? null : String(label),
    offset: Number.isFinite(Number(offset)) ? Number(offset) : 18,
    references: references ? Object.freeze({ ...references }) : null,
  });
}

export function updateDimension2D(dimensions, id, changes = {}) {
  if (!Array.isArray(dimensions) || !id || !changes || typeof changes !== 'object') {
    return dimensions;
  }

  const editableFields = [
    'type',
    'startPoint',
    'endPoint',
    'unit',
    'label',
    'offset',
    'references',
  ];

  return dimensions.map((dimension) => {
    if (dimension?.id !== id) return dimension;

    const nextValues = {};
    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(changes, field)) {
        nextValues[field] = changes[field];
      }
    });

    return (
      createDimension2D({
        ...dimension,
        ...nextValues,
        id: dimension.id,
      }) || dimension
    );
  });
}

export function dimensionHitDistance({
  mouseWorldPoint,
  screenPoint,
  dimension,
  tolerance = 8,
  view = {},
} = {}) {
  if (!dimension || typeof view.toCanvas !== 'function') return Infinity;
  const mouse = screenPoint ||
    (mouseWorldPoint
      ? (() => {
          const [x, y] = view.toCanvas(mouseWorldPoint.x, mouseWorldPoint.z);
          return { x, y };
        })()
      : null);
  if (!mouse || !Number.isFinite(mouse.x) || !Number.isFinite(mouse.y)) return Infinity;

  const geometry = resolveDimensionScreenGeometry(dimension, view.toCanvas);
  const distances = [
    pointToSegmentDistance(mouse, geometry.dimStart, geometry.dimEnd),
    pointToSegmentDistance(mouse, geometry.start, geometry.dimStart),
    pointToSegmentDistance(mouse, geometry.end, geometry.dimEnd),
    Math.hypot(mouse.x - geometry.dimStart[0], mouse.y - geometry.dimStart[1]),
    Math.hypot(mouse.x - geometry.dimEnd[0], mouse.y - geometry.dimEnd[1]),
  ];

  const label = dimension.label || formatDimensionValue(dimension.value, dimension.unit);
  const textCenterX = (geometry.dimStart[0] + geometry.dimEnd[0]) / 2;
  const textCenterY = (geometry.dimStart[1] + geometry.dimEnd[1]) / 2;
  const halfTextWidth = Math.max(15, label.length * 3.6 + 5);
  const textDistanceX = Math.max(0, Math.abs(mouse.x - textCenterX) - halfTextWidth);
  const textDistanceY = Math.max(0, Math.abs(mouse.y - textCenterY) - 10);
  distances.push(Math.hypot(textDistanceX, textDistanceY));

  const distance = Math.min(...distances);
  return distance <= Math.max(0, Number(tolerance) || 0) ? distance : Infinity;
}

export function dimensionHitTest(options = {}) {
  return Number.isFinite(dimensionHitDistance(options));
}
