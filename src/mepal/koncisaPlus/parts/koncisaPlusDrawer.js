export const KONCISA_PLUS_DRAWER = {
  code: '22000135270',
  logicalCode: '2KAL003000',
  name: 'CAJONERA MOVIL 1 GAVETA SENCILLA 1 ARCHIVO FRENTE METALICO MANIJA EMBEBIDA TAPA METALICA 56X37X48CM KONCISA PLUS 2KAL003000',
  modelSrc: '/assets/models/koncisaPlus/2KAL003000.glb',
  thumbnailSrc: '/assets/imagen/KoncisaPlusImagenes/2KAL003000.png',
  dimensionsMm: { widthMm: 560, depthMm: 370, heightMm: 480 },
};

export function createKoncisaPlusDrawerPart(position = {}) {
  return {
    type: 'GLB_PART',
    kind: 'GLB_PART',
    line: 'KONCISA.PLUS',
    code: KONCISA_PLUS_DRAWER.code,
    rawCodigoPT: KONCISA_PLUS_DRAWER.code,
    logicalCode: KONCISA_PLUS_DRAWER.logicalCode,
    existsInCatalog: true,
    name: KONCISA_PLUS_DRAWER.name,
    dimMm: { ...KONCISA_PLUS_DRAWER.dimensionsMm },
    position: {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0,
      z: Number(position.z) || 0,
    },
    rotation: { x: 0, y: 0, z: 0 },
    model: { kind: 'glb', src: KONCISA_PLUS_DRAWER.modelSrc },
    meta: {
      category: 'koncisa-plus-accessories',
      accessoryType: 'MOBILE_DRAWER',
      modelCode: KONCISA_PLUS_DRAWER.logicalCode,
    },
  };
}