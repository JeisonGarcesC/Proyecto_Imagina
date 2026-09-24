import {
  MOREA_ACCESSORY_CATALOG,
  MOREA_ACCESSORY_OFFSETS_MM,
} from '../config/moreaTunables.js';

export const MOREA_ACCESSORY_TYPE_OPTIONS = [
  { value: 'armrest-left', label: 'Apoyabrazos izquierdo' },
  { value: 'armrest-right', label: 'Apoyabrazos derecho' },
  { value: 'armrest-center', label: 'Apoyabrazos intermedio' },
];

export async function createMoreaAccessoryInstance({ api, config = {} } = {}) {
  if (!api) return null;

  const accessoryType = String(config.accessoryType || config.subtype || 'armrest-left').trim();

  let item = MOREA_ACCESSORY_CATALOG.armrestLeft;
  let role = 'armrest-left';

  if (accessoryType === 'armrest-right') {
    item = MOREA_ACCESSORY_CATALOG.armrestRight;
    role = 'armrest-right';
  } else if (accessoryType === 'armrest-center') {
    item = MOREA_ACCESSORY_CATALOG.armrestCenter;
    role = 'armrest-center';
  } else if (accessoryType === 'armrest-left') {
    item = MOREA_ACCESSORY_CATALOG.armrestLeft;
    role = 'armrest-left';
  } else {
    item = MOREA_ACCESSORY_CATALOG.armrestLeft;
    role = 'armrest-left';
  }

  const instanceId = `MOREA_ACC_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const offset = MOREA_ACCESSORY_OFFSETS_MM[role] || { x: 0, y: 0, z: 0 };
  const initialRotationY = role === 'armrest-left' ? Math.PI : 0;

  const parentGroup = config.parentGroup || config.assemblyGroup || null;

  await api.addExternalGlbPart({
    kind: 'GLB_PART',
    type: 'GLB_PART',
    line: 'MOREA',
    code: item.code,
    codigoPT: item.code,
    name: `${item.label} Morea`,
    description: item.description,
    prices: item.prices,
    model: { src: item.modelSrc },
    position: {
      x: Number(offset.x || 0),
      y: Number(offset.y || 0),
      z: Number(offset.z || 0),
    },
    rotation: { x: 0, y: initialRotationY, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    parentGroup,
    meta: {
      category: 'morea',
      line: 'MOREA',
      role,
      quantity: 1,
      isPartRoot: true,
      instanceId,
    },
    extraUserData: {
      role,
      quantity: 1,
    },
  });

  return instanceId;
}
