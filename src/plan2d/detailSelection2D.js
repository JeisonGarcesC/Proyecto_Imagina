function stableId(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

export function get2DDetailKey(part) {
  const candidates = [
    ['ASSEMBLY', part?.assemblyId],
    ['ASSEMBLY', part?.parentAssemblyId],
    ['GROUP', part?.groupId],
    ['PART', part?.instanceId],
    ['PART', part?.id],
  ];
  for (const [kind, value] of candidates) {
    const id = stableId(value);
    if (id) return `${kind}:${id}`;
  }
  return null;
}

export function collectSelected2DDetailKeys(selectedIds = [], snapshot = []) {
  const selected = new Set((selectedIds || []).map(stableId).filter(Boolean));
  const keys = [];
  (snapshot || []).forEach((part) => {
    const physicalId = stableId(part?.instanceId || part?.id);
    if (!physicalId || !selected.has(physicalId)) return;
    const key = get2DDetailKey(part);
    if (key) keys.push(key);
  });
  return Array.from(new Set(keys));
}

export function is2DDetailEnabled(part, detailed2DIds) {
  const key = get2DDetailKey(part);
  return Boolean(key && detailed2DIds?.has?.(key));
}

export function updateDetailed2DIds(currentIds, keys, enabled) {
  const next = new Set(currentIds || []);
  (keys || []).map(stableId).filter(Boolean).forEach((key) => {
    if (enabled) next.add(key);
    else next.delete(key);
  });
  return next;
}
