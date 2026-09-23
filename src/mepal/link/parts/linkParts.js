// Pure part definitions in millimetres, independent of scene registration.
export function linkPart(role, key, dimensions, position, code, description, extra = {}) {
  const { model = null, ...metadata } = extra;
  return {
    type: role.toLowerCase(),
    subtype: metadata?.meta?.tipoModulo || metadata?.meta?.category || role.toLowerCase(),
    line: 'LINK',
    role,
    key,
    dimensions,
    dimMm: { widthMm: dimensions[0], heightMm: dimensions[1], depthMm: dimensions[2] },
    position,
    rotationY: 0,
    rotation: { x: 0, y: metadata.rotationY || 0, z: 0 },
    code,
    logicalCode: code,
    existsInCatalog: !!code,
    rawCodigoPT: code,
    description,
    name: description,
    materialRole: role === 'SURFACE' ? 'surface' : role === 'PEDESTAL' ? 'pedestal' : 'structure',
    model,
    ...metadata,
  };
}

export function getLinkPartDimensions(part) {
  if (Array.isArray(part?.dimensions)) return part.dimensions;
  return [part?.dimMm?.widthMm, part?.dimMm?.heightMm, part?.dimMm?.depthMm].map(
    (value) => Number(value || 0)
  );
}

export function getLinkPartPosition(part) {
  if (Array.isArray(part?.position)) return part.position;
  return [part?.position?.x, part?.position?.y, part?.position?.z].map(
    (value) => Number(value || 0)
  );
}

export function getLinkPartRotationY(part) {
  return Number(part?.rotation?.y ?? part?.rotationY ?? 0);
}
