import { toWorldUnitsFromCm } from './multipleSpatialUnits.js';

const width = (module) => toWorldUnitsFromCm(module.config?.widthCm || 0);
const depth = (module) => toWorldUnitsFromCm(module.config?.thicknessCm || 0);
const rotate = ([x, y, z], angle) => [x * Math.cos(angle) + z * Math.sin(angle), y, -x * Math.sin(angle) + z * Math.cos(angle)];

export function getMultipleConnectionPoints(module) {
  const angle = Number(module.rotation?.y || 0);
  const origin = module.position || {};
  const point = (id, type, local, direction, compatibleWith) => {
    const offset = rotate(local, angle);
    return { id, type, connectionType: type, position: [Number(origin.x || 0) + offset[0], Number(origin.y || 0) + offset[1], Number(origin.z || 0) + offset[2]], direction: rotate(direction, angle), normal: rotate([0, 0, 1], angle), compatibleWith };
  };
  const startType = module.config?.door?.enabled ? 'DOOR_CONNECTION' : 'LINEAR_START';
  const endType = module.config?.door?.enabled ? 'DOOR_CONNECTION' : 'LINEAR_END';
  return [
    point('START', startType, [-width(module) / 2, 0, 0], [-1, 0, 0], ['LINEAR_END', 'DOOR_CONNECTION', 'CORNER_LEFT']),
    point('END', endType, [width(module) / 2, 0, 0], [1, 0, 0], ['LINEAR_START', 'DOOR_CONNECTION', 'CORNER_RIGHT']),
    point('LEFT', 'CORNER_LEFT', [-width(module) / 2, 0, depth(module) / 2], [0, 0, 1], ['LINEAR_END', 'CORNER_RIGHT']),
    point('RIGHT', 'CORNER_RIGHT', [width(module) / 2, 0, -depth(module) / 2], [0, 0, -1], ['LINEAR_START', 'CORNER_LEFT']),
  ];
}

export function resolveMultipleConnection(moduleA, pointA, moduleB, pointB) {
  const a = getMultipleConnectionPoints(moduleA).find((item) => item.id === pointA);
  const b = getMultipleConnectionPoints(moduleB).find((item) => item.id === pointB);
  if (!a || !b || !a.compatibleWith.includes(b.type) || !b.compatibleWith.includes(a.type)) return null;
  const dot = a.direction[0] * b.direction[0] + a.direction[2] * b.direction[2];
  if (dot > -0.99) return null;
  const offset = a.position.map((value, index) => value - b.position[index]);
  return { connectionId: `${moduleA.moduleId}:${pointA}:${moduleB.moduleId}:${pointB}`, moduleA: moduleA.moduleId, moduleB: moduleB.moduleId, type: pointA.startsWith('CORNER') || pointB.startsWith('CORNER') ? 'CORNER_90' : 'LINEAR', offset, from: { moduleId: moduleA.moduleId, point: pointA }, to: { moduleId: moduleB.moduleId, point: pointB } };
}

export function multipleConnectionPairKey(connection) {
  const a = connection?.from?.moduleId || connection?.moduleA;
  const b = connection?.to?.moduleId || connection?.moduleB;
  if (!a || !b) return null;
  return [String(a), String(b)].sort().join('::');
}
