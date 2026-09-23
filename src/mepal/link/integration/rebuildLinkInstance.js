import { createLinkInstance } from '../factories/createLinkInstance.js';
import { disposeLinkGeometry } from '../renderers/LinkNativeRenderer.js';
import { hydrateLinkGlbParts } from '../renderers/LinkGlbRenderer.js';
import { initializeLinkComponent, syncLinkComponentRegistry } from './linkComponentIdentity.js';

function reconcileLinkComponents(object, freshRoot) {
  const previousByKey = new Map(object.children.map(component => [component.userData?.componentKey, component]));
  const ordered = [];
  for (const fresh of [...freshRoot.children]) {
    const key = fresh.userData?.componentKey;
    const previous = previousByKey.get(key);
    if (!previous) {
      freshRoot.remove(fresh);
      initializeLinkComponent(fresh, object, 0);
      ordered.push(fresh);
      continue;
    }
    previousByKey.delete(key);
    const generation = Number(previous.userData?.linkGeneration || 0) + 1;
    const identity = { componentId: previous.userData.componentId, instanceId: previous.userData.instanceId };
    disposeLinkGeometry(previous);
    previous.clear();
    for (const child of [...fresh.children]) previous.add(child);
    previous.name = fresh.name;
    previous.position.copy(fresh.position);
    previous.quaternion.copy(fresh.quaternion);
    previous.scale.copy(fresh.scale);
    previous.userData = { ...fresh.userData, ...identity };
    initializeLinkComponent(previous, object, generation);
    ordered.push(previous);
  }
  for (const removed of previousByKey.values()) {
    removed.userData.linkGeneration = Number(removed.userData.linkGeneration || 0) + 1;
    disposeLinkGeometry(removed);
    object.remove(removed);
  }
  object.clear();
  ordered.forEach(component => object.add(component));
}

export function rebuildLinkInstance({ object, patch = {}, applyFinishes, loadAsset, onVisualReady, partsRegistry }) {
  if (object?.userData?.kind !== 'LINK_PRODUCT') return { success: false, reason: 'LINK_PRODUCT_REQUIRED' };
  const next = createLinkInstance({ config: { ...object.userData.config, ...patch },
    instanceId: object.userData.instanceId, groupId: object.userData.groupId, loadAsset, onVisualReady, deferHydration: true });
  if (!next.success) return next;
  reconcileLinkComponents(object, next.object);
  object.userData = { ...object.userData, ...next.object.userData };
  object.updateMatrixWorld(true);
  syncLinkComponentRegistry(object, partsRegistry);
  applyFinishes?.(object);
  const visualsReady = hydrateLinkGlbParts(object, next.product, { loadAsset, onVisualReady: onVisualReady || applyFinishes });
  return { ...next, visualsReady, object };
}
