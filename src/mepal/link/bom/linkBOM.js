export function resolveLinkBOM(product) {
  const rows = new Map();
  for (const part of product.parts.filter(part => !part.excludeFromBOM)) {
    if (!part.code) continue;
    const current = rows.get(part.code);
    if (current) current.quantity += 1;
    else rows.set(part.code, { code: part.code, description: part.description, quantity: 1, line: 'LINK' });
  }
  const billable = product.parts.filter(part => !part.excludeFromBOM);
  return { rows: [...rows.values()], status: billable.some(p => !p.code) ? 'PARTIAL' : 'BASE_COMPONENTS',
    missing: billable.filter(p => !p.code).map(p => ({ role: p.role, description: p.description })) };
}
