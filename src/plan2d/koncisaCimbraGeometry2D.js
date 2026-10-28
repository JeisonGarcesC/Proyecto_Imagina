import { createShape, SHAPE_2D_TYPES } from './geometry2D/shapes2D.js';

const KONCISA_DUCT_KINDS = new Set(['ductoPiso', 'ductoTecho']);

// Medida técnica confirmada en el plano suministrado. No contiene offsets:
// la posición y orientación siempre proceden del ducto 3D.
export const KONCISA_CIMBRA_DIMENSIONS_MM = Object.freeze({
  sencillo: Object.freeze({
    estandar: Object.freeze({ widthMm: 74.3, depthMm: 77.3 }),
  }),
  // Perforación libre de piso del mapa de producto del puesto líder: 100 × 43 mm.
  leaderFloor: Object.freeze({ widthMm: 100, depthMm: 43 }),
  // Perforación libre de pared; coincide con ancho/alto del acople 22000137143.
  leaderWall: Object.freeze({ widthMm: 230, heightMm: 85 }),
});

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function resolveDuctKind(part) {
  const kind = String(part?.type || part?.kind || '').trim();
  if (KONCISA_DUCT_KINDS.has(kind)) return kind;
  const category = String(part?.meta?.category || '').trim().toLowerCase();
  if (category === 'ductos-a-piso') return 'ductoPiso';
  if (category === 'ductos-a-techo') return 'ductoTecho';
  return null;
}

function normalizeCableType(part) {
  const value = String(
    part?.meta?.tipoPasoCable || part?.meta?.cableType || part?.meta?.accesoCableado || 'estandar'
  ).toLowerCase();
  return value.includes('pasacable') ? 'pasacable' : 'estandar';
}

function isKoncisaPart(part) {
  return (
    String(part?.line || part?.meta?.line || '').toUpperCase() === 'KONCISA.PLUS' ||
    String(part?.kind || part?.type || '').toUpperCase() === 'KONCISA_PLUS_ASSEMBLY' ||
    Boolean(resolveDuctKind(part))
  );
}

export function getKoncisaPostId(part) {
  return part?.groupId || null;
}

export function getKoncisaPostIds(parts) {
  if (!Array.isArray(parts)) return new Set();
  return new Set(parts.filter(isKoncisaPart).map(getKoncisaPostId).filter(Boolean));
}

export function resolveSelectedKoncisaPostId(parts, selectedIds) {
  if (!Array.isArray(parts) || !Array.isArray(selectedIds) || !selectedIds.length) return null;
  const selected = new Set(selectedIds.filter(Boolean));
  const matchingPart = parts.find(
    (part) =>
      isKoncisaPart(part) &&
      (selected.has(part?.id) ||
        selected.has(part?.instanceId) ||
        selected.has(part?.groupId) ||
        selected.has(part?.parentAssemblyId))
  );
  return getKoncisaPostId(matchingPart);
}

export function pruneCimbraVisibility(visiblePostIds, parts) {
  const existingPostIds = getKoncisaPostIds(parts);
  return new Set(Array.from(visiblePostIds || []).filter((postId) => existingPostIds.has(postId)));
}

export function resolveKoncisaCimbraDimensions(part) {
  const explicit = part?.meta?.cimbraDimensionsMm;
  const explicitWidthMm = finitePositive(explicit?.widthMm);
  const explicitDepthMm = finitePositive(explicit?.depthMm);
  if (explicitWidthMm && explicitDepthMm) {
    return { widthMm: explicitWidthMm, depthMm: explicitDepthMm, source: 'metadata' };
  }

  if (part?.meta?.layoutType === 'LEADER') {
    return resolveDuctKind(part) === 'ductoPiso'
      ? { ...KONCISA_CIMBRA_DIMENSIONS_MM.leaderFloor, source: 'leader-technical-map' }
      : null;
  }
  const tipoPuesto = part?.meta?.tipoPuesto === 'doble' ? 'doble' : 'sencillo';
  const cableType = normalizeCableType(part);
  const configured = KONCISA_CIMBRA_DIMENSIONS_MM?.[tipoPuesto]?.[cableType];
  return configured ? { ...configured, source: 'technical-config' } : null;
}

/** Posición/rotación: objeto 3D. Tamaño: dimensión técnica, nunca bounds2d. */
export function getDuctCimbraGeometry(part) {
  const ductKind = resolveDuctKind(part);
  const dimensions = resolveKoncisaCimbraDimensions(part);
  if (!ductKind || !dimensions) return null;
  const x = Number(part?.x);
  const z = Number(part?.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;

  return {
    ...createShape({
      id: `cimbra:${part?.instanceId || part?.id || 'ducto'}`,
      type: SHAPE_2D_TYPES.RECTANGLE,
      semanticType: 'cimbra',
      geometry: {
        x,
        y: z,
        width: dimensions.widthMm / 1000,
        height: dimensions.depthMm / 1000,
        rotation: Number.isFinite(Number(part?.rotY)) ? Number(part.rotY) : 0,
      },
      style: {
        stroke: '#ef1b1b',
        strokeWidth: 2,
        fill: false,
      },
    }),
    metadata: {
      ductId: part?.instanceId || part?.id || null,
      postId: getKoncisaPostId(part),
      ductKind,
      destination: ductKind === 'ductoTecho' ? 'TECHO' : 'PISO',
      layoutType: part?.meta?.layoutType || null,
      tipoPuesto: part?.meta?.tipoPuesto || null,
      cableType: normalizeCableType(part),
      dimensionSource: dimensions.source,
    },
  };
}

export function getDuctCimbras(parts, { visiblePostIds = [] } = {}) {
  if (!Array.isArray(parts)) return [];
  const visible = visiblePostIds instanceof Set ? visiblePostIds : new Set(visiblePostIds);
  return parts
    .filter((part) => visible.has(getKoncisaPostId(part)))
    .map(getDuctCimbraGeometry)
    .filter(Boolean);
}

function elevationAxis(point, direction) {
  if (direction === 'front') return point.x;
  if (direction === 'back') return -point.x;
  if (direction === 'left') return point.z;
  return -point.z;
}

/** Referencia de pared derivada del acople real y de la proyección actual del alzado. */
export function getLeaderWallCimbras(parts, elevations, visiblePostIds, getElevationSource) {
  if (!Array.isArray(parts) || !Array.isArray(elevations)) return [];
  const visible = visiblePostIds instanceof Set ? visiblePostIds : new Set(visiblePostIds || []);
  const couplings = parts.filter((part) =>
    part?.meta?.layoutType === 'LEADER' &&
    part?.subtype === 'leader-outlet-wall-coupling' &&
    visible.has(part.groupId) &&
    part.cimbraWorldCenter
  );
  if (!couplings.length) return [];
  return elevations.flatMap((elevation) => {
    if (elevation?.type !== 'elevation' || elevation.visible === false) return [];
    const selected = new Set(elevation.sourceSelection || []);
    const selectedPosts = new Set(parts.filter((part) =>
      selected.has(part.id) || selected.has(part.instanceId) || selected.has(part.groupId))
      .map((part) => part.groupId).filter(Boolean));
    const matching = couplings.filter((part) =>
      selected.has(part.id) || selected.has(part.instanceId) || selectedPosts.has(part.groupId));
    if (!matching.length) return [];
    const source = getElevationSource?.(elevation.sourceSelection);
    const boxes = source?.sourceBoxes;
    if (!Array.isArray(boxes) || !boxes.length) return [];
    const direction = elevation.viewDirection;
    const axisValues = boxes.flatMap((box) => [
      elevationAxis(box.min, direction), elevationAxis(box.max, direction),
    ]);
    const axisCenter = (Math.min(...axisValues) + Math.max(...axisValues)) / 2;
    const minY = Math.min(...boxes.map((box) => box.min.y));
    const maxY = Math.max(...boxes.map((box) => box.max.y));
    const verticalCenter = (minY + maxY) / 2;
    return matching.flatMap((part) => {
      const rotation = Number(part.rotY);
      if (!Number.isFinite(rotation)) return [];
      const alongX = Math.abs(Math.cos(rotation));
      const broadFaceVisible = direction === 'front' || direction === 'back'
        ? alongX >= Math.abs(Math.sin(rotation))
        : Math.abs(Math.sin(rotation)) >= alongX;
      if (!broadFaceVisible) return [];
      const center = part.cimbraWorldCenter;
      if (![center.x, center.y, center.z].every(Number.isFinite)) return [];
      const { widthMm, heightMm } = KONCISA_CIMBRA_DIMENSIONS_MM.leaderWall;
      return [{
        ...createShape({
          id: `cimbra:wall:${elevation.id}:${part.instanceId || part.id}`,
          type: SHAPE_2D_TYPES.RECTANGLE,
          semanticType: 'cimbra',
          geometry: {
            x: elevation.geometry.x + elevationAxis(center, direction) - axisCenter,
            y: elevation.geometry.y + verticalCenter - center.y,
            width: widthMm / 1000,
            height: heightMm / 1000,
            rotation: 0,
          },
          style: { stroke: '#ef1b1b', strokeWidth: 2, fill: false },
        }),
        metadata: { postId: part.groupId, couplingId: part.instanceId || part.id, destination: 'PARED' },
      }];
    });
  });
}
