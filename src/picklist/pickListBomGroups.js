export function appendPickListBomGroups(groups, pickRows, groupMode) {
  const byTypology = new Map();
  for (const row of pickRows) {
    const key = row.tipologiaKey || null;
    if (!byTypology.has(key)) byTypology.set(key, []);
    byTypology.get(key).push(row);
  }
  for (const [tipologiaKey, rows] of byTypology) {
    const commercialGroup = groupMode === 'typology' && tipologiaKey
      ? groups.find((group) => group.key === `T:${tipologiaKey}` ||
        group.items.some((item) => item.source !== 'PICKLIST' && item.tipologiaKey === tipologiaKey))
      : null;
    if (commercialGroup) {
      commercialGroup.items.push(...rows);
      commercialGroup.pickListTypologyKey = tipologiaKey;
      continue;
    }
    const label = tipologiaKey ? `TIPOLOGÍA - ${tipologiaKey}` : 'PICKLIST';
    groups.push({ key: `P:${tipologiaKey || 'PICKLIST'}`, label, items: rows, subtotal: 0 });
  }
  return groups;
}
