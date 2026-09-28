import { resolveMultipleCompositionCommercial } from './multipleCompositionResolver.js';
export function resolveMultipleProductCommercial(product) {
  const resolved = resolveMultipleCompositionCommercial(product);
  const byKey = new Map(resolved.parts.map((part) => [part.componentKey, part]));
  const composition = { ...product.composition, slots: product.composition.slots.map((slot) => {
    const part = byKey.get(slot.componentKey) || byKey.get(`tile-${slot.index}`) || byKey.get(slot.slotKey);
    return part ? { ...slot, codigoPT: part.commercial.code || null, reference: part.commercial.reference || null,
      commercialStatus: part.commercial.code ? 'RESOLVED' : 'PENDING' } : slot;
  }) };
  return { ...product, composition, parts: resolved.parts, diagnostics: [...(product.diagnostics || []), ...resolved.diagnostics] };
}
