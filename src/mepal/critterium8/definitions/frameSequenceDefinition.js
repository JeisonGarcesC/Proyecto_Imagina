import { CRITTERIUM8_FAMILY } from '../catalog/frameCatalog.js';

export function createCritterium8FrameSequenceDefinition(options = {}) {
  const frames = Array.isArray(options.frames)
    ? options.frames.map((frame) => ({
      ...frame,
      position: frame?.position ? { ...frame.position } : { x: 0, z: 0 },
      startAnchor: frame?.startAnchor ? { ...frame.startAnchor } : null,
      endAnchor: frame?.endAnchor ? { ...frame.endAnchor } : null,
      metadata: frame?.metadata ? { ...frame.metadata } : {},
      }))
    : [];
  const frameIds = Array.isArray(options.frameIds)
    ? options.frameIds.map(String).filter(Boolean)
    : frames.map((frame) => String(frame.frameId || frame.id || '')).filter(Boolean);
  const junctions = Array.isArray(options.junctions)
    ? options.junctions.map((junction) => ({
        ...junction,
        point: junction?.point ? { ...junction.point } : { x: 0, z: 0 },
        frameIds: Array.isArray(junction?.frameIds) ? [...junction.frameIds] : [],
        endpointRefs: Array.isArray(junction?.endpointRefs)
          ? junction.endpointRefs.map((reference) => ({ ...reference }))
          : [],
        angles: Array.isArray(junction?.angles) ? [...junction.angles] : [],
        metadata: junction?.metadata ? { ...junction.metadata } : {},
      }))
    : [];
  return {
    schemaVersion: 1,
    id: String(options.id || `C8_SEQUENCE_${[...frameIds].sort().join('_') || 'EMPTY'}`),
    family: CRITTERIUM8_FAMILY,
    type: 'FRAME_SEQUENCE',
    frameIds,
    frames,
    junctions,
    diagnostics: Array.isArray(options.diagnostics)
      ? options.diagnostics.map((diagnostic) => ({ ...diagnostic }))
      : [],
    graph: options.graph
      ? {
          nodes: Array.isArray(options.graph.nodes)
            ? options.graph.nodes.map((node) => ({ ...node }))
            : [],
          edges: Array.isArray(options.graph.edges)
            ? options.graph.edges.map((edge) => ({ ...edge }))
            : [],
        }
      : { nodes: [], edges: [] },
    metadata: {
      dirtyConnections: false,
      dirtyJunctions: false,
      ...(options.metadata && typeof options.metadata === 'object' ? options.metadata : {}),
    },
  };
}
