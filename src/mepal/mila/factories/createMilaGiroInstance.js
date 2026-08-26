// src/mepal/mila/factories/createMilaGiroInstance.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MILA_GIRO_TUNE, MILA_GIRO_CONNECTOR_TUNE } from '../config/milaGiroTunables.js';

export const MILA_GROMMET_KIT = {
  code: '22000126755',
  description: 'KIT TOMA CORRIENTE LEVINTON CON VERTEBRA MOREA HAC020000',
  prices: { CO: 472500, USD: 64, EUC: 124 },
};

export const MILA_GIRO_DEFINITIONS = {
  // Port A y Port B centrados en las platinas metálicas grises con sus normales hacia afuera
  45: {
    angleDeg: 45,
    code: '22000127788',
    modelCode: 'TKSSU140000',
    grommetCode: '22000127788',
    label: 'Superficie Giro 45°',
    description: 'SUPERFICIE GIRO 45 GRADOS MELAMINICO TEK SOCIAL (MILA V2) TKSSU140000',
    prices: { CO: 383250, USD: 54, EUC: 112 },
    modelSrc: '/assets/models/Mila/TKSSU140000.glb',
    grommetModelSrc: '/assets/models/Mila/TKSSU140000_GROMMET.glb',
    portA: MILA_GIRO_CONNECTOR_TUNE[45]?.portA || { x: 0.3499, y: 0.030, z: 0.000 },
    portB: MILA_GIRO_CONNECTOR_TUNE[45]?.portB || { x: 0.4842, y: 0.030, z: -0.3258 },
  },
  60: {
    angleDeg: 60,
    code: '22000127786',
    modelCode: 'TKSSU060000',
    grommetCode: '22000127786',
    label: 'Superficie Giro 60°',
    description: 'SUPERFICIE GIRO 60 GRADOS MELAMINICO TEK SOCIAL (MILA V2) TKSSU060000',
    prices: { CO: 467250, USD: 66, EUC: 129 },
    modelSrc: '/assets/models/Mila/TKSSU060000.glb',
    grommetModelSrc: '/assets/models/Mila/TKSSU060000_GROMMET.glb',
    portA: MILA_GIRO_CONNECTOR_TUNE[60]?.portA || { x: 0.3377, y: 0.030, z: 0.000 },
    portB: MILA_GIRO_CONNECTOR_TUNE[60]?.portB || { x: 0.1369, y: 0.030, z: -0.3494 },
  },
  120: {
    angleDeg: 120,
    code: '22000127786',
    modelCode: 'TKSSU130000',
    grommetCode: '22000127786',
    label: 'Superficie Giro 120°',
    description: 'SUPERFICIE GIRO 120 GRADOS MELAMINICO TEK SOCIAL (MILA V2) TKSSU130000',
    prices: { CO: 467250, USD: 66, EUC: 129 },
    modelSrc: '/assets/models/Mila/TKSSU130000.glb',
    grommetModelSrc: '/assets/models/Mila/TKSSU130000_GROMMET.glb',
    portA: MILA_GIRO_CONNECTOR_TUNE[120]?.portA || { x: 0.3835, y: 0.030, z: 0.000 },
    portB: MILA_GIRO_CONNECTOR_TUNE[120]?.portB || { x: 0.5844, y: 0.030, z: -0.3494 },
  },
  135: {
    angleDeg: 135,
    code: '22000127788',
    modelCode: 'TKSSU040000_135',
    grommetCode: '22000127788',
    label: 'Superficie Giro 135°',
    description: 'SUPERFICIE GIRO 135 GRADOS MELAMINICO TEK SOCIAL (MILA V2) TKSSU040000_135',
    prices: { CO: 383250, USD: 54, EUC: 112 },
    modelSrc: '/assets/models/Mila/TKSSU040000_135.glb',
    grommetModelSrc: '/assets/models/Mila/TKSSU040000_135_GROMMET.glb',
    portA: MILA_GIRO_CONNECTOR_TUNE[135]?.portA || { x: 0.3499, y: 0.030, z: 0.000 },
    portB: MILA_GIRO_CONNECTOR_TUNE[135]?.portB || { x: 0.2155, y: 0.030, z: -0.3258 },
  },
  150: {
    angleDeg: 150,
    code: '22000127790',
    modelCode: 'TKSSU150000',
    grommetCode: '22000127790',
    label: 'Superficie Giro 150°',
    description: 'SUPERFICIE ESQUINERA MELAMINICO TEK SOCIAL (MILA V2) TKSSU150000',
    prices: { CO: 435750, USD: 61, EUC: 121 },
    modelSrc: '/assets/models/Mila/TKSSU150000.glb',
    grommetModelSrc: '/assets/models/Mila/TKSSU150000_GROMMET.glb',
    portA: MILA_GIRO_CONNECTOR_TUNE[150]?.portA || { x: 0.3680, y: 0.030, z: 0.000 },
    portB: MILA_GIRO_CONNECTOR_TUNE[150]?.portB || { x: 0.7360, y: 0.030, z: -0.3680 },
  },
  180: {
    angleDeg: 180,
    code: '22000127784',
    modelCode: 'TKSSU120000',
    grommetCode: '22000127784',
    label: 'Superficie Giro 180°',
    description: 'SUPERFICIE RECTANGULAR 60 X 70 MELAMINICO TEK SOCIAL (MILA V2) TKSSU120000',
    prices: { CO: 333900, USD: 47, EUC: 93 },
    modelSrc: '/assets/models/Mila/TKSSU120000.glb',
    grommetModelSrc: '/assets/models/Mila/TKSSU120000_GROMMET.glb',
    portA: MILA_GIRO_CONNECTOR_TUNE[180]?.portA || { x: 0.0000, y: 0.030, z: -0.3500 },
    portB: MILA_GIRO_CONNECTOR_TUNE[180]?.portB || { x: 0.6000, y: 0.030, z: -0.3500 },
  },
};

export async function createMilaGiroInstance({ api, config = {} }) {
  if (!api) return null;

  const angle = Number(config.angle || 60);
  const def = MILA_GIRO_DEFINITIONS[angle] || MILA_GIRO_DEFINITIONS[60];
  const useGrommet = Boolean(config.useGrommet);
  const modelSrc = useGrommet ? def.grommetModelSrc : def.modelSrc;
  const code = def.code;
  const description = def.description;
  const prices = def.prices;

  const instanceId = `MILA_GIRO_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  await api.addExternalGlbPart({
    kind: 'MILA_GIRO_SURFACE',
    type: 'MILA_GIRO_SURFACE',
    line: 'MILA',
    code,
    codigoPT: code,
    name: `${def.label} Mila`,
    description,
    prices,
    model: { src: modelSrc },
    position: { x: 0, y: MILA_GIRO_TUNE.SPAWN_Y_MM, z: 0 }, // Controla la altura con MILA_GIRO_TUNE.SPAWN_Y_MM en milaGiroTunables.js
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    meta: {
      role: 'giro-surface',
      angleDeg: def.angleDeg,
      useGrommet,
      portA: def.portA,
      portB: def.portB,
      isPartRoot: true,
      instanceId,
    },
    extraUserData: {
      prices,
      angleDeg: def.angleDeg,
      useGrommet,
    },
  });

  return instanceId;
}
