export function validateCritterium8JunctionLayout(layout = {}, frames = []) {
  const errors = [];
  const frameIds = new Set((frames || []).map((frame) => String(frame.frameId || frame.id || '')));
  const anchorIds = (layout.anchors || []).map((anchor) => anchor.id);
  const placementIds = (layout.placements || []).map((placement) => placement.id);
  const finitePosition = [layout.position?.x, layout.position?.y, layout.position?.z].every(Number.isFinite);

  if (!layout.id) errors.push('LAYOUT_ID_REQUIRED');
  if (!layout.junctionId) errors.push('JUNCTION_ID_REQUIRED');
  if (!finitePosition) errors.push('INVALID_JUNCTION_POSITION');
  if (!Number.isFinite(layout.rotationY)) errors.push('INVALID_JUNCTION_ORIENTATION');
  if (layout.bounds && !Object.values(layout.bounds).every(Number.isFinite)) errors.push('INVALID_JUNCTION_BOUNDS');
  if (new Set(anchorIds).size !== anchorIds.length) errors.push('DUPLICATED_ANCHOR_ID');
  if (new Set(placementIds).size !== placementIds.length) errors.push('DUPLICATED_PLACEMENT_ID');
  (layout.anchors || []).forEach((anchor) => {
    if (![anchor.position?.x, anchor.position?.y, anchor.position?.z].every(Number.isFinite)) errors.push(`INVALID_ANCHOR_POSITION:${anchor.id}`);
    const referencedFrameId = anchor.metadata?.frameId;
    if (referencedFrameId && !frameIds.has(String(referencedFrameId))) errors.push(`MISSING_FRAME_REFERENCE:${referencedFrameId}`);
  });
  (layout.placements || []).forEach((placement) => {
    if (!placement.partId) errors.push(`PLACEMENT_PART_ID_REQUIRED:${placement.id}`);
    if (placement.partType !== 'JUNCTION_KIT') errors.push(`INVALID_PLACEMENT_TYPE:${placement.id}`);
    if (![placement.position?.x, placement.position?.y, placement.position?.z, placement.rotation?.y].every(Number.isFinite)) errors.push(`INVALID_PLACEMENT_TRANSFORM:${placement.id}`);
    if (placement.anchorId && !anchorIds.includes(placement.anchorId)) errors.push(`UNKNOWN_PLACEMENT_ANCHOR:${placement.id}`);
  });
  if (layout.metadata?.replacedByDuct && layout.placements?.length) errors.push('DUCT_REPLACEMENT_HAS_JUNCTION_PLACEMENT');
  if (!layout.anchors?.some((anchor) => anchor.type === 'CENTER')) errors.push('CENTER_ANCHOR_REQUIRED');
  if (layout.metadata?.incomingDirections?.some((item) => !Number.isFinite(item.angle))) errors.push('INVALID_JUNCTION_ORIENTATION');
  return { valid: errors.length === 0, errors };
}
