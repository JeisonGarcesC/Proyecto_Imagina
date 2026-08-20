export function createCritterium8JunctionPlacementId(partId) {
  return `C8_JPLACE_${String(partId)}`;
}

export function createCritterium8JunctionPlacement(options = {}) {
  return {
    id: String(options.id || createCritterium8JunctionPlacementId(options.partId)),
    partId: String(options.partId || ''),
    partType: 'JUNCTION_KIT',
    position: {
      x: Number(options.position?.x ?? 0),
      y: Number(options.position?.y ?? 0),
      z: Number(options.position?.z ?? 0),
    },
    rotation: {
      x: Number(options.rotation?.x ?? 0),
      y: Number(options.rotation?.y ?? 0),
      z: Number(options.rotation?.z ?? 0),
    },
    scale: { x: 1, y: 1, z: 1 },
    anchorId: options.anchorId == null ? null : String(options.anchorId),
    metadata: options.metadata && typeof options.metadata === 'object' ? { ...options.metadata } : {},
  };
}
