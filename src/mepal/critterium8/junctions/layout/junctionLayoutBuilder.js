import { buildCritterium8JunctionAnchors, createCritterium8JunctionAnchorId } from './junctionAnchorDefinition.js';
import { createCritterium8JunctionPlacement } from './junctionPlacement.js';
import { createCritterium8JunctionAssemblyLayout } from './junctionAssemblyLayout.js';
import { validateCritterium8JunctionLayout } from './junctionLayoutRules.js';

export const CRITTERIUM8_PROVISIONAL_JUNCTION_ENVELOPE_M = Object.freeze({ width: 0.16, depth: 0.16 });

function normalizeAngle(value) {
  const full = Math.PI * 2;
  const normalized = Number(value) % full;
  return normalized < 0 ? normalized + full : normalized;
}

function canonicalAxisAngle(value) {
  const normalized = normalizeAngle(value);
  return normalized >= Math.PI ? normalized - Math.PI : normalized;
}

function angleDistance(first, second) {
  const difference = Math.abs(normalizeAngle(first) - normalizeAngle(second));
  return Math.min(difference, Math.PI * 2 - difference);
}

function directionFromAngle(angle) {
  return { x: Math.cos(angle), z: -Math.sin(angle) };
}

function angleFromDirection(direction) {
  return normalizeAngle(Math.atan2(-direction.z, direction.x));
}

function frameMap(frames) {
  return new Map((frames || []).map((frame) => [String(frame.frameId || frame.id || ''), frame]));
}

function buildConnections(junction, frames, diagnostics) {
  const byId = frameMap(frames);
  return (junction.endpointRefs || []).map((reference) => {
    const frameId = String(reference.frameId);
    const frame = byId.get(frameId);
    if (!frame) {
      diagnostics.push({ code: 'MISSING_FRAME_REFERENCE', level: 'ERROR', frameId, junctionId: junction.id });
      return null;
    }
    const endpointRole = String(reference.endpoint || '').toUpperCase();
    const baseRotation = Number(frame.rotationY ?? frame.rotation?.y ?? 0);
    if (!Number.isFinite(baseRotation) || !['START', 'END'].includes(endpointRole)) {
      diagnostics.push({ code: 'INVALID_JUNCTION_ORIENTATION', level: 'ERROR', frameId, junctionId: junction.id });
      return null;
    }
    const angle = normalizeAngle(baseRotation + (endpointRole === 'END' ? Math.PI : 0));
    return { frameId, endpointRole, angle, direction: directionFromAngle(angle), frame };
  }).filter(Boolean).sort((first, second) => first.frameId.localeCompare(second.frameId));
}

function findHostPair(connections) {
  let pair = null;
  let bestDistance = -1;
  for (let first = 0; first < connections.length; first += 1) {
    for (let second = first + 1; second < connections.length; second += 1) {
      const distance = angleDistance(connections[first].angle, connections[second].angle);
      if (distance > bestDistance) {
        bestDistance = distance;
        pair = [connections[first], connections[second]];
      }
    }
  }
  return pair;
}

function resolveOrientation(type, connections) {
  if (!connections.length) return { rotationY: NaN, hostFrameIds: [], branchFrameIds: [] };
  if (type === 'TERMINAL') {
    return { rotationY: connections[0].angle, hostFrameIds: [], branchFrameIds: [] };
  }
  if (type === 'DEG_180' || type === 'DEG_180_TYPE_B') {
    return { rotationY: canonicalAxisAngle(connections[0].angle), hostFrameIds: connections.map((item) => item.frameId), branchFrameIds: [] };
  }
  if (type === 'T') {
    const hostPair = findHostPair(connections) || [];
    const hostFrameIds = hostPair.map((item) => item.frameId).sort();
    return {
      rotationY: hostPair.length ? canonicalAxisAngle(hostPair[0].angle) : NaN,
      hostFrameIds,
      branchFrameIds: connections.map((item) => item.frameId).filter((frameId) => !hostFrameIds.includes(frameId)).sort(),
    };
  }
  if (type === 'X') {
    const axes = connections.map((item) => canonicalAxisAngle(item.angle)).sort((first, second) => first - second);
    return { rotationY: axes[0], hostFrameIds: [], branchFrameIds: [] };
  }
  if (connections.length === 2) {
    const sum = connections.reduce((result, item) => ({ x: result.x + item.direction.x, z: result.z + item.direction.z }), { x: 0, z: 0 });
    if (Math.hypot(sum.x, sum.z) < 1e-9) return { rotationY: canonicalAxisAngle(connections[0].angle), hostFrameIds: [], branchFrameIds: [] };
    return { rotationY: angleFromDirection(sum), hostFrameIds: [], branchFrameIds: [] };
  }
  return { rotationY: NaN, hostFrameIds: [], branchFrameIds: [] };
}

function resolveHeightMetadata(frames, connections, resolution) {
  const participants = connections.map((connection) => connection.frame);
  const heightsCm = [...new Set(participants.map((frame) => {
    const floor = String(frame.frameMode || '').toUpperCase() === 'FLOOR_TO_CEILING';
    return Number(floor ? frame.projectHeightCm : frame.heightCm);
  }).filter(Number.isFinite))].sort((first, second) => first - second);
  const kitMetadata = resolution.parts?.find((part) => part.type === 'JUNCTION_KIT')?.metadata || {};
  const floorToCeiling = participants.some((frame) => String(frame.frameMode || '').toUpperCase() === 'FLOOR_TO_CEILING');
  const projectHeights = [...new Set(participants.filter((frame) => String(frame.frameMode || '').toUpperCase() === 'FLOOR_TO_CEILING').map((frame) => Number(frame.projectHeightCm)).filter(Number.isFinite))];
  return {
    heightsCm,
    heightCm: heightsCm.length === 1 ? heightsCm[0] : null,
    boundsHeightM: heightsCm.length ? Math.max(...heightsCm) / 100 : 0,
    floorToCeiling,
    projectHeightCm: projectHeights.length === 1 ? projectHeights[0] : null,
    requiresCeilingU: kitMetadata.kitRequiresCeilingU === true,
    includesCeilingU: kitMetadata.ceilingUIncluded === true,
    includesTip: kitMetadata.includesTip === true,
    tipType: kitMetadata.tipType ?? null,
    documentedComponents: [...(kitMetadata.documentedComponents || [])],
  };
}

function createProvisionalBounds(heightM) {
  const halfWidth = CRITTERIUM8_PROVISIONAL_JUNCTION_ENVELOPE_M.width / 2;
  const halfDepth = CRITTERIUM8_PROVISIONAL_JUNCTION_ENVELOPE_M.depth / 2;
  return {
    minX: -halfWidth,
    maxX: halfWidth,
    minY: 0,
    maxY: heightM,
    minZ: -halfDepth,
    maxZ: halfDepth,
  };
}

export function buildCritterium8JunctionLayout({ junction = {}, resolution = {}, frames = [] } = {}) {
  const junctionId = String(junction.id || resolution.junctionId || '');
  const junctionType = String(resolution.type || junction.type || '').toUpperCase();
  const position = { x: Number(junction.point?.x), y: 0, z: Number(junction.point?.z) };
  const diagnostics = (resolution.diagnostics || []).map((item) => ({ ...item }));
  const connections = buildConnections(junction, frames, diagnostics);
  const orientation = resolveOrientation(junctionType, connections);
  if (!Number.isFinite(orientation.rotationY)) diagnostics.push({ code: 'INVALID_JUNCTION_ORIENTATION', level: 'ERROR', junctionId });
  const height = resolveHeightMetadata(frames, connections, resolution);
  const replacedByDuct = diagnostics.some((item) => item.code === 'REPLACED_BY_DUCT');
  const heightTransition = diagnostics.some((item) => item.code === 'HEIGHT_TRANSITION_REQUIRED') || height.heightsCm.length > 1;
  const kitPart = (resolution.parts || []).find((part) => part.type === 'JUNCTION_KIT') || null;
  if (!kitPart && !replacedByDuct) diagnostics.push({ code: 'MISSING_JUNCTION_PART', level: 'WARNING', junctionId });
  if (heightTransition && !diagnostics.some((item) => item.code === 'HEIGHT_TRANSITION_REQUIRED')) {
    diagnostics.push({ code: 'HEIGHT_TRANSITION_REQUIRED', level: 'WARNING', junctionId, heightsCm: [...height.heightsCm] });
  }
  diagnostics.push({ code: 'PROVISIONAL_JUNCTION_BOUNDS', level: 'INFO', junctionId });

  const anchors = buildCritterium8JunctionAnchors({ junctionId, heightM: height.boundsHeightM, connections });
  const placements = kitPart && !replacedByDuct ? [createCritterium8JunctionPlacement({
    partId: kitPart.id,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: orientation.rotationY, z: 0 },
    anchorId: createCritterium8JunctionAnchorId(junctionId, 'CENTER'),
    metadata: { junctionId, junctionType, kitCode: kitPart.code },
  })] : [];
  const metadata = {
    incomingDirections: connections.map(({ frameId, endpointRole, direction, angle }) => ({ frameId, endpointRole, direction, angle })),
    endpointRole: junctionType === 'TERMINAL' ? connections[0]?.endpointRole || null : null,
    hostFrameIds: orientation.hostFrameIds,
    branchFrameIds: orientation.branchFrameIds,
    heightsCm: height.heightsCm,
    heightCm: height.heightCm,
    floorToCeiling: height.floorToCeiling,
    projectHeightCm: height.projectHeightCm,
    requiresCeilingU: height.requiresCeilingU,
    includesCeilingU: height.includesCeilingU,
    includesTip: height.includesTip,
    tipType: height.tipType,
    documentedComponents: height.documentedComponents,
    replacedByDuct,
    provisionalBounds: true,
    commercialValid: resolution.valid === true && !heightTransition,
  };
  let layout = createCritterium8JunctionAssemblyLayout({
    junctionId,
    junctionType,
    position,
    rotationY: orientation.rotationY,
    anchors,
    placements,
    bounds: createProvisionalBounds(height.boundsHeightM),
    metadata,
    diagnostics,
    valid: false,
  });
  const validation = validateCritterium8JunctionLayout(layout, frames);
  validation.errors.forEach((code) => layout.diagnostics.push({ code, level: 'ERROR', junctionId }));
  layout = { ...layout, valid: validation.valid && (metadata.commercialValid || replacedByDuct) };
  return layout;
}

export function buildCritterium8SequenceJunctionLayouts({ sequence = {}, frames = [], resolutions = [] } = {}) {
  const byJunctionId = new Map((resolutions || []).map((resolution) => [String(resolution.junctionId), resolution]));
  const layouts = (sequence.junctions || []).map((junction) => buildCritterium8JunctionLayout({
    junction,
    resolution: byJunctionId.get(String(junction.id)) || { junctionId: junction.id, type: junction.type, parts: [], diagnostics: [], valid: false },
    frames,
  }));
  return { layouts, diagnostics: layouts.flatMap((layout) => layout.diagnostics.map((item) => ({ ...item }))) };
}
