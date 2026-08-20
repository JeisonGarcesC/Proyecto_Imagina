import { disposeCritterium8Sequence3D } from '../builders/Critterium8SequenceRenderBuilder.js';

function isWithin(object, root) {
  let current = object;
  while (current) {
    if (current === root) return true;
    current = current.parent || null;
  }
  return false;
}

function frameAssemblies(root) {
  return (root?.children || []).filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
}

function junctionRoots(root) {
  return (root?.children || []).filter((child) => child.userData?.kind === 'CRITTERIUM_8_JUNCTION');
}

function junctionPickables(root) {
  return junctionRoots(root).flatMap((junction) => (junction.children || []).filter((child) => child.userData?.isPartRoot));
}

function setParentSequence(object, sequenceId) {
  object.traverse((child) => {
    child.userData = { ...child.userData, parentSequenceId: sequenceId || null };
  });
}

export function registerCritterium8Sequence({ sequenceRoot, parent, partsRegistry, pickables } = {}) {
  if (!sequenceRoot || sequenceRoot.userData?.kind !== 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') {
    throw new Error('CRITTERIUM8_SEQUENCE_ROOT_REQUIRED');
  }
  const sequenceId = String(sequenceRoot.userData.sequenceId || '');
  if (parent && sequenceRoot.parent !== parent) parent.add(sequenceRoot);
  frameAssemblies(sequenceRoot).forEach((frame) => setParentSequence(frame, sequenceId));
  junctionRoots(sequenceRoot).forEach((junction) => setParentSequence(junction, sequenceId));
  if (!partsRegistry.some(({ obj }) => obj === sequenceRoot)) partsRegistry.push({ code: sequenceId, obj: sequenceRoot });
  junctionPickables(sequenceRoot).forEach((object) => {
    if (!pickables.includes(object)) pickables.push(object);
  });
  return { sequenceRoot, frames: frameAssemblies(sequenceRoot), junctions: junctionRoots(sequenceRoot) };
}

export function unregisterCritterium8Sequence({
  sequenceRoot, partsRegistry, pickables, preserveFrames = false, targetParent = null, disposeFrames = !preserveFrames,
} = {}) {
  if (!sequenceRoot) return { frames: [], removed: false };
  const frames = frameAssemblies(sequenceRoot);
  if (preserveFrames) {
    const parent = targetParent || sequenceRoot.parent;
    frames.forEach((frame) => {
      if (parent?.attach) parent.attach(frame);
      else {
        sequenceRoot.remove(frame);
        parent?.add?.(frame);
      }
      setParentSequence(frame, null);
    });
  }
  for (let index = partsRegistry.length - 1; index >= 0; index -= 1) {
    const object = partsRegistry[index]?.obj;
    if (object === sequenceRoot || (!preserveFrames && isWithin(object, sequenceRoot))) partsRegistry.splice(index, 1);
  }
  for (let index = pickables.length - 1; index >= 0; index -= 1) {
    const object = pickables[index];
    if (junctionRoots(sequenceRoot).some((root) => isWithin(object, root)) || (!preserveFrames && isWithin(object, sequenceRoot))) {
      pickables.splice(index, 1);
    }
  }
  sequenceRoot.parent?.remove?.(sequenceRoot);
  disposeCritterium8Sequence3D(sequenceRoot, { disposeFrames });
  return { frames, removed: true };
}

export function replaceCritterium8Sequence({ previousRoot, nextRoot, parent, partsRegistry, pickables } = {}) {
  if (!previousRoot || !nextRoot) throw new Error('CRITTERIUM8_SEQUENCE_REPLACEMENT_REQUIRED');
  unregisterCritterium8Sequence({ sequenceRoot: previousRoot, partsRegistry, pickables, preserveFrames: false, disposeFrames: false });
  return registerCritterium8Sequence({ sequenceRoot: nextRoot, parent, partsRegistry, pickables });
}
