import { applyMaterialToMesh, getVisualFinishIdentity } from '../materials/applyMaterial.js';
import { prepareSpecialFinishVisual } from './specialFinishVisual.js';
import { finishFromSnapshot, normalizeSpecialFinishRecord } from './specialFinishPersistence.js';
import { getMeshPathKey as getLockerMeshPathKey } from './meshPathKey.js';

export function collectProjectSpecialFinishes(parts, getMeshPathKey, entities = []) {
  const entries = [];
  const recorded = new Set();
  const entityIds = new Set(entities.flatMap((entity) =>
    [entity.instanceId, entity.assemblyId].filter(Boolean).map(String)));
  const entityOwners = new Set();
  for (const { obj } of parts) {
    for (let node = obj; node; node = node.parent) {
      if (entityIds.has(String(node.userData?.instanceId || ''))) entityOwners.add(node);
    }
  }
  const owners = [...entityOwners, ...parts.map(({ obj }) => obj)];
  for (const owner of owners) {
    if (!owner) continue;
    const ownerInstanceId = owner.userData?.instanceId || owner.uuid;
    owner.traverse((mesh) => {
      if (!mesh.isMesh || recorded.has(mesh)) return;
      recorded.add(mesh);
      const record = normalizeSpecialFinishRecord(getVisualFinishIdentity(mesh));
      if (record) entries.push({ ...record, ownerInstanceId,
        meshPath: getMeshPathKey(owner, mesh) });
    });
  }
  return entries;
}

export async function restoreProjectSpecialFinishes(project, parts, getMeshPathKey, {
  prepareVisual = prepareSpecialFinishVisual, applyVisual = applyMaterialToMesh,
} = {}) {
  const failures = [];
  const restoredMeshes = new Set();
  for (const entry of Array.isArray(project?.specialFinishes) ? project.specialFinishes : []) {
    if (entry?.entityType === 'WALL' || entry?.entityType === 'COLUMN') continue;
    const record = normalizeSpecialFinishRecord(entry);
    if (!record) {
      failures.push({ kind: 'SPECIAL_FINISH', reason: 'INVALID_SNAPSHOT' });
      continue;
    }
    let owner = null;
    for (const { obj } of parts) {
      for (let node = obj; node; node = node.parent) {
        if (String(node.userData?.instanceId || node.uuid) === String(entry.ownerInstanceId)) {
          owner = node;
          break;
        }
      }
      if (owner) break;
    }
    if (!owner) {
      failures.push({ kind: 'SPECIAL_FINISH', reason: 'TARGET_NOT_FOUND',
        ownerInstanceId: entry.ownerInstanceId });
      continue;
    }
    let mesh = null;
    owner.traverse((node) => {
      if (node.isMesh && getMeshPathKey(owner, node) === entry.meshPath) mesh = node;
    });
    if (!mesh && owner.userData?.kind === 'LOCKER_PRODUCT') {
      owner.traverse((node) => {
        if (!mesh && node.isMesh && !restoredMeshes.has(node) &&
          getLockerMeshPathKey(owner, node, { legacyLockerNames: true }) === entry.meshPath) mesh = node;
      });
    }
    if (!mesh) {
      failures.push({ kind: 'SPECIAL_FINISH', reason: 'MESH_NOT_FOUND',
        ownerInstanceId: entry.ownerInstanceId, meshPath: entry.meshPath });
      continue;
    }
    try {
      const prepared = await prepareVisual(finishFromSnapshot(record.snapshot));
      applyVisual(mesh, null, prepared.definition, { visualOnly: true,
        identity: { ...prepared.identity, snapshot: record.snapshot, scope: record.scope } });
      restoredMeshes.add(mesh);
    } catch (error) {
      failures.push({ kind: 'SPECIAL_FINISH', reason: error?.message || 'RESOURCE_UNAVAILABLE',
        specialFinishId: record.specialFinishId, revision: record.revision });
    }
  }
  return failures;
}
