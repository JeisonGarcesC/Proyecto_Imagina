import { describeCritterium8FrameAssembly } from '../../integration/critterium8SequenceOperations.js';
import { resolveCritteriumConnectionPoints, validateCritteriumSpatialConnection } from './CritteriumConnectionResolver.js';

export const CRITTERIUM_COLLISION_TOLERANCE_M = 0.001;
export const CRITTERIUM_NEAR_COLLISION_DISTANCE_M = 0.05;

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

function corners(rect) {
  return [-1, 1].flatMap((x) => [-1, 1].map((z) => [
    rect.center[0] + x * rect.halfWidth * rect.xAxis[0] + z * rect.halfDepth * rect.zAxis[0],
    rect.center[1] + x * rect.halfWidth * rect.xAxis[1] + z * rect.halfDepth * rect.zAxis[1],
  ]));
}

function pointSegmentDistance(point, a, b) {
  const dx = b[0] - a[0]; const dz = b[1] - a[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / lengthSquared)) : 0;
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dz);
}

export function classifyCritteriumFrameProximity(firstFrame, secondFrame, {
  collisionToleranceM = CRITTERIUM_COLLISION_TOLERANCE_M,
  nearDistanceM = CRITTERIUM_NEAR_COLLISION_DISTANCE_M,
} = {}) {
  const first = footprint(firstFrame); const second = footprint(secondFrame);
  if (!first || !second) return { status: 'VALID', distanceM: null };
  const delta = [second.center[0] - first.center[0], second.center[1] - first.center[1]];
  const overlap = [first.xAxis, first.zAxis, second.xAxis, second.zAxis].every((axis) =>
    projectionRadius(first, axis) + projectionRadius(second, axis) -
      Math.abs(delta[0] * axis[0] + delta[1] * axis[1]) > collisionToleranceM);
  if (overlap) return { status: 'COLLISION_REAL', distanceM: 0 };
  const a = corners(first); const b = corners(second);
  const edges = [[0, 1], [0, 2], [3, 1], [3, 2]];
  const distanceM = Math.min(
    ...a.flatMap((point) => edges.map(([start, end]) => pointSegmentDistance(point, b[start], b[end]))),
    ...b.flatMap((point) => edges.map(([start, end]) => pointSegmentDistance(point, a[start], a[end]))),
  );
  return { status: distanceM < nearDistanceM ? 'NEAR_COLLISION' : 'VALID',
    distanceM: Math.round(distanceM * 1e6) / 1e6 };
}

export function critteriumFramesOverlap(firstFrame, secondFrame, toleranceM = CRITTERIUM_COLLISION_TOLERANCE_M) {
  return classifyCritteriumFrameProximity(firstFrame, secondFrame, { collisionToleranceM: toleranceM }).status === 'COLLISION_REAL';
}

export function classifyCritteriumSequenceProximity(sequences, options = {}) {
  const diagnostics = [];
  for (let first = 0; first < sequences.length; first += 1) for (let second = first + 1; second < sequences.length; second += 1) {
    const leftFrames = sequences[first].children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
    const rightFrames = sequences[second].children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
    for (const left of leftFrames) for (const right of rightFrames) {
      const result = classifyCritteriumFrameProximity(left, right, options);
      if (result.status !== 'VALID') diagnostics.push({ code: result.status,
        sequenceAId: sequences[first].userData.sequenceId, sequenceBId: sequences[second].userData.sequenceId,
        frameAId: left.userData.frameId, frameBId: right.userData.frameId, distanceM: result.distanceM });
    }
  }
  return diagnostics;
}

export function classifyCritteriumSystemProximity(system, options = {}) {
  const sequences = system.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY');
  const points = new Map(sequences.flatMap((sequence) => resolveCritteriumConnectionPoints(sequence))
    .map((point) => [`${point.sequenceId}|${point.connectionId}`, point]));
  const expectedPairs = new Set((system.userData.connections || [])
    .filter((connection) => ['LINEAR', 'DEG_90'].includes(connection.type) &&
      validateCritteriumSpatialConnection(system, connection).valid)
    .map((connection) => {
      const source = points.get(`${connection.sourceSequenceId}|${connection.sourcePointId}`);
      const target = points.get(`${connection.targetSequenceId}|${connection.targetPointId}`);
      return source && target ? [source.frameId, target.frameId].sort().join('|') : null;
    }).filter(Boolean));
  return classifyCritteriumSequenceProximity(sequences, options).filter((item) =>
    !expectedPairs.has([item.frameAId, item.frameBId].sort().join('|')));
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
