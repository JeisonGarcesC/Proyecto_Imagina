import { normalizeColumnDefinition } from './columnDefinition.js';

function resolveColumns(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.columns)) return data.columns;
  if (Array.isArray(data?.architecture?.columns)) return data.architecture.columns;
  return [];
}

export function serializeColumns(columns) {
  return resolveColumns(columns).map(normalizeColumnDefinition).filter(Boolean).map((column) => JSON.parse(JSON.stringify(column)));
}

export function deserializeColumns(data) {
  return resolveColumns(data).map(normalizeColumnDefinition).filter(Boolean);
}
