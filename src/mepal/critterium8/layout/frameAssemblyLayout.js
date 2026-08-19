import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';

export function createCritterium8FrameAssemblyLayout(options = {}) {
  return {
    schemaVersion: 1,
    id: String(options.id || `C8_LAYOUT_${String(options.frameId || 'UNIDENTIFIED')}`),
    family: CRITTERIUM8_FAMILY,
    type: 'FRAME_ASSEMBLY_LAYOUT',
    frameId: String(options.frameId || 'UNIDENTIFIED'),
    widthCm: Number(options.widthCm),
    heightCm: Number(options.heightCm),
    depthCm: Number(options.depthCm),
    anchors: (options.anchors || []).map((anchor) => ({ ...anchor, position: { ...anchor.position }, metadata: { ...anchor.metadata } })),
    placements: (options.placements || []).map((placement) => ({ ...placement, position: { ...placement.position }, rotation: { ...placement.rotation }, scale: { ...placement.scale }, bounds: placement.bounds ? { ...placement.bounds } : null, metadata: { ...placement.metadata } })),
    bounds: { ...options.bounds },
    diagnostics: (options.diagnostics || []).map((diagnostic) => ({ ...diagnostic })),
  };
}
