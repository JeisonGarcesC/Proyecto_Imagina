import { CRITTERIUM8_FAMILY, CRITTERIUM8_FRAME_THICKNESS_CM } from '../catalog/frameCatalog.js';
import { validateCritterium8FrameDimensions } from '../rules/frameRules.js';
import { normalizeCritterium8CompositionMode } from '../rules/frameCompositionRules.js';

function normalizeFrameMode(value) {
  return String(value || 'HALF_HEIGHT').trim().toUpperCase() === 'FLOOR_TO_CEILING'
    ? 'FLOOR_TO_CEILING'
    : 'HALF_HEIGHT';
}

export function normalizeCritterium8FrameDefinition(frame = {}) {
  const frameMode = normalizeFrameMode(frame.frameMode);
  const widthCm = Number(frame.widthCm);
  const heightCm = Number(frame.heightCm);
  return {
    schemaVersion: 1,
    id: String(frame.id || `CR8_FRAME_${frameMode}_${heightCm}X${widthCm}`),
    family: CRITTERIUM8_FAMILY,
    type: 'FRAME',
    frameMode,
    widthCm,
    heightCm,
    thicknessCm: CRITTERIUM8_FRAME_THICKNESS_CM,
    compositionMode: normalizeCritterium8CompositionMode(frame.compositionMode),
    tiles: Array.isArray(frame.tiles) ? frame.tiles.map((tile) => ({ ...tile })) : [],
    electrical: {
      enabled: frame.electrical?.enabled === true,
      feed: frame.electrical?.feed ?? null,
    },
    metadata: frame.metadata && typeof frame.metadata === 'object' ? { ...frame.metadata } : {},
  };
}

export function validateCritterium8FrameDefinition(frame = {}) {
  const normalized = normalizeCritterium8FrameDefinition(frame);
  const result = validateCritterium8FrameDimensions(normalized);
  const errors = [...result.errors];
  if (normalized.family !== CRITTERIUM8_FAMILY) errors.push('INVALID_FAMILY');
  if (normalized.type !== 'FRAME') errors.push('INVALID_TYPE');
  return { ...result, valid: errors.length === 0, errors, frame: normalized };
}

export function createCritterium8FrameDefinition(options = {}) {
  const frame = normalizeCritterium8FrameDefinition(options);
  const validation = validateCritterium8FrameDefinition(frame);
  return {
    ...frame,
    metadata: {
      ...frame.metadata,
      catalogCode: validation.catalogCode,
      catalogCodeAvailable: validation.catalogCodeAvailable,
    },
  };
}
