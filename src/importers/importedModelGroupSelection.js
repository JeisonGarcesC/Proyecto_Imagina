// Índice de diagnóstico en memoria: no crea entidades ni altera el árbol GLTF.
export function createImportedModelGroupSelectionIndex(inspector, { importedModelId = null, assetRef = null } = {}) {
  const meshToGroup = new WeakMap();
  const groups = new Map(inspector.groups.map((group) => [group.id, group]));
  const status = new Map();
  let meshCount = 0;
  for (const group of inspector.groups) {
    inspector.object(group.id)?.traverse((object) => {
      if (!object.isMesh) return;
      meshToGroup.set(object, group.id);
      meshCount += 1;
    });
  }
  const validStatuses = new Set(['candidate', 'confirmed', 'context', 'ambiguous', 'discarded', 'unclassified']);
  function mark(id, nextStatus) {
    const groupId = Number(id);
    if (!groups.has(groupId) || !validStatuses.has(nextStatus)) return false;
    if (nextStatus === 'unclassified') status.delete(groupId);
    else status.set(groupId, nextStatus);
    return true;
  }
  return {
    meshCount,
    mark,
    markFamily(id, nextStatus) {
      const group = groups.get(Number(id));
      if (!group || !validStatuses.has(nextStatus)) return 0;
      // La familia puede contener variantes extensas: marcar solo la firma exacta.
      const members = inspector.familyOf(group.id)?.positions.filter((item) => item.signature === group.signature) || [];
      for (const member of members) mark(member.id, nextStatus);
      return members.length;
    },
    get(id) {
      const group = groups.get(Number(id));
      if (!group) return null;
      return { id: `${importedModelId || 'preview'}:${group.id}`, importedModelId, assetRef,
        sourceNodeId: group.id, familyId: group.structureHash, parentGroupId: inspector.rootId,
        bounds: group.bounds, center: group.bounds?.center || null, childNodeIds: group.childIds,
        confidence: group.candidateScore, group, status: status.get(group.id) || 'unclassified',
        selectable: ['candidate', 'confirmed'].includes(status.get(group.id)) };
    },
    resolveMesh(object) {
      const groupId = meshToGroup.get(object);
      return groupId === undefined ? null : this.get(groupId);
    },
  };
}
