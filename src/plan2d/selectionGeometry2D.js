export const SELECTION_WINDOW_TYPES = Object.freeze({
  WINDOW: 'WINDOW',
  CROSSING: 'CROSSING',
});

const EPSILON = 1e-9;

function finitePoint(point) {
  const x = Number(point?.x);
  const z = Number(point?.z);
  return Number.isFinite(x) && Number.isFinite(z) ? { x, z } : null;
}

function buildWindowBounds(selectionWindow) {
  const start = finitePoint(selectionWindow?.startWorld || selectionWindow?.start);
  const end = finitePoint(selectionWindow?.currentWorld || selectionWindow?.end);
  if (!start || !end) return null;
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minZ: Math.min(start.z, end.z),
    maxZ: Math.max(start.z, end.z),
  };
}

function pointInsideBounds(point, bounds) {
  return (
    point.x >= bounds.minX - EPSILON &&
    point.x <= bounds.maxX + EPSILON &&
    point.z >= bounds.minZ - EPSILON &&
    point.z <= bounds.maxZ + EPSILON
  );
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function pointOnSegment(point, start, end) {
  return (
    Math.abs(orientation(start, end, point)) <= EPSILON &&
    point.x >= Math.min(start.x, end.x) - EPSILON &&
    point.x <= Math.max(start.x, end.x) + EPSILON &&
    point.z >= Math.min(start.z, end.z) - EPSILON &&
    point.z <= Math.max(start.z, end.z) + EPSILON
  );
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);

  if (
    ((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
    ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))
  ) {
    return true;
  }

  return (
    (Math.abs(abC) <= EPSILON && pointOnSegment(c, a, b)) ||
    (Math.abs(abD) <= EPSILON && pointOnSegment(d, a, b)) ||
    (Math.abs(cdA) <= EPSILON && pointOnSegment(a, c, d)) ||
    (Math.abs(cdB) <= EPSILON && pointOnSegment(b, c, d))
  );
}

function pointInsidePolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    if (pointOnSegment(point, a, b)) return true;
    const crosses =
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function getWindowPolygon(bounds) {
  return [
    { x: bounds.minX, z: bounds.minZ },
    { x: bounds.maxX, z: bounds.minZ },
    { x: bounds.maxX, z: bounds.maxZ },
    { x: bounds.minX, z: bounds.maxZ },
  ];
}

export function classifySelectionWindow(startScreen, currentScreen) {
  const startX = Number(startScreen?.x);
  const currentX = Number(currentScreen?.x);
  if (!Number.isFinite(startX) || !Number.isFinite(currentX)) {
    return SELECTION_WINDOW_TYPES.WINDOW;
  }
  return currentX >= startX
    ? SELECTION_WINDOW_TYPES.WINDOW
    : SELECTION_WINDOW_TYPES.CROSSING;
}

export function buildSelectionPolygon(part) {
  const centerX = Number(part?.x);
  const centerZ = Number(part?.z);
  const width = Math.abs(Number(part?.w));
  const depth = Math.abs(Number(part?.d));
  const rotation = Number(part?.rotY) || 0;
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerZ) ||
    !Number.isFinite(width) ||
    !Number.isFinite(depth)
  ) {
    return [];
  }

  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ].map((point) => ({
    x: centerX + point.x * cosine - point.z * sine,
    z: centerZ + point.x * sine + point.z * cosine,
  }));
}

export function isWindowSelection(polygon, selectionWindow) {
  const bounds = buildWindowBounds(selectionWindow);
  return Boolean(bounds && polygon?.length && polygon.every((point) => pointInsideBounds(point, bounds)));
}

export function intersectsCrossingSelection(polygon, selectionWindow) {
  const bounds = buildWindowBounds(selectionWindow);
  if (!bounds || !polygon?.length) return false;
  if (polygon.some((point) => pointInsideBounds(point, bounds))) return true;

  const windowPolygon = getWindowPolygon(bounds);
  if (windowPolygon.some((point) => pointInsidePolygon(point, polygon))) return true;

  return polygon.some((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    return windowPolygon.some((windowStart, windowIndex) =>
      segmentsIntersect(
        start,
        end,
        windowStart,
        windowPolygon[(windowIndex + 1) % windowPolygon.length]
      )
    );
  });
}

export function collectSelectionCandidates(snapshot, selectionWindow) {
  const direction =
    selectionWindow?.direction ||
    classifySelectionWindow(selectionWindow?.startScreen, selectionWindow?.currentScreen);
  const candidates = [];

  (Array.isArray(snapshot) ? snapshot : []).forEach((part) => {
    if (!part?.id) return;
    const polygon = buildSelectionPolygon(part);
    const selected =
      direction === SELECTION_WINDOW_TYPES.CROSSING
        ? intersectsCrossingSelection(polygon, selectionWindow)
        : isWindowSelection(polygon, selectionWindow);
    if (selected) candidates.push(part.id);
  });

  return Array.from(new Set(candidates));
}
