import { syncLinkComponentRegistry } from './linkComponentIdentity.js';

export function registerLinkInstance({ instance, parent, partsRegistry, pickables }) {
  const object = instance?.object;
  if (object?.userData?.kind !== 'LINK_PRODUCT') throw new Error('LINK_PRODUCT_REQUIRED');
  parent.add(object);
  if (!partsRegistry.some(p => p.obj === object)) partsRegistry.push({ code: null, obj: object });
  syncLinkComponentRegistry(object, partsRegistry);
  if (!pickables.includes(object)) pickables.push(object);
  return object;
}

export function getLinkRoot(object) {
  for (let node = object; node; node = node.parent) {
    if (node.userData?.kind === 'LINK_PRODUCT') return node;
  }
  return null;
}
