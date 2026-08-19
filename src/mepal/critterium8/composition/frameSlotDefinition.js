import { CRITTERIUM8_TILE_CATALOG } from '../catalog/tileCatalog.js';
import { isTileCombinationAllowed } from '../rules/tileRules.js';

export const CRITTERIUM8_SLOT_ROLES = Object.freeze(['PLINTH', 'TILE', 'INTERMEDIATE', 'TOP']);

export function createCritterium8SlotId(frameId, index) {
  return `C8_SLOT_${String(frameId)}_${Number(index)}`;
}

export function getAllowedCritterium8TileTypes({ widthCm, heightCm } = {}) {
  return Object.keys(CRITTERIUM8_TILE_CATALOG).filter((type) =>
    isTileCombinationAllowed({ type, widthCm, heightCm })
  );
}

export function createCritterium8FrameSlot({ frameId, index, role = 'TILE', startCm, heightCm, widthCm, tile = null, metadata = {} } = {}) {
  const normalizedIndex = Number(index);
  const normalizedStart = Number(startCm);
  const normalizedHeight = Number(heightCm);
  const normalizedRole = CRITTERIUM8_SLOT_ROLES.includes(role) ? role : 'TILE';
  return {
    id: createCritterium8SlotId(frameId, normalizedIndex),
    index: normalizedIndex,
    role: normalizedRole,
    startCm: normalizedStart,
    endCm: normalizedStart + normalizedHeight,
    heightCm: normalizedHeight,
    allowedTileTypes: normalizedRole === 'TILE'
      ? getAllowedCritterium8TileTypes({ widthCm, heightCm: normalizedHeight })
      : [],
    tile: tile ? { ...tile } : null,
    metadata: { ...metadata },
  };
}
