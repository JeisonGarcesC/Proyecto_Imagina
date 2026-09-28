import { MathUtils } from 'three';

const clone = (value) => structuredClone(value);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function createMultipleSystemModule(input = {}) {
  const moduleId = input.moduleId || MathUtils.generateUUID();
  return {
    moduleId,
    type: input.type || 'WALL_SECTION',
    productId: 'MULTIPLE_PRODUCT',
    instanceId: input.instanceId || MathUtils.generateUUID(),
    config: clone(input.config || {}),
    position: {
      x: finite(input.position?.x),
      y: finite(input.position?.y),
      z: finite(input.position?.z),
    },
    rotation: { y: finite(input.rotation?.y) },
    connectionPoints: clone(input.connectionPoints || [
      { pointId: `${moduleId}:START`, role: 'START' },
      { pointId: `${moduleId}:END`, role: 'END' },
    ]),
  };
}

export class MultipleSystemComposition {
  constructor({ modules = [], connections = [] } = {}) {
    this.modules = modules.map(createMultipleSystemModule);
    this.connections = clone(connections);
  }

  addModule(module) {
    return new MultipleSystemComposition({ modules: [...this.modules, createMultipleSystemModule(module)], connections: this.connections });
  }

  removeModule(moduleId) {
    return new MultipleSystemComposition({
      modules: this.modules.filter((module) => module.moduleId !== moduleId),
      connections: this.connections.filter((connection) => connection.from?.moduleId !== moduleId && connection.to?.moduleId !== moduleId),
    });
  }

  updateModule(moduleId, patch = {}) {
    return new MultipleSystemComposition({ modules: this.modules.map((module) => module.moduleId === moduleId
      ? createMultipleSystemModule({ ...module, ...clone(patch), moduleId, instanceId: module.instanceId,
        config: patch.config ? clone(patch.config) : module.config,
        position: patch.position ? { ...module.position, ...patch.position } : module.position,
        rotation: patch.rotation ? { ...module.rotation, ...patch.rotation } : module.rotation })
      : module), connections: this.connections });
  }

  duplicateModule(moduleId) {
    const source = this.modules.find((module) => module.moduleId === moduleId);
    if (!source) throw new Error('MULTIPLE_SYSTEM_MODULE_NOT_FOUND');
    const duplicate = createMultipleSystemModule({ ...clone(source), moduleId: undefined, instanceId: undefined, connectionPoints: undefined });
    return { composition: this.addModule(duplicate), module: duplicate };
  }

  connect(connection) {
    return new MultipleSystemComposition({ modules: this.modules, connections: [...this.connections, clone(connection)] });
  }

  toJSON() { return clone({ modules: this.modules, connections: this.connections }); }
}
