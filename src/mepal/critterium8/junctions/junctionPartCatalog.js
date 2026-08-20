const CEILING_U_CODE = '22191200755';

const components = Object.freeze({
  TERMINAL: Object.freeze(['PUNTERA_TERMINAL', 'CINTA_TERMINAL']),
  DEG_90: Object.freeze(['ESCUADRA_90', 'PERFIL_KIT_UNION', 'PERFIL_BURBUJA', 'CINTA_90', 'PUNTERA_90']),
  DEG_180: Object.freeze(['PERFIL_KIT_UNION', 'CINTA_T', 'PUNTERA_180']),
  DEG_180_TYPE_B: Object.freeze(['PERFIL_KIT_UNION', 'CINTA_T', 'PUNTERA_180_TYPE_B']),
  T: Object.freeze(['ESCUADRA_90', 'PERFIL_KIT_UNION', 'PERFIL_BURBUJA', 'CINTA_T', 'PUNTERA_T']),
  X: Object.freeze(['ESCUADRA_X', 'PERFIL_KIT_UNION', 'PERFIL_BURBUJA', 'PUNTERA_X']),
});

const catalog = {
  TERMINAL: {
    halfHeight: { 90: '22191900126', 110: '22191703014', 128: '22191900127', 166: '22191900128', 204: '22191900129' },
    floorToCeiling: {},
  },
  DEG_90: {
    halfHeight: { 90: '22191900091', 110: '22191900281', 128: '22191900092', 166: '22191900093', 204: '22191900094' },
    floorToCeiling: { 242: '22191900095', 280: '22191900096', 318: '22191900097' },
  },
  DEG_180: {
    halfHeight: { 90: '22000014319', 110: '22000014320', 128: '22000014321', 166: '22000014322', 204: '22000014323' },
    floorToCeiling: { ANY: '22000027744' },
  },
  DEG_180_TYPE_B: {
    halfHeight: { 90: '22191900077', 110: '22191703008', 128: '22191900078', 166: '22191900079', 204: '22191900080' },
    floorToCeiling: { 242: '22191900081', 280: '22191900082', 318: '22191900083' },
  },
  T: {
    halfHeight: { 90: '22191900084', 110: '22191703009', 128: '22191900085', 166: '22191900086', 204: '22191900087' },
    floorToCeiling: { 242: '22191900088', 280: '22191900089', 318: '22191900090' },
  },
  X: {
    halfHeight: { 90: '22191900112', 128: '22191900113', 166: '22191900114', 204: '22191900115' },
    floorToCeiling: { 242: '22191900116', 280: '22191900117', 318: '22191900118' },
  },
};

export const CRITTERIUM8_CEILING_U_CODE = CEILING_U_CODE;

export const CRITTERIUM8_JUNCTION_PART_CATALOG = Object.freeze(
  Object.fromEntries(Object.entries(catalog).map(([type, modes]) => [
    type,
    Object.freeze({
      type,
      halfHeight: Object.freeze({ ...modes.halfHeight }),
      floorToCeiling: Object.freeze({ ...modes.floorToCeiling }),
      documentedComponents: components[type] || Object.freeze([]),
      source: 'MAPA_PRODUCTO',
    }),
  ]))
);

export function getCritterium8JunctionKitEntry({ type, heightCm, floorToCeiling = false } = {}) {
  const normalizedType = String(type || '').trim().toUpperCase();
  const descriptor = CRITTERIUM8_JUNCTION_PART_CATALOG[normalizedType];
  if (!descriptor) return null;
  const table = floorToCeiling ? descriptor.floorToCeiling : descriptor.halfHeight;
  const code = table[Number(heightCm)] || table.ANY || null;
  if (!code) return null;
  const ceilingUIncluded = floorToCeiling && normalizedType === 'DEG_90';
  return {
    type: normalizedType,
    code,
    heightCm: Number(heightCm),
    floorToCeiling,
    includesTip: !floorToCeiling,
    tipType: floorToCeiling ? null : normalizedType,
    kitRequiresCeilingU: floorToCeiling,
    ceilingUIncluded,
    ceilingUCode: floorToCeiling ? CEILING_U_CODE : null,
    documentedComponents: [...descriptor.documentedComponents],
    source: descriptor.source,
  };
}
