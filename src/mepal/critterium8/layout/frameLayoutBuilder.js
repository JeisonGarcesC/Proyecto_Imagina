import { CRITTERIUM8_TILE_PROJECTION_MM } from '../catalog/tileCatalog.js';
import { buildCritterium8FrameAnchors, createCritterium8AnchorId, createCritterium8SlotAnchorId } from './anchorDefinition.js';
import { createCritterium8FrameAssemblyLayout } from './frameAssemblyLayout.js';
import { createCritterium8PartPlacement, createCritterium8PlacementBounds } from './partPlacement.js';
import { validateCritterium8AssemblyLayout } from '../rules/layoutRules.js';

const SYMBOLIC_TYPES = new Set(['FRAME_LEFT_POST', 'FRAME_RIGHT_POST', 'TOP_BEVEL', 'LEVELER', 'CEILING_U']);

function placementForPart(part, context) {
  const { frameId, widthCm, depthCm, baseFrameHeightCm, projectHeightCm, composition, diagnostics } = context;
  const halfWidth = widthCm / 2;
  const halfDepth = depthCm / 2;
  const metadata = { role: part.type, structural: part.type !== 'TILE', slotId: part.slotId, side: part.side, face: part.metadata?.face || (part.type === 'TILE' ? 'FRONT' : null) };
  let position = { x: 0, y: 0, z: 0 };
  let anchorId = null;
  let bounds = null;

  if (part.type === 'FRAME_LEFT_POST' || part.type === 'FRAME_RIGHT_POST') {
    const left = part.type === 'FRAME_LEFT_POST';
    position = { x: left ? -halfWidth : halfWidth, y: Number(part.heightCm) / 2, z: 0 };
    anchorId = createCritterium8AnchorId(frameId, left ? 'LEFT_CENTER' : 'RIGHT_CENTER');
  } else if (part.type === 'BOTTOM_PLINTH') {
    position = { x: 0, y: (Number(composition.plinth.startCm) + Number(composition.plinth.endCm)) / 2, z: 0 };
    anchorId = createCritterium8AnchorId(frameId, 'BOTTOM_CENTER');
    bounds = createCritterium8PlacementBounds({ position, widthCm: part.widthCm, heightCm: part.heightCm, depthCm: part.depthCm });
  } else if (part.type === 'TOP_BEVEL') {
    position = { x: 0, y: Number(composition.heightCm), z: 0 };
    anchorId = createCritterium8AnchorId(frameId, 'FRAME_TOP_CENTER');
  } else if (part.type === 'TILE') {
    const slot = composition.tileSlots.find((candidate) => candidate.id === part.slotId);
    if (!slot) return { diagnostic: { code: 'MISSING_SLOT', level: 'ERROR', partId: part.id, slotId: part.slotId } };
    const tileDepthCm = CRITTERIUM8_TILE_PROJECTION_MM / 10;
    position = { x: 0, y: (Number(slot.startCm) + Number(slot.endCm)) / 2, z: halfDepth + tileDepthCm / 2 };
    anchorId = createCritterium8SlotAnchorId(slot.id);
    bounds = createCritterium8PlacementBounds({ position, widthCm: part.widthCm, heightCm: part.heightCm, depthCm: tileDepthCm });
    metadata.tileProjectionCm = tileDepthCm;
  } else if (part.type === 'GROWTH_MODULE') {
    const growth = (composition.growthModules || [])[Number(part.id.match(/_(\d+)$/)?.[1] || 0)];
    const startCm = Number(growth?.startCm ?? baseFrameHeightCm);
    position = { x: 0, y: startCm + Number(part.heightCm) / 2, z: 0 };
    bounds = createCritterium8PlacementBounds({ position, widthCm: part.widthCm, heightCm: part.heightCm, depthCm: part.depthCm });
    metadata.structural = true;
  } else if (part.type === 'CEILING_POST') {
    position = { x: 0, y: 204 + Number(part.heightCm) / 2, z: 0 };
    bounds = createCritterium8PlacementBounds({ position, widthCm: part.widthCm, heightCm: part.heightCm, depthCm: part.depthCm });
    metadata.structural = true;
  } else if (part.type === 'CEILING_U') {
    position = { x: 0, y: projectHeightCm, z: 0 };
    anchorId = createCritterium8AnchorId(frameId, 'TOP_CENTER');
  } else if (part.type === 'LEVELER') {
    position = { x: 0, y: 0, z: 0 };
    anchorId = createCritterium8AnchorId(frameId, 'ORIGIN');
  } else {
    return { diagnostic: { code: 'UNSUPPORTED_PART_TYPE', level: 'ERROR', partId: part.id, partType: part.type } };
  }

  if (SYMBOLIC_TYPES.has(part.type) || !bounds) diagnostics.push({ code: 'MISSING_PHYSICAL_DIMENSIONS', level: 'WARNING', partId: part.id, partType: part.type });
  return { placement: createCritterium8PartPlacement({ partId: part.id, partType: part.type, position, anchorId, bounds, metadata }) };
}

export function buildCritterium8FrameAssemblyLayout({ frame = {}, composition = {}, parts = [] } = {}) {
  const frameId = String(frame.id || composition.frameId || 'UNIDENTIFIED');
  const widthCm = Number(frame.widthCm ?? composition.widthCm);
  const projectHeightCm = Number(frame.heightCm ?? composition.projectHeightCm ?? composition.heightCm);
  const baseFrameHeightCm = Number(composition.baseFrameHeightCm ?? composition.heightCm);
  const depthCm = Number(frame.thicknessCm ?? 8);
  const diagnostics = [];
  const anchors = buildCritterium8FrameAnchors({ frameId, widthCm, heightCm: projectHeightCm, frameTopCm: composition.heightCm, depthCm, tileSlots: composition.tileSlots || [] });
  const placements = [];
  for (const part of parts) {
    const result = placementForPart(part, { frameId, widthCm, depthCm, baseFrameHeightCm, projectHeightCm, composition, diagnostics });
    if (result.placement) placements.push(result.placement);
    if (result.diagnostic) diagnostics.push(result.diagnostic);
  }
  const layout = createCritterium8FrameAssemblyLayout({
    frameId, widthCm, heightCm: projectHeightCm, depthCm, anchors, placements,
    bounds: { minX: -widthCm / 2, maxX: widthCm / 2, minY: 0, maxY: projectHeightCm, minZ: -depthCm / 2, maxZ: depthCm / 2 },
    diagnostics,
  });
  const validation = validateCritterium8AssemblyLayout(layout, { frame, composition, parts });
  layout.diagnostics.push(...validation.errors.map((code) => ({ code, level: 'ERROR' })));
  return { ...layout, valid: validation.valid };
}
