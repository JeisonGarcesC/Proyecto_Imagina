export function resolveKuoAVDobleSupportUpdates(objects, instanceId, changes) {
  const roots = new Map();
  for (const object of objects) {
    if (object?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY') {
      roots.set(object.userData.instanceId, object);
    }
  }
  const selected = roots.get(instanceId);
  if (!selected) throw new Error('No se encontro el puesto doble Kuo AV para actualizarlo.');
  const updates = [];
  const batchId = selected.userData.kuoBatchId || selected.userData.config?.kuoBatchId;
  if (batchId && Object.hasOwn(changes, 'soporteIntermedio')) {
    for (const [id, object] of roots) {
      const otherBatchId = object.userData.kuoBatchId || object.userData.config?.kuoBatchId;
      if (id !== instanceId && otherBatchId === batchId) {
        updates.push({ instanceId: id, changes: { soporteIntermedio: changes.soporteIntermedio } });
      }
    }
  }
  // Rebuild the selected table last so selection and its properties remain active.
  updates.push({ instanceId, changes });
  return updates;
}
