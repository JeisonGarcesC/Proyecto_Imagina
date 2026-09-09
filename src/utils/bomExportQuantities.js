export function resolveBomExportQuantities(aggregatedQty, typologyCount, isTypologyGroup) {
  const quantity = Number(aggregatedQty || 0);
  const typologies = isTypologyGroup ? Math.max(1, Number(typologyCount || 1)) : 0;

  return {
    quantity,
    typologies,
    totalQuantity: quantity,
  };
}
