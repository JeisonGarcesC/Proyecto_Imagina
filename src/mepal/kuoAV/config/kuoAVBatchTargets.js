export function isKuoAVBatchRoot(object) {
  return ['KUO_AV_ASSEMBLY', 'KUO_AV_DOBLE_ASSEMBLY'].includes(object?.userData?.kind)
    && Boolean(object.userData.kuoBatchId || object.userData.config?.kuoBatchId);
}

export function expandKuoAVBatchTargets(targets, objects) {
  const expanded = new Set(targets.filter(Boolean));
  for (const target of expanded) {
    if (!isKuoAVBatchRoot(target)) continue;
    const batchId = target.userData.kuoBatchId || target.userData.config?.kuoBatchId;
    for (const object of objects) {
      if (isKuoAVBatchRoot(object)
        && (object.userData.kuoBatchId || object.userData.config?.kuoBatchId) === batchId) {
        expanded.add(object);
      }
    }
  }
  return [...expanded];
}
