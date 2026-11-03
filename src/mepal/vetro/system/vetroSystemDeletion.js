import { connectVetroSystems, disconnectVetroSystems } from './vetroSystemConnections.js';

export function collectVetroDeletionConnections(systems, deletingIds) {
  const ids = new Set(deletingIds);
  return systems.flatMap((owner) => (owner.userData?.externalConnections || [])
    .filter((relation) => ids.has(relation.sourceSystemId) || ids.has(relation.targetSystemId))
    .map((relation) => ({ ownerId: owner.userData.systemId, relation: structuredClone(relation) })));
}

export function detachVetroDeletionConnections(systems, snapshots, partsRegistry) {
  const byId = new Map(systems.map((system) => [system.userData.systemId, system]));
  for (const { ownerId, relation } of snapshots) {
    const owner = byId.get(ownerId);
    if (owner) disconnectVetroSystems(owner, relation.connectionId, partsRegistry);
  }
}

export async function restoreVetroDeletionConnections(systems, snapshots, partsRegistry) {
  const byId = new Map(systems.map((system) => [system.userData.systemId, system]));
  for (const { ownerId, relation } of snapshots) {
    const source = byId.get(ownerId);
    const target = byId.get(relation.targetSystemId);
    if (!source || !target) throw new Error('VETRO_DELETE_CONNECTION_SYSTEM_MISSING');
    const result = await connectVetroSystems({ source, target, preview: relation, partsRegistry, moveSource: false });
    if (!result.success) throw new Error(result.reason || 'VETRO_DELETE_CONNECTION_RESTORE_FAILED');
  }
}
