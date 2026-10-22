export const ZEN_ALMACENAMIENTO_PEDESTALS = [
  {
    code: '22000020563',
    name: 'Pedestal móvil 2G+1A frente fórmica con manija (Zen)',
    modelSrc: '/assets/models/Almacenamiento/Pedestal/22000020563.glb',
    widthMm: 400,
    heightMm: 710,
    depthMm: 400,
  },
  {
    code: '22000020564',
    name: 'Pedestal móvil 2G+1A frente metálico con manija (Zen)',
    modelSrc: '/assets/models/Almacenamiento/Pedestal/22000020564.glb',
    widthMm: 400,
    heightMm: 710,
    depthMm: 400,
  },
  {
    code: '22000020565',
    name: 'Pedestal móvil 2G+1A frente metálico manija embebida (Zen)',
    modelSrc: '/assets/models/Almacenamiento/Pedestal/22000020565.glb',
    widthMm: 400,
    heightMm: 710,
    depthMm: 400,
  },
  {
    code: '22000020575',
    name: 'Pedestal móvil total 2G+1A frente fórmica con manija (Zen)',
    modelSrc: '/assets/models/Almacenamiento/Pedestal/22000020575.glb',
    widthMm: 400,
    heightMm: 710,
    depthMm: 400,
  },
  {
    code: '22000020576',
    name: 'Pedestal móvil total 2G+1A frente metálico con manija (Zen)',
    modelSrc: '/assets/models/Almacenamiento/Pedestal/22000020576.glb',
    widthMm: 400,
    heightMm: 710,
    depthMm: 400,
  },
  {
    code: '22000020577',
    name: 'Pedestal móvil total 2G+1A frente metálico manija embebida (Zen)',
    modelSrc: '/assets/models/Almacenamiento/Pedestal/22000020577.glb',
    widthMm: 400,
    heightMm: 710,
    depthMm: 400,
  },
  {
    code: '22000033305',
    name: 'Pedestal móvil metálico Zen',
    modelSrc: '/assets/models/Almacenamiento/Pedestal/22000033305.glb',
    widthMm: 400,
    heightMm: 710,
    depthMm: 400,
  },
];

export const KONCISA_PLUS_LEADER_PEDESTAL = {
  code: '22000133941',
  logicalCode: 'KONPLUSSPYMPED',
  name: 'Pedestal fijo metálico 2S+1A Koncisa Plus (22000133941)',
  modelSrc: '/assets/models/koncisaPlus/2KAL001000.glb',
  widthMm: 400,
  heightMm: 710,
  depthMm: 400,
  isKoncisa: true,
};

export const LINK_LEADER_PEDESTALS = [
  ...ZEN_ALMACENAMIENTO_PEDESTALS,
  KONCISA_PLUS_LEADER_PEDESTAL,
];

export const LINK_LEADER_PEDESTAL = {
  code: null,
  widthMm: 400,
  heightMm: 710,
  depthMm: 400,
  modelSrc: '/assets/models/Almacenamiento/Pedestal/22000020563.glb',
  name: 'LINK pedestal de retorno · Zen Almacenamiento',
};

export function resolveLeaderPedestal(modelCode) {
  const found = LINK_LEADER_PEDESTALS.find(
    (p) => p.code === modelCode || p.logicalCode === modelCode
  );
  if (found) return found;
  return LINK_LEADER_PEDESTAL;
}

