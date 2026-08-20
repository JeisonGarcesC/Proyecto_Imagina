import { CRITTERIUM8_JUNCTION_TYPES } from '../catalog/junctionCatalog.js';

export function validateCritterium8JunctionParts(resolution = {}) {
  const errors = [];
  const parts = Array.isArray(resolution.parts) ? resolution.parts : [];
  const ids = parts.map((part) => part.id);
  if (!resolution.junctionId) errors.push('JUNCTION_ID_REQUIRED');
  if (!CRITTERIUM8_JUNCTION_TYPES.includes(String(resolution.type || '').toUpperCase())) {
    errors.push('UNSUPPORTED_JUNCTION_TYPE');
  }
  if (new Set(ids).size !== ids.length) errors.push('DUPLICATED_PART_ID');
  parts.forEach((part) => {
    if (part.type !== 'JUNCTION_KIT') errors.push(`INVALID_JUNCTION_PART_TYPE:${part.id}`);
    if (!part.code) errors.push(`JUNCTION_KIT_CODE_REQUIRED:${part.id}`);
    if (part.metadata?.junctionId !== resolution.junctionId) errors.push(`INVALID_JUNCTION_REFERENCE:${part.id}`);
    if (!Number.isFinite(Number(part.metadata?.heightCm))) errors.push(`INVALID_JUNCTION_HEIGHT:${part.id}`);
  });
  if (resolution.diagnostics?.some((item) => item.code === 'HEIGHT_TRANSITION_REQUIRED') && parts.length) {
    errors.push('SILENT_HEIGHT_TRANSITION_RESOLUTION');
  }
  return { valid: errors.length === 0, errors };
}
