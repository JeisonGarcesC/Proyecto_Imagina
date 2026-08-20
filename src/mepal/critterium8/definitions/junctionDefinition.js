import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';
import { isCritterium8JunctionType } from '../catalog/junctionCatalog.js';

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

export function createCritterium8JunctionId(sequenceId, endpointRefs = []) {
  const identity = endpointRefs
    .map((reference) => `${reference.frameId}:${reference.endpoint}`)
    .sort()
    .join('|');
  return `C8_JUNCTION_${String(sequenceId)}_${stableHash(identity || 'EMPTY')}`;
}

export function createCritterium8JunctionDefinition(options = {}) {
  const endpointRefs = Array.isArray(options.endpointRefs)
    ? options.endpointRefs.map((reference) => ({
        frameId: String(reference.frameId),
        endpoint: String(reference.endpoint).toUpperCase(),
      }))
    : [];
  const type = String(options.type || '').toUpperCase();
  return {
    schemaVersion: 1,
    id: String(options.id || createCritterium8JunctionId(options.sequenceId, endpointRefs)),
    family: CRITTERIUM8_FAMILY,
    type: isCritterium8JunctionType(type) ? type : null,
    point: {
      x: Number(options.point?.x ?? 0),
      z: Number(options.point?.z ?? 0),
    },
    frameIds: [...new Set(endpointRefs.map((reference) => reference.frameId))].sort(),
    endpointRefs,
    angles: Array.isArray(options.angles) ? options.angles.map(Number) : [],
    variant: options.variant ?? null,
    metadata: options.metadata && typeof options.metadata === 'object'
      ? { ...options.metadata }
      : {},
  };
}
