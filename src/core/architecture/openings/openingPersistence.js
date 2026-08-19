import { normalizeDoorDefinition } from './doorDefinition.js';

function source(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.openings)) return data.openings;
  if (Array.isArray(data?.architecture?.openings)) return data.architecture.openings;
  return [];
}

export function serializeOpenings(openings) {
  return source(openings).map(normalizeDoorDefinition).filter(Boolean).map((opening) => JSON.parse(JSON.stringify(opening)));
}

export function deserializeOpenings(data) {
  return serializeOpenings(source(data));
}
