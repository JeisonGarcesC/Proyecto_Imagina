import { MathUtils } from 'three';
import { findMultipleSnap } from './MultipleSnapEngine.js';
import { alignMultipleModules } from './MultipleAlignmentEngine.js';
import { getMultipleLayoutDiagnostics } from './multipleLayoutDiagnostics.js';
import { normalizeMultipleLayout } from './multipleLayoutTypes.js';
import { detectMultipleCollisions } from './MultipleCollisionEngine.js';

export function moveMultipleModule(system, moduleId, position, options = {}) {
  const moving = system.modules.find((module) => module.moduleId === moduleId);
  if (!moving) throw new Error('MULTIPLE_SYSTEM_MODULE_NOT_FOUND');
  const proposed = { ...moving, position: { ...moving.position, ...position } };
  const candidate = findMultipleSnap(proposed, system.modules.filter((module) => module.moduleId !== moduleId), system.layout, options);
  const snappedModules = system.modules.map((module) => module.moduleId === moduleId ? { ...module, position: candidate?.position || proposed.position } : module);
  const snap = candidate && !detectMultipleCollisions(snappedModules).some((collision) => collision.type === 'COLLISION_REAL' && (collision.moduleA === moduleId || collision.moduleB === moduleId)) ? candidate : null;
  const finalModules = system.modules.map((module) => module.moduleId === moduleId ? { ...module, position: snap?.position || proposed.position } : module);
  const collision = detectMultipleCollisions(finalModules).find((item) => item.type === 'COLLISION_REAL' && (item.moduleA === moduleId || item.moduleB === moduleId));
  if (collision) return { system, snap: null, collision, rejected: true };
  const next = system.updateModule(moduleId, { position: snap?.position || proposed.position });
  next.composition.connections = next.connections.filter((connection) =>
    connection.from?.moduleId !== moduleId && connection.to?.moduleId !== moduleId &&
    connection.moduleA !== moduleId && connection.moduleB !== moduleId
  );
  if (snap) next.connect(snap.connection);
  return { system: next, snap };
}

export function moveMultipleSystem(system, offset = {}) {
  const dx = Number(offset.x || 0); const dy = Number(offset.y || 0); const dz = Number(offset.z || 0);
  if (![dx, dy, dz].every(Number.isFinite)) throw new Error('MULTIPLE_INVALID_MOVE');
  for (const module of system.modules) system.updateModule(module.moduleId, { position: { x: module.position.x + dx, y: module.position.y + dy, z: module.position.z + dz } });
  return system;
}

export function alignMultipleSystem(system, moduleIds, axis) {
  const modules = alignMultipleModules(system.modules, moduleIds, axis);
  for (const module of modules) system.updateModule(module.moduleId, { position: module.position });
  return system;
}

export function duplicateMultipleSystem(system) {
  const moduleIds = new Map();
  const modules = system.modules.map((module) => {
    const moduleId = MathUtils.generateUUID(); moduleIds.set(module.moduleId, moduleId);
    return { ...structuredClone(module), moduleId, instanceId: MathUtils.generateUUID(), connectionPoints: undefined };
  });
  const connections = system.connections.map((connection) => ({ ...structuredClone(connection), connectionId: MathUtils.generateUUID(), moduleA: moduleIds.get(connection.moduleA), moduleB: moduleIds.get(connection.moduleB), from: connection.from ? { ...connection.from, moduleId: moduleIds.get(connection.from.moduleId) } : undefined, to: connection.to ? { ...connection.to, moduleId: moduleIds.get(connection.to.moduleId) } : undefined }));
  return { kind: 'MULTIPLE_SYSTEM', systemId: MathUtils.generateUUID(), modules, connections, layout: normalizeMultipleLayout(system.layout), layoutOverrides: structuredClone(system.layoutOverrides || {}), transform: structuredClone(system.transform) };
}

export function inspectMultipleLayout(system) { return getMultipleLayoutDiagnostics(system.modules, system.connections); }
