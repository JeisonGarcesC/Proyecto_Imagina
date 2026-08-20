import { buildCritterium8FrameComposition } from '../composition/frameComposition.js';
import { createCritterium8PartDefinition } from './partDefinition.js';
import {
  getCritterium8PartCatalogEntry,
  resolveCritterium8CeilingPostCode,
  resolveCritterium8CeilingUCode,
  resolveCritterium8FrameCommercialCode,
  resolveCritterium8GrowthPartCode,
  resolveCritterium8TilePartCode,
} from './partCatalog.js';
import { validateResolvedParts } from './partRules.js';

function addPart(parts, diagnostics, options) {
  const descriptor = getCritterium8PartCatalogEntry(options.type);
  const part = createCritterium8PartDefinition({
    ...options,
    description: options.description || descriptor?.displayName || options.type,
    metadata: { ...descriptor?.metadata, ...options.metadata },
  });
  if (parts.some((current) => current.id === part.id)) {
    diagnostics.push({ code: 'DUPLICATED_PART_ID', level: 'ERROR', partId: part.id });
    return null;
  }
  parts.push(part);
  if (!part.code) diagnostics.push({ code: 'MISSING_DOCUMENTED_CODE', level: 'WARNING', partId: part.id, partType: part.type });
  return part;
}

function normalizeResolverInput(input, options) {
  if (Array.isArray(input?.tileSlots)) {
    return {
      frame: options.frame || {
        id: input.frameId,
        widthCm: input.widthCm,
        heightCm: input.projectHeightCm || input.heightCm,
        frameMode: input.projectHeightCm > input.heightCm ? 'FLOOR_TO_CEILING' : 'HALF_HEIGHT',
      },
      composition: input,
    };
  }
  return { frame: input || {}, composition: options.composition || buildCritterium8FrameComposition(input || {}) };
}

export function resolveCritterium8FrameParts(input = {}, options = {}) {
  const { frame, composition } = normalizeResolverInput(input, options);
  const frameId = String(composition.frameId || frame.id || 'UNIDENTIFIED');
  const widthCm = Number(composition.widthCm ?? frame.widthCm);
  const heightCm = Number(composition.heightCm);
  const baseFrameHeightCm = Number(composition.baseFrameHeightCm ?? heightCm);
  const depthCm = Number(frame.thicknessCm ?? 8);
  const frameCode = resolveCritterium8FrameCommercialCode({ widthCm, heightCm: baseFrameHeightCm });
  const parts = [];
  const diagnostics = [...(composition.diagnostics || [])];
  const sharedMetadata = { frameId, parentFrameCatalogCode: frameCode, source: 'FICHA_TECNICA' };

  addPart(parts, diagnostics, { frameId, type: 'FRAME_LEFT_POST', side: 'LEFT', heightCm: baseFrameHeightCm, depthCm, metadata: sharedMetadata });
  addPart(parts, diagnostics, { frameId, type: 'FRAME_RIGHT_POST', side: 'RIGHT', heightCm: baseFrameHeightCm, depthCm, metadata: sharedMetadata });
  addPart(parts, diagnostics, { frameId, type: 'BOTTOM_PLINTH', widthCm, heightCm: composition.plinth?.heightCm, depthCm, metadata: { ...sharedMetadata, channelRole: 'CABLE_CHANNEL_READY' } });
  addPart(parts, diagnostics, { frameId, type: 'TOP_BEVEL', widthCm, depthCm, metadata: { ...sharedMetadata, baseFrameHeightCm, source: 'MAPA_PRODUCTO' } });
  addPart(parts, diagnostics, { frameId, type: 'LEVELER', quantity: 2, metadata: sharedMetadata });

  for (const slot of composition.tileSlots || []) {
    if (!slot.tile) continue;
    const tileType = slot.tile.tileType || slot.tile.type;
    const tileCode = resolveCritterium8TilePartCode({ tileType, widthCm, heightCm: slot.heightCm });
    addPart(parts, diagnostics, {
      frameId, type: 'TILE', slotId: slot.id, code: tileCode,
      description: `Baldosa ${String(tileType || '').toUpperCase()}`,
      widthCm, heightCm: slot.heightCm, depthCm: 1.5,
      metadata: { ...slot.tile.metadata, tileType, materialCode: slot.tile.materialCode ?? null, finishCode: slot.tile.finishCode ?? null, source: 'MAPA_PRODUCTO' },
    });
  }

  for (const [index, growth] of (composition.growthModules || []).entries()) {
    addPart(parts, diagnostics, { frameId, type: 'GROWTH_MODULE', index, code: growth.code || resolveCritterium8GrowthPartCode(widthCm), widthCm, heightCm: 38, depthCm, metadata: { source: 'MAPA_PRODUCTO' } });
  }

  if (String(frame.frameMode || '').toUpperCase() === 'FLOOR_TO_CEILING' || composition.projectHeightCm > composition.heightCm) {
    const projectHeightCm = Number(composition.projectHeightCm || frame.heightCm);
    addPart(parts, diagnostics, { frameId, type: 'CEILING_POST', code: resolveCritterium8CeilingPostCode({ widthCm, projectHeightCm }), widthCm, heightCm: projectHeightCm - 204, depthCm, metadata: { projectHeightCm, source: 'MAPA_PRODUCTO' } });
    addPart(parts, diagnostics, { frameId, type: 'CEILING_U', code: resolveCritterium8CeilingUCode(), widthCm, depthCm, metadata: { projectHeightCm, source: 'MAPA_PRODUCTO' } });
  }

  const validation = validateResolvedParts(parts, { composition, frame });
  diagnostics.push(...validation.errors.map((code) => ({ code, level: 'ERROR' })));
  return { frameId, parts, diagnostics, valid: validation.valid };
}

export function resolveJunctionParts() {
  return { parts: [], diagnostics: [{ code: 'JUNCTION_PARTS_NOT_IMPLEMENTED', level: 'INFO' }] };
}
