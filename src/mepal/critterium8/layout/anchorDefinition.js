import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';

export const CRITTERIUM8_ANCHOR_TYPES = Object.freeze([
  'ORIGIN', 'BOTTOM_LEFT', 'BOTTOM_RIGHT', 'TOP_LEFT', 'TOP_RIGHT', 'CENTER',
  'LEFT_CENTER', 'RIGHT_CENTER', 'TOP_CENTER', 'BOTTOM_CENTER', 'SLOT_CENTER',
  'FRAME_TOP_CENTER',
]);

export function createCritterium8AnchorId(frameId, type) {
  return `C8_ANCHOR_${String(frameId)}_${String(type)}`;
}

export function createCritterium8SlotAnchorId(slotId) {
  return `C8_ANCHOR_${String(slotId)}_CENTER`;
}

export function createCritterium8Anchor({ frameId, id, type, position, metadata = {} } = {}) {
  const normalizedType = String(type || '').toUpperCase();
  return {
    id: String(id || createCritterium8AnchorId(frameId, normalizedType)),
    family: CRITTERIUM8_FAMILY,
    type: normalizedType,
    position: { x: Number(position?.x ?? 0), y: Number(position?.y ?? 0), z: Number(position?.z ?? 0) },
    metadata: { ...metadata, frameId: String(frameId || metadata.frameId || 'UNIDENTIFIED') },
  };
}

export function buildCritterium8FrameAnchors({ frameId, widthCm, heightCm, frameTopCm = heightCm, depthCm, tileSlots = [] } = {}) {
  const halfWidth = Number(widthCm) / 2;
  const halfDepth = Number(depthCm) / 2;
  const height = Number(heightCm);
  const definitions = [
    ['ORIGIN', 0, 0, 0], ['BOTTOM_LEFT', -halfWidth, 0, 0], ['BOTTOM_RIGHT', halfWidth, 0, 0],
    ['TOP_LEFT', -halfWidth, height, 0], ['TOP_RIGHT', halfWidth, height, 0],
    ['CENTER', 0, height / 2, 0], ['LEFT_CENTER', -halfWidth, height / 2, 0],
    ['RIGHT_CENTER', halfWidth, height / 2, 0], ['TOP_CENTER', 0, height, 0],
    ['BOTTOM_CENTER', 0, 0, 0],
    ['FRAME_TOP_CENTER', 0, Number(frameTopCm), 0],
  ];
  const anchors = definitions.map(([type, x, y, z]) => createCritterium8Anchor({ frameId, type, position: { x, y, z }, metadata: { coordinateSystem: 'X_WIDTH_Y_HEIGHT_Z_DEPTH', halfDepthCm: halfDepth } }));
  anchors.push(...tileSlots.map((slot) => createCritterium8Anchor({ frameId, id: createCritterium8SlotAnchorId(slot.id), type: 'SLOT_CENTER', position: { x: 0, y: (Number(slot.startCm) + Number(slot.endCm)) / 2, z: halfDepth }, metadata: { slotId: slot.id, face: 'FRONT' } })));
  return anchors;
}
