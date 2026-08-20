import { isCritterium8JunctionType } from '../catalog/junctionCatalog.js';
import { createCritterium8PartDefinition } from '../parts/partDefinition.js';
import { getCritterium8JunctionKitEntry } from './junctionPartCatalog.js';
import { validateCritterium8JunctionParts } from './junctionRules.js';

function diagnostic(code, level = 'WARNING', details = {}) {
  return { code, level, ...details };
}

function normalizeFrame(frame = {}) {
  const frameId = String(frame.frameId || frame.id || '');
  const frameMode = String(frame.frameMode || 'HALF_HEIGHT').toUpperCase();
  const floorToCeiling = frameMode === 'FLOOR_TO_CEILING';
  return {
    frameId,
    heightCm: Number(floorToCeiling ? frame.projectHeightCm : frame.heightCm),
    floorToCeiling,
    projectHeightCm: floorToCeiling ? Number(frame.projectHeightCm) : null,
  };
}

function resolveParticipantFrames(junction, frames) {
  const byId = new Map((Array.isArray(frames) ? frames : []).map((frame) => {
    const normalized = normalizeFrame(frame);
    return [normalized.frameId, normalized];
  }));
  const frameIds = Array.isArray(junction?.frameIds)
    ? junction.frameIds.map(String)
    : [...new Set((junction?.endpointRefs || []).map((reference) => String(reference.frameId)))];
  const missingFrameIds = frameIds.filter((frameId) => !byId.has(frameId));
  return {
    participants: frameIds.map((frameId) => byId.get(frameId)).filter(Boolean),
    missingFrameIds,
  };
}

function resolveJunctionType(junction = {}) {
  const type = String(junction.type || '').trim().toUpperCase();
  const variant = String(junction.variant || junction.metadata?.explicitVariant || '').trim().toUpperCase();
  if (type === 'DEG_180_TYPE_B') return variant === 'TYPE_B' ? type : null;
  if (type === 'DEG_180' && variant === 'TYPE_B') return 'DEG_180_TYPE_B';
  return type;
}

export function resolveCritterium8JunctionParts({ junction = {}, frames = [] } = {}) {
  const junctionId = String(junction.id || '');
  const requestedType = String(junction.type || '').trim().toUpperCase();
  const type = resolveJunctionType(junction);
  const diagnostics = [];
  const parts = [];

  if (!junctionId) diagnostics.push(diagnostic('JUNCTION_ID_REQUIRED', 'ERROR'));
  if (!type || !isCritterium8JunctionType(type)) {
    diagnostics.push(diagnostic('UNSUPPORTED_JUNCTION_TYPE', 'ERROR', { junctionId, type: requestedType || null }));
    return { junctionId, type: requestedType || null, kitCode: null, parts, diagnostics, valid: false };
  }

  const { participants, missingFrameIds } = resolveParticipantFrames(junction, frames);
  missingFrameIds.forEach((frameId) => diagnostics.push(diagnostic('MISSING_FRAME_REFERENCE', 'ERROR', { junctionId, frameId })));
  if (missingFrameIds.length || !participants.length) {
    return { junctionId, type, kitCode: null, parts, diagnostics, valid: false };
  }

  if (junction.metadata?.useDuct === true) {
    diagnostics.push(diagnostic('REPLACED_BY_DUCT', 'INFO', { junctionId, type }));
    return { junctionId, type, kitCode: null, parts, diagnostics, valid: true };
  }

  const heightsCm = [...new Set(participants.map((frame) => frame.heightCm))].sort((first, second) => first - second);
  if (heightsCm.some((heightCm) => !Number.isFinite(heightCm))) {
    diagnostics.push(diagnostic('UNSUPPORTED_JUNCTION_HEIGHT', 'ERROR', { junctionId, heightsCm }));
    return { junctionId, type, kitCode: null, parts, diagnostics, valid: false };
  }
  if (heightsCm.length !== 1) {
    diagnostics.push(diagnostic('HEIGHT_TRANSITION_REQUIRED', 'WARNING', { junctionId, heightsCm }));
    return { junctionId, type, kitCode: null, parts, diagnostics, valid: false };
  }

  const floorModes = [...new Set(participants.map((frame) => frame.floorToCeiling))];
  if (floorModes.length !== 1) {
    diagnostics.push(diagnostic('HEIGHT_TRANSITION_REQUIRED', 'WARNING', { junctionId, heightsCm }));
    return { junctionId, type, kitCode: null, parts, diagnostics, valid: false };
  }
  const heightCm = heightsCm[0];
  const floorToCeiling = floorModes[0];
  const entry = getCritterium8JunctionKitEntry({ type, heightCm, floorToCeiling });
  if (!entry) {
    const supportedType = ['TERMINAL', 'DEG_90', 'DEG_180', 'DEG_180_TYPE_B', 'T', 'X'].includes(type);
    diagnostics.push(diagnostic(
      supportedType ? 'UNSUPPORTED_JUNCTION_HEIGHT' : 'MISSING_DOCUMENTED_JUNCTION_CODE',
      'WARNING',
      { junctionId, type, heightCm, floorToCeiling }
    ));
    return { junctionId, type, kitCode: null, parts, diagnostics, valid: false };
  }

  const variant = type === 'DEG_180_TYPE_B' ? 'TYPE_B' : null;
  const part = createCritterium8PartDefinition({
    id: `C8_PART_${junctionId}_JUNCTION_KIT`,
    frameId: junctionId,
    type: 'JUNCTION_KIT',
    code: entry.code,
    description: `Kit de unión ${type}`,
    quantity: 1,
    heightCm,
    metadata: {
      junctionId,
      junctionType: type,
      heightCm,
      floorToCeiling,
      variant,
      includesTip: entry.includesTip,
      tipType: entry.tipType,
      kitRequiresCeilingU: entry.kitRequiresCeilingU,
      ceilingUIncluded: entry.ceilingUIncluded,
      ceilingUCode: entry.ceilingUCode,
      documentedComponents: [...entry.documentedComponents],
      source: entry.source,
    },
  });
  parts.push(part);
  const result = { junctionId, type, kitCode: entry.code, parts, diagnostics, valid: true };
  const validation = validateCritterium8JunctionParts(result);
  validation.errors.forEach((code) => diagnostics.push(diagnostic(code, 'ERROR', { junctionId })));
  result.valid = validation.valid;
  return result;
}

export function resolveCritterium8SequenceJunctionParts({ sequence = {}, frames = [] } = {}) {
  const results = (Array.isArray(sequence.junctions) ? sequence.junctions : []).map((junction) =>
    resolveCritterium8JunctionParts({ junction, frames })
  );
  const parts = results.flatMap((result) => result.parts);
  const diagnostics = results.flatMap((result) => result.diagnostics);
  const duplicateIds = parts.filter((part, index) => parts.findIndex((candidate) => candidate.id === part.id) !== index);
  duplicateIds.forEach((part) => diagnostics.push(diagnostic('DUPLICATED_PART_ID', 'ERROR', { partId: part.id })));
  return { parts, results, diagnostics, valid: results.every((result) => result.valid) && duplicateIds.length === 0 };
}
