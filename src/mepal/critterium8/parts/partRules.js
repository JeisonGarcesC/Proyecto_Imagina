import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';
import { CRITTERIUM8_PART_TYPES } from './partDefinition.js';

const REQUIRED_FRAME_TYPES = Object.freeze([
  'FRAME_LEFT_POST', 'FRAME_RIGHT_POST', 'BOTTOM_PLINTH', 'TOP_BEVEL',
]);

export function validateResolvedParts(parts = [], { composition = null, frame = null } = {}) {
  const errors = [];
  const warnings = [];
  const normalizedParts = Array.isArray(parts) ? parts : [];
  const ids = normalizedParts.map((part) => part.id);
  const slotIds = new Set((composition?.tileSlots || []).map((slot) => slot.id));

  if (!Array.isArray(parts)) errors.push('PARTS_MUST_BE_ARRAY');
  if (new Set(ids).size !== ids.length) errors.push('DUPLICATED_PART_ID');

  for (const part of normalizedParts) {
    if (!part.id) errors.push('PART_ID_REQUIRED');
    if (part.family !== CRITTERIUM8_FAMILY) errors.push(`INVALID_PART_FAMILY:${part.id}`);
    if (!CRITTERIUM8_PART_TYPES.includes(part.type)) errors.push(`INVALID_PART_TYPE:${part.id}`);
    if (!Number.isFinite(Number(part.quantity)) || Number(part.quantity) <= 0) errors.push(`INVALID_PART_QUANTITY:${part.id}`);
    if (part.code !== null && (typeof part.code !== 'string' || !part.code.trim())) errors.push(`INVALID_PART_CODE:${part.id}`);
    if (part.code === null) warnings.push({ code: 'MISSING_DOCUMENTED_CODE', partId: part.id, partType: part.type });
    if (part.slotId && !slotIds.has(part.slotId)) errors.push(`UNKNOWN_SLOT_REFERENCE:${part.id}`);
    if (part.type === 'TILE' && !part.slotId) errors.push(`TILE_SLOT_REQUIRED:${part.id}`);
  }

  for (const type of REQUIRED_FRAME_TYPES) {
    const count = normalizedParts.filter((part) => part.type === type).length;
    if (count !== 1) errors.push(`REQUIRED_PART_COUNT:${type}:${count}`);
  }

  if (frame?.frameMode === 'FLOOR_TO_CEILING') {
    if (normalizedParts.filter((part) => part.type === 'CEILING_POST').length !== 1) errors.push('CEILING_POST_REQUIRED');
    if (normalizedParts.filter((part) => part.type === 'CEILING_U').length !== 1) errors.push('CEILING_U_REQUIRED');
  }

  const expectedSlots = composition?.heightCm === 110 ? [38, 38, 20]
    : composition?.heightCm === 204 && composition?.compositionMode === 'MODULAR' ? [38, 38, 38, 38, 38]
      : null;
  if (expectedSlots && JSON.stringify((composition.tileSlots || []).map((slot) => slot.heightCm)) !== JSON.stringify(expectedSlots)) errors.push(`INVALID_DOCUMENTARY_SLOT_SEQUENCE:${composition.heightCm}`);

  return { valid: errors.length === 0, errors, warnings };
}

export function validateCritterium8PartResolution(resolution = {}, context = {}) {
  return validateResolvedParts(resolution.parts, context);
}
