import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';

function finiteBounds(bounds) {
  return bounds && ['minX', 'maxX', 'minY', 'maxY', 'minZ', 'maxZ'].every((key) => Number.isFinite(Number(bounds[key])));
}

export function validateCritterium8AssemblyLayout(layout = {}, { frame = null, composition = null, parts = [] } = {}) {
  const errors = [];
  const anchors = Array.isArray(layout.anchors) ? layout.anchors : [];
  const placements = Array.isArray(layout.placements) ? layout.placements : [];
  const anchorIds = anchors.map((anchor) => anchor.id);
  const placementIds = placements.map((placement) => placement.id);
  const partIds = new Set((parts || []).map((part) => part.id));
  const slotIds = new Set((composition?.tileSlots || []).map((slot) => slot.id));

  if (layout.family !== CRITTERIUM8_FAMILY) errors.push('INVALID_LAYOUT_FAMILY');
  if (layout.type !== 'FRAME_ASSEMBLY_LAYOUT') errors.push('INVALID_LAYOUT_TYPE');
  if (new Set(anchorIds).size !== anchorIds.length) errors.push('DUPLICATED_ANCHOR_ID');
  if (new Set(placementIds).size !== placementIds.length) errors.push('DUPLICATED_PLACEMENT_ID');
  if (!finiteBounds(layout.bounds)) errors.push('INVALID_LAYOUT_BOUNDS');

  for (const placement of placements) {
    if (!partIds.has(placement.partId)) errors.push(`MISSING_PART:${placement.partId}`);
    if (![placement.position, placement.rotation, placement.scale].every((vector) => ['x', 'y', 'z'].every((key) => Number.isFinite(Number(vector?.[key]))))) errors.push(`INVALID_PLACEMENT:${placement.id}`);
    if (placement.anchorId && !anchorIds.includes(placement.anchorId)) errors.push(`MISSING_ANCHOR:${placement.id}`);
    if (placement.metadata?.slotId && !slotIds.has(placement.metadata.slotId)) errors.push(`MISSING_SLOT:${placement.id}`);
    if (placement.partType === 'TILE' && placement.bounds && (placement.bounds.minY < 0 || placement.bounds.maxY > Number(composition?.heightCm))) errors.push(`TILE_OUTSIDE_FRAME:${placement.id}`);
  }

  const placedPartIds = new Set(placements.map((placement) => placement.partId));
  for (const part of parts || []) {
    if (!placedPartIds.has(part.id)) errors.push(`PART_WITHOUT_PLACEMENT:${part.id}`);
  }
  if (frame?.frameMode === 'FLOOR_TO_CEILING') {
    const ceilingPost = placements.find((placement) => placement.partType === 'CEILING_POST');
    const ceilingU = placements.find((placement) => placement.partType === 'CEILING_U');
    if (!ceilingPost || ceilingPost.position.y <= 204) errors.push('INVALID_CEILING_POST_PLACEMENT');
    if (!ceilingU || ceilingU.position.y !== Number(frame.heightCm)) errors.push('INVALID_CEILING_U_PLACEMENT');
  }
  return { valid: errors.length === 0, errors };
}
