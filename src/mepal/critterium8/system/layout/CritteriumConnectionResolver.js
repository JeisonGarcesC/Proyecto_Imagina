import { Euler, Vector3 } from 'three';
import { describeCritterium8FrameAssembly } from '../../integration/critterium8SequenceOperations.js';
import { getCritterium8FrameConnectionAnchors } from '../../connectivity/frameSequenceResolver.js';
import { classifyCritteriumConnection, CRITTERIUM_CONNECTED_TOLERANCE_M } from './CritteriumConnectionRules.js';

const isSequence = (object) => object?.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY';

// A terminal junction has exactly one participating frame endpoint. Its point
// is recomputed from the current frame transform, not from a cached mesh bound.
export function resolveCritteriumConnectionPoints(sequence) {
  if (!isSequence(sequence)) return [];
  const frames = new Map(sequence.children
    .filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY')
    .map((frame) => [String(frame.userData.frameId), frame]));
  const points = [];
  for (const junction of sequence.userData.sequence?.junctions || []) {
    if (junction.type !== 'TERMINAL' || junction.endpointRefs?.length !== 1) continue;
    const { frameId, endpoint } = junction.endpointRefs[0];
    const frame = frames.get(String(frameId));
    if (!frame || !['START', 'END'].includes(endpoint)) continue;
    const definition = describeCritterium8FrameAssembly(frame);
    const anchors = getCritterium8FrameConnectionAnchors(definition);
    const anchor = anchors[endpoint];
    const outward = new Vector3(Math.cos(definition.rotationY), 0, -Math.sin(definition.rotationY))
      .multiplyScalar(endpoint === 'START' ? -1 : 1);
    const normal = new Vector3(0, 0, 1).applyEuler(new Euler(0, definition.rotationY, 0));
    points.push({
      connectionId: String(junction.id),
      sequenceId: String(sequence.userData.sequenceId),
      type: `TERMINAL_${endpoint}`,
      frameId: String(frameId),
      slotId: sequence.userData.sequence?.slots?.find((slot) => String(slot.frameId) === String(frameId))?.slotId || null,
      position: [anchor.x, frame.getWorldPosition(new Vector3()).y, anchor.z],
      direction: outward.toArray(),
      normal: normal.toArray(),
      orientation: definition.rotationY,
      heightCm: definition.heightCm,
      projectHeightCm: definition.projectHeightCm,
      frameMode: definition.frameMode,
      thicknessCm: Number(frame.userData.config?.thicknessCm || 8),
    });
  }
  return points;
}

export function findCritteriumSequence(system, sequenceId) {
  return system?.children?.find((child) => isSequence(child) && child.userData.sequenceId === sequenceId) || null;
}

export function validateCritteriumSpatialConnection(system, connection) {
  if (!['LINEAR', 'DEG_90'].includes(connection?.type)) return { valid: true, legacy: true };
  const source = resolveCritteriumConnectionPoints(findCritteriumSequence(system, connection.sourceSequenceId))
    .find((point) => point.connectionId === connection.sourcePointId);
  const target = resolveCritteriumConnectionPoints(findCritteriumSequence(system, connection.targetSequenceId))
    .find((point) => point.connectionId === connection.targetPointId);
  if (!source || !target) return { valid: false, reason: 'CRITERIUM_SPATIAL_POINT_MISSING' };
  const rule = classifyCritteriumConnection(source, target);
  if (!rule.valid || rule.type !== connection.type) return { valid: false, reason: rule.reason || 'CRITERIUM_SPATIAL_TYPE_MISMATCH' };
  const distanceM = Math.hypot(source.position[0] - target.position[0], source.position[2] - target.position[2]);
  if (distanceM > CRITTERIUM_CONNECTED_TOLERANCE_M) return { valid: false, reason: 'CRITERIUM_SPATIAL_POINTS_SEPARATED', distanceM };
  return { valid: true, distanceM };
}

export function collectCritteriumSpatialDiagnostics(system) {
  return (system?.userData?.connections || []).flatMap((connection) => {
    const validation = validateCritteriumSpatialConnection(system, connection);
    return validation.valid ? [] : [{ connectionId: connection.connectionId, code: validation.reason, distanceM: validation.distanceM ?? null }];
  });
}

export function findCritteriumConnectionsAffectedBySequenceEdit(system, sequenceId, oldPoints, nextSlots) {
  const byId = new Map(oldPoints.map((point) => [String(point.connectionId), point]));
  const nextTerminalFrame = {
    TERMINAL_START: nextSlots[0]?.frameId,
    TERMINAL_END: nextSlots.at(-1)?.frameId,
  };
  return (system?.userData?.connections || []).filter((connection) => {
    const pointId = connection.sourceSequenceId === sequenceId ? connection.sourcePointId
      : connection.targetSequenceId === sequenceId ? connection.targetPointId : null;
    if (!pointId) return false;
    const point = byId.get(String(pointId));
    return !point || String(nextTerminalFrame[point.type]) !== String(point.frameId);
  });
}

// A rebuilt sequence can assign new junction IDs to its terminal points.
// Keep both persisted endpoint spellings in sync and discard relationships
// whose physical terminal frame was removed.
export function reconcileCritteriumConnectionsAfterSequenceEdit(system, sequenceId, oldPoints, newPoints, removedFrameId = null,
  { rejectAffected = false } = {}) {
  const oldById = new Map(oldPoints.map((point) => [String(point.connectionId), point]));
  const newByType = new Map(newPoints.map((point) => [point.type, point]));
  let affected = false;
  const nextConnections = (system.userData.connections || []).flatMap((connection) => {
    const sourceIsEdited = connection.sourceSequenceId === sequenceId;
    const targetIsEdited = connection.targetSequenceId === sequenceId;
    if (!sourceIsEdited && !targetIsEdited) return [connection];
    const source = sourceIsEdited ? oldById.get(String(connection.sourcePointId)) : null;
    const target = targetIsEdited ? oldById.get(String(connection.targetPointId)) : null;
    if ((sourceIsEdited && !source) || (targetIsEdited && !target) ||
      (removedFrameId && [source, target].some((point) => point && String(point.frameId) === String(removedFrameId)))) {
      affected = true; return [];
    }
    const newSource = sourceIsEdited ? newByType.get(source.type) : null;
    const newTarget = targetIsEdited ? newByType.get(target.type) : null;
    if ((sourceIsEdited && String(newSource?.frameId) !== String(source.frameId)) ||
      (targetIsEdited && String(newTarget?.frameId) !== String(target.frameId))) {
      affected = true; return [];
    }
    const sourcePointId = sourceIsEdited ? newSource.connectionId : connection.sourcePointId;
    const targetPointId = targetIsEdited ? newTarget.connectionId : connection.targetPointId;
    if (!sourcePointId || !targetPointId) { affected = true; return []; }
    return [{ ...connection, sourcePointId, targetPointId, pointAId: sourcePointId, pointBId: targetPointId }];
  });
  if (rejectAffected && affected) throw new Error('Desconecte primero el extremo afectado.');
  system.userData.connections = nextConnections;
  return system.userData.connections;
}
