import { createShape, SHAPE_2D_TYPES } from './geometry2D/shapes2D.js';

const KONCISA_DUCT_KINDS = new Set(['ductoPiso', 'ductoTecho']);

// Medida técnica confirmada en el plano suministrado. No contiene offsets:
// la posición y orientación siempre proceden del ducto 3D.
export const KONCISA_CIMBRA_DIMENSIONS_MM = Object.freeze({
  sencillo: Object.freeze({
    estandar: Object.freeze({ widthMm: 74.3, depthMm: 77.3 }),
  }),
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

  if (part?.meta?.layoutType === 'LEADER') return null;
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
