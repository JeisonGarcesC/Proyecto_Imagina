import { Euler, Quaternion, Vector3 } from 'three';
import { resolveCritteriumConnectionPoints } from './CritteriumConnectionResolver.js';
import { classifyCritteriumConnection } from './CritteriumConnectionRules.js';
import { findCritteriumSequenceCollisions } from './CritteriumSpatialUtils.js';

function worldPosition(object) {
  return object.getWorldPosition(new Vector3());
}

export function translateCritteriumSequence(sequence, delta) {
  const world = worldPosition(sequence).add(new Vector3(...delta));
  if (sequence.parent) {
    sequence.parent.updateMatrixWorld(true);
    sequence.position.copy(sequence.parent.worldToLocal(world));
  } else sequence.position.copy(world);
  sequence.updateMatrixWorld(true);
  return sequence;
}

export function critteriumSequenceCenter(sequence) {
  const points = resolveCritteriumConnectionPoints(sequence);
  if (!points.length) return worldPosition(sequence);
  return points.reduce((sum, point) => sum.add(new Vector3(...point.position)), new Vector3()).divideScalar(points.length);
}

export function rotateCritteriumSequence90(sequence, clockwise = true) {
  const center = critteriumSequenceCenter(sequence);
  const before = center.clone();
  const delta = new Quaternion().setFromEuler(new Euler(0, (clockwise ? -1 : 1) * Math.PI / 2, 0));
  const worldQuaternion = sequence.getWorldQuaternion(new Quaternion()).premultiply(delta);
  if (sequence.parent) {
    const parentQuaternion = sequence.parent.getWorldQuaternion(new Quaternion());
    sequence.quaternion.copy(parentQuaternion.invert().multiply(worldQuaternion));
  } else sequence.quaternion.copy(worldQuaternion);
  sequence.updateMatrixWorld(true);
  const movedCenter = critteriumSequenceCenter(sequence);
  translateCritteriumSequence(sequence, before.sub(movedCenter).toArray());
  return sequence;
}

export function alignCritteriumSequences(system, sequenceIds, mode = 'HORIZONTAL') {
  const sequences = sequenceIds.map((id) => system.children.find((child) => child.userData?.sequenceId === id));
  if (sequences.length < 2 || sequences.some((item) => !item)) throw new Error('CRITERIUM_LAYOUT_INVALID_SEQUENCES');
  const anchor = critteriumSequenceCenter(sequences[0]);
  for (const sequence of sequences.slice(1)) {
    const current = critteriumSequenceCenter(sequence);
    if (mode === 'HORIZONTAL') translateCritteriumSequence(sequence, [0, 0, anchor.z - current.z]);
    else if (mode === 'VERTICAL') translateCritteriumSequence(sequence, [anchor.x - current.x, 0, 0]);
    else if (mode === 'ENDPOINT') {
      const first = resolveCritteriumConnectionPoints(sequences[0]).find((point) => point.type === 'TERMINAL_END');
      const second = resolveCritteriumConnectionPoints(sequence).find((point) => point.type === 'TERMINAL_START');
      if (!first || !second) throw new Error('CRITERIUM_LAYOUT_MISSING_ENDPOINT');
      translateCritteriumSequence(sequence, [first.position[0] - second.position[0], 0, first.position[2] - second.position[2]]);
    } else throw new Error('CRITERIUM_LAYOUT_UNSUPPORTED_ALIGNMENT');
  }
  system.updateMatrixWorld(true);
  return sequences;
}

export function distributeCritteriumSequences(system, sequenceIds, axis = 'X') {
  const sequences = sequenceIds.map((id) => system.children.find((child) => child.userData?.sequenceId === id));
  if (sequences.length < 3 || sequences.some((item) => !item)) throw new Error('CRITERIUM_LAYOUT_REQUIRES_THREE_SEQUENCES');
  const coordinate = axis === 'Z' ? 'z' : 'x';
  const sorted = [...sequences].sort((a, b) => critteriumSequenceCenter(a)[coordinate] - critteriumSequenceCenter(b)[coordinate]);
  const first = critteriumSequenceCenter(sorted[0])[coordinate];
  const last = critteriumSequenceCenter(sorted.at(-1))[coordinate];
  sorted.slice(1, -1).forEach((sequence, index) => {
    const current = critteriumSequenceCenter(sequence)[coordinate];
    const wanted = first + (last - first) * (index + 1) / (sorted.length - 1);
    translateCritteriumSequence(sequence, coordinate === 'x' ? [wanted - current, 0, 0] : [0, 0, wanted - current]);
  });
  return sorted;
}

export function layoutCritteriumLinear(system, sequenceIds = system.userData.sequenceIds, { separationM = 0.05 } = {}) {
  const sequences = sequenceIds.map((id) => system.children.find((child) => child.userData?.sequenceId === id));
  if (sequences.length < 2 || sequences.some((item) => !item)) throw new Error('CRITERIUM_LAYOUT_INVALID_SEQUENCES');
  if (!Number.isFinite(Number(separationM)) || Number(separationM) < 0) throw new Error('CRITERIUM_LAYOUT_INVALID_SEPARATION');
  for (let index = 1; index < sequences.length; index += 1) {
    const previous = resolveCritteriumConnectionPoints(sequences[index - 1]).find((point) => point.type === 'TERMINAL_END');
    let current = resolveCritteriumConnectionPoints(sequences[index]).find((point) => point.type === 'TERMINAL_START');
    if (!previous || !current) throw new Error('CRITERIUM_LAYOUT_MISSING_ENDPOINT');
    for (let turn = 0; turn < 4 && classifyCritteriumConnection(previous, current).type !== 'LINEAR'; turn += 1) {
      rotateCritteriumSequence90(sequences[index]);
      current = resolveCritteriumConnectionPoints(sequences[index]).find((point) => point.type === 'TERMINAL_START');
    }
    if (classifyCritteriumConnection(previous, current).type !== 'LINEAR') throw new Error('CRITERIUM_LAYOUT_INCOMPATIBLE_SEQUENCES');
    const target = new Vector3(...previous.position).add(new Vector3(...previous.direction).multiplyScalar(Number(separationM)));
    translateCritteriumSequence(sequences[index], target.sub(new Vector3(...current.position)).toArray());
  }
  if (findCritteriumSequenceCollisions(sequences).length) throw new Error('CRITERIUM_LAYOUT_COLLISION');
  system.userData.layout = { ...(system.userData.layout || {}), type: 'LINEAR_LAYOUT', separationM: Number(separationM), sequenceIds: [...sequenceIds] };
  return sequences;
}
