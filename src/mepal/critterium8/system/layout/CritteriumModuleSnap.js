import { Vector3 } from 'three';

// Preview only. The caller commits the same frame to its existing logical slot.
export function previewCritteriumModuleSlotSnap(frame, sequence, { snapM = 0.05, previewM = 0.2 } = {}) {
  if (frame?.userData?.kind !== 'CRITTERIUM_8_ASSEMBLY' ||
    sequence?.userData?.kind !== 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') return null;
  const slot = sequence.userData.sequence?.slots?.find((item) => String(item.frameId) === String(frame.userData.frameId));
  if (!slot || slot.status === 'MISSING_FRAME') return null;
  sequence.updateWorldMatrix(true, false);
  frame.updateWorldMatrix(true, false);
  const origin = frame.getWorldPosition(new Vector3());
  const destination = sequence.localToWorld(new Vector3().fromArray(slot.position));
  const distanceM = Math.hypot(origin.x - destination.x, origin.z - destination.z);
  if (distanceM > previewM) return null;
  return {
    slotId: slot.slotId, frameId: slot.frameId, distanceM,
    status: distanceM <= snapM ? 'GREEN' : 'YELLOW',
    positionLocal: [...slot.position],
    originWorld: origin.toArray(), destinationWorld: destination.toArray(),
    finalPositionWorld: destination.toArray(),
  };
}
