function corners(module) {
  const width = Number(module.config?.widthCm || 0) / 100;
  const depth = Number(module.config?.thicknessCm || 0) / 100;
  const angle = Number(module.rotation?.y || 0);
  const origin = module.position || {};
  return [[0, -depth / 2], [width, -depth / 2], [width, depth / 2], [0, depth / 2]].map(([x, z]) => [Number(origin.x || 0) + x * Math.cos(angle) + z * Math.sin(angle), Number(origin.z || 0) - x * Math.sin(angle) + z * Math.cos(angle)]);
}

function projects(points, axis) {
  const values = points.map(([x, z]) => x * axis[0] + z * axis[1]);
  return [Math.min(...values), Math.max(...values)];
}

export function detectMultipleCollisions(modules = [], { realThresholdM = 0.001, nearThresholdM = 0.02 } = {}) {
  const collisions = [];
  for (let i = 0; i < modules.length; i += 1) for (let j = i + 1; j < modules.length; j += 1) {
    const a = modules[i]; const b = modules[j];
    const aMin = Number(a.position?.y || 0); const bMin = Number(b.position?.y || 0);
    const aMax = aMin + Number(a.config?.heightCm || 0) / 100;
    const bMax = bMin + Number(b.config?.heightCm || 0) / 100;
    const verticalOverlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
    if (verticalOverlap < -nearThresholdM) continue;
    const pa = corners(a); const pb = corners(b);
    const edges = [[pa[1][0] - pa[0][0], pa[1][1] - pa[0][1]], [pa[3][0] - pa[0][0], pa[3][1] - pa[0][1]], [pb[1][0] - pb[0][0], pb[1][1] - pb[0][1]], [pb[3][0] - pb[0][0], pb[3][1] - pb[0][1]]];
    const overlaps = edges.map(([x, z]) => {
      const [amin, amax] = projects(pa, [-z, x]); const [bmin, bmax] = projects(pb, [-z, x]);
      return (Math.min(amax, bmax) - Math.max(amin, bmin)) / Math.hypot(x, z);
    });
    const penetrationM = Math.min(verticalOverlap, ...overlaps);
    if (penetrationM > realThresholdM) collisions.push({ type: 'COLLISION_REAL', moduleA: a.moduleId, moduleB: b.moduleId, severity: 'ERROR', penetrationM, doorBlocked: Boolean(a.config?.door?.enabled || b.config?.door?.enabled) });
    else if (Math.abs(penetrationM) > 1e-9 && penetrationM >= -nearThresholdM) collisions.push({ type: 'NEAR_COLLISION', moduleA: a.moduleId, moduleB: b.moduleId, severity: 'WARNING', penetrationM, doorBlocked: Boolean(a.config?.door?.enabled || b.config?.door?.enabled) });
  }
  return collisions;
}
