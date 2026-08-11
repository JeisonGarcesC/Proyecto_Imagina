function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getPlanMetrics(plan) {
  const widthPx = Math.max(0, finiteNumber(plan?.raster?.widthPx));
  const heightPx = Math.max(0, finiteNumber(plan?.raster?.heightPx));
  const metersPerDocumentUnit = Math.max(
    Number.EPSILON,
    finiteNumber(plan?.calibration?.metersPerDocumentUnit, 0.01)
  );
  const scale = Math.max(Number.EPSILON, finiteNumber(plan?.transform?.scale, 1));
  const unitScale = metersPerDocumentUnit * scale;

  return {
    widthPx,
    heightPx,
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
  const localX = finiteNumber(point?.x) * metrics.unitScale;
  const localZ = finiteNumber(point?.y) * metrics.unitScale;
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
    x: localX / metrics.unitScale,
    y: localZ / metrics.unitScale,
  };
}

export function getPlanWorldCorners(plan) {
  const { widthPx, heightPx } = getPlanMetrics(plan);
  return [
    documentPointToWorld({ x: 0, y: 0 }, plan),
    documentPointToWorld({ x: widthPx, y: 0 }, plan),
    documentPointToWorld({ x: widthPx, y: heightPx }, plan),
    documentPointToWorld({ x: 0, y: heightPx }, plan),
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
