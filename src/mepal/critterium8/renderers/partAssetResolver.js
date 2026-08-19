const PROCEDURAL_TYPES = new Set([
  'FRAME_LEFT_POST', 'FRAME_RIGHT_POST', 'TOP_BEVEL', 'BOTTOM_PLINTH', 'TILE',
  'GROWTH_MODULE', 'CEILING_POST', 'CEILING_U', 'LEVELER',
]);

const rendererKeys = {
  FRAME_LEFT_POST: 'FRAME_POST',
  FRAME_RIGHT_POST: 'FRAME_POST',
  TOP_BEVEL: 'TOP_BEVEL',
  BOTTOM_PLINTH: 'BOX',
  TILE: 'TILE',
  GROWTH_MODULE: 'BOX',
  CEILING_POST: 'BOX',
  CEILING_U: 'CEILING_U',
  LEVELER: 'LEVELER',
};

export function resolveCritterium8PartAsset(part = {}) {
  const partType = String(part.type || '').toUpperCase();
  if (PROCEDURAL_TYPES.has(partType)) {
    return {
      type: 'PROCEDURAL',
      src: null,
      rendererKey: rendererKeys[partType],
      metadata: {
        provisionalGeometry: ['FRAME_LEFT_POST', 'FRAME_RIGHT_POST', 'TOP_BEVEL', 'CEILING_POST', 'CEILING_U', 'LEVELER'].includes(partType),
        source: 'CRITTERIUM8_PHASE_5_PREVIEW',
      },
    };
  }
  return {
    type: 'PLACEHOLDER',
    src: null,
    rendererKey: 'PLACEHOLDER',
    metadata: { provisionalGeometry: true, unsupportedPartType: partType },
  };
}
