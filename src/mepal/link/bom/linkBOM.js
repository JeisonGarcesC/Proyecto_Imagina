export function resolveLinkBOM(product) {
  const rows = new Map();
  for (const part of product.parts.filter(part => !part.excludeFromBOM)) {
    if (!part.code) continue;
    const current = rows.get(part.code);
    if (current) current.quantity += 1;
    else rows.set(part.code, { code: part.code, description: part.description, quantity: 1, line: 'LINK' });
  }
  // Componentes de BOM sin geometría 3D (p. ej. pie de amigo bajo la superficie de integración).
  for (const extra of product.bomExtras || []) {
    if (!extra.code) continue;
    const current = rows.get(extra.code);
    if (current) current.quantity += extra.quantity;
    else rows.set(extra.code, { code: extra.code, description: extra.description, quantity: extra.quantity, line: 'LINK' });
  }
  const billable = product.parts.filter(part => !part.excludeFromBOM);
  return { rows: [...rows.values()], status: billable.some(p => !p.code) ? 'PARTIAL' : 'BASE_COMPONENTS',
    missing: billable.filter(p => !p.code).map(p => ({ role: p.role, description: p.description })) };
}
