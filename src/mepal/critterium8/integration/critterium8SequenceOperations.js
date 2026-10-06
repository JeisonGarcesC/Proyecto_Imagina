import * as THREE from 'three';
import {
  buildCritterium8Sequences,
  resolveCritterium8FrameSequence,
} from '../connectivity/frameSequenceResolver.js';
import { resolveCritterium8SequenceJunctionParts } from '../junctions/junctionPartResolver.js';
import { buildCritterium8SequenceJunctionLayouts } from '../junctions/layout/junctionLayoutBuilder.js';
import { buildCritterium8FrameSequence3D } from '../builders/Critterium8SequenceRenderBuilder.js';
import { reconcileCritteriumModuleSlots } from '../composition/sequenceModuleSlots.js';

export function describeCritterium8FrameAssembly(assembly) {
  if (assembly?.userData?.kind !== 'CRITTERIUM_8_ASSEMBLY') return null;
  const position = assembly.getWorldPosition(new THREE.Vector3());
  const quaternion = assembly.getWorldQuaternion(new THREE.Quaternion());
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  const definition = assembly.userData.definition || {};
  const config = assembly.userData.config || {};
  return {
    frameId: String(assembly.userData.frameId || ''),
    instanceId: String(assembly.userData.instanceId || ''),
    position: { x: position.x, z: position.z },
    rotationY: rotation.y,
    widthCm: Number(definition.widthCm ?? config.widthCm),
    depthCm: Number(assembly.userData.layout?.depthCm ?? definition.thicknessCm ?? 8),
    heightCm: Number(definition.heightCm ?? config.heightCm),
    frameMode: String(definition.frameMode || config.frameMode || 'HALF_HEIGHT'),
    projectHeightCm: Number(config.projectHeightCm ?? definition.heightCm),
  };
}

function preserveJunctionOverrides(sequence, previousSequence) {
  const previousById = new Map((previousSequence?.junctions || []).map((junction) => [String(junction.id), junction]));
  const matchKey = (junction) => (junction?.endpointRefs || [])
    .map((reference) => `${String(reference.frameId)}:${String(reference.endpoint).toUpperCase()}`)
    .sort()
    .join('|');
  const previousByEndpoints = new Map((previousSequence?.junctions || []).map((junction) => [matchKey(junction), junction]));
  return {
    ...sequence,
    junctions: (sequence.junctions || []).map((junction) => {
      const previous = previousById.get(String(junction.id)) || previousByEndpoints.get(matchKey(junction));
      if (!previous) return junction;
      return {
        ...junction,
        variant: previous.variant ?? junction.variant,
        metadata: {
          ...junction.metadata,
          ...(previous.metadata?.useDuct === true ? { useDuct: true } : {}),
          ...(previous.metadata?.explicitVariant ? { explicitVariant: previous.metadata.explicitVariant } : {}),
        },
      };
    }),
    metadata: { ...(sequence.metadata || {}), dirtyConnections: false, dirtyJunctions: false },
  };
}

export function prepareCritterium8Sequence({ frameAssemblies = [], options = {}, previousSequence = null } = {}) {
  const uniqueFrames = Array.from(new Set(frameAssemblies.filter(Boolean)));
  if (uniqueFrames.length < 2) return { success: false, reason: 'CRITTERIUM8_SEQUENCE_REQUIRES_TWO_FRAMES' };
  if (uniqueFrames.some((frame) => frame.userData?.kind !== 'CRITTERIUM_8_ASSEMBLY')) {
    return { success: false, reason: 'CRITTERIUM8_FRAME_ASSEMBLY_REQUIRED' };
  }
  const incompatible = uniqueFrames.find((frame) => frame.userData?.parentSequenceId && frame.userData.parentSequenceId !== options.sequenceId);
  if (incompatible) return { success: false, reason: 'FRAME_ALREADY_BELONGS_TO_SEQUENCE', frameId: incompatible.userData.frameId };
  const frames = uniqueFrames.map(describeCritterium8FrameAssembly);
  const components = buildCritterium8Sequences(frames, options);
  if (components.length !== 1 || components[0].frameIds.length !== frames.length) {
    return { success: false, reason: 'FRAMES_NOT_CONNECTED' };
  }
  let sequence = resolveCritterium8FrameSequence(frames, options).sequence;
  sequence = preserveJunctionOverrides(sequence, previousSequence);
  sequence = reconcileCritteriumModuleSlots(sequence, frames, previousSequence);
  const resolution = resolveCritterium8SequenceJunctionParts({ sequence, frames });
  const layouts = buildCritterium8SequenceJunctionLayouts({ sequence, frames, resolutions: resolution.results });
  const sequenceRoot = buildCritterium8FrameSequence3D({
    sequence,
    frameInstances: uniqueFrames,
    junctionResolutions: resolution.results,
    junctionLayouts: layouts.layouts,
  });
  return {
    success: true, sequenceRoot, sequence, frames,
    junctionResolutions: resolution.results,
    junctionLayouts: layouts.layouts,
    diagnostics: [...(sequence.diagnostics || []), ...(resolution.diagnostics || []), ...(layouts.diagnostics || [])],
  };
}

export function prepareCritterium8SequenceRebuild(sequenceRoot, options = {}) {
  if (sequenceRoot?.userData?.kind !== 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') {
    return { success: false, reason: 'CRITTERIUM8_SEQUENCE_ROOT_REQUIRED' };
  }
  const frames = (sequenceRoot.children || []).filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
  let sceneRoot = sequenceRoot;
  while (sceneRoot.parent) sceneRoot = sceneRoot.parent;
  const staging = new THREE.Group();
  sceneRoot.add(staging);
  staging.position.copy(sequenceRoot.getWorldPosition(new THREE.Vector3()));
  staging.quaternion.copy(sequenceRoot.getWorldQuaternion(new THREE.Quaternion()));
  staging.scale.copy(sequenceRoot.getWorldScale(new THREE.Vector3()));
  staging.updateMatrixWorld(true);
  frames.forEach((frame) => staging.attach(frame));
  staging.position.set(0, 0, 0);
  staging.quaternion.identity();
  staging.scale.set(1, 1, 1);
  staging.updateMatrixWorld(true);
  try {
    const prepared = prepareCritterium8Sequence({
      frameAssemblies: frames,
      options: { ...options, sequenceId: sequenceRoot.userData.sequenceId },
      previousSequence: sequenceRoot.userData.sequence,
    });
    if (prepared.success) {
      prepared.sequenceRoot.position.copy(sequenceRoot.position);
      prepared.sequenceRoot.quaternion.copy(sequenceRoot.quaternion);
      prepared.sequenceRoot.scale.copy(sequenceRoot.scale);
      prepared.sequenceRoot.updateMatrixWorld(true);
    } else {
      staging.position.copy(sequenceRoot.getWorldPosition(new THREE.Vector3()));
      staging.quaternion.copy(sequenceRoot.getWorldQuaternion(new THREE.Quaternion()));
      staging.scale.copy(sequenceRoot.getWorldScale(new THREE.Vector3()));
      staging.updateMatrixWorld(true);
      frames.forEach((frame) => sequenceRoot.attach(frame));
    }
    return prepared;
  } catch (error) {
    staging.position.copy(sequenceRoot.getWorldPosition(new THREE.Vector3()));
    staging.quaternion.copy(sequenceRoot.getWorldQuaternion(new THREE.Quaternion()));
    staging.scale.copy(sequenceRoot.getWorldScale(new THREE.Vector3()));
    staging.updateMatrixWorld(true);
    frames.filter((frame) => frame.parent === staging).forEach((frame) => sequenceRoot.attach(frame));
    throw error;
  } finally {
    sceneRoot.remove(staging);
  }
}

export function validateFrameAdditionToCritterium8Sequence(sequenceRoot, frameAssembly, options = {}) {
  if (!sequenceRoot || frameAssembly?.userData?.kind !== 'CRITTERIUM_8_ASSEMBLY') {
    return { success: false, reason: 'CRITTERIUM8_FRAME_ASSEMBLY_REQUIRED' };
  }
  const existing = (sequenceRoot.children || []).filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
  const frames = [...existing, frameAssembly].map(describeCritterium8FrameAssembly);
  const components = buildCritterium8Sequences(frames, options);
  if (components.length !== 1) return { success: false, reason: 'FRAME_NOT_CONNECTED_TO_SEQUENCE' };
  return { success: true, frameAssemblies: [...existing, frameAssembly] };
}

export function partitionCritterium8Frames(frameAssemblies = [], options = {}) {
  const byId = new Map(frameAssemblies.map((frame) => [String(frame.userData?.frameId), frame]));
  return buildCritterium8Sequences(frameAssemblies.map(describeCritterium8FrameAssembly), options).map((sequence) => ({
    sequence,
    frameAssemblies: sequence.frameIds.map((id) => byId.get(String(id))).filter(Boolean),
    shouldCreateSequence: sequence.frameIds.length > 1,
  }));
}
