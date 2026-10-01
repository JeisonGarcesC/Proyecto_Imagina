import { toWorldUnitsFromCm } from './layout/multipleSpatialUnits.js';

const moduleWidthM = (module) => toWorldUnitsFromCm(module.config?.widthCm || 0);

export function layoutMultipleModulesLinear(modules = [], { origin = { x: 0, y: 0, z: 0 }, rotationY = 0 } = {}) {
  let cursor = 0;
  const firstHalfWidth = modules.length ? moduleWidthM(modules[0]) / 2 : 0;
  return modules.map((module) => {
    const center = cursor + moduleWidthM(module) / 2 - firstHalfWidth;
    const positioned = { ...structuredClone(module), position: {
      x: Number(origin.x || 0) + Math.cos(rotationY) * center,
      y: Number(origin.y || 0),
      z: Number(origin.z || 0) - Math.sin(rotationY) * center,
    }, rotation: { y: rotationY } };
    cursor += moduleWidthM(module);
    return positioned;
  });
}

export function findMultipleSystemOverlaps(modules = []) {
  const overlaps = [];
  for (let index = 0; index < modules.length; index += 1) for (let other = index + 1; other < modules.length; other += 1) {
    const a = modules[index]; const b = modules[other];
    const parallel = Math.abs(Math.sin(Number(a.rotation?.y || 0) - Number(b.rotation?.y || 0))) < 1e-6;
    if (!parallel || Math.abs(Number(a.position?.z || 0) - Number(b.position?.z || 0)) > 0.001) continue;
    const aStart = Number(a.position?.x || 0) - moduleWidthM(a) / 2; const aEnd = aStart + moduleWidthM(a);
    const bStart = Number(b.position?.x || 0) - moduleWidthM(b) / 2; const bEnd = bStart + moduleWidthM(b);
    if (Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > 0.001) overlaps.push([a.moduleId, b.moduleId]);
  }
  return overlaps;
}

export class MultipleLayoutEngine {
  static linear(modules, options) { return layoutMultipleModulesLinear(modules, options); }
  static overlaps(modules) { return findMultipleSystemOverlaps(modules); }
}
