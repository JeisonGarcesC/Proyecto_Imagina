import { CRITTERIUM8_FAMILY } from '../../catalog/frameCatalog.js';

export function createCritterium8JunctionAnchorId(junctionId, role) {
  return `C8_JANCHOR_${String(junctionId)}_${String(role).toUpperCase()}`;
}

export function createCritterium8JunctionAnchor({ junctionId, role, position, metadata = {} } = {}) {
  const normalizedRole = String(role || '').toUpperCase();
  return {
    id: createCritterium8JunctionAnchorId(junctionId, normalizedRole),
    family: CRITTERIUM8_FAMILY,
    type: normalizedRole,
    position: {
      x: Number(position?.x ?? 0),
      y: Number(position?.y ?? 0),
      z: Number(position?.z ?? 0),
    },
    metadata: { ...metadata, junctionId: String(junctionId || '') },
  };
}

export function buildCritterium8JunctionAnchors({ junctionId, heightM, connections = [] } = {}) {
  const base = { x: 0, y: 0, z: 0 };
  const topY = Number.isFinite(Number(heightM)) ? Number(heightM) : 0;
  const anchors = [
    createCritterium8JunctionAnchor({ junctionId, role: 'CENTER', position: base, metadata: { coordinateSystem: 'JUNCTION_LOCAL_METERS' } }),
    createCritterium8JunctionAnchor({ junctionId, role: 'BOTTOM', position: base, metadata: { coordinateSystem: 'JUNCTION_LOCAL_METERS' } }),
    createCritterium8JunctionAnchor({ junctionId, role: 'TOP', position: { ...base, y: topY }, metadata: { coordinateSystem: 'JUNCTION_LOCAL_METERS' } }),
  ];
  connections.forEach((connection) => {
    anchors.push(createCritterium8JunctionAnchor({
      junctionId,
      role: `FRAME_CONNECTION_${connection.frameId}`,
      position: base,
      metadata: {
        coordinateSystem: 'JUNCTION_LOCAL_METERS',
        frameId: connection.frameId,
        direction: { ...connection.direction },
        endpointRole: connection.endpointRole,
        angle: connection.angle,
      },
    }));
  });
  return anchors;
}
