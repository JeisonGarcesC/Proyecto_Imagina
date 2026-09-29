const rowKey = (row) => [row.codigoPT || 'PENDING', row.description, row.reference || '', row.material || '', row.finish || ''].join('|');

export function resolveMultipleBOM(product) {
  const grouped = new Map();
  for (const part of product.parts.filter((entry) => entry.commercial.includeInBOM !== false)) {
    const codigoPT = part.commercial.code || null;
    const row = { codigoPT, code: codigoPT, reference: part.commercial.reference || null,
      description: part.commercial.description, quantity: 1, componentKeys: [part.componentKey], componentKey: part.componentKey,
      componentRole: part.componentRole, material: part.commercial.material || part.visual?.materialRole || null,
      finish: part.commercial.finish || null, price: part.commercial.price ?? null, currency: part.commercial.currency || null,
      status: codigoPT ? 'RESOLVED' : 'PENDING',
      pending: !codigoPT, reason: codigoPT ? null : 'CODE_NOT_DOCUMENTED' };
    const key = rowKey(row); const previous = grouped.get(key);
    if (previous) { previous.quantity += 1; previous.componentKeys.push(part.componentKey); }
    else grouped.set(key, row);
  }
  const rows = [...grouped.values()];
  const missing = rows.filter((row) => row.pending).flatMap((row) => row.componentKeys);
  return { rows, missing, status: missing.length ? 'PARTIAL' : 'COMPLETE' };
}
