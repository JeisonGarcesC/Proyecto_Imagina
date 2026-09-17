import { disposeVetroProduct } from '../renderers/VetroRenderer3D.js';
export function isVetroProduct(object) { return object?.userData?.kind === 'VETRO_PRODUCT'; }
export function registerVetroInstance({ instance, parent, partsRegistry, pickables } = {}) {
  const object = instance?.object;
  if (!object || !isVetroProduct(object)) throw new Error('VETRO_PRODUCT_REQUIRED');
  parent?.add?.(object);
  partsRegistry?.push?.({ code: object.userData.codigoPT, obj: object });
  if (object.userData.hasVisual === true) pickables?.push?.(object);
  return object;
}
export function unregisterVetroInstance({ object, partsRegistry, pickables, dispose = true } = {}) {
  if (!isVetroProduct(object)) return false;
  for (let i = (partsRegistry?.length || 0) - 1; i >= 0; i -= 1) if (partsRegistry[i]?.obj === object) partsRegistry.splice(i, 1);
  for (let i = (pickables?.length || 0) - 1; i >= 0; i -= 1) if (pickables[i] === object) pickables.splice(i, 1);
  object.parent?.remove?.(object);
  if (dispose) disposeVetroProduct(object);
  return true;
}
