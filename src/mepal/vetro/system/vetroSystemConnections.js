import { Vector3 } from 'three';
import { createVetroInstance } from '../factories/createVetroInstance.js';
import { disposeVetroProduct } from '../renderers/VetroRenderer3D.js';
import { resolveVetroConnectionPoints } from './vetroConnectionPoints.js';

// Capture and angle tolerances are provisional interaction settings, not commercial dimensions.
export const VETRO_SNAP_CAPTURE_M = 0.15;
const PARALLEL_DOT = 0.98;
const PERPENDICULAR_DOT = 0.1;
const KIT_BY_TYPE = Object.freeze({
  JOIN_180: { variant: 'JOIN_180', code: '22000009791', reference: 'VTAC030000' },
  JOIN_90: { variant: 'JOIN_90', code: '22000009792', reference: 'VTAC040000' },
  JOIN_T: { variant: 'JOIN_T', code: '22000009793', reference: 'VTAC050000' },
});

const pairKey = (a, b) => [a, b].sort().join('|');
const vector = (values) => new Vector3(...values);
const connectionPair = (relation) => pairKey(`${relation.sourceSystemId}:${relation.sourceTerminalId}`, `${relation.targetSystemId}:${relation.targetTerminalId}`);

export function previewVetroSystemSnap(source, targets, options = {}) {
  if (source?.userData?.kind !== 'VETRO_SYSTEM') return null;
  const captureM = Number(options.captureM ?? VETRO_SNAP_CAPTURE_M);
  const systems = [source, ...(targets || [])].filter((item) => item?.userData?.kind === 'VETRO_SYSTEM');
  const relations = systems.flatMap((item) => item.userData.externalConnections || []);
  const occupied = new Set(relations.flatMap((relation) => [
    `${relation.sourceSystemId}:${relation.sourceTerminalId}`,
    `${relation.targetSystemId}:${relation.targetTerminalId}`,
  ]));
  let best = null;
  for (const sourcePoint of resolveVetroConnectionPoints(source).filter((point) => point.kind === 'TERMINAL')) {
    if (occupied.has(`${sourcePoint.systemId}:${sourcePoint.id}`)) continue;
    for (const target of targets || []) {
      if (target === source || target?.userData?.kind !== 'VETRO_SYSTEM') continue;
      if (Number(target.userData.heightMm) !== Number(source.userData.heightMm)) continue;
      for (const targetPoint of resolveVetroConnectionPoints(target)) {
        if (occupied.has(`${targetPoint.systemId}:${targetPoint.id}`)) continue;
        const separation = vector(sourcePoint.position).distanceTo(vector(targetPoint.position));
        if (separation > captureM) continue;
        const sourceDirection = vector(sourcePoint.direction);
        let type = null;
        if (targetPoint.kind === 'SEAM') {
          if (Math.abs(sourceDirection.dot(vector(targetPoint.tangent))) <= PERPENDICULAR_DOT) type = 'JOIN_T';
        } else {
          const dot = sourceDirection.dot(vector(targetPoint.direction));
          if (dot <= -PARALLEL_DOT) type = 'JOIN_180';
          else if (Math.abs(dot) <= PERPENDICULAR_DOT) type = 'JOIN_90';
        }
        if (!type || (best && separation >= best.distanceM)) continue;
        best = {
          type, distanceM: separation, sourceSystemId: source.userData.systemId,
          targetSystemId: target.userData.systemId,
          sourceTerminalId: sourcePoint.id, targetTerminalId: targetPoint.id,
          deltaWorld: vector(targetPoint.position).sub(vector(sourcePoint.position)).toArray(),
          anchorWorld: targetPoint.position,
          kitSku: KIT_BY_TYPE[type].code, kitReference: KIT_BY_TYPE[type].reference,
        };
      }
    }
  }
  return best;
}

export function getVetroConnectedCluster(source, systems) {
  if (source?.userData?.kind !== 'VETRO_SYSTEM') return [];
  const byId = new Map(systems.map((item) => [item.userData.systemId, item]));
  const relations = systems.flatMap((item) => item.userData.externalConnections || []);
  const visited = new Set();
  const queue = [source.userData.systemId];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    for (const relation of relations) {
      if (relation.sourceSystemId === id && !visited.has(relation.targetSystemId)) queue.push(relation.targetSystemId);
      if (relation.targetSystemId === id && !visited.has(relation.sourceSystemId)) queue.push(relation.sourceSystemId);
    }
  }
  return [...visited].map((id) => byId.get(id)).filter(Boolean);
}

async function addKitVisual(source, relation, partsRegistry) {
  const kit = KIT_BY_TYPE[relation.type];
  if (!kit) throw new Error('VETRO_CONNECTION_TYPE_UNSUPPORTED');
  const result = await createVetroInstance({ config: { category: 'JUNCTION_KITS', productType: 'JUNCTION_KIT', variant: kit.variant } });
  if (!result.success) throw new Error('VETRO_CONNECTION_KIT_UNAVAILABLE');
  const object = result.object;
  source.updateMatrixWorld(true);
  const anchor = vector(relation.anchorWorld);
  anchor.y = source.getWorldPosition(new Vector3()).y + 0.035;
  object.position.copy(source.worldToLocal(anchor));
  object.scale.y = (source.userData.heightMm - 69.5) / 3000;
  object.userData.isPartRoot = false;
  object.userData.systemId = source.userData.systemId;
  object.userData.parentAssemblyId = source.userData.systemId;
  object.userData.groupId = source.userData.systemId;
  object.userData.vetroSystemComponent = true;
  object.userData.vetroConnectionId = relation.connectionId;
  source.add(object);
  partsRegistry?.push?.({ code: object.userData.code, obj: object });
  source.userData.components.push({ kind: relation.type, code: object.userData.code, reference: kit.reference, config: object.userData.config, instanceId: object.userData.instanceId, connectionId: relation.connectionId, position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(), dimensions: object.userData.product?.dimensions, included: false });
  return object;
}

export async function connectVetroSystems({ source, target, preview, partsRegistry, moveSource = true } = {}) {
  if (!source || !target || source === target) return { success: false, reason: 'VETRO_DISTINCT_SYSTEMS_REQUIRED' };
  const candidate = preview || previewVetroSystemSnap(source, [target]);
  if (!candidate || candidate.sourceSystemId !== source.userData.systemId || candidate.targetSystemId !== target.userData.systemId)
    return { success: false, reason: 'VETRO_COMPATIBLE_TERMINALS_NOT_FOUND' };
  const systems = [source, target];
  const key = pairKey(`${candidate.sourceSystemId}:${candidate.sourceTerminalId}`, `${candidate.targetSystemId}:${candidate.targetTerminalId}`);
  if (systems.flatMap((item) => item.userData.externalConnections || []).some((item) => connectionPair(item) === key))
    return { success: false, reason: 'VETRO_CONNECTION_ALREADY_EXISTS' };
  const oldPosition = source.position.clone();
  if (moveSource) {
    const worldPosition = source.getWorldPosition(new Vector3()).add(vector(candidate.deltaWorld));
    source.position.copy(source.parent ? source.parent.worldToLocal(worldPosition) : worldPosition);
    source.updateMatrixWorld(true);
  }
  const relation = { ...candidate, connectionId: candidate.connectionId || `vetro-connection-${crypto.randomUUID()}` };
  relation.anchorWorld = resolveVetroConnectionPoints(target).find((point) => point.id === relation.targetTerminalId)?.position || candidate.anchorWorld;
  try {
    await addKitVisual(source, relation, partsRegistry);
    source.userData.externalConnections ||= [];
    source.userData.externalConnections.push(relation);
    return { success: true, relation };
  } catch (error) {
    source.position.copy(oldPosition);
    source.updateMatrixWorld(true);
    return { success: false, reason: error.message };
  }
}

export function disconnectVetroSystems(source, connectionId, partsRegistry) {
  if (source?.userData?.kind !== 'VETRO_SYSTEM') return false;
  const relation = (source.userData.externalConnections || []).find((item) => item.connectionId === connectionId);
  if (!relation) return false;
  const visual = source.children.find((child) => child.userData.vetroConnectionId === connectionId);
  if (visual) {
    for (let i = (partsRegistry?.length || 0) - 1; i >= 0; i--) if (partsRegistry[i]?.obj === visual) partsRegistry.splice(i, 1);
    source.remove(visual);
    disposeVetroProduct(visual);
  }
  source.userData.externalConnections = source.userData.externalConnections.filter((item) => item.connectionId !== connectionId);
  source.userData.components = source.userData.components.filter((item) => item.connectionId !== connectionId);
  return true;
}

export async function replayVetroConnectionState({ source, target, relation, state, partsRegistry }) {
  if (source?.userData?.kind !== 'VETRO_SYSTEM') throw new Error('VETRO_SYSTEM_HISTORY_SOURCE_MISSING');
  if (state?.connected && target?.userData?.kind !== 'VETRO_SYSTEM') throw new Error('VETRO_SYSTEM_HISTORY_TARGET_MISSING');
  disconnectVetroSystems(source, relation.connectionId, partsRegistry);
  source.position.fromArray(state.position);
  source.updateMatrixWorld(true);
  if (state.connected) {
    const result = await connectVetroSystems({ source, target, preview: relation, partsRegistry, moveSource: false });
    if (!result.success) throw new Error(result.reason || 'VETRO_SYSTEM_HISTORY_CONNECT_FAILED');
  }
}

export async function restoreVetroSystemConnections(systems, partsRegistry) {
  const byId = new Map(systems.map((item) => [item.userData.systemId, item]));
  const restored = [];
  for (const source of systems) {
    const saved = [...(source.userData.externalConnections || [])];
    source.userData.externalConnections = [];
    for (const relation of saved) {
      const target = byId.get(relation.targetSystemId);
      if (!target || relation.sourceSystemId !== source.userData.systemId) continue;
      const sourcePoint = resolveVetroConnectionPoints(source).find((item) => item.id === relation.sourceTerminalId);
      const targetPoint = resolveVetroConnectionPoints(target).find((item) => item.id === relation.targetTerminalId);
      if (!sourcePoint || !targetPoint || vector(sourcePoint.position).distanceTo(vector(targetPoint.position)) > 0.001) continue;
      relation.anchorWorld = targetPoint.position;
      await addKitVisual(source, relation, partsRegistry);
      source.userData.externalConnections.push(relation);
      restored.push(relation);
    }
  }
  return restored;
}
