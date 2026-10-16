import { applyMaterialToObject3D } from '../../../materials/applyMaterial.js';

export function usesKuoAVPropertyFinishes(part) {
  for (let node = part; node; node = node.parent) {
    const data = node.userData || node;
    if (['KUO_AV_ASSEMBLY', 'KUO_AV_DOBLE_ASSEMBLY'].includes(data.kind)) return true;
    const ids = [data.instanceId, data.parentAssemblyId];
    if (ids.some((id) => typeof id === 'string' && /^(KUOAV_|KUOAVD_)/.test(id))) {
      return true;
    }
  }
  return false;
}

export function applyKuoAVMaterialFinish(material, color, grommetFinish = null) {
  if (!material.color) return;
  const normalized = String(color || '').trim().toUpperCase();
  const hex = normalized === 'NEGRO' || normalized === 'BLACK'
    ? 0x1e1e1e
    : normalized === 'GRIS' ? 0x707070
    : typeof color === 'string' && color.startsWith('#') ? Number.parseInt(color.slice(1), 16)
    : 0xffffff;
  material.color.setHex(hex);
  material.roughness = 0.35;
  material.metalness = 0.1;
  if (grommetFinish !== null) {
    const anodized = ['ALUMINIUM', 'ALUMINIO', 'ANODIZADO'].includes(
      String(grommetFinish).trim().toUpperCase()
    );
    material.roughness = anodized ? 0.2 : 0.35;
    material.metalness = anodized ? 0.9 : 0.1;
  }
  material.needsUpdate = true;
}
export function getKuoAVSurfaceTargets(part, subMesh = null, scope = 'PART') {
  let root = part;
  while (root && !['KUO_AV_ASSEMBLY', 'KUO_AV_DOBLE_ASSEMBLY'].includes(root.userData?.kind)) {
    root = root.parent;
  }
  if (!root) return [];
  const surfaces = root.children.filter((child) =>
    child.userData?.isKuoSurface || child.userData?.type === 'superficie');
  if (scope !== 'PART') return surfaces;
  for (let node = subMesh || part; node && node !== root; node = node.parent) {
    if (surfaces.includes(node)) return [node];
  }
  return part === root ? surfaces : [];
}

export function restoreKuoAVSurfaceFinish(surface, config) {
  const finish = config.surfaceFinishes?.[surface.userData.role];
  if (finish) applyMaterialToObject3D(surface, finish.materialCode, finish.materialDef);
}
