export function resolveKuoAVDobleSupportUpdates(objects, instanceId, changes) {
  const roots = new Map();
  for (const object of objects) {
    if (object?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY') {
      roots.set(object.userData.instanceId, object);
    }
  }
  const selected = roots.get(instanceId);
  if (!selected) throw new Error('No se encontro el puesto doble Kuo AV para actualizarlo.');
  return [{ instanceId, changes }];
}
