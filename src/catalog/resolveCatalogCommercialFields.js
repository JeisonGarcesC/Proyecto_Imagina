export function resolveCatalogCommercialFields(code, catalogByCode, country = 'CO', fallbackDescription = '') {
  const item = catalogByCode?.get?.(String(code).trim()) || null;
  const rawPrice = Number(item?.prices?.[country]);
  return {
    found: Boolean(item),
    description: item?.ui?.title || item?.raw?.descLarga || fallbackDescription || '',
    price: Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null,
    prices: item?.prices || undefined,
  };
}
