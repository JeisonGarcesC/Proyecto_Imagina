import { MultipleSystem } from './MultipleSystem.js';
import { buildMultipleSystem } from './MultipleSystemBuilder.js';

export function serializeMultipleSystem(object) {
  if (object?.userData?.kind !== 'MULTIPLE_SYSTEM') throw new Error('MULTIPLE_SYSTEM_REQUIRED');
  const products = new Map(object.children.filter((child) => child.userData?.kind === 'MULTIPLE_PRODUCT').map((child) => [child.userData.moduleId, child]));
  const modules = (object.userData.modules || []).map((module) => {
    const product = products.get(module.moduleId);
    return product ? { ...structuredClone(module), instanceId: product.userData.instanceId,
      config: structuredClone(product.userData.config), position: { x: product.position.x, y: product.position.y, z: product.position.z }, rotation: { y: product.rotation.y } }
      : structuredClone(module);
  });
  const entity = { kind: 'MULTIPLE_SYSTEM', systemId: object.userData.systemId,
    modules, connections: structuredClone(object.userData.connections || []),
    transform: { position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray() } };
  const validation = MultipleSystem.from(entity).validate();
  if (!validation.valid) throw new Error(validation.diagnostics[0].code);
  return entity;
}

export function restoreMultipleSystem(entity) {
  if (entity?.kind !== 'MULTIPLE_SYSTEM') throw new Error('MULTIPLE_SYSTEM_REQUIRED');
  return buildMultipleSystem(entity);
}
