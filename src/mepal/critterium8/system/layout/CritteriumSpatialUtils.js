import { describeCritterium8FrameAssembly } from '../../integration/critterium8SequenceOperations.js';

function footprint(frame) {
  const item = describeCritterium8FrameAssembly(frame);
  if (!item) return null;
  const halfWidth = item.widthCm / 200;
  const halfDepth = Number(frame.userData.config?.thicknessCm || 8) / 200;
  const xAxis = [Math.cos(item.rotationY), -Math.sin(item.rotationY)];
  const zAxis = [Math.sin(item.rotationY), Math.cos(item.rotationY)];
  const center = [item.position.x, item.position.z];
  return { center, xAxis, zAxis, halfWidth, halfDepth, frameId: item.frameId };
}

function projectionRadius(rect, axis) {
  return rect.halfWidth * Math.abs(rect.xAxis[0] * axis[0] + rect.xAxis[1] * axis[1]) +
    rect.halfDepth * Math.abs(rect.zAxis[0] * axis[0] + rect.zAxis[1] * axis[1]);
}

export function critteriumFramesOverlap(firstFrame, secondFrame, toleranceM = 0.001) {
  const first = footprint(firstFrame);
  const second = footprint(secondFrame);
  if (!first || !second) return false;
  const delta = [second.center[0] - first.center[0], second.center[1] - first.center[1]];
  return [first.xAxis, first.zAxis, second.xAxis, second.zAxis].every((axis) => {
    const distance = Math.abs(delta[0] * axis[0] + delta[1] * axis[1]);
    return projectionRadius(first, axis) + projectionRadius(second, axis) - distance > toleranceM;
  });
}

export function findCritteriumSequenceCollisions(sequences) {
  const collisions = [];
  for (let first = 0; first < sequences.length; first += 1) {
    for (let second = first + 1; second < sequences.length; second += 1) {
      const leftFrames = sequences[first].children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
      const rightFrames = sequences[second].children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
      for (const left of leftFrames) for (const right of rightFrames) {
        if (critteriumFramesOverlap(left, right)) collisions.push({ sequenceAId: sequences[first].userData.sequenceId,
          sequenceBId: sequences[second].userData.sequenceId, frameAId: left.userData.frameId, frameBId: right.userData.frameId });
      }
    }
  }
  return collisions;
}
