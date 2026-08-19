import { resolveDxfBulge } from '../utils/dxfBulge.js';
import { resolveDxfUnits, createDxfCalibration } from '../utils/dxfUnits.js';
import { calculateVectorBounds } from '../utils/vectorBounds.js';

export const DXF_NORMALIZATION_LIMITS = Object.freeze({
  MAX_ENTITIES: 100_000,
  MAX_VERTICES: 500_000,
  MAX_TEXT_LENGTH: 8_192,
  MAX_INSERT_DEPTH: 16,
});

const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);

export function normalizeDxf(parsed, options = {}) {
  const limits = { ...DXF_NORMALIZATION_LIMITS, ...(options.limits || {}) };
  const diagnostics = {
    sourceEntityCount: countSourceEntities(parsed),
    normalizedEntityCount: 0,
    ignoredByType: {},
    ignoredDimensionTypes: {},
    warnings: [],
  };
  const statistics = {
    lines: 0,
    polylines: 0,
    arcs: 0,
    circles: 0,
    texts: 0,
    dimensions: 0,
    inserts: 0,
    blocks: Object.keys(parsed?.blocks || {}).length,
  };
  const state = {
    parsed,
    limits,
    diagnostics,
    statistics,
    entities: [],
    vertexCount: 0,
    generatedId: 0,
  };
  if (diagnostics.sourceEntityCount > limits.MAX_ENTITIES) {
    throw new Error(`El DXF supera el límite de ${limits.MAX_ENTITIES} entidades fuente.`);
  }

  const units = resolveDxfUnits(parsed?.header?.$INSUNITS);
  if (!units.detected) diagnostics.warnings.push('INSUNITS no definido o no soportado.');

  normalizeEntityList(parsed?.entities || [], IDENTITY, state, {
    path: 'model',
    depth: 0,
    blockStack: [],
  });

  diagnostics.normalizedEntityCount = state.entities.length;
  appendIgnoredWarnings(diagnostics);

  const bounds = calculateVectorBounds(state.entities);
  if (!bounds) diagnostics.warnings.push('El DXF no contiene geometría compatible con bounds.');

  return {
    sourceType: 'DXF',
    renderType: 'VECTOR',
    vector: {
      schemaVersion: 1,
      bounds,
      units,
      layers: normalizeLayers(parsed),
      entities: state.entities,
      diagnostics,
      statistics,
    },
    calibration: createDxfCalibration(units),
    diagnostics,
  };
}

function normalizeEntityList(sourceEntities, matrix, state, context) {
  for (let index = 0; index < sourceEntities.length; index += 1) {
    normalizeEntity(sourceEntities[index], matrix, state, {
      ...context,
      path: `${context.path}/${index}`,
    });
  }
}

function normalizeEntity(source, matrix, state, context) {
  if (!source?.type) return;
  if (source.type === 'INSERT') {
    expandInsert(source, matrix, state, context);
    return;
  }

  const normalized = createNormalizedEntity(source, matrix, state, context);
  if (!normalized) {
    increment(state.diagnostics.ignoredByType, source.type || 'UNKNOWN');
    return;
  }

  assertEntityCapacity(state);
  state.entities.push(normalized);
  incrementStatistic(state.statistics, normalized.type);
}

function createNormalizedEntity(source, matrix, state, context) {
  const common = createCommonEntity(source, state, context);

  if (source.type === 'LINE') {
    if (!source.vertices?.[0] || !source.vertices?.[1]) return null;
    return {
      ...common,
      type: 'LINE',
      geometry: {
        start: transformPoint(source.vertices[0], matrix),
        end: transformPoint(source.vertices[1], matrix),
      },
    };
  }

  if (source.type === 'LWPOLYLINE' || source.type === 'POLYLINE') {
    return normalizePolyline(source, matrix, state, common);
  }

  if (source.type === 'ARC') {
    if (!source.center || !isPositiveNumber(source.radius)) return null;
    return {
      ...common,
      type: 'ARC',
      geometry: transformArc(
        {
          center: source.center,
          radius: source.radius,
          startAngle: source.startAngle,
          endAngle: source.endAngle,
          sweepAngle: positiveSweep(source.startAngle, source.endAngle),
          clockwise: false,
        },
        matrix,
        state
      ),
    };
  }

  if (source.type === 'CIRCLE') {
    if (!source.center || !isPositiveNumber(source.radius)) return null;
    return {
      ...common,
      type: 'CIRCLE',
      geometry: transformCircle(source, matrix, state),
    };
  }

  if (source.type === 'TEXT' || source.type === 'MTEXT') {
    const usesTextAlignment =
      source.type === 'TEXT' &&
      ([source.halign, source.valign].some((value) => Number.isFinite(Number(value)) && Number(value) !== 0));
    const position =
      (usesTextAlignment ? source.endPoint : null) || source.startPoint || source.position;
    if (!position) return null;
    const originalText = normalizeTextValue(source.text, source.type);
    if (originalText.length > state.limits.MAX_TEXT_LENGTH) {
      state.diagnostics.warnings.push(
        `${source.type} ${source.handle || ''}: texto truncado a ${state.limits.MAX_TEXT_LENGTH} caracteres.`
      );
    }
    const scale = getMatrixScale(matrix);
    return {
      ...common,
      type: 'TEXT',
      geometry: {
        position: transformPoint(position, matrix),
        value: originalText.slice(0, state.limits.MAX_TEXT_LENGTH),
        height: Math.max(0, Number(source.textHeight ?? source.height) || 0) * scale.average,
        rotation: degreesToRadians(Number(source.rotation) || 0) + matrixRotation(matrix),
        horizontalAlignment: source.halign ?? null,
        verticalAlignment: source.valign ?? source.attachmentPoint ?? null,
        sourceType: source.type,
      },
    };
  }

  if (source.type === 'DIMENSION') {
    return normalizeDimension(source, matrix, state, common);
  }

  return null;
}

function normalizeDimension(source, matrix, state, common) {
  const baseType = (Number(source.dimensionType) || 0) & 0x0f;
  if (baseType !== 0 && baseType !== 1) {
    increment(state.diagnostics.ignoredDimensionTypes, dimensionTypeName(baseType));
    return null;
  }

  const point1 = source.linearOrAngularPoint1;
  const point2 = source.linearOrAngularPoint2;
  const anchor = source.anchorPoint;
  if (![point1, point2, anchor].every(isFinitePoint)) return null;

  const measuredValue = Math.hypot(point2.x - point1.x, point2.y - point1.y);
  if (!(measuredValue > 0)) return null;

  const angle = baseType === 1
    ? Math.atan2(point2.y - point1.y, point2.x - point1.x)
    : degreesToRadians(Number(source.angle) || 0);
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const dimensionStart = projectToDimensionLine(point1, anchor, normal);
  const dimensionEnd = projectToDimensionLine(point2, anchor, normal);
  const fallbackTextPosition = midpoint(dimensionStart, dimensionEnd);
  const textPosition = isFinitePoint(source.middleOfText) ? source.middleOfText : fallbackTextPosition;
  const blockTextHeight = resolveDimensionBlockTextHeight(state.parsed, source.block);
  const scale = getMatrixScale(matrix);
  const normalizedMeasurement = measuredValue * scale.average;
  const textOverride = resolveDimensionTextOverride(source.text);
  const displayText = textOverride ?? formatDimensionMeasurement(normalizedMeasurement);
  const transformedStart = transformPoint(dimensionStart, matrix);
  const transformedEnd = transformPoint(dimensionEnd, matrix);
  const direction = normalizeVector({
    x: transformedEnd.x - transformedStart.x,
    y: transformedEnd.y - transformedStart.y,
  });

  return {
    ...common,
    type: 'DIMENSION',
    geometry: {
      dimensionType: baseType === 1 ? 'ALIGNED' : classifyLinearDimension(angle),
      definitionPoint: transformPoint(anchor, matrix),
      extensionPoint1: transformPoint(point1, matrix),
      extensionPoint2: transformPoint(point2, matrix),
      dimensionLinePoint: transformPoint(anchor, matrix),
      textPosition: transformPoint(textPosition, matrix),
      measuredValue: normalizedMeasurement,
      styledMeasurement: Number.isFinite(Number(source.actualMeasurement))
        ? Number(source.actualMeasurement) * scale.average
        : null,
      textOverride,
      displayText,
      rotation: angle + matrixRotation(matrix),
      textHeight: blockTextHeight ? blockTextHeight * scale.average : null,
      extensionLines: [
        { start: transformPoint(point1, matrix), end: transformedStart },
        { start: transformPoint(point2, matrix), end: transformedEnd },
      ],
      dimensionLines: [{ start: transformedStart, end: transformedEnd }],
      arrows: [
        { point: transformedStart, direction },
        { point: transformedEnd, direction: { x: -direction.x, y: -direction.y } },
      ],
    },
    source: { ...common.source, block: source.block || common.source.block },
  };
}

function projectToDimensionLine(point, anchor, normal) {
  const distance = (anchor.x - point.x) * normal.x + (anchor.y - point.y) * normal.y;
  return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}

function midpoint(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function resolveDimensionTextOverride(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized !== '<>' ? value : null;
}

function formatDimensionMeasurement(value) {
  return Number(value).toFixed(6).replace(/\.?0+$/, '');
}

function resolveDimensionBlockTextHeight(parsed, blockName) {
  const entities = parsed?.blocks?.[blockName]?.entities || [];
  const text = entities.find((entity) => entity?.type === 'TEXT' || entity?.type === 'MTEXT');
  const height = Number(text?.textHeight ?? text?.height);
  return Number.isFinite(height) && height > 0 ? height : null;
}

function classifyLinearDimension(angle) {
  const normalized = Math.abs(Math.sin(angle));
  return normalized < 1e-6 ? 'HORIZONTAL' : Math.abs(Math.cos(angle)) < 1e-6 ? 'VERTICAL' : 'LINEAR';
}

function dimensionTypeName(type) {
  return ({ 2: 'ANGULAR', 3: 'DIAMETER', 4: 'RADIUS', 5: 'ANGULAR_3_POINT', 6: 'ORDINATE' })[type] || `TYPE_${type}`;
}

function normalizePolyline(source, matrix, state, common) {
  const vertices = (source.vertices || []).filter(isFinitePoint);
  if (vertices.length < 2) return null;
  state.vertexCount += vertices.length;
  if (state.vertexCount > state.limits.MAX_VERTICES) {
    throw new Error(`El DXF supera el límite de ${state.limits.MAX_VERTICES} vértices.`);
  }

  const closed = source.shape === true;
  const segmentCount = closed ? vertices.length : vertices.length - 1;
  const segments = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const segment = resolveDxfBulge(start, end, start.bulge);
    segments.push(
      segment.kind === 'ARC'
        ? transformArc(segment, matrix, state)
        : {
            kind: 'LINE',
            start: transformPoint(segment.start, matrix),
            end: transformPoint(segment.end, matrix),
          }
    );
  }

  return {
    ...common,
    type: 'POLYLINE',
    geometry: {
      points: vertices.map((point) => ({
        ...transformPoint(point, matrix),
        bulge: Number(point.bulge) || 0,
      })),
      closed,
      segments,
      sourceType: source.type,
    },
  };
}

function expandInsert(insert, parentMatrix, state, context) {
  state.statistics.inserts += 1;
  const blockName = String(insert.name || '');
  const block = state.parsed?.blocks?.[blockName];
  if (!block?.entities) {
    state.diagnostics.warnings.push(`INSERT referencia bloque no encontrado: ${blockName || '(sin nombre)'}.`);
    increment(state.diagnostics.ignoredByType, 'INSERT');
    return;
  }
  if (context.depth >= state.limits.MAX_INSERT_DEPTH) {
    throw new Error(`El DXF supera la profundidad máxima de INSERT (${state.limits.MAX_INSERT_DEPTH}).`);
  }
  if (context.blockStack.includes(blockName)) {
    state.diagnostics.warnings.push(`Bloque ${blockName} contiene referencia circular.`);
    return;
  }

  const xScale = finiteOr(insert.xScale, 1);
  const yScale = finiteOr(insert.yScale, 1);
  if (Math.abs(Math.abs(xScale) - Math.abs(yScale)) > 1e-9) {
    state.diagnostics.warnings.push(`INSERT ${blockName} con escala no uniforme degradado.`);
  }
  const position = insert.position || { x: 0, y: 0 };
  if ((Number(insert.columnCount) || 1) > 1 || (Number(insert.rowCount) || 1) > 1) {
    state.diagnostics.warnings.push(`MINSERT ${blockName} degradado a una sola inserción.`);
  }
  const base = block.position || { x: 0, y: 0 };
  const localMatrix = multiplyMatrices(
    translationMatrix(Number(position.x) || 0, Number(position.y) || 0),
    multiplyMatrices(
      rotationMatrix(degreesToRadians(Number(insert.rotation) || 0)),
      multiplyMatrices(scaleMatrix(xScale, yScale), translationMatrix(-finiteOr(base.x), -finiteOr(base.y)))
    )
  );
  const matrix = multiplyMatrices(parentMatrix, localMatrix);
  normalizeEntityList(block.entities, matrix, state, {
    path: `${context.path}/insert:${blockName}`,
    depth: context.depth + 1,
    blockStack: [...context.blockStack, blockName],
  });
}

function createCommonEntity(source, state, context) {
  const handle = source.handle != null ? String(source.handle) : null;
  return {
    id: handle ? `${context.path}:${handle}` : `${context.path}:generated-${state.generatedId++}`,
    layer: String(source.layer || '0'),
    style: {
      color: numberToHex(source.color),
      aciColor: Number.isFinite(Number(source.colorIndex)) ? Number(source.colorIndex) : null,
      colorMode:
        Number(source.colorIndex) === 0
          ? 'BYBLOCK'
          : !source.colorIndex || Number(source.colorIndex) === 256
            ? 'BYLAYER'
            : 'EXPLICIT',
      lineType: source.lineType || null,
      lineWeight: source.lineweight ?? null,
      visible: source.visible !== false,
    },
    source: { handle, path: context.path, block: context.blockStack.at(-1) || null },
  };
}

function normalizeLayers(parsed) {
  const sourceLayers = parsed?.tables?.layer?.layers || {};
  const layers = Object.values(sourceLayers).map((layer, index) => ({
    id: `layer-${index}`,
    name: String(layer?.name || '0'),
    color: numberToHex(layer?.color),
    aciColor: Number.isFinite(Number(layer?.colorIndex)) ? Number(layer.colorIndex) : null,
    visible: layer?.visible !== false && layer?.frozen !== true,
    locked: false,
    lineType: layer?.lineType || null,
  }));
  return layers.length
    ? layers
    : [{ id: 'layer-0', name: '0', color: null, aciColor: 7, visible: true, locked: false, lineType: null }];
}

function transformArc(arc, matrix, state) {
  const scale = getMatrixScale(matrix);
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  const center = transformPoint(arc.center, matrix);
  const start = transformPoint(pointOnCircle(arc.center, arc.radius, arc.startAngle), matrix);
  const radius = Number(arc.radius) * scale.average;
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  let sweepAngle = Number(arc.sweepAngle);
  if (determinant < 0) sweepAngle *= -1;
  if (scale.nonUniform) {
    state.diagnostics.warnings.push('Arco bajo escala no uniforme aproximado con radio medio.');
  }
  return {
    kind: 'ARC',
    center,
    radius,
    startAngle,
    endAngle: startAngle + sweepAngle,
    sweepAngle,
    clockwise: sweepAngle < 0,
  };
}

function transformCircle(circle, matrix, state) {
  const scale = getMatrixScale(matrix);
  if (scale.nonUniform) {
    state.diagnostics.warnings.push('Círculo bajo escala no uniforme aproximado con radio medio.');
  }
  return {
    center: transformPoint(circle.center, matrix),
    radius: Number(circle.radius) * scale.average,
  };
}

function transformPoint(point, matrix) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('El DXF contiene coordenadas inválidas.');
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  };
}

function multiplyMatrices(left, right) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function translationMatrix(x, y) { return [1, 0, 0, 1, x, y]; }
function rotationMatrix(angle) { return [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]; }
function scaleMatrix(x, y) { return [x, 0, 0, y, 0, 0]; }

function getMatrixScale(matrix) {
  const x = Math.hypot(matrix[0], matrix[1]);
  const y = Math.hypot(matrix[2], matrix[3]);
  return { x, y, average: (x + y) / 2, nonUniform: Math.abs(x - y) > 1e-9 };
}

function matrixRotation(matrix) { return Math.atan2(matrix[1], matrix[0]); }
function pointOnCircle(center, radius, angle) { return { x: Number(center.x) + Number(radius) * Math.cos(angle), y: Number(center.y) + Number(radius) * Math.sin(angle) }; }
function positiveSweep(start, end) { const tau = Math.PI * 2; return ((Number(end) - Number(start)) % tau + tau) % tau || tau; }
function degreesToRadians(value) { return (Number(value) * Math.PI) / 180; }
function finiteOr(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function isPositiveNumber(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }
function isFinitePoint(point) { return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)); }
function increment(record, key) { record[key] = (record[key] || 0) + 1; }
function incrementStatistic(statistics, type) {
  const key = { LINE: 'lines', POLYLINE: 'polylines', ARC: 'arcs', CIRCLE: 'circles', TEXT: 'texts', DIMENSION: 'dimensions' }[type];
  if (key) statistics[key] += 1;
}
function assertEntityCapacity(state) {
  if (state.entities.length >= state.limits.MAX_ENTITIES) {
    throw new Error(`El DXF supera el límite de ${state.limits.MAX_ENTITIES} entidades normalizadas.`);
  }
}
function countSourceEntities(parsed) {
  return (parsed?.entities?.length || 0) + Object.values(parsed?.blocks || {}).reduce((sum, block) => sum + (block?.entities?.length || 0), 0);
}
function appendIgnoredWarnings(diagnostics) {
  for (const [type, count] of Object.entries(diagnostics.ignoredByType)) {
    diagnostics.warnings.push(`${type}: ${count} entidades omitidas.`);
  }
}
function normalizeTextValue(value, sourceType) {
  const text = String(value || '').replace(/\r\n?/g, '\n');
  if (sourceType !== 'MTEXT') return text;
  return text.replace(/\\P/gi, '\n');
}
function numberToHex(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `#${Math.max(0, number).toString(16).padStart(6, '0').slice(-6)}` : null;
}
