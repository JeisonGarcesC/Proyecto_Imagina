import {
  addSequenceToCritteriumSystem,
  connectCritteriumSystemSequences,
  createCritteriumSystem,
  registerCritteriumSystem,
} from './critteriumSystem.js';
import { collectCritteriumSpatialDiagnostics } from './layout/CritteriumConnectionResolver.js';

const clone = (value) => structuredClone(value);

export function serializeCritteriumSystem(system) {
  if (system?.userData?.kind !== 'CRITERIUM_SYSTEM') throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  const sequenceIds = system.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY').map((child) => child.userData.sequenceId);
  if (JSON.stringify(sequenceIds) !== JSON.stringify(system.userData.sequenceIds)) throw new Error('CRITERIUM_SYSTEM_SEQUENCE_MISMATCH');
  return {
    kind: 'CRITERIUM_SYSTEM', systemId: system.userData.systemId,
    sequenceIds, connections: clone(system.userData.connections || []), layout: clone(system.userData.layout || {}),
    spatialConfig: clone(system.userData.spatialConfig || {}),
    transform: { position: system.position.toArray(), quaternion: system.quaternion.toArray(), scale: system.scale.toArray() },
  };
}

export function restoreCritteriumSystem(entity, { scene, partsRegistry, findSequence } = {}) {
  if (entity?.kind !== 'CRITERIUM_SYSTEM') throw new Error('CRITERIUM_SYSTEM_ENTITY_REQUIRED');
  if (!entity.systemId || !Array.isArray(entity.sequenceIds) || new Set(entity.sequenceIds).size !== entity.sequenceIds.length) throw new Error('CRITERIUM_SYSTEM_INVALID_SEQUENCE_IDS');
  const sequences = entity.sequenceIds.map((id) => findSequence(id));
  if (sequences.some((sequence) => !sequence)) throw new Error(`CRITERIUM_SYSTEM_MISSING_SEQUENCE:${entity.sequenceIds.filter((_, index) => !sequences[index]).join(',')}`);
  if (sequences.some((sequence) => sequence.userData.parentSystemId)) throw new Error('CRITERIUM_SYSTEM_SEQUENCE_ALREADY_ATTACHED');
  const system = createCritteriumSystem({ systemId: entity.systemId, layout: entity.layout, spatialConfig: entity.spatialConfig, transform: entity.transform });
  scene.add(system);
  try {
    sequences.forEach((sequence) => addSequenceToCritteriumSystem(system, sequence));
    (entity.connections || []).forEach((connection) => connectCritteriumSystemSequences(system, connection));
    system.userData.spatialDiagnostics = collectCritteriumSpatialDiagnostics(system);
    registerCritteriumSystem({ system, scene, partsRegistry });
    return system;
  } catch (error) {
    sequences.forEach((sequence) => {
      if (sequence.parent === system) scene.attach(sequence);
      delete sequence.userData.parentSystemId;
    });
    scene.remove(system);
    throw error;
  }
}
