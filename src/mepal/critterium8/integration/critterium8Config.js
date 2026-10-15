import { createCritterium8FrameDefinition } from '../definitions/frameDefinition.js';
import { applyGrowthModuleToComposition, buildCritterium8FrameComposition } from '../composition/frameComposition.js';
import { isTileCombinationAllowed } from '../rules/tileRules.js';
import { getCritterium8FullTileHeight } from '../rules/frameCompositionRules.js';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function buildComposition(config, frameId) {
  const frame = createCritterium8FrameDefinition({
    id: frameId,
    widthCm: config.widthCm,
    heightCm: config.frameMode === 'FLOOR_TO_CEILING' ? config.projectHeightCm : config.heightCm,
    frameMode: config.frameMode,
    compositionMode: config.compositionMode,
    tiles: config.tiles || [],
  });
  let composition = buildCritterium8FrameComposition(frame);
  const count = config.growthModules?.length || 0;
  if (count) {
    const errors = [];
    if (config.frameMode !== 'HALF_HEIGHT') errors.push('GROWTH_REQUIRES_HALF_HEIGHT_FRAME');
    if (config.compositionMode !== 'MODULAR') errors.push('GROWTH_REQUIRES_MODULAR_COMPOSITION');
    if (!Array.isArray(config.growthModules)) errors.push('INVALID_GROWTH_MODULE_COUNT');
    if (errors.length) composition.diagnostics.push(...errors.map((code) => ({ code, level: 'ERROR' })));
    else {
      const result = applyGrowthModuleToComposition(frame, composition, { moduleCount: count });
      if (result.valid) composition = result.composition;
      else composition.diagnostics.push(...result.errors.map((code) => ({ code, level: 'ERROR' })));
    }
  }
  return { frame, composition };
}

export function resolveCritterium8ConfigPatch({ config = {}, patch = {}, frameId } = {}) {
  const next = {
    ...clone(config),
    ...clone(patch),
    widthCm: Number(patch.widthCm ?? config.widthCm),
    heightCm: Number(patch.heightCm ?? config.heightCm),
    frameMode: String(patch.frameMode ?? config.frameMode ?? 'HALF_HEIGHT').toUpperCase(),
    compositionMode: String(patch.compositionMode ?? config.compositionMode ?? 'MODULAR').toUpperCase(),
    projectHeightCm: Number(
      patch.projectHeightCm
        ?? (Object.hasOwn(patch, 'heightCm') && String(patch.frameMode ?? config.frameMode ?? 'HALF_HEIGHT').toUpperCase() !== 'FLOOR_TO_CEILING'
          ? patch.heightCm
          : config.projectHeightCm ?? patch.heightCm ?? config.heightCm)
    ),
    growthModules: clone(patch.growthModules ?? config.growthModules ?? []),
    tiles: [],
  };
  const diagnostics = [];
  if (!Array.isArray(next.growthModules)) {
    return { success: false, reason: 'INVALID_GROWTH_MODULE_COUNT', diagnostics, config: clone(config) };
  }
  if (next.compositionMode === 'FULL_TILE' && !getCritterium8FullTileHeight(next.heightCm)) {
    return { success: false, reason: 'FULL_TILE_NOT_DOCUMENTED_FOR_FRAME', diagnostics, config: clone(config) };
  }

  const previous = buildComposition({ ...config, tiles: config.tiles || [] }, frameId);
  const emptyNext = buildComposition({ ...next, tiles: [] }, frameId);
  const explicitTiles = Object.hasOwn(patch, 'tiles');
  const sourceTiles = explicitTiles
    ? clone(patch.tiles || [])
    : previous.composition.tileSlots.map((slot) => slot.tile).filter(Boolean);

  sourceTiles.forEach((tile, sourceIndex) => {
    const oldSlotIndex = previous.composition.tileSlots.findIndex((slot) => slot.id === tile.slotId);
    const targetSlot = emptyNext.composition.tileSlots.find((slot) => slot.id === tile.slotId)
      || emptyNext.composition.tileSlots[oldSlotIndex >= 0 ? oldSlotIndex : sourceIndex];
    const tileType = String(tile.tileType || tile.type || '').trim().toUpperCase();
    if (!targetSlot || !tileType || !isTileCombinationAllowed({ type: tileType, widthCm: next.widthCm, heightCm: targetSlot.heightCm })) {
      diagnostics.push({ code: 'TILE_ASSIGNMENT_DISCARDED', level: 'WARNING', tileType: tileType || null, previousSlotId: tile.slotId || null });
      return;
    }
    next.tiles.push({
      ...clone(tile),
      slotId: targetSlot.id,
      tileType,
      heightCm: targetSlot.heightCm,
    });
  });

  const effective = buildComposition(next, frameId);
  const errors = (effective.composition.diagnostics || []).filter((item) => item.level === 'ERROR');
  if (errors.length) return { success: false, reason: errors[0].code, diagnostics: [...diagnostics, ...errors], config: clone(config) };
  if (next.frameMode === 'HALF_HEIGHT') next.projectHeightCm = effective.composition.heightCm;
  return { success: true, config: clone(next), frame: effective.frame, composition: effective.composition, diagnostics };
}

export function patchCritterium8TileConfig({ config, frameId, slotId, patch = {} } = {}) {
  const current = buildComposition(config, frameId).composition;
  const slot = current.tileSlots.find((candidate) => candidate.id === slotId);
  if (!slot) return { success: false, reason: 'SLOT_NOT_FOUND', diagnostics: [] };
  const tiles = current.tileSlots
    .map((candidate) => {
      if (candidate.id !== slotId) return candidate.tile;
      const tileType = String(patch.tileType ?? candidate.tile?.tileType ?? '').trim().toUpperCase();
      if (!tileType) return null;
      return { ...(candidate.tile || {}), ...clone(patch), slotId, tileType, heightCm: candidate.heightCm };
    })
    .filter(Boolean);
  return resolveCritterium8ConfigPatch({ config, patch: { tiles }, frameId });
}
