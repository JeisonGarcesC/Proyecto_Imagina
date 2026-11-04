import { Quaternion, Vector3 } from 'three';
import { resolveVetroConnectionPoints } from '../system/vetroConnectionPoints.js';
import { VETRO_SNAP_CAPTURE_M } from '../system/vetroSystemConnections.js';

export const VETRO_DOOR_INTERFACE = 'DOOR_INTERFACE_PROVISIONAL';
const vector = (values) => new Vector3(...values);

export function resolveVetroAssemblyConnectors(assembly) {
  if (assembly?.userData?.kind !== 'VETRO_ASSEMBLY') return [];
  const frame = assembly.children.find((child) => child.userData?.config?.productType === 'DOOR_FRAME');
  const widthMm = Number(frame?.userData?.product?.dimensions?.nominalWidthCm) * 10;
  if (!frame || !(widthMm > 0)) return [];
  frame.updateWorldMatrix(true, false);
  const orientation = frame.getWorldQuaternion(new Quaternion());
  return [
    { id: 'FRAME_LEFT', side: -1 },
    { id: 'FRAME_RIGHT', side: 1 },
  ].map(({ id, side }) => ({
    id, kind: 'TERMINAL', assemblyId: assembly.userData.assemblyId,
    position: frame.localToWorld(new Vector3(side * widthMm / 2000, 0, 0)).toArray(),
    direction: new Vector3(side, 0, 0).applyQuaternion(orientation).normalize().toArray(),
    geometryStatus: 'PROVISIONAL_NOMINAL_FRAME_EDGE',
  }));
}

export function getVetroAssemblyRelations(assemblies = []) {
  return assemblies.flatMap((assembly) => assembly?.userData?.kind === 'VETRO_ASSEMBLY'
    ? assembly.userData.externalConnections || [] : []);
}

export function previewVetroAssemblySnap(assembly, systems = [], assemblies = [assembly], options = {}) {
  if (assembly?.userData?.kind !== 'VETRO_ASSEMBLY') return null;
  const captureM = Number(options.captureM ?? VETRO_SNAP_CAPTURE_M);
  const systemRelations = systems.flatMap((system) => system?.userData?.externalConnections || []);
  const assemblyRelations = getVetroAssemblyRelations(assemblies);
  const occupiedSystems = new Set([
    ...systemRelations.flatMap((relation) => [
      `${relation.sourceSystemId}:${relation.sourceTerminalId}`,
      `${relation.targetSystemId}:${relation.targetTerminalId}`,
    ]),
    ...assemblyRelations.map((relation) => `${relation.sourceSystemId}:${relation.sourceTerminalId}`),
    ...(options.additionalRelations || []).map((relation) => `${relation.sourceSystemId}:${relation.sourceTerminalId}`),
  ]);
  const occupiedConnectors = new Set(assemblyRelations
    .filter((relation) => relation.targetAssemblyId === assembly.userData.assemblyId)
    .map((relation) => relation.targetConnectorId));
  const frame = assembly.children.find((child) => child.userData?.config?.productType === 'DOOR_FRAME');
  const frameHeightMm = Number(frame?.userData?.config?.nominalHeightCm) * 10;
  let best = null;
  for (const connector of resolveVetroAssemblyConnectors(assembly)) {
    if (occupiedConnectors.has(connector.id)) continue;
    for (const system of systems) {
      if (system?.userData?.kind !== 'VETRO_SYSTEM' || Number(system.userData.heightMm) !== frameHeightMm) continue;
      for (const terminal of resolveVetroConnectionPoints(system).filter((point) => point.kind === 'TERMINAL')) {
        if (occupiedSystems.has(`${terminal.systemId}:${terminal.id}`)) continue;
        const distanceM = vector(connector.position).distanceTo(vector(terminal.position));
        if (distanceM > captureM || (best && distanceM >= best.distanceM)) continue;
        best = {
          sourceSystemId: terminal.systemId, sourceTerminalId: terminal.id,
          targetAssemblyId: assembly.userData.assemblyId, targetConnectorId: connector.id,
          connectionType: VETRO_DOOR_INTERFACE, distanceM,
          geometryStatus: connector.geometryStatus,
        };
      }
    }
  }
  return best;
}

export function connectVetroAssemblyToSystem({ assembly, system, preview, systems = [system], assemblies = [assembly], additionalRelations = [] } = {}) {
  if (assembly?.userData?.kind !== 'VETRO_ASSEMBLY' || system?.userData?.kind !== 'VETRO_SYSTEM')
    return { success: false, reason: 'VETRO_ASSEMBLY_AND_SYSTEM_REQUIRED' };
  const candidate = preview || previewVetroAssemblySnap(assembly, systems, assemblies, { additionalRelations });
  if (!candidate || candidate.sourceSystemId !== system.userData.systemId || candidate.targetAssemblyId !== assembly.userData.assemblyId)
    return { success: false, reason: 'VETRO_ASSEMBLY_TERMINAL_NOT_AVAILABLE' };
  const available = previewVetroAssemblySnap(assembly, systems, assemblies, { additionalRelations });
  if (!available || available.sourceSystemId !== candidate.sourceSystemId || available.sourceTerminalId !== candidate.sourceTerminalId ||
    available.targetConnectorId !== candidate.targetConnectorId)
    return { success: false, reason: 'VETRO_ASSEMBLY_TERMINAL_OCCUPIED' };
  const connector = resolveVetroAssemblyConnectors(assembly).find((item) => item.id === candidate.targetConnectorId);
  const terminal = resolveVetroConnectionPoints(system).find((item) => item.id === candidate.sourceTerminalId && item.kind === 'TERMINAL');
  if (!connector || !terminal) return { success: false, reason: 'VETRO_ASSEMBLY_CONNECTOR_MISSING' };
  const sourceDirection = vector(connector.direction);
  const targetDirection = vector(terminal.direction).negate();
  const deltaYaw = Math.atan2(sourceDirection.z, sourceDirection.x) - Math.atan2(targetDirection.z, targetDirection.x);
  assembly.rotateY(deltaYaw);
  assembly.updateMatrixWorld(true);
  const rotated = resolveVetroAssemblyConnectors(assembly).find((item) => item.id === connector.id);
  const newWorld = assembly.getWorldPosition(new Vector3()).add(vector(terminal.position).sub(vector(rotated.position)));
  assembly.position.copy(assembly.parent ? assembly.parent.worldToLocal(newWorld) : newWorld);
  assembly.updateMatrixWorld(true);
  const relation = { ...candidate, connectionId: candidate.connectionId || `vetro-door-connection-${crypto.randomUUID()}` };
  assembly.userData.externalConnections ||= [];
  assembly.userData.externalConnections.push(relation);
  return { success: true, relation };
}

export function disconnectVetroAssemblyFromSystem(assembly, connectionId) {
  if (assembly?.userData?.kind !== 'VETRO_ASSEMBLY') return false;
  const before = assembly.userData.externalConnections || [];
  assembly.userData.externalConnections = before.filter((relation) => relation.connectionId !== connectionId);
  return assembly.userData.externalConnections.length !== before.length;
}

export function isVetroAssemblyConnectionAligned(assembly, relation, systems, toleranceM = 0.001) {
  const system = systems.find((item) => item.userData?.systemId === relation.sourceSystemId);
  const connector = resolveVetroAssemblyConnectors(assembly).find((item) => item.id === relation.targetConnectorId);
  const terminal = resolveVetroConnectionPoints(system).find((item) => item.id === relation.sourceTerminalId);
  return !!(connector && terminal && vector(connector.position).distanceTo(vector(terminal.position)) <= toleranceM &&
    vector(connector.direction).dot(vector(terminal.direction)) <= -0.98);
}

export function captureVetroAssemblyConnectionState(assembly) {
  return {
    position: assembly.position.toArray(), quaternion: assembly.quaternion.toArray(),
    externalConnections: structuredClone(assembly.userData.externalConnections || []),
  };
}

export function applyVetroAssemblyConnectionState(assembly, state) {
  assembly.position.fromArray(state.position);
  assembly.quaternion.fromArray(state.quaternion);
  assembly.userData.externalConnections = structuredClone(state.externalConnections || []);
  assembly.updateMatrixWorld(true);
}

export function translateVetroConnectedAssemblies(systems, assemblies, deltaWorld) {
  const systemIds = new Set(systems.map((system) => system.userData?.systemId).filter(Boolean));
  const delta = deltaWorld.isVector3 ? deltaWorld : vector(deltaWorld);
  const moved = assemblies.filter((assembly) => (assembly.userData?.externalConnections || [])
    .some((relation) => systemIds.has(relation.sourceSystemId)));
  for (const assembly of moved) {
    const world = assembly.getWorldPosition(new Vector3()).add(delta);
    assembly.position.copy(assembly.parent ? assembly.parent.worldToLocal(world) : world);
    assembly.updateMatrixWorld(true);
  }
  return moved;
}
