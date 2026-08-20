import { CRITTERIUM8_FAMILY } from '../../catalog/frameCatalog.js';

function cloneAnchor(anchor) {
  return {
    ...anchor,
    position: { ...anchor.position },
    metadata: {
      ...anchor.metadata,
      direction: anchor.metadata?.direction ? { ...anchor.metadata.direction } : undefined,
    },
  };
}

export function createCritterium8JunctionAssemblyLayout(options = {}) {
  const junctionId = String(options.junctionId || 'UNIDENTIFIED');
  return {
    schemaVersion: 1,
    id: String(options.id || `C8_JLAYOUT_${junctionId}`),
    family: CRITTERIUM8_FAMILY,
    type: 'JUNCTION_ASSEMBLY_LAYOUT',
    junctionId,
    junctionType: String(options.junctionType || '').toUpperCase(),
    position: {
      x: Number(options.position?.x ?? 0),
      y: Number(options.position?.y ?? 0),
      z: Number(options.position?.z ?? 0),
    },
    rotationY: Number(options.rotationY ?? 0),
    anchors: (options.anchors || []).map(cloneAnchor),
    placements: (options.placements || []).map((placement) => ({
      ...placement,
      position: { ...placement.position },
      rotation: { ...placement.rotation },
      scale: { ...placement.scale },
      metadata: { ...placement.metadata },
    })),
    bounds: options.bounds ? { ...options.bounds } : null,
    metadata: options.metadata && typeof options.metadata === 'object'
      ? {
          ...options.metadata,
          incomingDirections: (options.metadata.incomingDirections || []).map((item) => ({ ...item, direction: { ...item.direction } })),
          hostFrameIds: [...(options.metadata.hostFrameIds || [])],
          branchFrameIds: [...(options.metadata.branchFrameIds || [])],
          heightsCm: [...(options.metadata.heightsCm || [])],
          documentedComponents: [...(options.metadata.documentedComponents || [])],
        }
      : {},
    diagnostics: (options.diagnostics || []).map((item) => ({ ...item })),
    valid: options.valid === true,
  };
}
