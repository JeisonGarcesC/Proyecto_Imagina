// src/clipboard/clipboardPasteFactory.js
import { CLIPBOARD_VERSION } from './clipboardManager.js';

export const CLIPBOARD_CONSTRUCTORS = Object.freeze({
  ADD_CATALOG_ITEM: 'ADD_CATALOG_ITEM',
  ADD_EXTERNAL_GLB: 'ADD_EXTERNAL_GLB',
  ADD_NATIVE_BLOCK: 'ADD_NATIVE_BLOCK',
  ADD_NATIVE_DUCT: 'ADD_NATIVE_DUCT',
  ADD_SURFACE: 'ADD_SURFACE',
  ADD_KONCISA_COSTADO: 'ADD_KONCISA_COSTADO',
  ADD_KONCISA_LEADER_SKIRT: 'ADD_KONCISA_LEADER_SKIRT',
  ADD_KONCISA_ASSEMBLY: 'ADD_KONCISA_ASSEMBLY',
  ADD_KONCISA_LEADER_CREDENZA: 'ADD_KONCISA_LEADER_CREDENZA',
  ADD_KONCISA_LEADER_CREDENZA_BEAM: 'ADD_KONCISA_LEADER_CREDENZA_BEAM',
});

const KNOWN_CONSTRUCTORS = new Set(Object.values(CLIPBOARD_CONSTRUCTORS));

function cloneData(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isNumberArray(value, length) {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((component) => Number.isFinite(Number(component)))
  );
}

function validateClipboardItem(item, path) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new TypeError(`${path} must be an object.`);
  }

  if (!item.kind && !item.type) {
    throw new TypeError(`${path} requires a kind or type.`);
  }

  const transform = item.transform;
  if (!transform || typeof transform !== 'object') {
    throw new TypeError(`${path} requires a transform.`);
  }
  if (!isNumberArray(transform.position, 3)) {
    throw new TypeError(`${path}.transform.position must contain three numbers.`);
  }
  if (!isNumberArray(transform.quaternion, 4)) {
    throw new TypeError(`${path}.transform.quaternion must contain four numbers.`);
  }
  if (!isNumberArray(transform.scale, 3)) {
    throw new TypeError(`${path}.transform.scale must contain three numbers.`);
  }

  ['internal', 'external'].forEach((role) => {
    const components = item.components?.[role];
    if (components === undefined) return;
    if (!Array.isArray(components)) {
      throw new TypeError(`${path}.components.${role} must be an array.`);
    }
    components.forEach((component, index) =>
      validateClipboardItem(component, `${path}.components.${role}[${index}]`)
    );
  });
}

export function validateClipboard(clipboard) {
  if (!clipboard || typeof clipboard !== 'object' || Array.isArray(clipboard)) {
    throw new TypeError('Clipboard must be an object.');
  }
  if (Number(clipboard.version) !== CLIPBOARD_VERSION) {
    throw new RangeError(`Unsupported clipboard version: ${clipboard.version}.`);
  }
  if (!Array.isArray(clipboard.items)) {
    throw new TypeError('Clipboard items must be an array.');
  }

  clipboard.items.forEach((item, index) => validateClipboardItem(item, `items[${index}]`));
  return cloneData(clipboard);
}

function createBaseInstruction(item, constructor) {
  /*
  console.log('CLIPBOARD CREATE INSTRUCTION', constructor, {
    type: item.type,
    model: item.metadata?.model,
    meta: item.metadata?.meta,
  });
*/

  return {
    constructor,
    source: {
      type: item.type || null,
      role: item.role || 'ROOT',
      kind: item.kind || null,
      code: item.code || null,
      codigoPT: item.codigoPT || null,
      relationships: cloneData(item.relationships || {}),
    },
    payload: {
      code: item.code || item.codigoPT || null,
      codigoPT: item.codigoPT || item.code || null,
      configuration: cloneData(item.configuration || {}),
      metadata: cloneData(item.metadata || {}),
      relationships: cloneData(item.relationships || {}),
    },
    transform: cloneData(item.transform),
    finishes: cloneData(item.finishes),
  };
}

const instructionAdapters = [
  {
    matches: (item) => item.creation?.constructor,
    build: (item) => {
      const constructor = String(item.creation.constructor);
      if (!KNOWN_CONSTRUCTORS.has(constructor)) {
        throw new RangeError(`Unsupported clipboard constructor: ${constructor}.`);
      }
      const instruction = createBaseInstruction(item, constructor);
      instruction.payload = {
        ...instruction.payload,
        ...cloneData(item.creation.payload || {}),
      };
      return instruction;
    },
  },
  {
    matches: (item) => item.type === 'ASSEMBLY' || item.kind === 'KONCISA_PLUS_ASSEMBLY',
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_ASSEMBLY),
  },
  {
    matches: (item) => item.kind === 'SURFACE' || item.metadata?.type === 'superficie',
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_SURFACE),
  },
  {
    matches: (item) =>
      item.configuration?.model?.kind === 'koncisa-costado-assembly' ||
      item.metadata?.model?.kind === 'koncisa-costado-assembly',
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_COSTADO),
  },
  {
    matches: (item) =>
      item.configuration?.model?.kind === 'koncisa-leader-skirt-assembly' ||
      item.metadata?.model?.kind === 'koncisa-leader-skirt-assembly',
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_LEADER_SKIRT),
  },
  {
    matches: (item) =>
      item.configuration?.model?.kind === 'koncisa-leader-credenza-assembly' ||
      item.metadata?.model?.kind === 'koncisa-leader-credenza-assembly',
    build: (item) =>
      createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_LEADER_CREDENZA),
  },
  {
    matches: (item) =>
      item.configuration?.model?.kind === 'native-block' &&
      item.metadata?.leaderRole === 'CREDENZA_BEAM',
    build: (item) =>
      createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_LEADER_CREDENZA_BEAM),
  },
  {
    matches: (item) =>
      item.configuration?.model?.kind === 'native-koncisa-duct' ||
      item.metadata?.model?.kind === 'native-koncisa-duct' ||
      item.metadata?.meta?.useNativeModel === true,
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_NATIVE_DUCT),
  },
  {
    matches: (item) =>
      item.kind === 'BLOCK_PART' ||
      item.kind === 'viga' ||
      item.metadata?.model?.kind === 'native-block',
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_NATIVE_BLOCK),
  },
  {
    matches: (item) =>
      Boolean(item.configuration?.model?.src) ||
      Boolean(item.metadata?.model?.src) ||
      Boolean(item.metadata?.modelSrc),
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_EXTERNAL_GLB),
  },
  {
    matches: () => true,
    build: (item) => createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_CATALOG_ITEM),
  },
];

function buildInstruction(item) {
  const adapter = instructionAdapters.find(({ matches }) => matches(item));
  return adapter.build(item);
}

export function createAssemblyFromClipboardItem(item) {
  const instruction = createBaseInstruction(item, CLIPBOARD_CONSTRUCTORS.ADD_KONCISA_ASSEMBLY);

  instruction.factory = 'createKoncisaPlusInstance';
  instruction.components = {
    internal: (item.components?.internal || []).map(createObjectFromClipboardItem),
    external: (item.components?.external || []).map(createObjectFromClipboardItem),
  };
  return instruction;
}

export function createObjectFromClipboardItem(item) {
  validateClipboardItem(item, 'item');
  if (item.type === 'ASSEMBLY' || item.kind === 'KONCISA_PLUS_ASSEMBLY') {
    return createAssemblyFromClipboardItem(item);
  }
  return buildInstruction(item);
}

export function applyClipboardTransform(instruction, { offset = [0, 0, 0] } = {}) {
  if (!instruction || typeof instruction !== 'object') {
    throw new TypeError('Creation instruction must be an object.');
  }
  if (!isNumberArray(offset, 3)) {
    throw new TypeError('Clipboard offset must contain three numbers.');
  }

  const next = cloneData(instruction);
  const position = next.transform?.position;
  if (!isNumberArray(position, 3)) {
    throw new TypeError('Creation instruction requires a valid position.');
  }
  next.transform.position = position.map(
    (component, index) => Number(component) + Number(offset[index])
  );
  return next;
}

export function applyClipboardFinishes(instruction, finishes = instruction?.finishes ?? null) {
  if (!instruction || typeof instruction !== 'object') {
    throw new TypeError('Creation instruction must be an object.');
  }
  return {
    ...cloneData(instruction),
    finishes: cloneData(finishes),
  };
}

export function createPasteInstructions(clipboard) {
  const validated = validateClipboard(clipboard);
  return validated.items.map(createObjectFromClipboardItem);
}
