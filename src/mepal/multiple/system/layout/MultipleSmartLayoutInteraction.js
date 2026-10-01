import { Vector3 } from 'three';
import { MultipleSystem } from '../MultipleSystem.js';
import { moveMultipleModule } from './MultipleSmartLayoutEngine.js';
import { previewMultipleSnap } from './MultipleSnapEngine.js';
import { detectMultipleCollisions } from './MultipleCollisionEngine.js';

export function captureMultipleSystemSpatialState(object) {
  if (object?.userData?.kind !== 'MULTIPLE_SYSTEM') throw new Error('MULTIPLE_SYSTEM_REQUIRED');
  return {
    kind: 'MULTIPLE_SYSTEM', systemId: object.userData.systemId,
    modules: structuredClone(object.userData.modules || []),
    connections: structuredClone(object.userData.connections || []),
    layout: structuredClone(object.userData.layout || {}),
    layoutOverrides: structuredClone(object.userData.layoutOverrides || {}),
    transform: { position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray() },
  };
}

export function previewMultipleProductDrag(product) {
  const systemObject = product?.parent?.userData?.kind === 'MULTIPLE_SYSTEM' ? product.parent : null;
  if (!systemObject || product.userData?.kind !== 'MULTIPLE_PRODUCT') return null;
  const modules = systemObject.userData.modules || [];
  const module = modules.find((item) => item.moduleId === product.userData.moduleId);
  if (!module) return null;
  const proposed = { ...module, position: { x: product.position.x, y: product.position.y, z: product.position.z } };
  const candidate = previewMultipleSnap(proposed, modules, systemObject.userData.layout);
  if (!candidate) return null;
  systemObject.updateMatrixWorld(true);
  return {
    ...candidate,
    originWorld: systemObject.localToWorld(new Vector3(...candidate.origin)).toArray(),
    destinationWorld: systemObject.localToWorld(new Vector3(...candidate.destination)).toArray(),
  };
}

export function commitMultipleProductDrag(systemObject, products) {
  if (systemObject?.userData?.kind !== 'MULTIPLE_SYSTEM' || !products?.length ||
      products.some((product) => product.parent !== systemObject || product.userData?.kind !== 'MULTIPLE_PRODUCT'))
    throw new Error('MULTIPLE_SYSTEM_PRODUCTS_REQUIRED');
  const before = captureMultipleSystemSpatialState(systemObject);
  const next = MultipleSystem.from(before);
  let rejected = false;
  if (products.length === 1) {
    const product = products[0];
    const result = moveMultipleModule(next, product.userData.moduleId, product.position);
    if (result.rejected) {
      const previous = before.modules.find((module) => module.moduleId === product.userData.moduleId);
      product.position.set(previous.position.x, previous.position.y, previous.position.z);
      rejected = true;
    }
  } else {
    for (const product of products) next.updateModule(product.userData.moduleId, { position: { x: product.position.x, y: product.position.y, z: product.position.z } });
    if (detectMultipleCollisions(next.modules).some((item) => item.type === 'COLLISION_REAL')) {
      for (const product of products) {
        const previous = before.modules.find((module) => module.moduleId === product.userData.moduleId);
        product.position.set(previous.position.x, previous.position.y, previous.position.z);
      }
      return { changed: false, before, after: before, rejected: true };
    }
  }
  for (const product of products) {
    const module = next.modules.find((item) => item.moduleId === product.userData.moduleId);
    product.position.set(module.position.x, module.position.y, module.position.z);
    product.updateMatrixWorld(true);
  }
  const after = next.toJSON();
  systemObject.userData.modules = structuredClone(after.modules);
  systemObject.userData.connections = structuredClone(after.connections);
  return { changed: JSON.stringify(before) !== JSON.stringify(after), before, after, rejected };
}
