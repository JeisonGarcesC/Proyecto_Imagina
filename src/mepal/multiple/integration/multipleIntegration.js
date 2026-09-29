import { createMultipleInstance } from '../factories/createMultipleInstance.js';
import { disposeMultipleComponent } from '../renderers/MultipleNativeRenderer.js';
import { initializeMultipleComponent, syncMultipleRegistry } from './multipleComponentIdentity.js';
export { serializeMultipleEntity, restoreMultipleEntity } from '../serialization/multipleSerialization.js';

export function registerMultipleInstance({ instance, parent, partsRegistry, pickables }) {
  const object = instance?.object;
  if (object?.userData?.kind !== 'MULTIPLE_PRODUCT') throw new Error('MULTIPLE_PRODUCT_REQUIRED');
  parent.add(object); if (!partsRegistry.some((entry) => entry.obj === object)) partsRegistry.push({ code: null, obj: object });
  syncMultipleRegistry(object, partsRegistry); if (!pickables.includes(object)) pickables.push(object); return object;
}

export function rebuildMultipleInstance({ object, patch = {}, partsRegistry = [] }) {
  if (object?.userData?.kind !== 'MULTIPLE_PRODUCT') return { success: false, reason: 'MULTIPLE_PRODUCT_REQUIRED' };
  const next = createMultipleInstance({ config: { ...object.userData.config, ...patch }, instanceId: object.userData.instanceId, groupId: object.userData.groupId });
  if (!next.success) return next;
  const previousByKey = new Map(object.children.map((child) => [child.userData.componentKey, child])); const ordered = [];
  for (const fresh of [...next.object.children]) {
    const key = fresh.userData.componentKey; const previous = previousByKey.get(key);
    if (!previous) { next.object.remove(fresh); initializeMultipleComponent(fresh, object); ordered.push(fresh); continue; }
    previousByKey.delete(key); const identity = { componentId: previous.userData.componentId, instanceId: previous.userData.instanceId };
    const parametricTransform = fresh.userData.parametricTransform;
    disposeMultipleComponent(previous); previous.clear(); for (const child of [...fresh.children]) previous.add(child);
    previous.position.copy(fresh.position); previous.quaternion.copy(fresh.quaternion); previous.scale.copy(fresh.scale);
    previous.name = fresh.name; previous.userData = { ...fresh.userData, ...identity }; initializeMultipleComponent(previous, object);
    previous.userData.parametricTransform = parametricTransform;
    ordered.push(previous);
  }
  for (const removed of previousByKey.values()) { disposeMultipleComponent(removed); object.remove(removed); }
  object.clear(); ordered.forEach((component) => object.add(component)); object.userData = { ...object.userData, ...next.object.userData };
  syncMultipleRegistry(object, partsRegistry); object.updateMatrixWorld(true); return { ...next, object };
}
