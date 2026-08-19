import { createCritterium8FrameSlot } from './frameSlotDefinition.js';
import { getCritterium8FullTileHeight, normalizeCritterium8CompositionMode, validateCritterium8GrowthTransition, validateFrameComposition } from '../rules/frameCompositionRules.js';
import { validateCritterium8GrowthModule } from '../rules/frameRules.js';

export const CRITTERIUM8_FRAME_PLINTH_HEIGHT_CM = 14;
export const CRITTERIUM8_MODULAR_SLOT_HEIGHT_CM = 38;

// MAPA_PRODUCTO: la secuencia visual y las alturas nominales dejan 14 cm bajo las baldosas.
// FICHA_TECNICA: la tapa comercial de zócalo figura con 16 cm; no es el mismo dato funcional.
export const CRITTERIUM8_DOCUMENTARY_COMPOSITION = Object.freeze({
  90: Object.freeze([38, 38]),
  110: Object.freeze([38, 38, 20]),
  128: Object.freeze([38, 38, 38]),
  166: Object.freeze([38, 38, 38, 38]),
  204: Object.freeze([38, 38, 38, 38, 38]),
});

function resolveBaseFrameHeight(frame = {}) {
  return String(frame.frameMode || '').toUpperCase() === 'FLOOR_TO_CEILING' ? 204 : Number(frame.heightCm);
}

function normalizeTileAssignment(tile, slot) {
  if (!tile) return null;
  return {
    slotId: slot.id,
    tileType: String(tile.tileType || tile.type || '').trim().toUpperCase(),
    heightCm: Number(tile.heightCm ?? slot.heightCm),
    materialCode: tile.materialCode ?? null,
    finishCode: tile.finishCode ?? null,
    metadata: tile.metadata && typeof tile.metadata === 'object' ? { ...tile.metadata } : {},
  };
}

function createTileSlots(frame, frameHeightCm, compositionMode, diagnostics) {
  const frameId = String(frame.id || 'UNIDENTIFIED');
  const widthCm = Number(frame.widthCm);
  let heights = CRITTERIUM8_DOCUMENTARY_COMPOSITION[frameHeightCm] || [];
  if (compositionMode === 'FULL_TILE') {
    const fullTileHeightCm = getCritterium8FullTileHeight(frameHeightCm);
    if (fullTileHeightCm) heights = [fullTileHeightCm];
    else diagnostics.push({ code: 'FULL_TILE_NOT_DOCUMENTED_FOR_FRAME', level: 'ERROR' });
  }
  let cursorCm = CRITTERIUM8_FRAME_PLINTH_HEIGHT_CM;
  return heights.map((heightCm, index) => {
    const slot = createCritterium8FrameSlot({ frameId, index, role: 'TILE', startCm: cursorCm, heightCm, widthCm, metadata: { source: 'MAPA_PRODUCTO', channelRole: heightCm === 20 ? 'INTERMEDIATE_CONDITION_PENDING' : null } });
    const tiles = Array.isArray(frame.tiles) ? frame.tiles : [];
    slot.tile = normalizeTileAssignment(tiles.find((tile) => tile.slotId === slot.id) || tiles[index], slot);
    cursorCm = slot.endCm;
    return slot;
  });
}

export function buildCritterium8FrameComposition(frame = {}) {
  const frameId = String(frame.id || 'UNIDENTIFIED');
  const widthCm = Number(frame.widthCm);
  const frameHeightCm = resolveBaseFrameHeight(frame);
  const compositionMode = normalizeCritterium8CompositionMode(frame.compositionMode);
  const diagnostics = [];
  if (!CRITTERIUM8_DOCUMENTARY_COMPOSITION[frameHeightCm]) diagnostics.push({ code: 'FRAME_HEIGHT_COMPOSITION_NOT_DOCUMENTED', level: 'ERROR' });
  if (String(frame.frameMode || '').toUpperCase() === 'FLOOR_TO_CEILING') diagnostics.push({ code: 'FLOOR_TO_CEILING_UPRIGHT_EXCLUDED_FROM_TILE_SLOTS', level: 'INFO', projectHeightCm: Number(frame.heightCm) });
  diagnostics.push({ code: 'PLINTH_STRUCTURAL_HEIGHT_DIFFERS_FROM_COMMERCIAL_COVER', level: 'WARNING', structuralHeightCm: 14, commercialCoverHeightCm: 16, sources: ['MAPA_PRODUCTO', 'FICHA_TECNICA'] });
  const tileSlots = createTileSlots(frame, frameHeightCm, compositionMode, diagnostics);
  const composition = {
    frameId, widthCm, heightCm: frameHeightCm,
    projectHeightCm: String(frame.frameMode || '').toUpperCase() === 'FLOOR_TO_CEILING' ? Number(frame.heightCm) : frameHeightCm,
    compositionMode,
    plinth: { role: 'PLINTH', startCm: 0, endCm: 14, heightCm: 14, metadata: { source: 'MAPA_PRODUCTO', channelRole: 'CABLE_CHANNEL_READY' } },
    tileSlots,
    top: { role: 'TOP', type: 'BEVEL', positionCm: frameHeightCm, metadata: { source: 'MAPA_PRODUCTO' } },
    topBevel: { included: true, source: 'MAPA_PRODUCTO' },
    usableTileHeightCm: Math.max(0, frameHeightCm - 14),
    growthModules: [], diagnostics,
  };
  const validation = validateFrameComposition(frame, composition);
  if (!validation.valid) composition.diagnostics.push(...validation.errors.map((code) => ({ code, level: 'ERROR' })));
  return composition;
}

export function createDefaultTileComposition(frame = {}) {
  return buildCritterium8FrameComposition({ ...frame, compositionMode: frame.compositionMode || 'MODULAR' });
}

export function rebuildCritterium8FrameComposition(frame = {}, previousComposition = null) {
  const composition = buildCritterium8FrameComposition(frame);
  if (!previousComposition) return { composition, discardedTiles: [], reassignableTiles: [] };
  const previousTiles = (previousComposition.tileSlots || []).flatMap((slot) => slot.tile ? [{ ...slot.tile, previousSlotId: slot.id }] : []);
  const assignedSlotIds = new Set(composition.tileSlots.filter((slot) => slot.tile).map((slot) => slot.id));
  const discardedTiles = previousTiles.filter((tile) => !assignedSlotIds.has(tile.slotId));
  const reassignableTiles = discardedTiles.filter((tile) => composition.tileSlots.some((slot) => slot.heightCm === Number(tile.heightCm) && slot.allowedTileTypes.includes(tile.tileType)));
  return { composition, discardedTiles, reassignableTiles };
}

export function applyGrowthModuleToComposition(frame = {}, composition, { moduleCount = 1 } = {}) {
  const transition = validateCritterium8GrowthTransition({ baseHeightCm: composition?.heightCm ?? frame.heightCm, moduleCount });
  const moduleValidation = validateCritterium8GrowthModule({ widthCm: frame.widthCm });
  const errors = [...transition.errors, ...moduleValidation.errors];
  if (errors.length) return { valid: false, errors, composition };
  const next = buildCritterium8FrameComposition({ ...frame, heightCm: transition.targetHeightCm, compositionMode: 'MODULAR' });
  next.growthModules = Array.from({ length: Number(moduleCount) }, (_, index) => ({ index, heightCm: 38, code: moduleValidation.catalogEntry.code, source: 'MAPA_PRODUCTO' }));
  return { valid: true, errors: [], composition: next };
}
