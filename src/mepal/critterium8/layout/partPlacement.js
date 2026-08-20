export function createCritterium8PlacementId(partId) {
  return `C8_PLACE_${String(partId)}`;
}

export function createCritterium8PartPlacement(options = {}) {
  return {
    id: String(options.id || createCritterium8PlacementId(options.partId)),
    partId: String(options.partId || ''),
    partType: String(options.partType || ''),
    position: { x: Number(options.position?.x ?? 0), y: Number(options.position?.y ?? 0), z: Number(options.position?.z ?? 0) },
    rotation: { x: Number(options.rotation?.x ?? 0), y: Number(options.rotation?.y ?? 0), z: Number(options.rotation?.z ?? 0) },
    scale: { x: Number(options.scale?.x ?? 1), y: Number(options.scale?.y ?? 1), z: Number(options.scale?.z ?? 1) },
    anchorId: options.anchorId == null ? null : String(options.anchorId),
    bounds: options.bounds ? { ...options.bounds } : null,
    metadata: options.metadata && typeof options.metadata === 'object' ? { ...options.metadata } : {},
  };
}

export function createCritterium8PlacementBounds({ position, widthCm, heightCm, depthCm } = {}) {
  const values = [widthCm, heightCm, depthCm].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const [width, height, depth] = values;
  return {
    minX: Number(position.x) - width / 2, maxX: Number(position.x) + width / 2,
    minY: Number(position.y) - height / 2, maxY: Number(position.y) + height / 2,
    minZ: Number(position.z) - depth / 2, maxZ: Number(position.z) + depth / 2,
  };
}
