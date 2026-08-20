import { disposeCritterium8FrameAssembly3D } from '../renderers/Critterium8FrameRenderer3D.js';

function isWithin(object, root) {
  let current = object;
  while (current) {
    if (current === root) return true;
    current = current.parent || null;
  }
  return false;
}

export function getCritterium8PhysicalPartRoots(assembly) {
  return (assembly?.children || []).filter((child) => child.userData?.kind === 'CRITTERIUM_8_PART' && child.userData?.isPartRoot);
}

export function registerCritterium8Instance({ instance, parent, partsRegistry, pickables } = {}) {
  const assembly = instance?.assembly;
  if (!assembly) throw new Error('CRITTERIUM8_ASSEMBLY_REQUIRED');
  parent?.add?.(assembly);
  partsRegistry.push({ code: assembly.userData.instanceId, obj: assembly });
  const physicalParts = getCritterium8PhysicalPartRoots(assembly);
  physicalParts.forEach((object) => {
    partsRegistry.push({ code: object.userData?.code || object.userData?.partId, obj: object });
    pickables.push(object);
  });
  return { assembly, physicalParts };
}

export function unregisterCritterium8Instance({ assembly, partsRegistry, pickables, dispose = true } = {}) {
  if (!assembly) return false;
  for (let index = partsRegistry.length - 1; index >= 0; index -= 1) {
    if (isWithin(partsRegistry[index]?.obj, assembly)) partsRegistry.splice(index, 1);
  }
  for (let index = pickables.length - 1; index >= 0; index -= 1) {
    if (isWithin(pickables[index], assembly)) pickables.splice(index, 1);
  }
  assembly.parent?.remove?.(assembly);
  if (dispose) disposeCritterium8FrameAssembly3D(assembly);
  return true;
}
