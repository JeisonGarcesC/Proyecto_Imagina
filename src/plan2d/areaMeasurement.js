let sequence = 0;

export function polygonAreaSquareMeters(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    twiceArea += points[index].x * next.z - next.x * points[index].z;
  }
  return Math.abs(twiceArea) / 2;
}

export function createAreaMeasurement(points, id = `AREA_${Date.now()}_${++sequence}`) {
  if (!Array.isArray(points) || points.length < 3) return null;
  const normalized = points.map((point) => ({ x: Number(point.x), z: Number(point.z) }));
  if (normalized.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.z))) return null;
  const area = polygonAreaSquareMeters(normalized);
  if (area <= 0) return null;
  return { id, type: 'AREA', points: normalized, area, unit: 'm2' };
}

export function calculateCircleArea(radius) {
  return Math.PI * radius * radius;
}

export function calculateCircleCircumference(radius) {
  return 2 * Math.PI * radius;
}

export function createCircleMeasurement(center, radius, id = `CIRCLE_${Date.now()}_${++sequence}`) {
  const normalizedCenter = { x: Number(center?.x), z: Number(center?.z) };
  const normalizedRadius = Number(radius);
  if (!Number.isFinite(normalizedCenter.x) || !Number.isFinite(normalizedCenter.z) ||
    !Number.isFinite(normalizedRadius) || normalizedRadius <= 0) return null;
  return {
    id,
    type: 'CIRCLE',
    center: normalizedCenter,
    radius: normalizedRadius,
    area: calculateCircleArea(normalizedRadius),
    circumference: calculateCircleCircumference(normalizedRadius),
    unit: 'm2',
  };
}

export function restoreAreaMeasurement(source) {
  if (source?.type === 'CIRCLE') return createCircleMeasurement(source.center, source.radius, source.id);
  return createAreaMeasurement(source?.points, source?.id);
}

export function serializeAreaMeasurement(measurement) {
  if (measurement?.type === 'CIRCLE') {
    return { id: measurement.id, type: 'CIRCLE', center: measurement.center, radius: measurement.radius };
  }
  return measurement;
}

export function shouldSwitchAreaMethod(currentMethod, nextMethod, hasDraft, confirmDiscard) {
  if (!['POLYGON', 'CIRCLE'].includes(nextMethod) || nextMethod === currentMethod) return false;
  return !hasDraft || confirmDiscard();
}

export function formatArea(area) {
  const format = (value, digits) => new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return { squareMeters: `${format(area, 2)} m²`, squareMillimeters: `${format(area * 1_000_000, 0)} mm²` };
}

export function isNearFirstAreaPoint(points, screenPoint, toCanvas, tolerancePx = 10) {
  if (points.length < 3) return false;
  const [x, y] = toCanvas(points[0].x, points[0].z);
  return Math.hypot(screenPoint.x - x, screenPoint.y - y) <= tolerancePx;
}

export function containsAreaPoint(points, point) {
  if (!Array.isArray(points) || points.length < 3 || !point) return false;
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const a = points[index];
    const b = points[previous];
    if ((a.z > point.z) !== (b.z > point.z) &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function containsCirclePoint(circle, point) {
  if (!circle?.center || !point || !Number.isFinite(circle.radius)) return false;
  return Math.hypot(point.x - circle.center.x, point.z - circle.center.z) <= circle.radius;
}

export function areaLabelPoint(points) {
  const average = points.reduce((sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }), { x: 0, z: 0 });
  const center = { x: average.x / points.length, z: average.z / points.length };
  if (containsAreaPoint(points, center)) return center;
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  let best = null;
  let distance = Infinity;
  for (let row = 0; row < 20; row += 1) {
    for (let column = 0; column < 20; column += 1) {
      const candidate = {
        x: minX + ((column + 0.5) / 20) * (maxX - minX),
        z: minZ + ((row + 0.5) / 20) * (maxZ - minZ),
      };
      const nextDistance = Math.hypot(candidate.x - center.x, candidate.z - center.z);
      if (nextDistance < distance && containsAreaPoint(points, candidate)) {
        best = candidate;
        distance = nextDistance;
      }
    }
  }
  return best || center;
}
