export const PICKLIST_HISTORY_TYPE = 'PICKLIST_CHANGE';

export function createPickListItem(input, id = globalThis.crypto?.randomUUID?.()) {
  const codigo = String(input?.codigo ?? input?.code ?? '').trim();
  const descripcion = String(input?.descripcion ?? input?.description ?? '').trim();
  const tipologiaKey = String(input?.tipologiaKey ?? input?.tipologia ?? '').trim() || null;
  if (!codigo) throw new Error('Falta código.');
  if (!descripcion) throw new Error('Falta descripción.');
  const rawQuantity = input?.cantidad ?? input?.qty;
  const cantidad = rawQuantity === undefined || rawQuantity === null || String(rawQuantity).trim() === ''
    ? 1 : Number(String(rawQuantity).replace(',', '.'));
  if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error('Cantidad debe ser positiva.');
  const rawPrice = input?.precio ?? input?.unitPrice;
  const precio = rawPrice === undefined || rawPrice === null || String(rawPrice).trim() === ''
    ? null : Number(String(rawPrice).replace(',', '.'));
  if (precio !== null && (!Number.isFinite(precio) || precio < 0)) throw new Error('Precio inválido.');
  return { id: id || `picklist_${Date.now()}_${Math.random().toString(36).slice(2)}`, codigo, descripcion, cantidad, precio, tipologiaKey };
}

export function normalizePickListCode(code) {
  return String(code ?? '').trim().toLocaleUpperCase('es');
}

export function addPickListItem(items, input) {
  const item = createPickListItem(input);
  if (items.some((row) => normalizePickListCode(row.codigo) === normalizePickListCode(item.codigo)))
    throw new Error(`El código ${item.codigo} ya existe en PickList.`);
  return [...items, item];
}

export function updatePickListItem(items, id, patch) {
  const previous = items.find((item) => item.id === id);
  if (!previous) throw new Error('La línea PickList no existe.');
  const updated = createPickListItem({ ...previous, ...patch }, id);
  if (items.some((row) => row.id !== id && normalizePickListCode(row.codigo) === normalizePickListCode(updated.codigo)))
    throw new Error(`El código ${updated.codigo} ya existe en PickList.`);
  return items.map((item) => item.id === id ? updated : item);
}

export function pickListBomRows(items) {
  return items.map((item) => ({
    id: item.id, source: 'PICKLIST', tipologiaKey: item.tipologiaKey || null,
    category: 'PICKLIST',
    hideCategoryHeading: true,
    groupId: item.tipologiaKey ? `PICKLIST:${item.tipologiaKey}` : 'PICKLIST',
    groupName: item.tipologiaKey ? `TIPOLOGÍA - ${item.tipologiaKey}` : 'PICKLIST',
    code: item.codigo, description: item.descripcion, qty: item.cantidad,
    unitPrice: item.precio, price: item.precio, total: item.precio === null ? null : item.cantidad * item.precio,
    priceAvailability: { CO: item.precio !== null, EUC: item.precio !== null, USD: item.precio !== null },
  }));
}

export function restorePickList(items) {
  const restored = [];
  for (const raw of Array.isArray(items) ? items : []) {
    try {
      const item = createPickListItem(raw, raw?.id);
      if (!restored.some((row) => normalizePickListCode(row.codigo) === normalizePickListCode(item.codigo))) restored.push(item);
    } catch { /* Ignore invalid project data. */ }
  }
  return restored;
}
