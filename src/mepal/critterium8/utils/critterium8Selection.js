export function isCritterium8AssemblyRoot(object) {
  return object?.userData?.kind === 'CRITTERIUM_8_ASSEMBLY';
}

export function isCritterium8SequenceRoot(object) {
  return object?.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY';
}

export function getCritterium8SequenceRoot(object) {
  let current = object || null;
  while (current) {
    if (isCritterium8SequenceRoot(current)) return current;
    current = current.parent || null;
  }
  return null;
}

export function getCritterium8AssemblyRoot(object) {
  let current = object || null;
  while (current) {
    if (isCritterium8AssemblyRoot(current)) return current;
    current = current.parent || null;
  }
  return null;
}

export function getCritterium8FrameAssembly(object) {
  return getCritterium8AssemblyRoot(object);
}

export function getCritterium8JunctionRoot(object) {
  let current = object || null;
  while (current) {
    if (current.userData?.kind === 'CRITTERIUM_8_JUNCTION') return current;
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

export function getCritterium8EditableTarget(object) {
  return getCritterium8JunctionRoot(object) || getCritterium8EditablePart(object) || getCritterium8FrameAssembly(object);
}
