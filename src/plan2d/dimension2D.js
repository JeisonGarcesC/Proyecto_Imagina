import {
  pointToSegmentDistance,
  resolveDimensionScreenGeometry,
  resolveDimensionTextPosition,
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

function normalizeTextOffset(textOffset) {
  const alongPx = Number(textOffset?.alongPx);
  const normalPx = Number(textOffset?.normalPx);
  return Object.freeze({
    alongPx: Number.isFinite(alongPx) ? alongPx : 0,
    normalPx: Number.isFinite(normalPx) ? normalPx : 0,
  });
}

function normalizeFeature(feature) {
  return feature && typeof feature === 'object' ? Object.freeze({ ...feature }) : null;
}

function normalizeReference(reference) {
  if (!reference || typeof reference !== 'object') return null;
  return Object.freeze({
    ...reference,
    ...(reference.feature ? { feature: normalizeFeature(reference.feature) } : {}),
  });
}

function normalizeReferences(references) {
  if (!references || typeof references !== 'object') return null;
  return Object.freeze({
    ...references,
    start: normalizeReference(references.start),
    end: normalizeReference(references.end),
  });
}

function normalizeStyle(style) {
  const color = String(style?.color || '#000000').trim() || '#000000';
  const lineWidth = Number(style?.lineWidth);
  return Object.freeze({
    color,
    lineWidth: Number.isFinite(lineWidth) && lineWidth > 0 ? lineWidth : 1,
  });
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
  textOffset = null,
  style = null,
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
    textOffset: normalizeTextOffset(textOffset),
    style: normalizeStyle(style),
    references: normalizeReferences(references),
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
    'textOffset',
    'style',
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

  distances.push(dimensionTextHitDistance({ screenPoint: mouse, dimension, view }));

  const distance = Math.min(...distances);
  return distance <= Math.max(0, Number(tolerance) || 0) ? distance : Infinity;
}

export function dimensionTextHitDistance({ screenPoint, dimension, view = {} } = {}) {
  if (!dimension || !screenPoint || typeof view.toCanvas !== 'function') return Infinity;
  const textPosition = resolveDimensionTextPosition(dimension, view.toCanvas);
  const label = dimension.label || formatDimensionValue(dimension.value, dimension.unit);
  const halfTextWidth = Math.max(15, label.length * 3.6 + 5);
  const distanceX = Math.max(0, Math.abs(screenPoint.x - textPosition.x) - halfTextWidth);
  const distanceY = Math.max(0, Math.abs(screenPoint.y - textPosition.y) - 10);
  return Math.hypot(distanceX, distanceY);
}

export function dimensionHitTest(options = {}) {
  return Number.isFinite(dimensionHitDistance(options));
}
