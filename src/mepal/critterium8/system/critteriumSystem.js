import { Group, MathUtils, Vector3 } from 'three';
import { CRITTERIUM_SNAP_DISTANCE_M, CRITTERIUM_SNAP_PREVIEW_DISTANCE_M } from './layout/CritteriumConnectionRules.js';

const clone = (value) => structuredClone(value);
const isSequence = (object) => object?.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY';
const isSystem = (object) => object?.userData?.kind === 'CRITERIUM_SYSTEM';

export function getCritteriumSystemRoot(object) {
  for (let current = object; current; current = current.parent) if (isSystem(current)) return current;
  return null;
}

export function resolveCritteriumSelectionHierarchy(object) {
  let frame = null; let sequence = null; let junction = null; let part = null;
  for (let current = object; current; current = current.parent) {
    if (current.userData?.kind === 'CRITTERIUM_8_PART') part ||= current;
    if (current.userData?.kind === 'CRITTERIUM_8_JUNCTION') junction ||= current;
    if (current.userData?.kind === 'CRITTERIUM_8_ASSEMBLY') frame ||= current;
    if (isSequence(current)) sequence ||= current;
  }
  return { system: getCritteriumSystemRoot(object), sequence, frame, junction, part };
}

export function createCritteriumSystem({ systemId = MathUtils.generateUUID(), connections = [], layout = {}, spatialConfig = {}, transform = null } = {}) {
  const root = new Group();
  root.name = `CRITERIUM_SYSTEM_${systemId}`;
  root.userData = { kind: 'CRITERIUM_SYSTEM', family: 'CRITTERIUM_8', systemId, instanceId: systemId,
    sequenceIds: [], connections: clone(connections), layout: clone(layout),
    spatialConfig: { snapDistanceM: CRITTERIUM_SNAP_DISTANCE_M, previewDistanceM: CRITTERIUM_SNAP_PREVIEW_DISTANCE_M, ...clone(spatialConfig) },
    spatialDiagnostics: [], isAssemblyRoot: true,
    isPartRoot: true, selectionRoot: true, excludeFromBOM: true };
  if (Array.isArray(transform?.position)) root.position.fromArray(transform.position);
  if (Array.isArray(transform?.quaternion)) root.quaternion.fromArray(transform.quaternion);
  if (Array.isArray(transform?.scale)) root.scale.fromArray(transform.scale);
  return root;
}

export function registerCritteriumSystem({ system, scene, partsRegistry } = {}) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  if (partsRegistry.some(({ obj }) => obj !== system && isSystem(obj) && obj.userData.systemId === system.userData.systemId)) throw new Error('CRITERIUM_SYSTEM_DUPLICATE');
  if (scene && system.parent !== scene) scene.add(system);
  if (!partsRegistry.some(({ obj }) => obj === system)) partsRegistry.push({ code: null, obj: system });
  return system;
}

export function addSequenceToCritteriumSystem(system, sequence) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  if (!isSequence(sequence)) throw new Error('CRITERIUM_SEQUENCE_REQUIRED');
  const id = sequence.userData.sequenceId;
  if (!id || system.userData.sequenceIds.includes(id) || sequence.userData.parentSystemId) throw new Error('CRITERIUM_SYSTEM_SEQUENCE_DUPLICATE');
  if (sequence === system || system.parent === sequence) throw new Error('CRITERIUM_SYSTEM_CYCLE');
  system.attach(sequence);
  sequence.userData.parentSystemId = system.userData.systemId;
  system.userData.sequenceIds.push(id);
  return system;
}

export function createCritteriumSystemFromSequences(sequences = [], options = {}) {
  if (new Set(sequences).size !== sequences.length ||
    new Set(sequences.map((sequence) => sequence?.userData?.sequenceId)).size !== sequences.length ||
    sequences.some((sequence) => !isSequence(sequence) || sequence.userData.parentSystemId)) {
    throw new Error('CRITERIUM_SYSTEM_INVALID_SEQUENCES');
  }
  const system = createCritteriumSystem(options);
  const parent = sequences[0]?.parent || null;
  parent?.add(system);
  sequences.forEach((sequence) => addSequenceToCritteriumSystem(system, sequence));
  return system;
}

export function removeSequenceFromCritteriumSystem(system, sequenceId, parent) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  const sequence = system.children.find((child) => isSequence(child) && child.userData.sequenceId === sequenceId);
  if (!sequence) throw new Error('CRITERIUM_SYSTEM_SEQUENCE_NOT_FOUND');
  const destination = parent || system.parent;
  if (!destination) throw new Error('CRITERIUM_SYSTEM_PARENT_REQUIRED');
  destination.attach(sequence);
  delete sequence.userData.parentSystemId;
  system.userData.sequenceIds = system.userData.sequenceIds.filter((id) => id !== sequenceId);
  system.userData.connections = system.userData.connections.filter((item) => item.sourceSequenceId !== sequenceId && item.targetSequenceId !== sequenceId && item.sequenceAId !== sequenceId && item.sequenceBId !== sequenceId);
  return sequence;
}

export function deleteCritteriumSystem(system, { partsRegistry, parent } = {}) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  const destination = parent || system.parent;
  if (!destination) throw new Error('CRITERIUM_SYSTEM_PARENT_REQUIRED');
  [...system.userData.sequenceIds].forEach((id) => removeSequenceFromCritteriumSystem(system, id, destination));
  system.parent?.remove(system);
  for (let index = partsRegistry.length - 1; index >= 0; index -= 1) if (partsRegistry[index].obj === system) partsRegistry.splice(index, 1);
  return true;
}

function hasPoint(sequence, pointId) {
  return (sequence.userData.junctionIds || []).includes(pointId);
}

export function connectCritteriumSystemSequences(system, connection) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  if (['T_JUNCTION', 'CROSS'].includes(connection?.type))
    throw new Error(`UNSUPPORTED_SPATIAL_TOPOLOGY: ${connection.type} requiere un anclaje físico lateral o intermedio; ninguna pieza CRITERIUM actual lo documenta.`);
  if (connection?.type && !['LINEAR', 'DEG_90', 'RELATION'].includes(connection.type)) throw new Error('CRITERIUM_SYSTEM_INVALID_CONNECTION_TYPE');
  const { sourceSequenceId, sourcePointId, targetSequenceId, targetPointId } = connection || {};
  if (!sourceSequenceId || !targetSequenceId || sourceSequenceId === targetSequenceId) throw new Error('CRITERIUM_SYSTEM_INVALID_CONNECTION');
  const source = system.children.find((child) => child.userData?.sequenceId === sourceSequenceId);
  const target = system.children.find((child) => child.userData?.sequenceId === targetSequenceId);
  if (!source || !target || !hasPoint(source, sourcePointId) || !hasPoint(target, targetPointId)) throw new Error('CRITERIUM_SYSTEM_INVALID_CONNECTION_POINT');
  const pairKey = [sourceSequenceId, targetSequenceId].sort().join('|');
  if (system.userData.connections.some((item) => [item.sourceSequenceId, item.targetSequenceId].sort().join('|') === pairKey)) {
    throw new Error('CRITERIUM_SYSTEM_DUPLICATE_CONNECTION');
  }
  if (['LINEAR', 'DEG_90'].includes(connection.type) && system.userData.connections.some((item) =>
    ['LINEAR', 'DEG_90'].includes(item.type) &&
    ((item.sourceSequenceId === sourceSequenceId && item.sourcePointId === sourcePointId) ||
      (item.targetSequenceId === sourceSequenceId && item.targetPointId === sourcePointId) ||
      (item.sourceSequenceId === targetSequenceId && item.sourcePointId === targetPointId) ||
      (item.targetSequenceId === targetSequenceId && item.targetPointId === targetPointId)))) {
    throw new Error('CRITERIUM_SYSTEM_CONNECTION_POINT_OCCUPIED');
  }
  const item = { connectionId: connection.connectionId || MathUtils.generateUUID(), sourceSequenceId, sourcePointId, targetSequenceId, targetPointId,
    sequenceAId: sourceSequenceId, pointAId: sourcePointId, sequenceBId: targetSequenceId, pointBId: targetPointId,
    type: connection.type || 'RELATION' };
  system.userData.connections.push(item);
  return item;
}

export function disconnectCritteriumSystemSequences(system, connectionId) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  const previous = system.userData.connections.length;
  system.userData.connections = system.userData.connections.filter((item) => item.connectionId !== connectionId);
  if (previous === system.userData.connections.length) throw new Error('CRITERIUM_SYSTEM_CONNECTION_NOT_FOUND');
  return true;
}

export function moveCritteriumSystem(system, delta) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  system.position.add(new Vector3(Number(delta.x || 0), Number(delta.y || 0), Number(delta.z || 0)));
  system.updateMatrixWorld(true);
  return system;
}

export function moveCritteriumSequenceInSystem(system, sequenceId, delta) {
  if (!isSystem(system)) throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  const sequence = system.children.find((child) => isSequence(child) && child.userData.sequenceId === sequenceId);
  if (!sequence) throw new Error('CRITERIUM_SYSTEM_SEQUENCE_NOT_FOUND');
  sequence.position.add(new Vector3(Number(delta.x || 0), Number(delta.y || 0), Number(delta.z || 0)));
  sequence.updateMatrixWorld(true);
  return sequence;
}
