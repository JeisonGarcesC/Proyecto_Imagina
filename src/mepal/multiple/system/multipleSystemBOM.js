const keyOf = (row) => [row.codigoPT || row.code || 'PENDING', row.reference || '', row.description || '', row.material || '', row.finish || '', row.currency || ''].join('|');

export function resolveMultipleSystemBOM(products = []) {
  const grouped = new Map();
  for (const product of products) for (const row of product?.userData?.bom || []) {
    const key = keyOf(row); const current = grouped.get(key);
    if (current) { current.quantity += Number(row.quantity || 1); current.moduleIds.push(product.userData.moduleId); }
    else grouped.set(key, { ...structuredClone(row), quantity: Number(row.quantity || 1), moduleIds: [product.userData.moduleId] });
  }
  const rows = [...grouped.values()]; const missing = rows.filter((row) => row.pending || !(row.codigoPT || row.code));
  return { rows, missing, status: missing.length ? 'PARTIAL' : 'COMPLETE' };
}
