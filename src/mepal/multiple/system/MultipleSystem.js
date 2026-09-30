import { MathUtils } from 'three';
import { MultipleSystemComposition, createMultipleSystemModule } from './MultipleSystemComposition.js';
import { layoutMultipleModulesLinear } from './MultipleLayoutEngine.js';
import { validateMultipleSystem } from './multipleSystemRules.js';
import { normalizeMultipleLayout } from './layout/multipleLayoutTypes.js';

export class MultipleSystem {
  constructor({ systemId = MathUtils.generateUUID(), modules = [], connections = [], transform = null, layout = {}, layoutOverrides = {} } = {}) {
    this.kind = 'MULTIPLE_SYSTEM'; this.systemId = systemId;
    this.composition = new MultipleSystemComposition({ modules, connections });
    this.transform = structuredClone(transform || { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] });
    this.layout = normalizeMultipleLayout(layout);
    this.layoutOverrides = structuredClone(layoutOverrides);
  }
  get modules() { return this.composition.modules; }
  get connections() { return this.composition.connections; }
  addModule(config, options = {}) { this.composition = this.composition.addModule(createMultipleSystemModule({ ...options, config })); return this; }
  removeModule(moduleId) { this.composition = this.composition.removeModule(moduleId); return this; }
  updateModule(moduleId, patch) { this.composition = this.composition.updateModule(moduleId, patch); return this; }
  duplicateModule(moduleId) { const result = this.composition.duplicateModule(moduleId); this.composition = result.composition; return result.module; }
  connect(connection) { this.composition = this.composition.connect({ connectionId: connection.connectionId || MathUtils.generateUUID(), type: connection.type || 'LINEAR', ...structuredClone(connection) }); return this; }
  layoutLinear(options) { this.composition = new MultipleSystemComposition({ modules: layoutMultipleModulesLinear(this.modules, options), connections: this.connections }); return this; }
  validate() { return validateMultipleSystem(this.toJSON()); }
  toJSON() { return { kind: this.kind, systemId: this.systemId, ...this.composition.toJSON(), layout: structuredClone(this.layout), layoutOverrides: structuredClone(this.layoutOverrides), transform: structuredClone(this.transform) }; }
  static from(value) { return value instanceof MultipleSystem ? value : new MultipleSystem(value); }
}
