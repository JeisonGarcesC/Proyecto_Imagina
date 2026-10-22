export function resolveSpecialVisualTargets({ activePart, activeSubMesh, editablePart, scope,
  usesKuoAVPropertyFinishes, getKuoAVSurfaceTargets, getLinkRoot, getFinishGroupTargets,
  isSurfaceEdgeMesh }) {
  if (!activePart) return [];
  if (usesKuoAVPropertyFinishes(activePart)) {
    return getKuoAVSurfaceTargets(activePart, activeSubMesh, scope).map((object) => ({ object }));
  }
  const linkRoot = getLinkRoot(activePart);
  if (linkRoot) {
    if (scope === 'ALL') return [{ object: linkRoot }];
    let component = activeSubMesh || activePart;
    while (component && component !== linkRoot && !component.userData?.componentKey
      && !(component.userData?.isPartRoot && component.parent === linkRoot)) component = component.parent;
    return [{ object: component && component !== linkRoot ? component : linkRoot }];
  }
  const root = editablePart || activePart;
  if (scope === 'GROUP') return getFinishGroupTargets(root).map((object) => ({ object }));
  const surface = root.userData?.kind === 'SURFACE' || root.userData?.type === 'superficie';
  if (scope === 'PART' && surface && isSurfaceEdgeMesh(activeSubMesh)) {
    const targets = [];
    root.traverse((node) => { if (isSurfaceEdgeMesh(node)) targets.push({ object: node, meshOnly: true }); });
    return targets;
  }
  if (scope === 'PART' && !surface && activeSubMesh?.isMesh) {
    return [{ object: activeSubMesh, meshOnly: true }];
  }
  return [{ object: root }];
}
