import { Vector3 } from 'three';
import { MultipleSystem } from '../MultipleSystem.js';
import { moveMultipleModule } from './MultipleSmartLayoutEngine.js';
import { previewMultipleSnap } from './MultipleSnapEngine.js';
import { detectMultipleCollisions } from './MultipleCollisionEngine.js';
import { getMultipleConnectionPoints } from './MultipleConnectionResolver.js';
import { normalizeMultipleLayout } from './multipleLayoutTypes.js';

export function getMultipleSystemProductFromHit(hitObject) {
  let object = hitObject;
  while (object) {
    if (object.userData?.kind === 'MULTIPLE_PRODUCT' && object.parent?.userData?.kind === 'MULTIPLE_SYSTEM') return object;
    if (object.userData?.kind === 'MULTIPLE_SYSTEM') return null;
    object = object.parent;
  }
  return null;
}

export function describeMultipleProductSnap(product) {
  const systemObject = product?.parent?.userData?.kind === 'MULTIPLE_SYSTEM' ? product.parent : null;
  if (!systemObject) return { reason: 'NO_SYSTEM' };
  const modules = systemObject.userData.modules || [];
  const source = modules.find((module) => module.moduleId === product.userData.moduleId);
  if (!source) return { reason: 'NO_MODULE' };
  systemObject.updateMatrixWorld(true);
  const proposed = { ...source, position: { x: product.position.x, y: product.position.y, z: product.position.z }, rotation: { y: product.rotation.y } };
  const settings = normalizeMultipleLayout(systemObject.userData.layout);
  const candidate = previewMultipleSnap(proposed, modules, settings, { worldMatrix: systemObject.matrixWorld });
  const nearest = candidate || previewMultipleSnap(proposed, modules, { ...settings, snapDistanceMm: 1e9 }, { worldMatrix: systemObject.matrixWorld });
  const target = modules.find((module) => module.moduleId === nearest?.targetModuleId);
  const points = (module) => module ? getMultipleConnectionPoints(module).map((point) => ({
    id: point.id, local: point.position,
    world: systemObject.localToWorld(new Vector3(...point.position)).toArray(),
    direction: point.direction, normal: point.normal, type: point.connectionType,
  })) : [];
  return {
    source: { moduleId: source.moduleId, instanceId: product.userData.instanceId, productId: source.productId,
      position: proposed.position, rotation: proposed.rotation, widthCm: source.config?.widthCm,
      heightCm: source.config?.heightCm, thicknessCm: source.config?.thicknessCm, points: points(proposed) },
    target: target ? { moduleId: target.moduleId, position: target.position, rotation: target.rotation,
      widthCm: target.config?.widthCm, heightCm: target.config?.heightCm,
      thicknessCm: target.config?.thicknessCm, points: points(target) } : null,
    sourcePoint: nearest?.sourcePoint || null, targetPoint: nearest?.targetPoint || null,
    distanceMm: nearest?.distanceMm ?? null, toleranceMm: settings.snapDistanceMm,
    compatible: candidate?.status === 'GREEN',
    reason: !settings.snapEnabled ? 'SNAP_DISABLED' : candidate?.reason || (candidate ? null : nearest ? 'DISTANCE_TOO_FAR' : 'NO_CANDIDATE'),
    status: candidate?.status || null,
  };
}

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
  systemObject.updateMatrixWorld(true);
  const candidate = previewMultipleSnap(proposed, modules, systemObject.userData.layout, { worldMatrix: systemObject.matrixWorld });
  if (!candidate) return null;
  return {
    ...candidate,
    originWorld: systemObject.localToWorld(new Vector3(...candidate.origin)).toArray(),
    destinationWorld: systemObject.localToWorld(new Vector3(...candidate.destination)).toArray(),
    finalPositionWorld: systemObject.localToWorld(new Vector3(candidate.position.x, candidate.position.y, candidate.position.z)).toArray(),
  };
}

export function commitMultipleProductDrag(systemObject, products) {
  if (systemObject?.userData?.kind !== 'MULTIPLE_SYSTEM' || !products?.length ||
      products.some((product) => product.parent !== systemObject || product.userData?.kind !== 'MULTIPLE_PRODUCT'))
    throw new Error('MULTIPLE_SYSTEM_PRODUCTS_REQUIRED');
  const before = captureMultipleSystemSpatialState(systemObject);
  const next = MultipleSystem.from(before);
  systemObject.updateMatrixWorld(true);
  let rejected = false;
  if (products.length === 1) {
    const product = products[0];
    const result = moveMultipleModule(next, product.userData.moduleId, product.position, { worldMatrix: systemObject.matrixWorld });
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
