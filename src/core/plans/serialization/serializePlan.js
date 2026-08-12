import { normalizePlanDefinition } from '../models/planDefinition.js';

export function serializePlan(plan) {
  if (!plan) return null;
  const normalized = normalizePlanDefinition(plan);
  const serialized = JSON.parse(JSON.stringify(normalized));

  if (serialized.assetId) {
    serialized.source = {
      url: serialized.source?.url?.startsWith?.('blob:') ? null : serialized.source?.url ?? null,
      dataUrl: null,
    };
  }

  return serialized;
}

export function deserializePlan(data) {
  if (!data || typeof data !== 'object') return null;
  return normalizePlanDefinition(data);
}
