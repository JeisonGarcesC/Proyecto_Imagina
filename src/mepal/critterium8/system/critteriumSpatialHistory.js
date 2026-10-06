import { collectCritteriumSpatialDiagnostics } from './layout/CritteriumConnectionResolver.js';
import { serializeCritteriumSystem } from './critteriumSystemPersistence.js';

export function captureCritteriumSpatialState(system) {
  if (!system) return null;
  return {
    ...serializeCritteriumSystem(system),
    sequenceTransforms: Object.fromEntries(system.children
      .filter((child) => child.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY')
      .map((child) => [child.userData.sequenceId, {
        position: child.position.toArray(), quaternion: child.quaternion.toArray(), scale: child.scale.toArray(),
      }])),
  };
}

export function applyCritteriumSpatialState(system, state) {
  if (system?.userData?.kind !== 'CRITERIUM_SYSTEM' || state?.systemId !== system.userData.systemId) {
    throw new Error('CRITERIUM_SPATIAL_STATE_MISMATCH');
  }
  system.userData.connections = structuredClone(state.connections || []);
  system.userData.layout = structuredClone(state.layout || {});
  system.userData.spatialConfig = structuredClone(state.spatialConfig || system.userData.spatialConfig || {});
  system.position.fromArray(state.transform.position);
  system.quaternion.fromArray(state.transform.quaternion);
  system.scale.fromArray(state.transform.scale);
  for (const child of system.children) {
    const transform = state.sequenceTransforms?.[child.userData?.sequenceId];
    if (!transform) continue;
    child.position.fromArray(transform.position);
    child.quaternion.fromArray(transform.quaternion);
    child.scale.fromArray(transform.scale);
  }
  system.updateMatrixWorld(true);
  system.userData.spatialDiagnostics = collectCritteriumSpatialDiagnostics(system);
  return system;
}
