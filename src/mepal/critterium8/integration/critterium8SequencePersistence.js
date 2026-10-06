import { Group, Quaternion, Vector3 } from 'three';
import { prepareCritterium8Sequence } from './critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from './critterium8SequenceRegistration.js';
import { disposeCritterium8Sequence3D } from '../builders/Critterium8SequenceRenderBuilder.js';

import { captureCritteriumModuleOverrides } from '../composition/sequenceModuleSlots.js';
const clone = (value) => JSON.parse(JSON.stringify(value));

export function serializeCritterium8Sequence(root) {
  if (root?.userData?.kind !== 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') throw new Error('CRITTERIUM8_SEQUENCE_ROOT_REQUIRED');
  const sequence = captureCritteriumModuleOverrides(clone(root.userData.sequence), root.children
    .filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY')
    .map((frame) => ({ frameId: frame.userData.frameId, position: frame.position.toArray(), quaternion: frame.quaternion.toArray() })));
  root.updateWorldMatrix(true, false);
  return {
    kind: 'CRITTERIUM_8_SEQUENCE',
    sequenceId: root.userData.sequenceId,
    frameIds: [...root.userData.frameIds],
    junctionIds: [...root.userData.junctionIds],
    connections: clone(sequence.graph?.edges || []),
    sequence,
    transform: {
      position: root.getWorldPosition(new Vector3()).toArray(),
      quaternion: root.getWorldQuaternion(new Quaternion()).toArray(),
      scale: root.getWorldScale(new Vector3()).toArray(),
    },
  };
}

export function restoreCritterium8Sequence(entity, { scene, partsRegistry, pickables, findFrame } = {}) {
  if (entity?.kind !== 'CRITTERIUM_8_SEQUENCE') throw new Error('CRITTERIUM8_SEQUENCE_ENTITY_REQUIRED');
  const ids = entity.frameIds || [];
  if (ids.length < 2 || new Set(ids).size !== ids.length) throw new Error('CRITTERIUM_SEQUENCE_INVALID_FRAMES');
  if (partsRegistry.some(({ obj }) => obj?.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY' && obj.userData.sequenceId === entity.sequenceId)) {
    throw new Error('CRITTERIUM_SEQUENCE_DUPLICATE');
  }
  const frames = ids.map((id) => findFrame(id));
  const missingIds = ids.filter((_, index) => !frames[index] || frames[index].userData?.kind !== 'CRITTERIUM_8_ASSEMBLY');
  if (missingIds.length && Array.isArray(entity.sequence?.slots)) {
    // An incomplete modular sequence remains addressable for inspection and
    // repair. Never fabricate commercial frames or junction parts on load.
    const root = new Group();
    root.name = `CRITTERIUM_8_SEQUENCE_${entity.sequenceId}`;
    root.userData = {
      kind: 'CRITTERIUM_8_SEQUENCE_ASSEMBLY', family: 'CRITTERIUM_8',
      sequenceId: entity.sequenceId, instanceId: entity.sequenceId,
      frameIds: [...ids], junctionIds: [...(entity.junctionIds || [])],
      isAssemblyRoot: true, isPartRoot: true, selectionRoot: true, excludeFromBOM: true,
      sequence: clone(entity.sequence),
      diagnostics: missingIds.map((frameId) => ({ code: 'CRITTERIUM_MODULE_MISSING_FRAME', frameId, level: 'ERROR' })),
    };
    root.userData.sequence.slots = root.userData.sequence.slots.map((slot) =>
      missingIds.includes(slot.frameId) ? { ...slot, status: 'MISSING_FRAME' } : slot);
    scene.add(root);
    if (Array.isArray(entity.transform?.position)) root.position.fromArray(entity.transform.position);
    if (Array.isArray(entity.transform?.quaternion)) root.quaternion.fromArray(entity.transform.quaternion);
    if (Array.isArray(entity.transform?.scale)) root.scale.fromArray(entity.transform.scale);
    root.updateMatrixWorld(true);
    frames.filter(Boolean).forEach((frame) => root.attach(frame));
    registerCritterium8Sequence({ sequenceRoot: root, parent: scene, partsRegistry, pickables });
    return root;
  }
  if (missingIds.length) throw new Error(`CRITTERIUM_SEQUENCE_MISSING_FRAME:${missingIds.join(',')}`);
  if (frames.some((frame) => frame.userData.parentSequenceId)) throw new Error('CRITTERIUM_SEQUENCE_FRAME_ALREADY_ATTACHED');
  const transform = entity.transform || {};
  const staging = new Group();
  scene.add(staging);
  if (Array.isArray(transform.position)) staging.position.fromArray(transform.position);
  if (Array.isArray(transform.quaternion)) staging.quaternion.fromArray(transform.quaternion);
  if (Array.isArray(transform.scale)) staging.scale.fromArray(transform.scale);
  staging.updateMatrixWorld(true);
  frames.forEach((frame) => staging.attach(frame));
  staging.position.set(0, 0, 0);
  staging.quaternion.identity();
  staging.scale.set(1, 1, 1);
  staging.updateMatrixWorld(true);
  const prepared = prepareCritterium8Sequence({
    frameAssemblies: frames,
    options: { sequenceId: entity.sequenceId, toleranceM: entity.sequence?.metadata?.connectionToleranceM, angleToleranceDeg: entity.sequence?.metadata?.angleToleranceDeg },
    previousSequence: entity.sequence || null,
  });
  const restoreFramesOnFailure = (root = null) => {
    if (root) {
      root.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').forEach((frame) => staging.attach(frame));
      disposeCritterium8Sequence3D(root, { disposeFrames: false });
    }
    if (Array.isArray(transform.position)) staging.position.fromArray(transform.position);
    if (Array.isArray(transform.quaternion)) staging.quaternion.fromArray(transform.quaternion);
    if (Array.isArray(transform.scale)) staging.scale.fromArray(transform.scale);
    staging.updateMatrixWorld(true);
    frames.forEach((frame) => scene.attach(frame));
    scene.remove(staging);
  };
  if (!prepared.success) { restoreFramesOnFailure(); throw new Error(prepared.reason); }
  const actualJunctionIds = prepared.sequence.junctions.map((junction) => junction.id).sort();
  const savedJunctionIds = [...(entity.junctionIds || [])].sort();
  if (JSON.stringify(actualJunctionIds) !== JSON.stringify(savedJunctionIds)) {
    // The saved relation is inconsistent: do not silently manufacture different junctions.
    restoreFramesOnFailure(prepared.sequenceRoot);
    throw new Error('CRITTERIUM_SEQUENCE_MISSING_JUNCTION');
  }
  if (JSON.stringify(prepared.sequence.graph.edges) !== JSON.stringify(entity.connections || [])) {
    restoreFramesOnFailure(prepared.sequenceRoot);
    throw new Error('CRITTERIUM_SEQUENCE_CONNECTION_MISMATCH');
  }
  const root = prepared.sequenceRoot;
  scene.remove(staging);
  scene.add(root);
  if (Array.isArray(transform.position)) root.position.fromArray(transform.position);
  if (Array.isArray(transform.quaternion)) root.quaternion.fromArray(transform.quaternion);
  if (Array.isArray(transform.scale)) root.scale.fromArray(transform.scale);
  root.updateMatrixWorld(true);
  registerCritterium8Sequence({ sequenceRoot: root, parent: scene, partsRegistry, pickables });
  return root;
}
