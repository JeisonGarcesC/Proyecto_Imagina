import { createLockerInstance } from '../factories/createLockerInstance.js';
import { disposeLockerGeometry } from '../renderers/LockerNativeRenderer.js';

// Keep the physical root: global transform/create/delete history retains this identity.
export function rebuildLockerInstance({ object, patch = {} }) {
  if (object?.userData?.kind !== 'LOCKER_PRODUCT') return { success: false, reason: 'LOCKER_PRODUCT_REQUIRED' };
  const next = createLockerInstance({ config: { ...object.userData.config, ...patch }, instanceId: object.userData.instanceId });
  if (!next.success) return next;
  const groupId = object.userData.groupId;
  for (const child of [...object.children]) { object.remove(child); disposeLockerGeometry(child); }
  for (const child of [...next.object.children]) object.add(child);
  object.userData = { ...object.userData, ...next.object.userData, groupId };
  object.traverse(node => { node.userData.groupId = groupId; });
  object.updateMatrixWorld(true);
  return { ...next, object };
}
