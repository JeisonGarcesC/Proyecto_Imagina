// src/mepal/mila/factories/createMilaAccessoryInstance.js
import {
  MILA_ACCESSORY_CATALOG,
  MILA_ACCESSORY_SOURCES,
} from '../config/milaTunables.js';

export const MILA_ACCESSORY_TYPE_OPTIONS = [
  { value: 'armrest-left', label: 'Apoyabrazos izquierdo' },
  { value: 'armrest-right', label: 'Apoyabrazos derecho' },
  { value: 'armrest-center', label: 'Apoyabrazos intermedio' },
  { value: 'screen-1p', label: 'Panel terminal 1 puesto (60 cm)' },
  { value: 'screen-2p', label: 'Panel terminal 2 puestos (120 cm)' },
  { value: 'screen-3p', label: 'Panel terminal 3 puestos (180 cm)' },
  { value: 'screen-4p', label: 'Panel terminal 4 puestos (240 cm)' },
];

export async function createMilaAccessoryInstance({ api, config = {} }) {
  if (!api) return null;

  const accessoryType = config.accessoryType || config.subtype || 'armrest-left';

  let item = null;
  let role = 'accessory';

  if (accessoryType === 'armrest-left') {
    item = MILA_ACCESSORY_CATALOG.armrestLeft;
    role = 'armrest-left';
  } else if (accessoryType === 'armrest-right') {
    item = MILA_ACCESSORY_CATALOG.armrestRight;
    role = 'armrest-right';
  } else if (accessoryType === 'armrest-center') {
    item = MILA_ACCESSORY_CATALOG.armrestCenter;
    role = 'armrest-center';
  } else if (accessoryType === 'screen-1p' || accessoryType === 'screen-60') {
    item = MILA_ACCESSORY_CATALOG.screen1P;
    role = 'screen';
  } else if (accessoryType === 'screen-2p' || accessoryType === 'screen-120') {
    item = MILA_ACCESSORY_CATALOG.screen2P;
    role = 'screen';
  } else if (accessoryType === 'screen-3p' || accessoryType === 'screen-180') {
    item = MILA_ACCESSORY_CATALOG.screen3P;
    role = 'screen';
  } else if (accessoryType === 'screen-4p' || accessoryType === 'screen-240') {
    item = MILA_ACCESSORY_CATALOG.screen4P;
    role = 'screen';
  } else {
    item = MILA_ACCESSORY_CATALOG.armrestLeft;
    role = 'armrest-left';
  }

  const instanceId = `MILA_ACC_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  await api.addExternalGlbPart({
    kind: 'GLB_PART',
    type: 'GLB_PART',
    line: 'MILA',
    code: item.code,
    codigoPT: item.code,
    name: `${item.label} Mila`,
    description: item.description,
    prices: item.prices,
    model: { src: item.modelSrc },
    position: { x: 0, y: 210, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    meta: {
      category: 'mila',
      line: 'MILA',
      role,
      isPartRoot: true,
      instanceId,
    },
    extraUserData: {
      prices: item.prices,
      role,
    },
  });

  return instanceId;
}
