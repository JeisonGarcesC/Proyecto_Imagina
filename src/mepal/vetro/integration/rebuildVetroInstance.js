import { createVetroInstance } from '../factories/createVetroInstance.js';
export async function rebuildVetroInstance({ object, patch = {} } = {}) {
  if (object?.userData?.kind !== 'VETRO_PRODUCT') return { success: false, reason: 'VETRO_PRODUCT_REQUIRED' };
  const transform = {
    position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
  };
  return createVetroInstance({
    config: { ...(object.userData.config || {}), ...patch },
    instanceId: object.userData.instanceId,
    transform,
  });
}
