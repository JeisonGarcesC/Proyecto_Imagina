function distanceToWallAxis(point, wall) {
  let closest = Infinity;
  for (let index = 1; index < (wall.points?.length || 0); index += 1) {
    const start = wall.points[index - 1];
    const end = wall.points[index];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const squaredLength = dx * dx + dz * dz;
    if (!squaredLength) continue;
    const t = Math.max(0, Math.min(1,
      ((point.x - start.x) * dx + (point.z - start.z) * dz) / squaredLength));
    closest = Math.min(closest, Math.hypot(
      point.x - start.x - t * dx,
      point.z - start.z - t * dz
    ));
  }
  return closest;
}

// El raycast usa el volumen visible; el punto sobre ese volumen recupera la entidad lógica.
// En un empate geométrico exacto se conserva el orden existente de walls.
export function resolveWallIdFrom3DHit(hit, walls = []) {
  const data = hit?.object?.userData;
  if (!data || !hit?.point || !['WALL', 'DOOR'].includes(data.kind)) return null;
  if (data.kind === 'DOOR') {
    return walls.some((wall) => wall.id === data.wallId) ? data.wallId : null;
  }
  const candidateIds = new Set(data.wallIds || (data.wallId ? [data.wallId] : []));
  let bestId = null;
  let bestDistance = Infinity;
  for (const wall of walls) {
    if (!candidateIds.has(wall.id) || wall.visible === false) continue;
    const distance = distanceToWallAxis(hit.point, wall);
    if (distance < bestDistance - 1e-8) {
      bestDistance = distance;
      bestId = wall.id;
    }
  }
  return bestId;
}
