import { CRITTERIUM8_FORMICA_FULL_TILE_HEIGHTS_CM } from '../catalog/tileCatalog.js';
import { isTileCombinationAllowed } from './tileRules.js';

export const CRITTERIUM8_COMPOSITION_MODES = Object.freeze(['MODULAR', 'FULL_TILE']);

export function normalizeCritterium8CompositionMode(value) {
  return String(value || 'MODULAR').trim().toUpperCase() === 'FULL_TILE' ? 'FULL_TILE' : 'MODULAR';
}

export function getCritterium8FullTileHeight(frameHeightCm) {
  const heightCm = Number(frameHeightCm) - 14;
  return CRITTERIUM8_FORMICA_FULL_TILE_HEIGHTS_CM.includes(heightCm) && heightCm >= 76 ? heightCm : null;
}

export function validateFrameComposition(frame = {}, composition = {}) {
  const errors = [];
  const widthCm = Number(frame.widthCm ?? composition.widthCm);
  const frameHeightCm = Number(frame.frameMode === 'FLOOR_TO_CEILING' ? 204 : frame.heightCm ?? composition.heightCm);
  const slots = Array.isArray(composition.tileSlots) ? composition.tileSlots : [];
  const ids = slots.map((slot) => slot.id);

  if (!Number.isFinite(widthCm) || widthCm <= 0) errors.push('INVALID_FRAME_WIDTH');
  if (!Number.isFinite(frameHeightCm) || frameHeightCm <= 0) errors.push('INVALID_FRAME_HEIGHT');
  if (!composition.plinth || Number(composition.plinth.heightCm) !== 14) errors.push('INVALID_PLINTH_HEIGHT');
  if (new Set(ids).size !== ids.length) errors.push('DUPLICATED_SLOT_ID');

  for (const slot of slots) {
    if (!Number.isFinite(Number(slot.startCm)) || !Number.isFinite(Number(slot.endCm)) || !Number.isFinite(Number(slot.heightCm)) || Number(slot.startCm) < 14 || Number(slot.endCm) > frameHeightCm || Number(slot.endCm) <= Number(slot.startCm)) {
      errors.push(`SLOT_OUTSIDE_FRAME:${slot.id}`);
    }
    if (Math.abs(Number(slot.endCm) - Number(slot.startCm) - Number(slot.heightCm)) > 1e-6) errors.push(`SLOT_HEIGHT_MISMATCH:${slot.id}`);
    if (slot.tile) {
      const tileType = slot.tile.tileType || slot.tile.type;
      const tileHeightCm = Number(slot.tile.heightCm ?? slot.heightCm);
      if (tileHeightCm !== Number(slot.heightCm)) errors.push(`TILE_HEIGHT_MISMATCH:${slot.id}`);
      if (!isTileCombinationAllowed({ type: tileType, widthCm, heightCm: tileHeightCm })) errors.push(`TILE_COMBINATION_NOT_DOCUMENTED:${slot.id}`);
    }
  }

  const occupiedHeightCm = slots.reduce((sum, slot) => sum + Number(slot.heightCm || 0), 0);
  const usableTileHeightCm = frameHeightCm - 14;
  if (Math.abs(occupiedHeightCm - usableTileHeightCm) > 1e-6) errors.push('VERTICAL_SUM_MISMATCH');
  if (normalizeCritterium8CompositionMode(composition.compositionMode) === 'FULL_TILE' && (slots.length !== 1 || !getCritterium8FullTileHeight(frameHeightCm))) errors.push('FULL_TILE_NOT_DOCUMENTED_FOR_FRAME');

  return { valid: errors.length === 0, errors, occupiedHeightCm, usableTileHeightCm };
}

export function validateCritterium8GrowthTransition({ baseHeightCm, moduleCount = 1 } = {}) {
  const baseHeight = Number(baseHeightCm);
  const count = Number(moduleCount);
  const targetHeightCm = baseHeight + count * 38;
  const errors = [];
  if (![90, 128, 166].includes(baseHeight)) errors.push('GROWTH_BASE_HEIGHT_NOT_DOCUMENTED');
  if (!Number.isInteger(count) || count < 1) errors.push('INVALID_GROWTH_MODULE_COUNT');
  if (targetHeightCm > 204) errors.push('GROWTH_EXCEEDS_204');
  if (![128, 166, 204].includes(targetHeightCm)) errors.push('GROWTH_TARGET_NOT_DOCUMENTED');
  return { valid: errors.length === 0, errors, targetHeightCm };
}
