function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getPlanMetrics(plan) {
  const isVector = plan?.renderType === 'VECTOR';
  const bounds = isVector ? plan?.vector?.bounds : null;
  const minX = isVector ? finiteNumber(bounds?.minX) : 0;
  const minY = isVector ? finiteNumber(bounds?.minY) : 0;
  const widthPx = Math.max(0, isVector ? finiteNumber(bounds?.width, finiteNumber(bounds?.maxX) - minX) : finiteNumber(plan?.raster?.widthPx));
  const heightPx = Math.max(0, isVector ? finiteNumber(bounds?.height, finiteNumber(bounds?.maxY) - minY) : finiteNumber(plan?.raster?.heightPx));
  const rawUnitScale = Number(plan?.calibration?.metersPerDocumentUnit);
  const metersPerDocumentUnit = Number.isFinite(rawUnitScale) && rawUnitScale > 0
    ? rawUnitScale
    : Number.NaN;
  const scale = Math.max(Number.EPSILON, finiteNumber(plan?.transform?.scale, 1));
  const unitScale = metersPerDocumentUnit * scale;

  return {
    widthPx,
    heightPx,
    minX,
    minY,
    unitScale,
    widthWorld: widthPx * unitScale,
    heightWorld: heightPx * unitScale,
    positionX: finiteNumber(plan?.transform?.position?.x),
    positionZ: finiteNumber(plan?.transform?.position?.z),
    rotation: finiteNumber(plan?.transform?.rotation),
  };
}

export function documentPointToWorld(point, plan) {
  const metrics = getPlanMetrics(plan);
  const localX = (finiteNumber(point?.x) - metrics.minX) * metrics.unitScale;
  const localZ = (finiteNumber(point?.y) - metrics.minY) * metrics.unitScale;
  const centerX = metrics.widthWorld / 2;
  const centerZ = metrics.heightWorld / 2;
  const dx = localX - centerX;
  const dz = localZ - centerZ;
  const cos = Math.cos(metrics.rotation);
  const sin = Math.sin(metrics.rotation);

  return {
    x: metrics.positionX + centerX + dx * cos - dz * sin,
    z: metrics.positionZ + centerZ + dx * sin + dz * cos,
  };
}

export function worldPointToDocument(point, plan) {
  const metrics = getPlanMetrics(plan);
  const centerX = metrics.widthWorld / 2;
  const centerZ = metrics.heightWorld / 2;
  const dx = finiteNumber(point?.x) - metrics.positionX - centerX;
  const dz = finiteNumber(point?.z) - metrics.positionZ - centerZ;
  const cos = Math.cos(metrics.rotation);
  const sin = Math.sin(metrics.rotation);
  const localX = centerX + dx * cos + dz * sin;
  const localZ = centerZ - dx * sin + dz * cos;

  return {
    x: metrics.minX + localX / metrics.unitScale,
    y: metrics.minY + localZ / metrics.unitScale,
  };
}

export function getPlanWorldCorners(plan) {
  const { widthPx, heightPx, minX, minY } = getPlanMetrics(plan);
  return [
    documentPointToWorld({ x: minX, y: minY }, plan),
    documentPointToWorld({ x: minX + widthPx, y: minY }, plan),
    documentPointToWorld({ x: minX + widthPx, y: minY + heightPx }, plan),
    documentPointToWorld({ x: minX, y: minY + heightPx }, plan),
  ];
}

export function getPlanWorldBounds(plan) {
  const corners = getPlanWorldCorners(plan);
  const xs = corners.map((point) => point.x);
  const zs = corners.map((point) => point.z);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    corners,
  };
}
