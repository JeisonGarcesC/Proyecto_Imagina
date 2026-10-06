const normalize = (value) => String(value ?? '').trim() || null;
const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function buildCritteriumQuotation({ systemId, bom, catalogByCode = new Map(), priceCatalog,
  office = {}, previousSnapshot = null, generatedAt = null } = {}) {
  if (!systemId || !bom || !Array.isArray(bom.rows)) throw new Error('CRITERIUM_QUOTATION_BOM_REQUIRED');
  const grouped = new Map();
  const diagnostics = [...(bom.diagnostics || [])];
  for (const row of bom.rows) {
    const code = normalize(row.code);
    const reference = normalize(row.reference);
    const catalogItem = code ? catalogByCode.get(code) : null;
    const materialCommercial = normalize(row.materialCode || catalogItem?.raw?.material);
    const finishCommercial = normalize(row.finishCode);
    const description = row.description || catalogItem?.ui?.title || code || 'Componente sin código';
    const category = row.category || 'CRITTERIUM_8';
    const key = JSON.stringify([category, code, reference, description, materialCommercial, finishCommercial]);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += Number(row.qty || 0);
      if (row.sourceId && !existing.sourceIds.includes(row.sourceId)) existing.sourceIds.push(row.sourceId);
      continue;
    }
    grouped.set(key, { code, reference, description,
      quantity: Number(row.qty || 0), materialCommercial, finishCommercial,
      materialSource: row.materialCode ? 'BOM' : materialCommercial ? 'PTSINBOM' : null,
      finishStatus: finishCommercial ? 'FINISH_UNCONFIRMED' : 'NO_DATA',
      category, sourceIds: row.sourceId ? [row.sourceId] : [] });
  }
  const unresolved = (bom.diagnostics || []).filter((item) =>
    ['MISSING_DOCUMENTED_CODE', 'MISSING_DOCUMENTED_FRAME_CODE', 'MISSING_DOCUMENTED_JUNCTION_CODE'].includes(item.code));
  for (const item of unresolved) grouped.set(`UNRESOLVED:${item.frameId || item.junctionId || item.sequenceId}:${item.partId || item.partType || item.code}`,
    { code: null, reference: null, description: `${item.partType || 'Componente'} sin código comercial documentado`,
      quantity: 1, materialCommercial: null, finishCommercial: null, materialSource: null,
      finishStatus: 'NO_DATA', category: 'CRITTERIUM_8', sourceIds: [item.frameId || item.junctionId || item.sequenceId].filter(Boolean) });
  const items = [...grouped.values()].map((item) => {
    const price = item.code ? priceCatalog?.entries?.get(item.code) : null;
    const commercialStatus = !item.code ? 'NO_COMMERCIAL_CODE' : price?.ambiguous ? 'COMMERCIAL_AMBIGUOUS'
      : Number.isFinite(price?.unitPrice) && price.unitPrice > 0 ? 'PRICED' : 'CODE_WITHOUT_PRICE';
    const unitPrice = commercialStatus === 'PRICED' ? price.unitPrice : null;
    return { ...item, unitPrice, subtotal: unitPrice == null ? null : money(item.quantity * unitPrice), commercialStatus,
      priceSource: unitPrice == null ? null : price.source };
  });
  for (const item of items) if (item.commercialStatus !== 'PRICED')
    diagnostics.push({ code: item.commercialStatus, itemCode: item.code, sourceIds: item.sourceIds });
  for (const item of items) if (item.finishCommercial)
    diagnostics.push({ code: 'FINISH_UNCONFIRMED', level: 'WARNING', itemCode: item.code, finishCode: item.finishCommercial });
  diagnostics.push({ code: 'CRITERIUM_FINISH_CATALOG_LIMITED', level: 'INFO' });
  diagnostics.push({ code: 'CRITERIUM_DOOR_NOT_DOCUMENTED', level: 'INFO' });
  const currency = normalize(priceCatalog?.currency);
  if (!currency) diagnostics.push({ code: 'CURRENCY_UNCONFIRMED', source: priceCatalog?.source || null });
  const subtotal = money(items.reduce((sum, item) => sum + (item.subtotal || 0), 0));
  const currentSnapshot = { currency, items: items.map((item) => ({ code: item.code, reference: item.reference,
    description: item.description, materialCommercial: item.materialCommercial, finishCommercial: item.finishCommercial,
    quantity: item.quantity, unitPrice: item.unitPrice })) };
  if (previousSnapshot) {
    if (previousSnapshot.currency && currency && previousSnapshot.currency !== currency)
      diagnostics.push({ code: 'COMMERCIAL_CURRENCY_CHANGED', previousCurrency: previousSnapshot.currency, currentCurrency: currency });
    const oldCodes = (previousSnapshot.items || []).map((item) => item.code).sort();
    const nextCodes = currentSnapshot.items.map((item) => item.code).sort();
    if (JSON.stringify(oldCodes) !== JSON.stringify(nextCodes)) diagnostics.push({ code: 'COMMERCIAL_CODE_CHANGED' });
    const dimensions = ['reference', 'description', 'materialCommercial', 'finishCommercial'];
    for (const dimension of dimensions) {
      const before = (previousSnapshot.items || []).map((item) => JSON.stringify([item.code, item[dimension] ?? null])).sort();
      const after = currentSnapshot.items.map((item) => JSON.stringify([item.code, item[dimension] ?? null])).sort();
      if (JSON.stringify(before) !== JSON.stringify(after))
        diagnostics.push({ code: 'COMMERCIAL_METADATA_CHANGED', dimension });
    }
    for (const item of currentSnapshot.items) {
      const exact = (previousSnapshot.items || []).find((candidate) =>
        candidate.code === item.code && candidate.reference === item.reference &&
        candidate.description === item.description && candidate.materialCommercial === item.materialCommercial && candidate.finishCommercial === item.finishCommercial);
      const sameCode = (previousSnapshot.items || []).filter((candidate) => candidate.code === item.code);
      const previous = exact || (sameCode.length === 1 && currentSnapshot.items.filter((candidate) => candidate.code === item.code).length === 1 ? sameCode[0] : null);
      if (previous && previousSnapshot.currency === currency && previous.unitPrice !== item.unitPrice)
        diagnostics.push({ code: 'COMMERCIAL_CATALOG_CHANGED', itemCode: item.code,
          previousUnitPrice: previous.unitPrice, currentUnitPrice: item.unitPrice });
    }
  }
  const pricedCount = items.filter((item) => item.commercialStatus === 'PRICED').length;
  const complete = items.length > 0 && pricedCount === items.length && Boolean(currency) && !diagnostics.some((item) =>
    item.level === 'ERROR' || ['COMMERCIAL_AMBIGUOUS', 'COMMERCIAL_CODE_CHANGED', 'COMMERCIAL_METADATA_CHANGED'].includes(item.code));
  return { kind: 'CRITERIUM_QUOTATION', systemId, generatedAt, currency, currencySource: priceCatalog?.source || null,
    items, subtotal, total: subtotal, tax: null, status: complete ? 'CONFIGURATION_COMPLETE' : 'CONFIGURATION_INCOMPLETE',
    isPartial: !complete, diagnostics, snapshot: currentSnapshot,
    office: { sequenceCount: office.sequenceCount || 0, moduleCount: office.moduleCount || 0,
      frameCount: office.frameCount ?? office.moduleCount ?? 0, connectionCount: office.connectionCount || 0,
      doorCount: office.doorCount || 0,
      lengthM: office.lengthM ?? null, closedLoopCount: office.closedLoopCount || 0,
      componentCount: items.reduce((sum, item) => sum + item.quantity, 0),
      referenceCount: new Set(items.map((item) => item.reference).filter(Boolean)).size,
      pricedCount, unpricedCount: items.length - pricedCount } };
}

export function exportCritteriumQuotationJson(quotation) {
  if (quotation?.kind !== 'CRITERIUM_QUOTATION') throw new Error('CRITERIUM_QUOTATION_REQUIRED');
  return JSON.stringify(quotation, null, 2);
}
