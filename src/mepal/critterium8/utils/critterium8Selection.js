export function isCritterium8AssemblyRoot(object) {
  return object?.userData?.kind === 'CRITTERIUM_8_ASSEMBLY';
}

export function getCritterium8AssemblyRoot(object) {
  let current = object || null;
  while (current) {
    if (isCritterium8AssemblyRoot(current)) return current;
    current = current.parent || null;
  }
  return null;
}

export function getCritterium8EditablePart(object) {
  let current = object || null;
  while (current) {
    if (current.userData?.kind === 'CRITTERIUM_8_PART' && current.userData?.isPartRoot) return current;
    if (isCritterium8AssemblyRoot(current)) return null;
    current = current.parent || null;
  }
  return null;
}
