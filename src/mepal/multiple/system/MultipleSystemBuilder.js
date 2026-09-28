import { Group } from 'three';
import { createMultipleInstance } from '../factories/createMultipleInstance.js';
import { MultipleSystem } from './MultipleSystem.js';
import { resolveMultipleSystemBOM } from './multipleSystemBOM.js';

export function buildMultipleSystem(input = {}) {
  const system = MultipleSystem.from(input); const validation = system.validate();
  if (!validation.valid) return { success: false, reason: validation.diagnostics[0].code, diagnostics: validation.diagnostics };
  const object = new Group(); object.name = 'MULTIPLE_SYSTEM'; const products = [];
  for (const module of system.modules) {
    const instance = createMultipleInstance({ config: module.config, instanceId: module.instanceId, groupId: system.systemId });
    if (!instance.success) return { success: false, reason: instance.reason, diagnostics: instance.diagnostics || [] };
    const product = instance.object; product.position.set(module.position.x, module.position.y, module.position.z); product.rotation.y = module.rotation.y;
    Object.assign(product.userData, { moduleId: module.moduleId, systemId: system.systemId, parentAssemblyId: system.systemId, systemModuleType: module.type });
    object.add(product); products.push(product);
  }
  const bom = resolveMultipleSystemBOM(products);
  Object.assign(object.userData, { kind: 'MULTIPLE_SYSTEM', type: 'MULTIPLE_SYSTEM', family: 'MULTIPLE', line: 'MULTIPLE', systemId: system.systemId,
    instanceId: system.systemId, groupId: system.systemId, groupName: 'Sistema Multiple', isPartRoot: true, hasVisual: true,
    modules: structuredClone(system.modules), connections: structuredClone(system.connections), bom: bom.rows, bomStatus: bom.status, missingBOM: bom.missing });
  const transform = system.transform; if (Array.isArray(transform.position)) object.position.fromArray(transform.position);
  if (Array.isArray(transform.quaternion)) object.quaternion.fromArray(transform.quaternion); if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale);
  object.updateMatrixWorld(true); return { success: true, object, products, system, diagnostics: validation.diagnostics };
}
