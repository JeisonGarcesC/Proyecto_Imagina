import { createCritterium8Instance } from '../factories/createCritterium8Instance.js';
import { disposeCritterium8FrameAssembly3D } from '../renderers/Critterium8FrameRenderer3D.js';
import { resolveCritterium8ConfigPatch } from './critterium8Config.js';

export async function rebuildCritterium8Instance({ assembly, patch = {}, createInstance = createCritterium8Instance } = {}) {
  if (assembly?.userData?.kind !== 'CRITTERIUM_8_ASSEMBLY') {
    return { success: false, reason: 'CRITTERIUM8_ASSEMBLY_REQUIRED', diagnostics: [] };
  }
  const resolved = resolveCritterium8ConfigPatch({ config: assembly.userData.config, patch, frameId: assembly.userData.frameId });
  if (!resolved.success) return resolved;

  let instance;
  try {
    instance = await createInstance({
      ...resolved.config,
      instanceId: assembly.userData.instanceId,
      assemblyId: assembly.userData.assemblyId,
      groupId: assembly.userData.groupId,
      frameId: assembly.userData.frameId,
      transform: {
        position: assembly.position.toArray(),
        quaternion: assembly.quaternion.toArray(),
        scale: assembly.scale.toArray(),
      },
    });
  } catch (error) {
    return { success: false, reason: error?.message || 'REBUILD_FAILED', diagnostics: resolved.diagnostics, error };
  }
  const errors = (instance.diagnostics || []).filter((item) => item.level === 'ERROR');
  if (errors.length) {
    disposeCritterium8FrameAssembly3D(instance.assembly);
    return { success: false, reason: errors[0].code, diagnostics: [...resolved.diagnostics, ...errors] };
  }
  return { success: true, instance, config: resolved.config, diagnostics: resolved.diagnostics };
}
