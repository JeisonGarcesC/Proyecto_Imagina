import { Vector3 } from 'three';
import { resolveCritteriumConnectionPoints } from './CritteriumConnectionResolver.js';
import { classifyCritteriumConnection, CRITTERIUM_SNAP_DISTANCE_M, CRITTERIUM_SNAP_PREVIEW_DISTANCE_M } from './CritteriumConnectionRules.js';

export function previewCritteriumSequenceSnap(system, movingSequence, options = {}) {
  if (system?.userData?.kind !== 'CRITERIUM_SYSTEM' || movingSequence?.parent !== system) return null;
  const captureDistanceM = Number(options.captureDistanceM ?? system.userData.spatialConfig?.snapDistanceM ?? CRITTERIUM_SNAP_DISTANCE_M);
  const previewDistanceM = Number(options.previewDistanceM ?? system.userData.spatialConfig?.previewDistanceM ?? CRITTERIUM_SNAP_PREVIEW_DISTANCE_M);
  const sourcePoints = resolveCritteriumConnectionPoints(movingSequence);
  const connections = (system.parent?.children || [system])
    .filter((root) => root.userData?.kind === 'CRITERIUM_SYSTEM')
    .flatMap((root) => root.userData.connections || []);
  const occupiedByAnother = (point, partnerId) => connections.some((item) => {
    if (item.sourceSequenceId === point.sequenceId && item.sourcePointId === point.connectionId)
      return item.targetSequenceId !== partnerId;
    if (item.targetSequenceId === point.sequenceId && item.targetPointId === point.connectionId)
      return item.sourceSequenceId !== partnerId;
    return false;
  });
  let best = null;
  for (const targetSequence of options.candidateSequences || system.children) {
    if (targetSequence === movingSequence || targetSequence.userData?.kind !== 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') continue;
    if (options.targetSequenceId && targetSequence.userData.sequenceId !== options.targetSequenceId) continue;
    for (const source of sourcePoints) for (const target of resolveCritteriumConnectionPoints(targetSequence)) {
      if (occupiedByAnother(source, target.sequenceId) || occupiedByAnother(target, source.sequenceId)) continue;
      const origin = new Vector3(...source.position);
      const destination = new Vector3(...target.position);
      const distanceM = Math.hypot(origin.x - destination.x, origin.z - destination.z);
      if (distanceM > previewDistanceM) continue;
      const rule = classifyCritteriumConnection(source, target);
      const status = !rule.valid ? 'RED' : distanceM <= captureDistanceM ? 'GREEN' : 'YELLOW';
      const priority = status === 'GREEN' ? 0 : status === 'YELLOW' ? 1 : 2;
      if (best && (priority > best.priority || (priority === best.priority && distanceM >= best.distanceM))) continue;
      const delta = destination.clone().sub(origin);
      delta.y = 0;
      const predicted = movingSequence.getWorldPosition(new Vector3()).add(delta);
      best = { status, priority, type: rule.type || null, reason: rule.reason || null,
        sourceSequenceId: source.sequenceId, targetSequenceId: target.sequenceId,
        targetSystemId: targetSequence.userData.parentSystemId || null,
        sourcePointId: source.connectionId, targetPointId: target.connectionId,
        originWorld: origin.toArray(), destinationWorld: destination.toArray(),
        finalPositionWorld: predicted.toArray(), deltaWorld: delta.toArray(), distanceM };
    }
  }
  if (!best) return null;
  const preview = { ...best };
  delete preview.priority;
  return preview;
}
