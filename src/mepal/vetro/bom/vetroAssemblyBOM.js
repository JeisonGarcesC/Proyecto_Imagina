// Commercial members are read from the physical assembly so future door members
// can contribute their own documented SKU without billing the assembly root.
export function getVetroAssemblyCommercialMembers(assembly) {
  if (assembly?.userData?.kind !== 'VETRO_ASSEMBLY') return [];
  const seen = new Set();
  return assembly.children.flatMap((member) => {
    const data = member.userData || {};
    const code = String(data.codigoPT || data.code || '').trim();
    const id = data.instanceId || member.uuid;
    if (data.kind !== 'VETRO_PRODUCT' || data.excludeFromBOM || !code || seen.has(id)) return [];
    seen.add(id);
    return [{ code, instanceId: id, productType: data.config?.productType || null, quantity: 1 }];
  });
}
