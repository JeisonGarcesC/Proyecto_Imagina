import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';

export function createCritterium8FrameSequenceDefinition(options = {}) {
  const frameIds = Array.isArray(options.frameIds)
    ? options.frameIds.map(String).filter(Boolean)
    : [];
  return {
    schemaVersion: 1,
    id: String(options.id || `CR8_SEQUENCE_${frameIds.join('_') || 'EMPTY'}`),
    family: CRITTERIUM8_FAMILY,
    type: 'FRAME_SEQUENCE',
    frameIds,
    junctions: Array.isArray(options.junctions)
      ? options.junctions.map((junction) => ({ ...junction }))
      : [],
    metadata:
      options.metadata && typeof options.metadata === 'object' ? { ...options.metadata } : {},
  };
}
