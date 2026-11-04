// Project-created assembly roots are the source of truth for PickList typologies.
// Catalog categories and commercial product families are intentionally excluded.
const PROJECT_TYPOLOGY_KINDS = new Set(['KONCISA_PLUS_ASSEMBLY', 'MILA_ASSEMBLY']);

export function selectProjectTypologyKeys(objects = []) {
  return Array.from(new Set(objects.flatMap((object) => {
    const data = object?.userData;
    const key = String(data?.groupId || '').trim();
    return PROJECT_TYPOLOGY_KINDS.has(data?.kind) && key ? [key] : [];
  }))).sort((a, b) => a.localeCompare(b, 'es'));
}

export function resolvePickListTypology(value, keys = []) {
  const requested = String(value || '').trim();
  return keys.find((key) => key === requested) || null;
}
