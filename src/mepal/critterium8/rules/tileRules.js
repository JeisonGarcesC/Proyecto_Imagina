import { getCritterium8TileType } from '../catalog/tileCatalog.js';

export function isTileCombinationAllowed({ type, widthCm, heightCm } = {}) {
  const tile = getCritterium8TileType(type);
  if (!tile) return false;
  const width = Number(widthCm);
  const height = Number(heightCm);
  const restrictedHeights = tile.widthHeightRestrictions?.[width];
  return (
    tile.allowedWidthsCm.includes(width) &&
    tile.allowedHeightsCm.includes(height) &&
    (!restrictedHeights || restrictedHeights.includes(height))
  );
}

export function validateCritterium8TileCombination(options = {}) {
  const type = String(options.type || '').trim().toUpperCase();
  const tile = getCritterium8TileType(type);
  const errors = [];
  if (!tile) errors.push('TILE_TYPE_NOT_DOCUMENTED');
  else if (!isTileCombinationAllowed(options)) errors.push('TILE_COMBINATION_NOT_DOCUMENTED');
  return { valid: errors.length === 0, errors, type, tile };
}
