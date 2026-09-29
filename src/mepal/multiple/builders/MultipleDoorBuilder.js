import { MULTIPLE_DOOR_HEIGHTS_CM, MULTIPLE_DOOR_SWINGS, MULTIPLE_DOOR_WIDTH_CM, resolveMultipleDoorFrame, resolveMultipleDoorLeaf } from '../catalog/multiplePhase2Catalog.js';
import { createMultipleDoorParts } from '../parts/doorParts.js';

export function normalizeMultipleDoor(input = {}, frameHeightCm) {
  const door = { componentKey: String(input.componentKey || 'door-0'), type: String(input.type || (frameHeightCm > 204 ? 'FLOOR_TO_CEILING' : 'HALF_HEIGHT')).toUpperCase(),
    widthCm: Number(input.widthCm || MULTIPLE_DOOR_WIDTH_CM), heightCm: Number(input.heightCm || frameHeightCm),
    swing: String(input.swing || 'RIGHT').toUpperCase(), material: String(input.material || 'FORMICA').toUpperCase() };
  if (door.widthCm !== MULTIPLE_DOOR_WIDTH_CM || !MULTIPLE_DOOR_HEIGHTS_CM.includes(door.heightCm)) throw new Error('MULTIPLE_DOOR_DIMENSIONS_NOT_DOCUMENTED');
  if (!MULTIPLE_DOOR_SWINGS.includes(door.swing)) throw new Error('MULTIPLE_DOOR_SWING_NOT_SUPPORTED');
  if (!['FORMICA', 'GLASS'].includes(door.material)) throw new Error('MULTIPLE_DOOR_MATERIAL_NOT_SUPPORTED');
  return door;
}

export function buildMultipleDoor(input, frameHeightCm) {
  const door = normalizeMultipleDoor(input, frameHeightCm);
  const resolution = { frame: resolveMultipleDoorFrame(door), leaf: resolveMultipleDoorLeaf(door) };
  return { door, resolution, parts: createMultipleDoorParts(door, resolution),
    diagnostics: [!resolution.frame && { code: 'MULTIPLE_DOOR_FRAME_CODE_PENDING', level: 'INFO' }, !resolution.leaf && { code: 'MULTIPLE_DOOR_LEAF_CODE_PENDING', level: 'INFO' }].filter(Boolean) };
}

export const MultipleDoorFrameBuilder = buildMultipleDoor;
