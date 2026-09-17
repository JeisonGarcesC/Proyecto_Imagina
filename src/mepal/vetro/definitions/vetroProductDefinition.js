export function createVetroProductDefinition(resolved = {}) {
  return {
    schemaVersion: 1,
    family: 'VETRO',
    productType: resolved.productType,
    category: resolved.category,
    subcategory: resolved.subcategory,
    commercial: resolved.commercial ? { ...resolved.commercial } : null,
    panelMaterial: resolved.panelMaterial ? { ...resolved.panelMaterial } : null,
    profileFinish: resolved.profileFinish ? { ...resolved.profileFinish } : null,
    dimensions: resolved.dimensions ? JSON.parse(JSON.stringify(resolved.dimensions)) : null,
    codeResolution: resolved.codeResolution ? { ...resolved.codeResolution } : null,
    model: resolved.model ? { ...resolved.model } : { kind: null, src: null },
    options: resolved.options ? { ...resolved.options } : {},
    diagnostics: Array.isArray(resolved.diagnostics) ? resolved.diagnostics.map((item) => ({ ...item })) : [],
  };
}
