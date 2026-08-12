const TAU = Math.PI * 2;

export function calculateVectorBounds(entities) {
  const bounds = createEmptyBounds();
  for (const entity of entities || []) includeEntity(bounds, entity);
  if (!Number.isFinite(bounds.minX)) return null;
  return {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

function includeEntity(bounds, entity) {
  const geometry = entity?.geometry;
  if (!geometry) return;
  if (entity.type === 'LINE') {
    includePoint(bounds, geometry.start);
    includePoint(bounds, geometry.end);
  } else if (entity.type === 'POLYLINE') {
    geometry.segments?.forEach((segment) => includeSegment(bounds, segment));
  } else if (entity.type === 'ARC') {
    includeArc(bounds, geometry);
  } else if (entity.type === 'CIRCLE') {
    includeCircle(bounds, geometry);
  } else if (entity.type === 'TEXT') {
    includeText(bounds, geometry);
  } else if (entity.type === 'DIMENSION') {
    includeDimension(bounds, geometry);
  }
}

function includeDimension(bounds, dimension) {
  dimension.extensionLines?.forEach((line) => {
    includePoint(bounds, line?.start);
    includePoint(bounds, line?.end);
  });
  dimension.dimensionLines?.forEach((line) => {
    includePoint(bounds, line?.start);
    includePoint(bounds, line?.end);
  });
  includePoint(bounds, dimension.textPosition);
  const height = Math.max(0, Number(dimension.textHeight) || 0);
  const width = height * 0.65 * String(dimension.displayText || '').length;
  includePoint(bounds, {
    x: Number(dimension.textPosition?.x) + width,
    y: Number(dimension.textPosition?.y) + height,
  });
}

function includeSegment(bounds, segment) {
  if (segment?.kind === 'ARC') includeArc(bounds, segment);
  else {
    includePoint(bounds, segment?.start);
    includePoint(bounds, segment?.end);
  }
}

function includeArc(bounds, arc) {
  const radius = Number(arc?.radius);
  if (!Number.isFinite(radius) || radius < 0) return;
  includePoint(bounds, pointOnArc(arc.center, radius, arc.startAngle));
  includePoint(bounds, pointOnArc(arc.center, radius, arc.endAngle));
  for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    if (angleIsOnSweep(angle, arc.startAngle, arc.sweepAngle)) {
      includePoint(bounds, pointOnArc(arc.center, radius, angle));
    }
  }
}

function includeCircle(bounds, circle) {
  const x = Number(circle?.center?.x);
  const y = Number(circle?.center?.y);
  const radius = Number(circle?.radius);
  if (![x, y, radius].every(Number.isFinite) || radius < 0) return;
  includePoint(bounds, { x: x - radius, y: y - radius });
  includePoint(bounds, { x: x + radius, y: y + radius });
}

function includeText(bounds, text) {
  const height = Math.max(0, Number(text?.height) || 0);
  const width = Math.max(height, height * 0.65 * String(text?.value || '').length);
  const position = text?.position;
  includePoint(bounds, position);
  includePoint(bounds, { x: Number(position?.x) + width, y: Number(position?.y) + height });
}

function angleIsOnSweep(angle, startAngle, sweepAngle) {
  const sweep = Number(sweepAngle);
  if (!Number.isFinite(sweep) || Math.abs(sweep) >= TAU - 1e-10) return true;
  if (sweep >= 0) return normalizeAngle(angle - startAngle) <= sweep + 1e-10;
  return normalizeAngle(startAngle - angle) <= -sweep + 1e-10;
}

function normalizeAngle(angle) {
  return ((Number(angle) % TAU) + TAU) % TAU;
}

function pointOnArc(center, radius, angle) {
  return {
    x: Number(center?.x) + radius * Math.cos(Number(angle)),
    y: Number(center?.y) + radius * Math.sin(Number(angle)),
  };
}

function createEmptyBounds() {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function includePoint(bounds, point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}
