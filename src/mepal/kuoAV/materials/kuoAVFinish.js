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
