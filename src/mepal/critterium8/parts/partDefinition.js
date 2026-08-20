import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';

export const CRITTERIUM8_PART_TYPES = Object.freeze([
  'FRAME_LEFT_POST', 'FRAME_RIGHT_POST', 'TOP_BEVEL', 'BOTTOM_PLINTH',
  'INTERMEDIATE_PLINTH', 'TOP_CAP', 'TILE', 'GROWTH_MODULE', 'CEILING_POST',
  'CEILING_U', 'JUNCTION_KIT', 'DUCT', 'LEVELER', 'END_CAP',
]);

export function createCritterium8PartId({ frameId, type, slotId = null, index = null } = {}) {
  if (type === 'TILE' && slotId) return `C8_PART_${slotId}`;
  const suffix = index == null ? '' : `_${Number(index)}`;
  return `C8_PART_${String(frameId)}_${String(type)}${suffix}`;
}

export function createCritterium8PartDefinition(options = {}) {
  const type = String(options.type || '').trim().toUpperCase();
  const frameId = String(options.frameId || options.metadata?.frameId || 'UNIDENTIFIED');
  const slotId = options.slotId == null ? null : String(options.slotId);
  const index = options.index == null ? null : Number(options.index);
  return {
    id: String(options.id || createCritterium8PartId({ frameId, type, slotId, index })),
    family: CRITTERIUM8_FAMILY,
    type,
    code: options.code == null || options.code === '' ? null : String(options.code),
    description: String(options.description || type),
    quantity: Number(options.quantity ?? 1),
    widthCm: options.widthCm == null ? null : Number(options.widthCm),
    heightCm: options.heightCm == null ? null : Number(options.heightCm),
    depthCm: options.depthCm == null ? null : Number(options.depthCm),
    slotId,
    side: options.side == null ? null : String(options.side).toUpperCase(),
    metadata: options.metadata && typeof options.metadata === 'object'
      ? { ...options.metadata, frameId }
      : { frameId },
  };
}
